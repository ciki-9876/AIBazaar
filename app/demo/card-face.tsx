'use client';
import { Sword, Heart, Shield, Shirt, Zap, FastForward } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { FighterCard } from '@/lib/demo-combat';
import { armorOf } from '@/lib/demo-combat';
import { cardDef, stat } from '@/lib/prototype-v04';
export function cardSpecial(card: FighterCard) {
  const q = card.quality;
  const descriptions: Record<string, string> = {
    knife: `每第3次攻击追加 ${q === 2 ? 12 : 6} 伤害。`,
    wire: `潮湿时每第3次发动，给同路另一张牌充能 ${q === 2 ? 2 : 1} 秒。`,
    bottle: `潮湿时每第3次发动，额外治疗 ${q === 2 ? 25 : 15}。`,
    shelter: '同路其他牌免受寒冷与强风的冷却惩罚。',
    bell: '强风时充能同路全部其他牌，自身冷却延长 1 秒。',
    brick: `炎热时每第3次攻击追加 ${q === 2 ? 30 : 18} 伤害。`,
    box: `寒冷时溢出治疗转为最多 ${q === 2 ? 20 : 12} 护盾。`,
  };
  if (card.id === 'coil')
    return (
      '越线狙击：其他路后排，无目标改同路。' +
      (q > 0 ? `每第3次追加 ${q === 2 ? 24 : 12} 伤害。` : '')
    );
  if (card.id === 'battery') return '能量上限 +6。';
  if (card.id === 'cell') return '';
  return `${q === 0 ? '精制解锁：' : ''}${descriptions[card.id] ?? ''}`;
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
    armor = armorOf(card),
    value =
      stat(card.id, card.rarity, card.level) +
      (card.quality === 2
        ? c.kind === 'charge'
          ? 0.5
          : card.id === 'shelter'
            ? 5
            : card.id === 'battery'
              ? 10
              : 0
        : 0),
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
      <span className="ed-enhance">+{card.level}</span>
      <strong className="ed-card-name">{c.name}</strong>
      <div className="ed-special-copy">{cardSpecial(card)}</div>
      <span
        className="ed-armor-corner"
        title={`${((armor / (100 + armor)) * 100).toFixed(1)}% 伤害减免`}
      >
        <Shirt size={12} />
        {armor}
      </span>
      <div className="ed-effect-values">
        <span
          title={
            c.kind === 'damage'
              ? '造成伤害'
              : c.kind === 'heal'
                ? '治疗宿主'
                : c.kind === 'charge'
                  ? '充能秒数'
                  : '提供护盾'
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
