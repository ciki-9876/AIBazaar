'use client';
import { useEffect, useState, useRef } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { CombatFrame } from '@/lib/demo-combat';
export const SHOT_COLORS = {
  damage: '#ff4d54',
  heal: '#70ed89',
  armor: '#ffe071',
  burn: '#ff922b',
  poison: '#1d8050',
  freeze: '#a9e3ff',
  charge: '#93dfff',
  slow: '#a9e3ff',
};
type Point = { x: number; y: number };
export default function BattleEffects({
  surface,
  frames,
  cursor,
  playing,
  speed,
}: {
  surface: RefObject<HTMLDivElement | null>;
  frames: CombatFrame[];
  cursor: number;
  playing: boolean;
  speed: number;
}) {
  const [points, setPoints] = useState<Record<string, Point>>({});
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = surface.current;
    if (!root) return;
    let pending = 0;
    const measure = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        const box = root.getBoundingClientRect(),
          next: Record<string, Point> = {};
        root.querySelectorAll<HTMLElement>('[data-entity]').forEach((el) => {
          const b = el.getBoundingClientRect();
          next[el.dataset.entity!] = {
            x: b.left - box.left + b.width / 2,
            y: b.top - box.top + b.height / 2,
          };
        });
        setPoints(next);
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root
      .querySelectorAll('[data-entity]')
      .forEach((el) => observer.observe(el));
    measure();
    return () => {
      cancelAnimationFrame(pending);
      observer.disconnect();
    };
  }, [surface, frames]);
  // Use real animation playback controls: pause freezes bolts at their current position.
  useEffect(() => {
    layer.current?.getAnimations({ subtree: true }).forEach((animation) => {
      if (animation.playState === 'finished') return;
      animation.playbackRate = speed;
      if (playing) animation.play();
      else animation.pause();
    });
  }, [playing, speed, cursor]);
  const shots = frames
    .slice(Math.max(0, cursor - 4), cursor + 1)
    .flatMap((frame) =>
      frame.hits.map((hit, i) => ({ hit, key: `${frame.time}-${i}` })),
    )
    .filter((x) => !!x.hit.sourceUid);
  return (
    <div className="ed-projectiles" aria-hidden="true" ref={layer}>
      {shots.map(({ hit, key }) => {
        const start = points[hit.sourceUid!],
          end = points[hit.targetUid ?? `host-${hit.side}`];
        if (!start || !end) return null;
        const dx = end.x - start.x,
          dy = end.y - start.y,
          distance = Math.hypot(dx, dy),
          visual =
            hit.visual ??
            (hit.kind === 'heal'
              ? 'heal'
              : hit.kind === 'damage'
                ? 'damage'
                : 'armor');
        return (
          <div
            key={key}
            className="ed-shot-axis"
            style={
              {
                left: start.x,
                top: start.y,
                transform: `rotate(${Math.atan2(dy, dx)}rad)`,
                '--flight-distance': `${distance}px`,
                '--shot-color': SHOT_COLORS[visual],
              } as CSSProperties
            }
          >
            <div className="ed-shot">
              <i />
              <b />
            </div>
            <div className="ed-shot-impact" style={{ left: distance }} />
          </div>
        );
      })}
    </div>
  );
}
