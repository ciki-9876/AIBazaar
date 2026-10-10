'use client';
import { useEffect, useMemo, useState } from 'react';
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
      text: '这些是你的手牌。每 6 秒发一轮，一轮两张；攒满 10 张就停——跟里德的茶杯一样，满了就不再倒。',
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
      text: '你手里藏着一对。先点「按点数」，让同点数的牌挨在一起。整理是每个人的基本功，冷却 20 秒。',
      target: 'sort',
      hold: true,
      when: (c) => hasPair(player(c).hand) && !adjacentPair(player(c).hand) && player(c).nextReorder <= c.duel.tick,
      skip: (c) => adjacentPair(player(c).hand),
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
      text: '甩出去！对子本身有牌型加成。你的入门道具更适合单张，记得看手牌上方的「本箱打法」。',
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
      text: '菲利克斯打火：他甩方块会点燃你。记住「火怕盾」——身上有护盾时：① 新点的火只着一半；② 火只烧盾、不烧血（闷火）；③ 每秒多灭 2 层。守灯小毯让你每甩一张黑桃加 14 点护盾。',
      target: 'stage',
      hold: true,
    },
    {
      id: 'burning-bare',
      text: '你着火了，而且身上没有盾：火正直接烧你的血，治疗只剩六成，火大了出手还烫手。现在甩一张黑桃，把盾竖起来。',
      target: 'hand',
      hold: true,
      when: (c) => player(c).burn > 0 && player(c).shield === 0,
      skip: (c) => player(c).burn > 0 && player(c).shield > 0,
    },
    {
      id: 'smother',
      text: '看，这就是闷火：火在烧你的盾，血一点没掉，而且火灭得更快。保持身上有盾，就能一边挡火一边进攻。',
      target: 'stage',
      hold: true,
      when: (c) => player(c).burn > 0 && player(c).shield > 0,
    },
  ],
};
const NO_STEPS: Step[] = [];

export function useCoach(
  script: CoachScript | null | undefined,
  duel: ThrowDuel,
  picked: PlayingCard[],
  active: boolean,
) {
  const [progress, setProgress] = useState({ index: 0, mark: { throws: 0, reorders: 0 } });
  const [dismissed, setDismissed] = useState(false);
  const steps = script ? SCRIPTS[script] : NO_STEPS;
  const reorders = duel.events.filter((event) => event.side === 0 && event.kind === 'reorder').length;
  const context: Context = useMemo(() => ({ duel, picked, mark: progress.mark, reorders }), [duel, picked, progress.mark, reorders]);
  let step = !dismissed && active ? steps[progress.index] : undefined;
  // Skip steps that do not apply to this loadout.
  if (step?.skip?.(context)) step = undefined;
  const live = step && (step.when ? step.when(context) : true) ? step : undefined;
  const next = () => {
    setProgress((value) => ({ index: value.index + 1, mark: { throws: duel.fighters[0].throws, reorders } }));
  };
  useEffect(() => {
    if (!script || dismissed || !active) return;
    const current = steps[progress.index];
    if (!current) return;
    if (!current.skip?.(context) && !(live && current.done?.(context))) return;
    // Advance after the acknowledged action's render; cancellation prevents a stale step
    // from advancing again when the duel/selection changes in the same browser turn.
    const timer = window.setTimeout(() => setProgress((value) => value.index !== progress.index ? value : {
      index: value.index + 1,
      mark: { throws: context.duel.fighters[0].throws, reorders: context.reorders },
    }), 0);
    return () => window.clearTimeout(timer);
  }, [script, dismissed, active, steps, progress.index, context, live]);
  return {
    step: live ?? null,
    holding: Boolean(live?.hold),
    total: steps.length,
    index: progress.index,
    carryOn: next,
    reset: () => {
      setProgress({ index: 0, mark: { throws: 0, reorders: 0 } });
      setDismissed(false);
    },
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
    <output
      className="tp-coach"
      data-coach-target={step.target ?? 'stage'}
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
    </output>
  );
}
