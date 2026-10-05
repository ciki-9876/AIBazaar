import { randomStream } from '../../packages/core/random.ts';
import { AI_SCHEMA, fingerprint } from './protocol.ts';
import type { DecisionRequest, Candidate, DecisionReply } from './decisions.ts';
import { validateDataset, type Example } from './dataset.ts';

export const FEATURE_NAMES = [
  'wait',
  'move',
  'loot',
  'consume',
  'extract',
  'hp',
  'food',
  'water',
  'bagFree',
  'risk',
  'surviveGoal',
  'lootGoal',
  'withdrawGoal',
  'hpGain',
  'foodGain',
  'waterGain',
  'distance',
  'searchDuration',
  'targetThreatDistance',
  'ownThreatDistance',
  'threatDistanceChange',
  'weaponRange',
  'hasThreat',
  'searching',
  'continueSearch',
  'hpGainNeed',
  'foodGainNeed',
  'waterGainNeed',
] as const;
export const POLICY_SCHEMA = 'f9-smoke-mlp-v1';
export type TinyPolicy = {
  schema: typeof POLICY_SCHEMA;
  observationSchema: typeof AI_SCHEMA;
  featureNames: string[];
  hidden: number;
  w1: number[];
  b1: number[];
  w2: number[];
  b2: number;
  version: string;
  training: {
    seed: number;
    epochs: number;
    datasetId: string;
    examples: number;
    source: 'pipeline-smoke';
  };
};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function candidateFeatures(
  request: DecisionRequest,
  candidate: Candidate,
) {
  const observation = request.observation,
    self = observation.self,
    f = candidate.features;
  const near = Math.min(
    24,
    ...observation.threats.map((threat) =>
      Math.hypot(threat.x - self.x, threat.z - self.z),
    ),
  );
  return [
    ...['wait', 'move', 'loot', 'consume', 'extract'].map(
      (kind) => +(candidate.action.type === kind),
    ),
    clamp(self.hp / 100),
    clamp(self.food / 100),
    clamp(self.water / 100),
    clamp(self.bagFree / 16),
    observation.riskTolerance,
    ...['survive', 'loot', 'withdraw'].map(
      (goal) => +(observation.goal === goal),
    ),
    clamp(f.hpGain / 45),
    clamp(f.foodGain / 45),
    clamp(f.waterGain / 45),
    clamp(f.distance / 16),
    clamp(f.searchTicks / 255),
    clamp(f.threatDistance / 24),
    clamp(near / 24),
    Math.max(-1, Math.min(1, (f.threatDistance - near) / 4)),
    clamp(self.weaponRange / 12),
    +(observation.threats.length > 0),
    +(self.searching !== null),
    +(
      candidate.action.type === 'loot' &&
      candidate.action.cacheId === self.searching
    ),
    clamp(f.hpGain / 45) * (1 - clamp(self.hp / 100)),
    clamp(f.foodGain / 45) * (1 - clamp(self.food / 100)),
    clamp(f.waterGain / 45) * (1 - clamp(self.water / 100)),
  ];
}
function forward(model: TinyPolicy, x: number[]) {
  const h = model.b1.map((bias, row) => {
    let sum = bias;
    for (let col = 0; col < x.length; col++)
      sum += model.w1[row * x.length + col] * x[col];
    return Math.tanh(sum);
  });
  return {
    h,
    score: model.b2 + h.reduce((sum, value, i) => sum + value * model.w2[i], 0),
  };
}
export function validatePolicy(value: unknown): asserts value is TinyPolicy {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid policy weights/schema');
  const model = value as TinyPolicy;
  if (
    !Array.isArray(model.featureNames) ||
    !Array.isArray(model.w1) ||
    !Array.isArray(model.b1) ||
    !Array.isArray(model.w2) ||
    model.schema !== POLICY_SCHEMA ||
    model.observationSchema !== AI_SCHEMA ||
    JSON.stringify(model.featureNames) !== JSON.stringify(FEATURE_NAMES) ||
    !Number.isInteger(model.hidden) ||
    model.hidden < 1 ||
    model.hidden > 128 ||
    model.w1.length !== FEATURE_NAMES.length * model.hidden ||
    model.b1.length !== model.hidden ||
    model.w2.length !== model.hidden ||
    ![...model.w1, ...model.b1, ...model.w2, model.b2].every(Number.isFinite) ||
    typeof model.version !== 'string' ||
    !model.version
  )
    throw new Error('Invalid policy weights/schema');
}
export function scoreCandidates(model: TinyPolicy, request: DecisionRequest) {
  return request.candidates.map((candidate) => ({
    candidate,
    score: forward(model, candidateFeatures(request, candidate)).score,
  }));
}
export function chooseAction(
  model: TinyPolicy,
  request: DecisionRequest,
): DecisionReply {
  const scored = scoreCandidates(model, request);
  if (!scored.length) throw new Error('No candidates');
  // Stable candidate order breaks ties; there is no sampling or fixed tactical score table.
  let selected = scored[0];
  for (const entry of scored.slice(1))
    if (entry.score > selected.score) selected = entry;
  return {
    requestId: request.id,
    candidateId: selected.candidate.id,
    modelVersion: model.version,
  };
}
const probabilities = (scores: number[]) => {
  const maximum = Math.max(...scores);
  const exp = scores.map((score) => Math.exp(score - maximum));
  const total = exp.reduce((sum, value) => sum + value, 0);
  return exp.map((value) => value / total);
};

