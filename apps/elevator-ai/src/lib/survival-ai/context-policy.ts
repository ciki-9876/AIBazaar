import { randomStream } from '../../packages/core/random.ts';
import { pathTo, type Point } from '../survival-room.ts';
import { ELEVATOR } from '../survival-world.ts';
import {
  encounterRequest,
  type Encounter,
  type EncounterRequest,
  type Choice,
} from './encounter.ts';
import {
  validateEncounterModel,
  type EncounterModel,
  type EncounterPreference,
} from './encounter-policy.ts';
import { fingerprint } from './protocol.ts';

/** Experimental adapter only. The live v1 worker and legal-action executor stay unchanged. */
export const CONTEXT_INPUTS = 44;
export const CONTEXT_FEATURES = [
  'same-navigation-goal',
  'goal-age',
  'own-search-progress',
  'recent-return-to-goal',
  'visible-route-clearance',
  'route-length',
  'nearby-visible-threat',
  'recent-own-injury',
  'own-path-remaining',
  'search-time-remaining',
] as const;
export type GoalMemory = { tick: number; key: string }[];
export type ContextModel = Omit<EncounterModel, 'schema'> & {
  schema: 'f9-context-mlp-v2';
};
export type ContextChoice = Choice & { features: number[] };
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const cap = (x: number) => Math.max(0, Math.min(1, x));

export function recordGoal(
  memory: GoalMemory,
  tick: number,
  key: string,
): GoalMemory {
  const recent = memory.filter((m) => tick - m.tick <= 360);
  if (
    key.startsWith('search:') ||
    key === 'extract' ||
    key.startsWith('move:')
  ) {
    if (key !== 'move:continue' && recent.at(-1)?.key !== key)
      recent.push({ tick, key });
  }
  return recent;
}

export function contextChoices(
  s: Encounter,
  memory: GoalMemory,
  q: EncounterRequest = encounterRequest(s),
): ContextChoice[] {
  const a = s.actors.find((body) => body.id === q.actorId)!;
  const near = Math.min(20, ...q.observation.threats.map((t) => dist(a, t)));
  const remainingPath = a.path.reduce(
    (sum, p, i) => sum + dist(i ? a.path[i - 1] : a, p),
    0,
  );
  return q.candidates.map((c) => {
    const intent = c.action;
    const cache =
      intent.type === 'search'
        ? q.observation.caches.find((r) => r.id === intent.cacheId)
        : undefined;
    const other =
      'actorId' in intent
        ? q.observation.others.find((r) => r.id === intent.actorId)
        : undefined;
    const to =
      intent.type === 'move'
        ? intent.to
        : intent.type === 'extract'
          ? ELEVATOR
          : cache || other || a;
    const path = dist(a, to) > 0.2 ? pathTo(a, to, s.world) : [];
    let length = 0;
    const samples: Point[] = [a];
    path.forEach((p, i) => {
      const from = i ? path[i - 1] : a,
        segment = dist(from, p);
      length += segment;
      const steps = Math.max(1, Math.ceil(segment));
      for (let j = 1; j <= steps; j++)
        samples.push({
          x: from.x + ((p.x - from.x) * j) / steps,
          z: from.z + ((p.z - from.z) * j) / steps,
        });
    });
    const clearance =
      samples.reduce(
        (sum, p) =>
          sum +
          cap(Math.min(8, ...q.observation.threats.map((t) => dist(p, t))) / 8),
        0,
      ) / samples.length;
    const same = c.key === a.navigation?.goalKey || c.key === 'move:continue';
    const progress =
      cache && cache.id === a.searching ? a.searchTicks / cache.duration : 0;
    const last = memory.at(-1);
    const returned =
      !same &&
      memory
        .slice(0, -1)
        .some((r) => r.key === c.key && q.tick - r.tick <= 180);
    return {
      ...c,
      features: [
        ...c.features,
        Number(same),
        cap(last ? (q.tick - last.tick) / 180 : 0),
        cap(progress),
        Number(returned),
        clearance,
        cap(length / 32),
        Number(near < 3),
        cap(1 - (q.tick - a.hurtAt) / 90),
        cap(remainingPath / 32),
        cache
          ? cap(
              (cache.duration -
                (cache.id === a.searching ? a.searchTicks : 0)) /
                150,
            )
          : 0,
      ],
    };
  });
}

