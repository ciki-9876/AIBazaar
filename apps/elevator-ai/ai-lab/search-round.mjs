/** Round 5 keeps combat physics/head frozen; learns an observation-only search head. */
import { readFile, writeFile, mkdir, access, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import {
  createCombat,
  observeCombat,
  advanceCombat,
  COMBAT_CASES,
  COMBAT_ACTIONS,
} from '../src/lib/survival-ai/combat-lab.ts';
import {
  emptySearchMemory,
  updateSearchMemory,
  searchChoices,
  rankSearch,
  createSearchModel,
  controllerDecision,
  SEARCH_FEATURES,
} from '../src/lib/survival-ai/combat-search.ts';
import {
  trainEncounter,
  evaluateEncounter,
} from '../src/lib/survival-ai/encounter-policy.ts';

const [phase, supplied] = process.argv.slice(2),
  dir = resolve(supplied || 'work/ai-training/round-2026-10-05-search');
const f = (n) => resolve(dir, n),
  read = async (n) => JSON.parse(await readFile(f(n), 'utf8'));
const hash = (v) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex');
await mkdir(dir, { recursive: true });
async function save(n, value) {
  try {
    await access(f(n));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    await writeFile(f(n), JSON.stringify(value, null, 2) + '\n');
    return;
  }
  throw new Error('Evidence exists: ' + n);
}
const combat = JSON.parse(
  await readFile(
    resolve('work/ai-training/round-2026-10-04-combat/candidate-model.json'),
    'utf8',
  ),
);
if (combat.core.version !== 'combat-ef76dd73')
  throw new Error('Unexpected combat parent');
const config = {
  round: 5,
  physics: 'f9-combat-lab-v1',
  controller: 'f9-combat-search-v1',
  combat: combat.core.version,
  combatHash: hash(combat),
  features: SEARCH_FEATURES,
  trainingSeeds: [51001, 51002, 51003, 51004],
  previousFailureSeeds: [43001, 43003, 43012],
  validationSeeds: [52001, 52002],
  acceptanceSeeds: [
    53001, 53002, 53003, 53004, 53005, 53006, 53007, 53008, 53009, 53010, 53011,
    53012,
  ],
  initializationSeed: 2026100501,
  trainingSeed: 2026100502,
  epochs: 180,
  rate: 0.008,
  ticks: 900,
  combatDecisionTicks: 12,
  searchActuatorTicks: 3,
  sampleEvery: 60,
  teacher:
    'public-geometry route coverage and own last-seen clues; no hidden locations, no privileged branch kills',
  judge: {
    model: 'gpt-6.1-sol',
    mode: 'current-session-review',
    independentBlind: false,
  },
  frozenGates: {
    minClearPerCase: 0.8,
    maxDeathIncrease: 0,
    maxMeanDamageIncrease: 3,
    minKillsRatio: 0.98,
    maxTailLoopEpisodes: 0,
    replayErrors: 0,
  },
  noAutomaticLivePromotion: true,
  formalSeasonContractCovered: false,
};
function run(seed, scenario, search, sample = false) {
  let s = createCombat(seed, scenario),
    memory = emptySearchMemory(),
    mode = 'combat',
    lostAt = null;
  const inputs = [],
    positions = [],
    rows = [],
    latency = [],
    frames = [];
  let reacquired = 0,
    searchDecisions = 0;
  while (s.tick < config.ticks && s.player.hp > 0 && s.mobs.length) {
    const o = observeCombat(s);
    memory = updateSearchMemory(memory, o);
    if (o.mobs.length && lostAt !== null) {
      reacquired++;
      latency.push(s.tick - lostAt);
      lostAt = null;
    }
    if (!o.mobs.length && lostAt === null) lostAt = s.tick;
    if (sample && !o.mobs.length && s.tick % config.sampleEvery === 0) {
      const cs = searchChoices(o, memory),
        best = [...cs].sort((a, b) => b.utility - a.utility)[0];
      rows.push({
        observation: o,
        memory: structuredClone(memory),
        candidates: cs.map((c) => ({
          key: c.key,
          features: c.features,
          utility: c.utility,
        })),
        bestKey: best.key,
        tick: s.tick,
      });
    }
    const decision = controllerDecision(o, memory, combat, search);
    memory = decision.memory;
    mode = decision.mode;
    const ticks = Math.min(
      config.ticks - s.tick,
      mode === 'search'
        ? config.searchActuatorTicks
        : config.combatDecisionTicks,
    );
    inputs.push({
      tick: s.tick,
      key: decision.action.key,
      ticks,
      mode,
      goal: decision.goal,
    });
    if (mode === 'search') searchDecisions++;
    positions.push({ tick: s.tick, x: s.player.x, z: s.player.z });
    if (s.tick % 12 === 0)
      frames.push({
        tick: s.tick,
        player: { x: s.player.x, z: s.player.z, hp: s.player.hp },
        mobs: s.mobs.map((m) => ({
          x: m.x,
          z: m.z,
          hp: m.hp,
          kind: m.kind,
          id: m.id,
        })),
        mode,
        goal: decision.goal,
      });
    s = advanceCombat(s, decision.action, ticks);
  }
  const tail = positions.filter((p) => s.tick - p.tick <= 300);
  const diameter = tail.length
    ? Math.hypot(
        Math.max(...tail.map((p) => p.x)) - Math.min(...tail.map((p) => p.x)),
        Math.max(...tail.map((p) => p.z)) - Math.min(...tail.map((p) => p.z)),
      )
    : 0;
  const lastShot =
    s.events.filter((e) => e.type === 'auto-shot').at(-1)?.tick || 0;
  const loop =
    s.mobs.length > 0 &&
    s.tick - lastShot > 300 &&
    tail.length > 20 &&
    diameter < 2.5;
  const m = {
    ...s.metrics,
    clear: s.mobs.length === 0 && s.player.hp > 0,
    died: s.player.hp <= 0,
    remaining: s.mobs.length,
    tick: s.tick,
    loop,
    reacquired,
    searchDecisions,
    latencies: latency,
  };
  return {
    seed,
    scenario,
    metrics: m,
    inputs,
    finalHash: hash(s),
    rows,
    frames,
    walls: s.walls,
    finalObserved: observeCombat(s).mobs.length,
  };
}
function aggregate(all) {
  return {
    episodes: all.length,
    clears: all.filter((e) => e.metrics.clear).length,
    deaths: all.filter((e) => e.metrics.died).length,
    ...Object.fromEntries(
      [
        'kills',
        'damage',
        'hits',
        'movingSafeKills',
        'groupedKills',
        'reacquired',
        'searchDecisions',
        'blockedTicks',
      ].map((k) => [k, all.reduce((n, e) => n + e.metrics[k], 0)]),
    ),
    loops: all.filter((e) => e.metrics.loop).length,
  };
}
function diagnostics(model, rows) {
  return evaluateEncounter(model.core, rows).map((v) => {
    const group = rows.filter((r) => r.partition === v.partition);
    const regret = group.map(
      (r) =>
        Math.max(...r.candidates.map((c) => c.utility)) -
        rankSearch(model, r.candidates)[0].utility,
    );
    return {
      ...v,
      meanUtilityRegret:
        regret.reduce((a, b) => a + b, 0) / Math.max(1, regret.length),
    };
  });
}
if (phase === 'prepare') {
  await save('config.json', config);
  await save('combat-model.json', combat);
  const parent = createSearchModel(config.initializationSeed);
  await save('parent-search.json', parent);
  const rows = [],
    packets = [];
  for (const [partition, seeds] of [
    ['train', config.trainingSeeds],
    ['test', config.validationSeeds],
  ]) {
    for (const seed of seeds)
      for (const scenario of COMBAT_CASES)
        for (const policy of [null, 'teacher']) {
          const r = run(seed, scenario, policy, true);
          for (const row of r.rows) {
            const id = `${seed}:${scenario}:${policy || 'old'}:${row.tick}`;
            rows.push({
              group: `${seed}:${scenario}`,
              partition,
              candidates: row.candidates,
              bestKey: row.bestKey,
              evidenceId: id,
            });
            if (
              packets.filter((p) => p.scenario === scenario && p.seed === seed)
                .length < 2
            )
              packets.push({ id, seed, scenario, partition, ...row });
          }
        }
  }
  for (const seed of config.previousFailureSeeds)
    for (const scenario of ['cover', 'choke']) {
      const r = run(seed, scenario, null, true);
      for (const row of r.rows)
        rows.push({
          group: `${seed}:${scenario}`,
          partition: 'train',
          candidates: row.candidates,
          bestKey: row.bestKey,
          evidenceId: `old-failure:${seed}:${scenario}:${row.tick}`,
        });
    }
  await save('dataset.json', rows);
  await save('review-packets.json', packets);
  await save('manifest.json', {
    configHash: hash(config),
    datasetHash: hash(rows),
    packetsHash: hash(packets),
    physicsSourceHash: hash(
      await readFile(
        resolve('apps/elevator-ai/src/lib/survival-ai/combat-lab.ts'),
        'utf8',
      ),
    ),
    controllerSourceHash: hash(
      await readFile(
        resolve('apps/elevator-ai/src/lib/survival-ai/combat-search.ts'),
        'utf8',
      ),
    ),
    train: rows.filter((r) => r.partition === 'train').length,
    validation: rows.filter((r) => r.partition === 'test').length,
  });
  console.log(JSON.stringify(await read('manifest.json')));
} else if (phase === 'train') {
  const rows = await read('dataset.json'),
    parent = await read('parent-search.json'),
    manifest = await read('manifest.json'),
    review = await read('session-review.json');
  if (
    manifest.configHash !== hash(config) ||
    manifest.datasetHash !== hash(rows) ||
    review.packetsHash !== manifest.packetsHash ||
    !review.approved
  )
    throw new Error('Unfrozen or unreviewed data');
  const t = performance.now(),
    core = trainEncounter(rows, config.trainingSeed, config.epochs, {
      initial: parent.core,
      source: 'synthetic-utility-imitation',
      rate: config.rate,
    });
  core.version = 'search-' + core.version.replace('encounter-', '');
  const candidate = { ...parent, core };
  await save('candidate-search.json', candidate);
  await save('training.json', {
    milliseconds: performance.now() - t,
    changed: [...core.w1, ...core.b1, ...core.w2].filter(
      (v, i) =>
        v !== [...parent.core.w1, ...parent.core.b1, ...parent.core.w2][i],
    ).length,
    before: diagnostics(parent, rows),
    after: diagnostics(candidate, rows),
    hash: hash(candidate),
    numericTokens: 0,
    languageCalls: 0,
  });
  console.log(JSON.stringify(await read('training.json')));
} else if (phase === 'evaluate') {
  const manifest = await read('manifest.json'),
    candidate = await read('candidate-search.json'),
    parent = await read('parent-search.json');
  if (
    manifest.configHash !== hash(config) ||
    manifest.controllerSourceHash !==
      hash(
        await readFile(
          resolve('apps/elevator-ai/src/lib/survival-ai/combat-search.ts'),
          'utf8',
        ),
      )
  )
    throw new Error('Controller drift');
  const all = { old: [], engineering: [], candidate: [], teacher: [] };
  for (const seed of config.acceptanceSeeds)
    for (const scenario of COMBAT_CASES) {
      for (const [name, policy] of [
        ['old', null],
        ['engineering', parent],
        ['candidate', candidate],
        ['teacher', 'teacher'],
      ]) {
        const r = run(seed, scenario, policy);
        delete r.rows;
        if (seed !== config.acceptanceSeeds[0]) delete r.frames;
        all[name].push(r);
      }
    }
  let replayErrors = 0;
  for (const e of [...all.old, ...all.engineering, ...all.candidate]) {
    let s = createCombat(e.seed, e.scenario);
    for (const input of e.inputs) {
      if (input.tick !== s.tick) replayErrors++;
      s = advanceCombat(
        s,
        COMBAT_ACTIONS.find((a) => a.key === input.key),
        input.ticks,
      );
    }
    if (hash(s) !== e.finalHash) replayErrors++;
  }
  const sums = Object.fromEntries(
      Object.entries(all).map(([k, a]) => [k, aggregate(a)]),
    ),
    perCase = Object.fromEntries(
      COMBAT_CASES.map((c) => [
        c,
        Object.fromEntries(
          Object.entries(all).map(([k, a]) => [
            k,
            aggregate(a.filter((e) => e.scenario === c)),
          ]),
        ),
      ]),
    );
  const gates = {
    perCase: Object.values(perCase).every(
      (c) =>
        c.candidate.clears / c.candidate.episodes >=
        config.frozenGates.minClearPerCase,
    ),
    survival: sums.candidate.deaths <= sums.old.deaths,
    damage:
      (sums.candidate.damage - sums.old.damage) / sums.old.episodes <=
      config.frozenGates.maxMeanDamageIncrease,
    kills:
      sums.candidate.kills >= sums.old.kills * config.frozenGates.minKillsRatio,
    loops: sums.candidate.loops === 0,
    replay: replayErrors === 0,
  };
  await save('episodes.json', all);
  await save('evaluation.json', {
    sums,
    perCase,
    gates,
    replayErrors,
    candidateHash: hash(candidate),
    combatUnchanged: hash(combat) === config.combatHash,
    localGatesPassed: Object.values(gates).every(Boolean),
  });
  console.log(JSON.stringify(await read('evaluation.json')));
} else if (phase === 'audit') {
  const all = await read('episodes.json');
  const result = {};
  const packets = [];
  for (const [name, episodes] of Object.entries(all)) {
    let noAttackOver10Seconds = 0,
      repeatedPairAtTail = 0;
    for (const e of episodes) {
      let s = createCombat(e.seed, e.scenario);
      for (const i of e.inputs)
        s = advanceCombat(
          s,
          COMBAT_ACTIONS.find((a) => a.key === i.key),
          i.ticks,
        );
      const lastShot =
        s.events.filter((v) => v.type === 'auto-shot').at(-1)?.tick || 0;
      const noProgress = s.mobs.length > 0 && s.tick - lastShot > 300;
      if (noProgress) noAttackOver10Seconds++;
      const tail = e.inputs.slice(-20).map((i) => i.key);
      const repeated =
        tail.length >= 20 && tail.every((k, j) => j < 2 || k === tail[j % 2]);
      if (noProgress && repeated) repeatedPairAtTail++;
      if (
        (name === 'candidate' && e.scenario === 'cover') ||
        (name === 'old' && !e.metrics.clear)
      ) {
        packets.push({
          name,
          seed: e.seed,
          scenario: e.scenario,
          metrics: e.metrics,
          noProgress,
          repeated,
          finalObserved: observeCombat(s).mobs.length,
          lastShot,
          tail,
        });
      }
    }
    result[name] = { noAttackOver10Seconds, repeatedPairAtTail };
  }
  await save('audit.json', {
    result,
    packets,
    note: 'Append-only diagnostic. The frozen 2.5m tail-diameter loop metric missed larger recurrent paths; do not claim that its 0-to-0 result proves no loops. Additional no-attack and repeated-action measures are diagnostics, not changed acceptance gates.',
  });
  console.log(JSON.stringify({ result, packets: packets.length }));
} else if (phase === 'finalize') {
  const evaluation = await read('evaluation.json'),
    review = await read('post-review.json'),
    checks = await read('checks.json');
  if (review.candidateHash !== evaluation.candidateHash || !checks.passed)
    throw new Error('Incomplete evidence');
  const live = JSON.parse(
    await readFile(
      resolve('apps/elevator-ai/src/lib/survival-ai/encounter-model.json'),
      'utf8',
    ),
  );
  if (live.version !== 'encounter-cbf7f75b')
    throw new Error('Live model drift');
  await cp(
    resolve('apps/elevator-ai/src/lib'),
    f('source/apps/elevator-ai/src/lib'),
    { recursive: true },
  );
  await cp(
    resolve('apps/elevator-ai/src/packages'),
    f('source/apps/elevator-ai/src/packages'),
    { recursive: true },
  );
  await cp(
    resolve('apps/elevator-ai/ai-lab/search-round.mjs'),
    f('source/apps/elevator-ai/ai-lab/search-round.mjs'),
  );
  await save('final-report.json', {
    completed: true,
    round: 5,
    promoted: false,
    live: live.version,
    localGatesPassed: evaluation.localGatesPassed,
    integrationEligible: false,
    evaluation,
    review,
    training: await read('training.json'),
    audit: await read('audit.json'),
    usage: await read('development-usage.json'),
    checks,
  });
  console.log(
    JSON.stringify({
      completed: true,
      promoted: false,
      localGatesPassed: evaluation.localGatesPassed,
    }),
  );
} else throw new Error('Use prepare, train, evaluate, audit or finalize');
