import * as T from 'three';
import { Atelier, rng } from '../../packages/render-kit/atelier';
import { industrialPalette } from './art-direction';
import { buildPortalLift } from './wasteland';
import type { RoomWorld } from '@/lib/survival-world';

export function buildDunes(kit: Atelier, world: RoomWorld) {
  const random = rng(world.seed),
    sand = kit.weather(kit.mat('#8e7961'), 0.35, 1.1, true),
    stone = kit.weather(kit.mat('#645c55'), 0.5, 2, true),
    rim = kit.mat('#b19d75'),
    dark = kit.mat('#332f36');
  const ground = kit.mesh(
    new T.PlaneGeometry(156, 140),
    sand,
    [48, -0.045, 40],
  );
  ground.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 65; i++) {
    const x = 8 + random() * 80,
      z = 3 + random() * 76;
    // Sand ribbons give the empty ground a large, directional rhythm.
    for (let n = 0; n < 4; n++) {
      const ribbon = kit.box(
        1 + random() * 4,
        0.014,
        0.025,
        rim,
        [x + n * 0.08, 0.012, z + n * 0.2],
        0,
      );
      ribbon.rotation.y = -0.35;
    }
  }
  for (const o of world.obstacles) {
    if (o.type === 'container') continue;
    const g = kit.group([o.x, 0, o.z]);
    if (o.type === 'low-wall') {
      kit.box(o.w, 0.75, o.d, stone, [0, 0.375, 0], 0.015, g);
      kit.box(o.w + 0.06, 0.09, o.d + 0.06, rim, [0, 0.77, 0], 0.015, g);
    } else {
      kit.box(o.w, 4.8, o.d, stone, [0, 2.4, 0], 0.02, g);
      for (const y of [0.2, 1.3, 3.8, 4.8])
        kit.box(o.w + 0.15, 0.12, o.d + 0.15, rim, [0, y, 0], 0.01, g);
      for (let j = 0; j < 5; j++)
        kit.box(
          0.08,
          2.4,
          0.04,
          dark,
          [-o.w / 2 + 0.2 + j * 0.34, 2.5, o.d / 2 + 0.02],
          0,
          g,
        );
    }
  }
  // Broken pylons and a distant monumental silhouette continue beyond traversal bounds.
  for (let i = 0; i < 14; i++) {
    const x = 15 + random() * 65,
      z = 7 + random() * 65;
    if (
      world.obstacles.some(
        (o) =>
          Math.abs(o.x - x) < o.w / 2 + 1 && Math.abs(o.z - z) < o.d / 2 + 1,
      )
    )
      continue;
    const shard = kit.mesh(new T.ConeGeometry(0.3, 0.22, 3), stone, [
      x,
      0.06,
      z,
    ]);
    shard.rotation.z = 0.8;
  }
  return buildPortalLift(kit, industrialPalette(kit));
}
