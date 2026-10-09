'use client';
import { useEffect, useRef, useState } from 'react';
import { scorePoker, type PlayingCard } from '../../../lib/cards/throw-poker';
import type { ThrowDuel } from '../../../lib/cards/throw-duel';
import type { CoachScript } from '../../../lib/adventure/magician-world';

/**
 * Guided duels. Coaching only reads the real duel; while a step that asks
 * the player to act is showing, the table stops the simulation clock, the
 * same way the pause button does. No rule state is invented or changed.
 */
export type CoachTarget = 'hand' | 'fire' | 'sort' | 'enemy' | 'stage' | null;
type Context = {
  duel: ThrowDuel;
  picked: PlayingCard[];
  /** Player throws and arrangements when the current step began. */
  mark: { throws: number; reorders: number };
  reorders: number;
};
type Step = {
  id: string;
  text: string;
  target: CoachTarget;
  /** Becomes active only once this holds; until then the duel runs normally. */
  when?: (context: Context) => boolean;
  /** Skip the step altogether, e.g. when the player brought no sorting relic. */
  skip?: (context: Context) => boolean;
  /** Finishes the step; when absent, the player presses “Carry on”. */
  done?: (context: Context) => boolean;
  /** Stop the clock while showing. */
  hold: boolean;
};
const hasPair = (hand: PlayingCard[]) =>
  hand.some((card, index) => hand.some((other, j) => j !== index && other.rank === card.rank));
const adjacentPair = (hand: PlayingCard[]) =>
  hand.some((card, index) => index > 0 && hand[index - 1].rank === card.rank);
const player = (context: Context) => context.duel.fighters[0];

const SCRIPTS: Record<CoachScript, Step[]> = {
  lesson: [
    {
      id: 'hand',
      text: '这些是你的手牌。每 3 秒自动多一张，攒满 10 张就停——跟里德的茶杯一样，满了就不再倒。',
      target: 'hand',
      hold: true,
    },
    {
      id: 'select',
      text: '点一张牌，选中它。点哪张都行，第一次嘛，不评分。',
      target: 'hand',
      hold: true,
      done: (c) => c.picked.length > 0,
    },
    {
      id: 'throw',
      text: '按空格键，或者点右边的「甩出去」。牌会飞向里德，按点数造成伤害。',
      target: 'fire',
      hold: true,
      done: (c) => player(c).throws > c.mark.throws,
    },
    {
      id: 'intent',
      text: '看上面：里德有牌亮起来了。亮牌意味着他 1 秒后出手，旁边写着预计伤害。读懂对手，是魔术师的基本礼貌。',
      target: 'enemy',
      hold: true,
      when: (c) => c.duel.ai.intent.length > 0,
    },
    {
      id: 'sort',
      text: '你手里藏着一对。先点「按点数」，让同点数的牌挨在一起。',
      target: 'sort',
      hold: true,
      when: (c) => hasPair(player(c).hand) && !adjacentPair(player(c).hand),
      skip: (c) => player(c).relic !== 'order' || adjacentPair(player(c).hand),
      done: (c) => adjacentPair(player(c).hand),
    },
    {
      id: 'box',
      text: '按住鼠标（或手指），从这一对的一张拖到另一张，把它们框起来。点击一次只能选一张。',
      target: 'hand',
      hold: true,
      when: (c) => adjacentPair(player(c).hand),
      done: (c) => c.picked.length >= 2 && scorePoker(c.picked).kind >= 1,
    },
    {
      id: 'fire-pair',
      text: '甩出去！对子有额外伤害，双响茶壶也会跟着响一声。',
      target: 'fire',
      hold: true,
      done: (c) => player(c).throws > c.mark.throws,
    },
    {
      id: 'free',
      text: '剩下的交给你了。别等完美的一手，等最好的时机——还有，别让里德睡着。',
      target: 'stage',
      hold: true,
    },
  ],
  qualifier: [
    {
      id: 'fire-intro',
      text: '菲利克斯打火系：他出方块会点燃你。火怕盾——出黑桃、出对子，用补丁旧伞和守灯小毯竖起护盾。',
      target: 'stage',
      hold: true,
    },
    {
      id: 'burning',
      text: '你着火了。灼烧每秒扣血，治疗只剩六成，出手还会烫手。只要护盾还在，火就只能烧盾，而且灭得更快。',
      target: 'stage',
      hold: true,
      when: (c) => player(c).burn > 0,
    },
  ],
};

export function useCoach(
  script: CoachScript | null | undefined,
  duel: ThrowDuel,
  picked: PlayingCard[],
  active: boolean,
) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const mark = useRef({ throws: 0, reorders: 0 });
  const steps = script ? SCRIPTS[script] : [];
  const reorders = duel.events.filter((event) => event.side === 0 && event.kind === 'reorder').length;
  const context: Context = { duel, picked, mark: mark.current, reorders };
  let step = !dismissed && active ? steps[index] : undefined;
  // Skip steps that do not apply to this loadout.
  if (step?.skip?.(context)) step = undefined;
  const live = step && (step.when ? step.when(context) : true) ? step : undefined;
  const next = () => {
    mark.current = { throws: duel.fighters[0].throws, reorders };
    setIndex((value) => value + 1);
  };
  useEffect(() => {
    if (!script || dismissed || !active) return;
    const current = steps[index];
    if (!current) return;
    if (current.skip?.(context)) return next();
    if (live && current.done?.(context)) next();
  });
  useEffect(() => {
    if (live) mark.current = { throws: duel.fighters[0].throws, reorders };
    // Mark only when a step first appears.
  }, [live?.id]);
  return {
    step: live ?? null,
    holding: Boolean(live?.hold),
    total: steps.length,
    index,
    carryOn: next,
    dismiss: () => setDismissed(true),
  };
}

export function CoachCard({
  coach,
}: {
  coach: ReturnType<typeof useCoach>;
}) {
  const { step } = coach;
  if (!step) return null;
  return (
    <aside
      className="tp-coach"
      data-coach-target={step.target ?? 'stage'}
      role="status"
      aria-live="polite"
      key={step.id}
    >
      <span className="tp-coach-mark" aria-hidden="true">
        {coach.index + 1}
        <small>/{coach.total}</small>
      </span>
      <p>{step.text}</p>
      <div>
        <button className="tp-coach-skip" onClick={coach.dismiss}>
          跳过引导
        </button>
        {!step.done && (
          <button className="tp-primary" onClick={coach.carryOn}>
            明白了
          </button>
        )}
      </div>
    </aside>
  );
}
