'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { approach, reducedMotion, subscribeFrame } from './ticker';
import { BONE, BRASS, LACQUER, LACQUER_DARK, INK } from './palette';

export type RigId = 'eli' | 'reed' | 'mia' | 'felix';
export type RigAction = { kind: 'throw' | 'hit'; id: number } | null;
export type Stance = 'stand' | 'duel';

/**
 * Figures are vector skeletons evaluated every frame, not frame atlases.
 * Walking phase follows distance travelled so boots never slide on the floor.
 */
type Look = {
  name: string;
  scale: number;
  lean: number;
  skin: string;
  skinShade: string;
  hair: string;
  coat: string;
  coatShade: string;
  coatLight: string;
  sleeve: string;
  forearm: string;
  trouser: string;
  boot: string;
  body: 'frock' | 'vest' | 'overall' | 'tails';
};
export const LOOKS: Record<RigId, Look> = {
  eli: {
    name: '伊莱·维尔',
    scale: 1,
    lean: 2,
    skin: '#e9c3a1',
    skinShade: '#c99877',
    hair: '#3a2620',
    coat: '#1f5560',
    coatShade: '#143a43',
    coatLight: '#2f7480',
    sleeve: '#1f5560',
    forearm: '#1f5560',
    trouser: '#3a2e2b',
    boot: '#4b2d21',
    body: 'frock',
  },
  reed: {
    name: '文森特·里德',
    scale: 0.95,
    lean: 6,
    skin: '#e3b894',
    skinShade: '#bf8f6c',
    hair: '#d9d6cf',
    coat: '#7b2a2f',
    coatShade: '#561a20',
    coatLight: '#9a3a3f',
    sleeve: '#e6dcc6',
    forearm: '#e3b894',
    trouser: '#4a4440',
    boot: '#33241d',
    body: 'vest',
  },
  mia: {
    name: '米娅·芬奇',
    scale: 0.91,
    lean: 0,
    skin: '#dca886',
    skinShade: '#b98264',
    hair: '#b4532d',
    coat: '#2d6870',
    coatShade: '#1d4950',
    coatLight: '#3f8790',
    sleeve: '#e8dfca',
    forearm: '#dca886',
    trouser: '#2d6870',
    boot: '#3b2a22',
    body: 'overall',
  },
  felix: {
    name: '菲利克斯·克罗',
    scale: 1.04,
    lean: -1,
    skin: '#ecd0b8',
    skinShade: '#c9a68b',
    hair: '#16161a',
    coat: '#1a1c23',
    coatShade: '#0e0f13',
    coatLight: '#2d3140',
    sleeve: '#1a1c23',
    forearm: '#1a1c23',
    trouser: '#1d1f26',
    boot: '#121215',
    body: 'tails',
  },
};

const THIGH = 44;
const SHIN = 44;
const HIP = -(THIGH + SHIN + 4);
const SHOULDER = -152;
const UPPER = 30;
const FORE = 28;
const STRIDE = 152;

function Limb({
  refOuter,
  refInner,
  x,
  y,
  upper,
  lower,
  upperColor,
  lowerColor,
  upperWidth,
  lowerWidth,
  tip,
}: {
  refOuter: React.RefObject<SVGGElement | null>;
  refInner: React.RefObject<SVGGElement | null>;
  x: number;
  y: number;
  upper: number;
  lower: number;
  upperColor: string;
  lowerColor: string;
  upperWidth: number;
  lowerWidth: number;
  tip: ReactNode;
}) {
  return (
    <g ref={refOuter} transform={`translate(${x} ${y})`}>
      <rect
        x={-upperWidth / 2}
        y={-upperWidth / 2}
        width={upperWidth}
        height={upper + upperWidth}
        rx={upperWidth / 2}
        fill={upperColor}
        stroke="#000"
        strokeOpacity=".22"
        strokeWidth=".9"
      />
      <g ref={refInner} transform={`translate(0 ${upper})`}>
        <rect
          x={-lowerWidth / 2}
          y={-lowerWidth / 2}
          width={lowerWidth}
          height={lower + lowerWidth / 2}
          rx={lowerWidth / 2}
          fill={lowerColor}
          stroke="#000"
          strokeOpacity=".22"
          strokeWidth=".9"
        />
        <g transform={`translate(0 ${lower})`}>{tip}</g>
      </g>
    </g>
  );
}

