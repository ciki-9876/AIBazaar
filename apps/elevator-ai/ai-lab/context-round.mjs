/** Round 3: frozen paired experiment, reviewed preferences, no checkpoint promotion. */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import {
  lesson,
  outcome,
  replayEpisode,
} from '../src/lib/survival-ai/rollout-training.ts';
import {
  encounterRequest,
  applyEncounterReply,
  stepEncounter,
  playerCommand,
  SCENARIOS,
  PROFILES,
} from '../src/lib/survival-ai/encounter.ts';
import { rankEncounter } from '../src/lib/survival-ai/encounter-policy.ts';
import {
  contextChoices,
  expandContextModel,
  rankContext,
  recordGoal,
  trainContextPreferences,
  CONTEXT_FEATURES,
} from '../src/lib/survival-ai/context-policy.ts';
import { fingerprint } from '../src/lib/survival-ai/protocol.ts';
import { itemIds } from '../src/lib/survival-stacks.ts';

const directory = resolve(
  process.argv[3] || 'work/ai-training/round-2026-10-04-context',
);
const phase = process.argv[2],
  file = (n) => resolve(directory, n);
const read = async (n) => JSON.parse(await readFile(file(n), 'utf8'));
const hash = (x) =>
  createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function save(n, v) {
  try {
    await access(file(n));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    await writeFile(file(n), JSON.stringify(v, null, 2) + '\n');
    return;
  }
  throw new Error('Completed evidence already exists: ' + n);
}
await mkdir(directory, { recursive: true });
const config = {
  schema: 'f9-context-round-v1',
  rules: 'f9-encounter-v2',
  round: 3,
  parent: 'encounter-2ada0c8e',
  liveParent: 'encounter-cbf7f75b',
  judge: {
    model: 'gpt-6.1-sol',
    mode: 'current-session-review',
    independentBlind: false,
  },
  trainingSeed: 2026100403,
  trainingSeeds: [75201],
  validationSeeds: [86301],
  acceptanceSeeds: [97401, 97402],
  epochs: 160,
  rate: 0.003,
  retention: 0.015,
  episodeTicks: 1200,
  decisionTicks: 15,
  extraFeatures: CONTEXT_FEATURES,
  newWeightInitialization: 'zero',
  autoPromotion: false,
  gate: {
    maxDeathIncrease: 0,
    maxProfileScoreRegression: 0.1,
    maxLoopsRatio: 0.8,
    minCollectionRatio: 0.9,
    violations: 0,
  },
  // Must be interpreted together. Escape can justify switching, so ABA alone is diagnostic, not proof of error.
  metrics: {
    returnToSearch:
      'A-B-A search changes within 180 ticks without intervening actual cache pickup',
    collection: 'actual non-discard cache completion by rival',
    player:
      'stationary 48 episodes; 12 additional deterministic moving-player episodes',
  },
  languageWeightTraining: false,
};
const parent = JSON.parse(
  await readFile(
    resolve('work/ai-training/round-2026-10-04-judge/candidate-model.json'),
    'utf8',
  ),
);
if (parent.version !== config.parent) throw new Error('Unexpected parent');
const zero = expandContextModel(parent);
function start(c) {
  let s = lesson(c.seed, c.profile, c.scenario);
  if (c.scenario === 'help') s = playerCommand(s, { type: 'help' });
  return s;
}
function movingInput(tick, moving) {
  if (!moving) return { x: 0, z: 0 };
  // Player moves through the same public map; no adversarial teleportation or test-specific instruction to AI.
  return [
    { x: 1, z: 0 },
    { x: 0, z: -1 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
  ][Math.floor(tick / 120) % 4];
}
export function episode(s, model, ticks, moving = false, capture = false) {
  const initial = structuredClone(s);
  let memory = [],
    violations = 0,
    lastSearch = '',
    pickups = 0,
    returns = 0,
    damage = 0,
    hits = 0,
    given = 0,
    consumed = 0;
  const changes = [],
    inputs = [],
    states = [];
  for (let i = 0; i < ticks && s.actors[1].status === 'active'; i++) {
    if (i % 15 === 0) {
      const q = encounterRequest(s),
        choices = contextChoices(s, memory, q);
      const chosen =
        model.schema === 'f9-context-mlp-v2'
          ? rankContext(model, choices)[0].candidate
          : rankEncounter(model, q)[0].candidate;
      if (capture)
        states.push({
          state: structuredClone(s),
          memory: structuredClone(memory),
          q,
          choices,
        });
      const reply = {
        requestId: q.id,
        candidateId: chosen.id,
        modelVersion: model.version,
      };
      const r = applyEncounterReply(s, q, reply);
      if (r.reason !== 'applied') violations++;
      if (chosen.key.startsWith('search:') && chosen.key !== lastSearch) {
        changes.push({ key: chosen.key, tick: s.tick, pickups });
        const triad = changes.slice(-3);
        if (
          triad.length === 3 &&
          triad[0].key === triad[2].key &&
          s.tick - triad[0].tick <= 180 &&
          triad[0].pickups === pickups
        )
          returns++;
        lastSearch = chosen.key;
      }
      memory = recordGoal(memory, s.tick, chosen.key);
      inputs.push({
        tick: s.tick,
        key: chosen.key,
        action: chosen.action,
        ...reply,
      });
      s = r.state;
    }
    const before = s;
    s = stepEncounter(s, movingInput(s.tick, moving));
    const a = before.actors[1],
      b = s.actors[1];
    if (b.hp < a.hp) {
      damage += a.hp - b.hp;
      hits++;
    }
    // Collection is confirmed by actual UID movement, not by saying 'search'.
    const previousUids = new Set(a.bag.flatMap(itemIds));
    const newUids = new Set(
      b.bag.flatMap(itemIds).filter((uid) => !previousUids.has(uid)),
    );
    const fromCache = before.caches.filter((c) =>
      c.contents.some((x) => itemIds(x).some((uid) => newUids.has(uid))),
    );
    pickups += fromCache.filter((c) => !c.id.startsWith('discard:')).length;
    given += s.actors[0].bag.filter(
      (x) =>
        a.bag.some((old) => old.uid === x.uid) &&
        !before.actors[0].bag.some((old) => old.uid === x.uid),
    ).length;
    if (
      a.intent.type === 'consume' &&
      !b.bag.some((x) => x.uid === a.intent.uid)
    )
      consumed++;
  }
  return {
    state: s,
    inputs,
    states,
    memory,
    violations,
    hash: fingerprint(s),
    score: outcome(initial, s),
    metrics: {
      returns,
      pickups,
      damage,
      hits,
      given,
      consumed,
      died: s.actors[1].status === 'dead',
      extracted: s.actors[1].status === 'extracted',
      hp: s.actors[1].hp,
    },
  };
}
function visiblePacket(sample, c, partition, id) {
  const { state: s, memory, q, choices } = sample,
    a = s.actors[1];
  const view = {
    id,
    partition,
    case: c,
    tick: s.tick,
    self: {
      ...q.observation.self,
      x: a.x,
      z: a.z,
      intent: a.intent,
      searchTicks: a.searchTicks,
      goal: a.navigation?.goalKey,
      bag: a.bag.map((x) => ({ uid: x.uid, kind: x.kind })),
    },
    observation: q.observation,
    memory,
    candidates: rankContext(zero, choices).map((r) => ({
      key: r.candidate.key,
      action: r.candidate.action,
      score: r.score,
      base: r.candidate.features.slice(16),
      context: r.candidate.features.slice(34),
    })),
  };
  return {
    id,
    partition,
    group: s.sessionId,
    hash: hash(view),
    view,
    choices,
    state: s,
    memory,
  };
}
if (phase === 'prepare') {
  await save('config.json', config);
  await save('parent-model.json', parent);
  await save('zero-model.json', zero);
  const live = await readFile(
    resolve('apps/elevator-ai/src/lib/survival-ai/encounter-model.json'),
    'utf8',
  );
  await save('live-checkpoint.json', {
    sha: createHash('sha256').update(live).digest('hex'),
    model: JSON.parse(live).version,
  });
  const packets = [];
  for (const [seed, partition] of [
    [75201, 'train'],
    [86301, 'test'],
  ]) {
    for (const profile of Object.keys(PROFILES))
      for (const { id: scenario } of SCENARIOS) {
        const c = { seed, profile, scenario },
          run = episode(start(c), zero, 450, false, true);
        // All training profiles see each mechanism. Separate trajectories, not separate rows from same seed, for validation.
        const selected =
          partition === 'train'
            ? [run.states[0], run.states[Math.min(run.states.length - 1, 12)]]
            : [run.states[Math.min(run.states.length - 1, 8)]];
        for (const sample of selected) {
          if (
            packets.some(
              (p) =>
                p.group === sample.state.sessionId &&
                p.view.tick === sample.state.tick,
            )
          )
            continue;
          packets.push(
            visiblePacket(sample, c, partition, 'C' + (packets.length + 1)),
          );
        }
      }
  }
  await save('packets.json', packets);
  await save(
    'review-views.json',
    packets.map((p) => ({ ...p.view, hash: p.hash })),
  );
  console.log(
    JSON.stringify({
      phase,
      packets: packets.length,
      train: packets.filter((p) => p.partition === 'train').length,
      val: packets.filter((p) => p.partition === 'test').length,
      parent: parent.version,
      parameters: zero.w1.length + zero.b1.length + zero.w2.length,
    }),
  );
} else if (phase === 'augment') {
  const augmentation = {
    schema: 'f9-context-pursuit-curriculum-v1',
    trainingSeed: 75202,
    transferredFailures: [
      { seed: 96302, profile: 'ally', scenario: 'help' },
      { seed: 96302, profile: 'broker', scenario: 'help' },
    ],
    sample:
      'two actor-observed states per trajectory with threat <3m and at least 3 legal choices; original parent policy',
    note: 'Round 2 failures become training evidence only; neither seed is in round 3 acceptance.',
  };
  await save('augmentation-config.json', augmentation);
  const packets = await read('packets.json'),
    added = [];
  const cases = [...augmentation.transferredFailures];
  for (const profile of Object.keys(PROFILES))
    for (const scenario of ['help', 'cover', 'deathbag'])
      cases.push({ seed: 75202, profile, scenario });
  for (const c of cases) {
    const run = episode(start(c), zero, 1050, false, true);
    const danger = run.states.filter(
      (r) =>
        r.choices.length >= 3 &&
        r.q.observation.threats.some(
          (t) =>
            Math.hypot(t.x - r.state.actors[1].x, t.z - r.state.actors[1].z) <
            3,
        ),
    );
    for (const index of [0, Math.floor(danger.length / 2)]) {
      const sample = danger[index];
      if (
        !sample ||
        added.some(
          (p) =>
            p.group === sample.state.sessionId &&
            p.view.tick === sample.state.tick,
        )
      )
        continue;
      added.push(
        visiblePacket(
          sample,
          c,
          'train',
          'C' + (packets.length + added.length + 1),
        ),
      );
    }
  }
  await save('augmentation-packets.json', added);
  await save(
    'augmentation-views.json',
    added.map((p) => ({ ...p.view, hash: p.hash })),
  );
  console.log(JSON.stringify({ phase, added: added.length }));
} else if (phase === 'train') {
  if (hash(await read('config.json')) !== hash(config))
    throw new Error('Config changed after freeze');
  const packets = (await read('packets.json')).concat(
      await read('augmentation-packets.json'),
    ),
    labels = await read('judge-labels.json');
  if (
    labels.judge.model !== config.judge.model ||
    labels.judge.mode !== config.judge.mode ||
    labels.reviews.length !== packets.length
  )
    throw new Error('Invalid judge provenance');
  const rows = [];
  const seen = new Set();
  for (const p of packets) {
    if (
      hash(p.view) !== p.hash ||
      hash(contextChoices(p.state, p.memory)) !== hash(p.choices)
    )
      throw new Error('Packet mismatch');
    const r = labels.reviews.find((r) => r.id === p.id);
    if (!r || r.hash !== p.hash || !r.reason || seen.has(r.id))
      throw new Error('Missing/duplicate review');
    seen.add(r.id);
    for (const [preferred, rejected] of r.pairs) {
      const a = p.choices.find((x) => x.key === preferred),
        b = p.choices.find((x) => x.key === rejected);
      if (!a || !b || a.key === b.key) throw new Error('Illegal preference');
      rows.push({
        group: p.group,
        partition: p.partition,
        preferred: a.features,
        rejected: b.features,
        evidenceId: p.id + ':' + p.hash,
      });
    }
  }
  if (rows.length < 24) throw new Error('Too little reviewed data');
  await save('preferences.json', rows);
  const t = performance.now(),
    candidate = trainContextPreferences(
      rows,
      zero,
      config.trainingSeed,
      config.epochs,
      config.rate,
      config.retention,
    );
  const ms = performance.now() - t;
  const pairs = (m) =>
    ['train', 'test'].map((partition) => {
      const data = rows.filter((r) => r.partition === partition);
      const margins = data.map((r) => {
        const ranked = rankContext(m, [
          { key: 'p', features: r.preferred },
          { key: 'r', features: r.rejected },
        ]);
        return (
          ranked.find((x) => x.candidate.key === 'p').score -
          ranked.find((x) => x.candidate.key === 'r').score
        );
      });
      return {
        partition,
        count: data.length,
        correct: margins.filter((x) => x > 0).length,
        loss:
          margins.reduce((n, x) => n + Math.log1p(Math.exp(-x)), 0) /
          data.length,
      };
    });
  await save('candidate-model.json', candidate);
  await save('optimization.json', {
    milliseconds: ms,
    before: pairs(zero),
    after: pairs(candidate),
    changedParameters: [
      ...candidate.w1,
      ...candidate.b1,
      ...candidate.w2,
    ].filter((v, i) => v !== [...zero.w1, ...zero.b1, ...zero.w2][i]).length,
    parameters: 1472,
    contextWeightsChanged: candidate.w1.filter(
      (v, i) => i % 44 >= 34 && v !== 0,
    ).length,
  });
  console.log(
    JSON.stringify({
      phase,
      candidate: candidate.version,
      milliseconds: ms,
      before: pairs(zero),
      after: pairs(candidate),
    }),
  );
} else if (phase === 'evaluate') {
  if (hash(await read('config.json')) !== hash(config))
    throw new Error('Config changed after freeze');
  const candidate = await read('candidate-model.json'),
    cases = [];
  for (const seed of config.acceptanceSeeds)
    for (const profile of Object.keys(PROFILES))
      for (const { id: scenario } of SCENARIOS)
        cases.push({ seed, profile, scenario, moving: false });
  for (const seed of config.acceptanceSeeds)
    for (const profile of Object.keys(PROFILES))
      for (const scenario of ['help', 'cover'])
        cases.push({ seed, profile, scenario, moving: true });
  const rows = [];
  for (const c of cases) {
    const before = episode(start(c), parent, config.episodeTicks, c.moving),
      control = episode(start(c), zero, config.episodeTicks, c.moving),
      after = episode(start(c), candidate, config.episodeTicks, c.moving);
    if (
      before.hash !== control.hash ||
      before.inputs.map((x) => x.key).join('|') !==
        control.inputs.map((x) => x.key).join('|')
    )
      throw new Error('Zero expansion changed behavior');
    for (const r of [before, after]) {
      // Original replay executor is valid for stationary rows; moving rows replay the explicit deterministic player input below.
      if (
        !c.moving &&
        fingerprint(replayEpisode(start(c), r.inputs, r.state.tick)) !== r.hash
      )
        throw new Error('Replay mismatch');
      if (c.moving) {
        let s = start(c),
          index = 0;
        while (s.tick < r.state.tick) {
          if (r.inputs[index]?.tick === s.tick) {
            const input = r.inputs[index++],
              q = encounterRequest(s),
              a = applyEncounterReply(s, q, {
                requestId: input.requestId,
                candidateId: input.candidateId,
                modelVersion: input.modelVersion,
              });
            if (a.reason !== 'applied')
              throw new Error('Moving replay rejected');
            s = a.state;
          }
          s = stepEncounter(s, movingInput(s.tick, true));
        }
        if (index !== r.inputs.length || fingerprint(s) !== r.hash)
          throw new Error('Moving replay mismatch');
      }
    }
    delete before.states;
    delete control.states;
    delete after.states;
    rows.push({
      case: c,
      before,
      after,
      zeroControlHash: control.hash,
      delta: after.score - before.score,
    });
    console.log(
      JSON.stringify({
        case: c,
        before: before.metrics,
        after: after.metrics,
        delta: after.score - before.score,
      }),
    );
  }
  await save('acceptance.json', rows);
  const aggregate = (data, side) => {
    const sum = (key) =>
      data.reduce((n, r) => n + Number(r[side].metrics[key]), 0);
    return {
      episodes: data.length,
      meanScore: data.reduce((n, r) => n + r[side].score, 0) / data.length,
      deaths: sum('died'),
      extracted: sum('extracted'),
      returns: sum('returns'),
      pickups: sum('pickups'),
      damage: sum('damage'),
      hits: sum('hits'),
      given: sum('given'),
      consumed: sum('consumed'),
      violations: data.reduce((n, r) => n + r[side].violations, 0),
    };
  };
  const byGroup = ['all', 'stationary', 'moving', ...Object.keys(PROFILES)].map(
    (group) => {
      const data = rows.filter(
        (r) =>
          group === 'all' ||
          (group === 'stationary'
            ? !r.case.moving
            : group === 'moving'
              ? r.case.moving
              : r.case.profile === group),
      );
      return {
        group,
        before: aggregate(data, 'before'),
        after: aggregate(data, 'after'),
      };
    },
  );
  const { before, after } = byGroup[0];
  const gates = {
    survival: after.deaths <= before.deaths,
    profiles: byGroup
      .slice(3)
      .every((g) => g.after.meanScore >= g.before.meanScore - 0.1),
    loops: after.returns <= before.returns * 0.8,
    collection: after.pickups >= before.pickups * 0.9,
    legality: after.violations === 0,
  };
  const liveNow = createHash('sha256')
    .update(
      await readFile(
        resolve('apps/elevator-ai/src/lib/survival-ai/encounter-model.json'),
        'utf8',
      ),
    )
    .digest('hex');
  if (liveNow !== (await read('live-checkpoint.json')).sha)
    throw new Error('Live model changed');
  const reviewRows = [...rows]
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 4)
    .concat([...rows].sort((a, b) => b.delta - a.delta).slice(0, 4));
  for (const profile of Object.keys(PROFILES)) {
    const r = rows.find(
      (r) =>
        r.case.moving &&
        r.case.profile === profile &&
        r.case.scenario === 'help',
    );
    if (!reviewRows.includes(r)) reviewRows.push(r);
  }
  const review = reviewRows.map((r, i) => ({
    id: 'R' + (i + 1),
    hash: hash(r),
    case: r.case,
    before: {
      metrics: r.before.metrics,
      score: r.before.score,
      final: {
        hp: r.before.state.actors[1].hp,
        bag: r.before.state.actors[1].bag.map((x) => x.kind),
        status: r.before.state.actors[1].status,
      },
      changes: r.before.inputs
        .filter((x, i, all) => !i || x.key !== all[i - 1].key)
        .map((x) => ({ tick: x.tick, key: x.key })),
    },
    after: {
      metrics: r.after.metrics,
      score: r.after.score,
      final: {
        hp: r.after.state.actors[1].hp,
        bag: r.after.state.actors[1].bag.map((x) => x.kind),
        status: r.after.state.actors[1].status,
      },
      changes: r.after.inputs
        .filter((x, i, all) => !i || x.key !== all[i - 1].key)
        .map((x) => ({ tick: x.tick, key: x.key })),
    },
  }));
  await save('post-review-packets.json', review);
  await save('report.json', {
    config,
    model: candidate.version,
    byGroup,
    wins: rows.filter((r) => r.delta > 1e-9).length,
    losses: rows.filter((r) => r.delta < -1e-9).length,
    ties: rows.filter((r) => Math.abs(r.delta) <= 1e-9).length,
    zeroExpansionEquivalent: rows.length,
    deterministicReplays: rows.length * 2,
    gates,
    promotion: false,
  });
  console.log(JSON.stringify({ phase, byGroup, gates }));
} else if (phase === 'finalize') {
  const report = await read('report.json'),
    packets = await read('post-review-packets.json'),
    post = await read('post-judge-review.json');
  if (
    post.judge?.model !== config.judge.model ||
    post.judge?.mode !== config.judge.mode ||
    post.reviews?.length !== packets.length
  )
    throw new Error('Missing post review');
  for (const p of packets) {
    const r = post.reviews.filter((r) => r.id === p.id);
    if (r.length !== 1 || r[0].hash !== p.hash || !r[0].reason)
      throw new Error('Post review hash mismatch');
  }
  if (post.promotion !== false)
    throw new Error('Round has no automatic promotion authority');
  const final = {
    ...report,
    optimization: await read('optimization.json'),
    postReview: post,
    judgeRuntime: await read('judge-runtime.json'),
    developmentUsage: await read('development-usage.json'),
    checks: await read('checks.json'),
    sourceManifest: await read('source-manifest.json'),
    benchmark: await read('benchmark.json'),
    language: {
      mail: 'not weight-trained or re-evaluated this round',
      offscreen: 'not weight-trained or re-evaluated this round',
      previousEvidence: '../round-2026-10-04-judge/language-review.json',
      localInferenceTokens: 0,
    },
    numericTrainingTokens: 0,
    completed: true,
    liveUnchanged: true,
    nextPlan: post.nextPlan,
  };
  const live = createHash('sha256')
    .update(
      await readFile(
        resolve('apps/elevator-ai/src/lib/survival-ai/encounter-model.json'),
        'utf8',
      ),
    )
    .digest('hex');
  if (live !== (await read('live-checkpoint.json')).sha)
    throw new Error('Live checkpoint changed before finalization');
  await save('final-report.json', final);
  console.log(
    JSON.stringify({
      phase,
      model: final.model,
      completed: true,
      promotion: false,
      postReviews: post.reviews.length,
      gates: final.gates,
    }),
  );
} else throw new Error('Expected prepare/augment/train/evaluate/finalize');
