/** Round 4: an isolated combat head, numerical rollout teacher plus session review. */
import { mkdir, readFile, writeFile, access, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import {
  COMBAT_CASES,
  COMBAT_RULES,
  COMBAT_FEATURES,
  COMBAT_ACTIONS,
  createCombat,
  observeCombat,
  advanceCombat,
  teacherCombat,
  createCombatModel,
  rankCombat,
  validateCombatModel,
} from '../src/lib/survival-ai/combat-lab.ts';
import {
  trainEncounter,
  evaluateEncounter,
} from '../src/lib/survival-ai/encounter-policy.ts';
import { randomStream } from '../src/packages/core/random.ts';
import { lesson } from '../src/lib/survival-ai/rollout-training.ts';
import {
  encounterRequest,
  applyEncounterReply,
  stepEncounter,
  playerCommand,
} from '../src/lib/survival-ai/encounter.ts';
import { rankEncounter } from '../src/lib/survival-ai/encounter-policy.ts';
import { fingerprint } from '../src/lib/survival-ai/protocol.ts';

const [phase, supplied] = process.argv.slice(2);
const dir = resolve(supplied || 'work/ai-training/round-2026-10-04-combat');
const file = (name) => resolve(dir, name);
const read = async (name) => JSON.parse(await readFile(file(name), 'utf8'));
const hash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function save(name, value) {
  try {
    await access(file(name));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    await writeFile(file(name), JSON.stringify(value, null, 2) + '\n');
    return;
  }
  throw new Error('Evidence already exists: ' + name);
}
await mkdir(dir, { recursive: true });
const config = {
  round: 4,
  rules: COMBAT_RULES,
  features: COMBAT_FEATURES,
  architecture:
    'separate 34x32 combat head; original navigation/social head unchanged',
  trainingSeeds: [41001, 41002, 41003],
  validationSeeds: [42001, 42002],
  acceptanceSeeds: [
    43001, 43002, 43003, 43004, 43005, 43006, 43007, 43008, 43009, 43010, 43011,
    43012,
  ],
  initializationSeed: 2026100404,
  trainingSeed: 2026100405,
  epochs: 220,
  rate: 0.008,
  decisionTicks: 12,
  episodeTicks: 900,
  teacherHorizon: 36,
  sampleEvery: 48,
  sampleEpisodeTicks: 576,
  judge: {
    numerical: 'observed 1.2-second executable branches',
    session: 'gpt-6.1-sol',
    mode: 'rubric and sample review',
    independentBlind: false,
  },
  frozenGates: {
    minClearRate: 0.8,
    maxMeanDamage: 20,
    minSafeMovingKillFraction: 0.6,
    minGroupingCasesWithActualGroupedKills: 0.6,
    minKillFractionVsTeacher: 0.9,
    replayErrors: 0,
    oldExplorationRegression: 0,
  },
  autoPromotion: false,
  languageTraining: false,
};
function result(s) {
  const m = s.metrics;
  return {
    clear: s.mobs.length === 0 && s.player.hp > 0,
    dead: s.player.hp <= 0,
    hp: s.player.hp,
    remaining: s.mobs.length,
    ticks: s.tick,
    ...m,
    initial: s.initial,
    multiShots: m.hitsByShot.filter((n) => n >= 2).length,
    tripleShots: m.hitsByShot.filter((n) => n >= 3).length,
    aoeTargets: m.hitsByShot.reduce((a, b) => a + b, 0),
  };
}
function run(seed, scenario, policy, capture = false) {
  let s = createCombat(seed, scenario);
  const actions = [],
    snapshots = [];
  while (s.tick < config.episodeTicks && s.player.hp > 0 && s.mobs.length) {
    const a = policy(s);
    actions.push({
      tick: s.tick,
      key: a.key,
      ticks: Math.min(config.decisionTicks, config.episodeTicks - s.tick),
    });
    if (capture && (s.tick % 60 === 0 || s.events.at(-1)?.tick > s.tick - 12))
      snapshots.push({
        tick: s.tick,
        player: s.player,
        mobs: observeCombat(s).mobs,
        action: a.key,
        metrics: s.metrics,
      });
    s = advanceCombat(s, a, actions.at(-1).ticks);
  }
  return {
    seed,
    scenario,
    actions,
    ...(capture ? { snapshots, events: s.events } : {}),
    metrics: result(s),
    finalHash: hash(s),
  };
}
function aggregate(episodes) {
  const sums = [
    'kills',
    'damage',
    'hits',
    'shots',
    'multiShots',
    'tripleShots',
    'aoeTargets',
    'movingSafeKills',
    'groupedKills',
    'projectileDodges',
    'initial',
    'blockedTicks',
  ];
  return {
    count: episodes.length,
    clears: episodes.filter((e) => e.metrics.clear).length,
    deaths: episodes.filter((e) => e.metrics.dead).length,
    ...Object.fromEntries(
      sums.map((k) => [k, episodes.reduce((n, e) => n + e.metrics[k], 0)]),
    ),
  };
}
function diagnostics(model, rows) {
  // Training rows arrive teacher-ranked. Restore runtime ordering before testing
  // ties; otherwise the zero-output model spuriously scores 100% accuracy.
  const ordered = rows.map((r) => ({
    ...r,
    candidates: [...r.candidates].sort(
      (a, b) =>
        COMBAT_ACTIONS.findIndex((c) => c.key === a.key) -
        COMBAT_ACTIONS.findIndex((c) => c.key === b.key),
    ),
  }));
  const strict = evaluateEncounter(model.core, ordered);
  return strict.map((r) => {
    const partition = ordered.filter((x) => x.partition === r.partition);
    const regret = partition.map((row) => {
      const chosen = row.candidates
        .map((c) => {
          const h = model.core.b1.map((b, i) =>
            Math.tanh(
              b +
                c.features.reduce(
                  (n, x, j) => n + x * model.core.w1[i * 34 + j],
                  0,
                ),
            ),
          );
          return {
            c,
            score: h.reduce((n, x, i) => n + x * model.core.w2[i], 0),
          };
        })
        .sort((a, b) => b.score - a.score)[0].c;
      return Math.max(...row.candidates.map((c) => c.utility)) - chosen.utility;
    });
    return {
      ...r,
      withinPoint05: regret.filter((v) => v <= 0.05).length,
      meanUtilityRegret: regret.reduce((a, b) => a + b, 0) / regret.length,
    };
  });
}
if (phase === 'prepare') {
  await save('config.json', config);
  const parent = createCombatModel(config.initializationSeed);
  await save('parent-model.json', parent);
  const rows = [],
    review = [];
  for (const [partition, seeds] of [
    ['train', config.trainingSeeds],
    ['test', config.validationSeeds],
  ]) {
    for (const seed of seeds)
      for (const scenario of COMBAT_CASES) {
        for (const policy of ['hold', 'teacher', 'random']) {
          let s = createCombat(seed, scenario);
          const random = randomStream(
            seed,
            `combat-curriculum:${scenario}:${policy}`,
          );
          while (
            s.tick < config.sampleEpisodeTicks &&
            s.player.hp > 0 &&
            s.mobs.length
          ) {
            const ranked = teacherCombat(s, config.teacherHorizon);
            if (
              s.tick % config.sampleEvery === 0 &&
              ranked[0].utility - ranked.at(-1).utility > 0.05
            ) {
              const id = `${seed}:${scenario}:${policy}:${s.tick}`;
              const candidates = ranked.map((a) => ({
                features: a.features,
                key: a.key,
                utility: a.utility,
              }));
              rows.push({
                group: `${seed}:${scenario}`,
                partition,
                candidates,
                bestKey: ranked[0].key,
                evidenceId: id,
              });
              if (
                partition === 'train' &&
                policy === 'teacher' &&
                (s.tick === 0 || s.tick === 144)
              )
                review.push({
                  id,
                  observation: observeCombat(s),
                  ranked: ranked.map((a) => ({
                    key: a.key,
                    utility: a.utility,
                    features: a.features,
                  })),
                });
            }
            const action =
              policy === 'teacher'
                ? ranked[0]
                : policy === 'random'
                  ? COMBAT_ACTIONS[Math.floor(random() * COMBAT_ACTIONS.length)]
                  : COMBAT_ACTIONS[0];
            s = advanceCombat(s, action, config.decisionTicks);
          }
        }
      }
  }
  await save('dataset.json', rows);
  await save('review-packets.json', review);
  await save('manifest.json', {
    configHash: hash(config),
    parentHash: hash(parent),
    datasetHash: hash(rows),
    reviewsHash: hash(review),
    train: rows.filter((r) => r.partition === 'train').length,
    validation: rows.filter((r) => r.partition === 'test').length,
  });
  console.log(
    JSON.stringify({
      phase,
      ...(await read('manifest.json')),
      packets: review.length,
    }),
  );
} else if (phase === 'train') {
  const frozen = await read('config.json'),
    parent = await read('parent-model.json'),
    rows = await read('dataset.json'),
    manifest = await read('manifest.json'),
    review = await read('session-review.json');
  if (
    hash(frozen) !== manifest.configHash ||
    hash(rows) !== manifest.datasetHash ||
    hash(parent) !== manifest.parentHash ||
    review.packetsHash !== manifest.reviewsHash ||
    !review.approvedForBoundedExperiment
  )
    throw new Error('Unreviewed or changed dataset');
  const start = performance.now();
  const core = trainEncounter(rows, frozen.trainingSeed, frozen.epochs, {
    initial: parent.core,
    source: 'observed-rollout-v1',
    rate: frozen.rate,
  });
  core.version = 'combat-' + core.version.replace('encounter-', '');
  const candidate = { ...parent, core };
  validateCombatModel(candidate);
  const changed = [...core.w1, ...core.b1, ...core.w2].filter(
    (v, i) =>
      v !== [...parent.core.w1, ...parent.core.b1, ...parent.core.w2][i],
  ).length;
  await save('candidate-model.json', candidate);
  await save('training.json', {
    milliseconds: performance.now() - start,
    parameters: 1152,
    changed,
    before: diagnostics(parent, rows),
    after: diagnostics(candidate, rows),
    candidateHash: hash(candidate),
    numericalTokens: 0,
    languageCalls: 0,
  });
  console.log(JSON.stringify(await read('training.json')));
} else if (phase === 'evaluate') {
  const frozen = await read('config.json');
  if (hash(frozen) !== hash(config)) throw new Error('Evaluation config drift');
  const parent = await read('parent-model.json'),
    candidate = await read('candidate-model.json');
  const episodes = { parent: [], candidate: [], teacher: [] };
  for (const seed of frozen.acceptanceSeeds)
    for (const scenario of COMBAT_CASES) {
      for (const [name, model] of [
        ['parent', parent],
        ['candidate', candidate],
        ['teacher', null],
      ]) {
        episodes[name].push(
          run(
            seed,
            scenario,
            (s) =>
              model
                ? rankCombat(model, observeCombat(s))[0]
                : teacherCombat(s, frozen.teacherHorizon)[0],
            seed === frozen.acceptanceSeeds[0],
          ),
        );
      }
    }
  let replayErrors = 0;
  for (const e of [...episodes.parent, ...episodes.candidate]) {
    let s = createCombat(e.seed, e.scenario);
    for (const a of e.actions) {
      if (s.tick !== a.tick) replayErrors++;
      s = advanceCombat(
        s,
        COMBAT_ACTIONS.find((c) => c.key === a.key),
        a.ticks,
      );
    }
    if (hash(s) !== e.finalHash) replayErrors++;
  }
  const sums = Object.fromEntries(
    Object.entries(episodes).map(([k, v]) => [k, aggregate(v)]),
  );
  const grouping = episodes.candidate.filter((e) =>
    ['cluster', 'choke', 'flank'].includes(e.scenario),
  );
  const gates = {
    clear:
      sums.candidate.clears / sums.candidate.count >=
      frozen.frozenGates.minClearRate,
    damage:
      sums.candidate.damage / sums.candidate.count <=
      frozen.frozenGates.maxMeanDamage,
    kiting:
      sums.candidate.movingSafeKills / Math.max(1, sums.candidate.kills) >=
      frozen.frozenGates.minSafeMovingKillFraction,
    grouping:
      grouping.filter((e) => e.metrics.groupedKills > 0).length /
        grouping.length >=
      frozen.frozenGates.minGroupingCasesWithActualGroupedKills,
    teacher:
      sums.candidate.kills >=
      sums.teacher.kills * frozen.frozenGates.minKillFractionVsTeacher,
    replay: replayErrors === 0,
  };
  const perCase = Object.fromEntries(
    COMBAT_CASES.map((c) => [
      c,
      Object.fromEntries(
        Object.entries(episodes).map(([k, v]) => [
          k,
          aggregate(v.filter((e) => e.scenario === c)),
        ]),
      ),
    ]),
  );
  await save('evaluation.json', {
    sums,
    perCase,
    gates,
    replayErrors,
    groupingSuccessful: grouping.filter((e) => e.metrics.groupedKills > 0)
      .length,
    groupingEpisodes: grouping.length,
    candidateHash: hash(candidate),
    eligible: Object.values(gates).every(Boolean),
  });
  await save('episodes.json', episodes);
  console.log(JSON.stringify(await read('evaluation.json')));
} else if (phase === 'audit') {
  const parent = await read('parent-model.json'),
    candidate = await read('candidate-model.json'),
    rows = await read('dataset.json');
  await save('training-diagnostics-correction.json', {
    note: 'Original training.json before accuracy is invalid: teacher-sorted candidates caused the zero-score baseline to select the label. This append-only correction uses canonical runtime tie ordering. No weight update or evaluation rerun.',
    before: diagnostics(parent, rows),
    after: diagnostics(candidate, rows),
  });
  const previous = JSON.parse(
    await readFile(
      resolve('work/ai-training/round-2026-10-04-context/acceptance.json'),
      'utf8',
    ),
  );
  const old = JSON.parse(
    await readFile(
      resolve('work/ai-training/round-2026-10-04-judge/candidate-model.json'),
      'utf8',
    ),
  );
  let mismatches = 0,
    replayed = 0;
  for (const r of previous) {
    let s = lesson(r.case.seed, r.case.profile, r.case.scenario),
      index = 0;
    if (r.case.scenario === 'help') s = playerCommand(s, { type: 'help' });
    while (s.tick < r.before.state.tick) {
      if (r.before.inputs[index]?.tick === s.tick) {
        const input = r.before.inputs[index++],
          q = encounterRequest(s),
          c = rankEncounter(old, q)[0].candidate;
        if (c.id !== input.candidateId) mismatches++;
        const result = applyEncounterReply(s, q, {
          requestId: q.id,
          candidateId: c.id,
          modelVersion: old.version,
        });
        if (result.reason !== 'applied') mismatches++;
        s = result.state;
      }
      const directions = [
        { x: 1, z: 0 },
        { x: 0, z: -1 },
        { x: -1, z: 0 },
        { x: 0, z: 1 },
      ];
      s = stepEncounter(
        s,
        r.case.moving
          ? directions[Math.floor(s.tick / 120) % 4]
          : { x: 0, z: 0 },
      );
    }
    if (fingerprint(s) !== r.before.hash || index !== r.before.inputs.length)
      mismatches++;
    replayed++;
  }
  await save('old-regression.json', {
    model: old.version,
    live: 'encounter-cbf7f75b',
    replayed,
    mismatches,
    actualPickups: previous.reduce((n, r) => n + r.before.metrics.pickups, 0),
    waterGifts: previous.reduce((n, r) => n + r.before.metrics.given, 0),
    note: 'Original exploration/social model unchanged and re-inferred on 60 previous 40-second trajectories. New combat router integration has NOT been evaluated.',
  });
  const episodes = await read('episodes.json'),
    lure = {},
    packets = [];
  for (const [name, all] of Object.entries(episodes)) {
    let groupedKillShots = 0,
      safeMovingLureKills = 0,
      successfulEpisodes = 0;
    for (const e of all) {
      let s = createCombat(e.seed, e.scenario),
        count = 0;
      const history = [],
        snapshots = [];
      for (const a of e.actions) {
        for (let i = 0; i < a.ticks; i++) {
          const previousEvents = s.events.length;
          s = advanceCombat(
            s,
            COMBAT_ACTIONS.find((c) => c.key === a.key),
            1,
          );
          history.push({ tick: s.tick, x: s.player.x, z: s.player.z });
          while (history.length && history[0].tick < s.tick - 90)
            history.shift();
          const moved =
            Math.hypot(s.player.x - history[0].x, s.player.z - history[0].z) >=
            2;
          for (const shot of s.events
            .slice(previousEvents)
            .filter(
              (v) =>
                v.type === 'auto-shot' && v.amount > 0 && v.ids.length >= 3,
            )) {
            const separated = s.initiallySeparated.some(
              ([x, z]) => shot.ids.includes(x) && shot.ids.includes(z),
            );
            if (separated && moved && s.tick - s.player.hurtAt >= 60) {
              groupedKillShots++;
              safeMovingLureKills += shot.amount;
              count++;
            }
          }
        }
        if (
          name === 'candidate' &&
          e.seed === config.acceptanceSeeds[0] &&
          s.tick % 60 === 0
        )
          snapshots.push({
            tick: s.tick,
            player: s.player,
            observed: observeCombat(s).mobs.map((m) => ({
              id: m.id,
              x: m.x,
              z: m.z,
              kind: m.kind,
            })),
            action: a.key,
          });
      }
      if (count) successfulEpisodes++;
      if (
        name === 'candidate' &&
        (e.seed === config.acceptanceSeeds[0] ||
          (!e.metrics.clear && ['cover', 'choke'].includes(e.scenario)))
      )
        packets.push({
          seed: e.seed,
          scenario: e.scenario,
          metrics: e.metrics,
          finalPlayer: s.player,
          remaining: s.mobs.map((m) => ({
            id: m.id,
            x: m.x,
            z: m.z,
            hp: m.hp,
          })),
          finalObservation: observeCombat(s),
          actionsTail: e.actions.slice(-12),
          safeLureShots: count,
          snapshots,
        });
    }
    lure[name] = { groupedKillShots, safeMovingLureKills, successfulEpisodes };
  }
  await save('combat-audit.json', {
    lure,
    packets,
    definition:
      'A shot kills at least one and hits >=3 targets, includes a pair initially separated >2x blast radius+0.25m, player displacement >=2m over preceding <=90 ticks, and no damage in preceding 60 ticks. This verifies a safe moving lure outcome, not deliberative intent.',
  });
  console.log(
    JSON.stringify({
      diagnostics: await read('training-diagnostics-correction.json'),
      oldRegression: await read('old-regression.json'),
      lure,
      packets: packets.length,
    }),
  );
} else if (phase === 'finalize') {
  const evaluation = await read('evaluation.json'),
    training = await read('training.json'),
    post = await read('post-review.json'),
    regression = await read('old-regression.json'),
    usage = await read('development-usage.json'),
    checks = await read('checks.json');
  if (
    post.candidateHash !== evaluation.candidateHash ||
    !checks.passed ||
    regression.mismatches
  )
    throw new Error('Incomplete acceptance evidence');
  const live = JSON.parse(
    await readFile(
      resolve('apps/elevator-ai/src/lib/survival-ai/encounter-model.json'),
      'utf8',
    ),
  );
  if (live.version !== 'encounter-cbf7f75b')
    throw new Error('Unexpected live checkpoint');
  await cp(
    resolve('apps/elevator-ai/src/lib'),
    file('source/apps/elevator-ai/src/lib'),
    { recursive: true },
  );
  await cp(
    resolve('apps/elevator-ai/src/packages'),
    file('source/apps/elevator-ai/src/packages'),
    { recursive: true },
  );
  await cp(
    resolve('apps/elevator-ai/ai-lab/combat-round.mjs'),
    file('source/apps/elevator-ai/ai-lab/combat-round.mjs'),
  );
  await save('final-report.json', {
    round: 4,
    completed: true,
    promoted: false,
    live: live.version,
    numericalEligibility: evaluation.eligible,
    eligibility: evaluation.eligible && post.approvedForIntegration,
    userApprovalStillRequired: true,
    evaluation,
    training,
    correctedDiagnostics: await read('training-diagnostics-correction.json'),
    combatAudit: await read('combat-audit.json'),
    benchmark: await read('benchmark.json'),
    post,
    regression,
    usage,
    checks,
  });
  console.log(
    JSON.stringify({
      completed: true,
      promoted: false,
      eligibility: evaluation.eligible && post.approvedForIntegration,
    }),
  );
} else throw new Error('Use prepare, train, evaluate, audit or finalize');
