/** Offline author-defined utility labels. This teacher is NOT shipped in the game's worker. */
import { randomStream } from '../src/packages/core/random.ts';
import {
  createEncounter,
  encounterRequest,
  PROFILES,
  SCENARIOS,
} from '../src/lib/survival-ai/encounter.ts';
import type { Profile, Choice } from '../src/lib/survival-ai/encounter.ts';
import { ITEMS } from '../src/lib/survival-room.ts';
import { putInBag } from '../src/lib/survival-cargo.ts';
import type { TrainingRow } from '../src/lib/survival-ai/encounter-policy.ts';

export function teacherUtility(c: Choice) {
  const f = c.features,
    hp = 1 - f[8],
    food = 1 - f[9],
    water = 1 - f[10],
    free = f[11];
  const ally = f[12],
    broker = f[13],
    predator = f[14],
    relation = f[15] * 2 - 1;
  const d = f[16],
    near = f[17],
    target = f[18],
    value = f[22],
    duration = f[23],
    wanted = f[26],
    hostile = f[27];
  const risk = (1 - hp) * (1 - target);
  if (f[0]) return -0.8;
  if (f[1])
    return (
      0.35 +
      f[24] * 1.2 +
      f[25] * 0.9 +
      (target - near) * (hp < 0.6 ? 6 : 2) -
      (target < 0.2 ? 0.7 : 0)
    );
  if (f[2])
    return (
      (free === 0 ? -7 : 1.2) +
      value * (2 + broker * 2) +
      f[25] * 1.2 +
      f[29] * 3 +
      f[30] * 4 -
      d * 2 -
      duration * (1 - target) * 2 -
      risk * 4 -
      (hp < 0.25 ? 6 : 0)
    );
  if (f[3])
    return (
      f[28] * (f[8] > 0.35 ? 14 : 3) +
      f[29] * (food < 0.5 ? 13 : 1.5) +
      f[30] * (water < 0.5 ? 14 : 1.5) -
      0.3
    );
  if (f[4]) return free === 0 ? 0.6 - Math.max(0, -value) * 1.5 : -8;
  if (f[5])
    return (
      wanted * (ally * 6 + broker * 0.4 + predator * 0.1) +
      relation * 2 -
      broker * 2 -
      (water < 0.4 ? 7 : 0) -
      hostile * 6 -
      d -
      1
    );
  if (f[6])
    return (
      predator * 4.8 +
      hostile * 4 +
      (relation < 0 ? 1 : 0) -
      ally * 2 -
      (1 - hp) * 8 -
      (near < 0.3 ? 2.8 : 0) -
      d * 2 -
      (wanted && ally > 0.8 ? 2 : 0)
    );
  if (f[7])
    return (
      (hp < 0.35 ? 6 + (1 - hp) * 3 : -1.2) +
      f[31] * 1.5 +
      f[33] * 4 +
      (Math.min(food, water) < 0.08 ? 5 : 0) -
      d * 2
    );
  throw new Error('Unknown teacher action');
}
export function encounterTrainingData(): TrainingRow[] {
  const rows: TrainingRow[] = [];
  for (const partition of ['train', 'test'] as const)
    for (const scenario of SCENARIOS)
      for (const profile of Object.keys(PROFILES) as Profile[])
        for (
          let variation = 0;
          variation < (partition === 'train' ? 48 : 12);
          variation++
        ) {
          const seed =
            (partition === 'train' ? 10000 : 90000) +
            SCENARIOS.indexOf(scenario) * 1000 +
            variation * 7;
          const random = randomStream(seed, 'f9-encounter-training-state-v1');
          const s = createEncounter(
            seed,
            profile,
            scenario.id,
            partition + ':' + seed + ':' + profile,
          );
          const a = s.actors[1];
          // Independent draws matter: coupling healthy states to "no monsters"
          // would teach a spurious correlation and fail in actual rooms.
          if (variation !== 0) {
            a.hp = 10 + random() * 90;
            a.water = 5 + random() * 95;
            a.food = 5 + random() * 95;
            a.relation = [-1, 0, 0.5, 1][Math.floor(random() * 4)];
            if (random() < 0.5) s.enemies = [];
          }
          if ((variation === 0 && scenario.id === 'help') || random() < 0.5) {
            a.x = s.actors[0].x + 1;
            a.z = s.actors[0].z;
            s.actors[0].help = { kind: 'water', until: 300 };
          }
          const emptyBag = variation > 0 && random() < 0.4;
          if (emptyBag) a.bag = [];
          for (const kind of (emptyBag || variation === 0
            ? []
            : ['water', 'bread', 'medicine']) as (
            | 'water'
            | 'bread'
            | 'medicine'
          )[]) {
            const item = { ...ITEMS[kind], uid: 'training:' + kind };
            a.bag = putInBag(a.bag, item) || a.bag;
          }
          // Frozen decision samples use real legal candidates, private fog and bag rules.
          if (random() < 0.25) {
            a.intent = { type: 'move', to: { x: a.x - 3, z: a.z - 3 } };
            a.path = [a.intent.to];
          }
          const request = encounterRequest(s);
          const best = [...request.candidates].sort(
            (a, b) => teacherUtility(b) - teacherUtility(a),
          )[0];
          rows.push({
            group: partition + ':' + seed,
            partition,
            candidates: request.candidates.map((c) => ({
              features: c.features,
              key: c.key,
              utility: teacherUtility(c),
            })),
            bestKey: best.key,
          });
        }
  return rows;
}
