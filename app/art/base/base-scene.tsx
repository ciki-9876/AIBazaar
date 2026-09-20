'use client';
import { sitePath } from '@/lib/site-path';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BAYS,
  FACILITIES,
  footprint,
  canPlace,
  type BaseState,
  type FacilityKind,
} from './base-state';
import { createSceneKit } from './scene-kit';
import { facilityModel } from './facility-models';
export type BaseView = 'cabin' | 'build' | 'focus';
type Props = {
  refined?: boolean;
  state: BaseState;
  view: BaseView;
  selected: number | null;
  draft: FacilityKind | null;
  slot: number | null;
  door: boolean;
  emergency: boolean;
  reduced: boolean;
  onSelect: (id: number) => void;
  onSlot: (slot: number) => void;
  onDoor: () => void;
};
export default function BaseScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null),
    overlay = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  const [error, setError] = useState(false);
  const [assetsReady, setAssetsReady] = useState(0);
  const [assetError, setAssetError] = useState(false);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    setAssetsReady(0);
    setAssetError(false);
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      queueMicrotask(() => setError(true));
      return;
    }
    const k = createSceneKit(),
      { box: b, cylinder: c, pipe, m, glow, cyan, label } = k;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = props.refined ? 1.08 : 1.23;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      'aria-label',
      '电梯生活舱三维场景，可拖动环视和点击设施',
    );
    const scene = new T.Scene();
    let disposed = false;
    const imported: T.Object3D[] = [];
    const assets: Partial<Record<FacilityKind, T.Object3D>> = {};
    let assetRevision = 0;
    let luxShell: T.Object3D | null = null;
    let luxWalls: T.Object3D | undefined;
    let luxDoors: T.Object3D[] = [];
    const pmrem = props.refined ? new T.PMREMGenerator(renderer) : null;
    const environmentRoom = props.refined ? new RoomEnvironment() : null;
    const environment =
      pmrem && environmentRoom ? pmrem.fromScene(environmentRoom, 0.04) : null;
    if (environment) {
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.22;
    }
    scene.background = new T.Color('#101c22');
    scene.fog = new T.FogExp2('#14252a', 0.025);
    const camera = new T.PerspectiveCamera(49, 1, 0.1, 80);
    camera.position.set(0, 3.3, 9);
    const look = new T.Vector3(0, 1.4, -2),
      aim = new T.Vector3(),
      pos = new T.Vector3(),
      relative = new T.Vector3();
    const ambient = new T.HemisphereLight('#a5cbca', '#3f3727', 2.3);
    scene.add(ambient);
    const mainLight = new T.SpotLight('#ffdb9c', 180, 25, 1, 0.8, 1.5);
    mainLight.position.set(-0.6, 6, 1);
    mainLight.target.position.set(0, 0.1, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight, mainLight.target);
    const cool = new T.PointLight('#7fe1d3', 22, 11, 1.5);
    cool.position.set(3.4, 2.2, -1.4);
    scene.add(cool);
    const doorLight = new T.PointLight('#7db0cc', 18, 10, 1.3);
    doorLight.position.set(0, 2.8, -5.6);
    scene.add(doorLight);
    // Cabin shell: authored once, independent of simulation and furniture.
    const walls = new T.Group();
    scene.add(walls);
    b(scene, 10.2, 0.28, 12.9, m.steel, 0, -0.18, 0.45, true);
    b(scene, 9.65, 0.025, 12.5, m.rubber, 0, -0.025, 0.45);
    for (let z = -5.55; z <= 6.5; z += 1.05) {
      b(scene, 9.55, 0.025, 0.014, m.enamel, 0, 0, z);
      for (let x = -4.5; x < 4.6; x += 0.3)
        b(scene, 0.065, 0.018, 0.17, m.steel, x, 0.005, z + 0.44);
    }
    for (const x of [-2.28, 2.28])
      b(scene, 0.045, 0.028, 12.4, m.brass, x, 0.01, 0.45);
    for (const x of [-4.75, 4.75]) {
      b(walls, 0.18, 4.5, 12.7, m.steel, x, 2.23, 0.45);
      b(
        walls,
        0.045,
        1.2,
        12.4,
        m.enamel,
        x + (x < 0 ? 0.11 : -0.11),
        1.35,
        0.45,
      );
      for (let z = -5.4; z <= 6.4; z += 2.5) {
        b(walls, 0.23, 4.55, 0.18, m.rubber, x, 2.24, z);
        b(walls, 0.08, 4.3, 0.11, m.brass, x + (x < 0 ? 0.14 : -0.14), 2.2, z);
      }
      pipe(walls, [x, 3.75, -5.4], [x, 3.75, 6.25], 0.09, m.steel);
      pipe(
        walls,
        [x * 0.92, 4.08, -5.4],
        [x * 0.92, 4.08, 6.25],
        0.035,
        m.brass,
      );
    }
    b(scene, 10.1, 4.6, 0.25, m.steel, 0, 2.22, -5.8);
    b(scene, 3.05, 3.9, 0.27, m.rubber, 0, 1.95, -5.56);
    // Beyond the doors there is only the cold lift shaft, not a new playable floor.
    b(scene, 2.95, 3.72, 0.05, cyan, 0, 1.9, -5.46);
    const doors = [-1, 1].map((side) => {
      const g = new T.Group();
      g.position.set(side * 0.74, 1.92, -5.2);
      scene.add(g);
      b(g, 1.45, 3.73, 0.18, m.enamel, 0, 0, 0, true);
      for (let x = -0.5; x < 0.7; x += 0.24)
        b(g, 0.017, 3.35, 0.023, m.steel, x, 0, 0.108);
      b(g, 0.065, 0.8, 0.035, m.brass, side < 0 ? 0.55 : -0.55, 0, 0.15);
      g.traverse((o) => (o.userData.hotspot = 'door'));
      return g;
    });
    b(scene, 3.6, 0.22, 0.42, m.rubber, 0, 3.96, -5.18);
    b(scene, 2.65, 0.045, 0.06, glow, 0, 3.86, -4.97);
    label(scene, 'F 09', 'ELEVATOR / LIFE SUPPORT', 2.25, 0.7, 0, 4.35, -5.06);
    b(scene, 0.56, 1.25, 0.32, m.rubber, 2.12, 1.7, -5.1, true);
    label(scene, '09', 'STANDBY', 0.43, 0.39, 2.12, 1.97, -4.9);
    for (let y = 1.25; y < 1.65; y += 0.18)
      c(scene, 0.047, 0.025, m.brass, 2.12, y, -4.88).rotation.x = Math.PI / 2;
    // Utility terminals and domestic traces anchor the otherwise modular room.
    b(scene, 1.75, 0.9, 0.8, m.enamel, -2.75, 0.53, -4.76, true);
    b(scene, 1.92, 0.11, 1.02, m.ivory, -2.75, 1.04, -4.66, true);
    b(scene, 1.08, 0.68, 0.4, m.rubber, -2.75, 1.44, -4.85, true);
    label(
      scene,
      'F9 / LINK',
      'SURVIVOR TERMINAL',
      0.9,
      0.44,
      -2.75,
      1.47,
      -4.62,
    );
    for (let x = -3.2; x < -2.25; x += 0.12)
      b(scene, 0.08, 0.024, 0.085, m.steel, x, 1.12, -4.36);
    b(scene, 1.25, 1.4, 0.6, m.enamel, 3.04, 0.8, -4.85, true);
    label(scene, 'AIR', 'FILTER / 08', 0.85, 0.26, 3.04, 1.22, -4.51);
    for (let y = 0.3; y < 1; y += 0.13)
      b(scene, 0.9, 0.04, 0.04, m.rubber, 3.04, y, -4.52);
    for (const z of [-3.8, 1.4, 5.9]) {
      b(walls, 9.4, 0.14, 0.15, m.steel, 0, 4.47, z);
      b(walls, 2.7, 0.12, 0.64, m.rubber, 0, 4.42, z);
      b(walls, 2.45, 0.035, 0.38, glow, 0, 4.33, z);
    }
    label(
      scene,
      'KEEP WALKWAY CLEAR',
      '生命维持通道 / 请保持畅通',
      2.6,
      0.45,
      0,
      0.03,
      2.4,
    ).rotation.x = -Math.PI / 2;
    const pads = BAYS.map((bay) => {
      const mat = new T.MeshBasicMaterial({
        color: '#77c7c3',
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      });
      const mesh = b(scene, 2.1, 0.035, 2.28, mat, bay.x, 0.055, bay.z);
      mesh.userData.bay = bay.id;
      return mesh;
    });
    const hatch = BAYS.slice(6).map((bay) => {
      const g = new T.Group();
      g.position.set(bay.x, 0.08, bay.z);
      scene.add(g);
      b(g, 2.1, 0.1, 2.28, m.steel);
      for (let z = -0.9; z <= 0.9; z += 0.27)
        b(g, 1.9, 0.018, 0.05, m.brass, 0, 0.065, z);
      return g;
    });
    const oldShell = scene.children.filter(
      (o) => o instanceof T.Mesh || o === walls || doors.includes(o as T.Group),
    );
    function disposeAsset(root: T.Object3D) {
      const materials = new Set<T.Material>(),
        textures = new Set<T.Texture>(),
        geometries = new Set<T.BufferGeometry>();
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        }
      });
      for (const m of materials) {
        for (const v of Object.values(m))
          if (v instanceof T.Texture) textures.add(v);
        m.dispose();
      }
      textures.forEach((t) => t.dispose());
      geometries.forEach((g) => g.dispose());
    }
    if (props.refined) {
      const loader = new GLTFLoader();
      for (const id of ['shell', ...Object.keys(FACILITIES)]) {
        loader.load(
          sitePath(`/art-assets/lux3d/${id}.glb`),
          (gltf) => {
            if (disposed) {
              disposeAsset(gltf.scene);
              return;
            }
            const root = gltf.scene;
            imported.push(root);
            root.traverse((o) => {
              if (o instanceof T.Mesh) {
                o.castShadow = true;
                o.receiveShadow = true;
              }
            });
            if (id === 'shell') {
              oldShell.forEach((o) => (o.visible = false));
              luxShell = root;
              scene.add(root);
              luxWalls = root.getObjectByName('ShellWalls');
              luxDoors = ['DoorLeft', 'DoorRight']
                .map((name) => root.getObjectByName(name))
                .filter((o): o is T.Object3D => !!o);
              luxDoors.forEach((d) =>
                d.traverse((o) => (o.userData.hotspot = 'door')),
              );
            } else assets[id as FacilityKind] = root;
            assetRevision++;
            setAssetsReady((n) => n + 1);
          },
          undefined,
          () => {
            if (!disposed) setAssetError(true);
          },
        );
      }
    }
    const moduleRoot = new T.Group();
    scene.add(moduleRoot);
    let moduleKey = '',
      ghostKey = '',
      ghost: T.Group | null = null,
      lastView = '',
      yaw = 0,
      pitch = 0,
      zoom = 1,
      lastPulse = -1,
      pulseStart = 0,
      last = performance.now();
    const ghostMat = new T.MeshBasicMaterial({
      color: '#8adecd',
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      wireframe: false,
    });
    const ray = new T.Raycaster(),
      pointer = new T.Vector2();
    let startX = 0,
      startY = 0,
      px = 0,
      py = 0,
      dragging = false,
      moved = 0;
    const down = (e: PointerEvent) => {
      startX = px = e.clientX;
      startY = py = e.clientY;
      moved = 0;
      dragging = true;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      moved = Math.max(
        moved,
        Math.hypot(e.clientX - startX, e.clientY - startY),
      );
      yaw = Math.max(-0.65, Math.min(0.65, yaw - (e.clientX - px) * 0.004));
      pitch = Math.max(-0.25, Math.min(0.3, pitch + (e.clientY - py) * 0.003));
      px = e.clientX;
      py = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const candidates = [
        ...moduleRoot.children,
        ...(luxDoors.length ? luxDoors : doors),
        ...(latest.current.view === 'build'
          ? pads.filter((pad, i) => latest.current.state.expanded || i < 6)
          : []),
      ];
      const hit = ray.intersectObjects(candidates, true)[0];
      if (!hit) return;
      const data = hit.object.userData;
      if (typeof data.moduleId === 'number')
        latest.current.onSelect(data.moduleId);
      else if (typeof data.bay === 'number') latest.current.onSlot(data.bay);
      else if (data.hotspot === 'door') latest.current.onDoor();
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom = Math.max(0.75, Math.min(1.3, zoom + e.deltaY * 0.0005));
    };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener(
      'pointercancel',
      () => (dragging = false),
    );
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    const onLost = (e: Event) => {
      e.preventDefault();
      setError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    renderer.setAnimationLoop((now: number) => {
      const p = latest.current,
        s = p.state,
        dt = Math.min(0.06, (now - last) / 1000);
      last = now;
      if (p.view !== lastView) {
        lastView = p.view;
        yaw = 0;
        pitch = 0;
        zoom = 1;
      }
      const key = JSON.stringify([s.modules, s.expanded, assetRevision]);
      if (key !== moduleKey) {
        moduleKey = key;
        moduleRoot.clear();
        s.modules.forEach((mod) =>
          moduleRoot.add(facilityModel(k, mod, s.expanded, assets[mod.kind])),
        );
      }
      const gkey = JSON.stringify([
        p.draft,
        p.slot,
        s.expanded,
        s.modules,
        assetRevision,
      ]);
      if (gkey !== ghostKey) {
        ghostKey = gkey;
        if (ghost) {
          scene.remove(ghost);
          ghost = null;
        }
        if (
          p.draft !== null &&
          p.slot !== null &&
          !canPlace(s, p.draft, p.slot)
        ) {
          ghost = facilityModel(
            k,
            { id: -1, kind: p.draft, slot: p.slot, level: 1, used: false },
            s.expanded,
            assets[p.draft],
          );
          ghost.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.material = ghostMat;
              o.castShadow = false;
            }
          });
          scene.add(ghost);
        }
      }
      if (ghost) ghost.visible = p.view === 'build';
      const occupied = s.modules.flatMap((mod) =>
        footprint(mod.kind, mod.slot, s.expanded),
      );
      pads.forEach((pad, i) => {
        pad.visible = p.view === 'build' && (s.expanded || i < 6);
        const mat = pad.material as T.MeshBasicMaterial;
        mat.color.set(
          occupied.includes(i)
            ? '#627979'
            : p.slot === i
              ? '#eec984'
              : '#7cccc5',
        );
        mat.opacity = p.slot === i ? 0.27 : 0.08;
      });
      hatch.forEach((h) => (h.visible = !s.expanded));
      walls.visible = !luxShell && p.view !== 'build';
      if (luxWalls) luxWalls.visible = p.view !== 'build';
      mainLight.color.set(p.emergency ? '#cf7f5d' : '#ffdb9c');
      mainLight.intensity = p.emergency ? 95 : p.refined ? 145 : 180;
      ambient.intensity = p.emergency ? 1.3 : p.refined ? 1.7 : 2.3;
      (luxDoors.length ? luxDoors : doors).forEach((g, i) => {
        const target = (i ? 1 : -1) * (p.door ? 2.02 : 0.74);
        g.position.x = T.MathUtils.lerp(
          g.position.x,
          target,
          p.reduced ? 1 : 1 - Math.exp(-dt * 5),
        );
      });
      if (s.pulse !== lastPulse) {
        lastPulse = s.pulse;
        pulseStart = now;
      }
      moduleRoot.children.forEach((group) => {
        const active =
          group.userData.moduleId === s.active && now - pulseStart < 2400;
        const selected = group.userData.moduleId === p.selected;
        group.position.y = selected ? 0.1 : 0.06;
        group.traverse((o) => {
          if (o.userData.motor && active && !p.reduced) o.rotation.z += dt * 8;
        });
      });
      if (p.view === 'build') {
        pos.set(8.5, 11.8, 13.5);
        aim.set(0, 0.2, 0.7);
      } else if (p.view === 'focus' && p.selected !== null) {
        const mod = s.modules.find((v) => v.id === p.selected);
        const bay = mod ? BAYS[mod.slot] : BAYS[0];
        pos.set(bay.x * 0.12, 2.65, bay.z + 3.8);
        aim.set(bay.x, 1.3, bay.z + 0.45);
      } else {
        pos.set(0, 3.05, 8.4);
        aim.set(0, 1.6, -2.2);
      }
      relative.copy(pos).sub(aim);
      relative.applyAxisAngle(new T.Vector3(0, 1, 0), yaw);
      relative.y += pitch * 5;
      relative.multiplyScalar(zoom * Math.max(1, 1 / camera.aspect));
      pos.copy(aim).add(relative);
      camera.position.lerp(pos, p.reduced ? 1 : 1 - Math.exp(-dt * 4));
      look.lerp(aim, p.reduced ? 1 : 1 - Math.exp(-dt * 4));
      camera.lookAt(look);
      overlay.current
        ?.querySelectorAll<HTMLButtonElement>('[data-bay]')
        .forEach((button) => {
          const id = Number(button.dataset.bay),
            bay = BAYS[id],
            v = new T.Vector3(bay.x, 0.28, bay.z).project(camera);
          button.style.left = `${(v.x * 0.5 + 0.5) * el.clientWidth}px`;
          button.style.top = `${(-v.y * 0.5 + 0.5) * el.clientHeight}px`;
          button.style.display =
            p.view === 'build' &&
            (s.expanded || id < 6) &&
            !occupied.includes(id)
              ? 'block'
              : 'none';
        });
      renderer.render(scene, camera);
    });
    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      pads.forEach((p) => (p.material as T.Material).dispose());
      ghostMat.dispose();
      imported.forEach(disposeAsset);
      environment?.dispose();
      environmentRoom?.dispose();
      pmrem?.dispose();
      k.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [props.refined]);
  return (
    <>
      <div className="base-canvas" ref={mount} />
      {props.refined && assetsReady < 6 && (
        <output className="base-asset-progress">
          {assetError
            ? '部分模型加载失败，请刷新重试。'
            : `正在载入精修模型 ${assetsReady} / 6`}
        </output>
      )}
      <div ref={overlay} className="base-world-labels">
        {BAYS.map((b) => (
          <button key={b.id} data-bay={b.id} onClick={() => props.onSlot(b.id)}>
            {b.label} · 空槽
          </button>
        ))}
      </div>
      {error && (
        <div className="base-error">
          无法启动三维画面。请在支持 WebGL 的浏览器中打开。
          <br />
          右侧设施操作仍可使用。
        </div>
      )}
    </>
  );
}
