/** Small calibration curriculum. This is encounter-v2, not the production season. */
import { randomStream } from '../../packages/core/random.ts';
import {
  createEncounter,
  encounterRequest,
  applyEncounterReply,
  stepEncounter,
} from './encounter.ts';
import type { Encounter, Profile, Scenario } from './encounter.ts';
import { chooseEncounter } from './encounter-policy.ts';
import type { EncounterModel, TrainingRow } from './encounter-policy.ts';
import { ITEMS } from '../survival-room.ts';
import { putInBag } from '../survival-cargo.ts';
import { revealFog } from '../survival-world.ts';
import { fingerprint } from './protocol.ts';

export const ROUND_CONFIG = Object.freeze({
  schema: 'f9-training-round-v1',
  rules: 'f9-encounter-v2',
  trainingSeeds: [41001, 41002, 41003],
  validationSeeds: [52001],
  acceptanceSeeds: [63001, 63002],
  branchTicks: 120,
  decisionTicks: 15,
  episodeTicks: 600,
  epochs: 180,
  learningRate: 0.01,
  trainingSeed: 20261004,
  // Fixed before seeing acceptance outcomes; one evaluation, never tuned on that set.
  gate: {
    meanGain: 0.05,
    maximumProfileRegression: 0.1,
    maximumDeathIncrease: 0,
    violations: 0,
  },
});

export function lesson(
  seed: number,
  profile: Profile,
  scenario: Scenario,
): Encounter {
  const s = createEncounter(
    seed,
    profile,
    scenario,
    `round1:${seed}:${profile}:${scenario}`,
  );
  const rng = randomStream(seed, `round1-curriculum:${scenario}`),
    a = s.actors[1];
  a.food = 20 + rng() * 70;
  if (scenario !== 'help') a.water = 8 + rng() * 65;
  a.hp = scenario === 'exit' ? 12 + rng() * 18 : 40 + rng() * 60;
  // Genuine items and IDs. No resource is given during a trajectory or rollout.
  for (const kind of ['water', 'bread', 'medicine'] as const) {
    if (rng() < 0.65) {
      const bag = putInBag(a.bag, {
        ...ITEMS[kind],
        uid: `${s.sessionId}:course:${kind}`,
      });
      if (bag) a.bag = bag;
    }
  }
  a.fog = revealFog(a, a.fog, s.world, 11);
  return s;
}

/** Reconstruct a belief WITHOUT hidden caches, opponent inventory or unseen enemies.
 * Closed loot is an explicit prior sample, identical for every branch of this row.
 * Map geometry and the standard visible loadout are public in this calibration arena.
 * Spawn stream is suppressed only in belief branches (<4 seconds); acceptance uses real waves.
 */
export function observedBelief(s: Encounter, sampleSeed: number): Encounter {
  const q = encounterRequest(s),
    n = structuredClone(s),
    a = n.actors[1];
  const visibleOthers = new Set(q.observation.others.map((x) => x.id));
  const visibleEnemies = new Set(q.observation.threats.map((x) => x.id));
  const visibleCaches = new Set(q.observation.caches.map((x) => x.id));
  n.enemies = n.enemies
    .filter((x) => visibleEnemies.has(x.id))
    .map((x) => ({
      id: x.id,
      x: x.x,
      z: x.z,
      hp: x.hp,
      maxHp: x.hp,
      kind: 'crawler' as const,
      pursuit: 'ambush' as const,
      sight: 9,
      awake: false,
      home: { x: x.x, z: x.z },
      nextAttack: s.tick + 18,
      hitAt: -100,
      windup: 0,
      aim: null,
    }));
  for (const body of n.actors)
    if (body.id !== a.id) {
      body.bag = [];
      body.intent = { type: 'wait' };
      body.path = [];
      body.searching = null;
      body.searchTicks = 0;
      body.extraction = 0;
      body.cooldowns = {};
      body.navigation = undefined;
      body.food = 72;
      body.water = 62;
      body.relation = 0;
      body.hostile = q.observation.others.find((x) => x.id === body.id)?.hostile
        ? [a.id]
        : [];
      if (!visibleOthers.has(body.id)) {
        body.status = 'extracted';
        body.hp = 100;
      }
    }
  const pool = [
    'water',
    'bread',
    'scrap',
    'lift-material',
    'capacitor',
  ] as const;
  n.caches = n.caches
    .filter((c) => visibleCaches.has(c.id))
    .map((c) => {
      const visible = q.observation.caches.find((x) => x.id === c.id)!;
      const rng = randomStream(sampleSeed, `round1-loot-prior:${c.id}`);
      const kinds = visible.kind
        ? [visible.kind]
        : [
            pool[Math.floor(rng() * pool.length)],
            pool[Math.floor(rng() * pool.length)],
          ];
      const contents = kinds.map((kind, i) => ({
        ...ITEMS[kind],
        uid: `${n.sessionId}:belief:${c.id}:${i}`,
      }));
      return { ...c, item: contents[0], contents, guardId: undefined };
    });
  // Counterfactuals cannot reveal events, effects or RNG state from the real future.
  n.events = [];
  n.effects = [];
  n.mail = undefined;
  n.serial = 5000;
  return n;
}

const lootValue = (s: Encounter, id = 'rival') =>
  s.actors
    .find((a) => a.id === id)!
    .bag.reduce(
      (total, x) =>
        total + x.value / 48 + (x.kind === 'lift-material' ? 0.2 : 0),
      0,
    );

