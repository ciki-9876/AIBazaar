import { putInBag } from './survival-cargo.ts';
import { ITEMS } from './survival-room.ts';
import type { OpeningState } from './survival-opening.ts';

export const GUIDE_COPY = {
  aid: {
    title: '最后一份备用补给',
    text: '面包和瓶装水给你了。这是唯一一次备用补给，剩下的要靠你自己。打开行囊，主动吃喝。',
    target: 'needs',
    strong: true,
  },
  needs: {
    title: '探索与饥渴',
    text: '探索会加速饥渴，注意寻找食物和水保持身体健康，饥渴值归零将会削弱你的精神。',
    target: 'needs',
    strong: false,
  },
  spirit: {
    title: '精神力',
    text: '受伤或饥渴归零会削弱精神。精神力归零时，安泊会把你带回电梯。普通背包留在原地，可以回去找；已装备物品与安全容器保留。',
    target: 'spirit',
    strong: true,
  },
  low: {
    title: '50 是警戒线',
    text: '饱食低于 50，移动速度随数值降低，最多减少 50%。饮水低于 50，视野开始扭曲；越渴，扭曲越强。',
    target: 'needs',
    strong: true,
  },
  ascent: {
    title: '只能向上',
    text: '进入第三层后，第一、二层将永远无法访问。确认带上所需物资，再继续上升。',
    target: 'center',
    strong: true,
  },
} as const;
export type GuideId = keyof typeof GUIDE_COPY;
export type Guidance = {
  aidGiven?: boolean;
  seen: GuideId[];
  active: { id: GuideId; remaining: number } | null;
  startFood: number;
  startWater: number;
};
export const createGuidance = (): Guidance => ({
  seen: [],
  active: null,
  startFood: 100,
  startWater: 60,
});
export const guidePaused = (g: Guidance) =>
  !!g.active && GUIDE_COPY[g.active.id].strong;
export function showGuide(g: Guidance, id: GuideId): Guidance {
  return {
    ...g,
    seen: [...g.seen.filter((n) => n !== id), id],
    active: { id, remaining: GUIDE_COPY[id].strong ? 0 : 300 },
  };
}
export function advanceGuidance(
  before: OpeningState,
  next: OpeningState,
): OpeningState {
  let g = next.guidance;
  if (g.active && !GUIDE_COPY[g.active.id].strong)
    g = {
      ...g,
      active:
        g.active.remaining > 1
          ? { ...g.active, remaining: g.active.remaining - 1 }
          : null,
    };
  const p = next.room.player;
  const needsAid =
    next.stage === 'home' &&
    next.afterlight.breadEaten &&
    next.homecoming.scene === 'complete' &&
    (p.food <= 50 || p.water < 50 || g.seen.includes('aid'));
  if (needsAid && !g.aidGiven) {
    let bag = putInBag(next.room.bag, {
      ...ITEMS.bread,
      uid: 'anbo-emergency-bread',
    });
    if (bag)
      bag = putInBag(bag, { ...ITEMS.water, uid: 'anbo-emergency-water' });
    if (bag) {
      next = { ...next, room: { ...next.room, bag } };
      g = { ...g, aidGiven: true };
    }
    if (!g.active && !g.seen.includes('aid')) g = showGuide(g, 'aid');
  }
  if (
    !guidePaused(g) &&
    !g.seen.includes('spirit') &&
    (p.hp < before.room.player.hp ||
      next.room.effects.some(
        (e) => e.kind === 'hit' && e.amount < 0 && e.tick > before.room.tick,
      ))
  )
    g = showGuide(g, 'spirit');
  else if (
    !guidePaused(g) &&
    next.afterlight.breadEaten &&
    !g.seen.includes('low') &&
    Math.min(p.food, p.water) < 50
  )
    g = showGuide(g, 'low');
  else if (
    !g.active &&
    next.stage === 'expedition' &&
    next.room.floor === 2 &&
    !g.seen.includes('needs') &&
    p.food <= g.startFood - 1 &&
    p.water <= g.startWater - 1
  )
    g = showGuide(g, 'needs');
  return { ...next, guidance: g };
}
