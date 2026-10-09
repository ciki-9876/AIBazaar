import type { ReactNode } from 'react';
import { BONE, BRASS, BRASS_DARK, INK, LACQUER, LACQUER_DARK, LIMELIGHT } from './palette';

/** Small reusable set pieces. All coordinates are world units, floor-anchored where noted. */

export type Tone = 'lime' | 'warm' | 'cool' | 'red';
const TONES: Record<Tone, string> = {
  lime: LIMELIGHT,
  warm: '#ffc874',
  cool: '#9ad6e6',
  red: '#ff6a5a',
};

export function Glow({ x, y, r, tone = 'lime', strength = 0.55, className }: {
  x: number;
  y: number;
  r: number;
  tone?: Tone;
  strength?: number;
  className?: string;
}) {
  return (
    <circle className={className} cx={x} cy={y} r={r} fill={`url(#glow-${tone})`} opacity={strength} />
  );
}

/** Downward cone of light, apex at (x, y). */
export function Beam({ x, y, length, spread, strength = 0.22, className, tone = 'lime' }: {
  x: number;
  y: number;
  length: number;
  spread: number;
  strength?: number;
  className?: string;
  tone?: Tone;
}) {
  return (
    <path
      className={className}
      d={`M${x - 6} ${y}L${x + 6} ${y}L${x + spread} ${y + length}Q${x} ${y + length + spread * 0.12} ${x - spread} ${y + length}Z`}
      fill={`url(#beam-${tone})`}
      opacity={strength}
    />
  );
}

