import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createSurfaceLibrary, surfaceUV, contactTexture } from './materials';
import { boardCamera } from '@/lib/battle-slice-visual';

export type ChamberView = 'entry' | 'cabinet' | 'table' | 'exit';
export type ChamberState = {
  view: ChamberView;
  opened: boolean;
  taken: boolean;
  cleared: boolean;
  neutral?: boolean;
  arena?: boolean;
  study?: 'springbow' | 'rubber';
};
export type RoomPoint = { id: string; x: number; y: number };

// Original, seeded surface painting: broad wear survives the low-resolution pass.
function surface(kind: 'wall' | 'wood' | 'floor') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  let seed = 41;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  c.fillStyle =
    kind === 'wall' ? '#81715a' : kind === 'wood' ? '#58402b' : '#48453a';
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const v = rand();
    c.fillStyle =
      v > 0.5
        ? `rgba(222,195,141,${rand() * 0.13})`
        : `rgba(12,10,7,${rand() * 0.19})`;
    const x = rand() * 256,
      y = rand() * 256;
    c.fillRect(
      x,
      y,
      kind === 'wood' ? rand() * 70 : rand() * 9,
      kind === 'wood' ? 1 : rand() * 12,
    );
  }
  if (kind === 'wood') {
    for (let y = 0; y < 256; y += 32) {
      c.fillStyle = '#1b160ed0';
      c.fillRect(0, y, 256, 2);
      c.fillStyle = '#b28d5540';
      c.fillRect(0, y + 2, 256, 1);
    }
  } else {
    for (let i = 0; i < 24; i++) {
      c.fillStyle = '#1b251f28';
      c.fillRect(
        rand() * 256,
        rand() * 256,
        2 + rand() * 20,
        40 + rand() * 120,
      );
    }
  }
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.magFilter = T.NearestFilter;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(kind === 'wall' ? 3 : 2, kind === 'wall' ? 1 : 2);
  return tex;
}

