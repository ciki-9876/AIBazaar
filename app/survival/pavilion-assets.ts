import * as T from 'three';
import { Atelier, rng, type V3 } from '../../packages/render-kit/atelier';
import {
  GARDEN_MOODS,
  GARDEN_GATE,
  type GardenInstance,
  type GardenManifest,
  type PavilionMood,
} from '@/lib/survival-pavilion';

/** Reusable geometry + a small material/decor recipe. No separate model per colourway. */
export function createGardenAssets(kit: Atelier, mood: PavilionMood) {
  const c = GARDEN_MOODS[mood];
  const painted = (color: string, wear = 0.28) =>
    kit.weather(kit.mat(color), wear, 2.4, true);
  const p = {
    wood: painted(c.wood),
    dark: painted('#172526'),
    plaster: painted(c.plaster, 0.4),
    tile: painted(c.tile),
    roofRib: painted(
      '#' +
        new T.Color(c.tile).lerp(new T.Color(c.tileEdge), 0.36).getHexString(),
    ),
    edge: painted(c.tileEdge),
    stone: painted(c.stone, 0.4),
    trim: painted(mood === 'feast' ? '#b49154' : '#8b8262'),
    moss: painted(c.foliage),
    leaf: painted(c.leaf),
    bark: painted('#3b3430'),
    paper: kit.mat(c.paper, 0.82, 0, c.paper),
    cloth: painted(mood === 'relic' ? '#b5baa4' : '#763337'),
    water: kit.physical({
      color: mood === 'feast' ? '#253b3b' : '#163936',
      roughness: 0.6,
      metalness: 0.25,
      clearcoat: 0,
      envMapIntensity: 0.18,
    }),
    ripple: kit.basic(c.tileEdge, 0.22),
  };
  p.paper.emissiveIntensity = 0.6;
  const tileCurve = (x: number, z: number, w: number, d: number, h: number) => {
    const u = Math.abs(x) / (w / 2),
      v = Math.abs(z) / (d / 2);
    const slope = Math.min(1, Math.max(v, (u - 0.66) / 0.34));
    return h * (1 - slope) ** 2 + 0.12 + 0.26 * v ** 8 + 0.58 * u ** 8 * v ** 5;
  };
  function tube(points: V3[], radius: number, mat: T.Material, g: T.Group) {
    const curve = new T.CatmullRomCurve3(
      points.map((v) => new T.Vector3(...v)),
    );
    return kit.mesh(
      new T.TubeGeometry(
        curve,
        Math.max(8, points.length * 2),
        radius,
        5,
        false,
      ),
      mat,
      [0, 0, 0],
      g,
    );
  }
  function roof(g: T.Group, w: number, d: number, base: number, h: number) {
    const geo = kit.geo(`jiangnan-roof-${w}-${d}-${h}`, () => {
      const out = new T.BufferGeometry(),
        vertices = [],
        indices = [];
      const nx = 40,
        nz = 24;
      for (let j = 0; j <= nz; j++)
        for (let i = 0; i <= nx; i++) {
          const x = (i / nx - 0.5) * w,
            z = (j / nz - 0.5) * d;
          vertices.push(x, tileCurve(x, z, w, d, h), z);
        }
      for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
          const a = j * (nx + 1) + i;
          indices.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
        }
      out.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      out.setIndex(indices);
      out.computeVertexNormals();
      return out;
    });
    kit.mesh(geo, p.tile, [0, base, 0], g);
    // Tile barrels follow the roof surface, including the turned-up corners.
    const count = Math.round(w / 0.25);
    for (let i = 0; i <= count; i++) {
      const x = -w / 2 + (i * w) / count;
      for (const sign of [-1, 1]) {
        const points: V3[] = Array.from({ length: 10 }, (_, n) => {
          const z = (((sign * n) / 9) * d) / 2;
          return [x, base + tileCurve(x, z, w, d, h) + 0.035, z];
        });
        tube(points, 0.045, i % 4 ? p.roofRib : p.tile, g);
      }
    }
    for (const sign of [-1, 1]) {
      const points: V3[] = Array.from({ length: 17 }, (_, n) => {
        const x = (n / 16 - 0.5) * w,
          z = (sign * d) / 2;
        return [x, base + tileCurve(x, z, w, d, h) - 0.04, z];
      });
      tube(points, 0.105, p.dark, g);
      for (const sx of [-1, 1]) {
        tube(
          [
            [sx * w * 0.33, base + h + 0.15, 0],
            [sx * w * 0.39, base + h + 0.23, 0],
            [sx * w * 0.405, base + h + 0.65, 0],
          ],
          0.095,
          p.edge,
          g,
        );
        tube(
          [
            [sx * w * 0.44, base + 0.45, sign * d * 0.43],
            [sx * w * 0.5, base + 0.85, sign * d * 0.5],
            [sx * w * 0.53, base + 1.22, sign * d * 0.52],
          ],
          0.085,
          p.edge,
          g,
        );
      }
    }
    kit.box(w * 0.69, 0.2, 0.23, p.edge, [0, base + h + 0.19, 0], 0.015, g);
    kit.box(w * 0.69, 0.055, 0.28, p.trim, [0, base + h + 0.31, 0], 0.005, g);
  }
  function lattice(
    g: T.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
  ) {
    kit.box(w, h, 0.12, p.dark, [x, y, z], 0.01, g);
    kit.box(w - 0.14, h - 0.14, 0.04, p.plaster, [x, y, z + 0.072], 0, g);
    for (const sx of [-1, 1])
      kit.box(0.065, h, 0.12, p.wood, [x + (sx * w) / 2, y, z + 0.12], 0, g);
    for (const sy of [-1, 1])
      kit.box(w, 0.065, 0.12, p.wood, [x, y + (sy * h) / 2, z + 0.12], 0, g);
    for (let i = -0.5; i <= 0.5; i += 0.25)
      kit.box(0.045, h, 0.045, p.wood, [x + i * w, y, z + 0.13], 0, g);
    for (let j = -0.5; j <= 0.5; j += 0.25)
      kit.box(w, 0.045, 0.045, p.wood, [x, y + j * h, z + 0.13], 0, g);
    const points: V3[] = [
      [x, y + h * 0.33, z + 0.16],
      [x + w * 0.38, y, z + 0.16],
      [x, y - h * 0.33, z + 0.16],
      [x - w * 0.38, y, z + 0.16],
    ];
    points.forEach((a, i) =>
      kit.beam(a, points[(i + 1) % 4], 0.025, p.trim, g),
    );
  }
  function lantern(g: T.Group, x: number, y: number, z: number, scale = 1) {
    const l = kit.group([x, y, z], g);
    l.scale.setScalar(scale);
    kit.beam([0, 0.75, 0], [0, 1.1, 0], 0.02, p.dark, l);
    kit.cyl(0.32, 0.27, 0.78, p.paper, [0, 0.29, 0], 8, l);
    for (const yy of [-0.14, 0.74])
      kit.cyl(0.38, 0.38, 0.085, p.dark, [0, yy, 0], 8, l);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        x1 = Math.cos(a),
        z1 = Math.sin(a);
      kit.beam(
        [x1 * 0.28, -0.1, z1 * 0.28],
        [x1 * 0.32, 0.7, z1 * 0.32],
        0.014,
        p.trim,
        l,
      );
    }
    for (let j = -1; j <= 1; j++)
      kit.beam(
        [j * 0.04, -0.18, 0],
        [j * 0.08, -0.6, 0.025],
        0.018,
        p.cloth,
        l,
      );
    return l;
  }
  function banner(g: T.Group, x: number, y: number, z: number, h: number) {
    kit.box(0.8, 0.05, 0.06, p.dark, [x, y + h / 2, z], 0, g);
    const cloth = new T.PlaneGeometry(0.67, h, 4, 10),
      pos = cloth.attributes.position;
    for (let i = 0; i < pos.count; i++)
      pos.setZ(i, Math.sin(pos.getY(i) * 4) * 0.06);
    cloth.computeVertexNormals();
    const m = kit.mesh(cloth, p.cloth, [x, y, z], g);
    m.material.side = T.DoubleSide;
    for (let i = 0; i < 4; i++)
      kit.box(
        0.32,
        0.045,
        0.03,
        p.trim,
        [x, y + h * 0.28 - i * 0.17, z + 0.09],
        0,
        g,
      );
  }
  function building(a: GardenInstance, g: T.Group) {
    const { w, d } = a,
      hall = a.asset === 'hall',
      height = hall ? 4.1 : 3.3;
    kit.box(w, 0.55, d, p.stone, [0, 0.23, 0], 0.025, g);
    for (const yy of [0.1, 0.47])
      kit.box(w + 0.12, 0.08, d + 0.12, p.edge, [0, yy, 0], 0.01, g);
    kit.box(
      w - 0.8,
      height - 0.45,
      d - 0.9,
      p.plaster,
      [0, height / 2 + 0.22, -0.12],
      0.02,
      g,
    );
    kit.box(w - 0.65, 0.5, d - 0.72, p.dark, [0, 0.8, -0.12], 0.01, g);
    const bays = hall ? 5 : 3;
    for (let i = 0; i <= bays; i++) {
      const x = -w / 2 + 0.36 + (i * (w - 0.72)) / bays;
      for (const z of [-d / 2 + 0.3, d / 2 - 0.3]) {
        kit.cyl(0.19, 0.22, 0.33, p.stone, [x, 0.65, z], 8, g);
        kit.cyl(
          0.13,
          0.165,
          height - 0.64,
          p.wood,
          [x, (height + 0.64) / 2, z],
          10,
          g,
        );
        // Layered bracket arms are the shared silhouette detail of the kit.
        kit.box(0.7, 0.14, 0.42, p.wood, [x, height - 0.13, z], 0.015, g);
        kit.box(0.46, 0.16, 0.78, p.trim, [x, height + 0.02, z], 0.015, g);
        kit.box(0.92, 0.12, 0.48, p.wood, [x, height + 0.15, z], 0.015, g);
      }
      if (i < bays) {
        const xx = x + (w - 0.72) / bays / 2;
        lattice(g, xx, 2.3, d / 2 - 0.51, (w - 0.72) / bays - 0.35, 1.78);
        for (let n = -1; n <= 1; n++)
          kit.box(
            0.06,
            0.45,
            0.06,
            p.wood,
            [xx + n * 0.38, 1.12, d / 2 - 0.46],
            0,
            g,
          );
      }
    }
    for (const z of [-d / 2 + 0.27, d / 2 - 0.27]) {
      kit.box(w, 0.26, 0.29, p.wood, [0, height - 0.3, z], 0.01, g);
      kit.box(w, 0.065, 0.31, p.trim, [0, height - 0.18, z], 0.005, g);
    }
    roof(g, w + 1.75, d + 1.85, height + 0.12, hall ? 1.85 : 1.5);
    if (hall) {
      kit.box(w * 0.61, 0.83, d * 0.59, p.wood, [0, height + 2.04, 0], 0.01, g);
      roof(g, w * 0.74, d * 0.78, height + 2.4, 1.1);
      kit.box(
        2.5,
        0.8,
        0.14,
        p.dark,
        [0, height - 0.65, d / 2 + 0.02],
        0.02,
        g,
      );
      // The plaque lettering uses a separate texture, preserving proportions.
      const sign = kit.label(
        '听 雨',
        '',
        2.3,
        0.72,
        '#c1b089',
        [0, height - 0.65, d / 2 + 0.071],
        g,
      );
      sign.castShadow = false;
    }
    for (const x of [-w * 0.31, w * 0.31])
      lantern(g, x, height - 1, d / 2 + 0.42, 0.8);
    if (mood === 'feast')
      for (const x of [-w * 0.44, 0, w * 0.44])
        lantern(g, x, height - 1.2, d / 2 + 0.45, 0.7);
    if (mood !== 'rain')
      for (const x of [-w * 0.38, w * 0.38])
        banner(g, x, 1.85, d / 2 + 0.18, mood === 'relic' ? 2.2 : 1.65);
  }
  function wall(a: GardenInstance, g: T.Group) {
    const height = 3.7;
    if (a.asset === 'moon-gate') {
      const shape = new T.Shape();
      const { radius, centerY } = GARDEN_GATE;
      const angle = Math.asin(centerY / radius);
      shape.moveTo(-a.w / 2, 0);
      shape.lineTo(-Math.sqrt(radius * radius - centerY * centerY), 0);
      // Open the circular arch through the bottom edge; a tangent hole would
      // leave solid plaster at the player's feet despite a passable collider.
      shape.absarc(0, centerY, radius, Math.PI + angle, -angle, true);
      shape.lineTo(a.w / 2, 0);
      shape.lineTo(a.w / 2, height);
      shape.lineTo(-a.w / 2, height);
      shape.closePath();
      kit.mesh(
        new T.ExtrudeGeometry(shape, {
          depth: a.d,
          bevelEnabled: false,
          curveSegments: 32,
        }),
        p.plaster,
        [0, 0, -a.d / 2],
        g,
      );
      for (const z of [-a.d / 2 - 0.035, a.d / 2 + 0.035])
        kit.ring(radius + 0.03, 0.1, p.dark, [0, centerY, z], g);
      for (const x of [-a.w * 0.34, a.w * 0.34])
        lattice(g, x, 2, a.d / 2 + 0.015, 2.1, 1.5);
    } else kit.box(a.w, height, a.d, p.plaster, [0, height / 2, 0], 0.012, g);
    const split = a.asset === 'moon-gate' ? GARDEN_GATE.opening : 0;
    for (const s of [-1, 1]) {
      const w = (a.w - split) / 2;
      kit.box(
        w,
        0.28,
        a.d + 0.1,
        p.dark,
        [s * (split / 2 + w / 2), 0.14, 0],
        0.015,
        g,
      );
    }
    roof(g, a.w + 0.6, 1.25, height, 0.22);
    for (const x of [-a.w / 2, a.w / 2])
      kit.box(
        0.38,
        height + 0.25,
        a.d + 0.22,
        p.stone,
        [x, height / 2, 0],
        0.015,
        g,
      );
  }
  function tree(a: GardenInstance, g: T.Group) {
    const rand = rng(Math.round(a.x * 71 + a.z));
    const trunk: V3[] = [
      [0, 0, 0],
      [0.18, 1.6, 0],
      [-0.22, 2.9, 0.15],
      [0.1, 4.25, 0.2],
    ];
    tube(trunk, 0.18, p.bark, g);
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.399,
        y = 2.7 + rand() * 1.6,
        r = 1.3 + rand() * 1.5;
      const end: V3 = [Math.cos(angle) * r, y + 0.4, Math.sin(angle) * r];
      tube(
        [[0, y - 1, 0.1], [end[0] * 0.6, y, end[2] * 0.6], end],
        0.07,
        p.bark,
        g,
      );
      if (mood === 'relic' && i % 3) continue;
      for (let n = 0; n < 5; n++) {
        const leaf = kit.mesh(
          kit.geo('garden-leaf-cluster', () => new T.IcosahedronGeometry(1, 0)),
          n % 2 ? p.moss : p.leaf,
          [
            end[0] + (rand() - 0.5) * 1.7,
            end[1] + rand() * 0.4,
            end[2] + (rand() - 0.5) * 1.4,
          ],
          g,
        );
        leaf.scale.set(
          0.65 + rand() * 0.9,
          0.18 + rand() * 0.22,
          0.6 + rand() * 0.6,
        );
        leaf.rotation.y = rand() * 6;
      }
    }
  }
  function bamboo(a: GardenInstance, g: T.Group) {
    const rand = rng(Math.round(a.x * 131 + a.z));
    for (let i = 0; i < 9; i++) {
      const x = (rand() - 0.5) * 0.85,
        z = (rand() - 0.5) * 0.85,
        h = 2.2 + rand() * 2.5;
      kit.beam([x, 0, z], [x + 0.15, h, z + 0.22], 0.038, p.moss, g);
      for (let yy = 0.4; yy < h; yy += 0.45)
        kit.cyl(
          0.053,
          0.053,
          0.045,
          p.leaf,
          [x + (yy / h) * 0.15, yy, z + (yy / h) * 0.22],
          6,
          g,
        );
      for (let n = 0; n < 5; n++) {
        const angle = rand() * 6.28,
          y = h * (0.45 + rand() * 0.53),
          len = 0.6 + rand() * 0.6;
        const end: V3 = [
          x + Math.cos(angle) * len,
          y + 0.15,
          z + Math.sin(angle) * len,
        ];
        kit.beam([x, y, z], end, 0.012, p.moss, g);
        for (let j = 0; j < 4; j++) {
          const leaf = kit.mesh(
            kit.geo('bamboo-leaf', () => new T.ConeGeometry(0.075, 0.5, 3)),
            p.leaf,
            [
              end[0] - Math.cos(angle) * j * 0.13,
              y + 0.1,
              end[2] - Math.sin(angle) * j * 0.13,
            ],
            g,
          );
          leaf.rotation.set(0.7, angle + j, 1.2);
        }
      }
    }
  }
  function pond(a: GardenInstance, g: T.Group) {
    kit.box(a.w, 0.22, a.d, p.dark, [0, 0.07, 0], 0.04, g);
    const water = kit.mesh(
      new T.PlaneGeometry(a.w - 0.42, a.d - 0.42, 20, 24),
      p.water,
      [0, 0.2, 0],
      g,
    );
    water.rotation.x = -Math.PI / 2;
    const wavePositions = water.geometry.attributes.position;
    for (let i = 0; i < wavePositions.count; i++)
      wavePositions.setZ(i, Math.sin(i * 7.21) * 0.013);
    water.geometry.computeVertexNormals();
    for (const sign of [-1, 1]) {
      kit.box(
        a.w,
        0.33,
        0.27,
        p.stone,
        [0, 0.17, sign * (a.d / 2 - 0.135)],
        0.03,
        g,
      );
      kit.box(
        0.27,
        0.33,
        a.d,
        p.stone,
        [sign * (a.w / 2 - 0.135), 0.17, 0],
        0.03,
        g,
      );
    }
    const rand = rng(883);
    for (let i = 0; i < 32; i++) {
      const x = (rand() - 0.5) * (a.w - 1),
        z = (rand() - 0.5) * (a.d - 1);
      const pad = kit.mesh(
        new T.CircleGeometry(0.25 + rand() * 0.3, 9, 0.1, 5.7),
        i % 3 ? p.moss : p.leaf,
        [x, 0.235 + i * 0.0001, z],
        g,
      );
      pad.rotation.x = -Math.PI / 2;
      if (!(i % 7)) {
        kit.beam([x, 0.22, z], [x, 0.75, z], 0.016, p.moss, g);
        for (let j = 0; j < 5; j++) {
          const petal = kit.mesh(
            new T.OctahedronGeometry(0.14),
            p.plaster,
            [
              x + Math.cos(j * 1.26) * 0.095,
              0.76,
              z + Math.sin(j * 1.26) * 0.095,
            ],
            g,
          );
          petal.scale.set(0.65, 1.5, 0.65);
        }
      }
      if (!(i % 4)) {
        const ring = kit.ring(
          0.3 + rand() * 0.3,
          0.006,
          p.ripple,
          [x + 0.7, 0.25, z - 0.5],
          g,
        );
        ring.rotation.x = -Math.PI / 2;
        ring.userData.dynamic = true;
        kit.animations.push((t) => {
          const size = 0.4 + ((t * 0.33 + i * 0.113) % 1);
          ring.scale.setScalar(size);
        });
      }
    }
  }
  function place(a: GardenInstance) {
    const g = kit.group([a.x, 0, a.z]);
    g.name = a.id;
    g.rotation.y = (a.turn * Math.PI) / 2;
    if (a.asset === 'hall' || a.asset === 'pavilion') building(a, g);
    else if (a.asset === 'moon-gate' || a.asset === 'wall') wall(a, g);
    else if (a.asset === 'tree') tree(a, g);
    else if (a.asset === 'bamboo') bamboo(a, g);
    else if (a.asset === 'pond') pond(a, g);
    else {
      kit.box(0.5, 0.2, 0.5, p.stone, [0, 0.1, 0], 0.025, g);
      kit.cyl(0.075, 0.12, 2.8, p.wood, [0, 1.5, 0], 8, g);
      kit.beam([0, 2.9, 0], [0.62, 2.9, 0], 0.055, p.wood, g);
      lantern(g, 0.54, 1.87, 0, 0.8);
      const light = new T.PointLight(c.lamp, mood === 'feast' ? 8 : 5, 6, 2);
      light.position.set(0.54, 2.2, 0);
      g.add(light);
    }
    return g;
  }
  return { place, palette: p, roof, lantern };
}

