'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MAPS, type MapId } from '../../lib/adventure/magician-world';
import {
  HERO_WORLD_HEIGHT,
  nativeSceneSize,
  PIXEL_SCENES,
} from './pixel-scene-assets';
import {
  PixelSceneRenderer,
  type RendererStatus,
  type SceneActors,
} from './pixel-scene-renderer';

export { HERO_WORLD_HEIGHT };

/** Visual time stays in this adapter; deterministic movement remains in the adventure rules. */
export function PixelScene({
  mapId,
  playerX,
  facing,
  walking,
  tick,
  debugLighting = false,
}: {
  mapId: MapId;
  playerX: number;
  facing: -1 | 1;
  walking: boolean;
  tick: number;
  debugLighting?: boolean;
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
    const renderer = new PixelSceneRenderer(canvas, mapId);
    let disposed = false,
      frame = 0,
      lastPaint = 0;
    const repaint = (time: number) => {
      if (disposed) return;
      const interval = canvas.dataset.renderer === 'cpu' ? 50 : 1000 / 60;
      if (!document.hidden && time - lastPaint >= interval - 1) {
        renderer.render(actorsRef.current, time, debugRef.current);
        lastPaint = time;
      }
      frame = requestAnimationFrame(repaint);
    };
    void renderer
      .load()
      .then((loaded) => {
        if (disposed) return;
        canvas.dataset.renderer = loaded;
        setStatus(loaded);
        frame = requestAnimationFrame(repaint);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        console.error('Pixel scene assets could not be loaded', error);
        setStatus('error');
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, [mapId]);
  const map = MAPS[mapId],
    size = nativeSceneSize(mapId);
  return (
    <div
      className="rg-pixel-scene"
      style={{
        position: 'absolute',
        inset: 0,
        width: map.width,
        height: map.height,
        pointerEvents: 'none',
      }}
      data-scene={mapId}
      data-light-count={PIXEL_SCENES[mapId].lights.length}
      data-asset-count={PIXEL_SCENES[mapId].props.length}
    >
      <canvas
        key={mapId}
        ref={canvasRef}
        width={size.width}
        height={size.height}
        data-testid="pixel-scene"
        data-renderer={status}
        data-native-resolution={`${size.width}x${size.height}`}
        data-walk-frames="8"
        data-idle-frames="8"
        data-npc-frames="4"
        aria-label={`${map.name}，分层像素场景`}
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
          display: 'block',
        }}
      />
      {status === 'loading' && (
        <span
          className="rg-scene-loading"
          style={{
            position: 'absolute',
            top: map.cameraY + 80,
            left: 60,
            color: '#d8bf98',
          }}
        >
          正在点亮街灯…
        </span>
      )}
      {status === 'error' && (
        <span
          className="rg-scene-loading"
          style={{
            position: 'absolute',
            top: map.cameraY + 80,
            left: 60,
            color: '#d8bf98',
          }}
        >
          场景素材未载入，请刷新。
        </span>
      )}
    </div>
  );
}

export default PixelScene;
