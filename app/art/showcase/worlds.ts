import * as T from 'three';
import { Atelier, rng, type V3 } from '../../../packages/render-kit/atelier';
import type { StudyId } from './catalog';
import { FloorReflection } from './water';

export type World = {
  kit: Atelier;
  background: string;
  fog: string;
  key: string;
  fill: string;
  exposure: number;
  light: V3;
  target: V3;
  distance: number;
  detail: V3;
  bloom: number;
  pulse: T.Group;
  water?: FloorReflection;
  update: (time: number) => void;
};

function glowDisc(k: Atelier, r: number, color: string, p: V3) {
  const m = k.basic(color, 0.6);
  const g = k.mesh(new T.RingGeometry(r - 0.035, r, 100), m, p);
  g.rotation.x = -Math.PI / 2;
  g.userData.dynamic = true;
  return g;
}
function pulseGroup(k: Atelier, color: string, p: V3) {
  const g = k.group(p);
  g.userData.dynamic = true;
  for (let i = 0; i < 3; i++) {
    const disc = glowDisc(k, 1, color, [0, 0.04 + i * 0.02, 0]);
    g.add(disc);
  }
  g.visible = false;
  return g;
}
function column(
  k: Atelier,
  x: number,
  z: number,
  h: number,
  stone: T.Material,
  light: T.Material,
  gold: T.Material,
  broken = false,
) {
  const g = k.group([x, 0, z]);
  k.box(1.7, 0.23, 1.7, stone, [0, 0.12, 0], 0.06, g);
  k.box(1.45, 0.15, 1.45, light, [0, 0.31, 0], 0.035, g);
  k.cyl(0.65, 0.75, 0.22, stone, [0, 0.49, 0], 32, g);
  k.cyl(0.59, 0.67, 0.14, gold, [0, 0.65, 0], 32, g);
  const points: T.Vector2[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    points.push(
      new T.Vector2(0.48 + Math.sin(t * Math.PI) * 0.045, t * (h - 0.9)),
    );
  }
  const geom = new T.LatheGeometry(points, 96);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getX(i), pos.getZ(i));
    const groove = 0.93 + 0.07 * Math.cos(a * 16);
    pos.setX(i, pos.getX(i) * groove);
    pos.setZ(i, pos.getZ(i) * groove);
    if (broken && pos.getY(i) > h - 1.1)
      pos.setY(i, pos.getY(i) + Math.sin(a * 3) * 0.13);
  }
  geom.computeVertexNormals();
  k.mesh(geom, light, [0, 0.74, 0], g);
  if (!broken) {
    k.cyl(0.7, 0.55, 0.23, stone, [0, h - 0.1, 0], 32, g);
    k.cyl(0.69, 0.69, 0.095, gold, [0, h + 0.06, 0], 32, g);
    k.box(1.5, 0.25, 1.5, light, [0, h + 0.23, 0], 0.06, g);
    k.box(1.7, 0.12, 1.7, stone, [0, h + 0.41, 0], 0.025, g);
  }
}
function figure(
  k: Atelier,
  p: V3,
  body: T.Material,
  metal: T.Material,
  cloth: T.Material,
) {
  const g = k.group(p);
  g.rotation.y = -0.45;
  k.box(0.16, 0.42, 0.22, metal, [-0.15, 0.22, 0], 0.05, g);
  k.box(0.16, 0.42, 0.22, metal, [0.15, 0.22, -0.05], 0.05, g);
  k.cyl(0.26, 0.2, 0.48, body, [0, 0.68, 0], 12, g);
  k.sphere(0.2, metal, [0, 1.05, 0], [0.85, 1, 1], g);
  k.box(0.31, 0.045, 0.14, k.basic('#111a24'), [0, 1.07, 0.16], 0.008, g);
  k.sphere(0.18, metal, [-0.31, 0.81, 0], [1, 0.7, 1], g);
  k.beam([-0.31, 0.77, 0], [-0.38, 0.43, 0.12], 0.085, body, g);
  k.sphere(0.18, metal, [0.31, 0.81, 0], [1, 0.7, 1], g);
  k.beam([0.31, 0.77, 0], [0.38, 0.46, 0.15], 0.085, body, g);
  const cape = k.extrude(
    [
      [-0.22, 0],
      [0.23, 0],
      [0.36, -0.73],
      [0.15, -0.88],
      [-0.05, -0.78],
      [-0.32, -0.89],
    ],
    0.035,
    cloth,
    [0, 0.91, -0.22],
    0.008,
    g,
  );
  cape.rotation.x = -0.15;
  k.extrude(
    [
      [-0.035, 0],
      [0.035, 0],
      [0.065, 0.8],
      [0, 1],
      [-0.065, 0.8],
    ],
    0.025,
    metal,
    [0.42, 0.31, 0.23],
    0.003,
    g,
  );
  k.box(0.29, 0.04, 0.05, metal, [0.42, 0.38, 0.24], 0.015, g);
  return g;
}
async function myth(): Promise<World> {
  const k = new Atelier(true),
    rand = rng(47);
  const stone = k.mat('#5a6665'),
    ivory = k.mat('#d2c5a2'),
    edge = k.mat('#eee0b5'),
    dark = k.mat('#253b40'),
    gold = k.mat('#ba8040'),
    red = k.mat('#a62e36'),
    moss = k.mat('#4a6960');
  [stone, ivory, edge].forEach((m) => k.weather(m, 0.32, 2.2, true));
  k.weather(gold, 0.2, 4, true);
  k.box(14, 0.8, 11, dark, [0, -0.52, 0], 0.22);
  k.box(13.8, 0.18, 10.8, stone, [0, -0.04, 0], 0.07);
  const floorMat = k.mat('#d6d2ba');
  floorMat.map = await k.texture(
    '/art-assets/showcase/painted-limestone.png',
    1.4,
  );
  floorMat.needsUpdate = true;
  const floor = k.mesh(new T.PlaneGeometry(13.4, 10.4), floorMat, [0, 0.06, 0]);
  floor.rotation.x = -Math.PI / 2;
  for (const z of [-5.05, 5.05]) {
    k.box(13.5, 0.18, 0.32, ivory, [0, 0.13, z]);
    k.box(13.6, 0.055, 0.07, gold, [0, 0.25, z - 0.12]);
    for (let x = -6.4; x < 6.5; x += 0.65) {
      k.box(0.3, 0.06, 0.2, dark, [x, 0.26, z], 0.005);
      k.box(0.08, 0.06, 0.27, gold, [x + 0.2, 0.26, z], 0.005);
    }
  }
  for (const x of [-6.7, 6.7]) {
    k.box(0.22, 0.18, 9.9, ivory, [x, 0.13, 0]);
    k.box(0.08, 0.05, 9.9, gold, [x, 0.25, 0]);
  }
  // A fractured ring of masonry frames the playable negative space.
  for (let x = -6.4; x < 6.5; x += 1.15) {
    const h = Math.abs(x) < 2 ? 0.32 : 0.58 + rand() * 0.25;
    k.box(1.1, h, 0.75, stone, [x, h / 2, -4.65], 0.08);
    if (Math.abs(x) > 2)
      k.box(1.15, 0.18, 0.84, ivory, [x, h + 0.04, -4.65], 0.07);
  }
  for (const x of [-5.1, 5.1]) {
    column(k, x, -3.55, 3.6, stone, ivory, gold);
    column(k, x, 2.25, x > 0 ? 1.65 : 2.5, stone, ivory, gold, true);
  }
  column(k, -2.0, -3.9, 4.6, stone, edge, gold);
  column(k, 2, -3.9, 4.6, stone, edge, gold);
  k.box(5.8, 0.33, 1.15, stone, [0, 4.8, -3.9]);
  k.box(6.15, 0.22, 1.4, ivory, [0, 5.05, -3.9]);
  k.box(5.7, 0.08, 1.46, gold, [0, 4.67, -3.9], 0.015);
  for (let i = -5; i <= 5; i++)
    k.box(0.18, 0.24, 0.2, edge, [i * 0.48, 4.53, -3.24], 0.01);
  const pediment = k.extrude(
    [
      [-3, 0],
      [3, 0],
      [0, 1.1],
    ],
    0.6,
    ivory,
    [0, 5.2, -4.2],
  );
  k.extrude(
    [
      [-2.55, 0.12],
      [2.55, 0.12],
      [0, 0.95],
    ],
    0.07,
    dark,
    [0, 5.2, -3.56],
  );
  pediment.castShadow = true;
  const eye = k.ring(0.32, 0.07, gold, [0, 5.56, -3.39]);
  eye.scale.y = 0.7;
  k.sphere(0.12, k.mat('#7cf5da', 0.3, 0.1, '#35b99c'), [0, 5.56, -3.29]);
  // Vertical portal and stepped threshold; the wall is genuinely modeled.
  k.box(3.2, 3.8, 0.38, dark, [0, 2.13, -4.35], 0.06);
  for (let i = 0; i < 3; i++)
    k.box(
      4.4 - i * 0.45,
      0.17,
      1.2,
      ivory,
      [0, 0.13 + i * 0.17, -3.9 + i * 0.24],
      0.035,
    );
  const portal = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader:
      'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){float n=noise(vec2(vUv.x*5.,vUv.y*3.-time*.25));float wisps=noise(vec2(vUv.x*19.+n*2.,vUv.y*2.-time*.7));float edge=smoothstep(.0,.12,vUv.x)*smoothstep(1.,.88,vUv.x);float glow=pow(wisps,3.)*.8+(1.-vUv.y)*.24;vec3 c=mix(vec3(.018,.12,.15),vec3(.12,.68,.47),n*.8)+vec3(.25,1.,.8)*glow;gl_FragColor=vec4(c*1.5,edge*.9);}`,
  });
  k.materials.add(portal);
  const veil = k.mesh(new T.PlaneGeometry(2.6, 3.2), portal, [0, 2.4, -4.1]);
  veil.userData.dynamic = true;
  for (let i = 0; i < 2; i++) {
    const x = i ? 1.23 : -1.23;
    const line = k.box(
      0.025,
      2.9,
      0.025,
      k.mat('#68d4b6', 0.8, 0, '#1f8473'),
      [x, 2.32, -4.02],
      0,
    );
    line.castShadow = false;
  }
  for (const x of [-3.3, 3.3]) {
    k.beam([x - 0.52, 4.1, -3.7], [x + 0.52, 4.1, -3.7], 0.045, gold);
    const banner = k.extrude(
      [
        [-0.43, 0],
        [0.43, 0],
        [0.42, -1.95],
        [0.16, -2.24],
        [0, -2.05],
        [-0.28, -2.22],
        [-0.43, -1.9],
      ],
      0.035,
      red,
      [x, 4.08, -3.68],
      0.006,
    );
    const emblem = k.extrude(
      [
        [0, 0.3],
        [0.23, 0],
        [0, -0.36],
        [-0.23, 0],
      ],
      0.045,
      gold,
      [x, 3.1, -3.58],
      0.005,
    );
    emblem.castShadow = false;
    banner.rotation.x = 0.025;
  }
  // Central seal: layered inlay and radial relief, not a flat sticker.
  k.cyl(1.9, 1.95, 0.16, dark, [0, 0.14, 0.1], 64);
  k.cyl(1.79, 1.79, 0.04, ivory, [0, 0.24, 0.1], 64);
  for (const r of [1.12, 1.62, 1.77]) {
    const t = k.ring(r, 0.025, gold, [0, 0.28, 0.1]);
    t.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const m = k.box(
      0.09,
      0.035,
      0.22,
      dark,
      [Math.sin(a) * 1.4, 0.28, 0.1 + Math.cos(a) * 1.4],
      0.003,
    );
    m.rotation.y = a;
  }
  const sigil = k.extrude(
    [
      [0, 1],
      [-0.46, 0.05],
      [0, 0.24],
      [0.46, 0.05],
    ],
    0.02,
    red,
    [0, 0.29, 0.1],
    0.001,
  );
  sigil.rotation.x = -Math.PI / 2;
  for (const x of [-3.5, 3.5]) {
    k.box(0.85, 0.23, 0.85, dark, [x, 0.15, -0.7]);
    k.cyl(0.19, 0.36, 0.7, gold, [x, 0.59, -0.7], 16);
    k.lathe(
      [
        [0, 0],
        [0.2, 0],
        [0.37, 0.17],
        [0.48, 0.29],
        [0.5, 0.35],
      ],
      gold,
      [x, 0.93, -0.7],
    );
    k.flame([x, 1.3, -0.7], '#ffad48');
  }
  // Broken column drums, individually chipped stones, and restrained vegetation.
  for (let i = 0; i < 34; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (5.8 + rand() * 0.7),
      z = -3.5 + rand() * 7.8;
    k.stone(
      0.18 + rand() * 0.25,
      i % 3 ? stone : ivory,
      [x, 0.16, z],
      [1.3, 0.55, 0.8],
      i + 1,
    );
  }
  const broken = k.cyl(0.48, 0.54, 1.4, ivory, [-4.5, 0.43, 3.7], 24);
  broken.rotation.z = 1.44;
  broken.rotation.y = 0.6;
  for (let i = 0; i < 14; i++) {
    const x = (i % 2 ? -1 : 1) * (5.5 + rand() * 0.8),
      z = -4 + rand() * 8;
    for (let j = 0; j < 4; j++) {
      const leaf = k.extrude(
        [
          [0, 0],
          [-0.07, 0.18],
          [0.025, 0.4],
          [0.06, 0.13],
        ],
        0.008,
        moss,
        [x + (rand() - 0.5) * 0.18, 0.1, z],
        0.001,
      );
      leaf.rotation.y = rand() * 6.28;
      leaf.rotation.z = (rand() - 0.5) * 1.1;
    }
  }
  figure(k, [1.8, 0.16, 2], dark, edge, red);
  k.particles(80, '#f5ba74', [11, 4, 8], [0, 0.2, 0], 0.17);
  const pulse = pulseGroup(k, '#85ffe1', [1.8, 0.15, 2]);
  k.compile();
  return {
    kit: k,
    background: '#13272b',
    fog: '#253c3d',
    key: '#fff0c8',
    fill: '#5ca8bc',
    exposure: 1.15,
    light: [-4, 11, 5],
    target: [0, 1.2, 0],
    distance: 18,
    detail: [0, 2.6, -2.8],
    bloom: 0.24,
    pulse,
    update: (t) => {
      portal.uniforms.time.value = t;
      k.animations.forEach((f) => f(t));
    },
  };
}

