import { cardDef } from './demo-cards.ts';
export const rarityOf = (id: string) => cardDef(id).rarity ?? 0;
// Raw values are shared by combat and card language. Round only for display.
export function cardMechanics(id: string, level: number, quality = 0) {
  const scale = 1 + level * 0.12;
  return {
    openingCount: id === 'nailer' ? 2 : id === 'springbow' ? 3 : 0,
    openingBonus: (16 + quality * 4) * scale,
    exposedBonus: id === 'gapblade' ? (12 + quality * 4) * scale : 0,
    buffer: id === 'rubber' ? (8 + quality) * scale : 0,
    recoilCap: (40 + quality * 10) * scale,
    growth: id === 'culture' ? (8 + quality * 2) * scale : 0,
    growthBase: id === 'culture' ? 8 + quality * 2 : 0,
    intactBonus: id === 'counterweight' ? (20 + quality * 5) * scale : 0,
    firstCharge: id === 'fuse' ? 2 + quality * 0.5 : 0,
    corrosionCharge: id === 'catalyst' ? 0.8 + quality * 0.2 : 0,
    heal: id === 'distiller' ? (5 + quality * 3) * scale : 0,
  };
}
export function combatValue(id: string, level: number, quality = 0) {
  const c = cardDef(id);
  return (
    Math.round(
      (c.power +
        (c.kind === 'corrode'
          ? quality
          : c.id === 'sealant'
            ? quality * 4
            : 0)) *
        (1 + level * 0.12) *
        10,
    ) / 10
  );
}
export const growthCost = (level: number) => 2 + level;
export const growthRefund = (level: number) =>
  Math.floor(0.8 * (level * 2 + (level * (level - 1)) / 2));
