import { UI_FONT } from './design-tokens';
import * as T from 'three';
import type { Effect } from '@/lib/survival-room';

export function pickupText(e: Effect, reduced: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `32px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#0a1312';
  ctx.fillStyle = '#d8ddbc';
  const label = `+ ${e.label ?? '物品'} ×1`;
  ctx.strokeText(label, 256, 49);
  ctx.fillText(label, 256, 49);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const material = new T.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new T.Sprite(material),
    group = new T.Group();
  sprite.scale.set(7.2, 1.125, 1);
  sprite.renderOrder = 30;
  group.add(sprite);
  return {
    group,
    update(age: number) {
      group.visible = age < 72;
      material.opacity = Math.min(1, Math.max(0, (72 - age) / 22));
      sprite.position.set(
        e.to.x,
        2 + (e.stack ?? 0) * 0.72 + (reduced ? 0 : age * 0.011),
        e.to.z,
      );
    },
    dispose() {
      group.removeFromParent();
      texture.dispose();
      material.dispose();
    },
  };
}
