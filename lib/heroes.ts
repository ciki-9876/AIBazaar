import type { HeroId } from './hero-cards.ts';
import { cardDef } from './demo-cards.ts';
export const HEROES: {
  id: HeroId;
  name: string;
  job: string;
  code: string;
  color: string;
  quote: string;
  passive: string;
  question: string;
  weakness: string;
}[] = [
  {
    id: 'breaker',
    name: '岑火',
    job: '破拆工',
    code: 'ECHO / 013',
    color: '#e6a86c',
    quote: '门总会开的。先退后一点。',
    passive: '开战时全队充能 1 秒；每击破一面敌方屏障，再为全队充能 1 秒。',
    question: '用大器械集中突破，还是用小工具多路抢节奏？',
    weakness: '启动增幅有限；面对能扛住前几轮的修复阵容，后续容易乏力。',
  },
  {
    id: 'mender',
    name: '白榆',
    job: '夜班维修师',
    code: 'ECHO / 042',
    color: '#9fc995',
    quote: '还在运转，就还来得及。',
    passive: '每路每累计实际修复 30 点屏障，为该路全部卡牌充能 1 秒。',
    question: '把修复分到三路，还是集中维持一条发动机？',
    weakness: '过量修复不计数；破路后无法重建，侵蚀削减上限会封锁修复收益。',
  },
  {
    id: 'archivist',
    name: '闻砂',
    job: '失物档案员',
    code: 'ECHO / 077',
    color: '#a8b9d3',
    quote: '不要丢。它还记得来时的路。',
    passive:
      '每路每累计 3 次发动，复写本路尺寸最大卡牌的主效果；同尺寸选基础冷却最长者，再同则选最左者。复写不计次数。',
    question: '用多张小牌快速记录，还是给重型成长牌留足格子？',
    weakness:
      '复写不包含固有特效；纯小卡没有高价值复写目标，过多启动卡会挤占输出空间。',
  },
];
export const heroDef = (id: HeroId) => HEROES.find((h) => h.id === id)!;
// Ownership belongs to this hero proposal; adventure keeps its previous rules.
export function heroOwner(id: string): HeroId | undefined {
  const c = cardDef(id);
  return (
    c.hero ??
    (c.school
      ? ({ rush: 'breaker', bastion: 'mender', erosion: 'archivist' } as const)[
          c.school
        ]
      : undefined)
  );
}