const boot = (color: string) => (
  <g>
    <path
      d="M-5.5 -7 L5 -7 Q7 -4 12 -2.5 Q16 -1.5 16 2 L16 4 L-6.5 4 Z"
      fill={color}
    />
    <path d="M-6.5 3.2 L16 3.2 L16 4.6 L-6.5 4.6 Z" fill="#000" opacity=".35" />
    <path d="M7 -4 Q11 -2.6 14 -1.6" stroke="#fff" strokeOpacity=".18" strokeWidth="1.2" fill="none" />
  </g>
);
const hand = (look: Look, cards = false) => (
  <g>
    {look.body === 'tails' && <rect x="-4.6" y="-3" width="9.2" height="5" rx="2" fill={BONE} />}
    <path
      d="M-4 -1 Q-4.6 5.6 -1 7.6 Q3.6 8.8 4.4 4.2 L4.6 0.6 Q5.6 -1.4 6.8 0.6 L5.6 4 Q4.6 1 4 -1 Z"
      fill={look.body === 'tails' ? '#f2ede2' : look.skin}
      stroke="#000"
      strokeOpacity=".18"
      strokeWidth=".7"
    />
    {cards && (
      <g transform="translate(3 0) rotate(-20)">
        {[-18, -4, 10].map((angle) => (
          <rect
            key={angle}
            x="-4"
            y="-15"
            width="8"
            height="12"
            rx="1.2"
            fill={BONE}
            stroke="#b9ad96"
            strokeWidth=".6"
            transform={`rotate(${angle} 0 -3)`}
          />
        ))}
      </g>
    )}
  </g>
);

function Torso({ look, gradient }: { look: Look; gradient: string }) {
  const fill = `url(#${gradient})`;
  if (look.body === 'frock' || look.body === 'tails')
    return (
      <g>
        <path
          d="M-13 -154 Q0 -159 12 -154 Q16.5 -139 14.5 -122 Q12.5 -112 13 -100 L-15 -100 Q-16.5 -122 -14.5 -141 Z"
          fill={fill}
        />
        <path d="M3 -157 L11.5 -155 L8 -136 Z" fill={look.body === 'tails' ? '#f4efe4' : '#e8dcc3'} />
        {look.body === 'tails' ? (
          <path d="M6.5 -155 L10 -151 L7.5 -146 L5 -151 Z" fill={LACQUER} />
        ) : null}
        <path
          d="M10.5 -155 Q7 -142 7.5 -128 L13 -112"
          stroke={look.coatShade}
          strokeWidth="1.6"
          fill="none"
        />
        <path d="M14 -150 Q16.4 -136 14.6 -121" stroke="#fff" strokeOpacity=".12" strokeWidth="1.4" fill="none" />
        <circle cx="12.4" cy="-118" r="1.2" fill={BRASS} />
        <circle cx="12.6" cy="-108" r="1.2" fill={BRASS} />
      </g>
    );
  if (look.body === 'vest')
    return (
      <g>
        <path d="M-13 -153 Q0 -159 12 -153 Q15 -138 14 -118 L13 -90 L-14 -90 Q-15 -120 -14 -140 Z" fill="#e6dcc6" />
        <path d="M-12 -146 Q-2 -150 7 -149 L13 -120 L13.5 -92 L-13.5 -92 Q-14 -122 -12 -146 Z" fill={`url(#${gradient})`} />
        <path d="M7 -149 L11 -126 L13.5 -110" stroke={look.coatShade} strokeWidth="1.4" fill="none" />
        <path d="M12.8 -116 Q4 -108 -2 -112" stroke={BRASS} strokeWidth="1" fill="none" />
        <circle cx="12.6" cy="-128" r="1.1" fill={BRASS} />
        <circle cx="13" cy="-118" r="1.1" fill={BRASS} />
        <path d="M-14 -96 L13.6 -96 L13.6 -89 L-14 -89 Z" fill="#2a2421" />
        <rect x="6" y="-96" width="5" height="7" rx="1" fill="none" stroke={BRASS} strokeWidth="1" />
      </g>
    );
  return (
    <g>
      <path d="M-12 -153 Q0 -158 11 -153 Q14 -139 13 -122 L-13 -122 Q-14 -140 -12 -153 Z" fill="#e8dfca" />
      <path d="M-12 -132 L12 -132 L13.5 -100 L13.5 -88 L-13.5 -88 L-13.5 -100 Z" fill={`url(#${gradient})`} />
      <path d="M-7 -133 L-6 -156 M8 -133 L7 -156" stroke={look.coat} strokeWidth="3" />
      <rect x="-1" y="-129" width="11" height="10" rx="1.5" fill={look.coatShade} />
      <circle cx="-6" cy="-131" r="1.3" fill={BRASS} />
      <circle cx="7" cy="-131" r="1.3" fill={BRASS} />
      <g transform="translate(-14 -104) rotate(8)">
        <rect x="-1.5" y="0" width="3" height="18" rx="1.5" fill="#9aa3a6" />
        <circle cy="0" r="3.4" fill="none" stroke="#9aa3a6" strokeWidth="2" />
      </g>
    </g>
  );
}

