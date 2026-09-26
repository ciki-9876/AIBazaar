'use client';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createSceneKit } from '../base/scene-kit';
import { sitePath } from '@/lib/site-path';
import type { RoomDemo } from '@/lib/room-demo';

export type RoomAnchor = { id: string; x: number; y: number };
type Props = {
  state: RoomDemo;
  focus: string | null;
  reduced: boolean;
  onAnchors: (anchors: RoomAnchor[]) => void;
  onPick: (id: string) => void;
};
export default function RoomScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  const room = props.state.room;
  useEffect(() => {
    const el = mount.current!;
    let dead = false,
      raf = 0;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color('#101c20');
    scene.fog = new T.Fog('#101c20', 23, 46);
    const camera = new T.OrthographicCamera(-7, 7, 5, -5, 0.1, 60);
    camera.position.set(10, 11, 14);
    camera.lookAt(0, 0.5, 0);
    const kit = createSceneKit(),
      { box, cylinder, pipe, label, m, glow, cyan, material } = kit;
    const root = new T.Group();
    scene.add(root);
    scene.add(new T.HemisphereLight('#c6e4e5', '#191925', 1.65));
    const sun = new T.DirectionalLight('#fbe2b1', 3.1);
    sun.position.set(-4, 9, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -8,
      right: 8,
      top: 7,
      bottom: -7,
    });
    sun.shadow.bias = -0.001;
    scene.add(sun);
    const blue = new T.PointLight('#72b9c9', 18, 12);
    blue.position.set(1, 3, -1);
    scene.add(blue);
    const amber = new T.PointLight('#ffba69', 16, 9);
    amber.position.set(-3, 2, 2);
    scene.add(amber);
    const concrete = material('#4c5955', 0.05, 0.96),
      tile = material('#6c7b72', 0.1, 0.9),
      wall = material('#71847b', 0.1, 0.85);
    const oxide = material('#86523c', 0.5, 0.65),
      dark = material('#101d22', 0.1, 0.8);
    box(root, 9.3, 0.48, 7.7, m.steel, 0, -0.35, 0, true);
    box(root, 8.9, 0.13, 7.3, concrete, 0, -0.055, 0);
    for (let x = -4; x <= 4; x++)
      for (let z = -3; z <= 3; z++) {
        box(
          root,
          0.965,
          0.045,
          0.965,
          (x + z) % 3 === 0 ? concrete : tile,
          x,
          0.025,
          z,
        );
        if ((x * 7 + z * 3) % 13 === 0)
          box(root, 0.3, 0.008, 0.02, m.rubber, x + 0.14, 0.052, z + 0.1);
      }
    // Only the back and left walls remain: a readable, dollhouse-like cutaway.
    box(root, 9.2, 3.5, 0.22, wall, 0, 1.75, -3.6);
    box(root, 0.22, 3.5, 7.3, wall, -4.6, 1.75, 0);
    box(root, 9.15, 1.02, 0.05, m.enamel, 0, 0.53, -3.46);
    box(root, 0.05, 1.02, 7.15, m.enamel, -4.46, 0.53, 0);
    for (let x = -4; x <= 4; x++) {
      box(root, 0.016, 3.4, 0.025, concrete, x, 1.75, -3.46);
      box(root, 0.08, 0.045, 0.2, m.brass, x, 3.47, -3.45);
    }
    pipe(root, [-4.3, 2.9, -3.32], [4.1, 2.9, -3.32], 0.06, oxide);
    pipe(root, [-4.3, 2.9, -3.32], [-4.3, 0.3, -3.32], 0.06, oxide);
    for (const x of [-3, 0, 3]) {
      box(root, 1.3, 0.11, 0.2, glow, x, 3.12, -3.24);
      box(root, 1.5, 0.17, 0.25, m.steel, x, 3.2, -3.3);
    }
    label(
      root,
      ['LEVEL 01', 'STORE / 01', 'PUMP / 02', 'KEEP OUT'][room],
      'PROPERTY OF THE BUILDING',
      2.4,
      0.56,
      -0.6,
      2.25,
      -3.43,
    );
    // A broken front wall and visible slab thickness establish a physical box.
    box(root, 9.2, 0.16, 0.19, m.steel, 0, 0.03, 3.66);
    box(root, 0.16, 0.18, 7.3, m.brass, 4.58, 0.04, 0);
    for (let i = 0; i < 10; i++)
      box(
        root,
        0.13,
        0.011,
        0.43,
        i % 2 ? m.brass : dark,
        1.3 + i * 0.18,
        0.08,
        -2.65,
      );
    const markers = new Map<string, T.Vector3>();
    const pickables: T.Object3D[] = [];
    function hotspot(id: string, at: number[], objects: T.Object3D[]) {
      markers.set(id, new T.Vector3(...(at as [number, number, number])));
      objects.forEach((o) => {
        o.userData.hotspot = id;
        pickables.push(o);
      });
    }
    // The far door is a physical connection to the next room, not a node card.
    const door = new T.Group();
    door.position.set(2.7, 0, -3.34);
    root.add(door);
    box(door, 1.65, 2.65, 0.18, m.steel, 0, 1.32, 0, true);
    const leaf = box(
      door,
      1.38,
      2.4,
      0.1,
      room === 0 ? m.brass : m.enamel,
      0,
      1.22,
      0.12,
      true,
    );
    box(door, 0.065, 0.28, 0.12, m.brass, 0.47, 1.2, 0.23);
    const doorLight = box(door, 0.7, 0.07, 0.07, cyan, 0, 2.76, 0.12);
    label(door, room === 3 ? 'RETURN' : 'NEXT', '→', 1.05, 0.28, 0, 2.23, 0.2);
    hotspot('exit', [2.7, 1.35, -3.1], [door]);
    // Previous-room opening is at the near edge, easy to find when retracing.
    const backPlate = box(
      root,
      1.6,
      0.04,
      0.85,
      m.steel,
      -2.8,
      0.08,
      2.9,
      true,
    );
    const backLabel = label(
      root,
      room === 0 ? 'ELEVATOR' : '← BACK',
      '',
      1.2,
      0.4,
      -2.8,
      0.11,
      2.8,
    );
    backLabel.rotation.x = -Math.PI / 2;
    hotspot('back', [-2.8, 0.25, 2.8], [backPlate, backLabel]);
    const animated: T.Object3D[] = [];
    let lid: T.Group | undefined;
    const valveGroups: T.Group[] = [];
    if (room === 0) {
      const elevator = new T.Group();
      elevator.position.set(-3.3, 0, -1.8);
      elevator.rotation.y = Math.PI / 2;
      root.add(elevator);
      box(elevator, 1.8, 2.9, 0.32, m.steel, 0, 1.45, 0, true);
      for (const x of [-0.41, 0.41])
        box(
          elevator,
          0.79,
          2.55,
          0.08,
          material('#9a9d88', 0.7, 0.3),
          x,
          1.32,
          0.21,
          true,
        );
      label(elevator, '01', '↓ 00 ↑', 1, 0.35, 0, 2.64, 0.24);
      for (const x of [-0.82, 0.82])
        box(elevator, 0.035, 2.65, 0.04, glow, x, 1.37, 0.3);
      hotspot('elevator', [-3.05, 1.6, -1.6], [elevator]);
      const bench = new T.Group();
      root.add(bench);
      box(bench, 2.4, 0.15, 0.65, m.cloth, -1, 0.62, 1);
      for (const x of [-1.9, -0.1])
        box(bench, 0.1, 0.6, 0.48, m.steel, x, 0.3, 1);
      box(root, 0.16, 1.75, 0.1, m.steel, -0.3, 0.93, -2.4);
      box(root, 0.8, 0.5, 0.08, m.ivory, -0.3, 1.8, -2.4);
      const note = label(
        root,
        '不要回应',
        '灯熄灭后听见的敲门声',
        1.15,
        0.58,
        -2,
        1.85,
        -3.4,
        '#e5cd98',
      );
      hotspot('note', [-2, 1.9, -3.25], [note]);
      // Coiled cable, discarded newspaper and dust make the room inhabited.
      for (let i = 0; i < 5; i++)
        pipe(
          root,
          [-3 + i * 0.23, 0.09, 1.6],
          [-2.8 + i * 0.23, 0.09, 2.3],
          0.025,
          m.rubber,
        );
      const paper = box(root, 0.7, 0.009, 0.48, m.ivory, 1.1, 0.07, 1.9);
      paper.rotation.y = 0.3;
    } else if (room === 1) {
      for (const x of [-3.4, -1.6]) {
        for (const y of [0.25, 1.05, 1.85])
          box(root, 1.55, 0.09, 0.9, m.steel, x, y, -2.7);
        for (const dx of [-0.7, 0.7])
          box(root, 0.07, 2.4, 0.9, m.steel, x + dx, 1.2, -2.7);
        for (let i = 0; i < 5; i++)
          box(
            root,
            0.23,
            0.36,
            0.45,
            i % 2 ? m.cloth : m.ivory,
            x - 0.57 + i * 0.28,
            1.27,
            -2.7,
            true,
          );
      }
      const chest = new T.Group();
      chest.position.set(-0.4, 0, 0.5);
      root.add(chest);
      box(chest, 1.8, 0.72, 1.15, m.steel, 0, 0.43, 0, true);
      for (const x of [-0.63, 0.63])
        box(chest, 0.12, 0.76, 1.2, m.brass, x, 0.44, 0);
      lid = new T.Group();
      lid.position.set(0, 0.82, -0.57);
      chest.add(lid);
      box(lid, 1.87, 0.15, 1.2, m.enamel, 0, 0, 0.57, true);
      box(chest, 0.17, 0.2, 0.08, m.brass, 0, 0.65, 0.61);
      hotspot('chest', [-0.4, 1.15, 0.5], [chest]);
      label(root, 'LOST & FOUND', '未认领物资', 1.5, 0.4, -2.6, 2.6, -3.4);
      for (let i = 0; i < 3; i++)
        box(root, 0.8, 0.7, 0.7, m.cloth, 2.9, 0.4 + i * 0.7, 0.8, true);
      const cart = box(root, 1.3, 0.1, 0.8, m.steel, -2.7, 0.45, 1.5);
      hotspot('shelf', [-2.7, 0.8, 1.5], [cart]);
      for (const x of [-3.15, -2.25])
        for (const z of [1.2, 1.8])
          cylinder(root, 0.1, 0.1, m.rubber, x, 0.2, z).rotation.z =
            Math.PI / 2;
    } else if (room === 2) {
      for (const x of [-3.1, -1.9]) {
        cylinder(root, 0.46, 2.35, m.enamel, x, 1.25, -2.5);
        for (const y of [0.25, 2.25])
          cylinder(root, 0.5, 0.12, m.brass, x, y, -2.5);
        pipe(root, [x, 2.4, -2.5], [x, 2.4, -1.2], 0.1, oxide);
      }
      const work = new T.Group();
      work.position.set(0.4, 0, 0.1);
      root.add(work);
      box(work, 4.5, 0.8, 1.7, m.steel, 0, 0.43, 0, true);
      box(work, 4.35, 0.1, 1.58, dark, 0, 0.91, 0, true);
      pipe(work, [-2.65, 1.04, 0], [-1.9, 1.04, 0], 0.085, cyan);
      pipe(work, [1.9, 1.04, 0], [2.55, 1.04, 0], 0.085, m.brass);
      for (let i = 0; i < 3; i++) {
        const group = new T.Group();
        group.position.set((i - 1) * 1.35, 1.04, 0);
        work.add(group);
        valveGroups.push(group);
        pipe(group, [-0.62, 0, 0], [0.62, 0, 0], 0.095, m.brass);
        const wheel = new T.Mesh(
          new T.TorusGeometry(0.23, 0.025, 8, 32),
          oxide,
        );
        wheel.rotation.x = -Math.PI / 2;
        wheel.position.y = 0.13;
        group.add(wheel);
        pipe(group, [-0.2, 0.13, 0], [0.2, 0.13, 0], 0.02, oxide);
        pipe(group, [0, 0.13, -0.2], [0, 0.13, 0.2], 0.02, oxide);
        cylinder(group, 0.055, 0.2, m.brass, 0, 0.13, 0);
        hotspot('valve-' + i, [0.4 + (i - 1) * 1.35, 1.25, 0.12], [group]);
      }
      const control = new T.Group();
      control.position.set(3.5, 0, 1.7);
      root.add(control);
      box(control, 0.75, 1.2, 0.65, m.enamel, 0, 0.65, 0, true);
      kit.gauge(control, 0, 1.35, 0.35);
      const switchButton = box(control, 0.3, 0.08, 0.22, cyan, 0, 1.28, 0);
      hotspot('console', [3.5, 1.5, 1.7], [control, switchButton]);
      for (let i = 0; i < 12; i++) {
        const steam = new T.Mesh(
          new T.SphereGeometry(0.16, 8, 6),
          new T.MeshBasicMaterial({
            color: '#aec5c0',
            transparent: true,
            opacity: 0.1,
            depthWrite: false,
          }),
        );
        steam.position.set(-2.6 + (i % 3) * 0.2, 0.5 + i * 0.13, -1);
        root.add(steam);
        animated.push(steam);
      }
    } else {
      const table = new T.Group();
      root.add(table);
      box(table, 4.3, 0.25, 2.2, m.enamel, 0, 0.9, 0.3, true);
      for (const x of [-1.7, 1.7])
        for (const z of [-0.4, 1])
          box(table, 0.16, 0.85, 0.16, m.steel, x, 0.43, z);
      for (let lane = 0; lane < 3; lane++) {
        box(table, 1.25, 0.025, 1.85, dark, (lane - 1) * 1.35, 1.04, 0.3);
        box(table, 1.2, 0.05, 0.03, m.brass, (lane - 1) * 1.35, 1.1, 0.3);
      }
      hotspot('battle', [0, 1.3, 0.5], [table]);
      const cache = new T.Group();
      cache.position.set(2.9, 0, 1.6);
      root.add(cache);
      box(cache, 0.95, 0.66, 0.8, m.brass, 0, 0.38, 0, true);
      box(cache, 0.9, 0.05, 0.75, dark, 0, 0.73, 0);
      hotspot('trophy', [2.9, 0.9, 1.6], [cache]);
      for (let i = 0; i < 6; i++)
        pipe(
          root,
          [-4, 2.7, -3 + i * 0.3],
          [-4, 2.7, -2.85 + i * 0.3],
          0.04,
          oxide,
        );
    }
    // Bring the same equipment and unknown organism into the exploration room.
    const imported: T.Object3D[] = [];
    new GLTFLoader().load(
      sitePath('/art-assets/battle-slice/equipment-library-v4.glb'),
      (gltf) => {
        if (dead) {
          gltf.scene.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.geometry.dispose();
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                (m) => m.dispose(),
              );
            }
          });
          return;
        }
        imported.push(gltf.scene);
        const add = (
          name: string,
          x: number,
          y: number,
          z: number,
          scale: number,
        ) => {
          const asset = gltf.scene.getObjectByName(name)?.clone();
          if (!asset) return;
          asset.position.set(x, y, z);
          asset.scale.setScalar(scale);
          asset.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          root.add(asset);
          return asset;
        };
        if (room === 1) {
          add('rubber', -2.8, 0.52, 1.5, 1);
          add('sealant', -1.9, 1.12, -2.6, 0.8);
        }
        if (room === 3) {
          const host = add('hostcreature', 0, 0.05, -1.7, 0.5);
          if (host) animated.push(host);
          add('springbow', 0, 1.1, -0.2, 0.75);
          add('slingshot', 1.3, 1.1, 0.8, 0.65);
        }
      },
    );
    const selection = new T.Mesh(
      new T.RingGeometry(0.35, 0.38, 48),
      new T.MeshBasicMaterial({
        color: '#efd49a',
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    selection.rotation.x = -Math.PI / 2;
    root.add(selection);
    const ray = new T.Raycaster();
    const click = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      ray.setFromCamera(
        new T.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects(pickables, true)[0];
      let object: T.Object3D | undefined = hit?.object;
      while (object && !object.userData.hotspot)
        object = object.parent ?? undefined;
      if (object) latest.current.onPick(object.userData.hotspot);
    };
    renderer.domElement.addEventListener('pointerup', click);
    function resize() {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const halfW = Math.max(7.0, (5.6 * w) / h),
        halfH = (halfW * h) / w;
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      latest.current.onAnchors(
        [...markers].map(([id, point]) => {
          const p = point.clone().project(camera);
          return { id, x: ((p.x + 1) * w) / 2, y: ((1 - p.y) * h) / 2 };
        }),
      );
    }
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const start = performance.now();
    function tick() {
      if (dead) return;
      raf = requestAnimationFrame(tick);
      const { state, reduced, focus } = latest.current,
        t = reduced ? 0 : (performance.now() - start) / 1000;
      const open =
        room === 2 ? state.repaired : room === 3 ? state.cleared : true;
      leaf.position.x = T.MathUtils.lerp(
        leaf.position.x,
        open ? 1.15 : 0,
        reduced ? 1 : 0.07,
      );
      doorLight.material = open ? cyan : glow;
      if (lid)
        lid.rotation.x = T.MathUtils.lerp(
          lid.rotation.x,
          state.searched ? -1.65 : 0,
          reduced ? 1 : 0.09,
        );
      valveGroups.forEach((group, i) => {
        group.rotation.y = T.MathUtils.lerp(
          group.rotation.y,
          state.valves[i] ? 0 : Math.PI / 2,
          reduced ? 1 : 0.12,
        );
      });
      animated.forEach((o, i) => {
        if (room === 2) {
          o.visible = !state.repaired;
          o.position.y = 0.6 + ((t * 0.3 + i * 0.19) % 1.8);
          o.scale.setScalar(0.8 + (o.position.y - 0.6) * 0.6);
        } else {
          o.scale.y =
            0.5 * (state.cleared ? 0.15 : 1 + Math.sin(t * 1.3) * 0.035);
        }
      });
      selection.visible = !!focus && markers.has(focus);
      if (focus && markers.has(focus)) {
        selection.position.copy(markers.get(focus)!);
        selection.position.y -= 0.12;
        selection.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
      }
      renderer.render(scene, camera);
    }
    tick();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerup', click);
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      [...imported, root].forEach((tree) =>
        tree.traverse((o) => {
          if (o instanceof T.Mesh) {
            geometries.add(o.geometry);
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(
              (m) => materials.add(m),
            );
          }
        }),
      );
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      kit.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [room]);
  return (
    <div ref={mount} className="rooms-canvas">
      {failed && (
        <div role="alert">无法启动 3D 场景，请启用浏览器硬件加速后重试。</div>
      )}
    </div>
  );
}
