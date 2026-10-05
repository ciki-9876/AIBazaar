import { randomStream } from '../../packages/core/random.ts';
import { fingerprint } from './protocol.ts';
import type { EncounterRequest, EncounterReply, Choice } from './encounter.ts';
// Kept here as a portable contract: the worker does not load game simulation or rendering.
const DIMENSIONS = 34;
const HIDDEN = 32;
export type EncounterModel = {
  schema: 'f9-encounter-mlp-v1';
  version: string;
  inputs: number;
  hidden: number;
  w1: number[];
  b1: number[];
  w2: number[];
  training: {
    seed: number;
    epochs: number;
    examples: number;
    source:
      | 'synthetic-utility-imitation'
      | 'observed-rollout-v1'
      | 'session-reviewed-preference-v1';
    datasetId: string;
    parentVersion?: string;
  };
};
export type TrainingRow = {
  group: string;
  partition: 'train' | 'test';
  candidates: { features: number[]; key: string; utility: number }[];
  bestKey: string;
};
export function validateEncounterModel(
  value: unknown,
): asserts value is EncounterModel {
  const m = value as EncounterModel;
  if (
    !m ||
    m.schema !== 'f9-encounter-mlp-v1' ||
    m.inputs !== DIMENSIONS ||
    m.hidden !== HIDDEN ||
    typeof m.version !== 'string' ||
    !m.training ||
    ![
      'synthetic-utility-imitation',
      'observed-rollout-v1',
      'session-reviewed-preference-v1',
    ].includes(m.training.source) ||
    ![m.w1, m.b1, m.w2].every(Array.isArray) ||
    m.w1.length !== DIMENSIONS * HIDDEN ||
    m.b1.length !== HIDDEN ||
    m.w2.length !== HIDDEN ||
    ![...m.w1, ...m.b1, ...m.w2].every(Number.isFinite)
  )
    throw new Error('Invalid encounter model');
}

export type EncounterPreference = {
  group: string;
  partition: 'train' | 'test';
  preferred: number[];
  rejected: number[];
  evidenceId: string;
};

/** Learn only explicitly reviewed comparisons. Unreviewed actions have no invented label.
 * Logistic pair loss, with a fixed pull toward the parent to limit forgetting.
 * Test groups never take part in gradient updates or early stopping.
 */
