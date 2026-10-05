import { itemIds, sameStack, stackLimit, withIds } from './survival-stacks.ts';
import type { Item } from './survival-room.ts';
export const BAG_COLS = 4;
export const BAG_ROWS = 4;
export type CargoPlacement = { item: Item; slot: number; rotated: boolean };
export const footprint = (size: number, rotated = false) => ({
  w: rotated ? 1 : size,
  h: rotated ? size : 1,
});
export function cargoFits(
  layout: CargoPlacement[],
  size: number,
  slot: number,
  rotated = false,
  omit = '',
) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= BAG_COLS * BAG_ROWS)
    return false;
  const { w, h } = footprint(size, rotated),
    x = slot % BAG_COLS,
    y = Math.floor(slot / BAG_COLS);
  if (x + w > BAG_COLS || y + h > BAG_ROWS) return false;
  return !layout.some((p) => {
    if (p.item.uid === omit) return false;
    const other = footprint(p.item.size, p.rotated),
      px = p.slot % BAG_COLS,
      py = Math.floor(p.slot / BAG_COLS);
    return x < px + other.w && x + w > px && y < py + other.h && y + h > py;
  });
}
export function cargoFirstFit(
  layout: CargoPlacement[],
  size: number,
  rotated = false,
) {
  for (let slot = 0; slot < BAG_COLS * BAG_ROWS; slot++)
    if (cargoFits(layout, size, slot, rotated)) return slot;
  return -1;
}
// Missing placements from an older in-memory prototype are interpreted in a
// deterministic first-fit order. Explicit placements are never repacked here.
export function cargoLayout(items: Item[]): CargoPlacement[] {
  const layout: CargoPlacement[] = items
    .filter((i) => i.slot !== undefined)
    .map((item) => ({ item, slot: item.slot!, rotated: !!item.rotated }));
  for (const item of items.filter((i) => i.slot === undefined)) {
    const slot = cargoFirstFit(layout, item.size);
    if (slot >= 0) layout.push({ item, slot, rotated: false });
  }
  return layout;
}
export function unplaced(item: Item): Item {
  const { slot: _slot, rotated: _rotation, ...rest } = item;
  return rest;
}
export function putInBag(
  items: Item[],
  item: Item,
  slot?: number,
  rotated = false,
): Item[] | null {
  // An existing stack is being moved; new arrivals can fill matching stacks.
  if (
    slot === undefined &&
    !items.some((i) => i.uid === item.uid) &&
    stackLimit(item) > 1
  ) {
    let ids = itemIds(item);
    const merged = items.map((existing) => {
      if (!sameStack(existing, item) || !ids.length) return existing;
      const take = Math.min(
        stackLimit(existing) - itemIds(existing).length,
        ids.length,
      );
      const next = withIds(existing, [
        ...itemIds(existing),
        ...ids.slice(0, take),
      ]);
      ids = ids.slice(take);
      return next;
    });
    if (!ids.length) return merged;
    let result = merged;
    while (ids.length) {
      const unit = withIds(item, ids.slice(0, stackLimit(item)));
      const layout = cargoLayout(result);
      const at = cargoFirstFit(layout, unit.size);
      if (at < 0) return null;
      result = [...result, { ...unit, slot: at, rotated: false }];
      ids = ids.slice(stackLimit(item));
    }
    return result;
  }
  const others = items.filter((i) => i.uid !== item.uid),
    layout = cargoLayout(others);
  if (layout.length !== others.length) return null;
  let target = slot ?? cargoFirstFit(layout, item.size, rotated);
  if (slot === undefined && target < 0 && !rotated && item.size <= BAG_ROWS) {
    rotated = true;
    target = cargoFirstFit(layout, item.size, rotated);
  }
  if (!cargoFits(layout, item.size, target, rotated)) return null;
  return [
    ...layout.map((p) => ({ ...p.item, slot: p.slot, rotated: p.rotated })),
    { ...item, slot: target, rotated },
  ];
}
export function packBag(items: Item[]): Item[] | null {
  const merged: Item[] = [];
  for (const item of items) {
    let ids = itemIds(item);
    for (let i = 0; i < merged.length && ids.length; i++) {
      if (!sameStack(merged[i], item)) continue;
      const take = Math.min(
        stackLimit(item) - itemIds(merged[i]).length,
        ids.length,
      );
      merged[i] = withIds(merged[i], [
        ...itemIds(merged[i]),
        ...ids.slice(0, take),
      ]);
      ids = ids.slice(take);
    }
    if (ids.length) merged.push(withIds(item, ids));
  }
  const sorted = merged.sort(
    (a, b) => b.size - a.size || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0),
  );
  const solve = (index: number, placed: Item[]): Item[] | null => {
    if (index === sorted.length) return placed;
    const item = sorted[index];
    for (const rotated of item.size > 1 && item.size <= BAG_ROWS
      ? [false, true]
      : [false])
      for (let slot = 0; slot < BAG_COLS * BAG_ROWS; slot++) {
        const next = putInBag(placed, unplaced(item), slot, rotated);
        if (next) {
          const result = solve(index + 1, next);
          if (result) return result;
        }
      }
    return null;
  };
  if (merged.reduce((n, i) => n + i.size, 0) > BAG_COLS * BAG_ROWS) return null;
  return solve(0, []);
}