function Skirt({ look, gradient }: { look: Look; gradient: string }) {
  if (look.body === 'frock')
    return (
      <path
        d="M-15.5 -101 L13.5 -101 L17.5 -60 Q0 -55 -21 -56 Z"
        fill={`url(#${gradient})`}
      />
    );
  if (look.body === 'tails')
    return (
      <g>
        <path d="M-15.5 -101 Q-24 -70 -26 -46 L-14 -50 Q-9 -78 -4 -101 Z" fill={LACQUER_DARK} />
        <path d="M-15.5 -101 L12 -101 L13 -90 Q-6 -86 -12 -76 Q-17 -60 -22 -46 L-27 -47 Q-24 -76 -15.5 -101 Z" fill={`url(#${gradient})`} />
      </g>
    );
  return null;
}

function Head({ look, eye }: { look: Look; eye: React.RefObject<SVGGElement | null> }) {
  return (
    <g>
      <rect x="-4.2" y="-6" width="8.4" height="9" fill={look.skinShade} />
      <path
        d="M-9 -7 Q-12.5 -21 -4.5 -28 Q6 -32.5 11.2 -23 L12.2 -17.5 L15.4 -13.4 L12.4 -11.4 Q12.6 -6.5 10.4 -4 Q7.6 -.6 2.8 -.4 Q-5 -.2 -9 -7 Z"
        fill={look.skin}
      />
      <ellipse cx="-2.6" cy="-14.5" rx="2.6" ry="3.6" fill={look.skinShade} />
      <path d="M9.4 -6.6 L12 -7" stroke="#8a5847" strokeWidth="1" strokeLinecap="round" />
      <g ref={eye}>
        <ellipse cx="8.2" cy="-16.4" rx="1.35" ry="1.9" fill={INK} />
      </g>
      <path d="M6 -20.6 Q8.4 -21.8 10.8 -20.8" stroke={look.hair === '#d9d6cf' ? '#b8b3a8' : look.hair} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {look.body === 'frock' && (
        <path
          d="M-12.5 -12 Q-16 -27 -6 -32 Q5 -37 12.6 -27.5 Q14.6 -22.5 11.4 -21.2 Q9 -25.6 5 -23.4 Q2.6 -19.4 -.6 -21.4 Q-2.2 -16.6 -5.6 -12 Q-9.2 -7.4 -12.5 -12 Z"
          fill={look.hair}
        />
      )}
      {look.body === 'vest' && (
        <g>
          <path d="M-10.8 -9 Q-13 -16 -11.6 -22 Q-8.4 -20 -6.6 -16.6 Q-7.6 -11.6 -10.8 -9 Z" fill={look.hair} />
          <path d="M-6 -27.6 Q2 -31 9 -26" stroke={look.hair} strokeOpacity=".55" strokeWidth="1.4" fill="none" />
          <path d="M3.2 -.6 Q8.8 2.6 12.4 -3.6 Q13 -7.8 10.8 -10 Q9.4 -6.4 5 -6.2 Q1.2 -6.4 .2 -9 Q-1.6 -4 3.2 -.6 Z" fill={look.hair} />
          <circle cx="8.6" cy="-16.2" r="3.4" fill="none" stroke={BRASS} strokeWidth="1" />
          <path d="M5.2 -16.6 L-1.8 -15.4" stroke={BRASS} strokeWidth=".9" />
        </g>
      )}
      {look.body === 'overall' && (
        <g>
          <circle cx="-9.6" cy="-26" r="6.2" fill={look.hair} />
          <path d="M-12 -11 Q-15 -26 -5 -31.6 Q6 -35 12 -25.4 Q8 -26.4 4 -24 Q-1 -22 -4.4 -17.4 Q-7.4 -11.6 -12 -11 Z" fill={look.hair} />
          <path d="M-10.6 -25.6 Q1 -30.6 11.6 -25.8" stroke="#3b2a22" strokeWidth="2.4" fill="none" />
          <circle cx="7.2" cy="-27.6" r="3.2" fill="#7fb8bd" stroke={BRASS} strokeWidth="1.4" />
        </g>
      )}
      {look.body === 'tails' && (
        <g>
          <path d="M-12 -12 Q-14 -26 -5 -29.6 Q6 -32 12 -24.6 Q4 -26.6 -2 -23.6 Q-7 -20 -12 -12 Z" fill={look.hair} />
          <path d="M-13.5 -28.8 L14.6 -28.8 L13.4 -26.2 L-12.6 -26.2 Z" fill="#0c0c0f" />
          <path d="M-9.6 -28.6 L-8.6 -54 L10 -54 L10.6 -28.6 Z" fill="#141519" />
          <path d="M-9.4 -34 L10.4 -34 L10.5 -30.4 L-9.5 -30.4 Z" fill={LACQUER} />
          <path d="M8.6 -52 L9.4 -31" stroke="#fff" strokeOpacity=".12" strokeWidth="1.2" />
          <path d="M8.6 -6.8 Q11.4 -8.6 13.4 -6" stroke="#2a1a14" strokeWidth=".9" fill="none" />
        </g>
      )}
    </g>
  );
}

