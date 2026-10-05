import type { Item, ItemKind } from './survival-room.ts';
export type BrainQuality = 'low' | 'normal' | 'fine' | 'supreme';
export const BRAIN_QUALITY = {
  low: { label: '低质', xp: 5 },
  normal: { label: '普通', xp: 15 },
  fine: { label: '精良', xp: 40 },
  supreme: { label: '极品', xp: 100 },
} as const;
export const BRAIN_DESCRIPTION =
  '打爆怪物掉落脑浆很合理，升级电脑需要脑浆也很合理';
export const stackLimit = (i: Item) => (i.kind === 'lift-material' ? 20 : 1);
export const itemCount = (i: Item) => 1 + (i.stack?.length || 0);
export const itemIds = (i: Item) => [i.uid, ...(i.stack || [])];
export const sameStack = (a: Item, b: Item) =>
  a.kind === b.kind &&
  stackLimit(a) > 1 &&
  (a.quality || 'low') === (b.quality || 'low');
export const itemName = (i: Item) =>
  i.kind === 'lift-material'
    ? `${BRAIN_QUALITY[i.quality || 'low'].label}脑浆`
    : i.name;
export const countKind = (items: Item[], kind: ItemKind) =>
  items.reduce((n, i) => n + (i.kind === kind ? itemCount(i) : 0), 0);
export const brainExperience = (items: Item[]) =>
  items.reduce(
    (n, i) =>
      n +
      (i.kind === 'lift-material'
        ? itemCount(i) * BRAIN_QUALITY[i.quality || 'low'].xp
        : 0),
    0,
  );
export function withIds(item: Item, ids: string[]): Item {
  const { stack: _stack, ...base } = item;
  return {
    ...base,
    uid: ids[0],
    ...(ids.length > 1 ? { stack: ids.slice(1) } : {}),
  };
}
export const itemUnits = (items: Item[]) =>
  items.flatMap((i) => itemIds(i).map((uid) => withIds(i, [uid])));
/** Consumes whole units in stable inventory order. Call only after validating the whole recipe. */
export function spendUnits(
  items: Item[],
  kind: ItemKind,
  amount: number,
  experience = false,
): Item[] {
  let remaining = amount;
  return items.flatMap((i) => {
    if (i.kind !== kind || remaining <= 0) return [i];
    const per = experience ? BRAIN_QUALITY[i.quality || 'low'].xp : 1;
    const take = Math.min(itemCount(i), Math.ceil(remaining / per));
    remaining -= take * per;
    const ids = itemIds(i).slice(take);
    return ids.length ? [withIds(i, ids)] : [];
  });
}
