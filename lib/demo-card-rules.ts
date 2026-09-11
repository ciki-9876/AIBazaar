import { cardDef } from './prototype-v04.ts';
export const FIXED_RARITY: Record<string, number> = {
  knife: 0,
  wire: 0,
  bottle: 0,
  shelter: 1,
  bell: 1,
  brick: 1,
  box: 2,
  cell: 1,
  coil: 3,
  battery: 4,
};
export const rarityOf = (id: string) => FIXED_RARITY[id] ?? 0;
export function combatValue(id: string, level: number, quality = 0) {
  const c = cardDef(id);
  return c.kind === 'charge'
    ? Math.round((c.power + level * 0.1 + (quality === 2 ? 0.5 : 0)) * 10) / 10
    : c.power +
        level * 3 +
        (quality === 2 && c.kind === 'shield'
          ? id === 'battery'
            ? 10
            : 5
          : 0);
}
export const growthCost = (level: number) => 2 + level;
export const growthRefund = (level: number) =>
  Math.floor(0.8 * (level * 2 + (level * (level - 1)) / 2));