export function trainEncounterPreferences(
  rows: EncounterPreference[],
  initial: EncounterModel,
  seed: number,
  epochs = 160,
  rate = 0.003,
  retention = 0.01,
): EncounterModel {
  validateEncounterModel(initial);
  const train = rows.filter((r) => r.partition === 'train');
  if (
    !train.length ||
    rows.some(
      (r) =>
        !r.group ||
        !r.evidenceId ||
        !['train', 'test'].includes(r.partition) ||
        [r.preferred, r.rejected].some(
          (x) => x.length !== DIMENSIONS || !x.every(Number.isFinite),
        ),
    ) ||
    rows.some(
      (r) => r.partition === 'test' && train.some((t) => t.group === r.group),
    )
  )
    throw new Error('Invalid or leaking preference data');
  if (
    !Number.isSafeInteger(seed) ||
    !Number.isSafeInteger(epochs) ||
    epochs < 1 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isFinite(retention) ||
    retention < 0
  )
    throw new Error('Invalid preference training options');
  const model = structuredClone(initial);
  model.training = {
    seed,
    epochs,
    examples: train.length,
    source: 'session-reviewed-preference-v1',
    datasetId: fingerprint(rows),
    parentVersion: initial.version,
  };
  const random = randomStream(seed, 'f9-preference-order-v1');
  for (let epoch = 0; epoch < epochs; epoch++) {
    const order = [...train];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const row of order) {
      const a = forward(model, row.preferred),
        b = forward(model, row.rejected);
      const g =
        -1 / (1 + Math.exp(Math.max(-60, Math.min(60, a.score - b.score))));
      const dw1 = Array(model.w1.length).fill(0),
        db1 = Array(HIDDEN).fill(0),
        dw2 = Array(HIDDEN).fill(0);
      for (const [x, p, sign] of [
        [row.preferred, a, 1],
        [row.rejected, b, -1],
      ] as const) {
        for (let h = 0; h < HIDDEN; h++) {
          const back = sign * g * model.w2[h] * (1 - p.h[h] ** 2);
          dw2[h] += sign * g * p.h[h];
          db1[h] += back;
          for (let c = 0; c < DIMENSIONS; c++)
            dw1[h * DIMENSIONS + c] += back * x[c];
        }
      }
      model.w1 = model.w1.map(
        (v, i) => v - rate * (dw1[i] + retention * (v - initial.w1[i])),
      );
      model.b1 = model.b1.map(
        (v, i) => v - rate * (db1[i] + retention * (v - initial.b1[i])),
      );
      model.w2 = model.w2.map(
        (v, i) => v - rate * (dw2[i] + retention * (v - initial.w2[i])),
      );
    }
  }
  model.version = 'encounter-' + fingerprint(model);
  validateEncounterModel(model);
  return model;
}
export function validateEncounterRequest(
  value: unknown,
): asserts value is EncounterRequest {
  const r = value as EncounterRequest;
  if (
    !r ||
    r.schema !== 'f9-encounter-request-v1' ||
    typeof r.id !== 'string' ||
    typeof r.actorId !== 'string' ||
    !Number.isSafeInteger(r.tick) ||
    !Array.isArray(r.candidates) ||
    !r.candidates.length ||
    r.candidates.length > 64 ||
    r.candidates.some(
      (c) =>
        !c ||
        typeof c.id !== 'string' ||
        !c.id.startsWith(r.id + '/') ||
        !Array.isArray(c.features) ||
        c.features.length !== DIMENSIONS ||
        !c.features.every((v) => Number.isFinite(v) && Math.abs(v) <= 100),
    )
  )
    throw new Error('Invalid encounter request');
}
function forward(m: EncounterModel, x: number[]) {
  const h = m.b1.map((bias, row) =>
    Math.tanh(
      bias +
        x.reduce((sum, v, col) => sum + v * m.w1[row * DIMENSIONS + col], 0),
    ),
  );
  return { h, score: h.reduce((sum, v, row) => sum + v * m.w2[row], 0) };
}
export function rankEncounter(
  m: EncounterModel,
  request: EncounterRequest,
): { candidate: Choice; score: number }[] {
  return request.candidates
    .map((candidate) => ({
      candidate,
      score: forward(m, candidate.features).score,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        request.candidates.indexOf(a.candidate) -
          request.candidates.indexOf(b.candidate),
    );
}
export function chooseEncounter(
  m: EncounterModel,
  request: EncounterRequest,
): EncounterReply {
  validateEncounterRequest(request);
  return {
    requestId: request.id,
    candidateId: rankEncounter(m, request)[0].candidate.id,
    modelVersion: m.version,
  };
}
export function trainEncounter(
  rows: TrainingRow[],
  seed: number,
  epochs = 220,
  options: {
    initial?: EncounterModel;
    source?: EncounterModel['training']['source'];
    rate?: number;
  } = {},
): EncounterModel {
  const train = rows.filter((row) => row.partition === 'train'),
    test = rows.filter((row) => row.partition === 'test');
  if (
    !train.length ||
    test.some((row) => train.some((t) => t.group === row.group))
  )
    throw new Error('Leaking dataset partitions');
  if (
    !Number.isSafeInteger(seed) ||
    !Number.isSafeInteger(epochs) ||
    epochs < 1 ||
    !Number.isFinite(options.rate ?? 0.015) ||
    (options.rate ?? 0.015) <= 0 ||
    rows.some(
      (row) =>
        !row.candidates.length ||
        !row.candidates.some((c) => c.key === row.bestKey) ||
        row.candidates.some(
          (c) =>
            c.features.length !== DIMENSIONS ||
            !c.features.every(Number.isFinite) ||
            !Number.isFinite(c.utility),
        ),
    )
  )
    throw new Error('Invalid training data or options');
  if (options.initial) validateEncounterModel(options.initial);
  const random = randomStream(seed, 'f9-encounter-policy-init-v1');
  const model: EncounterModel = {
    schema: 'f9-encounter-mlp-v1',
    version: '',
    inputs: DIMENSIONS,
    hidden: HIDDEN,
    w1: Array.from(
      { length: DIMENSIONS * HIDDEN },
      () => (random() - 0.5) * 0.35,
    ),
    b1: Array(HIDDEN).fill(0),
    w2: Array.from({ length: HIDDEN }, () => (random() - 0.5) * 0.35),
    training: {
      seed,
      epochs,
      examples: train.length,
      source: options.source ?? 'synthetic-utility-imitation',
      datasetId: fingerprint(rows),
      ...(options.initial ? { parentVersion: options.initial.version } : {}),
    },
  };
  if (options.initial) {
    model.w1 = [...options.initial.w1];
    model.b1 = [...options.initial.b1];
    model.w2 = [...options.initial.w2];
  }
  const shuffle = randomStream(seed, 'f9-encounter-policy-order-v1');
  for (let epoch = 0; epoch < epochs; epoch++) {
    const data = [...train];
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(shuffle() * (i + 1));
      [data[i], data[j]] = [data[j], data[i]];
    }
    for (const row of data) {
      const predictions = row.candidates.map((c) => forward(model, c.features));
      const dw1 = Array(model.w1.length).fill(0),
        db1 = Array(HIDDEN).fill(0),
        dw2 = Array(HIDDEN).fill(0);
      row.candidates.forEach((c, i) => {
        // Teach ALL candidate outcomes, not just winners. Otherwise a never-winning
        // movement choice can acquire arbitrary scores and collapse on empty bags.
        const gradient =
          (predictions[i].score - c.utility) / row.candidates.length;
        for (let h = 0; h < HIDDEN; h++) {
          const v = predictions[i].h[h],
            back = gradient * model.w2[h] * (1 - v * v);
          dw2[h] += gradient * v;
          db1[h] += back;
          for (let col = 0; col < DIMENSIONS; col++)
            dw1[h * DIMENSIONS + col] += back * c.features[col];
        }
      });
      const rate = options.rate ?? 0.015;
      model.w1 = model.w1.map((v, i) => v - rate * dw1[i]);
      model.b1 = model.b1.map((v, i) => v - rate * db1[i]);
      model.w2 = model.w2.map((v, i) => v - rate * dw2[i]);
    }
  }
  model.version = 'encounter-' + fingerprint(model);
  validateEncounterModel(model);
  return model;
}
export function evaluateEncounter(m: EncounterModel, rows: TrainingRow[]) {
  return ['train', 'test'].map((partition) => {
    const examples = rows.filter((row) => row.partition === partition);
    const correct = examples.filter((row) => {
      const ranked = row.candidates
        .map((c) => ({ c, score: forward(m, c.features).score }))
        .sort((a, b) => b.score - a.score);
      return ranked[0].c.key === row.bestKey;
    }).length;
    return {
      partition,
      count: examples.length,
      correct,
      accuracy: correct / examples.length,
    };
  });
}