export function expandContextModel(parent: EncounterModel): ContextModel {
  validateEncounterModel(parent);
  const m: ContextModel = {
    ...structuredClone(parent),
    schema: 'f9-context-mlp-v2',
    inputs: CONTEXT_INPUTS,
    w1: parent.b1.flatMap((_, h) => [
      ...parent.w1.slice(h * 34, h * 34 + 34),
      ...Array(CONTEXT_INPUTS - 34).fill(0),
    ]),
    training: { ...parent.training, parentVersion: parent.version },
  };
  m.version = 'context-zero-' + fingerprint(m);
  return m;
}

export function validateContextModel(
  value: unknown,
): asserts value is ContextModel {
  const m = value as ContextModel;
  if (
    !m ||
    m.schema !== 'f9-context-mlp-v2' ||
    m.inputs !== CONTEXT_INPUTS ||
    m.hidden !== 32 ||
    ![m.w1, m.b1, m.w2].every(Array.isArray) ||
    m.w1.length !== CONTEXT_INPUTS * 32 ||
    m.b1.length !== 32 ||
    m.w2.length !== 32 ||
    ![...m.w1, ...m.b1, ...m.w2].every(Number.isFinite)
  )
    throw new Error('Invalid context model');
}
function forward(m: ContextModel, x: number[]) {
  const h = m.b1.map((b, row) =>
    Math.tanh(
      b + x.reduce((n, v, col) => n + v * m.w1[row * CONTEXT_INPUTS + col], 0),
    ),
  );
  return { h, score: h.reduce((n, v, row) => n + v * m.w2[row], 0) };
}
export function rankContext(m: ContextModel, choices: ContextChoice[]) {
  return choices
    .map((candidate, i) => ({
      candidate,
      i,
      score: forward(m, candidate.features).score,
    }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
}

/** Only labeled train groups enter gradients. New context weights start at zero, never a hand-authored policy. */
export function trainContextPreferences(
  rows: EncounterPreference[],
  initial: ContextModel,
  seed: number,
  epochs = 160,
  rate = 0.003,
  retention = 0.015,
): ContextModel {
  validateContextModel(initial);
  const train = rows.filter((r) => r.partition === 'train');
  if (
    !train.length ||
    rows.some(
      (r) =>
        !r.group ||
        !r.evidenceId ||
        !['train', 'test'].includes(r.partition) ||
        [r.preferred, r.rejected].some(
          (x) => x.length !== CONTEXT_INPUTS || !x.every(Number.isFinite),
        ),
    ) ||
    rows.some(
      (r) => r.partition === 'test' && train.some((t) => t.group === r.group),
    )
  )
    throw new Error('Invalid or leaking context preferences');
  if (
    !Number.isSafeInteger(seed) ||
    !Number.isSafeInteger(epochs) ||
    epochs < 1 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isFinite(retention) ||
    retention < 0
  )
    throw new Error('Invalid context training options');
  const m = structuredClone(initial),
    random = randomStream(seed, 'f9-context-preference-order-v2');
  m.training = {
    seed,
    epochs,
    examples: train.length,
    source: 'session-reviewed-preference-v1',
    datasetId: fingerprint(rows),
    parentVersion: initial.version,
  };
  for (let epoch = 0; epoch < epochs; epoch++) {
    const order = [...train];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const r of order) {
      const a = forward(m, r.preferred),
        b = forward(m, r.rejected);
      const g =
        -1 / (1 + Math.exp(Math.max(-60, Math.min(60, a.score - b.score))));
      const d1 = Array(m.w1.length).fill(0),
        db = Array(32).fill(0),
        d2 = Array(32).fill(0);
      for (const [x, p, sign] of [
        [r.preferred, a, 1],
        [r.rejected, b, -1],
      ] as const)
        for (let h = 0; h < 32; h++) {
          const back = sign * g * m.w2[h] * (1 - p.h[h] ** 2);
          d2[h] += sign * g * p.h[h];
          db[h] += back;
          for (let c = 0; c < CONTEXT_INPUTS; c++)
            d1[h * CONTEXT_INPUTS + c] += back * x[c];
        }
      m.w1 = m.w1.map(
        (v, i) => v - rate * (d1[i] + retention * (v - initial.w1[i])),
      );
      m.b1 = m.b1.map(
        (v, i) => v - rate * (db[i] + retention * (v - initial.b1[i])),
      );
      m.w2 = m.w2.map(
        (v, i) => v - rate * (d2[i] + retention * (v - initial.w2[i])),
      );
    }
  }
  m.version = 'context-' + fingerprint(m);
  validateContextModel(m);
  return m;
}