export function buildGarden(kit: Atelier, manifest: GardenManifest) {
  const assets = createGardenAssets(kit, manifest.mood),
    p = assets.palette,
    rand = rng(manifest.seed);
  const wetStone = kit.weather(
    kit.mat(GARDEN_MOODS[manifest.mood].stone, 0.34, 0.1),
    0.42,
    0.55,
    true,
  );
  const original = wetStone.onBeforeCompile.bind(wetStone);
  wetStone.onBeforeCompile = (shader, renderer) => {
    original(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec2 tileP=vSurfacePosition.xz/vec2(1.55,.88);
      tileP.x+=mod(floor(tileP.y),2.)*.5;
      vec2 pavingEdge=min(fract(tileP),1.-fract(tileP));
      float mortar=1.-smoothstep(.015,.04,min(pavingEdge.x,pavingEdge.y));
      float stoneNoise=surfaceHash(vec3(floor(tileP),2.));
      diffuseColor.rgb*=mix(.56+stoneNoise*.21,.23,mortar);
      vec2 gardenDistance=abs(vSurfacePosition.xz-vec2(47.5,52.));
      float wild=smoothstep(18.,24.,max(gardenDistance.x,gardenDistance.y));
      float moss=surfaceNoise(vSurfacePosition*.18);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.035,.066,.055)*(moss*.6+.5),wild);
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,1.,wild);',
    );
  };
  wetStone.customProgramCacheKey = () => 'garden-paving-v1';
  const ground = kit.mesh(
    new T.PlaneGeometry(500, 500),
    wetStone,
    [48, -0.02, 40],
  );
  ground.rotation.x = -Math.PI / 2;
  // A pale processional path and the circular court establish a readable combat floor.
  for (let j = 0; j < 31; j++)
    for (let i = 0; i < 3; i++) {
      const x = 46.75 + i * 1.7,
        z = 43 + j * 1.04;
      kit.box(
        1.62,
        0.045,
        0.98,
        j % 9 === 3 ? p.edge : p.stone,
        [x, 0.011, z],
        0.012,
      );
    }
  const disk = kit.cyl(5.1, 5.1, 0.026, p.stone, [48.5, 0.018, 54], 80);
  disk.receiveShadow = true;
  for (const r of [4.7, 4.9, 2.7, 2.82]) {
    const ring = kit.ring(r, 0.025, p.dark, [48.5, 0.039, 54]);
    ring.rotation.x = -Math.PI / 2;
  }
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    const line = kit.box(
      0.026,
      0.012,
      1.7,
      p.dark,
      [48.5 + Math.sin(angle) * 3.8, 0.04, 54 + Math.cos(angle) * 3.8],
      0,
    );
    line.rotation.y = angle;
  }
  for (const a of manifest.instances) assets.place(a);
  // Continuation is visible past the walking bounds; darkness obscures the eventual plane edge.
  for (const [x, z, w, turn] of [
    [17, 42, 10, 1],
    [80, 51, 12, 0],
    [45, 22, 18, 0],
  ] as const)
    assets.place({
      id: `distant-${x}`,
      asset: 'pavilion',
      x,
      z,
      w,
      d: 7,
      turn,
    });
  // Sparse fallen petals, moss seams and gravel break up repetition at ground scale.
  for (let i = 0; i < 180; i++) {
    const x = 25 + rand() * 47,
      z = 31 + rand() * 44;
    if (x > 45 && x < 52) continue;
    const petal = kit.mesh(
      kit.geo('fallen-leaf', () => new T.CircleGeometry(0.09, 3)),
      i % 7 === 0 ? p.trim : p.moss,
      [x, 0.037, z],
    );
    petal.rotation.set(-Math.PI / 2, 0, rand() * 6);
  }
  for (let i = 0; i < 30; i++) {
    const x = 25.5 + rand() * 3,
      z = 30 + rand() * 44;
    const rock = kit.mesh(
      kit.geo('garden-rock', () => new T.IcosahedronGeometry(0.35, 0)),
      p.stone,
      [x, 0.11, z],
    );
    rock.scale.set(1.4, 0.5 + rand(), 0.8);
    rock.rotation.set(0.3, rand() * 6, 0.3);
  }
  return assets;
}
