'use client';

import { useId, type CSSProperties, type ReactNode } from 'react';
import {
  Sword,
  Skull,
  Flame,
  HeartPlus,
  ShieldPlus,
  PixelIcon,
} from './wandeng-pixel-icons';
import type { CoreKind } from '../../lib/arena-card-face';
import type { ArenaFrame } from '../../lib/arena-engine';
import type { Duel } from '../../lib/cards/combat';

export function battlePixelIcon(
  kind: 'shield' | 'broken-shield' | 'burn' | 'corrode' | 'amplifier' | 'plus',
) {
  return (
    <PixelIcon
      name={
        {
          shield: 'Shield',
          'broken-shield': 'Shield',
          burn: 'Flame',
          corrode: 'Skull',
          amplifier: 'Gem',
          plus: 'Plus',
        }[kind] as 'Shield' | 'Flame' | 'Skull' | 'Gem' | 'Plus'
      }
      size={24}
      aria-hidden="true"
    />
  );
}

const effectIcons = {
  damage: Sword,
  burn: Flame,
  corrode: Skull,
  heal: HeartPlus,
  shield: ShieldPlus,
  repair: ShieldPlus,
};
export function EffectNumber({
  kind,
  children,
}: {
  kind: CoreKind | 'repair';
  children: ReactNode;
}) {
  const Icon = effectIcons[kind];
  return (
    <span className="wd-effect-number" data-kind={kind}>
      <Icon className="wd-effect-symbol" aria-hidden="true" />
      <span className="wd-effect-digits">{children}</span>
    </span>
  );
}

export function SoulVeil({
  side,
  lane,
  frame,
}: {
  side: number;
  lane: number;
  frame: ArenaFrame;
}) {
  const id = useId();
  const barrier = frame.barriers[side][lane];
  const integrity = Math.max(0, barrier.hp / barrier.maxHp);
  const hit = frame.hits.some(
    (h) =>
      h.side === side && h.targetLane === lane && (h.barrierAbsorbed ?? 0) > 0,
  );
  const repair = frame.hits.some(
    (h) =>
      h.side === side &&
      h.targetLane === lane &&
      h.kind === 'shield' &&
      h.value > 0,
  );
  return (
    <div
      className={`wd-soul-veil ${side ? 'wd-enemy-veil' : ''} ${barrier.broken ? 'is-broken' : ''} ${integrity < 0.4 ? 'is-frayed' : ''} ${hit ? 'is-hit' : ''} ${repair ? 'is-mending' : ''}`}
      style={{ '--integrity': integrity } as CSSProperties}
    >
      <svg
        viewBox="0 0 192 40"
        preserveAspectRatio="none"
        aria-label={`联结护幕（屏障）${barrier.broken ? '已消散' : `剩余 ${Number(barrier.hp.toFixed(1))}`}`}
      >
        <defs>
          <clipPath id={id}>
            <path d="M6 7H186V29H180V32H168V34H154V32H142V29H138V32H126V34H112V32H100V30H92V32H80V34H66V32H54V29H50V32H38V34H24V32H12V29H6Z" />
          </clipPath>
        </defs>
        <path className="wd-veil-rod" d="M3 5H189M5 4V33M187 4V33" />
        <g clipPath={`url(#${id})`} className="wd-veil-fabric">
          <path className="wd-veil-base" d="M0 0H192V40H0Z" />
          <rect
            className="wd-veil-light"
            x="0"
            y="0"
            width={Math.round(192 * integrity)}
            height="40"
          />
          <path
            className="wd-veil-weave"
            d="M0 10H192M0 25H192M16 0V40M32 0V40M48 0V40M64 0V40M80 0V40M112 0V40M128 0V40M144 0V40M160 0V40M176 0V40"
          />
          <path
            className="wd-veil-seam"
            d="M9 12H183M9 27H15V30H24V32H38V30H50V27H54V30H66V32H80V30H90M102 30H112V32H126V30H138V27H142V30H154V32H168V30H180V27H183"
          />
          <path
            className="wd-veil-tear"
            d="M94 6V12H100V19H93V25H98V34M54 26V29H58V34M146 8V15H142V21"
          />
        </g>
        <path
          className="wd-veil-knot"
          d="M92 10H100V12H103V25H100V28H92V25H89V12H92Z M94 15H98M94 23H98M96 14V24"
        />
        <path
          fill="var(--veil-ink)"
          opacity=".6"
          d="M4 2H7V5H4Z M185 2H188V5H185Z M29 17H31V15H33V17H35V19H33V21H31V19H29Z M157 17H159V15H161V17H163V19H161V21H159V19H157Z"
        />
      </svg>
      <span className="wd-veil-caption">
        {barrier.broken ? '护幕消散' : '联结护幕'}
      </span>
    </div>
  );
}

