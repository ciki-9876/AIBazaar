'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { CharacterId } from '../../lib/adventure/magician-world';
import {
  loadEditorialSceneManifest,
  editorialImageUrl,
  type EditorialArtMode,
} from './editorial-scene-renderer';
import type { PixelFrameRect } from './pixel-scene-assets';

const images = new Map<string, Promise<HTMLImageElement>>();
function spriteImage(file: string) {
  let result = images.get(file);
  if (!result) {
    const image = new Image();
    image.src = editorialImageUrl(file);
    result = image.decode().then(() => image);
    images.set(file, result);
  }
  return result;
}

/** Portraits and duel hosts share the world's illustrated animation and boot registration. */
export function CharacterSprite({
  character,
  frame,
  height = 154,
  facing = 1,
  className = '',
  artMode = 'raster',
}: {
  character: Exclude<CharacterId, 'narrator'>;
  frame?: number;
  height?: number;
  facing?: -1 | 1;
  className?: string;
  artMode?: EditorialArtMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    let animation = 0;
    let lastFrame = -1;
    void loadEditorialSceneManifest(artMode)
      .then(async (manifest) => {
        const hero = character === 'eli';
        const frames: PixelFrameRect[] = hero
          ? frame === undefined
            ? manifest.atlases.hero.idle
            : manifest.atlases.hero.walk
          : manifest.atlases.npcs[character];
        const image = await spriteImage(
          hero ? manifest.atlases.hero.file : manifest.atlases.npcs.file,
        );
        if (disposed) return;
        const context = canvasRef.current?.getContext('2d');
        if (!context) return;
        const maxHeight = Math.max(...frames.map((source) => source.height));
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        const paint = (time: number) => {
          if (disposed) return;
          const selected =
            frame === undefined
              ? Math.floor(time / 240) % frames.length
              : ((frame % frames.length) + frames.length) % frames.length;
          if (!document.hidden && lastFrame !== selected) {
            const source = frames[selected];
            const targetHeight = (source.height / maxHeight) * 192;
            const targetWidth = (source.width / maxHeight) * 192;
            const pivotX = source.pivotX ?? source.x + source.width / 2;
            const pivotY = source.pivotY ?? source.y + source.height;
            context.clearRect(0, 0, 144, 208);
            context.drawImage(
              image,
              source.x,
              source.y,
              source.width,
              source.height,
              72 - ((pivotX - source.x) / maxHeight) * 192,
              208 - ((pivotY - source.y) / maxHeight) * 192,
              targetWidth,
              targetHeight,
            );
            lastFrame = selected;
            if (canvasRef.current)
              canvasRef.current.dataset.frame = String(selected);
          }
          animation = requestAnimationFrame(paint);
        };
        animation = requestAnimationFrame(paint);
      })
      .catch((error: unknown) => {
        if (!disposed) console.error('Character art failed to load', error);
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
    };
  }, [character, frame, artMode]);

  const style: CSSProperties = {
    width: (height * 36) / 52,
    height,
    transform: `scaleX(${character === 'eli' ? facing : -facing})`,
  };
  return (
    <canvas
      ref={canvasRef}
      width={144}
      height={208}
      className={`rg-sprite ${className}`}
      style={style}
      aria-hidden="true"
      data-character={character}
      data-art-medium={character === 'eli' ? artMode : 'raster'}
    />
  );
}
