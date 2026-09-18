import { cardDef } from './demo-cards.ts';
export const rarityOf = (id: string) => cardDef(id).rarity ?? 0;
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