/** Small supervised ranker for testing the pipeline. This is not a trained Laya/Jev substitute. */
export function trainSmokePolicy(
  examples: Example[],
  options: { seed: number; epochs: number; rate?: number },
) {
  const dataset = validateDataset(examples);
  if (
    !Number.isSafeInteger(options.seed) ||
    !Number.isInteger(options.epochs) ||
    options.epochs < 1 ||
    options.epochs > 5000 ||
    !Number.isFinite(options.rate ?? 0.03) ||
    (options.rate ?? 0.03) <= 0
  )
    throw new Error('Invalid training options');
  const training = examples.filter((example) => example.partition === 'train');
  if (!training.length) throw new Error('No training partition');
  const random = randomStream(options.seed, 'f9-ai-smoke-initialization-v1');
  const hidden = 24;
  const model: TinyPolicy = {
    schema: POLICY_SCHEMA,
    observationSchema: AI_SCHEMA,
    featureNames: [...FEATURE_NAMES],
    hidden,
    w1: Array.from(
      { length: hidden * FEATURE_NAMES.length },
      () => (random() - 0.5) * 0.4,
    ),
    b1: Array(hidden).fill(0),
    w2: Array.from({ length: hidden }, () => (random() - 0.5) * 0.4),
    b2: 0,
    version: '',
    training: {
      seed: options.seed,
      epochs: options.epochs,
      datasetId: dataset.id,
      examples: training.length,
      source: 'pipeline-smoke',
    },
  };
  const data = training.map((example) => ({
    example,
    x: example.request.candidates.map((candidate) =>
      candidateFeatures(example.request, candidate),
    ),
  }));
  const shuffle = randomStream(options.seed, 'f9-ai-smoke-shuffle-v1');
  for (let epoch = 0; epoch < options.epochs; epoch++) {
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(shuffle() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (const { example, x } of shuffled) {
      const predictions = x.map((features) => forward(model, features));
      const p = probabilities(
        predictions.map((prediction) => prediction.score),
      );
      const dw1 = Array(model.w1.length).fill(0),
        db1 = Array(hidden).fill(0),
        dw2 = Array(hidden).fill(0);
      for (let choice = 0; choice < x.length; choice++) {
        const target = example.acceptableKeys.includes(
          example.request.candidates[choice].key,
        )
          ? 1 / example.acceptableKeys.length
          : 0;
        const gradient = p[choice] - target;
        for (let row = 0; row < hidden; row++) {
          const activation = predictions[choice].h[row];
          dw2[row] += gradient * activation;
          const back = gradient * model.w2[row] * (1 - activation * activation);
          db1[row] += back;
          for (let col = 0; col < FEATURE_NAMES.length; col++)
            dw1[row * FEATURE_NAMES.length + col] += back * x[choice][col];
        }
      }
      const rate = options.rate ?? 0.03;
      model.w1 = model.w1.map((weight, i) => weight - rate * dw1[i]);
      model.b1 = model.b1.map((weight, i) => weight - rate * db1[i]);
      model.w2 = model.w2.map((weight, i) => weight - rate * dw2[i]);
    }
  }
  model.version =
    'smoke-' +
    fingerprint({
      w1: model.w1,
      b1: model.b1,
      w2: model.w2,
      training: model.training,
    });
  validatePolicy(model);
  return model;
}
export function evaluatePolicy(model: TinyPolicy, examples: Example[]) {
  return ['train', 'calibration', 'test'].map((partition) => {
    const rows = examples
      .filter((example) => example.partition === partition)
      .map((example) => {
        const reply = chooseAction(model, example.request);
        const selected = example.request.candidates.find(
          (candidate) => candidate.id === reply.candidateId,
        )!;
        const correct = example.acceptableKeys.includes(selected.key);
        return {
          id: example.id,
          selected: selected.key,
          acceptable: example.acceptableKeys,
          correct,
        };
      });
    return {
      partition,
      count: rows.length,
      correct: rows.filter((row) => row.correct).length,
      accuracy: rows.length
        ? rows.filter((row) => row.correct).length / rows.length
        : null,
      rows,
    };
  });
}
