'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { subscribeFrame } from '../stage/ticker';
import { QuestScroll } from './adventure-overlays';

export type LocationFunction = 'battle' | 'troupe' | 'shop' | 'workshop' | 'recruit' | 'travel';
export const LOCATION_FUNCTION_NAMES: Record<LocationFunction, string> = {
  battle: '对战剧场', troupe: '剧团根据地', shop: '商店', workshop: '道具改装', recruit: '招募', travel: '城际旅行',
};
/** Shared line weight and brass badge for the town's functional landmarks. */
export function LocationFunctionIcon({kind}: {kind: LocationFunction}) {
  return <svg viewBox="0 0 36 36" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2 32 10v16l-14 8L4 26V10Z" fill="#0b1e26" />
    {kind === 'battle' && <><path d="M10 11h12v8c0 8-12 8-12 0Z M22 14h5v8c0 5-4 7-8 5"/><path d="m13 15 2 1m3-1 2 1m-7 3q3 4 6 0M23 23q1-2 3-1"/></>}
    {kind === 'troupe' && <><path d="m9 17 9-8 9 8M11 16v12h14V16M15 28V18h6v10"/><path d="M22 12V9"/></>}
    {kind === 'shop' && <><path d="M10 14h16l2 13H8ZM14 14v-3a4 4 0 0 1 8 0v3"/><path d="M14 20h8m-4-3v8"/></>}
    {kind === 'workshop' && <><path d="m11 26 13-13m-7-3 3-3 7 7-3 3-7-7ZM9 24l3 3"/><path d="M9 10h4v4l-4 2v-6m15 12 3 5"/></>}
    {kind === 'recruit' && <><path d="m9 16 15-5v14L9 20ZM12 21l2 6h4l-2-5m11-6 3-2m-3 7 3 2"/></>}
    {kind === 'travel' && <><rect x="9" y="9" width="18" height="17" rx="3"/><path d="M9 19h18M18 10v8M12 26v2m12-2v2"/><circle cx="13" cy="23" r="1"/><circle cx="23" cy="23" r="1"/></>}
  </g></svg>;
}

export type RouteMarker = {id: string; spotId: string; x: number; title: string; side: boolean};
/** Use the rendered camera transform, so edge icons don't outrun its eased motion. */
export function EdgeRouteMarkers({markers, viewportRef, worldRef, worldWidth, onApproach}: {
  markers: readonly RouteMarker[];
  viewportRef: RefObject<HTMLDivElement | null>;
  worldRef: RefObject<HTMLDivElement | null>;
  worldWidth: number;
  onApproach: (id: string, x: number) => void;
}) {
  const live = useRef(markers);
  const [edges, setEdges] = useState<{marker: RouteMarker; direction: 'left'|'right'}[]>([]);
  const lastKey = useRef('');
  useLayoutEffect(() => {live.current = markers;}, [markers]);
  useLayoutEffect(() => {
    const update = () => {
      const view = viewportRef.current?.getBoundingClientRect();
      const world = worldRef.current?.getBoundingClientRect();
      if (!view || !world) return;
      const scale = world.width / worldWidth;
      const next = live.current.flatMap<{marker: RouteMarker; direction: 'left'|'right'}>((marker) => {
        const x = world.left + marker.x * scale - view.left;
        return x < 24 ? [{marker, direction: 'left' as const}] : x > view.width - 24 ? [{marker, direction: 'right' as const}] : [];
      });
      const key = next.map(({marker, direction}) => `${marker.id}:${marker.title}:${marker.x}:${direction}`).join('|');
      if (key !== lastKey.current) {lastKey.current = key; setEdges(next);}
    };
    update();
    return subscribeFrame(update);
  }, [viewportRef, worldRef, worldWidth]);
  return <div className="rg-edge-routes" aria-label="屏幕外任务方向">
    {(['left','right'] as const).map((direction) => <div key={direction} className={`rg-edge-group is-${direction}`}>
      {edges.filter((entry) => entry.direction === direction).map(({marker}) => <button key={marker.id}
        className={marker.side ? 'rg-edge-route is-side' : 'rg-edge-route'} title={marker.title}
        aria-label={`${marker.side ? '支线' : '主线'}在${direction === 'left' ? '左' : '右'}侧：${marker.title}`}
        onClick={() => onApproach(marker.spotId, marker.x)}>
        <span aria-hidden="true">{direction === 'left' ? '‹' : '›'}</span><QuestScroll />
      </button>)}
    </div>)}
  </div>;
}
