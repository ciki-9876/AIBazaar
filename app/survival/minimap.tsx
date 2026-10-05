/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The map is a live canvas, not a static image. */
'use client';
import { useEffect, useRef } from 'react';
import {
  ROOM,
  ELEVATOR,
  isVisible,
  type SurvivalState,
} from '@/lib/survival-room';
import { walkMask } from '@/lib/survival-world';
import type { RaceState } from '@/lib/survival-race';
import type { SeasonState } from '@/lib/survival-season';

export default function Minimap({
  state,
  race,
  season,
}: {
  state: SurvivalState;
  race?: RaceState;
  season?: SeasonState;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const b = state.world.bounds,
    mask = state.world.seasonLayout ? walkMask(state.world) : null;
  const seasonCells =
    mask && b
      ? Array.from(mask).flatMap((value, i) =>
          value &&
          i % ROOM.width >= b.minX &&
          i % ROOM.width < b.maxX &&
          Math.floor(i / ROOM.width) >= b.minZ &&
          Math.floor(i / ROOM.width) < 74
            ? [i]
            : [],
        )
      : [];
  const explored = seasonCells.length
    ? Math.round(
        (100 * seasonCells.filter((i) => state.fog.explored[i]).length) /
          seasonCells.length,
      )
    : Math.round(
        (state.fog.explored.reduce((n, v) => n + v, 0) /
          state.fog.explored.length) *
          100,
      );
  useEffect(() => {
    const canvas = ref.current!,
      c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    const mask = walkMask(state.world),
      pixels = c.createImageData(ROOM.width, ROOM.depth);
    for (let i = 0; i < mask.length; i++) {
      const seen = state.fog.explored[i],
        visible = state.fog.visible[i];
      const color = !seen
        ? [10, 22, 27]
        : visible
          ? mask[i]
            ? [146, 165, 139]
            : [58, 91, 86]
          : mask[i]
            ? [62, 83, 78]
            : [29, 47, 48];
      pixels.data.set([...color, 255], i * 4);
    }
    // Pixel terrain is enlarged once; icons stay readable at any map scale.
    const terrain = document.createElement('canvas');
    terrain.width = ROOM.width;
    terrain.height = ROOM.depth;
    terrain.getContext('2d')!.putImageData(pixels, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.drawImage(terrain, 0, 0, canvas.width, canvas.height);
    c.save();
    c.scale(canvas.width / ROOM.width, canvas.height / ROOM.depth);
    c.strokeStyle = '#dbc385';
    c.lineWidth = 0.55;
    c.strokeRect(ELEVATOR.x - 1.3, ELEVATOR.z - 1.3, 2.6, 2.6);
    for (const cache of state.caches)
      if (
        !cache.opened &&
        cache.available <= state.tick &&
        isVisible(state, cache)
      ) {
        c.fillStyle = '#edc56e';
        c.fillRect(cache.x - 0.7, cache.z - 0.7, 1.4, 1.4);
      }
    for (const source of season
      ? season.sources
          .filter((q) => q.actor === 'player')
          .map((q) => ({ ...q, exhausted: q.taken }))
      : race?.sources || [])
      if (
        source.floor === state.floor &&
        !source.exhausted &&
        state.fog.explored[
          Math.floor(source.z) * ROOM.width + Math.floor(source.x)
        ]
      ) {
        c.fillStyle = '#e6c57d';
        c.strokeStyle = '#432f1c';
        c.fillRect(source.x - 1, source.z - 0.6, 2, 1.2);
        c.strokeRect(source.x - 1, source.z - 0.6, 2, 1.2);
      }
    for (const enemy of state.enemies)
      if (isVisible(state, enemy)) {
        c.fillStyle = enemy.kind === 'boss' ? '#f09cca' : '#fa776b';
        c.beginPath();
        c.arc(
          enemy.x,
          enemy.z,
          enemy.kind === 'boss' ? 1.5 : 0.8,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
    const p = state.player;
    c.strokeStyle = '#e8efd1';
    c.lineWidth = 0.8;
    c.beginPath();
    c.arc(p.x, p.z, 2, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#edffdc';
    c.beginPath();
    c.arc(p.x, p.z, 1, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }, [state, race, season]);
  return (
    <aside
      className="survival-minimap"
      aria-label={`探索地图，已探索 ${explored}%`}
    >
      <div>
        <span>
          {state.world.seasonLayout
            ? state.floor === 4
              ? '准备房间'
              : state.floor! % 10 === 0
                ? '共享据点'
                : '私人楼层'
            : state.world.theme === 'pavilion'
              ? '听雨庭'
              : state.world.theme === 'dunes'
                ? '风蚀遗庭'
                : state.world.theme === 'maintenance' || state.seed === 92621
                  ? '维保廊'
                  : state.seed === 92620
                    ? '荒原'
                    : '水处理站'}{' '}
          / 北 ↑
        </span>
        <b>{explored}%</b>
      </div>
      <canvas
        ref={ref}
        width={288}
        height={240}
        role="img"
        aria-label="小地图：浅色为当前视野，暗色为已探索区域；白色是你，金色方框是电梯，红点是视野内敌人。"
      />
      <footer>
        <span>□ 电梯</span>
        <span>◆ 物资</span>
        <span>● 敌人</span>
      </footer>
    </aside>
  );
}