function flange(
  k: Atelier,
  p: V3,
  r: number,
  mat: T.Material,
  bolt: T.Material,
  axis: 'x' | 'y' | 'z' = 'y',
) {
  const g = k.group(p);
  if (axis === 'x') g.rotation.z = Math.PI / 2;
  if (axis === 'z') g.rotation.x = Math.PI / 2;
  k.cyl(r, r, 0.11, mat, [0, 0, 0], 40, g);
  k.cyl(r * 0.78, r * 0.78, 0.17, mat, [0, 0, 0], 40, g);
  for (let j = 0; j < 8; j++) {
    const a = (j * Math.PI) / 4;
    k.cyl(
      0.04,
      0.04,
      0.055,
      bolt,
      [Math.sin(a) * r * 0.84, 0.08, Math.cos(a) * r * 0.84],
      6,
      g,
    );
  }
  return g;
}
async function industrial(): Promise<World> {
  const k = new Atelier(),
    rand = rng(317);
  const [floor, wall, paint] = await Promise.all([
    k.surface('concrete_floor_worn_001', '#a4aca5', 3),
    k.surface('grey_plaster_02', '#89918a', 2),
    k.surface('blue_metal_plate', '#9badb0', 1, 0.55, 0.72),
  ]);
  const iron = k.mat('#22353d', 0.45, 0.78),
    steel = k.mat('#adb6af', 0.27, 0.8),
    rust = k.mat('#89553c', 0.88, 0.2),
    black = k.mat('#142329', 0.69, 0.25),
    yellow = k.mat('#d3ae57', 0.76),
    warm = k.mat('#ffe3a2', 0.35, 0.1, '#ffbc65'),
    cyan = k.mat('#a0ebed', 0.3, 0.1, '#4ec7d5');
  [iron, steel, paint, rust].forEach((m) => k.weather(m, 0.36, 3.5));
  k.weather(wall, 0.28, 1.3);
  k.weather(floor, 0.2, 1.5);
  k.box(14, 0.7, 11, black, [0, -0.45, 0], 0.15);
  k.box(13.8, 0.18, 10.8, floor, [0, -0.02, 0], 0.04);
  k.box(14, 4.8, 0.35, wall, [0, 2.27, -5.2], 0.035);
  k.box(0.35, 3.5, 10.6, wall, [-6.8, 1.62, 0], 0.035);
  k.box(14, 0.48, 0.12, black, [0, 0.24, -4.95], 0.015);
  k.box(0.12, 0.48, 10.4, black, [-6.56, 0.24, 0], 0.015);
  for (let x = -6; x <= 6; x += 3) {
    k.box(0.24, 4.7, 0.35, iron, [x, 2.2, -4.9], 0.025);
    k.box(0.48, 0.22, 0.48, rust, [x, 0.1, -4.83]);
  }
  k.box(14, 0.27, 0.42, iron, [0, 4.3, -4.85]);
  for (let x = -5.7; x < 6; x += 0.4) {
    k.box(0.11, 0.18, 0.19, rust, [x, 4.08, -4.66], 0.008);
  }
  // Back wall glazing, dense service conduits, stencilled wayfinding.
  k.box(4.1, 1.05, 0.1, black, [1.7, 3.45, -4.91]);
  k.box(
    3.9,
    0.86,
    0.04,
    k.mat('#c9f0e6', 0.4, 0, '#447c81'),
    [1.7, 3.45, -4.83],
  );
  for (let i = -2; i <= 2; i++)
    k.box(0.04, 1.02, 0.12, steel, [1.7 + i * 0.65, 3.45, -4.77], 0.002);
  k.box(4.03, 0.04, 0.12, steel, [1.7, 3.45, -4.77], 0.002);
  k.label(
    'P / 19',
    'CIRCULATION · LOWER SERVICE',
    2.0,
    0.72,
    '#ddc79b',
    [-4.4, 3.45, -4.93],
  );
  for (let i = 0; i < 3; i++)
    k.pipe(
      [
        [-6.2, 3.0 - i * 0.26, 4.5],
        [-6.2, 3.0 - i * 0.26, -3.6],
        [-5.6, 3.0 - i * 0.26, -4.55],
        [5.9, 3.0 - i * 0.26, -4.55],
      ],
      0.09 + i * 0.025,
      i % 2 ? rust : steel,
    );
  // Main pump: barrel sections, ribs, inspection hatch, flanges and support feet.
  const machine = k.group([-0.8, 0, -0.4]);
  machine.rotation.y = -0.15;
  k.box(4.9, 0.24, 2.75, iron, [0, 0.2, 0], 0.1, machine);
  for (const x of [-1.55, 1.55]) {
    k.box(0.43, 0.62, 2.2, paint, [x, 0.58, 0], 0.09, machine);
    for (const z of [-1, 1])
      k.cyl(0.085, 0.085, 0.06, steel, [x, 0.37, z], 6, machine);
  }
  const body = k.cyl(0.97, 0.97, 3.45, paint, [0, 1.7, 0], 64, machine);
  body.rotation.z = Math.PI / 2;
  for (let x = -1.5; x <= 1.5; x += 0.48) {
    const ring = k.ring(0.985, 0.045, iron, [x, 1.7, 0], machine);
    ring.rotation.y = Math.PI / 2;
  }
  for (const x of [-1.85, 1.85]) {
    const f = k.cyl(1.07, 1.07, 0.18, iron, [x, 1.7, 0], 64, machine);
    f.rotation.z = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const bolt = k.cyl(
        0.07,
        0.07,
        0.1,
        steel,
        [
          x + (x < 0 ? -0.12 : 0.12),
          1.7 + Math.sin(a) * 0.91,
          Math.cos(a) * 0.91,
        ],
        6,
        machine,
      );
      bolt.rotation.z = Math.PI / 2;
    }
  }
  const cap = k.cyl(0.85, 0.85, 0.22, steel, [2.04, 1.7, 0], 64, machine);
  cap.rotation.z = Math.PI / 2;
  const fan = k.group([2.18, 1.7, 0], machine);
  fan.rotation.z = Math.PI / 2;
  fan.userData.dynamic = true;
  k.cyl(0.66, 0.66, 0.05, black, [0, 0, 0], 48, fan);
  for (let i = 0; i < 9; i++) {
    const a = (i * Math.PI * 2) / 9;
    const b = k.box(
      0.09,
      0.07,
      0.61,
      steel,
      [Math.sin(a) * 0.31, 0.035, Math.cos(a) * 0.31],
      0.025,
      fan,
    );
    b.rotation.y = a + 0.4;
  }
  const motor = k.cyl(0.45, 0.45, 1.0, iron, [2.55, 1.7, 0], 40, machine);
  motor.rotation.z = Math.PI / 2;
  for (let i = 0; i < 15; i++) {
    const a = (i * Math.PI * 2) / 15;
    k.box(
      0.75,
      0.045,
      0.12,
      steel,
      [2.55, 1.7 + Math.sin(a) * 0.47, Math.cos(a) * 0.47],
      0.005,
      machine,
    ).rotation.x = -a;
  }
  k.animations.push((t) => (fan.rotation.y = t * 2.1));
  k.pipe(
    [
      [-2.6, 1.7, 0],
      [-3.3, 1.7, 0],
      [-3.9, 1.2, 0],
      [-3.9, 0.4, 0],
      [-3.9, 0.25, 3.7],
    ],
    0.28,
    rust,
    machine,
  );
  k.pipe(
    [
      [0.4, 2.55, 0],
      [0.4, 3.2, 0],
      [1, 3.55, 0],
      [4, 3.55, 0],
      [4, 2.9, 0],
      [4, 1.2, -2.9],
    ],
    0.22,
    paint,
    machine,
  );
  flange(k, [-4.65, 0.4, 2.3], 0.43, iron, steel, 'z');
  flange(k, [3.25, 2.6, -0.9], 0.35, iron, steel);
  // Pressure dial, needle, relief valve, red handwheel and actual pipe brackets.
  const gauge = k.group([-0.7, 2.78, 0.31]);
  k.cyl(0.16, 0.16, 0.16, steel, [0, -0.15, 0], 32, gauge);
  k.cyl(0.25, 0.25, 0.12, steel, [0, 0.12, 0], 40, gauge).rotation.x =
    Math.PI / 2;
  const dial = k.mesh(
    new T.CircleGeometry(0.22, 48),
    k.basic('#e8dfbd'),
    [0, 0.12, 0.067],
    gauge,
  );
  dial.castShadow = false;
  for (let i = 0; i < 11; i++) {
    const a = -2.35 + i * 0.47;
    const m = k.box(
      0.015,
      0.04,
      0.006,
      black,
      [Math.sin(a) * 0.18, 0.12 + Math.cos(a) * 0.18, 0.08],
      0,
      gauge,
    );
    m.rotation.z = -a;
  }
  k.box(
    0.014,
    0.19,
    0.009,
    k.mat('#c33e2f'),
    [0.043, 0.17, 0.09],
    0,
    gauge,
  ).rotation.z = -0.6;
  const valve = k.ring(
    0.37,
    0.045,
    k.mat('#b84131', 0.5, 0.3),
    [-4.4, 1.85, 1.1],
  );
  valve.rotation.x = -0.3;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    k.beam(
      [-4.4, 1.85, 1.1],
      [-4.4 + Math.cos(a) * 0.33, 1.85 + Math.sin(a) * 0.33, 1.1],
      0.025,
      steel,
    );
  }
  // Locker, wiring and worn service markings.
  k.box(1.6, 2.4, 0.7, paint, [4.5, 1.3, -3.9], 0.07);
  k.box(1.37, 2.12, 0.035, iron, [4.5, 1.3, -3.52], 0.015);
  k.box(0.55, 0.42, 0.05, black, [4.5, 1.89, -3.48], 0.025);
  for (let i = 0; i < 3; i++)
    k.sphere(
      0.044,
      i === 0 ? cyan : warm,
      [4.15 + i * 0.32, 1.3, -3.45],
      [1, 1, 0.4],
    );
  for (let i = 0; i < 7; i++)
    k.box(0.66, 0.036, 0.035, steel, [4.5, 0.55 + i * 0.072, -3.47], 0.005);
  k.label(
    'CAUTION',
    'AUTOMATIC RESTART',
    0.8,
    0.3,
    '#e2bc64',
    [4.5, 1.65, -3.47],
  );
  for (let i = 0; i < 3; i++)
    k.pipe(
      [
        [4.05 + i * 0.18, 2.5, -3.8],
        [4.05 + i * 0.18, 3, -3.8],
        [4.05 + i * 0.18, 3.2, -4.7],
      ],
      0.03,
      black,
    );
  for (const z of [2.7, -3.1]) {
    k.box(7.7, 0.07, 0.75, black, [-0.3, 0.105, z], 0.01);
    for (let x = -4; x < 3.5; x += 0.16)
      k.box(0.038, 0.07, 0.67, steel, [x, 0.14, z], 0.005);
  }
  for (let i = 0; i < 15; i++) {
    const mark = k.box(
      0.16,
      0.012,
      0.55,
      i % 2 ? black : yellow,
      [-4.1 + i * 0.52, 0.13, 1.5],
      0,
    );
    mark.rotation.y = 0.45;
  }
  for (let i = 0; i < 5; i++) {
    const x = 5.2 + (i % 2) * 0.7,
      z = 0.1 + Math.floor(i / 2) * 0.9;
    k.cyl(0.3, 0.3, 0.77, i % 2 ? rust : iron, [x, 0.42, z], 32);
    for (const y of [0.16, 0.68]) {
      const band = k.ring(0.31, 0.025, steel, [x, y, z]);
      band.rotation.x = Math.PI / 2;
    }
  }
  k.box(1.5, 0.6, 1.1, k.mat('#71644a', 0.88), [-4.9, 0.37, 3.4]);
  for (let i = 0; i < 5; i++)
    k.box(0.08, 0.64, 1.14, iron, [-5.5 + i * 0.3, 0.38, 3.4], 0.005);
  const water = new FloorReflection();
  k.root.add(water.group);
  for (let i = 0; i < 18; i++) {
    const z = -4 + rand() * 8,
      x = -6 + rand() * 12;
    k.stone(0.035 + rand() * 0.035, rust, [x, 0.14, z], [2, 0.3, 1], i);
  }
  for (const [x, z] of [
    [-5.6, -3.7],
    [4, -2.8],
  ]) {
    k.box(0.14, 0.12, 1.2, iron, [x, 3.4, z]);
    k.box(0.085, 0.055, 1.02, warm, [x, 3.32, z]);
    const lamp = new T.PointLight('#ffd5a1', 12, 7, 2);
    lamp.position.set(x, 3.1, z);
    k.root.add(lamp);
  }
  const light = new T.PointLight('#74d6e6', 15, 10, 2);
  light.position.set(2, 3.2, -3.6);
  k.root.add(light);
  figure(k, [3.7, 0.13, 2.7], k.mat('#c9a04c', 0.8), steel, k.mat('#36595f'));
  k.particles(90, '#bce1de', [12, 4, 8], [0, 0.15, 0], 0.08);
  const pulse = pulseGroup(k, '#9bfff0', [3.7, 0.15, 2.7]);
  k.compile();
  return {
    kit: k,
    background: '#091820',
    water,
    fog: '#20333a',
    key: '#b8d6e4',
    fill: '#627c81',
    exposure: 1.0,
    light: [-3, 9, 6],
    target: [0, 1.0, 0],
    distance: 18,
    detail: [-0.5, 1.7, 0],
    bloom: 0.24,
    pulse,
    update: (t) => k.animations.forEach((f) => f(t)),
  };
}

