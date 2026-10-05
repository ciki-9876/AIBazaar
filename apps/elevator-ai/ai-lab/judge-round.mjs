/** A bounded round with traceable, externally reviewed labels. No automatic judge impersonation. */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  lesson,
  runEpisode,
  replayEpisode,
} from '../src/lib/survival-ai/rollout-training.ts';
import {
  encounterRequest,
  playerCommand,
  SCENARIOS,
  PROFILES,
} from '../src/lib/survival-ai/encounter.ts';
import {
  rankEncounter,
  trainEncounterPreferences,
} from '../src/lib/survival-ai/encounter-policy.ts';
import { fingerprint } from '../src/lib/survival-ai/protocol.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = resolve(
  root,
  process.argv[3] || 'work/ai-training/round-2026-10-04-judge',
);
const phase = process.argv[2];
const config = {
  schema: 'f9-session-judge-round-v1',
  rules: 'f9-encounter-v2',
  judge: {
    model: 'gpt-6.1-sol',
    mode: 'current-session-review',
    independentBlind: false,
  },
  trainingSeed: 2026100402,
  trainingSeeds: [74101],
  validationSeeds: [85201],
  acceptanceSeeds: [96301, 96302],
  epochs: 160,
  rate: 0.003,
  retention: 0.01,
  gate: {
    meanGain: 0.05,
    maximumProfileRegression: 0.1,
    maximumDeathIncrease: 0,
    violations: 0,
  },
  rubric: [
    'Use only actor-visible facts and real legal actions; no hidden-loot knowledge.',
    'Address critical nutrition/health using available supplies; preserve supplies when need is small.',
    'Make useful exploration/collection progress; neither aimless motion nor healthy premature extraction earns approval.',
    'Continue worthwhile work unless danger justifies interruption; choose cover and distance supported by the map.',
    'Respect ally/broker/predator differences and actual requests/agreements; aggression must justify its survival cost.',
    'Mail is written correspondence: no stage directions, fabricated mechanics or reversed ownership.',
    'Offscreen decisions/reasons must agree with actual resources, location and ongoing plan.',
    'Allow uncertainty; labels are preferences, not proof of a unique optimal action.',
  ],
  languageWeightTraining: false,
  autoPromotion: false,
};
await mkdir(directory, { recursive: true });
const file = (name) => resolve(directory, name);
const read = async (name) => JSON.parse(await readFile(file(name), 'utf8'));
const save = async (name, value) =>
  writeFile(file(name), JSON.stringify(value, null, 2) + '\n');
async function refuseOverwrite(name) {
  try {
    await access(file(name));
  } catch (e) {
    if (e.code === 'ENOENT') return;
    throw e;
  }
  throw new Error('Evidence already exists: ' + name);
}
const baselinePath = resolve(
  root,
  'apps/elevator-ai/src/lib/survival-ai/encounter-model.json',
);
const digest = (s) => createHash('sha256').update(s).digest('hex');
const cases = (seeds) =>
  seeds.flatMap((seed) =>
    Object.keys(PROFILES).flatMap((profile) =>
      SCENARIOS.map(({ id: scenario }) => ({ seed, profile, scenario })),
    ),
  );
