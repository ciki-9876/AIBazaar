import { AI_SCHEMA, fingerprint } from './protocol.ts';
import type { DecisionRequest } from './decisions.ts';

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid decision object');
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(record, key))
  )
    throw new Error('Unexpected decision fields');
  return record;
}
function text(value: unknown, maximum = 500): asserts value is string {
  if (typeof value !== 'string' || !value || value.length > maximum)
    throw new Error('Invalid decision string');
}
function number(value: unknown, min: number, max: number) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error('Invalid decision number');
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error('Invalid decision list');
  return value;
}
const position = (value: Record<string, unknown>) => {
  number(value.x, 0, 96);
  number(value.z, 0, 80);
};
export function validateDecisionRequest(
  value: unknown,
): asserts value is DecisionRequest {
  const request = object(value, [
    'schema',
    'id',
    'expiresTick',
    'observation',
    'candidates',
  ]);
  if (request.schema !== AI_SCHEMA)
    throw new Error('Unsupported decision schema');
  text(request.id);
  const observation = object(request.observation, [
    'sessionId',
    'schema',
    'actorId',
    'tick',
    'goal',
    'riskTolerance',
    'self',
    'inventory',
    'threats',
    'caches',
  ]);
  if (observation.schema !== AI_SCHEMA)
    throw new Error('Unsupported observation schema');
  text(observation.actorId, 100);
  text(observation.sessionId, 100);
  number(observation.tick, 0, Number.MAX_SAFE_INTEGER - 30);
  if (
    !Number.isSafeInteger(observation.tick) ||
    request.expiresTick !== (observation.tick as number) + 30
  )
    throw new Error('Invalid decision expiry');
  if (!['survive', 'loot', 'withdraw'].includes(observation.goal as string))
    throw new Error('Invalid goal');
  number(observation.riskTolerance, 0, 1);
  const self = object(observation.self, [
    'x',
    'z',
    'hp',
    'food',
    'water',
    'bagFree',
    'weaponRange',
    'searching',
    'searchRemaining',
  ]);
  position(self);
  for (const stat of ['hp', 'food', 'water']) number(self[stat], 0, 100);
  number(self.bagFree, 0, 16);
  number(self.weaponRange, 0, 100);
  number(self.searchRemaining, 0, 10000);
  if (self.searching !== null) text(self.searching);
  for (const item of list(observation.inventory, 16)) {
    const row = object(item, ['uid', 'kind', 'use']);
    text(row.uid);
    text(row.kind);
    if (row.use !== null) {
      const use = object(row.use, ['stat', 'gain']);
      if (!['hp', 'food', 'water'].includes(use.stat as string))
        throw new Error('Invalid use stat');
      number(use.gain, 0, 100);
    }
  }
  for (const threat of list(observation.threats, 64)) {
    const row = object(threat, ['id', 'kind', 'hp', 'x', 'z']);
    text(row.id);
    text(row.kind);
    number(row.hp, 0, 100000);
    position(row);
  }
  for (const cache of list(observation.caches, 128)) {
    const row = object(cache, [
      'id',
      'x',
      'z',
      'container',
      'remainingTicks',
      'visibleItem',
    ]);
    text(row.id);
    text(row.container);
    position(row);
    number(row.remainingTicks, 0, 10000);
    if (row.visibleItem !== null) text(row.visibleItem);
  }
  const candidates = list(request.candidates, 32),
    ids = new Set(),
    keys = new Set();
  if (!candidates.length) throw new Error('Empty candidates');
  for (const entry of candidates) {
    const candidate = object(entry, [
      'id',
      'key',
      'action',
      'description',
      'features',
    ]);
    text(candidate.id);
    text(candidate.key);
    text(candidate.description);
    if (
      ids.has(candidate.id) ||
      keys.has(candidate.key) ||
      candidate.id !== request.id + '/' + candidate.key
    )
      throw new Error('Invalid candidate identity');
    ids.add(candidate.id);
    keys.add(candidate.key);
    const action = candidate.action as Record<string, unknown>;
    if (!action || typeof action !== 'object')
      throw new Error('Invalid action');
    if (action.type === 'wait' || action.type === 'extract')
      object(action, ['type']);
    else if (action.type === 'consume') {
      object(action, ['type', 'uid']);
      text(action.uid);
    } else if (action.type === 'move' || action.type === 'loot') {
      object(
        action,
        action.type === 'loot' ? ['type', 'cacheId', 'to'] : ['type', 'to'],
      );
      if (action.type === 'loot') text(action.cacheId);
      position(object(action.to, ['x', 'z']));
    } else throw new Error('Unsupported action');
    const features = object(candidate.features, [
      'distance',
      'threatDistance',
      'searchTicks',
      'hpGain',
      'foodGain',
      'waterGain',
    ]);
    for (const key of Object.keys(features)) number(features[key], 0, 10000);
  }
  const payload = {
    schema: AI_SCHEMA,
    observation: request.observation,
    candidates: (request.candidates as Record<string, unknown>[]).map(
      (candidate) => ({ ...candidate, id: '' }),
    ),
  };
  const expected =
    observation.sessionId +
    ':' +
    observation.actorId +
    ':' +
    observation.tick +
    ':' +
    fingerprint(payload);
  if (request.id !== expected) throw new Error('Decision fingerprint mismatch');
}
