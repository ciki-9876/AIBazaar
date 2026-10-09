import type { CSSProperties } from 'react';
import type { BattlePhase } from '../../../lib/cards/throw-duel';

export function PhaseLights({ phase }: { phase: BattlePhase }) {
  if (phase === 'opening') return null;
  return (
    <div className={`tp-phase-lights tp-phase-${phase}`} data-battle-phase={phase}>
      <i className="tp-phase-beam tp-phase-beam-left" aria-hidden="true" />
      <i className="tp-phase-beam tp-phase-beam-right" aria-hidden="true" />
      <output className="tp-phase-callout" key={phase} aria-live="polite">
        <small>{phase === 'heated' ? 'THE STAGE IS YOURS' : 'THE FINAL CURTAIN'}</small>
        <strong>{phase === 'heated' ? '白热阶段' : '落幕阶段'}</strong>
        <span>{phase === 'heated' ? '聚光灯下，寸步不让。' : '最后一幕，谁能站到最后。'}</span>
      </output>
    </div>
  );
}

/** Fixed, deterministic trajectories; confetti rises from the screen's lower edge. */
export function VictoryConfetti() {
  return (
    <div className="tp-victory-confetti" aria-hidden="true" data-victory-confetti>
      {Array.from({ length: 64 }, (_, index) => (
        <i key={index} style={{
          '--ribbon-x': `${(index * 37) % 101}%`,
          '--ribbon-drift': `${((index * 61) % 241) - 120}px`,
          '--ribbon-delay': `${(index % 16) * 0.065}s`,
          '--ribbon-duration': `${3.2 + (index % 7) * 0.2}s`,
          '--ribbon-spin': `${(index % 2 ? -1 : 1) * (540 + index * 19)}deg`,
          '--ribbon-color': ['#f5d979', '#c9a25a', '#b3263a', '#56ada4', '#efe7d6'][index % 5],
        } as CSSProperties} />
      ))}
    </div>
  );
}