/** Outcome objective, not a prescribed action table. Weights are frozen for the round.
 * Health, actual usable nutrition, real retained loot, aid and observed combat consequences.
 * Exploration uses newly revealed cells; pure movement distance earns nothing.
 */
export function outcome(start: Encounter, end: Encounter): number {
  const a = start.actors[1],
    b = end.actors[1],
    other = end.actors[0];
  const healthy = (v: number) => Math.min(50, Math.max(0, v)) / 50;
  const gain =
    (b.hp - a.hp) / 35 +
    healthy(b.food) -
    healthy(a.food) +
    healthy(b.water) -
    healthy(a.water);
  const fresh = b.fog.explored.reduce(
    (n, v, i) => n + Number(Boolean(v) && !a.fog.explored[i]),
    0,
  );
  const aid = Math.max(
    0,
    lootValue(end, 'player') - lootValue(start, 'player'),
  );
  const traits =
    start.profile === 'ally'
      ? [1, 0.2, 0.05]
      : start.profile === 'broker'
        ? [0.15, 1, 0.25]
        : [0.05, 0.45, 1];
  const retained = lootValue(end) - lootValue(start);
  const opponentHarm = Math.max(0, start.actors[0].hp - other.hp) / 100;
  const banked =
    b.status === 'extracted'
      ? a.hp < 35
        ? 3
        : lootValue(end) > 0
          ? 1
          : -0.75
      : 0;
  return (
    gain +
    retained * (0.5 + traits[1] * 0.5) +
    fresh / 600 +
    aid * traits[0] * 2 +
    opponentHarm * traits[2] * 0.5 +
    banked -
    (b.status === 'dead' ? 6 : 0)
  );
}

export function runEpisode(
  start: Encounter,
  model: EncounterModel,
  ticks: number = ROUND_CONFIG.episodeTicks,
) {
  let state = structuredClone(start);
  const inputs: {
    tick: number;
    key: string;
    action: unknown;
    requestId: string;
    candidateId: string;
    modelVersion: string;
  }[] = [];
  let violations = 0;
  for (let i = 0; i < ticks && state.actors[1].status === 'active'; i++) {
    if (i % ROUND_CONFIG.decisionTicks === 0) {
      const q = encounterRequest(state),
        reply = chooseEncounter(model, q);
      const c = q.candidates.find((x) => x.id === reply.candidateId)!;
      const result = applyEncounterReply(state, q, reply);
      if (result.reason !== 'applied') violations++;
      inputs.push({ tick: state.tick, key: c.key, action: c.action, ...reply });
      state = result.state;
    }
    state = stepEncounter(state);
  }
  return {
    state,
    inputs,
    violations,
    score: outcome(start, state),
    hash: fingerprint(state),
  };
}

export function replayEpisode(
  start: Encounter,
  inputs: ReturnType<typeof runEpisode>['inputs'],
  finalTick: number,
) {
  let s = structuredClone(start),
    index = 0;
  while (s.tick < finalTick) {
    if (inputs[index]?.tick === s.tick) {
      const input = inputs[index++],
        q = encounterRequest(s);
      const result = applyEncounterReply(s, q, {
        requestId: input.requestId,
        candidateId: input.candidateId,
        modelVersion: input.modelVersion,
      });
      if (result.reason !== 'applied') throw new Error('Replay input rejected');
      s = result.state;
    }
    s = stepEncounter(s);
  }
  if (index !== inputs.length) throw new Error('Replay has unused inputs');
  return s;
}

export function rolloutRow(
  s: Encounter,
  baseline: EncounterModel,
  partition: 'train' | 'test',
): TrainingRow {
  const q = encounterRequest(s),
    belief = observedBelief(s, s.seed);
  const results = q.candidates.map((c) => {
    let n = structuredClone(belief);
    const bq = encounterRequest(n),
      bc = bq.candidates.find((x) => x.key === c.key);
    if (!bc) throw new Error('Belief changed observed legal actions: ' + c.key);
    n = applyEncounterReply(n, bq, {
      requestId: bq.id,
      candidateId: bc.id,
      modelVersion: 'counterfactual-input',
    }).state;
    for (
      let i = 0;
      i < ROUND_CONFIG.branchTicks && n.actors[1].status === 'active';
      i++
    ) {
      // Hold the first action for one second, then use the frozen old policy for continuation.
      if (i >= 30 && i % ROUND_CONFIG.decisionTicks === 0) {
        const next = encounterRequest(n);
        n = applyEncounterReply(n, next, chooseEncounter(baseline, next)).state;
      }
      // No future wave hidden in the training teacher's observations.
      const beforeIds = n.enemies.map((e) => e.id);
      n = stepEncounter(n);
      if (n.tick % 450 === 0)
        n.enemies = n.enemies.filter((e) => beforeIds.includes(e.id));
    }
    return { key: c.key, features: c.features, utility: outcome(belief, n) };
  });
  const best = [...results].sort((a, b) => b.utility - a.utility)[0];
  const low = Math.min(...results.map((c) => c.utility)),
    high = Math.max(...results.map((c) => c.utility));
  // Relative values in [-1,1]. Keep low-contrast rows small, so noise doesn't become a hard label.
  const center = (low + high) / 2,
    scale = Math.max(0.5, (high - low) / 2);
  return {
    group: s.sessionId,
    partition,
    bestKey: best.key,
    candidates: results.map((c) => ({
      ...c,
      utility: (c.utility - center) / scale,
    })),
  };
}
