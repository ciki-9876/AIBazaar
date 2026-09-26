'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { contactTexture } from './materials';
import {
  slotX,
  impactX,
  equipmentZ,
  barrierZ,
  coreZ,
  SHOT_HEIGHT,
  BARRIER_HEIGHT,
  BARRIER_WIDTH,
} from '@/lib/battle-slice-visual';
import { surfaceEvents, pulseAt } from '@/lib/battle-slice-fx';
import { barrierMaterial, createImpactEffects, type Contact } from './effects';
import { createChamber, type ChamberState, type RoomPoint } from './chamber';
import { sitePath } from '@/lib/site-path';
import { cardDef, cardFamily } from '@/lib/demo-cards';
import { arenaCard } from '@/lib/arena-catalog';
import { arenaEquipment, arenaAmplifier, disposeArenaModel } from './arena-models';
import type { ArenaFrame } from '@/lib/arena-engine';
import type { CombatFrame, Duel, FighterCard } from '@/lib/demo-combat';
import { StylePostProcess } from '../styles/post-process';
import type { RenderStyleSettings } from '../styles/presets';

export type Anchor = { x: number; y: number; w: number; h: number };
export type BoardAnchors = {
  barriers: Anchor[];
  cores: Anchor[];
  lanes: Anchor[];
  surfaces?: Array<{ barrier: Anchor; core: Anchor }>;
};
type Props = {
  duel: Duel;
  frame: CombatFrame;
  frames: CombatFrame[];
  clock: { current: number };
  selected?: string;
  focusLane?: number;
  placed?: string;
  reduced: boolean;
  onAnchors: (a: Anchor[]) => void;
  onBoardAnchors?: (a: BoardAnchors) => void;
  onReady: () => void;
  reward?: string;
  chamber?: ChamberState;
  materialStyle?: 'tactile' | 'legacy';
  onStats?: (value: string) => void;
  onRoomPoints?: (points: RoomPoint[], settled: boolean) => void;
  renderStyle?: RenderStyleSettings;
};
const sideZ = equipmentZ;
const mat = (color: string, metalness = 0.35, roughness = 0.5) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });

// One mesh per material for static scenery and each equipment family.
function compact(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const list = groups.get(o.material) ?? [];
    list.push(g);
    groups.set(o.material, list);
  });
  const result = new THREE.Group();
  for (const [material, geometries] of groups) {
    const geometry = mergeGeometries(
      geometries.map((g) => (g.index ? g.toNonIndexed() : g)),
    );
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      result.add(mesh);
    }
    geometries.forEach((g) => g.dispose());
  }
  return result;
}

