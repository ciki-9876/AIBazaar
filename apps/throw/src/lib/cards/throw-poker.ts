import { cardPoints, isWild } from './throw-enchant.ts';

export type Suit = 0 | 1 | 2 | 3;
export type PlayingCard = {
  uid: string;
  rank: number;
  suit: Suit;
  /** Variant enchantment id (see throw-enchant.ts); absent for a plain white card. */
  ench?: string;
};
export const SUITS = ["♠", "♥", "♣", "♦"] as const;
export const rankText = (rank: number) =>
  ({ 11: "J", 12: "Q", 13: "K", 14: "A" })[rank] ?? String(rank);
export const HAND_NAMES = [
  "散牌",
  "对子",
  "两对",
  "三条",
  "顺子",
  "同花",
  "葫芦",
  "四条",
  "同花顺",
] as const;
// Tentative game multipliers; poker supplies combinations, not damage rules.
export const MULTIPLIERS = [
  100, 150, 170, 180, 220, 250, 280, 320, 400,
] as const;
/** Short runs/flushes are real combinations; five cards retain the full reward. */
const comboMultiplier = (kind: number, members: number) =>
  100 + (MULTIPLIERS[kind] - 100) * ([4, 5, 8].includes(kind) ? members / 5 : 1);
export type PokerScore = {
  kind: number;
  name: string;
  base: number;
  bonus: number;
  damage: number;
  multiplier: number;
  comboIds: string[];
};

function classify(cards: PlayingCard[]) {
  const groups = new Map<number, PlayingCard[]>();
  for (const card of cards)
    groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
  const ranked = [...groups.values()].sort(
    (a, b) => b.length - a.length || b[0].rank - a[0].rank,
  );
  const values = [...groups.keys()].sort((a, b) => a - b);
  const size = cards.length;
  const straight =
    size >= 3 &&
    values.length === size &&
    (values[size - 1] - values[0] === size - 1 ||
      (values[size - 1] === 14 && values.slice(0, -1).every((rank, index) => rank === index + 2)));
  // Wild cards (百搭) take whichever suit the rest of the flush needs.
  const fixed = cards.filter((card) => !isWild(card));
  const flush =
    size >= 3 && fixed.every((card) => card.suit === (fixed[0] ?? cards[0]).suit);
  let kind = 0;
  let members: PlayingCard[] = [];
  if (straight && flush) {
    kind = 8;
    members = cards;
  } else if (ranked[0]?.length === 4) {
    kind = 7;
    members = ranked[0];
  } else if (ranked[0]?.length === 3 && ranked[1]?.length === 2) {
    kind = 6;
    members = cards;
  } else if (flush) {
    kind = 5;
    members = cards;
  } else if (straight) {
    kind = 4;
    members = cards;
  } else if (ranked[0]?.length === 3) {
    kind = 3;
    members = ranked[0];
  } else if (ranked[0]?.length === 2 && ranked[1]?.length === 2) {
    kind = 2;
    members = [...ranked[0], ...ranked[1]];
  } else if (ranked[0]?.length === 2) {
    kind = 1;
    members = ranked[0];
  }
  const multiplier = comboMultiplier(kind, members.length);
  const bonus = Math.floor(
    (members.reduce((sum, card) => sum + cardPoints(card), 0) *
      (multiplier - 100)) /
      100,
  );
  return { kind, bonus, members, multiplier };
}

/** A hand batch (10 normally, 12 with a relic); strongest <=5-card combo gains a bonus once. */
export function scorePoker(cards: PlayingCard[]): PokerScore {
  const base = cards.reduce((sum, card) => sum + cardPoints(card), 0);
  let best = classify([]);
  const visit = (start: number, subset: PlayingCard[]) => {
    if (subset.length) {
      const candidate = classify(subset);
      if (
        candidate.kind > best.kind ||
        (candidate.kind === best.kind && candidate.bonus > best.bonus)
      )
        best = candidate;
    }
    if (subset.length === 5) return;
    for (let i = start; i < cards.length; i++)
      visit(i + 1, [...subset, cards[i]]);
  };
  visit(0, []);
  return {
    kind: best.kind,
    name: HAND_NAMES[best.kind],
    base,
    bonus: best.bonus,
    damage: base + best.bonus,
    multiplier: best.multiplier,
    comboIds: best.members.map((card) => card.uid),
  };
}