function ribbon(time: number, walk: number, sway: number) {
  // Hangs from the knot when still; streams behind the shoulders when walking.
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= 6; i++) {
    const k = i / 6;
    const wave = Math.sin(time * (2.1 + 5 * walk) - i * 0.85) * (0.35 + 2.6 * walk + sway) * k;
    const x = -6 - i * (1.1 + 6.4 * walk) + wave * walk * 0.4 - k * k * 3 * (1 - walk);
    const y = -153 + i * (7.2 - 5.4 * walk) + wave;
    const width = 3.3 * (1 - k * 0.45);
    top.push(`${(x - width * 0.9).toFixed(2)} ${(y - width * walk * 0.8).toFixed(2)}`);
    bottom.unshift(`${(x + width * 0.9).toFixed(2)} ${(y + width * walk * 0.8).toFixed(2)}`);
  }
  return `M${top.join(' L')} L${bottom.join(' L')} Z`;
}

export function Rig({
  character,
  travel,
  walking = false,
  stance = 'stand',
  action = null,
  facing = 1,
  phaseOffset = 0,
}: {
  character: RigId;
  /** Distance along the floor, used to phase the stride. Read every frame. */
  travel?: React.RefObject<number>;
  walking?: boolean;
  stance?: Stance;
  action?: RigAction;
  facing?: -1 | 1;
  phaseOffset?: number;
}) {
  const look = LOOKS[character];
  const id = useId().replace(/:/g, '');
  const root = useRef<SVGGElement>(null);
  const torso = useRef<SVGGElement>(null);
  const skirt = useRef<SVGGElement>(null);
  const head = useRef<SVGGElement>(null);
  const eye = useRef<SVGGElement>(null);
  const scarf = useRef<SVGPathElement>(null);
  const legF = useRef<SVGGElement>(null);
  const kneeF = useRef<SVGGElement>(null);
  const legB = useRef<SVGGElement>(null);
  const kneeB = useRef<SVGGElement>(null);
  const armF = useRef<SVGGElement>(null);
  const elbowF = useRef<SVGGElement>(null);
  const armB = useRef<SVGGElement>(null);
  const elbowB = useRef<SVGGElement>(null);
  const live = useRef({ walking, stance, action, facing });
  useEffect(() => {
    live.current = { walking, stance, action, facing };
  }, [walking, stance, action, facing]);

  useEffect(() => {
    const still = reducedMotion();
    let walk = 0;
    let duel = live.current.stance === 'duel' ? 1 : 0;
    let actionId = live.current.action?.id ?? 0;
    let actionStart = -10;
    let actionKind: 'throw' | 'hit' = 'throw';
    let blinkAt = 1.5 + phaseOffset * 3;
    let clock = phaseOffset * 7;
    const set = (ref: React.RefObject<SVGGElement | null>, value: string) =>
      ref.current?.setAttribute('transform', value);
    return subscribeFrame((_time, delta) => {
      clock += delta;
      const state = live.current;
      walk = approach(walk, state.walking ? 1 : 0, delta, 0.07);
      duel = approach(duel, state.stance === 'duel' ? 1 : 0, delta, 0.12);
      if (state.action && state.action.id !== actionId) {
        actionId = state.action.id;
        actionKind = state.action.kind;
        actionStart = clock;
      }
      const elapsed = clock - actionStart;
      const travelled = travel?.current ?? 0;
      const phase = still ? 0 : (travelled / (STRIDE * look.scale)) * Math.PI * 2;
      const s = Math.sin(phase) * walk;
      const c = Math.cos(phase);
      const breath = still ? 0 : Math.sin(clock * 1.75 + phaseOffset * 4);

      // Action envelopes (seconds). Throw: wind 0.12s, snap 0.1s, settle 0.45s.
      let throwArm = 0;
      let throwLean = 0;
      let hitLean = 0;
      if (actionKind === 'throw' && elapsed < 0.7) {
        if (elapsed < 0.12) throwArm = (elapsed / 0.12) * 70;
        else if (elapsed < 0.22) throwArm = 70 - ((elapsed - 0.12) / 0.1) * 175;
        else throwArm = -105 * Math.pow(1 - (elapsed - 0.22) / 0.48, 2);
        throwLean = elapsed < 0.12 ? -4 : 9 * Math.max(0, 1 - (elapsed - 0.12) / 0.55);
      }
      if (actionKind === 'hit' && elapsed < 0.55) {
        const k = elapsed / 0.55;
        hitLean = -14 * Math.sin(Math.min(1, k * 2.4) * Math.PI * 0.5) * (1 - k) * 1.6;
      }

      const bob = (-3.2 + 3.2 * Math.abs(Math.sin(phase))) * walk + breath * 0.5 * (1 - walk);
      const lean = look.lean + 3 * walk + 2 * duel + throwLean + hitLean;
      set(root, `translate(${(hitLean * 0.5).toFixed(2)} ${bob.toFixed(2)}) rotate(${lean.toFixed(2)} 0 ${HIP})`);
      set(torso, `translate(0 ${(-breath * 0.6 * (1 - walk)).toFixed(2)})`);
      set(skirt, `rotate(${(-3.4 * s + hitLean * 0.2).toFixed(2)} 0 -100)`);
      set(head, `translate(${look.body === 'vest' ? 3 : 1} ${(-160 - breath * 0.7).toFixed(2)}) rotate(${(-2 * walk - lean * 0.45 + breath * 0.8 - hitLean * 0.4).toFixed(2)})`);

      const spread = 9 * duel * (1 - walk);
      const thighF = -25 * s - spread;
      const thighB = 25 * s + spread;
      const kF = 4 + 44 * Math.pow(Math.max(0, c), 1.3) * walk + 6 * duel;
      const kB = 4 + 44 * Math.pow(Math.max(0, -c), 1.3) * walk + 6 * duel;
      set(legF, `translate(2 ${HIP}) rotate(${thighF.toFixed(2)})`);
      set(kneeF, `translate(0 ${THIGH}) rotate(${kF.toFixed(2)})`);
      set(legB, `translate(-3 ${HIP}) rotate(${thighB.toFixed(2)})`);
      set(kneeB, `translate(0 ${THIGH}) rotate(${kB.toFixed(2)})`);

      const ready = duel * (1 - walk);
      const armFront = 21 * s - 30 * ready + throwArm + breath * 1.4 * (1 - walk);
      const armBack = -21 * s + 10 * ready - breath * 1.2 * (1 - walk);
      set(armF, `translate(4 ${SHOULDER + 4}) rotate(${armFront.toFixed(2)})`);
      set(elbowF, `translate(0 ${UPPER}) rotate(${(-14 - 12 * Math.max(0, -s) - 62 * ready + Math.min(0, throwArm) * 0.25).toFixed(2)})`);
      set(armB, `translate(-5 ${SHOULDER + 4}) rotate(${armBack.toFixed(2)})`);
      set(elbowB, `translate(0 ${UPPER}) rotate(${(-12 - 12 * Math.max(0, s)).toFixed(2)})`);

      if (clock > blinkAt) {
        const t = clock - blinkAt;
        const shut = t < 0.14 ? Math.sin((t / 0.14) * Math.PI) : 0;
        eye.current?.setAttribute('transform', `translate(0 ${(-16.4 * (1 - (1 - shut * 0.9))).toFixed(2)}) scale(1 ${(1 - shut * 0.9).toFixed(3)})`);
        if (t >= 0.14) blinkAt = clock + 2.6 + ((Math.sin(clock * 12.9898 + phaseOffset) + 1) / 2) * 3.2;
      }
      scarf.current?.setAttribute('d', ribbon(clock, walk, Math.abs(hitLean) * 0.15));
    });
  }, [look, travel, phaseOffset]);

  const coatGradient = `${id}-coat`;
  return (
    <g transform={`scale(${facing * look.scale} ${look.scale})`} data-rig={character}>
      <defs>
        <linearGradient id={coatGradient} x1="0" x2="1" y1="0" y2="0.3">
          <stop offset="0" stopColor={look.coatShade} />
          <stop offset=".62" stopColor={look.coat} />
          <stop offset="1" stopColor={look.coatLight} />
        </linearGradient>
      </defs>
      <ellipse cx="2" cy="2" rx="26" ry="4.5" fill="#000" opacity=".32" />
      <g ref={root}>
        <Limb
          refOuter={armB}
          refInner={elbowB}
          x={-5}
          y={SHOULDER + 4}
          upper={UPPER}
          lower={FORE}
          upperColor={look.sleeve === BONE ? '#d5cab3' : look.coatShade}
          lowerColor={look.forearm === look.skin ? look.skinShade : look.coatShade}
          upperWidth={8.6}
          lowerWidth={7.4}
          tip={hand({ ...look, skin: look.skinShade })}
        />
        <Limb
          refOuter={legB}
          refInner={kneeB}
          x={-3}
          y={HIP}
          upper={THIGH}
          lower={SHIN}
          upperColor={look.trouser}
          lowerColor={look.trouser}
          upperWidth={10.5}
          lowerWidth={8.6}
          tip={<g opacity=".82">{boot(look.boot)}</g>}
        />
        <Limb
          refOuter={legF}
          refInner={kneeF}
          x={2}
          y={HIP}
          upper={THIGH}
          lower={SHIN}
          upperColor={look.trouser}
          lowerColor={look.trouser}
          upperWidth={10.5}
          lowerWidth={8.6}
          tip={boot(look.boot)}
        />
        <g ref={skirt}>
          <Skirt look={look} gradient={coatGradient} />
        </g>
        <g ref={torso}>
          <Torso look={look} gradient={coatGradient} />
          {character === 'eli' && <path ref={scarf} fill={LACQUER} d={ribbon(0, 0, 0)} />}
          {character === 'eli' && (
            <path d="M-9 -161 Q1 -152 11 -158 L11.5 -150 Q0 -143 -9.6 -152.4 Z" fill={LACQUER} />
          )}
        </g>
        <g ref={head} transform={`translate(1 -160)`}>
          <Head look={look} eye={eye} />
        </g>
        <Limb
          refOuter={armF}
          refInner={elbowF}
          x={4}
          y={SHOULDER + 4}
          upper={UPPER}
          lower={FORE}
          upperColor={look.sleeve === look.coat ? look.coatLight : look.sleeve}
          lowerColor={look.forearm === look.coat ? look.coatLight : look.forearm}
          upperWidth={8.8}
          lowerWidth={7.6}
          tip={hand(look, stance === 'duel')}
        />
        {character === 'eli' && <path d="M8 -159 L12 -151" stroke={LACQUER_DARK} strokeWidth="1.2" />}
      </g>
      <title>{look.name}</title>
    </g>
  );
}