const round2Lesson = (c) => {
  let s = lesson(c.seed, c.profile, c.scenario);
  if (c.scenario === 'help') s = playerCommand(s, { type: 'help' });
  return s;
};
const rounded = (n) => Math.round(n * 100) / 100;
function packet(s, id, partition) {
  const q = encounterRequest(s),
    a = s.actors[1];
  return {
    id,
    group: s.sessionId,
    partition,
    seed: s.seed,
    profile: s.profile,
    scenario: s.scenario,
    observationHash: fingerprint(q),
    request: q,
    reviewView: {
      id,
      profile: s.profile,
      scenario: s.scenario,
      tick: s.tick,
      self: {
        ...q.observation.self,
        position: { x: rounded(a.x), z: rounded(a.z) },
        intent: a.intent,
      },
      others: q.observation.others,
      threats: q.observation.threats,
      caches: q.observation.caches,
      actions: q.candidates.map((c) => ({
        key: c.key,
        label: c.label,
        action: c.action,
        distance: rounded(c.features[16] * 32),
        threatAtTarget: rounded(c.features[18] * 20),
        hpGain: rounded(c.features[19] * 45),
        foodGain: rounded(c.features[20] * 45),
        waterGain: rounded(c.features[21] * 45),
        continuation: c.features[25],
        novelty: c.features[24],
      })),
    },
  };
}
if (phase === 'prepare') {
  await refuseOverwrite('packets.json');
  const oldText = await readFile(baselinePath, 'utf8'),
    baseline = JSON.parse(oldText);
  await writeFile(file('baseline-model.json'), oldText);
  await save('config.json', config);
  const packets = [];
  for (const [i, c] of cases(config.trainingSeeds).entries()) {
    let s = round2Lesson(c);
    // Half initial states, half on-policy states; source grouping remains the whole trajectory.
    if (i % 2 && c.scenario !== 'exit') {
      const visited = runEpisode(s, baseline, 120).state;
      if (visited.actors[1].status === 'active') s = visited;
    }
    packets.push(packet(s, `T${i + 1}`, 'train'));
  }
  const validation = cases(config.validationSeeds).filter((_, i) =>
    [0, 2, 7, 11, 20, 21].includes(i),
  );
  for (const [i, c] of validation.entries())
    packets.push(packet(round2Lesson(c), `V${i + 1}`, 'test'));
  await save('packets.json', packets);
  await save(
    'review-views.json',
    packets.map((p) => p.reviewView),
  );
  console.log(
    JSON.stringify({
      phase,
      packets: packets.length,
      baseline: baseline.version,
      config,
    }),
  );
} else if (phase === 'train') {
  await refuseOverwrite('candidate-model.json');
  if (fingerprint(await read('config.json')) !== fingerprint(config))
    throw new Error('Round config changed');
  const packets = await read('packets.json'),
    annotations = await read('judge-labels.json');
  if (packets.some((p) => fingerprint(p.request) !== p.observationHash))
    throw new Error('Review packet was modified');
  if (
    annotations.judge.model !== config.judge.model ||
    annotations.judge.mode !== config.judge.mode
  )
    throw new Error('Judge provenance mismatch');
  if (
    annotations.reviews.length !== packets.length ||
    new Set(annotations.reviews.map((r) => r.id)).size !== packets.length
  )
    throw new Error('Missing or duplicate review');
  const rows = annotations.reviews.flatMap((r) => {
    const p = packets.find((x) => x.id === r.id);
    if (
      !p ||
      r.observationHash !== p.observationHash ||
      !r.reason ||
      !Array.isArray(r.preferences) ||
      (!r.preferences.length && r.abstain !== true)
    )
      throw new Error('Invalid review: ' + r.id);
    return r.preferences.map(([winner, loser]) => {
      const a = p.request.candidates.find((x) => x.key === winner),
        b = p.request.candidates.find((x) => x.key === loser);
      if (!a || !b || winner === loser)
        throw new Error('Illegal preference: ' + r.id);
      return {
        group: p.group,
        partition: p.partition,
        evidenceId: r.id,
        preferred: a.features,
        rejected: b.features,
      };
    });
  });
  await save('preference-dataset.json', rows);
  const baseline = await read('baseline-model.json'),
    started = performance.now();
  const candidate = trainEncounterPreferences(
    rows,
    baseline,
    config.trainingSeed,
    config.epochs,
    config.rate,
    config.retention,
  );
  await save('candidate-model.json', candidate);
  if (
    fingerprint(await read('candidate-model.json')) !== fingerprint(candidate)
  )
    throw new Error('Reload mismatch');
  const metric = (model, partition) => {
    const pairs = rows.filter((r) => r.partition === partition);
    const margins = pairs.map((r) => {
      const q = {
        candidates: [
          { features: r.preferred, key: 'a' },
          { features: r.rejected, key: 'b' },
        ],
      };
      const ranked = rankEncounter(model, q);
      return (
        ranked.find((x) => x.candidate.key === 'a').score -
        ranked.find((x) => x.candidate.key === 'b').score
      );
    });
    return {
      count: pairs.length,
      correct: margins.filter((n) => n > 0).length,
      loss:
        margins.reduce(
          (sum, m) =>
            sum + Math.log1p(Math.exp(-Math.max(-60, Math.min(60, m)))),
          0,
        ) / pairs.length,
    };
  };
  const result = {
    phase,
    baseline: baseline.version,
    candidate: candidate.version,
    seconds: (performance.now() - started) / 1000,
    pairs: rows.length,
    changedWeights: [...candidate.w1, ...candidate.b1, ...candidate.w2].filter(
      (v, i) => v !== [...baseline.w1, ...baseline.b1, ...baseline.w2][i],
    ).length,
    training: {
      before: metric(baseline, 'train'),
      after: metric(candidate, 'train'),
    },
    validation: {
      before: metric(baseline, 'test'),
      after: metric(candidate, 'test'),
    },
    numericTrainingTokens: 0,
  };
  await save('optimization.json', result);
  console.log(JSON.stringify(result));
} else if (phase === 'evaluate') {
  await refuseOverwrite('report.json');
  const baseline = await read('baseline-model.json'),
    candidate = await read('candidate-model.json'),
    suite = cases(config.acceptanceSeeds);
  async function assess(model, name) {
    const rows = [];
    for (const c of suite) {
      const s = round2Lesson(c),
        run = runEpisode(s, model),
        a = run.state.actors[1];
      if (
        fingerprint(replayEpisode(s, run.inputs, run.state.tick)) !== run.hash
      )
        throw new Error('Replay mismatch');
      rows.push({
        ...c,
        score: run.score,
        status: a.status,
        hp: a.hp,
        food: a.food,
        water: a.water,
        bag: a.bag.map((i) => ({ kind: i.kind, uid: i.uid })),
        violations: run.violations,
        hash: run.hash,
        finalTick: run.state.tick,
        inputs: run.inputs,
      });
      if (rows.length % 6 === 0)
        console.log(
          JSON.stringify({
            phase: name,
            episodes: rows.length,
            total: suite.length,
          }),
        );
    }
    await save(name + '.json', rows);
    return rows;
  }
  const before = await assess(baseline, 'acceptance-before'),
    after = await assess(candidate, 'acceptance-after');
  const mean = (ns) => ns.reduce((a, b) => a + b, 0) / ns.length;
  const deltas = after.map((r, i) => r.score - before[i].score),
    gain = mean(deltas);
  const profiles = Object.keys(PROFILES).map((p) => {
    const indices = suite.flatMap((c, i) => (c.profile === p ? [i] : []));
    return {
      profile: p,
      before: mean(indices.map((i) => before[i].score)),
      after: mean(indices.map((i) => after[i].score)),
      gain: mean(indices.map((i) => deltas[i])),
    };
  });
  const deathsBefore = before.filter((r) => r.status === 'dead').length,
    deathsAfter = after.filter((r) => r.status === 'dead').length,
    violations = after.reduce((sum, r) => sum + r.violations, 0);
  const gate = {
    meanGain: gain >= config.gate.meanGain,
    profileRegression: profiles.every(
      (p) => p.gain >= -config.gate.maximumProfileRegression,
    ),
    deathIncrease: deathsAfter <= deathsBefore,
    legalActions: violations === 0,
  };
  const ordered = suite
    .map((c, i) => ({
      ...c,
      gain: deltas[i],
      before: before[i].score,
      after: after[i].score,
    }))
    .sort((a, b) => a.gain - b.gain);
  const untouched =
    digest(await readFile(baselinePath, 'utf8')) ===
    digest(await readFile(file('baseline-model.json'), 'utf8'));
  if (!untouched) throw new Error('Live baseline changed');
  const radius =
    1.96 *
    Math.sqrt(
      deltas.reduce((n, x) => n + (x - gain) ** 2, 0) /
        (deltas.length - 1) /
        deltas.length,
    );
  const report = {
    schema: 'f9-session-judge-report-v1',
    config,
    optimization: await read('optimization.json'),
    acceptance: {
      episodes: suite.length,
      before: mean(before.map((r) => r.score)),
      after: mean(after.map((r) => r.score)),
      gain,
      approximatePaired95CI: [gain - radius, gain + radius],
      wins: deltas.filter((n) => n > 0.00001).length,
      losses: deltas.filter((n) => n < -0.00001).length,
      ties: deltas.filter((n) => Math.abs(n) <= 0.00001).length,
      deathsBefore,
      deathsAfter,
      violations,
      profiles,
      gate,
      numericalGatePassed: Object.values(gate).every(Boolean),
      replayCount: before.length + after.length,
      liveBaselineUntouched: untouched,
    },
    judge: { ...config.judge, postTrainingReviewPending: true },
    promoted: false,
    scope:
      'Encounter-v2 pairwise weight update; language/campaign Qwen weights unchanged.',
    examples: { worst: ordered.slice(0, 4), best: ordered.slice(-4) },
    limitations: [
      'One fixed arena, stationary player, 20-second horizon.',
      '34 features omit target identity and long-term goals.',
      'Current-session reviewer knows project history; not independent blind evaluation.',
      'Formal survival/9 season and persistent three-scene handoff not trained.',
    ],
  };
  await save('report.json', report);
  console.log(JSON.stringify(report));
} else if (phase === 'export-review') {
  await refuseOverwrite('post-review-packets.json');
  const before = await read('acceptance-before.json'),
    after = await read('acceptance-after.json'),
    report = await read('report.json');
  const identity = (c) => [c.seed, c.profile, c.scenario].join(':');
  const selected = new Set(
    [...report.examples.worst, ...report.examples.best].map(identity),
  );
  for (const c of before)
    if (
      c.seed === config.acceptanceSeeds[1] &&
      ['cover', 'deathbag'].includes(c.scenario)
    )
      selected.add(identity(c));
  const packets = [];
  const distribution = (rows) =>
    Object.keys(PROFILES).map((profile) => ({
      profile,
      counts: rows
        .filter((r) => r.profile === profile)
        .flatMap((r) => r.inputs)
        .reduce((n, x) => {
          n[x.action.type] = (n[x.action.type] || 0) + 1;
          return n;
        }, {}),
    }));
  for (const [i, c] of before.entries()) {
    if (!selected.has(identity(c))) continue;
    const start = round2Lesson(c);
    const evidence = (r) => {
      const end = replayEpisode(start, r.inputs, r.finalTick),
        steps = [];
      let previous;
      for (const input of r.inputs) {
        const key = input.key.replaceAll(start.sessionId, 'S');
        if (key === previous) continue;
        previous = key;
        const at = replayEpisode(
            start,
            r.inputs.filter((x) => x.tick < input.tick),
            input.tick,
          ),
          q = encounterRequest(at);
        steps.push({
          tick: input.tick,
          key,
          self: q.observation.self,
          threats: q.observation.threats,
          others: q.observation.others,
        });
      }
      return {
        score: rounded(r.score),
        status: r.status,
        hp: rounded(r.hp),
        food: rounded(r.food),
        water: rounded(r.water),
        bag: r.bag.map((x) => x.kind),
        player: {
          hp: rounded(end.actors[0].hp),
          bag: end.actors[0].bag.map((x) => x.kind),
        },
        counts: r.inputs.reduce((n, x) => {
          n[x.action.type] = (n[x.action.type] || 0) + 1;
          return n;
        }, {}),
        steps,
      };
    };
    const p = {
      id: `P${packets.length + 1}`,
      seed: c.seed,
      profile: c.profile,
      scenario: c.scenario,
      initial: encounterRequest(start).observation,
      before: evidence(c),
      after: evidence(after[i]),
    };
    p.evidenceHash = fingerprint(p);
    packets.push(p);
  }
  await save('post-review-packets.json', packets);
  await save('action-distribution.json', {
    before: distribution(before),
    after: distribution(after),
  });
  console.log(JSON.stringify({ phase, packets: packets.length }));
} else if (phase === 'finalize') {
  await refuseOverwrite('final-report.json');
  const report = await read('report.json'),
    packets = await read('post-review-packets.json'),
    review = await read('post-judge-review.json');
  if (packets.some(({ evidenceHash, ...p }) => fingerprint(p) !== evidenceHash))
    throw new Error('Post-review packet was modified');
  const language = await read('language-report.json'),
    languageReview = await read('language-review.json');
  if (
    review.judge.model !== config.judge.model ||
    review.judge.mode !== config.judge.mode ||
    review.reviews.length !== packets.length ||
    new Set(review.reviews.map((r) => r.id)).size !== packets.length ||
    review.reviews.some(
      (r) =>
        !r.reason ||
        !packets.some(
          (p) => p.id === r.id && p.evidenceHash === r.evidenceHash,
        ),
    )
  )
    throw new Error('Incomplete or mismatched post-training review');
  const languageHash = digest(
    await readFile(file('language-evidence.json'), 'utf8'),
  );
  if (languageReview.evidenceSHA256 !== languageHash)
    throw new Error('Language review belongs to other evidence');
  await save('final-report.json', {
    ...report,
    judge: {
      ...config.judge,
      postTrainingReviewPending: false,
      tactical: review,
      language: languageReview,
    },
    language,
    promoted: false,
    decision: review.decision,
    developmentUsage: await read('development-usage.json'),
    externalJudge: await read('api-probe.json'),
    validationChecks: await read('checks.json'),
    nextRound: review.nextRound,
  });
  console.log(
    JSON.stringify({
      phase,
      numericalGatePassed: report.acceptance.numericalGatePassed,
      promoted: false,
      reviews: review.reviews.length,
      languageTokens: language.tokens.total,
    }),
  );
} else
  throw new Error('Use prepare, train, evaluate, export-review or finalize');
