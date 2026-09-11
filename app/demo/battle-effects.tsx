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
  const frame = frames[cursor];
  const endpoint = (hit: CombatFrame['hits'][number]) => {
    const lane = hit.targetLane ?? 1;
    if (hit.kind === 'damage')
      return (
        hit.targetUid ??
        (frame.barriers[hit.side][lane].broken
          ? `host-${hit.side}-lane-${lane}`
          : `barrier-${hit.side}-${lane}`)
      );
    if (hit.kind === 'shield' && frame.barriers[hit.side][lane].broken) {
      const next = [0, 1, 2]
        .filter((i) => !frame.barriers[hit.side][i].broken)
        .sort(
          (a, b) =>
            frame.barriers[hit.side][a].hp / frame.barriers[hit.side][a].maxHp -
            frame.barriers[hit.side][b].hp / frame.barriers[hit.side][b].maxHp,
        )[0];
      if (next !== undefined) return `barrier-${hit.side}-${next}`;
    }
    return hit.targetUid ?? `host-${hit.side}-lane-${lane}`;
  };
  const shots = frame?.projectiles ?? [];
  useEffect(() => {
    layer.current
      ?.querySelectorAll<HTMLElement>('[data-launched]')
      .forEach((element) => {
        const age = Math.max(
          0,
          (frames[cursor].time - Number(element.dataset.launched)) * 1000,
        );
        element.getAnimations({ subtree: true }).forEach((animation) => {
          if (element.dataset.frame !== String(cursor))
            animation.currentTime = age;
          animation.playbackRate = speed;
          if (playing) animation.play();
          else animation.pause();
        });
        element.dataset.frame = String(cursor);
      });
  }, [playing, speed, cursor, frames, points]);
  return (
    <div className="ed-projectiles" aria-hidden="true" ref={layer}>
      {shots.map((hit) => {
        const start = points[hit.sourceUid!],
          end = points[endpoint(hit)];
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
            key={hit.id}
            data-launched={hit.launchedAt}
            className="ed-shot-axis"
            style={
              {
                left: start.x,
                top: start.y,
                transform: `rotate(${Math.atan2(dy, dx)}rad)`,
                '--flight-distance': `${distance}px`,
                '--shot-color': SHOT_COLORS[visual],
                '--flight-time': `${hit.impactAt - hit.launchedAt}s`,
              } as CSSProperties
            }
          >
            <div className="ed-shot">
              <i />
              <b />
            </div>
          </div>
        );
      })}
      {frame?.hits
        .filter((hit) => hit.sourceUid)
        .map((hit, i) => {
          const end = points[endpoint(hit)];
          return end ? (
            <div
              key={`impact-${frame.time}-${i}`}
              className="ed-shot-impact"
              style={
                {
                  left: end.x,
                  top: end.y - 7,
                  '--shot-color': SHOT_COLORS[hit.visual ?? 'damage'],
                } as CSSProperties
              }
            />
          ) : null;
        })}
    </div>
  );
}
