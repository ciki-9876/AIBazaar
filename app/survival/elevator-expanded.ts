import * as T from 'three';
import { Atelier, type V3 } from '../../packages/render-kit/atelier';
import { ELEVATOR } from '@/lib/survival-world';
import { LIFT } from '@/lib/survival-lift-expanded';
import type { SurvivalState } from '@/lib/survival-room';
import type { IndustrialPalette } from './art-direction';

/** A cutaway service lift built in the same painted kit as the waterworks. */
export function buildExpandedServiceLift(kit: Atelier, p: IndustrialPalette) {
  const root = kit.group([ELEVATOR.x, 0, ELEVATOR.z]);
  const { ink, ivory, edge, teal, red, gold, shadow } = p;
  const dark = kit.mat('#172b30'),
    linen = kit.mat('#dfd3b5');
  const blanket = kit.weather(kit.mat('#94433e'), 0.25, 3, true);
  const warm = kit.mat('#f2dca4', 0.85, 0, '#d69b43');
  warm.emissiveIntensity = 1.1;
  const screen = kit.mat('#85b8a4', 0.85, 0, '#427960');
  screen.emissiveIntensity = 0.8;
  const off = kit.mat('#58654e');
  const box = (
    w: number,
    h: number,
    d: number,
    m: T.Material,
    at: V3,
    bevel = 0.035,
    parent: T.Object3D = root,
  ) => kit.box(w, h, d, m, at, bevel, parent);
  const bolt = (at: V3, parent: T.Object3D = root) =>
    kit.sphere(0.048, gold, at, [1, 1, 0.55], parent);
  const strip = (at: V3, width: number, parent: T.Object3D = root) => {
    box(width + 0.18, 0.2, 0.2, ink, at, 0.04, parent);
    box(
      width,
      0.08,
      0.23,
      warm,
      [at[0], at[1] - 0.015, at[2] + 0.025],
      0.03,
      parent,
    );
  };

  // Steel deck: broad quiet panels, seams and a brass perimeter, not noisy PBR.
  box(
    LIFT.width + 0.35,
    0.24,
    LIFT.depth + 0.3,
    dark,
    [0, -0.08, LIFT.centerZ],
    0.1,
  );
  box(LIFT.width, 0.12, LIFT.depth, gold, [0, 0.06, LIFT.centerZ], 0.07);
  box(
    LIFT.width - 0.18,
    0.1,
    LIFT.depth - 0.18,
    ink,
    [0, 0.13, LIFT.centerZ],
    0.05,
  );
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 5; row++) {
      const x = (col - 1.5) * 1.56,
        z = -0.5 + (row - 1.5) * 1.24;
      box(
        1.52,
        0.045,
        1.2,
        (col + row) % 3 === 0 ? shadow : teal,
        [x, 0.21, z],
        0.012,
      );
      for (const dx of [-0.64, 0.64])
        for (const dz of [-0.47, 0.47])
          box(0.035, 0.012, 0.035, gold, [x + dx, 0.24, z + dz], 0);
    }
  box(2.25, 0.045, 3.95, gold, [0, 0.225, 0.7], 0.025);
  box(2.14, 0.035, 3.84, shadow, [0, 0.253, 0.7], 0.025);
  for (let i = 0; i < 15; i++)
    box(1.94, 0.012, 0.027, ink, [0, 0.278, -0.97 + i * 0.24], 0);
  const floorLabel = kit.label(
    'F9',
    'MOBILE SERVICE',
    0.85,
    0.34,
    '#b2b49a',
    [0, 0.283, 2.22],
    root,
  );
  floorLabel.rotation.x = -Math.PI / 2;
  // A roofless cabin and lowered near wall preserve the combat camera's view.
  for (const side of [-1, 1]) {
    box(0.3, 1.1, 6.45, teal, [side * 3.25, 0.66, 0.5], 0.04);
    box(0.36, 0.12, 6.5, edge, [side * 3.25, 1.24, 0.5], 0.03);
    for (const z of [-1.35, 0.2, 1.75, 3.2]) {
      box(0.13, 0.95, 1.35, ivory, [side * 3.06, 0.69, z], 0.04);
      for (const dz of [-0.5, 0.5]) bolt([side * 2.98, 1.02, z + dz]);
    }
    box(0.22, 2.25, 0.28, ink, [side * 3.23, 1.23, -1.73], 0.025);
    kit.pipe(
      [
        [side * 3, 1.55, -1.8],
        [side * 3, 1.55, 2.8],
        [side * 3, 0.5, 3.05],
      ],
      0.065,
      gold,
      root,
    );
  }
  box(6.8, 0.55, 0.3, teal, [0, 0.43, 3.6], 0.05);
  box(6.85, 0.11, 0.35, edge, [0, 0.75, 3.6], 0.035);
  for (const x of [-2.8, -1.4, 0, 1.4, 2.8])
    box(0.15, 0.7, 0.4, ink, [x, 0.44, 3.6]);

  // Chamfered, layered jambs read as a lift even at the wide gameplay distance.
  const profile: [number, number][] = [
    [-3.22, 0.16],
    [-3.22, 3.5],
    [-2.68, 4.02],
    [2.68, 4.02],
    [3.22, 3.5],
    [3.22, 0.16],
    [2.1, 0.16],
    [2.1, 2.92],
    [1.78, 3.29],
    [-1.78, 3.29],
    [-2.1, 2.92],
    [-2.1, 0.16],
  ];
  kit.extrude(profile, 0.72, ink, [0, 0, LIFT.doorZ - 0.38], 0.075, root);
  kit.extrude(
    profile.map(([x, y]) => [x * 0.965, y * 0.977] as [number, number]),
    0.13,
    ivory,
    [0, 0.04, LIFT.doorZ + 0.38],
    0.055,
    root,
  );
  box(4.9, 0.085, 0.22, edge, [0, 3.99, LIFT.doorZ + 0.47]);
  box(2.12, 0.59, 0.18, gold, [0, 3.67, LIFT.doorZ + 0.5], 0.065);
  kit.label(
    'F9',
    'SERVICE LIFT',
    1.94,
    0.48,
    '#e5c37e',
    [0, 3.67, LIFT.doorZ + 0.61],
    root,
  );
  for (const side of [-1, 1]) {
    box(0.12, 2.7, 0.17, ink, [side * 2.19, 1.7, LIFT.doorZ + 0.54]);
    box(0.047, 2.47, 0.185, warm, [side * 2.19, 1.71, LIFT.doorZ + 0.56], 0.01);
    for (const y of [0.46, 1.05, 2.82, 3.34])
      bolt([side * 2.79, y, LIFT.doorZ + 0.54]);
    box(0.64, 0.8, 0.15, teal, [side * 2.72, 1.4, LIFT.doorZ + 0.52]);
    for (let i = 0; i < 5; i++)
      box(
        0.46,
        0.028,
        0.03,
        ink,
        [side * 2.72, 1.16 + i * 0.105, LIFT.doorZ + 0.61],
        0,
      );
    // Exposed service pistons and cable guides, tucked outside the opening.
    kit.cyl(
      0.075,
      0.075,
      2.4,
      gold,
      [side * 3.05, 1.8, LIFT.doorZ - 0.37],
      12,
      root,
    );
    kit.cyl(
      0.12,
      0.12,
      0.72,
      teal,
      [side * 3.05, 0.86, LIFT.doorZ - 0.37],
      16,
      root,
    );
  }
  const doors: T.Group[] = [];
  for (const side of [-1, 1]) {
    // Recessed pockets contain the open leaves; the world shares their footprint.
    box(0.95, 3.28, 0.38, ink, [side * 3.56, 1.69, LIFT.doorZ - 0.22], 0.07);
    box(0.94, 0.13, 0.75, gold, [side * 3.56, 0.14, LIFT.doorZ], 0.025);
    box(0.09, 3.15, 0.44, teal, [side * 4, 1.67, LIFT.doorZ], 0.025);
    const door = kit.group([side * 2.94, 0.18, LIFT.doorZ], root);
    door.userData.dynamic = true;
    box(2, 2.98, 0.16, dark, [0, 1.49, 0], 0.045, door);
    box(1.89, 2.85, 0.11, teal, [0, 1.5, 0.115], 0.055, door);
    for (const x of [-0.63, -0.21, 0.21, 0.63])
      box(0.032, 2.6, 0.03, ink, [x, 1.5, 0.18], 0.008, door);
    box(1.72, 0.3, 0.04, ivory, [0, 0.55, 0.19], 0.012, door);
    box(0.08, 2.76, 0.065, gold, [-side * 0.91, 1.5, 0.2], 0.01, door);
    box(0.045, 0.7, 0.09, edge, [-side * 0.78, 1.4, 0.23], 0.01, door);
    doors.push(door);
  }
  // Dynamic leaves need the same ink outline as the compiled static environment.
  const outline = kit.basic('#121e27');
  outline.side = T.BackSide;
  outline.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      'vec3 transformed = vec3(position) + normal * .025;',
    );
  };
  for (const door of doors) {
    const meshes: T.Mesh[] = [];
    door.traverse((o) => {
      if (o instanceof T.Mesh) meshes.push(o);
    });
    for (const m of meshes) {
      const line = kit.mesh(
        m.geometry,
        outline,
        [m.position.x, m.position.y, m.position.z],
        door,
      );
      line.castShadow = false;
    }
  }
  box(4.2, 0.1, 0.76, dark, [0, 0.23, LIFT.doorZ + 0.15]);
  for (let x = -1.9; x <= 1.9; x += 0.35) {
    const stripe = box(
      0.18,
      0.017,
      0.53,
      gold,
      [x, 0.291, LIFT.doorZ + 0.16],
      0,
    );
    stripe.rotation.y = -0.45;
  }
  const progress = kit.group([0, 0.32, LIFT.doorZ + 0.59], root);
  progress.userData.dynamic = true;
  const lamps: T.Mesh[] = [];
  for (let i = 0; i < 12; i++)
    lamps.push(
      box(0.2, 0.028, 0.06, off, [-1.43 + i * 0.26, 0, 0], 0.007, progress),
    );

  // Left: freight shelves, physical safe, and a well-used maintenance bench.
  const cargo = LIFT.fixtures.find((f) => f.id === 'cargo')!;
  const rack = kit.group([cargo.x, 0.24, cargo.z], root);
  for (const x of [-0.56, 0.56])
    for (const z of [-0.4, 0.4])
      box(0.065, 1.65, 0.065, ink, [x, 0.84, z], 0.01, rack);
  for (const y of [0.05, 0.76, 1.55])
    box(1.23, 0.07, 0.92, teal, [0, y, 0], 0.02, rack);
  for (const x of [-0.32, 0.3]) {
    box(0.51, 0.47, 0.69, ivory, [x, 0.35, 0], 0.05, rack);
    box(0.09, 0.49, 0.71, gold, [x, 0.35, 0], 0.012, rack);
  }
  box(1.02, 0.58, 0.74, dark, [0, 1.08, 0], 0.055, rack);
  box(0.9, 0.48, 0.07, teal, [0, 1.08, 0.39], 0.05, rack);
  kit.ring(0.1, 0.021, gold, [0.22, 1.08, 0.447], rack);
  kit.label('01', 'SECURE', 0.29, 0.18, '#c7b080', [-0.19, 1.08, 0.438], rack);
  strip([cargo.x, 2.18, cargo.z + 0.06], 0.83);
  const work = LIFT.fixtures.find((f) => f.id === 'workbench')!;
  const bench = kit.group([work.x, 0.23, work.z], root);
  for (const z of [-0.86, 0.87]) {
    box(1.15, 0.89, 0.52, teal, [0, 0.47, z], 0.07, bench);
    for (const y of [0.24, 0.5, 0.75]) {
      box(0.035, 0.015, 0.38, ink, [0.591, y, z], 0, bench);
      box(0.075, 0.03, 0.15, gold, [0.63, y + 0.09, z], 0.01, bench);
    }
  }
  box(work.w, 0.11, work.d, ink, [0, 0.98, 0], 0.06, bench);
  box(work.w - 0.06, 0.065, work.d - 0.06, edge, [0, 1.06, 0], 0.055, bench);
  // Tool board faces inward, while the low silhouette keeps the player readable.
  box(0.065, 0.86, 1.93, teal, [-0.52, 1.57, 0], 0.02, bench);
  for (const z of [-0.62, -0.18, 0.26, 0.65]) {
    kit.beam([-0.47, 1.86, z], [-0.47, 1.36, z + 0.06], 0.029, gold, bench);
    kit.ring(0.066, 0.022, ink, [-0.44, 1.83, z], bench).rotation.y =
      Math.PI / 2;
  }
  box(0.63, 0.025, 0.63, dark, [0.05, 1.105, 0.27], 0.015, bench);
  box(0.32, 0.095, 0.36, red, [0.12, 1.155, 0.31], 0.03, bench);
  kit.cyl(0.1, 0.09, 0.2, ivory, [0.28, 1.23, -0.73], 18, bench);
  kit.ring(0.065, 0.015, gold, [0.4, 1.23, -0.73], bench).rotation.y =
    Math.PI / 2;
  const paper = box(0.37, 0.018, 0.43, linen, [0.16, 1.11, 0.88], 0.01, bench);
  paper.rotation.y = -0.14;
  for (const z of [0.79, 0.87, 0.95])
    box(0.25, 0.008, 0.012, shadow, [0.16, 1.125, z], 0, bench);
  kit.pipe(
    [
      [-0.42, 1.12, -0.75],
      [-0.42, 2.02, -0.75],
      [0.08, 2.07, -0.75],
    ],
    0.027,
    ink,
    bench,
  );
  kit.cyl(0.13, 0.24, 0.17, teal, [0.09, 1.99, -0.75], 24, bench);
  kit.cyl(0.18, 0.18, 0.025, warm, [0.09, 1.895, -0.75], 24, bench);

  // Right: a folded camp bed and water tins. Soft forms, still the same toon paint.
  const cot = LIFT.fixtures.find((f) => f.id === 'cot')!;
  const bed = kit.group([cot.x, 0.23, cot.z], root);
  for (const x of [-0.54, 0.54])
    for (const z of [-0.96, 0.96])
      box(0.07, 0.5, 0.07, ink, [x, 0.25, z], 0.018, bed);
  box(cot.w, 0.12, cot.d, ink, [0, 0.48, 0], 0.09, bed);
  box(cot.w - 0.12, 0.2, cot.d - 0.14, linen, [0, 0.64, 0], 0.09, bed);
  box(1.24, 0.12, 1.5, blanket, [0, 0.78, 0.27], 0.055, bed);
  box(0.94, 0.18, 0.43, edge, [0, 0.82, -0.77], 0.085, bed).rotation.y = 0.06;
  for (let i = 0; i < 5; i++)
    box(0.026, 0.018, 1.28, red, [-0.46 + i * 0.23, 0.85, 0.28], 0.008, bed);
  box(1.22, 0.028, 0.14, gold, [0, 0.85, 0.83], 0.016, bed);
  box(0.14, 0.45, 1.42, blanket, [-0.61, 0.57, 0.28], 0.04, bed);
  for (const z of [-0.63, 0.07]) {
    box(0.7, 0.28, 0.5, teal, [0.07, 0.2, z], 0.055, bed);
    box(0.12, 0.06, 0.19, gold, [0.07, 0.38, z], 0.018, bed);
  }

  // Angled dispatch terminal and exposed pressure controls alongside the door.
  const console = LIFT.fixtures.find((f) => f.id === 'console')!;
  const terminal = kit.group([console.x, 0.22, console.z], root);
  box(0.93, 1.17, 0.78, teal, [0, 0.61, 0], 0.1, terminal);
  box(0.77, 0.68, 0.04, ivory, [0, 0.64, 0.42], 0.025, terminal);
  for (let i = 0; i < 5; i++)
    box(
      0.47,
      0.028,
      0.033,
      shadow,
      [0, 0.44 + i * 0.08, 0.449],
      0.002,
      terminal,
    );
  const face = kit.group([0, 1.34, -0.02], terminal);
  face.rotation.x = -0.34;
  box(1.01, 0.7, 0.17, ink, [0, 0, 0], 0.08, face);
  box(0.77, 0.48, 0.05, screen, [-0.045, 0.025, 0.1], 0.03, face);
  kit.label(
    '01',
    'WATERWORKS',
    0.64,
    0.35,
    '#acd5b6',
    [-0.045, 0.025, 0.13],
    face,
  );
  for (const x of [-0.23, 0, 0.23])
    kit.sphere(
      0.05,
      x === 0.23 ? red : gold,
      [x, -0.255, 0.1],
      [1, 1, 0.45],
      face,
    );
  box(0.52, 0.66, 0.15, ink, [3.01, 2.15, -0.88], 0.06);
  const gauge = kit.cyl(
    0.21,
    0.21,
    0.065,
    edge,
    [3.01, 2.25, -0.775],
    32,
    root,
  );
  gauge.rotation.x = Math.PI / 2;
  kit.ring(0.205, 0.024, gold, [3.01, 2.25, -0.726], root);
  kit.beam([3.01, 2.25, -0.713], [3.11, 2.36, -0.713], 0.015, red, root);
  kit.pipe(
    [
      [3.05, 2.3, -1.9],
      [3.05, 2.78, -1.6],
      [3.05, 2.78, -0.4],
      [3.05, 1.3, -0.25],
    ],
    0.055,
    gold,
    root,
  );
  strip([0, 3.16, LIFT.doorZ + 0.7], 1.5);
  const light = new T.PointLight('#ffcf89', 15, 7, 2);
  light.position.set(0, 3.3, -0.65);
  root.add(light);
  const taskLight = new T.PointLight('#ffe0aa', 3, 2.6, 2);
  taskLight.position.set(work.x + 0.1, 2.1, work.z - 0.75);
  root.add(taskLight);

  let closure = 0;
  return {
    update(s: SurvivalState, reduced: boolean) {
      // Until extraction succeeds the passage stays fully open and vulnerable.
      const target = s.status === 'extracted' ? 1 : 0;
      closure =
        reduced || !target ? target : T.MathUtils.lerp(closure, target, 0.09);
      doors.forEach((door, i) => {
        door.position.x = (i ? 1 : -1) * (2.94 - closure * 1.93);
      });
      const filled =
        s.status === 'extracted' ? 12 : Math.floor((s.extraction / 66) * 12);
      lamps.forEach((lamp, i) => {
        lamp.material = i < filled ? warm : off;
      });
    },
  };
}
