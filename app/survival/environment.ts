import {
  MAINTENANCE_POINTS,
  MAINTENANCE_SEED,
} from '@/lib/survival-afterlight';
import * as T from 'three';
import { Atelier } from '../../packages/render-kit/atelier';
import { ELEVATOR, ROOM, type RoomWorld } from '@/lib/survival-world';
import { LIFT } from '@/lib/survival-lift';
import { industrialPalette } from './art-direction';
import { buildPortalLift } from './wasteland';
import { buildServiceLift } from './elevator';

// Shared art direction with the courtyard; the objects remain municipal machinery.
export async function buildWaterworks(
  kit: Atelier,
  world: RoomWorld,
  opening = false,
) {
  const palette = industrialPalette(kit);
  if (world.theme === 'maintenance') {
    palette.floor.color.set('#666c65');
    palette.ivory.color.set('#777c71');
    palette.edge.color.set('#919889');
    palette.teal.color.set('#394f4b');
    palette.gold.color.set('#8c7c53');
    palette.red.color.set('#613a39');
  }
  const { ink, ivory, edge, teal, red, gold, shadow, floor } = palette;
  const map = await kit.texture(
    '/art-assets/showcase/painted-limestone.png',
    1,
  );
  map.repeat.set(20, 17);
  floor.map = map;
  floor.needsUpdate = true;
  const ground = kit.mesh(
    new T.PlaneGeometry(ROOM.width + 70, ROOM.depth + 70),
    floor,
    [48, -0.03, 40],
  );
  ground.rotation.x = -Math.PI / 2;

  for (
    let x = world.theme === 'maintenance' ? 1000 : 0;
    x <= ROOM.width;
    x += 4
  )
    kit.box(0.035, 0.01, 80, shadow, [x, 0, 40], 0);
  for (
    let z = world.theme === 'maintenance' ? 1000 : 0;
    z <= ROOM.depth;
    z += 4
  )
    kit.box(96, 0.01, 0.035, shadow, [48, 0, z], 0);
  for (const m of world.modules) {
    // Service aisles, trench gratings, painted navigation marks and cable runs.
    kit.box(23.8, 0.012, 1.15, shadow, [m.x + 12, 0.01, m.z + 0.8], 0);
    for (let k = 0; k < 24; k++)
      kit.box(0.1, 0.03, 1.1, ink, [m.x + k, 0.03, m.z + 0.8], 0);
    for (let k = 0; k < 6; k++) {
      kit.box(0.13, 0.02, 1.3, gold, [m.x + 10.5, 0.02, m.z + 2 + k * 3], 0);
      kit.box(0.13, 0.02, 1.3, gold, [m.x + 13.5, 0.02, m.z + 2 + k * 3], 0);
    }
    for (const x of [m.x + 0.7, m.x + 23.3]) {
      const pipeEnd =
        Math.abs(x - ELEVATOR.x) < LIFT.width / 2
          ? Math.min(m.z + 17, ELEVATOR.z + LIFT.doorZ - 0.65)
          : m.z + 17;
      kit.pipe(
        [
          [x, 0.18, m.z + 2],
          [x, 0.18, pipeEnd],
        ],
        0.12,
        teal,
      );
      for (const z of [m.z + 3, m.z + 16].filter((z) => z < pipeEnd))
        kit.box(0.6, 0.35, 0.22, gold, [x, 0.16, z]);
    }
  }
  if (world.seed === MAINTENANCE_SEED) {
    const at = MAINTENANCE_POINTS.traces;
    // An already-looted box and two-part human shoe prints: narrative evidence only.
    kit.box(1.1, 0.58, 0.76, teal, [at.x - 1.8, 0.3, at.z]);
    kit.box(0.92, 0.1, 0.62, shadow, [at.x - 1.8, 0.61, at.z]);
    const lid = kit.box(1.12, 0.1, 0.8, gold, [at.x - 1.8, 0.98, at.z - 0.36]);
    lid.rotation.x = -1.1;
    for (let i = 0; i < 11; i++) {
      const foot = kit.group([
        at.x + (i % 2 ? 0.28 : -0.28),
        0.016,
        at.z - i * 0.62,
      ]);
      foot.rotation.y = 0.18;
      kit.box(0.15, 0.006, 0.25, shadow, [0, 0, -0.04], 0, foot);
      kit.box(0.13, 0.006, 0.1, shadow, [0, 0, 0.17], 0, foot);
    }
  }
  for (const o of world.obstacles) {
    if (
      o.type === 'lift-wall' ||
      o.type === 'lift-fixture' ||
      o.type === 'container'
    )
      continue;
    const g = kit.group([o.x, 0, o.z]);
    kit.box(o.w + 0.25, 0.2, o.d + 0.25, ink, [0, 0.08, 0], 0.04, g);
    if (o.type === 'low-wall') {
      kit.box(o.w, 0.8, o.d, ivory, [0, 0.4, 0], 0.015, g);
      kit.box(o.w + 0.07, 0.1, o.d + 0.07, edge, [0, 0.82, 0], 0.01, g);
      kit.box(o.w, 0.12, o.d + 0.015, teal, [0, 0.2, 0], 0, g);
      const count = Math.floor(Math.max(o.w, o.d) / 1.3);
      for (let n = 0; n < count; n++) {
        const alongX = o.w > o.d;
        kit.box(
          alongX ? 0.025 : o.w + 0.02,
          0.63,
          alongX ? o.d + 0.02 : 0.025,
          shadow,
          [
            alongX ? -o.w / 2 + (n + 1) * 1.3 : 0,
            0.43,
            alongX ? 0 : -o.d / 2 + (n + 1) * 1.3,
          ],
          0,
          g,
        );
      }
    } else if (o.type === 'tank') {
      kit.cyl(2.07, 2.12, 0.24, edge, [0, 0.25, 0], 32, g);
      kit.cyl(1.95, 1.96, 3, ivory, [0, 1.85, 0], 40, g);
      for (const y of [0.55, 2.6])
        kit.cyl(2.01, 2.01, 0.18, teal, [0, y, 0], 40, g);
      kit.sphere(1, edge, [0, 3.34, 0], [1.97, 0.42, 1.97], g);
      kit.cyl(0.65, 0.72, 0.22, ink, [0, 3.75, 0], 20, g);
      kit.cyl(0.52, 0.58, 0.15, gold, [0, 3.9, 0], 20, g);
      kit.pipe(
        [
          [1.7, 3, 0.2],
          [2.05, 3.15, 0.2],
          [2.12, 2.8, 0.2],
          [2.12, 0.65, 0.2],
          [1.75, 0.4, 0.2],
        ],
        0.16,
        teal,
        g,
      );
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        kit.sphere(
          0.065,
          gold,
          [Math.sin(a) * 2.02, 2.62, Math.cos(a) * 2.02],
          undefined,
          g,
        );
      }
      kit.box(0.62, 0.9, 0.06, red, [0, 1.7, 1.99], 0.04, g);
      for (let y = 0.5; y < 3.4; y += 0.4)
        kit.box(0.63, 0.075, 0.14, ink, [-0.8, y, 1.9], 0.01, g);
      for (const x of [-1.15, -0.45])
        kit.box(0.06, 3.2, 0.1, gold, [x, 1.9, 1.91], 0.01, g);
    } else if (o.type === 'pump') {
      kit.box(o.w - 0.35, 1.45, o.d - 0.25, teal, [0, 0.85, 0], 0.12, g);
      kit.box(o.w - 0.5, 0.15, o.d - 0.15, edge, [0, 1.65, 0], 0.05, g);
      for (const x of [-1.2, 1.2]) {
        const c = kit.cyl(0.61, 0.61, 1.05, ivory, [x, 2.16, 0], 24, g);
        c.rotation.z = Math.PI / 2;
        for (let i = 0; i < 5; i++) {
          const rib = kit.cyl(
            0.65,
            0.65,
            0.055,
            ink,
            [x - 0.45 + i * 0.22, 2.16, 0],
            24,
            g,
          );
          rib.rotation.z = Math.PI / 2;
        }
        kit.pipe(
          [
            [x, 1, 0.95],
            [x, 1.1, 1.35],
            [x, 0.3, 1.4],
          ],
          0.19,
          gold,
          g,
        );
        const valve = kit.ring(0.29, 0.045, red, [x, 1.25, 1.42], g);
        valve.rotation.x = Math.PI / 2;
        kit.beam([x - 0.26, 1.25, 1.42], [x + 0.26, 1.25, 1.42], 0.035, red, g);
      }
    } else if (o.type === 'shelf') {
      for (const x of [-o.w / 2 + 0.12, o.w / 2 - 0.12])
        for (const z of [-0.65, 0.65])
          kit.box(0.12, 2.8, 0.12, ink, [x, 1.4, z], 0.01, g);
      for (const y of [0.3, 1.4, 2.6]) {
        kit.box(o.w, 0.12, 1.55, teal, [0, y, 0], 0.02, g);
        for (const x of [-1.1, 0.2, 1.25]) {
          kit.box(
            0.7,
            0.65,
            0.8,
            x > 1 ? red : ivory,
            [x, y + 0.39, 0],
            0.05,
            g,
          );
          kit.box(0.16, 0.68, 0.82, gold, [x, y + 0.39, 0], 0.01, g);
        }
      }
    } else {
      kit.box(o.w, 2.6, o.d, ivory, [0, 1.3, 0], 0.05, g);
      kit.box(o.w + 0.12, 0.2, o.d + 0.12, edge, [0, 2.64, 0], 0.02, g);
      kit.box(o.w, 0.25, o.d + 0.05, teal, [0, 0.4, 0], 0.01, g);
      for (const x of [-1.7, 0, 1.7])
        kit.box(0.12, 2.15, o.d + 0.04, shadow, [x, 1.4, 0], 0.01, g);
    }
  }
  const lift = opening
    ? buildPortalLift(kit, palette)
    : buildServiceLift(kit, palette);
  for (const gate of world.gates) {
    kit.box(1.3, 0.07, 1, ink, [gate.x, 0.03, gate.z]);
    for (let i = 0; i < 6; i++)
      kit.box(
        0.09,
        0.04,
        0.85,
        teal,
        [gate.x - 0.5 + i * 0.2, 0.09, gate.z],
        0,
      );
  }
  kit.compile();
  return lift;
}