export function SharedDefs() {
  return (
    <defs>
      {(Object.keys(TONES) as Tone[]).map((tone) => (
        <radialGradient key={`g${tone}`} id={`glow-${tone}`}>
          <stop offset="0" stopColor={TONES[tone]} stopOpacity="1" />
          <stop offset=".3" stopColor={TONES[tone]} stopOpacity=".38" />
          <stop offset="1" stopColor={TONES[tone]} stopOpacity="0" />
        </radialGradient>
      ))}
      {(Object.keys(TONES) as Tone[]).map((tone) => (
        <linearGradient key={`b${tone}`} id={`beam-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={TONES[tone]} stopOpacity=".85" />
          <stop offset=".7" stopColor={TONES[tone]} stopOpacity=".18" />
          <stop offset="1" stopColor={TONES[tone]} stopOpacity="0" />
        </linearGradient>
      ))}
      <radialGradient id="pool" cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor={LIMELIGHT} stopOpacity=".55" />
        <stop offset=".55" stopColor={LIMELIGHT} stopOpacity=".16" />
        <stop offset="1" stopColor={LIMELIGHT} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="vignette-floor" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={INK} stopOpacity="0" />
        <stop offset="1" stopColor={INK} stopOpacity=".85" />
      </linearGradient>
    </defs>
  );
}

/** Lamp-lit window pane with mullions; `lit` warms the glass. */
export function Pane({ x, y, w, h, lit = true, frame = BONE, glass = '#1b3a44', curtain }: {
  x: number;
  y: number;
  w: number;
  h: number;
  lit?: boolean;
  frame?: string;
  glass?: string;
  curtain?: string;
}) {
  return (
    <g>
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill={frame} opacity=".9" />
      <rect x={x} y={y} width={w} height={h} fill={lit ? '#e9b965' : glass} />
      {lit && <rect x={x} y={y + h * 0.55} width={w} height={h * 0.45} fill="#c98a43" opacity=".55" />}
      {curtain && (
        <g fill={curtain} opacity=".92">
          <path d={`M${x} ${y}H${x + w * 0.3}Q${x + w * 0.18} ${y + h * 0.5} ${x + w * 0.24} ${y + h}H${x}Z`} />
          <path d={`M${x + w} ${y}H${x + w * 0.7}Q${x + w * 0.82} ${y + h * 0.5} ${x + w * 0.76} ${y + h}H${x + w}Z`} />
        </g>
      )}
      <path d={`M${x + w / 2} ${y}V${y + h}M${x} ${y + h * 0.42}H${x + w}`} stroke={frame} strokeWidth="3" />
      {!lit && <path d={`M${x + 6} ${y + h - 8}L${x + w * 0.4} ${y + 8}`} stroke="#fff" strokeOpacity=".08" strokeWidth="6" />}
    </g>
  );
}

/** Victorian street lamp, base on the floor line. */
export function StreetLamp({ x, floor, height = 230 }: { x: number; floor: number; height?: number }) {
  const top = floor - height;
  return (
    <g>
      <path d={`M${x - 11} ${floor}h22l-4 -14h-14z`} fill="#0f1d22" />
      <rect x={x - 3.5} y={top + 26} width="7" height={height - 40} fill="#14262c" />
      <path d={`M${x - 8} ${floor - 60}h16`} stroke="#22383e" strokeWidth="5" />
      <path d={`M${x} ${top + 30}q18 -6 26 -24`} stroke="#14262c" strokeWidth="4" fill="none" />
      <path d={`M${x - 12} ${top + 4}h24l-3 26h-18z`} fill="#f6d68f" />
      <path d={`M${x - 15} ${top + 4}h30l-6 -10h-18z`} fill="#14262c" />
      <path d={`M${x - 10} ${top + 30}h20`} stroke="#14262c" strokeWidth="4" />
      <path d={`M${x} ${top - 6}v-8`} stroke="#14262c" strokeWidth="3" />
    </g>
  );
}

export function Bench({ x, floor, width = 110 }: { x: number; floor: number; width?: number }) {
  return (
    <g>
      <rect x={x} y={floor - 46} width={width} height="6" rx="2" fill="#6b4630" />
      <rect x={x} y={floor - 37} width={width} height="6" rx="2" fill="#5a3a28" />
      <rect x={x} y={floor - 25} width={width} height="7" rx="2" fill="#6b4630" />
      <path
        d={`M${x + 10} ${floor}v-30q0 -18 -6 -22M${x + width - 10} ${floor}v-30q0 -18 6 -22`}
        stroke="#14262c"
        strokeWidth="5"
        fill="none"
      />
    </g>
  );
}

/** A row of marquee bulbs; CSS staggers the chase. */
export function Bulbs({ x1, x2, y, gap = 18, r = 3.6, vertical = false }: {
  x1: number;
  x2: number;
  y: number;
  gap?: number;
  r?: number;
  vertical?: boolean;
}) {
  const count = Math.floor(Math.abs(x2 - x1) / gap) + 1;
  return (
    <g className="st-bulbs">
      {Array.from({ length: count }, (_, i) => {
        const a = x1 + i * gap;
        return (
          <circle
            key={i}
            cx={vertical ? y : a}
            cy={vertical ? a : y}
            r={r}
            fill="#ffe6a6"
            style={{ animationDelay: `${(i % 3) * -0.4}s` }}
          />
        );
      })}
    </g>
  );
}

/** Heavy velvet with soft folds. */
export function Curtain({ x, y, w, h, fold = 34, flip = false, color = LACQUER, shade = LACQUER_DARK, className }: {
  x: number;
  y: number;
  w: number;
  h: number;
  fold?: number;
  flip?: boolean;
  color?: string;
  shade?: string;
  className?: string;
}) {
  const folds = Math.max(2, Math.round(w / fold));
  const step = w / folds;
  return (
    <g transform={flip ? `translate(${2 * x + w} 0) scale(-1 1)` : undefined}>
     <g className={className}>
      <rect x={x} y={y} width={w} height={h} fill={color} />
      {Array.from({ length: folds }, (_, i) => (
        <path
          key={i}
          d={`M${x + i * step} ${y}q${step * 0.5} ${h * 0.5} 0 ${h}h${step * 0.45}q${-step * 0.2} ${-h * 0.5} 0 ${-h}z`}
          fill={shade}
          opacity=".55"
        />
      ))}
      {Array.from({ length: folds }, (_, i) => (
        <path
          key={`h${i}`}
          d={`M${x + i * step + step * 0.72} ${y}v${h}`}
          stroke="#fff"
          strokeOpacity=".07"
          strokeWidth={step * 0.12}
        />
      ))}
     </g>
    </g>
  );
}

export function TopHat({ x, y, s = 1, band = LACQUER }: { x: number; y: number; s?: number; band?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="22" ry="4.5" fill="#111418" />
      <path d="M-14 0L-13 -30H13L14 0Z" fill="#171a20" />
      <rect x="-13.6" y="-9" width="27.2" height="5" fill={band} />
      <path d="M9 -28L10 -6" stroke="#fff" strokeOpacity=".12" strokeWidth="2" />
    </g>
  );
}

export function PlayingCardProp({ x, y, rotate = 0, s = 1, red = false }: {
  x: number;
  y: number;
  rotate?: number;
  s?: number;
  red?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s})`}>
      <rect x="-10" y="-14" width="20" height="28" rx="2.4" fill={BONE} stroke="#a99e86" strokeWidth=".8" />
      <path
        d={red ? 'M0 6C-7 0 -9 -4 -7 -7C-5 -9 -2 -8 0 -5C2 -8 5 -9 7 -7C9 -4 7 0 0 6Z' : 'M0 -8C3 -3 8 -1 7 3C6 6 2 6 1 3L2 7H-2L-1 3C-2 6 -6 6 -7 3C-8 -1 -3 -3 0 -8Z'}
        fill={red ? LACQUER : INK}
      />
    </g>
  );
}

export function Frame({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children?: ReactNode }) {
  return (
    <g>
      <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} fill={BRASS_DARK} />
      <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill={BRASS} opacity=".7" />
      <rect x={x} y={y} width={w} height={h} fill="#1a2c31" />
      {children}
    </g>
  );
}

/** Deterministic pseudo-random for static scatter (bricks, cobbles, motes). */
export function scatter(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dust motes drifting inside a lit region; animated purely in CSS. */
export function Motes({ x, y, w, h, count = 14, seed = 1 }: {
  x: number;
  y: number;
  w: number;
  h: number;
  count?: number;
  seed?: number;
}) {
  const random = scatter(seed);
  return (
    <g className="st-motes">
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={x + random() * w}
          cy={y + random() * h}
          r={0.8 + random() * 1.6}
          fill={LIMELIGHT}
          style={{
            animationDuration: `${7 + random() * 9}s`,
            animationDelay: `${-random() * 12}s`,
            ['--drift' as string]: `${(random() - 0.5) * 50}px`,
          }}
        />
      ))}
    </g>
  );
}