async function garden(): Promise<World> {
  const k = new Atelier(),
    rand = rng(146);
  const ceramic = k.physical({
    color: '#e6d8ae',
    roughness: 0.27,
    clearcoat: 0.75,
    clearcoatRoughness: 0.2,
  });
  const green = k.physical({
    color: '#39776b',
    roughness: 0.3,
    clearcoat: 0.75,
  });
  const coral = k.physical({
    color: '#cb7961',
    roughness: 0.46,
    clearcoat: 0.4,
  });
  const brass = k.mat('#b99452', 0.32, 0.68),
    white = k.mat('#efe5c6', 0.48),
    soil = k.mat('#5c6550', 0.98),
    leafMats = ['#406d52', '#65895e', '#7c9d67', '#b1b77b'].map((c) =>
      k.mat(c, 0.87),
    );
  const wood = await k.surface('wood_table_001', '#ccaa76', 1, 0.05, 0.7);
  [ceramic, green, coral].forEach((m) => k.weather(m, 0.07, 9));
  leafMats.forEach((m) => k.weather(m, 0.16, 4));
  k.box(13.8, 0.8, 10.4, ceramic, [0, -0.51, 0], 0.45);
  k.box(13.2, 0.15, 9.8, soil, [0, -0.04, 0], 0.18);
  k.box(13.3, 0.055, 9.9, brass, [0, -0.2, 0], 0.18);
  // Quiet path made of ceramic tiles, with small imperfect gaps.
  for (let x = -5.7; x <= 5.8; x += 0.77)
    for (let z = -4.1; z <= 4.2; z += 0.77) {
      if (Math.abs(x) < 2.25 || (z > 1.8 && x < 4.3)) {
        const m = k.box(
          0.715,
          0.1,
          0.715,
          Math.round(x * 10 + z * 10) % 3 ? ceramic : white,
          [x, 0.085, z],
          0.035,
        );
        m.rotation.y = (rand() - 0.5) * 0.025;
      }
    }
  // Octagonal greenhouse: separately modeled frame, walls, glazing and ribs.
  const house = k.group([0.5, 0.1, -1.35]);
  k.cyl(2.67, 2.78, 0.32, green, [0, 0.16, 0], 8, house);
  k.cyl(2.53, 2.53, 0.08, ceramic, [0, 0.37, 0], 8, house);
  const glass = k.physical({
    color: '#a6d6c2',
    roughness: 0.13,
    metalness: 0.06,
    transparent: true,
    opacity: 0.19,
    side: T.DoubleSide,
    depthWrite: false,
    clearcoat: 1,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      an = ((i + 1) * Math.PI) / 4;
    const x = Math.cos(a) * 2.42,
      z = Math.sin(a) * 2.42;
    k.beam([x, 0.35, z], [x, 2.75, z], 0.047, brass, house);
    k.beam(
      [x, 1.05, z],
      [Math.cos(an) * 2.42, 1.05, Math.sin(an) * 2.42],
      0.034,
      green,
      house,
    );
    k.beam(
      [x, 2.74, z],
      [Math.cos(an) * 2.42, 2.74, Math.sin(an) * 2.42],
      0.054,
      brass,
      house,
    );
    // Leave the front opening clear to see the plants through the actual glass.
    if (i !== 1 && i !== 2) {
      const verts = new Float32Array([
        x,
        0.38,
        z,
        Math.cos(an) * 2.42,
        0.38,
        Math.sin(an) * 2.42,
        Math.cos(an) * 2.42,
        2.7,
        Math.sin(an) * 2.42,
        x,
        0.38,
        z,
        Math.cos(an) * 2.42,
        2.7,
        Math.sin(an) * 2.42,
        x,
        2.7,
        z,
      ]);
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      k.mesh(geo, glass, [0, 0, 0], house);
    }
    k.pipe(
      [
        [x, 2.73, z],
        [x * 0.84, 3.28, z * 0.84],
        [x * 0.43, 3.84, z * 0.43],
        [0, 4.08, 0],
      ],
      0.038,
      brass,
      house,
    );
    const roofVerts = new Float32Array([
      x,
      2.73,
      z,
      Math.cos(an) * 2.42,
      2.73,
      Math.sin(an) * 2.42,
      0,
      4.08,
      0,
    ]);
    const roofGeo = new T.BufferGeometry();
    roofGeo.setAttribute('position', new T.BufferAttribute(roofVerts, 3));
    roofGeo.computeVertexNormals();
    k.mesh(roofGeo, glass, [0, 0, 0], house);
  }
  k.cyl(0.19, 0.32, 0.32, green, [0, 4.12, 0], 16, house);
  k.sphere(0.12, brass, [0, 4.36, 0], [1, 1.3, 1], house);
  for (const x of [-0.76, 0.76])
    k.beam([x, 0.4, 2.28], [x, 2.4, 2.28], 0.05, green, house);
  k.beam([-0.76, 2.4, 2.28], [0.76, 2.4, 2.28], 0.05, green, house);
  // Greenhouse bench and nursery pots.
  k.box(3.5, 0.1, 0.72, wood, [0, 1.15, -0.65], 0.03, house);
  for (const x of [-1.35, 1.35])
    k.box(0.1, 0.8, 0.5, brass, [x, 0.73, -0.65], 0.015, house);
  const plant = (p: V3, size: number, tint: T.Material) => {
    k.lathe(
      [
        [0, 0],
        [size * 0.32, 0],
        [size * 0.45, size * 0.5],
        [size * 0.48, size * 0.52],
        [size * 0.48, size * 0.61],
        [size * 0.41, size * 0.63],
      ],
      tint,
      p,
    );
    k.cyl(
      size * 0.4,
      size * 0.4,
      0.03,
      soil,
      [p[0], p[1] + size * 0.54, p[2]],
      32,
    );
    for (let j = 0; j < 7; j++) {
      const a = j * 2.4;
      const h = size * (0.8 + rand() * 0.45),
        r = size * (0.25 + rand() * 0.2);
      k.beam(
        [p[0], p[1] + size * 0.5, p[2]],
        [p[0] + Math.cos(a) * r, p[1] + h, p[2] + Math.sin(a) * r],
        size * 0.013,
        leafMats[0],
      );
      const leaf = k.sphere(
        size * 0.23,
        leafMats[j % 4],
        [p[0] + Math.cos(a) * r, p[1] + h, p[2] + Math.sin(a) * r],
        [0.52, 1.4, 0.26],
      );
      leaf.rotation.z = Math.cos(a) * 0.5;
      leaf.rotation.x = Math.sin(a) * 0.5;
    }
  };
  for (let i = 0; i < 5; i++)
    plant([-0.9 + i * 0.64, 1.28, -2.03], 0.39, i % 2 ? coral : ceramic);
  plant([1.65, 0.5, -0.68], 0.9, coral);
  plant([-0.9, 0.5, -2.4], 0.8, green);
  // Sculpted tree: tapering bent trunk, visible branch structure and clustered foliage.
  k.cyl(1.3, 1.18, 0.42, green, [-4.15, 0.26, -1.2], 48);
  k.cyl(1.17, 1.17, 0.06, soil, [-4.15, 0.49, -1.2], 48);
  k.pipe(
    [
      [-4.15, 0.45, -1.2],
      [-4.25, 1.25, -1.2],
      [-4.01, 2.22, -1.3],
      [-4.36, 3.15, -1.2],
    ],
    0.16,
    k.mat('#877558', 0.92),
  );
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4;
    const h = 2.05 + rand() * 1.3;
    const tip: V3 = [
      -4.15 + Math.cos(a) * (0.55 + rand() * 0.63),
      h + 0.5,
      -1.2 + Math.sin(a) * (0.5 + rand() * 0.6),
    ];
    k.beam([-4.15, h - 0.7, -1.2], tip, 0.054, wood);
    for (let j = 0; j < 3; j++)
      k.sphere(
        0.55 + rand() * 0.19,
        leafMats[(i + j) % 4],
        [
          tip[0] + (rand() - 0.5) * 0.45,
          tip[1] + rand() * 0.3,
          tip[2] + (rand() - 0.5) * 0.5,
        ],
        [1, 0.78, 1],
      );
  }
  // Potted flowers, benches, a brass watering can, copper tools and fallen leaves.
  const blossoms = [
    k.mat('#eab69b', 0.67),
    k.mat('#ead8a0', 0.67),
    k.mat('#adbecb', 0.67),
  ];
  for (let i = 0; i < 8; i++) {
    const x = 3.8 + (i % 2) * 0.95,
      z = -3.9 + Math.floor(i / 2) * 1.5;
    plant([x, 0.1, z], 0.65, i % 3 ? ceramic : coral);
    for (let j = 0; j < 4; j++) {
      const a = j * 1.57;
      const pp: V3 = [
        x + Math.cos(a) * 0.2,
        0.9 + rand() * 0.18,
        z + Math.sin(a) * 0.2,
      ];
      k.beam([x, 0.5, z], pp, 0.015, leafMats[0]);
      for (let n = 0; n < 5; n++) {
        const an = n * 1.256;
        k.sphere(
          0.067,
          blossoms[i % 3],
          [pp[0] + Math.cos(an) * 0.065, pp[1], pp[2] + Math.sin(an) * 0.065],
          [1, 0.6, 1],
        );
      }
      k.sphere(0.036, brass, [pp[0], pp[1] + 0.03, pp[2]]);
    }
  }
  k.box(3, 0.18, 0.72, wood, [-3.75, 0.8, 2.35], 0.05);
  for (const x of [-4.8, -2.7]) {
    k.box(0.13, 0.7, 0.63, green, [x, 0.42, 2.35]);
    k.beam([x, 0.82, 2.05], [x, 1.35, 1.95], 0.05, brass);
  }
  for (let i = 0; i < 3; i++)
    k.box(3, 0.14, 0.08, wood, [-3.75, 1.0 + i * 0.16, 1.96]);
  k.lathe(
    [
      [0, 0],
      [0.27, 0],
      [0.33, 0.1],
      [0.3, 0.54],
      [0.17, 0.65],
    ],
    brass,
    [2.1, 0.16, 2.3],
  );
  k.pipe(
    [
      [2.3, 0.32, 2.3],
      [2.72, 0.4, 2.3],
      [2.92, 0.73, 2.3],
    ],
    0.07,
    brass,
  );
  const handle = k.ring(0.3, 0.035, brass, [1.85, 0.55, 2.3]);
  handle.rotation.y = Math.PI / 2;
  plant([-5.1, 0.12, 3.7], 0.63, coral);
  plant([-4, 0.12, 3.8], 0.44, ceramic);
  for (let i = 0; i < 32; i++) {
    const x = -6 + rand() * 12,
      z = -4.3 + rand() * 8.6;
    if (Math.abs(x) < 1.8) continue;
    const leaf = k.sphere(
      0.055,
      leafMats[i % 4],
      [x, 0.15, z],
      [1.7, 0.12, 0.75],
    );
    leaf.rotation.y = rand() * 6.3;
  }
  // Rounded outdoor task light and a tiny coat hanging by the door.
  k.pipe(
    [
      [5.6, 0.12, 3.4],
      [5.6, 2.65, 3.4],
      [5.25, 3.05, 3.4],
      [4.65, 3.05, 3.4],
    ],
    0.05,
    green,
  );
  k.lathe(
    [
      [0.43, 0],
      [0.39, 0.12],
      [0.24, 0.32],
      [0.09, 0.36],
    ],
    green,
    [4.65, 2.67, 3.4],
  );
  k.sphere(
    0.14,
    k.mat('#ffe0a1', 0.4, 0, '#dab56e'),
    [4.65, 2.69, 3.4],
    [1, 0.6, 1],
  );
  figure(k, [-1.7, 0.14, 2.2], green, ceramic, coral);
  k.particles(60, '#f1dca7', [11, 3.5, 8], [0, 0.2, 0], 0.07);
  const pulse = pulseGroup(k, '#f4dba0', [-1.7, 0.15, 2.2]);
  k.compile();
  return {
    kit: k,
    background: '#233c38',
    fog: '#556859',
    key: '#fff0c4',
    fill: '#adc7b6',
    exposure: 1.12,
    light: [-4, 10, 6],
    target: [0, 1, 0],
    distance: 18,
    detail: [0.5, 1.8, -1],
    bloom: 0.12,
    pulse,
    update: (t) => k.animations.forEach((f) => f(t)),
  };
}
export async function buildWorld(id: StudyId) {
  return id === 'myth' ? myth() : id === 'industrial' ? industrial() : garden();
}
