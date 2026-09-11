'use client';
import { Sword, Heart, Shield, Zap, FastForward } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { FighterCard } from '@/lib/demo-combat';
import { describeCard } from '@/lib/card-description';
import { combatValue } from '@/lib/demo-card-rules';
import { cardDef } from '@/lib/prototype-v04';
export function cardSpecial(card: FighterCard) {
  return describeCard(card)
    .innate.join(' ')
    .replaceAll('精制解锁：', '精制：')
    .replaceAll('每第 3 次', '每3次')
    .replaceAll('卡牌', '牌');
}
export default function CardFace({
  card,
  progress = 0,
  waiting = false,
  cooldown = 1,
  playing = false,
  speed = 1,
}: {
  card: FighterCard;
  enemy: boolean;
  progress?: number;
  waiting?: boolean;
  cooldown?: number;
  playing?: boolean;
  speed?: number;
}) {
  const wash = useRef<HTMLDivElement>(null),
    animation = useRef<Animation | null>(null),
    active = useRef(playing);
  useEffect(() => {
    active.current = playing;
    if (playing && animation.current?.playState !== 'finished')
      animation.current?.play();
    else animation.current?.pause();
  }, [playing]);
  useEffect(() => {
    animation.current?.cancel();
    if (!wash.current) return;
    const from = Math.max(0, Math.min(1, progress));
    animation.current = wash.current.animate(
      [
        { transform: `scaleX(${from})` },
        {
          transform: `scaleX(${waiting ? from : Math.min(1, from + 0.25 / Math.max(0.25, cooldown))})`,
        },
      ],
      { duration: 250 / speed, fill: 'forwards', easing: 'linear' },
    );
    if (!active.current) animation.current.pause();
    return () => animation.current?.cancel();
  }, [progress, cooldown, speed, waiting]);
  const c = cardDef(card.id),
    value = combatValue(card.id, card.level, card.quality),
    Symbol =
      c.kind === 'damage'
        ? Sword
        : c.kind === 'heal'
          ? Heart
          : c.kind === 'charge'
            ? FastForward
            : Shield;
  return (
    <>
      <div
        className="ed-card-wash"
        ref={wash}
        style={
          {
            '--cooldown-progress': Math.max(0, Math.min(1, progress)),
          } as CSSProperties
        }
      />
      <span className="ed-enhance">Lv {card.level}</span>
      <strong className="ed-card-name">{c.name}</strong>
      <Symbol className="ed-card-emblem" aria-hidden="true" />
      <div className="ed-special-copy">{cardSpecial(card)}</div>
      <div className="ed-effect-values">
        <span
          title={
            c.kind === 'damage'
              ? '造成伤害'
              : c.kind === 'heal'
                ? '治疗宿主'
                : c.kind === 'charge'
                  ? '充能秒数'
                  : '修复屏障'
          }
        >
          <Symbol size={12} />
          {value}
          {c.kind === 'charge' ? 's' : ''}
        </span>
        {c.energyGain > 0 && (
          <span title="产生能量">
            <Zap size={11} />
            {c.energyGain + (c.id === 'cell' && card.quality === 2 ? 1 : 0)}
          </span>
        )}
        {c.energyCost > 0 && (
          <span title="消耗能量">
            <Zap size={11} />-{c.energyCost}
          </span>
        )}
      </div>
      {waiting && <span className="ed-power-wait">等待能量</span>}
      <span className="ed-quality-mark" aria-hidden="true">
        {card.quality === 2 ? '◆' : card.quality === 1 ? '◇' : ''}
      </span>
    </>
  );
}
