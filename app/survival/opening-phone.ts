import { UI_FONT } from './design-tokens';
import * as T from 'three';
import { Atelier } from '../../packages/render-kit/atelier';
import type { OpeningState } from '@/lib/survival-opening';

/** Actual camera-space phone and hand, lit independently of the dark cabin. */
export function openingPhone(kit: Atelier, camera: T.Camera) {
  const group = kit.group();
  camera.add(group);
  const body = kit.mat('#172629', 0.34, 0.55),
    skin = kit.mat('#aa8971', 0.94),
    cuff = kit.mat('#3a4846');
  for (const mat of [body, skin, cuff]) mat.userData.liftInterior = true;
  kit.box(0.082, 0.162, 0.013, body, [0, 0, 0], 0.006, group);
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 960;
  const c = canvas.getContext('2d')!;
  const bg = c.createLinearGradient(0, 0, 480, 960);
  bg.addColorStop(0, '#35494b');
  bg.addColorStop(1, '#101a20');
  c.fillStyle = bg;
  c.fillRect(0, 0, 480, 960);
  c.fillStyle = '#d1dbd6';
  c.font = `32px ${UI_FONT}`;
  c.fillText('无信号', 28, 58);
  c.fillText('84%', 377, 58);
  c.textAlign = 'center';
  c.font = `112px ${UI_FONT}`;
  c.fillText('03:17', 240, 257);
  c.font = `32px ${UI_FONT}`;
  c.fillStyle = '#a1b2ad';
  c.fillText('没有网络连接', 240, 320);
  c.strokeStyle = '#70847e';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(240, 492, 57, 0, Math.PI * 2);
  c.moveTo(202, 532);
  c.lineTo(278, 452);
  c.stroke();
  c.font = `16px ${UI_FONT}`;
  c.fillText('正在搜索信号…', 240, 605);
  c.fillStyle = '#9faea5';
  c.fillRect(185, 921, 110, 4);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  kit.textures.add(texture);
  const screen = new T.MeshBasicMaterial({ map: texture, toneMapped: false });
  screen.userData.liftInterior = true;
  kit.materials.add(screen);
  kit.mesh(new T.PlaneGeometry(0.073, 0.148), screen, [0, 0, 0.0075], group);
  kit.box(0.021, 0.004, 0.001, body, [0, 0.071, 0.008], 0.001, group);
  kit.box(0.063, 0.076, 0.038, skin, [0.038, -0.059, -0.014], 0.004, group);
  kit.box(0.06, 0.14, 0.049, cuff, [0.062, -0.142, -0.015], 0.012, group);
  const light = new T.PointLight('#afcbbb', 0.018, 0.4, 2);
  light.position.set(0, 0.08, 0.14);
  group.add(light);
  return {
    update(s: OpeningState, reduced: boolean) {
      group.visible = ['phone', 'put-away'].includes(s.stage);
      const progress =
        s.stage === 'phone'
          ? T.MathUtils.smoothstep(s.beat, 0, reduced ? 1 : 25)
          : 1 - T.MathUtils.smoothstep(s.beat, 0, reduced ? 1 : 27);
      group.position.set(0.065, -0.25 + progress * 0.19, -0.31);
      group.rotation.set(-0.04 + (1 - progress) * 0.3, -0.12, -0.05);
    },
  };
}
