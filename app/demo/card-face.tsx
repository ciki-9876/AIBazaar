'use client';
import { Sword, Heart, Shield, Zap, FastForward, Droplets } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { FighterCard } from '@/lib/demo-combat';
import { describeCard } from '@/lib/card-description';
import { cardDef } from '@/lib/demo-cards';
import { heroDef, heroOwner } from '@/lib/heroes';
export function cardSpecial(card: FighterCard) {
  return describeCard(card).summary;
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
    description = describeCard(card),
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
        {heroOwner(c.id) && (
          <small className="ed-card-owner">
            {heroDef(heroOwner(c.id)!).name}
          </small>
        )}
      </strong>
      <Symbol className="ed-card-emblem" aria-hidden="true" />
      <div className="ed-special-copy">{description.summary}</div>
      <span className="ed-card-detail-hint">{description.cd}s</span>
      <div className="ed-effect-values">
        {description.effects.map((effect, i) => {
          const Icon =
            effect.kind === 'damage'
              ? Sword
              : effect.kind === 'heal'
                ? Heart
                : effect.kind === 'charge'
                  ? FastForward
                  : effect.kind === 'corrode'
                    ? Droplets
                    : effect.kind === 'energy'
                      ? Zap
                      : Shield;
          return (
            <span key={i} title={effect.text} aria-label={effect.text}>
              <Icon size={12} />
              {effect.value}
              {effect.kind === 'charge' ? 's' : ''}
            </span>
          );
        })}
      </div>
      {waiting && <span className="ed-power-wait">等待能量</span>}
      <span className="ed-quality-mark" aria-hidden="true">
        {card.quality === 2 ? '◆' : card.quality === 1 ? '◇' : ''}
      </span>
    </>
  );
}
