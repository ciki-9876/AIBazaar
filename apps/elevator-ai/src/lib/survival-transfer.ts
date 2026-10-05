import { itemIds, withIds, sameStack, stackLimit } from './survival-stacks.ts';
import {
  cargoLayout,
  cargoFits,
  footprint,
  putInBag,
  unplaced,
} from './survival-cargo.ts';
import { fits, isEquipment } from './survival-equipment-rules.ts';
import type { Item, SurvivalState } from './survival-room.ts';
export type InventoryZone = 'bag' | 'equipment' | 'safe';
export type Transfer = {
  type: 'transfer';
  uid: string;
  zone: InventoryZone;
  slot: number;
  rotated?: boolean;
};
/** A placement or one-for-one swap. Both footprints must fit before anything changes. */
export function transferItem(s: SurvivalState, a: Transfer): SurvivalState {
  const bag = cargoLayout(s.bag);
  const locations = [
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
  if (displaced && sameStack(source.item, displaced.item)) {
    const ids = [...itemIds(displaced.item), ...itemIds(source.item)];
    if (ids.length <= stackLimit(source.item)) {
      const merged = withIds(displaced.item, ids);
      const replace = (items: Item[]) =>
        items
          .filter((i) => i.uid !== source.item.uid)
          .map((i) => (i.uid === displaced.item.uid ? merged : i));
      return { ...s, bag: replace(s.bag), safe: replace(s.safe) };
    }
  }

  const remove = new Set([a.uid, displaced?.item.uid]);
  let n = {
    ...s,
    bag: s.bag.filter((i) => !remove.has(i.uid)),
    equipment: s.equipment.filter((e) => !remove.has(e.item.uid)),
    safe: s.safe.filter((i) => !remove.has(i.uid)),
  };
  const insert = (item: Item, at: typeof target) => {
    if (at.zone === 'bag') {
      if (!cargoFits(cargoLayout(n.bag), item.size, at.slot, at.rotated))
        return false;
      n = { ...n, bag: putInBag(n.bag, item, at.slot, at.rotated)! };
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
