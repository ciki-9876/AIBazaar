import { cardKey, variantsFor } from './throw-enchant.ts';

/** Ownership, not the equipped deck, decides whether a card belongs in the variant filter. */
export function hasAvailableVariant(suit: number, rank: number, owned?: readonly string[]): boolean {
  const key = cardKey(suit, rank);
  return variantsFor(suit, rank).some((enchant) => enchant && (!owned || owned.includes(`${key}:${enchant.id}`)));
}
