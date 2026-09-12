'use client';
import { Sword, Heart, Shield, Zap, FastForward, Droplets } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { FighterCard } from '@/lib/demo-combat';
import { describeCard } from '@/lib/card-description';
import { combatValue } from '@/lib/demo-card-rules';
import { cardDef } from '@/lib/demo-cards';
import { heroDef, heroOwner } from '@/lib/heroes';
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
  stored = 0,
}: {
  card: FighterCard;
  enemy: boolean;
  progress?: number;
  waiting?: boolean;
  cooldown?: number;
  playing?: boolean;
  speed?: number;
  stored?: number;
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
        { transform: `scaleY(${from})` },
        {
          transform: `scaleY(${waiting ? from : Math.min(1, from + 0.25 / Math.max(0.25, cooldown))})`,
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
            : c.kind === 'corrode'
              ? Droplets
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
      {(card.id === 'recoil' || c.mechanic?.recoil) && (
        <span
          className="ed-recoil-stored"
          title="下次攻击附加并消耗这些反冲伤害"
        >
          反冲 {Math.round(stored * 10) / 10}
        </span>
      )}
      <strong className="ed-card-name">
        {c.name}
        <small className="ed-card-owner">
          {heroOwner(c.id) ? heroDef(heroOwner(c.id)!).name : '中立'}
        </small>
      </strong>
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
                  : c.kind === 'corrode'
                    ? '叠加侵蚀层数'
                    : '修复屏障'
          }
        >
          <Symbol size={12} />
          {value}
          {c.kind === 'charge' ? 's' : ''}
        </span>
        {c.mechanic?.heal && (
          <span title="治疗宿主">
            <Heart size={12} />
            {Math.round(
              c.mechanic.heal *
                (1 + card.level * 0.12) *
                (1 + card.quality * 0.15) *
                10,
            ) / 10}
          </span>
        )}
        {c.mechanic?.repair && (
          <span title="修复屏障">
            <Shield size={12} />
            {Math.round(
              c.mechanic.repair *
                (1 + card.level * 0.12) *
                (1 + card.quality * 0.15) *
                10,
            ) / 10}
          </span>
        )}
        {c.id === 'distiller' && (
          <span title="治疗宿主">
            <Heart size={12} />
            {Math.round((5 + card.quality * 3) * (1 + card.level * 0.12) * 10) /
              10}
          </span>
        )}
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