export function createChamber(scene: T.Scene, tactile = true, anisotropy = 4) {
  const group = new T.Group();
  scene.add(group);
  const textures: T.Texture[] = [];
  const material = (color: string, metalness = 0) =>
    new T.MeshStandardMaterial({ color, metalness, roughness: 0.91 });
  const surfaces = tactile ? createSurfaceLibrary(anisotropy) : null;
  const wall = surfaces?.plaster ?? material('#ada087'),
    wood = surfaces?.wood ?? material('#d9b586'),
    floor = surfaces?.floor ?? material('#a39880');
  if (!surfaces)
    [wall, wood, floor].forEach((m, i) => {
      const tex = surface((['wall', 'wood', 'floor'] as const)[i]);
      textures.push(tex);
      m.map = tex;
    });
  const iron = material('#282e29', 0.55),
    brass = material('#99805a', 0.65),
    paper = material('#bca67a');
  const black = material('#10130f'),
    green = surfaces?.paint ?? material('#35453b');
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: T.Material,
    parent: T.Object3D = group,
  ) {
    const g =
      tactile && Math.min(w, h, d) > 0.07
        ? new RoundedBoxGeometry(
            w,
            h,
            d,
            2,
            Math.min(0.035, Math.min(w, h, d) * 0.16),
          )
        : new T.BoxGeometry(w, h, d);
    if (tactile && m.userData.tileSize)
      surfaceUV(g, m.userData.tileSize, m === wood);
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function tube(
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    m: T.Material,
  ) {
    const o = new T.Mesh(new T.CylinderGeometry(r, r, h, 12), m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    group.add(o);
    return o;
  }
  function sign(
    text: string,
    sub: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#b9aa83';
    c.fillRect(0, 0, 512, 256);
    c.strokeStyle = '#3a3328';
    c.lineWidth = 7;
    c.strokeRect(12, 12, 488, 232);
    c.textAlign = 'center';
    c.fillStyle = '#342f24';
    c.font = 'bold 56px serif';
    c.fillText(text, 256, 113);
    c.font = '22px monospace';
    c.fillText(sub, 256, 176);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.magFilter = T.LinearFilter;
    texture.anisotropy = anisotropy;
    textures.push(texture);
    const mesh = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshStandardMaterial({ map: texture, roughness: 1 }),
    );
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  // Floor lies below the existing battle table; its gameplay coordinates stay unchanged.
  box(20, 0.25, 21, 0, -2.55, 2.5, floor);
  box(20, 8, 0.3, 0, 1.3, -7.8, wall);
  box(0.3, 8, 21, -10, 1.3, 2.5, wall);
  box(0.3, 8, 21, 10, 1.3, 2.5, wall);
  box(20, 8, 0.3, 0, 1.3, 12.8, wall);
  const ceiling = box(20, 0.2, 21, 0, 5.35, 2.5, black);
  box(20, 2.3, 0.18, 0, -1.25, -7.57, green);
  for (const x of [-9.8, 9.8]) box(0.15, 2.3, 21, x, -1.25, 2.5, green);
  for (let x = -9; x < 10; x += 1.4)
    box(0.055, 2.4, 0.08, x, -1.25, -7.43, iron);
  box(20, 0.1, 0.16, 0, 0, -7.4, brass);
  for (let x = -9; x < 10; x += 2) box(0.025, 0.012, 20, x, -2.415, 2.5, black);
  // A single central table. Both inspection and combat look at this exact object.
  box(11.5, 0.29, 8, 0, -0.27, 0, wood);
  if (tactile) {
    // Separate joined boards, with continuous grain along their long dimension.
    for (let i = 0; i < 8; i++) {
      const plank = box(11.48, 0.07, 0.986, 0, -0.075, -3.5 + i, wood);
      const uv = plank.geometry.getAttribute('uv');
      for (let v = 0; v < uv.count; v++)
        uv.setXY(v, uv.getX(v) + i * 0.173, uv.getY(v) + i * 0.319);
    }
    const worn = material('#6e5338'),
      seam = material('#191e18');
    for (let i = 0; i < 15; i++) {
      const x = -5.2 + i * 0.72;
      // Wear on the approached edge, leaving the main play area quiet.
      const chip = box(
        0.12 + (i % 3) * 0.05,
        0.009,
        0.014,
        x,
        -0.015,
        3.92 - (i % 2) * 0.012,
        worn,
      );
      chip.rotation.y = Math.sin(i * 5) * 0.16;
    }
    for (const x of [-5.35, 5.35])
      for (const z of [-3.5, -2.5, 2.5, 3.5]) {
        const nail = tube(0.028, 0.008, x, -0.03, z, iron);
        box(0.035, 0.002, 0.005, x, -0.024, z, seam);
        nail.rotation.y = 0.1;
      }
    const shadow = contactTexture();
    textures.push(shadow);
    for (const [x, z, w, d] of [
      [0, 0, 12.7, 9],
      [-7.1, 1.8, 3.4, 2.2],
      [0.1, 5.4, 2.4, 2],
    ]) {
      const m = new T.MeshBasicMaterial({
        map: shadow,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      });
      const s = new T.Mesh(new T.PlaneGeometry(w, d), m);
      s.rotation.x = -Math.PI / 2;
      s.position.set(x, -2.414, z);
      group.add(s);
    }
    // Small plaster fissures around the radiator, not uniform random dirt.
    const crackMaterial = new T.LineBasicMaterial({
      color: '#41483f',
      transparent: true,
      opacity: 0.6,
    });
    for (let i = 0; i < 3; i++) {
      const points = Array.from(
        { length: 12 },
        (_, j) =>
          new T.Vector3(
            7.1 + i * 0.39 + Math.sin(j * 2.4 + i) * 0.07,
            0.1 + j * 0.1,
            -7.635,
          ),
      );
      group.add(
        new T.Line(new T.BufferGeometry().setFromPoints(points), crackMaterial),
      );
    }
  }
  box(11.65, 0.12, 0.12, 0, -0.13, 4, brass);
  box(11.65, 0.12, 0.12, 0, -0.13, -4, brass);
  for (const x of [-5, 5])
    for (const z of [-3.3, 3.3]) box(0.28, 2.2, 0.3, x, -1.5, z, iron);
  box(10, 0.22, 0.18, 0, -1.4, 3.3, wood);
  // Chair and fallen second chair provide human scale without a character model.
  box(1.7, 0.2, 1.6, 0.1, -0.8, 5.4, wood);
  box(1.7, 1.65, 0.16, 0.1, 0, 6.2, wood);
  for (const x of [-0.55, 0.75])
    for (const z of [4.85, 5.98]) box(0.14, 1.6, 0.14, x, -1.6, z, iron);
  // Storage cabinet, openable leaf, and the object the player can take.
  box(2.7, 4.6, 0.14, -7.1, -0.15, 0.95, wood);
  for (const x of [-8.4, -5.8]) box(0.15, 4.6, 1.4, x, -0.15, 1.6, wood);
  for (const y of [-2.45, 2.15]) box(2.7, 0.15, 1.4, -7.1, y, 1.6, wood);
  box(2.4, 4.15, 0.06, -7.1, -0.05, 1.05, black);
  for (const y of [-1.2, 0.1, 1.4]) box(2.4, 0.1, 1.25, -7.1, y, 1.75, wood);
  const door = new T.Group();
  door.position.set(-8.4, -0.15, 2.5);
  group.add(door);
  box(2.62, 4.6, 0.16, 1.31, 0, 0, wood, door);
  box(2.18, 0.075, 0.09, 1.31, 0.7, 0.12, brass, door);
  box(2.18, 0.075, 0.09, 1.31, -0.7, 0.12, brass, door);
  box(0.08, 0.52, 0.14, 2.28, -0.05, 0.2, brass, door);
  const pad = box(1.2, 0.35, 0.8, -7.05, 0.36, 2.03, material('#896444'));
  const strap = box(0.13, 0.38, 0.82, -7.05, 0.36, 2.03, brass);
  for (let i = 0; i < 3; i++)
    box(0.34, 0.7, 0.42, -7.7 + i * 0.47, -0.8, 1.85, i === 1 ? paper : green);
  sign('保 管 柜', 'PROPERTY OF THE BUILDING', 2.2, 0.9, -7.1, 2.75, 2.32);
  // Back wall details are large enough to read as shapes in darkness.
  sign(
    '值 守 须 知',
    'DO NOT ANSWER THE THIRD KNOCK',
    2.4,
    1.5,
    -5,
    1.9,
    -7.38,
  );
  box(3.4, 2.5, 0.15, 5.9, 1.8, -7.38, wood);
  box(3.12, 2.2, 0.18, 5.9, 1.8, -7.27, black);
  for (let i = 0; i < 6; i++) {
    const p = sign(
      String(101 + i),
      'VACANT',
      0.7,
      0.45,
      4.8 + (i % 3) * 1.06,
      2.3 - Math.floor(i / 3) * 1.05,
      -7.1,
    );
    p.rotation.z = i % 2 ? 0.03 : -0.04;
  }
  // Clock with deliberately fixed hands: no random gameplay signal.
  const clock = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 0.14, 24), brass);
  clock.rotation.x = Math.PI / 2;
  clock.position.set(0, 2.8, -7.45);
  group.add(clock);
  const face = new T.Mesh(new T.CircleGeometry(0.51, 24), paper);
  face.position.set(0, 2.8, -7.35);
  group.add(face);
  box(0.04, 0.38, 0.025, 0, 2.96, -7.3, black);
  const hand = box(0.29, 0.045, 0.025, 0.12, 2.8, -7.29, black);
  hand.rotation.z = -0.3;
  // Rear entrance / exit: lamp provides a visible way home when standing up.
  box(3.3, 5.8, 0.4, 6, 0.3, 12.5, iron);
  const exitDoor = new T.Group();
  exitDoor.position.set(4.55, 0.3, 12.25);
  group.add(exitDoor);
  box(2.9, 5.5, 0.18, 1.45, 0, 0, green, exitDoor);
  box(0.09, 0.5, 0.15, 2.5, -0.4, -0.17, brass, exitDoor);
  const exitLight = new T.MeshBasicMaterial({ color: '#93bfb0' });
  box(0.04, 5.4, 0.1, 4.55, 0.3, 12.09, exitLight);
  const exitSign = sign('归 途', 'ELEVATOR', 2, 0.65, 6, 3.65, 12.0);
  exitSign.rotation.y = Math.PI;
  // Ceiling conduits, radiator, hanging lamp with a tightly controlled pool of light.
  for (const x of [-9.5, 9.4]) tube(0.075, 7, x, 1, -7.1, iron);
  for (let i = 0; i < 9; i++) tube(0.13, 1.3, 7.7 + i * 0.18, -1.5, -6.9, iron);
  const lampCord = tube(0.035, 1.1, -1.8, 4.75, 0.2, black);
  const shade = new T.Mesh(
    new T.ConeGeometry(1.25, 0.7, 16, 1, true),
    new T.MeshStandardMaterial({
      color: '#22352c',
      side: T.DoubleSide,
      roughness: 0.7,
    }),
  );
  shade.position.set(-1.8, 4.1, 0.2);
  group.add(shade);
  const bulb = new T.Mesh(
    new T.SphereGeometry(0.16, 10, 8),
    new T.MeshBasicMaterial({ color: '#ffe4ac' }),
  );
  bulb.position.set(-1.8, 3.96, 0.2);
  group.add(bulb);
  const lamp = new T.PointLight('#ffe1b0', tactile ? 86 : 135, 22, 2);
  lamp.position.set(-1.8, 3.75, 0.2);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.002;
  lamp.shadow.normalBias = 0.025;
  lamp.shadow.radius = 3;
  scene.add(lamp);
  const cabinetLight = new T.PointLight('#ffe4bd', tactile ? 40 : 26, 8, 2);
  cabinetLight.position.set(-6.6, 2.6, 3.4);
  scene.add(cabinetLight);
  const doorLight = new T.PointLight('#6d9e9b', 18, 9, 2);
  doorLight.position.set(6, 1.8, 10);
  scene.add(doorLight);
  for (let i = 0; i < 4; i++) {
    const sheet = box(0.4, 0.008, 0.7, 5.45, 0.025, -2.7 + i * 0.5, paper);
    sheet.rotation.y = i * 0.1;
  }
  const cup = tube(0.19, 0.36, -5.45, 0.16, 3.5, green);
  cup.rotation.z = 0.04;
  // Dust lives in the room, not on the UI. No gameplay randomness.
  const xyz = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i++) {
    xyz[i * 3] = Math.sin(i * 37.2) * 8;
    xyz[i * 3 + 1] = Math.cos(i * 13.8) * 2 + 1;
    xyz[i * 3 + 2] = Math.sin(i * 7.3) * 7 + 2;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(xyz, 3));
  const dust = new T.Points(
    geometry,
    new T.PointsMaterial({
      color: '#d6bc8b',
      size: 0.026,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
  );
  group.add(dust);
  const poses: Record<
    ChamberView,
    { position: number[]; target: number[]; fov: number }
  > = {
    entry: { position: [2.5, 2, 11.2], target: [-1, 0.6, -2.8], fov: 67 },
    cabinet: { position: [-5.4, 1.0, 6.5], target: [-7.1, 0.15, 1.9], fov: 58 },
    table: boardCamera(16 / 9),
    exit: { position: [3.4, 1.2, 6.4], target: [6, 0.9, 12.2], fov: 61 },
  };
  const target = new T.Vector3(...poses.entry.target),
    cameraPosition = new T.Vector3(...poses.entry.position);
  let lastView = 'entry',
    elapsed = 2;
  const fromPosition = cameraPosition.clone(),
    fromTarget = target.clone();
  let fromFov = 67;
  let cabinetModel: T.Object3D | undefined;
  return {
    setCabinetModel(source?: T.Object3D) {
      if (!source) return;
      cabinetModel = source.clone();
      const bounds = new T.Box3().setFromObject(cabinetModel),
        size = bounds.getSize(new T.Vector3()),
        center = bounds.getCenter(new T.Vector3());
      const scale = 1.3 / Math.max(size.x, size.z);
      cabinetModel.scale.setScalar(scale);
      cabinetModel.position.set(
        -7.05 - center.x * scale,
        0.16 - bounds.min.y * scale,
        1.7 - center.z * scale,
      );
      group.add(cabinetModel);
    },
    initial: poses.entry,
    update(
      camera: T.PerspectiveCamera,
      state: ChamberState,
      dt: number,
      reduced: boolean,
    ) {
      const viewKey = state.study ? 'study' : state.view;
      if (lastView !== viewKey) {
        lastView = viewKey;
        elapsed = 0;
        fromPosition.copy(camera.position);
        fromTarget.copy(target);
        fromFov = camera.fov;
      }
      elapsed += dt;
      const k = reduced ? 1 : Math.min(1, elapsed / 1.45),
        ease = k * k * (3 - 2 * k),
        pose = state.study
          ? { position: [2.8, 2.7, 5.4], target: [0, 0.5, 2], fov: 42 }
          : state.view === 'table'
            ? boardCamera(camera.aspect, state.arena)
            : poses[state.view];
      // The seated tactical camera rises above the hanging fixture. Cut away only
      // the ceiling/fixture geometry; keep the same room and its actual lighting.
      for (const object of [ceiling, lampCord, shade, bulb])
        object.visible = state.view !== 'table' || !!state.study;
      camera.position
        .copy(fromPosition)
        .lerp(new T.Vector3(...pose.position), ease);
      target.copy(fromTarget).lerp(new T.Vector3(...pose.target), ease);
      const fittedFov =
        state.view === 'table' && !state.study
          ? pose.fov
          : T.MathUtils.radToDeg(
              2 *
                Math.atan(
                  Math.tan(T.MathUtils.degToRad(pose.fov) / 2) *
                    Math.max(1, 1.55 / camera.aspect),
                ),
            );
      camera.fov = T.MathUtils.lerp(fromFov, fittedFov, ease);
      exitDoor.rotation.y = T.MathUtils.damp(
        exitDoor.rotation.y,
        state.cleared && state.view === 'exit' ? 1.15 : 0,
        reduced ? 100 : 3,
        dt,
      );
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      door.rotation.y = T.MathUtils.damp(
        door.rotation.y,
        state.opened ? -2.0 : 0,
        reduced ? 100 : 6,
        dt,
      );
      pad.visible = strap.visible = !state.taken && !cabinetModel;
      if (cabinetModel) cabinetModel.visible = !state.taken;
      const now = performance.now() / 1000;
      const lampBase = tactile ? (state.neutral ? 42 : 86) : 135;
      lamp.intensity = lampBase + (reduced ? 0 : Math.sin(now * 8) * 0.6);
      lamp.color.set(state.neutral ? '#ffffff' : '#ffe1b0');
      cabinetLight.color.set(state.neutral ? '#ffffff' : '#ffe4bd');
      cabinetLight.intensity = state.neutral ? 15 : tactile ? 40 : 26;
      dust.rotation.y = reduced ? 0 : now * 0.006;
      return k === 1;
    },
    points(state: ChamberState) {
      if (state.study) return [];
      const points =
        state.view === 'entry'
          ? [
              { id: 'cabinet', p: [-7.1, 0.8, 2.5] },
              { id: 'table', p: [0, 0.5, 2.6] },
            ]
          : state.view === 'cabinet'
            ? [
                {
                  id: state.opened ? 'take' : 'open',
                  p: state.opened ? [-7, 0.5, 2.4] : [-7.1, 0.6, 2.6],
                },
              ]
            : state.view === 'exit'
              ? [{ id: 'leave', p: [6, 0.4, 12.1] }]
              : [];
      return points;
    },
    dispose() {
      textures.forEach((t) => t.dispose());
      surfaces?.dispose();
      geometry.dispose();
      (dust.material as T.Material).dispose();
    },
  };
}