/** Standalone figure in its own SVG, for portraits, duel hosts and HUD. */
export function Figure({
  character,
  height = 200,
  facing = 1,
  stance = 'stand',
  action = null,
  crop = 'full',
  className,
  phaseOffset,
}: {
  character: RigId;
  height?: number;
  facing?: -1 | 1;
  stance?: Stance;
  action?: RigAction;
  crop?: 'full' | 'bust' | 'head';
  className?: string;
  phaseOffset?: number;
}) {
  const scale = LOOKS[character].scale;
  const box =
    crop === 'head'
      ? character === 'felix'
        ? '-34 -232 68 84'
        : `-26 ${(-176 * scale - 32).toFixed(0)} 52 60`
      : crop === 'bust'
        ? '-40 -236 80 112'
        : '-48 -246 96 252';
  const [, , w, h] = box.split(' ').map(Number);
  return (
    <svg
      className={className}
      viewBox={box}
      width={(height * w) / h}
      height={height}
      aria-hidden="true"
      data-character={character}
      data-figure="vector-rig"
      overflow="visible"
    >
      <Rig
        character={character}
        facing={facing}
        stance={stance}
        action={action}
        phaseOffset={phaseOffset ?? (character.charCodeAt(0) % 7) / 7}
      />
    </svg>
  );
}

