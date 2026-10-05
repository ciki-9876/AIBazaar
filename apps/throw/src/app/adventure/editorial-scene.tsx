'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MAPS, type MapId } from '../../lib/adventure/magician-world';
import { HERO_WORLD_HEIGHT, PIXEL_SCENES } from './pixel-scene-assets';
import {
  EditorialSceneRenderer,
  editorialSceneSize,
  type EditorialArtMode,
} from './editorial-scene-renderer';
import type { RendererStatus, SceneActors } from './pixel-scene-renderer';

export { HERO_WORLD_HEIGHT };

/** Presentation time animates the illustration; adventure movement and battle seeds remain deterministic. */
export function EditorialScene({
  mapId,
  playerX,
  facing,
  walking,
  tick,
  debugLighting = false,
  artMode = 'raster',
}: {
  mapId: MapId;
  playerX: number;
  facing: -1 | 1;
  walking: boolean;
  tick: number;
  debugLighting?: boolean;
  artMode?: EditorialArtMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actorsRef = useRef<SceneActors>({ playerX, facing, walking, tick });
  const debugRef = useRef(debugLighting);
  const [status, setStatus] = useState<RendererStatus>('loading');
  useLayoutEffect(() => {
    actorsRef.current = { playerX, facing, walking, tick };
    debugRef.current = debugLighting;
  }, [playerX, facing, walking, tick, debugLighting]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new EditorialSceneRenderer(canvas, mapId, artMode);
    let disposed = false,
      animation = 0,
      lastPaint = 0,
      reportedStatus: RendererStatus = 'loading';
    const repaint = (time: number) => {
      if (disposed) return;
      const interval = renderer.status === 'cpu' ? 80 : 1000 / 60;
      if (!document.hidden && time - lastPaint >= interval - 1) {
        renderer.render(actorsRef.current, time, debugRef.current);
        if (renderer.status !== reportedStatus) {
          reportedStatus = renderer.status;
          setStatus(reportedStatus);
        }
        lastPaint = time;
      }
      animation = requestAnimationFrame(repaint);
    };
    void renderer
      .load()
      .then((loaded) => {
        if (disposed) return;
        reportedStatus = loaded;
        setStatus(loaded);
        animation = requestAnimationFrame(repaint);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        console.error('Illustration scene failed to load', error);
        setStatus('error');
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      renderer.dispose();
    };
  }, [mapId, artMode]);
  const map = MAPS[mapId],
    size = editorialSceneSize(mapId);
  return (
    <div
      className="rg-editorial-scene"
      data-scene={mapId}
      data-art-medium={artMode}
      data-light-count={PIXEL_SCENES[mapId].lights.length}
      data-asset-count={
        PIXEL_SCENES[mapId].props.length +
        (PIXEL_SCENES[mapId].decor?.length ?? 0)
      }
      style={{
        position: 'absolute',
        inset: 0,
        width: map.width,
        height: map.height,
        pointerEvents: 'none',
      }}
    >
      <canvas
        key={`${mapId}-${artMode}`}
        ref={canvasRef}
        width={size.width}
        height={size.height}
        data-testid="editorial-scene"
        data-renderer={status}
        data-illustration-resolution={`${size.width}x${size.height}`}
        data-walk-frames="8"
        data-idle-frames="8"
        data-npc-frames="4"
        aria-label={`${map.name}，分层插画场景`}
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'auto',
          display: 'block',
        }}
      />
      {(status === 'loading' || status === 'error') && (
        <span
          className="rg-scene-loading"
          style={{ position: 'absolute', top: map.cameraY + 80, left: 60 }}
        >
          {status === 'error' ? '场景素材未载入，请刷新。' : '正在点亮街灯…'}
        </span>
      )}
    </div>
  );
}

export default EditorialScene;
