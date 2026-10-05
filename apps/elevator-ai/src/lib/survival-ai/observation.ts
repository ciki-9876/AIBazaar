import {
  BAG_SIZE,
  distance,
  searchDuration,
  weaponStats,
  type SurvivalState,
  type Point,
  type ItemKind,
} from '../survival-room.ts';
import { isVisible } from '../survival-world.ts';
import { ITEM_PROPERTIES } from '../survival-item-traits.ts';

import { AI_SCHEMA } from './protocol.ts';
export { AI_SCHEMA, fingerprint } from './protocol.ts';
export type ActorContext = {
  sessionId: string;
  actorId: string;
  goal: 'survive' | 'loot' | 'withdraw';
  riskTolerance: number;
};
export type Observation = {
  sessionId: string;
  schema: typeof AI_SCHEMA;
  actorId: string;
  tick: number;
  goal: ActorContext['goal'];
  riskTolerance: number;
  self: Point & {
    hp: number;
    food: number;
    water: number;
    bagFree: number;
    weaponRange: number;
    searching: string | null;
    searchRemaining: number;
  };
  inventory: {
    uid: string;
    kind: ItemKind;
    use: { stat: 'hp' | 'food' | 'water'; gain: number } | null;
  }[];
  threats: (Point & { id: string; kind: string; hp: number })[];
  caches: (Point & {
    id: string;
    container: string;
    remainingTicks: number;
    // Sealed container contents/quality/value are deliberately absent.
    visibleItem: ItemKind | null;
  })[];
};
const order = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export function observeActor(
  state: SurvivalState,
  context: ActorContext,
): Observation {
  if (
    !context.sessionId ||
    context.sessionId.length > 100 ||
    !context.actorId ||
    context.actorId.length > 100 ||
    !['survive', 'loot', 'withdraw'].includes(context.goal) ||
    !Number.isFinite(context.riskTolerance) ||
    context.riskTolerance < 0 ||
    context.riskTolerance > 1
  )
    throw new Error('Invalid actor context');
  const own = state.player;
  const current = state.caches.find(
    (c) => c.id === state.searching && !c.opened,
  );
  return {
    sessionId: context.sessionId,
    schema: AI_SCHEMA,
    actorId: context.actorId,
    tick: state.tick,
    goal: context.goal,
    riskTolerance: context.riskTolerance,
    self: {
      x: own.x,
      z: own.z,
      hp: own.hp,
      food: own.food,
      water: own.water,
      bagFree: BAG_SIZE - state.bag.reduce((sum, item) => sum + item.size, 0),
      weaponRange: Math.max(
        0,
        ...state.equipment.map((gear) => weaponStats(state, gear)?.range ?? 0),
      ),
      searching: current?.id ?? null,
      searchRemaining: current
        ? Math.max(0, searchDuration(current, own.energy) - state.searchTicks)
        : 0,
    },
    inventory: state.bag
      .map((item) => {
        const use = ITEM_PROPERTIES[item.kind].use;
        return {
          uid: item.uid,
          kind: item.kind,
          use: use ? { stat: use.stat, gain: use.gain } : null,
        };
      })
      .sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0)),
    threats: state.enemies
      .filter((enemy) => enemy.hp > 0 && isVisible(state, enemy))
      .map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        x: enemy.x,
        z: enemy.z,
        hp: enemy.hp,
      }))
      .sort(order),
    caches: state.caches
      .filter(
        (cache) =>
          !cache.opened &&
          cache.available <= state.tick &&
          isVisible(state, cache),
      )
      .map((cache) => ({
        id: cache.id,
        x: cache.x,
        z: cache.z,
        container: cache.container,
        remainingTicks:
          cache.pickup === 'touch'
            ? 0
            : Math.max(
                0,
                searchDuration(cache, own.energy) -
                  (current?.id === cache.id ? state.searchTicks : 0),
              ),
        visibleItem: cache.container === 'loose' ? cache.item.kind : null,
      }))
      .sort(order),
  };
}
export function nearestThreat(observation: Observation, point: Point) {
  return Math.min(
    24,
    ...observation.threats.map((threat) => distance(point, threat)),
  );
}
