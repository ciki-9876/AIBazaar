import type { FighterCard } from './demo-combat.ts';
import type { HeroId } from './hero-cards.ts';
import { cardDef } from './demo-cards.ts';
import { rarityOf } from './demo-card-rules.ts';
import { heroOwner } from './heroes.ts';
export function addHeroCard(
  board: FighterCard[],
  hero: HeroId,
  id: string,
  lane: number,
  side: string,
  quality = 0,
  level = 0,
) {
  const def = cardDef(id);
  if (heroOwner(id) && heroOwner(id) !== hero)
    throw Error('只能使用当前回响专属卡与中立卡');
  if (!Number.isInteger(lane) || lane < 0 || lane > 2)
    throw Error('请选择上、中或下路');
  const used = new Set(
    board.flatMap((c) =>
      Array.from({ length: cardDef(c.id).size }, (_, i) => c.at + i),
    ),
  );
  const at = [0, 1, 2]
    .map((n) => lane * 3 + n)
    .find(
      (at) =>
        at + def.size <= (lane + 1) * 3 &&
        Array.from({ length: def.size }, (_, i) => at + i).every(
          (n) => !used.has(n),
        ),
    );
  if (at === undefined)
    throw Error(`本路没有连续 ${def.size} 格。可先移除卡牌，或整理本路。`);
  let serial = 0;
  while (board.some((c) => c.uid === `${side}-custom-${serial}`)) serial++;
  return [
    ...board,
    {
      id,
      uid: `${side}-custom-${serial}`,
      at,
      quality,
      level,
      rarity: rarityOf(id),
    },
  ];
}
export function compactHeroLane(board: FighterCard[], lane: number) {
  let at = lane * 3;
  return board
    .map((c) => ({ ...c }))
    .sort((a, b) => a.at - b.at)
    .map((c) => {
      if (Math.floor(c.at / 3) !== lane) return c;
      const next = { ...c, at };
      at += cardDef(c.id).size;
      return next;
    });
}