export default function BattleScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  const [failure, setFailure] = useState('');
  const immersive = !!props.chamber;
  const tactile = immersive && props.materialStyle !== 'legacy';
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    const el = mount.current!;
    let dead = false,
      id = 0,
      loaded = false,
      lastSignature = '',
      rewardId = '';
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      queueMicrotask(() =>
        setFailure(
          '此设备无法启用 WebGL，请使用支持硬件加速的浏览器查看 3D 切片。',
        ),
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    let postProcess: StylePostProcess | undefined;
    scene.background = new THREE.Color('#101c20');
    scene.fog = new THREE.Fog('#101c20', 16, 32);
    const chamber = immersive
      ? createChamber(
          scene,
          tactile,
          Math.min(8, renderer.capabilities.getMaxAnisotropy()),
        )
      : null;
    const pmrem = tactile ? new THREE.PMREMGenerator(renderer) : null;
    const envScene = tactile ? new RoomEnvironment() : null;
    const environmentMap =
      pmrem && envScene ? pmrem.fromScene(envScene, 0.08) : null;
    if (environmentMap) {
      scene.environment = environmentMap.texture;
      scene.environmentIntensity = 0.32;
    }
    envScene?.dispose();
    pmrem?.dispose();
    const contact = tactile ? contactTexture() : null;
    const camera = chamber
      ? new THREE.PerspectiveCamera(67, 1, 0.1, 65)
      : new THREE.OrthographicCamera(-7, 7, 4.5, -4.5, 0.1, 60);
    if (chamber) {
      camera.position.set(
        ...(chamber.initial.position as [number, number, number]),
      );
      camera.lookAt(new THREE.Vector3(...chamber.initial.target));
      scene.background = new THREE.Color('#090b09');
      scene.fog = new THREE.Fog('#141a18', 16, 42);
      renderer.toneMappingExposure = 1.1;
    } else {
      camera.position.set(0, 12, 7);
      camera.lookAt(0, 0, 0);
    }
    const ambient = new THREE.HemisphereLight(
      chamber ? '#8b8768' : '#91b5c7',
      '#101515',
      chamber ? (tactile ? 0.8 : 0.55) : 0.65,
    );
    scene.add(ambient);
    const key = new THREE.DirectionalLight('#fff1d9', chamber ? 0.6 : 2.8);
    key.position.set(-3, 8, -1);
    if (tactile) key.position.set(-4, 4.7, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.bias = -0.001;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
    scene.add(key);
    const rim = new THREE.DirectionalLight(
      chamber ? '#6c8785' : '#91bbd0',
      chamber ? 0.35 : 1.3,
    );
    rim.position.set(4, 5, -4);
    scene.add(rim);
    const table = new THREE.Group(),
      equipment = new THREE.Group(),
      effects = new THREE.Group();
    scene.add(table, equipment, effects);
    const ampModules: Array<ReturnType<typeof arenaAmplifier> & {side:number;lane:number}> = [];
    const laneSurfaces: THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.MeshBasicMaterial
    >[] = [];
    for (let lane = 0; lane < 3; lane++) {
      const surface = new THREE.Mesh(
        new THREE.PlaneGeometry(2.98, 5.25),
        new THREE.MeshBasicMaterial({
          color: '#b9b497',
          transparent: true,
          opacity: 0.025,
          depthWrite: false,
        }),
      );
      surface.rotation.x = -Math.PI / 2;
      surface.position.set((lane - 1) * 3.46, 0.012, 0);
      table.add(surface);
      laneSurfaces.push(surface);
    }
    const impactEffects = createImpactEffects(effects);
    const hosts: THREE.Group[] = [];
    const templates = new Map<string, THREE.Group>();
    const meshes = new Map<
      string,
      {
        group: THREE.Group;
        model: THREE.Group;
        plate: THREE.Mesh;
        fill: THREE.Mesh;
        card: FighterCard;
        side: number;
        response: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
        parts: {
          object: THREE.Object3D;
          position: THREE.Vector3;
          rotation: THREE.Euler;
          scale: THREE.Vector3;
        }[];
      }
    >();
    const barriers: {
      mesh: THREE.Mesh;
      glow: THREE.Mesh;
      side: number;
      lane: number;
    }[] = [];
    function box(
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material,
    ) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    for (let side = 0; side < 2; side++)
      for (let lane = 0; lane < 3; lane++) {
        const x = (lane - 1) * 3.46,
          z = barrierZ(side);
        box(
          table,
          BARRIER_WIDTH + 0.03,
          0.1,
          0.11,
          x,
          0.05,
          z,
          mat('#6e6650', 0.7),
        );
        const material = new THREE.MeshStandardMaterial({
          color: side === 0 ? '#80c3b4' : '#d6a277',
          metalness: 0.3,
          roughness: 0.2,
          transparent: true,
          opacity: 0.47,
          emissive: side === 0 ? '#2c7164' : '#88532c',
          emissiveIntensity: 0.3,
          depthWrite: false,
        });
        const mesh: THREE.Mesh = box(
          table,
          BARRIER_WIDTH,
          BARRIER_HEIGHT,
          0.035,
          x,
          0.05 + BARRIER_HEIGHT / 2,
          z,
          material,
        );
        const glow = box(
          table,
          BARRIER_WIDTH,
          0.028,
          0.055,
          x,
          0.05 + BARRIER_HEIGHT,
          z,
          new THREE.MeshBasicMaterial({
            color: side === 0 ? '#a7e6cf' : '#f1b97f',
          }),
        );
        mesh.geometry.dispose();
        material.dispose();
        mesh.geometry = new THREE.PlaneGeometry(BARRIER_WIDTH, BARRIER_HEIGHT);
        mesh.material = barrierMaterial(side);
        barriers.push({ mesh, glow, side, lane });
        for (let cell = 0; cell < 3; cell++) {
          box(
            table,
            0.89,
            0.06,
            1.04,
            slotX(lane * 3 + cell),
            0.025,
            sideZ(side),
            mat('#243337', 0.5),
          );
          for (const dx of [-0.4, 0.4])
            box(
              table,
              0.035,
              0.013,
              0.035,
              slotX(lane * 3 + cell) + dx,
              0.061,
              sideZ(side) - 0.46,
              mat('#7c7257', 0.7),
            );
        }
      }
    for (const x of [-5.13, -1.73, 1.73, 5.13])
      box(table, 0.018, 0.009, 5.5, x, 0.019, 0, mat('#82704c', 0.15, 0.9));
    const pelletGeometry = new THREE.IcosahedronGeometry(0.078, 1);
    const fxLines = Array.from({ length: 32 }, () => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      const line = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({
          color: '#f5ca78',
          transparent: true,
          opacity: 0.8,
        }),
      );
      const ball = new THREE.Mesh(
        pelletGeometry,
        new THREE.MeshStandardMaterial({
          color: '#8d8a7f',
          roughness: 0.95,
          flatShading: true,
        }),
      );
      const arrow = new THREE.Group();
      arrow.scale.setScalar(1.25);
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.018, 0.38, 8),
        mat('#b99a6e', 0.1, 0.75),
      );
      shaft.rotation.x = Math.PI / 2;
      arrow.add(shaft);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.046, 0.13, 4),
        mat('#c1cacc', 0.8, 0.25),
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.z = 0.24;
      arrow.add(tip);
      for (let j = 0; j < 2; j++) {
        const feather = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 0.008, 0.12),
          mat('#d9cfac', 0, 0.9),
        );
        feather.rotation.z = (j * Math.PI) / 2;
        feather.position.z = -0.15;
        arrow.add(feather);
      }
      const pulse = new THREE.Mesh(
        new THREE.TorusGeometry(0.085, 0.015, 6, 20),
        new THREE.MeshBasicMaterial({
          color: '#87d5c0',
          transparent: true,
          opacity: 0.75,
        }),
      );
      const droplets = Array.from(
        { length: 4 },
        () =>
          new THREE.Mesh(
            pelletGeometry,
            new THREE.MeshStandardMaterial({
              color: '#c7dfaa',
              roughness: 0.24,
              metalness: 0.05,
            }),
          ),
      );
      effects.add(line, ball, arrow, pulse, ...droplets);
      return { line, ball, arrow, pulse, droplets };
    });
    const fireTimes = new Map<string, number>();
    let previousTime = -1,
      recordedFrames: CombatFrame[] | null = null;
    let hits: { time: number; hit: CombatFrame['hits'][number] }[] = [];
    let contacts: Contact[] = [];
    function resize() {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const halfW = Math.max(5.7, (4.55 * w) / h),
        halfH = (halfW * h) / w;
      if (camera instanceof THREE.PerspectiveCamera) camera.aspect = w / h;
      else {
        camera.left = -halfW;
        camera.right = halfW;
        camera.top = halfH;
        camera.bottom = -halfH;
      }
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      projectAnchors();
    }
    function projectAnchors() {
      const w = el.clientWidth,
        h = el.clientHeight;
      const a: Anchor[] = [];
      for (let side = 0; side < 2; side++)
        for (let at = 0; at < 9; at++) {
          const points = [
            [-0.45, -0.53],
            [0.45, -0.53],
            [-0.45, 0.53],
            [0.45, 0.53],
          ].map(([x, z]) =>
            new THREE.Vector3(slotX(at) + x, 0.09, sideZ(side) + z).project(
              camera,
            ),
          );
          const xs = points.map((p) => ((p.x + 1) * w) / 2),
            ys = points.map((p) => ((1 - p.y) * h) / 2);
          a.push({
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys),
          });
        }
      latest.current.onAnchors(a);
      const project = (x: number, y: number, z: number): Anchor => {
        const v = new THREE.Vector3(x, y, z).project(camera);
        return { x: ((v.x + 1) * w) / 2, y: ((1 - v.y) * h) / 2, w: 0, h: 0 };
      };
      latest.current.onBoardAnchors?.({
        surfaces: latest.current.chamber?.arena ? [0, 1].flatMap(side =>
          [0, 1, 2].flatMap(lane => [0, 0.5, 1, 1.5, 2].map(column => {
            const x = (lane - 1) * 3.46 + (column - 1) * 0.96;
            return { barrier: project(x, SHOT_HEIGHT, barrierZ(side)),
              core: project(x, side === 0 ? 0.1 : 0.48, coreZ(side)) };
          }))) : undefined,
        barriers: [0, 1].flatMap((side) =>
          [0, 1, 2].map((lane) =>
            project((lane - 1) * 3.46, 0.05 + BARRIER_HEIGHT, barrierZ(side)),
          ),
        ),
        cores: [0, 1].map((side) => project(0, side ? 1.0 : 0.08, coreZ(side))),
        lanes: [0, 1, 2].map((lane) => project((lane - 1) * 3.46, 0.03, 0)),
      });
    }
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    new GLTFLoader().load(
      sitePath(
        `/art-assets/battle-slice/equipment-library-${tactile ? 'v5' : 'v4'}.glb`,
      ),
      (gltf) => {
        if (dead) return;
        for (const child of gltf.scene.children) {
          const model =
            child.name === 'environment' ? compact(child) : child.clone();
          model.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              for (const m of Array.isArray(o.material)
                ? o.material
                : [o.material]) {
                const standard = m as THREE.MeshStandardMaterial;
                if (
                  tactile &&
                  [
                    'Warm walnut',
                    'Leather cushion',
                    'Machined steel',
                    'Worn brass',
                  ].includes(standard.name)
                ) {
                  if (standard.name === 'Warm walnut')
                    standard.color.set('#b7c4cd');
                  if (standard.name === 'Leather cushion')
                    standard.color.set('#bec1b2');
                  const base =
                    standard.name === 'Warm walnut'
                      ? 0.44
                      : standard.name === 'Leather cushion'
                        ? 0.43
                        : 0.3;
                  standard.onBeforeCompile = (shader) => {
                    shader.fragmentShader = shader.fragmentShader.replace(
                      '#include <roughnessmap_fragment>',
                      `#include <roughnessmap_fragment>\nroughnessFactor = ${base} + 0.5 * roughnessFactor;`,
                    );
                  };
                  standard.customProgramCacheKey = () =>
                    `surface-roughness-${base}`;
                }
                for (const texture of [
                  standard.map,
                  standard.normalMap,
                  standard.roughnessMap,
                ])
                  if (texture)
                    texture.anisotropy = Math.min(
                      8,
                      renderer.capabilities.getMaxAnisotropy(),
                    );
              }
              if (child.name === 'environment' && !Array.isArray(o.material)) {
                const material = o.material as THREE.MeshStandardMaterial;
                if (material.name === 'Concrete') material.color.set('#192428');
                if (material.name === 'Blue-black enamel')
                  material.roughness = 0.65;
              }
            }
          });
          templates.set(child.name, model as THREE.Group);
        }
        chamber?.setCabinetModel(templates.get('rubber'));
        const environment = templates.get('environment');
        if (environment && !chamber) scene.add(environment);
        for (let side = 0; side < 2; side++) {
          const host = templates
            .get(side === 0 ? 'hostshadow' : 'hostcreature')
            ?.clone();
          if (!host) continue;
          host.position.set(0, 0, coreZ(side));
          host.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            o.userData.rest = o.position.clone();
            const material = (o.material as THREE.MeshStandardMaterial).clone();
            o.material = material;
            o.geometry = o.geometry.clone();
            o.userData.vertices = Float32Array.from(
              o.geometry.attributes.position.array,
            );
            material.side = THREE.DoubleSide;
            if (side === 0) {
              material.transparent = true;
              material.opacity = 0.95;
              const wounds = { value: new Float32Array(9).fill(100) };
              o.userData.woundUniform = wounds;
              const offset = o.position.x;
              material.onBeforeCompile = (shader) => {
                shader.uniforms.shadowWounds = wounds;
                shader.vertexShader = shader.vertexShader
                  .replace(
                    '#include <common>',
                    '#include <common>\nvarying float shadowX;',
                  )
                  .replace(
                    '#include <begin_vertex>',
                    `#include <begin_vertex>\nshadowX=position.x+${offset.toFixed(6)};`,
                  );
                shader.fragmentShader = shader.fragmentShader
                  .replace(
                    '#include <common>',
                    '#include <common>\nvarying float shadowX; uniform float shadowWounds[9];',
                  )
                  .replace(
                    '#include <color_fragment>',
                    '#include <color_fragment>\nfor(int i=0;i<9;i++){diffuseColor.a *= smoothstep(0.025,0.13,abs(shadowX-shadowWounds[i]));}',
                  );
              };
              material.customProgramCacheKey = () => `shadow-tear-${offset}`;
            } else {
              const wounds = { value: new Float32Array(9).fill(100) };
              const strike = { value: new THREE.Vector2(100, 0) };
              o.userData.woundUniform = wounds;
              o.userData.strikeUniform = strike;
              const offset = o.position.x;
              material.onBeforeCompile = (shader) => {
                shader.uniforms.coreWounds = wounds;
                shader.uniforms.coreStrike = strike;
                shader.vertexShader = shader.vertexShader
                  .replace(
                    '#include <common>',
                    '#include <common>\nvarying float coreX;',
                  )
                  .replace(
                    '#include <begin_vertex>',
                    `#include <begin_vertex>\ncoreX=position.x+${offset.toFixed(6)};`,
                  );
                shader.fragmentShader = shader.fragmentShader
                  .replace(
                    '#include <common>',
                    '#include <common>\nvarying float coreX; uniform float coreWounds[9]; uniform vec2 coreStrike;',
                  )
                  .replace(
                    '#include <color_fragment>',
                    '#include <color_fragment>\nfloat scar=0.;for(int i=0;i<9;i++){scar=max(scar,exp(-pow((coreX-coreWounds[i])/.16,2.)));} diffuseColor.rgb*=1.-scar*.42;',
                  )
                  .replace(
                    '#include <emissivemap_fragment>',
                    '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.34,.11,.07)*coreStrike.y*exp(-pow((coreX-coreStrike.x)/.5,2.));',
                  );
              };
              material.customProgramCacheKey = () => `creature-wound-${offset}`;
            }
          });
          hosts.push(host as THREE.Group);
          scene.add(host);
        }
        loaded = true;
        latest.current.onReady();
      },
      undefined,
      () => {
        if (!dead) setFailure('场景资源加载失败，请刷新重试。');
      },
    );
    const contextLost = (e: Event) => {
      e.preventDefault();
      setFailure('图形上下文已中断，请刷新恢复此独立切片。冒险存档未受影响。');
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    function point(side: number, at: number, size = 1) {
      return new THREE.Vector3(slotX(at, size), SHOT_HEIGHT, sideZ(side));
    }
    let lastRender = performance.now(),
      lastAnchor = 0;
    let studyId = '',
      statsTime = performance.now(),
      statsFrames = 0;
    function animate() {
      if (dead) return;
      id = requestAnimationFrame(animate);
      const p = latest.current,
        t = p.clock.current;
      const signature = JSON.stringify([p.duel.player, p.duel.enemy, p.duel.arena?.amplifiers]);
      if (loaded && signature !== lastSignature) {
        lastSignature = signature;
        ampModules.splice(0).forEach(a=>{scene.remove(a.group);disposeArenaModel(a.group);});
        p.duel.arena?.amplifiers.forEach((row,side)=>row.forEach((id,lane)=>{if(id){const a=arenaAmplifier(id);a.group.position.set((lane-1)*3.46+1.35,0,barrierZ(side));if(side)a.group.rotation.y=Math.PI;scene.add(a.group);ampModules.push({...a,side,lane});}}));
        for (const x of meshes.values()) {
          if (arenaCard(x.card.id)) disposeArenaModel(x.model);
          x.plate.geometry.dispose();
          (x.plate.material as THREE.Material).dispose();
          x.fill.geometry.dispose();
          (x.fill.material as THREE.Material).dispose();
          x.response.geometry.dispose();
          x.response.material.dispose();
          x.parts.forEach(({ object }) => {
            if (object instanceof THREE.Mesh && object.userData.flexVertices)
              object.geometry.dispose();
          });
        }
        equipment.clear();
        meshes.clear();
        [p.duel.player, p.duel.enemy].forEach((cards, side) =>
          cards.forEach((card) => {
            const size = cardDef(card.id).size,
              group = new THREE.Group();
            group.position.copy(point(side, card.at, size));
            group.position.y = 0.09;
            equipment.add(group);
            const plate = box(
              group,
              size * 0.96 - 0.08,
              0.07,
              1.0,
              0,
              0,
              0,
              mat(side ? '#4c4034' : '#344b46', 0.5),
            );
            const fill = box(
              group,
              size * 0.96 - 0.13,
              0.021,
              0.033,
              0,
              0.048,
              0.47,
              new THREE.MeshBasicMaterial({
                color: side ? '#dfad7e' : '#a4d4bd',
              }),
            );
            const arenaKind = arenaCard(card.id)?.kind;
            const proxyFamily =
              arenaKind === 'burn'
                ? 'acid'
                : arenaKind === 'corrode'
                  ? 'distiller'
                  : arenaKind === 'shield'
                    ? 'rubber'
                    : arenaKind === 'heal'
                      ? 'sealant'
                      : arenaKind === 'tempo'
                        ? 'fuse'
                        : arenaKind === 'control'
                          ? 'counterweight'
                          : arenaKind === 'passive'
                            ? 'culture'
                            : 'springbow';
            const spec = arenaCard(card.id);
            const model = spec ? arenaEquipment(spec) : (
              templates.get(cardFamily(card.id)) ??
              templates.get(proxyFamily) ??
              new THREE.Group()
            ).clone();
            model.position.y = 0.04;
            if (side === 1) model.rotation.y = Math.PI;
            group.add(model);
            if (contact) {
              const shadow = new THREE.Mesh(
                new THREE.PlaneGeometry(size * 0.86, 1.02),
                new THREE.MeshBasicMaterial({
                  map: contact,
                  transparent: true,
                  depthWrite: false,
                  opacity: 0.7,
                }),
              );
              shadow.rotation.x = -Math.PI / 2;
              shadow.position.y = 0.043;
              group.add(shadow);
            }
            // Rotate coils around their own centres, not the weapon origin.
            const coils: THREE.Mesh[] = [];
            model.traverse((o) => {
              if (o instanceof THREE.Mesh && /Spiral[ _]spring/.test(o.name))
                coils.push(o);
            });
            model.updateWorldMatrix(true, true);
            for (const coil of coils) {
              coil.geometry.computeBoundingBox();
              const centre = coil.geometry.boundingBox!.getCenter(
                new THREE.Vector3(),
              );
              model.worldToLocal(coil.localToWorld(centre));
              const pivot = new THREE.Group();
              pivot.name = 'Spiral_spring_pivot';
              pivot.position.copy(centre);
              model.add(pivot);
              pivot.attach(coil);
              coil.name = 'CoilGeometry';
            }
            const response = new THREE.Mesh(
              new THREE.RingGeometry(0.32, 0.35, 40),
              new THREE.MeshBasicMaterial({
                color: '#a6e8cb',
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
              }),
            );
            response.rotation.x = -Math.PI / 2;
            response.position.y = 0.16;
            group.add(response);
            const parts: {
              object: THREE.Object3D;
              position: THREE.Vector3;
              rotation: THREE.Euler;
              scale: THREE.Vector3;
            }[] = [];
            model.traverse((object) => {
              if (object === model) return;
              if (
                object instanceof THREE.Mesh &&
                /Elastic|Bow[ _]string/.test(object.name)
              ) {
                object.geometry = object.geometry.clone();
                object.userData.flexVertices = Float32Array.from(
                  object.geometry.attributes.position.array,
                );
              }
              parts.push({
                object,
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone(),
              });
            });
            meshes.set(card.uid, {
              group,
              model,
              plate,
              fill,
              card,
              side,
              parts,
              response,
            });
          }),
        );
      }
      if (recordedFrames !== p.frames) {
        recordedFrames = p.frames;
        hits = p.frames.flatMap((f) =>
          f.hits.map((hit) => ({ time: f.time, hit })),
        );
        contacts = surfaceEvents(p.frames).map((event) => {
          const source = meshes.get(event.sourceUid ?? '');
          return {
            ...event,
            x:
              event.kind === 'death'
                ? 0
                : event.kind === 'break' || !source
                  ? (event.lane - 1) * 3.46
                  : impactX(source.card, event.lane),
          };
        });
        fireTimes.clear();
        previousTime = -1;
      }
      if (t < previousTime) {
        fireTimes.clear();
        previousTime = -1;
      }
      for (const frame of p.frames) {
        if (frame.time > t) break;
        if (frame.time <= previousTime) continue;
        for (const uid of frame.fired) fireTimes.set(uid, frame.time);
        if (p.duel.arena) for (const link of (frame as ArenaFrame).links ?? []) fireTimes.set(link.to, frame.time);
      }
      previousTime = t;
      ampModules.forEach(a=>{const active=(p.frame as ArenaFrame).amplifierActive?.[a.side]?.[a.lane];a.lamp.emissiveIntensity=active?.8:0;a.lamp.color.set(active?'#e3c98e':'#4b574d');});
      hosts.forEach((host, side) => {
        host.visible = !p.reward;
        const ratio = Math.max(0, p.frame.hp[side] / p.frames[0].hp[side]);
        const death = contacts.find(
          (x) => x.side === side && x.kind === 'death' && x.time <= t,
        );
        const collapse = death
          ? p.reduced
            ? 1
            : Math.min(1, (t - death.time) / 1.2)
          : 0;
        const impact = hits.findLast(
          (x) =>
            x.time <= t &&
            t - x.time < 0.5 &&
            x.hit.side === side &&
            (x.hit.healthLoss ?? 0) > 0,
        );
        const age = impact ? (t - impact.time) / 0.5 : 1;
        const kick = p.reduced ? 0 : Math.sin(age * Math.PI * 5) * (1 - age);
        host.position.x = 0;
        host.rotation.z = 0;
        const hitSource = impact && meshes.get(impact.hit.sourceUid ?? '');
        const hitX = hitSource
          ? impactX(
              hitSource.card,
              impact?.hit.targetLane ?? Math.floor(hitSource.card.at / 3),
            )
          : 0;
        const wounds = hits
          .filter(
            (x) =>
              x.time <= t && x.hit.side === side && (x.hit.healthLoss ?? 0) > 0,
          )
          .map((x) => {
            const source = meshes.get(x.hit.sourceUid ?? '');
            return source
              ? impactX(
                  source.card,
                  x.hit.targetLane ?? Math.floor(source.card.at / 3),
                )
              : 0;
          });
        host.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const m = o.material as THREE.MeshStandardMaterial;
          const rest = o.userData.rest as THREE.Vector3;
          o.position.copy(rest);
          if (side === 1) o.position.y *= 1 - collapse * 0.86;
          if (side === 1) {
            m.emissive.set('#5a3840');
            m.emissiveIntensity = 0;
            (o.userData.strikeUniform as { value: THREE.Vector2 }).value.set(
              hitX,
              impact && !p.reduced ? (1 - age) * 1.5 : 0,
            );
            const scars = o.userData.woundUniform as { value: Float32Array };
            scars.value.fill(100);
            [...new Set(wounds)]
              .slice(0, 9)
              .forEach((x, i) => (scars.value[i] = x));
            m.color.lerpColors(
              new THREE.Color('#615663'),
              new THREE.Color('#645c69'),
              ratio,
            );
            if (collapse) m.color.lerp(new THREE.Color('#34333c'), collapse);
          } else {
            m.opacity =
              ratio === 0 ? 0.35 * (1 - collapse) : 0.35 + ratio * 0.6;
            const uniform = o.userData.woundUniform as { value: Float32Array };
            uniform.value.fill(100);
            [...new Set(wounds)]
              .slice(0, 9)
              .forEach((x, i) => (uniform.value[i] = x));
          }
          const vertices = o.userData.vertices as Float32Array;
          const poseKey = `${t}/${ratio}/${p.reduced}/${wounds.join(',')}`;
          if (o.userData.poseKey === poseKey) return;
          o.userData.poseKey = poseKey;
          const positions = o.geometry.attributes
            .position as THREE.BufferAttribute;
          for (let i = 0; i < positions.count; i++) {
            const x = vertices[i * 3],
              y = vertices[i * 3 + 1],
              z = vertices[i * 3 + 2];
            const worldX = x + rest.x;
            const local = Math.exp(-Math.pow((worldX - hitX) / 0.48, 2));
            const scar = wounds.reduce(
              (v, w) =>
                Math.max(v, Math.exp(-Math.pow((worldX - w) / 0.19, 2))),
              0,
            );
            const lane = Math.max(
              0,
              Math.min(2, Math.round(worldX / 3.46) + 1),
            );
            const exposed = p.frame.barriers[side][lane].broken && ratio > 0;
            const breath =
              p.reduced || ratio === 0
                ? 0
                : Math.sin(t * (exposed ? 2.1 : 1.2) + worldX * 0.7) *
                  (exposed ? 0.045 : 0.022);
            positions.setXYZ(
              i,
              x,
              y *
                (side === 1
                  ? (ratio === 0
                      ? 1 - collapse * 0.86
                      : 1 - scar * 0.18 - local * Math.abs(kick) * 0.4) + breath
                  : 1),
              z + (side === 1 && exposed ? 0.12 : 0),
            );
            if (side === 1 && !p.reduced)
              positions.setZ(
                i,
                z +
                  (exposed ? 0.12 : 0) +
                  local * kick * 0.1 +
                  Math.sin(worldX * 3 + t * 2) *
                    collapse *
                    (1 - collapse) *
                    0.15,
              );
            if (side === 0) {
              positions.setY(i, y - scar * 0.13);
              positions.setZ(
                i,
                z + (p.reduced ? 0 : scar * Math.sin(t * 2 + worldX) * 0.022),
              );
            }
          }
          positions.needsUpdate = true;
          o.geometry.computeVertexNormals();
        });
      });
      laneSurfaces.forEach((surface, lane) => {
        const exposed = p.frame.barriers.some((side) => side[lane].broken);
        surface.material.color.set(exposed ? '#b16e50' : '#b8b79b');
        surface.material.opacity =
          lane === p.focusLane ? 0.14 : exposed ? 0.075 : 0.025;
      });
      for (const b of barriers) {
        const value = p.frame.barriers[b.side][b.lane];
        b.mesh.visible = !value.broken;
        b.glow.visible = !value.broken;
        // Damage never shrinks coverage: every slot still hits the full lane face.
        const health = value.hp / value.maxHp;
        const material = b.mesh.material as THREE.ShaderMaterial;
        material.uniforms.health.value = health;
        material.uniforms.time.value = p.reduced ? 0 : t;
        const recent = contacts
          .filter(
            (x) =>
              x.side === b.side &&
              x.lane === b.lane &&
              ['impact', 'repair', 'block'].includes(x.kind) &&
              x.time <= t &&
              t - x.time < 0.85,
          )
          .slice(-4);
        const uniforms = material.uniforms.contacts.value as THREE.Vector3[];
        uniforms.forEach((u, i) =>
          u.set(
            recent[i] ? recent[i].x - (b.lane - 1) * 3.46 : 0,
            recent[i] && !p.reduced ? t - recent[i].time : 99,
            recent[i]?.kind === 'repair' ? 1 : 0,
          ),
        );
        (b.glow.material as THREE.MeshBasicMaterial).color
          .set(b.side ? '#f1b97f' : '#a7e6cf')
          .multiplyScalar(0.3 + health * 0.7);
      }
      for (const [uid, m] of meshes) {
        const dt = t - (fireTimes.get(uid) ?? -100),
          kick =
            !p.reduced && dt >= 0 && dt < 0.3
              ? Math.sin((dt / 0.3) * Math.PI)
              : 0;
        const family = cardFamily(m.card.id);
        const direction = m.side === 0 ? 1 : -1;
        m.model.position.set(
          0,
          0.04 + kick * (family === 'gapblade' ? 0.24 : 0.035),
          kick * direction * 0.1,
        );
        m.model.rotation.set(
          kick * direction * -0.12,
          m.side === 1 ? Math.PI : 0,
          family === 'gapblade'
            ? kick * 0.9
            : family === 'sealant'
              ? kick * 0.14
              : 0,
        );
        const cd = p.frame.cd[m.side][m.card.at] || cardDef(m.card.id).cd;
        const af = p.duel.arena ? p.frame as ArenaFrame : undefined;
        const rate = af?.freeze[uid] ? 0 : (af?.haste[uid] ? 2 : 1) * (af?.slow[uid] ? 0.5 : 1);
        const progress = cd ? Math.min(
          1,
          ((p.frame.timers[m.side][m.card.at] ?? 0) +
            Math.min(0.25, Math.max(0, t - p.frame.time)) * rate) /
            cd,
        ) : 0;
        for (const part of m.parts) {
          const o = part.object;
          o.position.copy(part.position);
          o.rotation.copy(part.rotation);
          o.scale.copy(part.scale);
          const name = o.name;
          // Parts retain their Blender local transforms; mirror via the model root.
          const motion = p.reduced ? 0 : progress;
          if (name === 'arena-rotor') o.rotation.z += motion * Math.PI * 2;
          if (name === 'arena-valve') o.rotation.y += motion * .7;
          if (name === 'arena-piston') o.position.y += motion * .035 - kick * .06;
          if (name === 'arena-resonator') o.rotation.x += kick * .25;
          if (name === 'arena-barrel') o.position.z += kick * .09;
          if (o instanceof THREE.Mesh && o.userData.flexVertices) {
            const vertices = o.userData.flexVertices as Float32Array;
            const positions = o.geometry.attributes
              .position as THREE.BufferAttribute;
            const half = family === 'slingshot' ? 0.26 : 0.67;
            for (let i = 0; i < positions.count; i++) {
              const weight = Math.pow(
                Math.max(0, 1 - Math.abs(vertices[i * 3]) / half),
                2,
              );
              positions.setZ(
                i,
                vertices[i * 3 + 2] + weight * (motion * 0.18 - kick * 0.12),
              );
            }
            positions.needsUpdate = true;
          }
          if (/Spiral[ _]spring/.test(name))
            o.rotation.y += motion * 0.7 - kick * 0.25;
          if (/bow[ _]limb/.test(name))
            o.scale.z *= 0.92 + motion * 0.12 - kick * 0.06;
          if (/Loaded[ _]bolt|Pellet/.test(name))
            o.visible = dt > 0.4 || dt < 0;
          if (/Pellet/.test(name)) o.position.z += motion * 0.18;
          if (/Spout|Handle/.test(name) && family === 'sealant')
            o.position.y += kick * 0.06;
        }
        const padHit = hits.findLast(
          (x) =>
            x.time <= t &&
            t - x.time < 0.4 &&
            x.hit.side === m.side &&
            x.hit.targetLane === Math.floor(m.card.at / 3) &&
            (x.hit.blocked ?? 0) > 0,
        );
        m.model.scale.y =
          cardFamily(m.card.id) === 'rubber' && padHit && !p.reduced
            ? 1 - Math.sin(((t - padHit.time) / 0.4) * Math.PI) * 0.25
            : 1;
        if (family === 'rubber') {
          const squeeze =
            padHit && !p.reduced ? pulseAt(t, padHit.time, 0.4) : 0;
          m.model.scale.x = 1 + squeeze * 0.1;
          m.model.scale.z = 1 + squeeze * 0.1;
          m.model.position.y += kick * 0.08;
        }
        const responding =
          family === 'rubber' && padHit ? pulseAt(t, padHit.time, 0.6) : 0;
        m.response.visible = responding > 0 && !p.reduced;
        m.response.material.opacity = responding * 0.65;
        m.response.scale.setScalar(1.1 + responding * 0.65);
        m.fill.scale.x = Math.max(
          0.015,
          Math.min(1, (p.frame.timers[m.side][m.card.at] ?? 0) / cd),
        );
        const plateMat = m.plate.material as THREE.MeshStandardMaterial;
        plateMat.emissive.set(
          uid === p.placed
            ? '#6ba891'
            : uid === p.selected
              ? '#776037'
              : Math.floor(m.card.at / 3) === p.focusLane
                ? '#323726'
                : '#000000',
        );
        plateMat.emissiveIntensity = uid === p.placed ? 0.75 : 0.4;
      }
      fxLines.forEach((x) => {
        x.line.visible = false;
        x.ball.visible = false;
        x.arrow.visible = false;
        x.pulse.visible = false;
        x.droplets.forEach((d) => (d.visible = false));
      });
      const active = p.frame.projectiles
        .filter(
          (q) =>
            p.frame.hp.every((h) => h > 0) &&
            q.launchedAt <= t &&
            q.impactAt > t,
        )
        .slice(0, 32);
      active.forEach((q, i) => {
        const source = meshes.get(q.sourceUid ?? '');
        if (!source) return;
        const from = point(
            source.side,
            source.card.at,
            cardDef(source.card.id).size,
          ),
          enemy =
            q.kind === 'damage' || q.kind === 'corrode' || q.kind === 'burn';
        const target = meshes.get(q.targetUid ?? '');
        const side = q.side;
        // Use the resolved event so another projectile breaking the barrier in
        // flight cannot bend this trajectory halfway through its flight.
        const resolved = hits.find(
          (x) =>
            x.time === q.impactAt &&
            x.hit.sourceUid === q.sourceUid &&
            x.hit.kind === q.kind &&
            (q.kind === 'shield' || x.hit.targetLane === q.targetLane),
        );
        const lane =
          resolved?.hit.targetLane ??
          q.targetLane ??
          Math.floor(source.card.at / 3);
        const broken = resolved
          ? (resolved.hit.healthLoss ?? 0) > 0 &&
            !(resolved.hit.barrierAbsorbed ?? 0)
          : p.frame.barriers[side][lane].broken;
        const to = target
          ? point(side, target.card.at, cardDef(target.card.id).size)
          : new THREE.Vector3(
              impactX(source.card, lane),
              enemy && broken ? (side === 0 ? 0.1 : 0.48) : SHOT_HEIGHT,
              enemy && broken ? coreZ(side) : barrierZ(side),
            );
        const progress = Math.max(
          0,
          Math.min(1, (t - q.launchedAt) / (q.impactAt - q.launchedAt)),
        );
        const pos = from.clone().lerp(to, progress);
        // Straight shot: no artificial arc or attraction toward lane centre.
        const tail = from.clone().lerp(to, Math.max(0, progress - 0.11));
        tail.y = pos.y;
        const fx = fxLines[i];
        const family = cardFamily(source.card.id);
        const isArrow = enemy && family === 'springbow';
        fx.ball.visible = enemy && !isArrow;
        fx.arrow.visible = isArrow;
        fx.pulse.visible = !enemy && family !== 'sealant';
        fx.line.visible = enemy || family === 'sealant';
        fx.droplets.forEach((drop, j) => {
          const trail = progress - j * 0.045;
          drop.visible = !enemy && family === 'sealant' && trail >= 0;
          drop.position.copy(from).lerp(to, Math.max(0, trail));
          drop.scale.setScalar(0.65 - j * 0.1);
        });
        fx.ball.position.copy(pos);
        fx.ball.rotation.set(t * 6, t * 9, progress * 4);
        fx.arrow.position.copy(pos);
        fx.arrow.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          to.clone().sub(from).normalize(),
        );
        fx.pulse.position.copy(pos);
        fx.pulse.rotation.x = Math.PI / 2;
        fx.pulse.scale.setScalar(0.7 + Math.sin(progress * Math.PI) * 0.6);
        (fx.line.geometry.attributes.position as THREE.BufferAttribute)
          .setXYZ(0, tail.x, tail.y, tail.z)
          .setXYZ(1, pos.x, pos.y, pos.z).needsUpdate = true;
        const color = q.kind === 'burn' ? '#ff9b54' : q.kind === 'corrode' ? '#b6d65b' : q.kind === 'freeze' ? '#a9e4f8' : enemy ? '#f6c678' : '#c7dfaa';
        fx.ball.material.color.set(color);
        (fx.line.material as THREE.LineBasicMaterial).color.set(color);
        (fx.line.material as THREE.LineBasicMaterial).opacity = isArrow
          ? 0.55
          : 0.16;
        (fx.pulse.material as THREE.MeshBasicMaterial).color.set(
          family === 'sealant' ? '#cad49a' : '#87d5c0',
        );
      });
      impactEffects.update(
        t,
        contacts,
        p.reduced,
        new Set(
          [...meshes]
            .filter(([, m]) => cardFamily(m.card.id) === 'gapblade')
            .map(([uid]) => uid),
        ),
      );
      effects.visible = !p.reward;
      if (p.reward && loaded) {
        if (rewardId !== p.reward) {
          rewardId = p.reward;
          const model = templates.get(cardFamily(p.reward))?.clone();
          if (model) {
            model.name = 'reward-showcase';
            model.position.set(0, 1.8, 0);
            model.scale.setScalar(2.5);
            scene.add(model);
          }
        }
        const model = scene.getObjectByName('reward-showcase');
        if (model) {
          model.rotation.y = p.reduced ? 0 : performance.now() / 4500;
          model.visible = true;
        }
        equipment.visible = false;
        table.visible = false;
      } else {
        const model = scene.getObjectByName('reward-showcase');
        if (model) model.visible = false;
        equipment.visible = true;
        table.visible = true;
      }
      if (chamber && p.chamber && camera instanceof THREE.PerspectiveCamera) {
        const neutral = !!p.chamber.neutral;
        ambient.intensity = neutral ? 1.1 : tactile ? 0.5 : 0.55;
        ambient.color.set(neutral ? '#f1f3ef' : '#8b8768');
        key.intensity = neutral ? 1.7 : tactile ? 0.8 : 0.6;
        key.color.set(neutral ? '#ffffff' : '#fff1d9');
        scene.environmentIntensity = neutral ? 0.55 : 0.25;
        const requested = p.chamber.study;
        const oldStudy = scene.getObjectByName('material-study-object');
        if (requested && requested !== studyId && loaded) {
          if (oldStudy) scene.remove(oldStudy);
          const specimen = templates.get(requested)?.clone();
          if (specimen) {
            specimen.name = 'material-study-object';
            specimen.scale.setScalar(2.7);
            specimen.position.set(0, 0.03, 2);
            scene.add(specimen);
            studyId = requested;
          }
        }
        const specimen = scene.getObjectByName('material-study-object');
        if (specimen) specimen.visible = !!requested;
        if (requested) {
          equipment.visible = false;
          table.visible = false;
        }
        hosts.forEach((host) => {
          host.visible = !requested;
        });
        const now = performance.now(),
          dt = Math.min(0.08, (now - lastRender) / 1000);
        lastRender = now;
        const settled = chamber.update(camera, p.chamber, dt, p.reduced);
        if (now - lastAnchor > 65) {
          lastAnchor = now;
          projectAnchors();
          p.onRoomPoints?.(
            chamber.points(p.chamber).map(({ id, p: point }) => {
              const v = new THREE.Vector3(...point).project(camera);
              return {
                id,
                x: ((v.x + 1) * el.clientWidth) / 2,
                y: ((1 - v.y) * el.clientHeight) / 2,
              };
            }),
            settled,
          );
        }
      }
      if (p.renderStyle) {
        postProcess ??= new StylePostProcess(renderer);
        postProcess.render(scene, camera, p.renderStyle);
      } else renderer.render(scene, camera);
      statsFrames++;
      const statsNow = performance.now();
      if (statsNow - statsTime > 2500) {
        p.onStats?.(
          `${((statsNow - statsTime) / statsFrames).toFixed(1)} ms/帧 · ${renderer.info.render.calls} 次绘制 · ${renderer.info.memory.textures} 张纹理`,
        );
        statsFrames = 0;
        statsTime = statsNow;
      }
    }
    animate();
    return () => {
      dead = true;
      cancelAnimationFrame(id);
      observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh ||
          o instanceof THREE.Line ||
          o instanceof THREE.Points
        ) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      chamber?.dispose();
      contact?.dispose();
      environmentMap?.dispose();
      // GLB image textures are shared by clones, so release each exactly once.
      const loadedTextures = new Set<THREE.Texture>();
      templates.forEach((root) =>
        root.traverse((o) => {
          if (o instanceof THREE.Mesh)
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              for (const value of Object.values(m))
                if (value instanceof THREE.Texture) loadedTextures.add(value);
        }),
      );
      loadedTextures.forEach((t) => t.dispose());
      postProcess?.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [immersive, tactile]);
  return (
    <div className="slice-canvas" ref={mount}>
      {failure && (
        <div className="slice-error" role="alert">
          {failure}
        </div>
      )}
    </div>
  );
}
