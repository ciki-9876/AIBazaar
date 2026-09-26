'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Flame, Heart, ShieldPlus, Droplets } from 'lucide-react';
import {
  combatNumbers,
  numberPose,
  NUMBER_LIFETIME,
} from '@/lib/arena-numbers';
import type { CombatFrame, Duel } from '@/lib/demo-combat';
import type { BoardAnchors } from '@/app/art/slice/scene';

export function ArenaNumbers({
  duel,
  frames,
  time,
  clock,
  board,
  reduced,
}: {
  duel: Duel;
  frames: CombatFrame[];
  time: number;
  clock: { current: number };
  board: BoardAnchors;
  reduced: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const numbers = useMemo(() => combatNumbers(duel, frames), [duel, frames]);
  const visible = useMemo(
    () =>
      numbers.filter((n) => n.time <= time && time - n.time < NUMBER_LIFETIME),
    [numbers, time],
  );
  useEffect(() => {
    let handle = 0;
    const nodes = root.current?.querySelectorAll<HTMLElement>('.tac-number');
    function draw() {
      const height = root.current?.clientHeight ?? 0;
      nodes?.forEach((node, i) => {
        const pose = numberPose(visible[i], clock.current, reduced);
        // Keep the full glyph inside the table at the near/far core edges.
        const y = Math.max(
          6 - node.offsetTop,
          Math.min(height - node.offsetTop - node.offsetHeight - 6, pose.y),
        );
        node.style.opacity = String(pose.opacity);
        node.style.transform = `translate(calc(-50% + ${pose.x}px), ${y}px) scale(${pose.scale})`;
      });
      handle = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(handle);
  }, [visible, clock, reduced]);
  return (
    <div ref={root} className="tac-numbers" aria-hidden="true">
      {visible.map((n) => {
        const a =
          board.surfaces?.[(n.side * 3 + n.lane) * 5 + n.column * 2]?.[
            n.surface
          ];
        if (!a)
          return (
            <span key={n.id} className="tac-number" style={{ opacity: 0 }} />
          );
        const positive = n.kind === 'repair' || n.kind === 'heal';
        const Icon =
          n.kind === 'repair'
            ? ShieldPlus
            : n.kind === 'heal'
              ? Heart
              : n.kind === 'burn'
                ? Flame
                : n.kind === 'corrode'
                  ? Droplets
                  : null;
        return (
          <span
            key={n.id}
            className={`tac-number ${n.kind} ${n.surface} ${n.value >= 30 ? 'heavy' : ''}`}
            style={{ left: a.x, top: a.y, opacity: 0 }}
            data-value={n.value}
            data-time={n.time}
          >
            {Icon && <Icon size={14} />}
            <b>
              {positive ? '+' : '−'}
              {Math.round(n.value * 10) / 10}
            </b>
          </span>
        );
      })}
    </div>
  );
}
