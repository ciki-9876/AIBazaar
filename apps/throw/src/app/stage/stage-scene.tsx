'use client';

import { useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { MAPS, type Hotspot, type MapId } from '../../lib/adventure/magician-world';
import { Rig, type RigId } from './rig';
import { SharedDefs } from './scene-kit';
import { StreetSet, TheatreSet, WorkshopSet, type ScenePart } from './sets';
import { BridgeportSet, CuriosSet, GooseSet, ThursdaySet } from './sets-bridgeport';
import { approach, subscribeFrame } from './ticker';

const SETS: Record<MapId, () => ScenePart[]> = {
  street: StreetSet,
  workshop: WorkshopSet,
  theatre: TheatreSet,
  bridgeport: BridgeportSet,
  goose: GooseSet,
  curios: CuriosSet,
  thursday: ThursdaySet,
};
export const VIEW_HEIGHT = 720;
/** Adults stand 154 world units tall in the walkable world: doors read at ~1.35×. */
export const FIGURE_SCALE = 0.8;

/**
 * Presentation layer for the walkable world. Rules advance the hero in 20 ms
 * steps; this layer eases the drawn hero and camera toward that position every
 * display frame, so movement stays smooth on any refresh rate.
 */
export function StageScene({
  mapId,
  playerX,
  facing,
  walking,
  viewport,
  worldRef,
  spotlight,
  hotspots,
}: {
  mapId: MapId;
  /** The people present right now; defaults to everyone on the map. */
  hotspots?: readonly Hotspot[];
  playerX: number;
  facing: -1 | 1;
  walking: boolean;
  viewport: { width: number; height: number };
  worldRef: RefObject<HTMLDivElement | null>;
  /** 0–1: how much of the limelight the hero has earned so far. */
  spotlight: number;
}) {
  const map = MAPS[mapId];
  const parts = useMemo(() => SETS[mapId](), [mapId]);
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<SVGGElement>(null);
  const poolRef = useRef<SVGEllipseElement>(null);
  const travel = useRef(0);
  const live = useRef({ playerX, viewport, mapId });
  useLayoutEffect(() => {
    live.current = { playerX, viewport, mapId };
  }, [playerX, viewport, mapId]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const layers = [...root.querySelectorAll<SVGSVGElement>('svg[data-depth]')]
      .map((node) => ({ node, depth: Number(node.dataset.depth) }))
      .filter((layer) => layer.depth !== 1);
    let shown = live.current.playerX;
    let camera = Number.NaN;
    const paint = (delta: number) => {
      const { playerX: target, viewport: view } = live.current;
      const previous = shown;
      shown = Math.abs(target - shown) > 260 ? target : approach(shown, target, delta, 0.03);
      travel.current += Math.abs(shown - previous) / FIGURE_SCALE;
      heroRef.current?.setAttribute('transform', `translate(${shown.toFixed(2)} ${map.floor})`);
      poolRef.current?.setAttribute('cx', shown.toFixed(1));

      const scale = Math.max(0.4, view.height / VIEW_HEIGHT);
      const visible = view.width / scale;
      const desired = Math.max(0, Math.min(map.width - visible, shown - visible * 0.42));
      camera = Number.isNaN(camera) ? desired : approach(camera, desired, delta, 0.11);
      const centre = Math.max(0, (visible - map.width) / 2);
      const offsetY = (view.height - VIEW_HEIGHT * scale) / 2;
      const world = worldRef.current;
      if (world)
        world.style.transform = `translate3d(${((centre - camera) * scale).toFixed(2)}px, ${(offsetY - map.cameraY * scale).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      // Parallax planes are separate composited layers: moving them never repaints vectors.
      for (const layer of layers)
        layer.node.style.transform = `translate3d(${(camera * (1 - layer.depth)).toFixed(2)}px, 0, 0)`;
    };
    paint(1);
    return subscribeFrame((_time, delta) => paint(delta));
  }, [map, worldRef]);

  const npcs = (hotspots ?? map.hotspots).filter((spot) => spot.kind === 'npc' && spot.character);
  const plane = (depth: number, children: ReactNode, key: string | number, className = 'st-plane') => (
    <svg
      key={key}
      className={className}
      data-depth={depth}
      width={map.width}
      height={map.height}
      viewBox={`0 0 ${map.width} ${map.height}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
  return (
    <div
      ref={rootRef}
      className="st-scene"
      data-scene={mapId}
      data-renderer="vector"
      role="img"
      aria-label={`${map.name}，${map.subtitle}`}
      style={{ width: map.width, height: map.height }}
    >
      {plane(1, <SharedDefs />, 'defs')}
      {parts.map((part, index) => plane(part.depth, part.node, index))}
      {plane(
        1,
        <>
          <ellipse
            ref={poolRef}
            className="st-pool"
            cx={playerX}
            cy={map.floor + 2}
            rx={92}
            ry={15}
            fill="url(#pool)"
            style={{ opacity: 0.35 + spotlight * 0.65 }}
          />
          {npcs.map((spot, index) => (
            <g key={spot.id} transform={`translate(${spot.x} ${map.floor})`}>
              <g className="st-turn" style={{ transform: `scaleX(${playerX < spot.x ? -1 : 1})` }}>
                <g transform={`scale(${FIGURE_SCALE})`}>
                  <Rig character={spot.character as RigId} phaseOffset={0.3 + index * 0.37} />
                </g>
              </g>
            </g>
          ))}
          <g ref={heroRef} transform={`translate(${playerX} ${map.floor})`} data-hero>
            <g className="st-turn" style={{ transform: `scaleX(${facing})` }}>
              <g transform={`scale(${FIGURE_SCALE})`}>
                <Rig character="eli" travel={travel} walking={walking} />
              </g>
            </g>
          </g>
        </>,
        'actors',
        'st-plane st-actors',
      )}
    </div>
  );
}
