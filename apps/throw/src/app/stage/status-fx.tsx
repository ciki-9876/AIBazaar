import type { CSSProperties } from 'react';
import { AMETHYST, BRASS, LACQUER, LIMELIGHT, VERDIGRIS_LIGHT } from './palette';
import './status-fx.css';

export type StatusDamage = { id: number; kind: 'damage' | 'burn' | 'poison'; value: number };

/** Actor-local presentation only. Damage ids come from settled rule events, never a visual timer. */
export function StageStatusFx({ burn, poison, damage, paused = false }: {
  burn: number;
  poison: number;
  damage?: StatusDamage | null;
  paused?: boolean;
}) {
  return <div className="st-status-fx" data-paused={paused} aria-hidden="true">
    <svg viewBox="0 0 180 270" preserveAspectRatio="none">
      {burn > 0 && <g className="st-status-fire" data-stacks={burn}>
        <ellipse cx="90" cy="245" rx="45" ry="13" fill={BRASS} opacity=".13" />
        {[0, 1, 2, 3, 4].map((i) => <g key={i} transform={`translate(${50 + i * 20} ${234 - (i % 2) * 16})`}>
          <g className="st-status-flame" style={{ '--i': i } as CSSProperties}>
            <path d="M0 0C-20-16-9-31-2-47C0-31 10-30 7-55C31-28 22-8 0 0Z" fill={LACQUER} opacity=".64" />
            <path d="M0 0C-10-13-3-21 2-32C2-17 12-14 0 0Z" fill={BRASS} opacity=".86" />
            <path d="M0-2Q-6-9 1-18Q8-9 0-2Z" fill={LIMELIGHT} opacity=".9" />
          </g>
        </g>)}
        {Array.from({ length: 7 }, (_, i) => <circle key={i} className="st-status-ember"
          cx={44 + (i * 37) % 92} cy={220 - (i % 3) * 17} r={i % 2 ? 2 : 3}
          fill={i % 2 ? LIMELIGHT : BRASS} style={{ '--i': i } as CSSProperties} />)}
      </g>}
      {poison > 0 && <g className="st-status-poison" data-stacks={poison}>
        <ellipse className="st-status-miasma" cx="90" cy="224" rx="49" ry="18" fill={AMETHYST} opacity=".16" />
        {[0, 1, 2].map((i) => <path key={i} className="st-status-vapor"
          d={`M${52 + i * 34} 224C${24 + i * 34} 185 ${85 + i * 24} 166 ${56 + i * 26} 120`}
          fill="none" stroke={i % 2 ? AMETHYST : VERDIGRIS_LIGHT} strokeWidth={4 + i} strokeLinecap="round"
          style={{ '--i': i } as CSSProperties} />)}
        {Array.from({ length: 7 }, (_, i) => <g key={i} className="st-status-bubble" style={{ '--i': i } as CSSProperties}>
          <circle cx={37 + (i * 29) % 110} cy={225 - (i % 3) * 26} r={3 + i % 3}
            fill={AMETHYST} fillOpacity=".16" stroke={VERDIGRIS_LIGHT} strokeWidth="1.3" />
          <circle cx={36 + (i * 29) % 110} cy={224 - (i % 3) * 26} r="1" fill={VERDIGRIS_LIGHT} />
        </g>)}
      </g>}
      {damage && damage.value > 0 && <g key={damage.id} className={`st-status-impact st-status-impact--${damage.kind}`}>
        {damage.kind === 'burn' ? <>
          <ellipse cx="90" cy="216" rx="48" ry="21" fill="none" stroke={BRASS} strokeWidth="4" />
          <path d="M46 208l-8-21m89 18 12-26M67 186l-3-23m36 25 4-28" stroke={LIMELIGHT} strokeWidth="3" />
        </> : damage.kind === 'poison' ? <>
          <ellipse cx="90" cy="155" rx="42" ry="69" fill={AMETHYST} opacity=".16" />
          <path d="M50 196q40 28 80-7M48 151q40-24 83 2" fill="none" stroke={VERDIGRIS_LIGHT} strokeWidth="3" />
        </> : <>
          <path d="M46 146l28-9-7-25 24 15 16-27 3 30 28-4-21 20 18 18-30-7-12 27-8-27-26 11Z" fill={LIMELIGHT} opacity=".75" />
          <path d="M27 120l15 7m98-15 14-9M35 177l15-8m82 12 15 8" stroke={BRASS} strokeWidth="3" />
        </>}
      </g>}
    </svg>
  </div>;
}
