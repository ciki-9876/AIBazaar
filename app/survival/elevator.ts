import { panelText } from './panel-text';
import * as T from 'three';
import { Atelier, type V3 } from '../../packages/render-kit/atelier';
import { ELEVATOR } from '@/lib/survival-world';
import { LIFT, DEPARTURE } from '@/lib/survival-lift';
import type { SurvivalState } from '@/lib/survival-room';
import type { IndustrialPalette } from './art-direction';
import { liftAtmosphere } from './lift-atmosphere';

/** Full-height, human-scale passenger car. Same paints as the waterworks. */
export function buildServiceLift(
  kit: Atelier,
  palette: IndustrialPalette,
  opening = false,
) {
  const root = kit.group([ELEVATOR.x, 0, ELEVATOR.z]);
  root.userData.dynamic = true;
  // Known interior does not disappear into the outdoor fog texture.
  const p = Object.fromEntries(
    Object.entries(palette).map(([key, original]) => {
      const m = original.clone();
      m.onBeforeCompile = original.onBeforeCompile.bind(original);
      m.customProgramCacheKey = original.customProgramCacheKey.bind(original);
      m.userData.liftInterior = true;
      kit.materials.add(m);
      return [key, m];
    }),
  ) as IndustrialPalette;
  const { ink, ivory, edge, teal, gold, shadow, red } = p;
  const lamp = kit.mat('#98aa95', 0.8, 0, '#80957e');
  lamp.emissiveIntensity = 0.28;
  lamp.userData.liftInterior = true;
  // The diffuser itself emits visible light; the actual fixture lights the cabin.
  const diffuser = kit.basic('#0d1515');
  diffuser.toneMapped = false;
  diffuser.userData.liftInterior = true;
  const display = kit.basic('#142b29');
  display.userData.liftInterior = true;
  const box = (
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    at: V3,
    parent: T.Object3D = root,
    bevel = 0.006,
  ) => kit.box(w, h, d, mat, at, bevel, parent);

  // Finished floor surface is Y=0; dimensions are clear internal dimensions.
  box(1.26, 0.12, 1.56, ink, [0, -0.06, 0]);
  box(1.1, 0.018, 1.4, gold, [0, -0.009, 0]);
  box(1.05, 0.018, 1.35, shadow, [0, -0.005, 0]);
  for (let i = 0; i < 6; i++)
    box(1.015, 0.002, 0.003, ink, [0, 0.006, -0.55 + i * 0.22]);
  const walls = kit.group([0, 0, 0], root);
  const cutaway = kit.group([0, 0, 0], root);
  for (const r of LIFT.walls) {
    box(r.w, 0.32, r.d, teal, [r.x, 0.16, r.z], cutaway);
    box(r.w + 0.012, 0.025, r.d + 0.012, gold, [r.x, 0.332, r.z], cutaway);
  }
  for (const r of LIFT.walls)
    box(r.w, LIFT.height, r.d, teal, [r.x, LIFT.height / 2, r.z], walls);
  // The inside panels, lower protective band and slim corner profiles.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      box(
        0.008,
        1.24,
        0.44,
        ivory,
        [side * 0.546, 1.49, -0.46 + i * 0.46],
        walls,
      );
      box(
        0.009,
        0.71,
        0.44,
        shadow,
        [side * 0.545, 0.44, -0.46 + i * 0.46],
        walls,
      );
    }
    box(0.012, 0.028, 1.4, gold, [side * 0.539, 0.815, 0], walls);
    box(0.018, 0.072, 1.4, ink, [side * 0.536, 0.036, 0], walls);
    for (const z of [-0.67, 0.67])
      box(0.021, 2.13, 0.021, gold, [side * 0.537, 1.067, z], walls);
  }
  for (let i = 0; i < 3; i++) {
    box(0.347, 1.24, 0.008, ivory, [-0.36 + i * 0.36, 1.49, 0.696], walls);
    box(0.347, 0.71, 0.009, shadow, [-0.36 + i * 0.36, 0.44, 0.695], walls);
  }
  box(1.1, 0.028, 0.012, gold, [0, 0.815, 0.689], walls);
  box(1.1, 0.072, 0.018, ink, [0, 0.036, 0.686], walls);
  // A 34 mm diameter rear handrail at 900 mm. No oversized furniture.
  kit.beam([-0.43, 0.9, 0.635], [0.43, 0.9, 0.635], 0.017, gold, walls);
  for (const x of [-0.36, 0.36])
    kit.beam([x, 0.9, 0.635], [x, 0.9, 0.697], 0.013, ink, walls);
  for (let i = 0; i < 13; i++)
    box(
      0.032,
      0.004,
      0.007,
      ink,
      [-0.24 + (i % 7) * 0.08, 0.16 + Math.floor(i / 7) * 0.04, 0.688],
      walls,
    );
  // Complete ceiling, recessed luminaire and inspection hatch.
  const roof = kit.group([0, 0, 0], root);
  box(1.26, 0.08, 1.56, teal, [0, LIFT.height + 0.06, 0], roof);
  box(1.08, 0.016, 1.38, ivory, [0, LIFT.height + 0.008, 0], roof);
  box(0.65, 0.018, 0.46, ink, [0, LIFT.height - 0.004, -0.27], roof);
  box(0.6, 0.022, 0.4, diffuser, [0, LIFT.height - 0.015, -0.27], roof);
  for (let i = 0; i < 5; i++)
    box(
      0.58,
      0.002,
      0.002,
      edge,
      [0, LIFT.height - 0.027, -0.42 + i * 0.075],
      roof,
      0,
    );
  box(0.48, 0.006, 0.4, shadow, [0, LIFT.height - 0.005, 0.38], roof);
  box(0.455, 0.009, 0.375, ivory, [0, LIFT.height - 0.009, 0.38], roof);

  // Door pockets are outside the clear cabin. Opening remains exactly 900 mm.
  for (const side of [-1, 1]) {
    box(0.08, 2.08, 0.09, gold, [side * 0.49, 1.04, -0.704]);
    box(0.05, 2.03, 0.06, edge, [side * 0.478, 1.015, -0.648]);
    box(0.48, 2.07, 0.045, ink, [side * 0.69, 1.035, -0.8]);
  }
  box(1.06, 0.139, 0.13, ivory, [0, 2.0695, -0.71]);
  box(0.9, 0.025, 0.15, gold, [0, 0.008, -0.745]);
  for (const z of [-0.71, -0.75, -0.79])
    box(0.9, 0.003, 0.006, ink, [0, 0.022, z]);
  const doors = [-1, 1].map((side) => {
    const door = kit.group([side * 0.226, 0, -0.747], root);
    box(0.446, 1.98, 0.028, teal, [0, 1.007, 0], door);
    box(0.41, 1.35, 0.004, ivory, [0, 1.28, 0.018], door);
    box(0.41, 0.46, 0.005, shadow, [0, 0.303, 0.018], door);
    box(0.416, 0.018, 0.005, gold, [0, 0.582, 0.021], door);
    box(0.008, 1.97, 0.006, ink, [-side * 0.216, 1.01, 0.017], door);
    return door;
  });
  box(0.28, 0.083, 0.01, ink, [0, 2.067, -0.632]);
  const floorIndicator = panelText(kit, '01', 0.033, [0, 2.061, -0.621], root);
  // A real side-wall operating panel, button centres between 0.94 and 1.32 m.
  const panel = kit.group([0.527, 0, -0.32], walls);
  panel.rotation.y = -Math.PI / 2;
  box(0.22, 0.87, 0.021, gold, [0, 1.18, 0], panel);
  box(0.198, 0.846, 0.025, ink, [0, 1.18, 0.006], panel);
  box(0.165, 0.21, 0.028, display, [0, 1.45, 0.013], panel);
  const smallDisplay = panelText(kit, '01', 0.062, [0, 1.476, 0.032], panel);
  panelText(kit, 'F9', 0.022, [0, 1.407, 0.032], panel);
  for (let i = 0; i < 8; i++) {
    const x = (i % 2 ? 1 : -1) * 0.047,
      y = 1.26 - Math.floor(i / 2) * 0.094;
    kit.sphere(0.026, gold, [x, y, 0.03], [1, 1, 0.28], panel);
    kit.sphere(
      0.019,
      i === 6 ? red : i === 0 ? lamp : ivory,
      [x, y, 0.038],
      [1, 1, 0.22],
      panel,
    );
  }
  const plate = kit.label(
    '630 kg / 8',
    'F9  •  SERVICE 01',
    0.19,
    0.063,
    '#d8c8a2',
    [0, 0.827, 0.024],
    panel,
  );
  (plate.material as T.Material).userData.liftInterior = true;

  // Thin ink contours at arm's length, using the room's same line colour.
  const contour = kit.basic('#253c40');
  contour.side = T.BackSide;
  contour.userData.liftInterior = true;
  contour.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      'vec3 transformed = vec3(position) + normal * .0015;',
    );
  };
  const outlined: T.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof T.Mesh && o.material instanceof T.MeshToonMaterial)
      outlined.push(o);
  });
  for (const mesh of outlined) {
    const line = new T.Mesh(mesh.geometry, contour);
    line.position.copy(mesh.position);
    line.quaternion.copy(mesh.quaternion);
    line.scale.copy(mesh.scale);
    line.castShadow = false;
    mesh.parent!.add(line);
  }
  const light = new T.SpotLight('#e0d9b5', 1.1, 4, 1.35, 0.8, 2);
  light.position.set(0, LIFT.height - 0.05, -0.27);
  light.target.position.set(0, 0, -0.12);
  root.add(light, light.target);
  const ceilingSpill = new T.PointLight('#d9d2ad', 0, 3.2, 2);
  ceilingSpill.position.set(0, LIFT.height - 0.09, -0.27);
  root.add(ceilingSpill);
  const panelLight = new T.PointLight('#92bca5', 0.026, 1.3, 2);
  panelLight.position.set(0.42, 1.35, -0.3);
  root.add(panelLight);
  const atmosphere = liftAtmosphere(kit, root, walls, opening);
  let openness = 0;
  return {
    root,
    doorTarget: atmosphere.hit,
    terminalTarget: atmosphere.terminalTarget,
    holeTarget: atmosphere.holeTarget,
    present: atmosphere.present,
    update(
      s: SurvivalState,
      reduced: boolean,
      overhead = 0,
      dt = 1 / 60,
      hover = false,
      paused = false,
      guideEnabled = true,
    ) {
      const target =
        s.status === 'ready' || s.status === 'extracted'
          ? 0
          : s.status === 'departing'
            ? Math.min(1, s.departureTick / DEPARTURE.openTicks)
            : 1;
      openness =
        s.status === 'extracted' && !reduced
          ? T.MathUtils.lerp(openness, target, 1 - Math.exp(-3 * dt))
          : target;
      const eased = openness * openness * (3 - 2 * openness);
      doors.forEach((door, i) => {
        door.position.x = (i ? 1 : -1) * (0.226 + eased * 0.452);
      });
      // A cutaway in the distant battle camera; fully enclosed at human eye level.
      roof.visible = overhead < 0.12;
      walls.visible = overhead < 0.72;
      cutaway.visible = overhead >= 0.72;
      const powered = !opening || !!s.liftLightOn;
      light.intensity = powered ? (overhead < 0.72 ? 2.1 : 0.25) : 0;
      ceilingSpill.intensity = powered && overhead < 0.72 ? 0.65 : 0;
      diffuser.color.set(powered ? '#ece4be' : '#0d1515');
      lamp.emissiveIntensity = powered ? 0.32 : 0;
      contour.color.set(powered ? '#253c40' : '#080e11');
      panelLight.intensity = overhead < 0.72 ? 0.026 : 0;
      const floorText = String(s.floor || 1).padStart(2, '0');
      smallDisplay.set(floorText);
      floorIndicator.set(floorText);
      atmosphere.update(
        s,
        reduced,
        overhead,
        openness,
        dt,
        hover,
        paused,
        guideEnabled,
      );
    },
  };
}
