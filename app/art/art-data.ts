import { cardDef } from '@/lib/demo-cards';
import type { FighterCard } from '@/lib/demo-combat';
export const ATLAS: Record<string, number> = {
  nailer: 0,
  fuse: 1,
  springbow: 2,
  gapblade: 3,
  recoil: 4,
  rubber: 4,
  counterweight: 4,
  sealant: 5,
  acid: 6,
  catalyst: 8,
  culture: 7,
  distiller: 8,
};
export const KIND: Record<string, string> = {
  damage: '伤害',
  charge: '充能',
  heal: '治疗',
  shield: '修复',
  corrode: '侵蚀',
};
export const LANES = ['上路', '中路', '下路'];
export function cardPosition(card: FighterCard, side: number) {
  const width = cardDef(card.id).size;
  const cell = card.at % 3;
  return {
    x: side
      ? 0.72 + (cell + width / 2) * 0.92
      : -0.72 - (cell + width / 2) * 0.92,
    z: (Math.floor(card.at / 3) - 1) * 1.8,
    width: width * 0.92 - 0.1,
  };
}
