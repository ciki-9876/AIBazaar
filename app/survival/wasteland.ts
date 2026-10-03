import * as T from 'three';
import { Atelier, rng } from '../../packages/render-kit/atelier';
import { industrialPalette } from './art-direction';
import { buildServiceLift } from './elevator';
import { ELEVATOR, type SurvivalState } from '@/lib/survival-room';
import { LIGHT_POINT, BOX_POINT } from '@/lib/survival-opening';

/** A sparse, painted clearing. The outside contains a door, never a cutaway car. */
export async function buildWasteland(kit: Atelier) {
  const p = industrialPalette(kit),
    random = rng(92620);
  const soil = kit.weather(kit.mat('#62695a'), 0.55, 0.6, true);
  kit.box(110, 0.2, 100, soil, [48, -0.13, 40], 0);
  const stones = ['#797c6b', '#656d65', '#949281', '#4c5b56'].map((c) =>
    kit.weather(kit.mat(c), 0.4, 1.8, true),
  );
  const grass = ['#626d53', '#7f8160', '#435947'].map((c) => kit.mat(c));
  const rockGeo = kit.geo(
    'opening-rock',
    () => new T.DodecahedronGeometry(1, 0),
  );
  // Invisible traversal bounds disappear inside the black fog.
  for (let i = 0; i < 290; i++) {
    const x = 22 + random() * 53,
      z = 31 + random() * 48;
    if (Math.abs(x - ELEVATOR.x) < 1.1 && z > 72) continue;
    if (
      [LIGHT_POINT, BOX_POINT].some((p) => Math.hypot(x - p.x, z - p.z) < 1.5)
    )
      continue;
    const scale = 0.07 + Math.pow(random(), 4) * 0.45;
    const rock = kit.mesh(rockGeo, stones[i % 4], [x, scale * 0.15, z]);
    rock.scale.set(scale * (1 + random()), scale * 0.45, scale);
    rock.rotation.set(random() * 0.7, random() * 6, random() * 0.5);
  }
  const blade = kit.geo('opening-grass', () => {
    const g = new T.BufferGeometry();
    g.setAttribute(
      'position',
      new T.Float32BufferAttribute(
        [-0.025, 0, 0, 0.025, 0, 0, 0.065, 0.52, 0.04],
        3,
      ),
    );
    g.computeVertexNormals();
    return g;
  });
  grass.forEach((m) => (m.side = T.DoubleSide));
  for (let i = 0; i < 130; i++) {
    const x = 25 + random() * 48,
      z = 34 + random() * 43;
    if (Math.abs(x - ELEVATOR.x) < 1 && z > 72) continue;
    const tuft = kit.group([x, 0.015, z]);
    for (let j = 0; j < 6; j++) {
      const stalk = kit.mesh(
        blade,
        grass[(i + j) % 3],
        [(random() - 0.5) * 0.25, 0, (random() - 0.5) * 0.25],
        tuft,
      );
      stalk.rotation.y = random() * Math.PI * 2;
      stalk.scale.setScalar(0.4 + random() * 0.9);
    }
  }
  return buildPortalLift(kit, p);
}
export function buildPortalLift(
  kit: Atelier,
  p: ReturnType<typeof industrialPalette>,
) {
  const lift = buildServiceLift(kit, p, true);
  const portal = kit.group([ELEVATOR.x, 0, ELEVATOR.z - 0.74]);
  portal.userData.dynamic = true;
  for (const side of [-1, 1]) {
    kit.box(0.14, 2.28, 0.2, p.ink, [side * 0.54, 1.14, 0], 0.025, portal);
    kit.box(0.035, 2.15, 0.24, p.gold, [side * 0.468, 1.075, 0], 0.01, portal);
  }
  kit.box(1.22, 0.18, 0.23, p.teal, [0, 2.21, 0], 0.025, portal);
  kit.box(1.2, 0.08, 0.42, p.gold, [0, 0.015, 0], 0.01, portal);
  const voidMat = kit.basic('#050d0e');
  kit.mesh(new T.PlaneGeometry(0.91, 2.08), voidMat, [0, 1.04, 0.025], portal);
  const rim = kit.basic('#86a998', 0.32);
  for (const side of [-1, 1])
    kit.box(0.008, 1.97, 0.012, rim, [side * 0.452, 1, -0.095], 0, portal);
  const ring = kit.ring(0.75, 0.012, rim, [0, 0.035, -0.5], portal);
  ring.rotation.x = -Math.PI / 2;
  portal.visible = false;
  kit.compile();
  return {
    ...lift,
    update(
      s: SurvivalState,
      reduced: boolean,
      overhead = 0,
      dt = 1 / 60,
      hover = false,
      paused = false,
      guide = true,
    ) {
      lift.update(s, reduced, overhead, dt, hover, paused, guide);
      const outside = overhead > 0.15;
      lift.root.visible = !outside;
      portal.visible = outside;
    },
  };
}
