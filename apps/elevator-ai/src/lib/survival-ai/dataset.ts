import { AI_SCHEMA, fingerprint } from './protocol.ts';
import type { DecisionRequest, Receipt } from './decisions.ts';
import { validateDecisionRequest } from './request-validation.ts';
export type Partition = 'train' | 'calibration' | 'test';
export type Example = {
  schema: typeof AI_SCHEMA;
  id: string;
  partition: Partition;
  group: {
    seed: number;
    trajectory: string;
    template: string;
    relation: string | null;
  };
  request: DecisionRequest;
  acceptableKeys: string[];
  source:
    | 'synthetic-smoke'
    | 'human-reviewed'
    | 'local-teacher'
    | 'cloud-teacher';
  rationale: string;
};
export type DecisionTrace = {
  schema: typeof AI_SCHEMA;
  request: DecisionRequest;
  receipt: Receipt;
  outcome: {
    endTick: number;
    hpChange: number;
    foodChange: number;
    waterChange: number;
    bagAdded: string[];
    bagRemoved: string[];
  };
};
export function validateDataset(examples: Example[]) {
  if (!examples.length) throw new Error('Empty dataset');
  const ids = new Set<string>();
  const ownership = new Map<string, Partition>();
  for (const example of examples) {
    validateDecisionRequest(example.request);
    if (
      example.schema !== AI_SCHEMA ||
      example.request.schema !== AI_SCHEMA ||
      example.request.observation.schema !== AI_SCHEMA
    )
      throw new Error('Unsupported dataset schema');
    if (
      !['train', 'calibration', 'test'].includes(example.partition) ||
      ![
        'synthetic-smoke',
        'human-reviewed',
        'local-teacher',
        'cloud-teacher',
      ].includes(example.source) ||
      !Number.isSafeInteger(example.group.seed) ||
      !example.group.template ||
      !example.group.trajectory ||
      !example.id ||
      ids.has(example.id)
    )
      throw new Error('Invalid dataset metadata');
    ids.add(example.id);
    const keys = new Set(
      example.request.candidates.map((candidate) => candidate.key),
    );
    if (
      keys.size !== example.request.candidates.length ||
      !example.acceptableKeys.length ||
      new Set(example.acceptableKeys).size !== example.acceptableKeys.length ||
      example.acceptableKeys.some((key) => !keys.has(key))
    )
      throw new Error('Invalid action label');
    for (const [kind, value] of Object.entries(example.group)) {
      if (value === null) continue;
      const key = kind + ':' + value;
      if (ownership.has(key) && ownership.get(key) !== example.partition)
        throw new Error('Dataset leakage across partitions: ' + key);
      ownership.set(key, example.partition);
    }
  }
  return {
    id: fingerprint(examples),
    counts: Object.fromEntries(
      ['train', 'calibration', 'test'].map((partition) => [
        partition,
        examples.filter((example) => example.partition === partition).length,
      ]),
    ),
  };
}
/** Our teacher/review interchange, not an upstream Laya API claim. */
export function toChoiceExample(example: Example) {
  return {
    id: example.id,
    group: example.group,
    partition: example.partition,
    source: example.source,
    state: JSON.stringify(example.request.observation),
    question: '选择下一段实际行动，兼顾当前目标、身体状态和眼前威胁。',
    options: example.request.candidates.map((candidate) => ({
      id: candidate.key,
      text: candidate.description,
      parameters: candidate.action,
      features: candidate.features,
    })),
    acceptableIds: example.acceptableKeys,
    rationale: example.rationale,
  };
}