export function SoulHost({
  duel,
  frame,
  side,
  label,
}: {
  duel: Duel;
  frame: ArenaFrame;
  side: number;
  label?: string;
}) {
  const name = label ?? (side ? duel.name : '你与同行的物品');
  const hp = Math.max(0, frame.hp[side]);
  const ratio = hp / duel.maxHp[side];
  const hit = frame.hits.some(
    (h) => h.side === side && (h.healthLoss ?? 0) > 0,
  );
  return (
    <section
      className={`wd-soul-host ${side ? 'wd-enemy-host' : ''} ${ratio < 0.3 ? 'is-low' : ''} ${hp === 0 ? 'is-out' : ''} ${hit ? 'is-hit' : ''}`}
      aria-label={`${name}的心灯，生命 ${Number(hp.toFixed(1))} / ${duel.maxHp[side]}`}
      style={{ '--soul-light': Math.max(0.12, ratio) } as CSSProperties}
    >
      <div className="wd-host-thread" aria-hidden="true">
        <i style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="wd-heart-lantern" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path
            className="wd-lantern-shadow"
            d="M13 59H51V61H13Z M19 57H45V59H19Z"
          />
          <path
            fill="var(--lamp-edge)"
            d="M27 2H37V4H39V13H43V16H47V20H50V24H47V48H49V53H51V58H13V53H15V48H17V24H14V20H17V16H21V13H25V4H27Z M28 5V12H36V5Z"
          />
          <path
            className="wd-lantern-metal"
            d="M28 3H36V5H38V12H36V6H28V12H26V5H28Z M23 14H41V17H45V20H48V22H16V20H19V17H23Z M18 24H22V49H18Z M42 24H46V49H42Z M16 52H48V56H16Z"
          />
          <path className="wd-lantern-glass" d="M23 24H41V48H23Z" />
          <path
            fill="#ccb681"
            d="M23 24H26V48H23Z M38 24H41V48H38Z M26 46H38V48H26Z"
          />
          <path
            className="wd-lantern-glow"
            d="M26 25H38V45H26Z M22 29H24V44H22Z M40 29H42V44H40Z"
          />
          <path
            className="wd-lantern-heart"
            d="M26 29H30V31H34V29H38V31H40V36H38V39H35V42H33V44H31V42H29V39H26V36H24V31H26Z"
          />
          <path
            fill="#ffefb1"
            opacity="var(--soul-light)"
            d="M27 31H29V34H27Z M28 30H30V31H28Z M35 31H37V32H35Z"
          />
          <path className="wd-lantern-wick" d="M30 44H34V48H38V50H26V48H30Z" />
          <path
            fill="var(--lamp-edge)"
            d="M16 49H48V51H16Z M29 12H35V14H29Z M24 17H40V18H24Z"
          />
          <path
            fill="#f2d39a"
            d="M21 19H44V20H21Z M18 21H46V22H18Z M19 25H20V44H19Z M17 53H47V54H17Z M28 4H35V5H28Z"
          />
          <path
            fill="#dcb867"
            d="M19 46H21V48H19Z M43 25H45V27H43Z M43 46H45V48H43Z M20 55H26V56H20Z M38 55H44V56H38Z"
          />
          <path
            className="wd-lantern-crack"
            fill="#987951"
            d="M37 25H39V31H36V36H39V42H36V47H34V40H37V37H34V30H37Z"
          />
          <g opacity="var(--soul-light)" fill="#e6be66">
            <path d="M8 25H10V27H12V29H10V31H8V29H6V27H8Z M52 39H54V41H56V43H54V45H52V43H50V41H52Z" />
            <path fill="#fff3bb" d="M9 26H10V28H9Z M53 40H54V42H53Z" />
          </g>
        </svg>
      </div>
      <div className="wd-host-name">
        <small>{side ? '对手的心灯' : '你的心灯'} · 羁绊所系</small>
        <strong>{name}</strong>
      </div>
      <div className="wd-host-vital">
        <span>生命</span>
        <strong>{Number(hp.toFixed(1))}</strong>
        <small>/ {duel.maxHp[side]}</small>
      </div>
    </section>
  );
}
