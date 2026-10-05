import type { SurvivalState } from './survival-room.ts';
import { BRAIN_QUALITY, itemIds, withIds } from './survival-stacks.ts';

export const liftRecipe = (level = 1) => ({
  xp: level === 1 ? 30 : 40 + (level - 2) * 30,
  parts: 2,
});
export const liftFed = (s: SurvivalState) => {
  const cost = liftRecipe(s.liftLevel || 1);
  return (s.liftExperience || 0) >= cost.xp && (s.liftParts || 0) >= cost.parts;
};
/** Feed only what the next recipe still needs; preserve excess units and paid XP. */
export function feedLift(s: SurvivalState, uid: string): SurvivalState {
  if ((s.liftLevel || 1) >= 5) return s;
  const item = [...s.bag, ...(s.warehouse || [])].find((i) => i.uid === uid);
  if (!item || !['lift-material', 'scrap'].includes(item.kind)) return s;
  const recipe = liftRecipe(s.liftLevel || 1),
    brain = item.kind === 'lift-material';
  const deficit = brain
    ? recipe.xp - (s.liftExperience || 0)
    : recipe.parts - (s.liftParts || 0);
  if (deficit <= 0) return s;
  const per = brain ? BRAIN_QUALITY[item.quality || 'low'].xp : 1;
  const ids = itemIds(item),
    count = Math.min(ids.length, Math.ceil(deficit / per));
  const rest = ids.slice(count);
  const consume = (items: typeof s.bag) =>
    items.flatMap((i) =>
      i.uid !== uid ? [i] : rest.length ? [withIds(i, rest)] : [],
    );
  return {
    ...s,
    bag: consume(s.bag),
    ...(s.warehouse ? { warehouse: consume(s.warehouse) } : {}),
    liftExperience: (s.liftExperience || 0) + (brain ? count * per : 0),
    liftParts: (s.liftParts || 0) + (brain ? 0 : count),
  };
}
