import { cardDef } from '@/lib/cards/catalog';
import { describeCard } from '@/lib/card-description';

// Presentation samples use existing named variants. They never reroll a save.
export const EDITIONS = [
  {
    id: 'rubber~worn',
    label: '普通',
    color: '#b9c1bc',
    finish: '纤维纸 · 素银压印',
    marks: 1,
  },
  {
    id: 'rubber~reinforced',
    label: '罕见',
    color: '#80c99b',
    finish: '纤维纸 · 绿银嵌线',
    marks: 2,
  },
  {
    id: 'rubber~precision',
    label: '稀有',
    color: '#79baff',
    finish: '蓝银箔 · 角度变色',
    marks: 3,
  },
  {
    id: 'rubber~void',
    label: '传说',
    color: '#ffb862',
    finish: '蚀金压印 · 流光浮尘',
    marks: 4,
  },
  {
    id: 'rubber~relic',
    label: '奇迹',
    color: '#eca3ed',
    finish: '虹彩薄膜 · 异常光环',
    marks: 5,
  },
] as const;
export type SpecimenView = 'item' | 'card' | 'identify';
export function specimenCard(tier: number) {
  const edition = EDITIONS[tier],
    def = cardDef(edition.id);
  const card = {
    id: def.id,
    uid: `art-specimen-${def.id}`,
    at: 3,
    level: 0,
    quality: 0,
    rarity: def.rarity ?? tier,
  };
  return { edition, def, card, description: describeCard(card, false) };
}
