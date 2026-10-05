import {
  BAG_SIZE,
  distance,
  survivalAction,
  type SurvivalState,
  type Point,
  ELEVATOR,
} from '../survival-room.ts';
import { clearSight, walkable, isVisible } from '../survival-world.ts';
import { insideLift, PLAYER_RADIUS } from '../survival-lift.ts';
import { ITEM_PROPERTIES } from '../survival-item-traits.ts';
import {
  AI_SCHEMA,
  fingerprint,
  observeActor,
  nearestThreat,
  type Observation,
  type ActorContext,
} from './observation.ts';

export type CandidateAction =
  | { type: 'wait' }
  | { type: 'move'; to: Point }
  | { type: 'loot'; cacheId: string; to: Point }
  | { type: 'consume'; uid: string }
  | { type: 'extract' };
export type Candidate = {
  id: string;
  key: string;
  action: CandidateAction;
  description: string;
  features: {
    distance: number;
    threatDistance: number;
    searchTicks: number;
    hpGain: number;
    foodGain: number;
    waterGain: number;
  };
};
export type DecisionRequest = {
  schema: typeof AI_SCHEMA;
  id: string;
  expiresTick: number;
  observation: Observation;
  candidates: Candidate[];
};
export type DecisionReply = {
  requestId: string;
  candidateId: string;
  modelVersion: string;
};
export type Receipt = {
  requestId: string;
  candidateId: string;
  modelVersion: string;
  tick: number;
  accepted: boolean;
  reason:
    | 'applied'
    | 'malformed'
    | 'wrong-request'
    | 'unknown-candidate'
    | 'expired'
    | 'actor-mismatch'
    | 'session-mismatch'
    | 'not-running'
    | 'no-longer-legal';
};
export const DECISION_TTL = 30;

