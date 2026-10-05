import * as T from 'three';
import type { Atelier } from '../../packages/render-kit/atelier';
/** Shared camera-facing magnifier / elevator glyph; never exposes unexplored loot. */
export function pickupIcon(kit: Atelier, elevator = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#d1d7bb';
  ctx.lineWidth = 8;
  ctx.lineCap = 'square';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#c8c89488';
  if (elevator) {
    ctx.strokeRect(32, 35, 64, 65);
    ctx.beginPath();
    ctx.moveTo(64, 38);
    ctx.lineTo(64, 98);
    ctx.moveTo(37, 23);
    ctx.lineTo(46, 14);
    ctx.lineTo(55, 23);
    ctx.moveTo(73, 14);
    ctx.lineTo(82, 23);
    ctx.lineTo(91, 14);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(54, 51, 27, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(74, 72);
    ctx.lineTo(103, 101);
    ctx.stroke();
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  kit.textures.add(map);
  const material = new T.SpriteMaterial({
    map,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  material.userData.screenMarker = true;
  kit.materials.add(material);
  return () => {
    const s = new T.Sprite(material);
    s.scale.setScalar(elevator ? 1.5 : 0.826);
    return s;
  };
}
