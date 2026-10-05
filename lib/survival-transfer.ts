import { itemIds, withIds, sameStack, stackLimit } from './survival-stacks.ts';
import {
  cargoLayout,
  cargoFirstFit,
  cargoFits,
  footprint,
  putInBag,
  unplaced,
  warehouseRows,
} from './survival-cargo.ts';
import { fits, isEquipment } from './survival-equipment-rules.ts';
import type { Item, SurvivalState } from './survival-room.ts';
export type InventoryZone = 'bag' | 'equipment' | 'safe' | 'warehouse';
export type Transfer = {
  type: 'transfer';
  uid: string;
  zone: InventoryZone;
  slot: number;
  rotated?: boolean;
};
export function firstTransferTarget(
  s: SurvivalState,
  item: Item,
  zone: 'bag' | 'warehouse',
) {
  const rows = zone === 'bag' ? 4 : warehouseRows(s.liftLevel);
  const layout = cargoLayout(s[zone] || [], rows);
  const stack = layout.find(
    (p) =>
      p.item.uid !== item.uid &&
      sameStack(p.item, item) &&
      itemIds(p.item).length + itemIds(item).length <= stackLimit(item),
  );
  if (stack)
    return {
      type: 'transfer' as const,
      uid: item.uid,
      zone,
      slot: stack.slot,
      rotated: stack.rotated,
    };
  for (const rotated of [false, true]) {
    const slot = cargoFirstFit(layout, item.size, rotated, rows);
    if (slot >= 0)
      return { type: 'transfer' as const, uid: item.uid, zone, slot, rotated };
  }
  return null;
}
/** A placement or one-for-one swap. Both footprints must fit before anything changes. */
export function transferItem(s: SurvivalState, a: Transfer): SurvivalState {
  const bag = cargoLayout(s.bag);
  const locations = [
    ...cargoLayout(s.warehouse || [], warehouseRows(s.liftLevel)).map((p) => ({
      ...p,
      zone: 'warehouse' as const,
    })),
    ...bag.map((p) => ({ ...p, zone: 'bag' as const })),
    ...s.equipment.map((e) => ({
      ...e,
      rotated: false,
      zone: 'equipment' as const,
    })),
    ...s.safe.map((item) => ({
      item,
      slot: 0,
      rotated: false,
      zone: 'safe' as const,
    })),
  ];
  const source = locations.find((p) => p.item.uid === a.uid);
  if (!source || !Number.isInteger(a.slot)) return s;
  if (s.rescueReserved?.includes(a.uid) || (source.item.kind === 'golden' && a.zone !== 'bag')) return s;
  const target = { zone: a.zone, slot: a.slot, rotated: !!a.rotated };
  const overlaps = locations.filter((p) => {
    if (p.item.uid === a.uid || p.zone !== a.zone) return false;
    if (a.zone === 'safe') return true;
    if (a.zone === 'equipment')
      return (
        a.slot < p.slot + p.item.size && a.slot + source.item.size > p.slot
      );
    const x = a.slot % 4,
      y = Math.floor(a.slot / 4),
      b = footprint(source.item.size, target.rotated),
      q = footprint(p.item.size, p.rotated);
    return (
      x < (p.slot % 4) + q.w &&
      x + b.w > p.slot % 4 &&
      y < Math.floor(p.slot / 4) + q.h &&
      y + b.h > Math.floor(p.slot / 4)
    );
  });
  if (overlaps.length > 1) return s;
  const displaced = overlaps[0];
  if (displaced && (s.rescueReserved?.includes(displaced.item.uid) || (displaced.item.kind === 'golden' && source.zone !== 'bag'))) return s;
  if (displaced && sameStack(source.item, displaced.item)) {
    const ids = [...itemIds(displaced.item), ...itemIds(source.item)];
    if (ids.length <= stackLimit(source.item)) {
      const merged = withIds(displaced.item, ids);
      const replace = (items: Item[]) =>
        items
          .filter((i) => i.uid !== source.item.uid)
          .map((i) => (i.uid === displaced.item.uid ? merged : i));
      return {
        ...s,
        bag: replace(s.bag),
        safe: replace(s.safe),
        ...(source.zone === 'warehouse' || a.zone === 'warehouse'
          ? { warehouse: replace(s.warehouse || []) }
          : {}),
      };
    }
  }

  const remove = new Set([a.uid, displaced?.item.uid]);
  let n = {
    ...s,
    bag: s.bag.filter((i) => !remove.has(i.uid)),
    equipment: s.equipment.filter((e) => !remove.has(e.item.uid)),
    safe: s.safe.filter((i) => !remove.has(i.uid)),
    ...(source.zone === 'warehouse' || a.zone === 'warehouse'
      ? { warehouse: (s.warehouse || []).filter((i) => !remove.has(i.uid)) }
      : {}),
  };
  const insert = (item: Item, at: typeof target) => {
    if (at.zone === 'bag' || at.zone === 'warehouse') {
      const rows = at.zone === 'bag' ? 4 : warehouseRows(n.liftLevel);
      const items = n[at.zone] || [];
      if (
        !cargoFits(
          cargoLayout(items, rows),
          item.size,
          at.slot,
          at.rotated,
          '',
          rows,
        )
      )
        return false;
      n = {
        ...n,
        [at.zone]: putInBag(items, item, at.slot, at.rotated, rows)!,
      };
    } else if (at.zone === 'equipment') {
      if (!isEquipment(item) || !fits(n.equipment, item.size, at.slot))
        return false;
      n = {
        ...n,
        equipment: [...n.equipment, { item: unplaced(item), slot: at.slot }],
      };
    } else {
      if (at.slot !== 0 || item.size !== 1 || n.safe.length) return false;
      n = { ...n, safe: [unplaced(item)] };
    }
    return true;
  };
  if (
    !insert(source.item, target) ||
    (displaced && !insert(displaced.item, source))
  )
    return s;
  return n;
}