function directVisible(state: SurvivalState, point: Point) {
  return (
    isVisible(state, point) &&
    walkable(point, PLAYER_RADIUS, state.world) &&
    clearSight(state.player, point, state.world, PLAYER_RADIUS + 0.02, true)
  );
}
export function createDecisionRequest(
  state: SurvivalState,
  context: ActorContext,
): DecisionRequest {
  if (state.status !== 'running')
    throw new Error('Decisions require a running room');
  const observation = observeActor(state, context);
  const candidates: Candidate[] = [];
  const add = (
    key: string,
    action: CandidateAction,
    description: string,
    gains: Partial<Candidate['features']> = {},
  ) => {
    const to =
      action.type === 'move' || action.type === 'loot'
        ? action.to
        : state.player;
    candidates.push({
      id: '',
      key,
      action,
      description,
      features: {
        distance: distance(state.player, to),
        threatDistance: nearestThreat(observation, to),
        searchTicks: 0,
        hpGain: 0,
        foodGain: 0,
        waterGain: 0,
        ...gains,
      },
    });
  };
  add('wait', { type: 'wait' }, '停下；附近的翻找仍按游戏规则推进');
  const seen = new Set<string>();
  for (const item of observation.inventory) {
    if (
      !item.use ||
      seen.has(item.kind) ||
      observation.self[item.use.stat] >= 100
    )
      continue;
    seen.add(item.kind);
    const gain = Math.min(item.use.gain, 100 - observation.self[item.use.stat]);
    const features = { hpGain: 0, foodGain: 0, waterGain: 0 };
    features[`${item.use.stat}Gain`] = gain;
    add(
      `use:${item.kind}`,
      { type: 'consume', uid: item.uid },
      `使用${item.kind}，恢复${item.use.stat} ${gain}`,
      features,
    );
  }
  if (state.leftLift && insideLift(state.player, ELEVATOR)) {
    add(
      'extract',
      { type: 'extract' },
      state.extraction ? '继续撤离读条' : '在门内开始撤离；撤离期间仍可能遇袭',
    );
  }
  // Only local, visible, direct routes: no hidden loot or omniscient navigation.
  for (const cache of [...observation.caches]
    .sort(
      (a, b) =>
        distance(state.player, a) - distance(state.player, b) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .slice(0, 3)) {
    if (observation.self.bagFree <= 0 || !directVisible(state, cache)) continue;
    add(
      `loot:${cache.id}`,
      { type: 'loot', cacheId: cache.id, to: { x: cache.x, z: cache.z } },
      `靠近并翻找${cache.container} ${cache.id}；${cache.visibleItem ?? '内容未知'}`,
      { searchTicks: cache.remainingTicks },
    );
  }
  for (const [key, x, z] of [
    ['N', 0, -1],
    ['NE', 1, -1],
    ['E', 1, 0],
    ['SE', 1, 1],
    ['S', 0, 1],
    ['SW', -1, 1],
    ['W', -1, 0],
    ['NW', -1, -1],
  ] as const) {
    const length = Math.hypot(x, z);
    const to = {
      x: state.player.x + (2 * x) / length,
      z: state.player.z + (2 * z) / length,
    };
    if (directVisible(state, to))
      add(`move:${key}`, { type: 'move', to }, `移向${key}约2米，自动攻击继续`);
  }
  const id = `${context.sessionId}:${context.actorId}:${state.tick}:${fingerprint({ schema: AI_SCHEMA, observation, candidates })}`;
  candidates.forEach((candidate) => {
    candidate.id = `${id}/${candidate.key}`;
  });
  return {
    schema: AI_SCHEMA,
    id,
    expiresTick: state.tick + DECISION_TTL,
    observation,
    candidates,
  };
}
function legalNow(state: SurvivalState, action: CandidateAction) {
  if (action.type === 'wait') return true;
  if (action.type === 'move') return directVisible(state, action.to);
  if (action.type === 'loot') {
    const cache = state.caches.find((c) => c.id === action.cacheId);
    return (
      !!cache &&
      !cache.opened &&
      cache.available <= state.tick &&
      cache.x === action.to.x &&
      cache.z === action.to.z &&
      state.bag.reduce((sum, item) => sum + item.size, 0) < BAG_SIZE &&
      directVisible(state, cache)
    );
  }
  if (action.type === 'consume') {
    const item = state.bag.find((item) => item.uid === action.uid);
    const use = item && ITEM_PROPERTIES[item.kind].use;
    return !!use && state.player[use.stat] < 100;
  }
  return state.leftLift && insideLift(state.player, ELEVATOR);
}
function validReply(value: unknown): value is DecisionReply {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  return (
    Object.keys(object).length === 3 &&
    ['requestId', 'candidateId', 'modelVersion'].every(
      (key) =>
        typeof object[key] === 'string' &&
        (object[key] as string).length > 0 &&
        (object[key] as string).length <= 500,
    )
  );
}
/** Model chooses only IDs. A trusted issued request supplies action parameters. */
export function applyDecision(
  state: SurvivalState,
  context: ActorContext,
  request: DecisionRequest,
  reply: unknown,
): { state: SurvivalState; receipt: Receipt } {
  const parsed = validReply(reply) ? reply : null;
  const receipt: Receipt = {
    requestId: request.id,
    candidateId: parsed?.candidateId ?? '',
    modelVersion: parsed?.modelVersion ?? '',
    tick: state.tick,
    accepted: false,
    reason: 'malformed',
  };
  const reject = (reason: Receipt['reason']) => ({
    state,
    receipt: { ...receipt, reason },
  });
  if (!parsed) return reject('malformed');
  if (parsed.requestId !== request.id) return reject('wrong-request');
  if (context.actorId !== request.observation.actorId)
    return reject('actor-mismatch');
  if (context.sessionId !== request.observation.sessionId)
    return reject('session-mismatch');
  if (state.tick < request.observation.tick || state.tick > request.expiresTick)
    return reject('expired');
  if (state.status !== 'running') return reject('not-running');
  const candidate = request.candidates.find((c) => c.id === parsed.candidateId);
  if (!candidate) return reject('unknown-candidate');
  if (!legalNow(state, candidate.action)) return reject('no-longer-legal');
  const action = candidate.action;
  let next: SurvivalState;
  if (
    action.type === 'wait' ||
    (action.type === 'loot' && distance(state.player, action.to) <= 1.65)
  ) {
    next = { ...state, path: [], extraction: 0 };
  } else if (action.type === 'loot') {
    next = survivalAction(state, { type: 'move', to: action.to });
  } else {
    next = survivalAction(state, action);
  }
  return {
    state: next,
    receipt: { ...receipt, accepted: true, reason: 'applied' },
  };
}
