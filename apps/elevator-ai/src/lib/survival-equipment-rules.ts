import { hasTrait } from './survival-item-traits.ts';
import type { Item, Equipment } from './survival-room.ts';

export const EQUIPMENT_SIZE = 10;
export const isEquipment = (item: Item) => hasTrait(item.kind, 'equippable');
export const adjacent = (a: Equipment, b: Equipment) =>
  a.slot + a.item.size === b.slot || b.slot + b.item.size === a.slot;

export function fits(
  board: Equipment[],
  size: number,
  slot: number,
  omit = '',
) {
  return (
    Number.isInteger(slot) &&
    slot >= 0 &&
    slot + size <= EQUIPMENT_SIZE &&
    !board.some(
      (e) =>
        e.item.uid !== omit &&
        slot < e.slot + e.item.size &&
        slot + size > e.slot,
    )
  );
}

export function firstFit(board: Equipment[], size: number, omit = '') {
  for (let slot = 0; slot <= EQUIPMENT_SIZE - size; slot++)
    if (fits(board, size, slot, omit)) return slot;
  return -1;
}
