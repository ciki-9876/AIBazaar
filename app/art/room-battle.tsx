'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CSS3DObject,
  CSS3DRenderer,
} from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { combatValue } from '@/lib/demo-card-rules';
import { flightProgress } from './playback';
import type { CombatFrame, Duel, FighterCard } from '@/lib/demo-combat';
import { cardDef } from '@/lib/demo-cards';
import { ATLAS, KIND, cardPosition } from './art-data';

type Props = {
  duel: Duel;
  frame: CombatFrame;
  frames: CombatFrame[];
  playbackTime: { current: number };
  entry: number;
  countdown: number;
  view: 'tactical' | 'seat';
  reduced: boolean;
  selected?: string;
  onSelect: (card: FighterCard) => void;
};
type CardMesh = {
  card: FighterCard;
  side: number;
  group: THREE.Group;
  plate: THREE.Mesh;
  fill: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  face: CSS3DObject;
  cooldownText: HTMLElement;
};
export default function RoomBattle(props: Props) {
  const mount = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    labels = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      queueMicrotask(() => setError(true));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', '可点击的三维战斗桌面');
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    function onLost(event: Event) {
      event.preventDefault();
      setError(true);
    }
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.domElement.className = 'art-card-text-layer';
    el.appendChild(cssRenderer.domElement);
    const textScene = new THREE.Scene();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111d20');
    scene.fog = new THREE.FogExp2('#16292c', 0.042);
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 70);
    camera.position.set(-2.8, 12.7, 0);
    camera.lookAt(0, 1.4, 0);
    const ambient = new THREE.HemisphereLight('#b0d9d9', '#3d3529', 2);
    scene.add(ambient);
    const lamp = new THREE.SpotLight('#ffdc91', 115, 28, 0.85, 0.62, 1.4);
    lamp.position.set(-1, 9, 1);
    lamp.target.position.set(0, 1.5, 0);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.001;
    scene.add(lamp, lamp.target);
    const rim = new THREE.PointLight('#63bdc2', 48, 17, 1.5);
    rim.position.set(5, 4, -4);
    scene.add(rim);
    const red = new THREE.PointLight('#e99051', 20, 10, 1.6);
    red.position.set(-5, 3, 2);
    scene.add(red);
    const resources: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    function mat(color: string, metal = 0.1, rough = 0.7) {
      const m = new THREE.MeshStandardMaterial({
        color,
        metalness: metal,
        roughness: rough,
        flatShading: true,
      });
      materials.push(m);
      return m;
    }
    const steel = mat('#354a4b', 0.7, 0.6),
      dark = mat('#1b282c', 0.5, 0.7),
      enamel = mat('#53686a', 0.45, 0.62),
      ochre = mat('#bc9151', 0.35, 0.65),
      black = mat('#20292a', 0.15, 0.88),
      glove = mat('#6a6c58', 0.0, 0.95),
      fabric = mat('#44565a', 0.0, 0.9);
    function box(
      w: number,
      h: number,
      d: number,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent: THREE.Object3D = scene,
    ) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    function cylinder(
      r: number,
      h: number,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent: THREE.Object3D = scene,
    ) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    function beam(
      a: THREE.Vector3,
      b: THREE.Vector3,
      r: number,
      m: THREE.Material,
      parent: THREE.Object3D = scene,
    ) {
      const mesh = cylinder(r, a.distanceTo(b), m, 0, 0, 0, parent);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        b.clone().sub(a).normalize(),
      );
      return mesh;
    }
    const glow = new THREE.MeshBasicMaterial({ color: '#efcd8a' });
    materials.push(glow);
    // A compact, modular industrial room. Geometry is the actual game world.
    box(17, 0.2, 13, dark, 0, -0.12, 0);
    box(17, 8, 0.22, enamel, 0, 3.8, -6.3);
    box(0.22, 8, 13, steel, 8, 3.8, 0);
    for (let i = -7; i <= 7; i += 2) {
      box(0.045, 7, 0.1, steel, i, 3.5, -6.12);
      box(0.05, 0.01, 12, steel, i, 0, 0);
    }
    for (let z = -5; z <= 5; z += 2) box(16, 0.015, 0.04, steel, 0, 0, z);
    box(3.2, 4.6, 0.25, dark, -3.6, 2.3, -6.04);
    box(1.4, 4.3, 0.15, steel, -4.4, 2.2, -5.88);
    box(1.4, 4.3, 0.15, steel, -2.85, 2.2, -5.88);
    box(2.6, 0.09, 0.2, glow, -3.6, 4.85, -5.8);
    box(0.3, 0.7, 0.2, ochre, -5.5, 2.5, -5.8);
    // Raised cable trays, exposed pipework and a fluorescent pool of light.
    for (const z of [-5.5, -4.95]) {
      const pipe = cylinder(0.075, 15, steel, 0, 5.5, z);
      pipe.rotation.z = Math.PI / 2;
    }
    const overhead = new THREE.Group();
    scene.add(overhead);
    box(3, 0.18, 0.7, dark, 0, 6.4, 0, overhead);
    box(2.7, 0.035, 0.4, glow, 0, 6.29, 0, overhead);
    cylinder(0.025, 2.5, dark, 0, 7.7, 0, overhead);
    for (const x of [-6, 6]) {
      box(1.2, 2.8, 1.2, steel, x, 1.4, -3.8);
      for (let y = 0.5; y < 2.6; y += 0.4)
        box(0.88, 0.04, 0.035, black, x, y, -3.17);
    }
    // Physical table, inset playing surface, rails and bolts.
    box(8.2, 0.3, 6.3, steel, 0, 1.5, 0);
    box(7.65, 0.09, 5.85, black, 0, 1.7, 0);
    for (const x of [-3.8, 3.8])
      for (const z of [-2.7, 2.7]) {
        box(0.18, 1.5, 0.18, dark, x, 0.75, z);
        cylinder(0.052, 0.025, ochre, x, 1.82, z);
      }
    for (const x of [-4, 4]) box(0.08, 0.14, 6.2, ochre, x, 1.7, 0);
    for (const z of [-3, 3]) box(8, 0.14, 0.08, ochre, 0, 1.7, z);
    for (const z of [-2.72, -0.9, 0.9, 2.72])
      box(7.1, 0.012, 0.025, enamel, 0, 1.762, z);
    for (const x of [-3.5, -2.55, -1.65, -0.72, 0.72, 1.65, 2.55, 3.5])
      box(0.015, 0.012, 5.2, steel, x, 1.765, 0);
    for (let z = -2.6; z < 2.8; z += 0.3)
      box(0.2, 0.015, 0.1, ochre, 0, 1.77, z);
    // Seated host opposite the player's physical seat.
    function person(x: number, enemy: boolean) {
      const group = new THREE.Group();
      scene.add(group);
      group.position.x = x;
      box(0.62, 0.6, 1.15, fabric, 0, 1.55, 0, group);
      const torso = box(
        0.7,
        1.1,
        1.12,
        enemy ? black : fabric,
        0,
        2.35,
        0,
        group,
      );
      torso.rotation.z = enemy ? 0.12 : -0.1;
      for (const z of [-0.39, 0.39]) {
        box(1, 0.35, 0.35, fabric, enemy ? -0.25 : 0.25, 1.3, z, group);
        box(0.3, 1, 0.3, black, enemy ? -0.75 : 0.75, 0.8, z, group);
      }
      for (const z of [-0.76, 0.76]) {
        beam(
          new THREE.Vector3(0, 2.7, z * 0.65),
          new THREE.Vector3(enemy ? -0.5 : 0.5, 1.95, z),
          0.17,
          fabric,
          group,
        );
        beam(
          new THREE.Vector3(enemy ? -0.5 : 0.5, 1.95, z),
          new THREE.Vector3(enemy ? -1.18 : 1.18, 1.96, z * 0.85),
          0.14,
          fabric,
          group,
        );
        const hand = box(
          0.44,
          0.16,
          0.26,
          glove,
          enemy ? -1.26 : 1.26,
          1.96,
          z * 0.85,
          group,
        );
        hand.rotation.y = enemy ? 0.12 : -0.12;
        for (let n = 0; n < 4; n++)
          box(
            0.19,
            0.08,
            0.045,
            glove,
            enemy ? -1.46 : 1.46,
            1.93,
            z * 0.85 - 0.08 + n * 0.052,
            group,
          );
      }
      if (enemy) {
        cylinder(0.28, 0.58, glove, 0, 3.18, 0, group);
        const hood = new THREE.Mesh(
          new THREE.SphereGeometry(0.37, 9, 7),
          black,
        );
        hood.scale.set(0.94, 1.12, 1.05);
        hood.position.set(0.08, 3.24, 0);
        group.add(hood);
        box(0.06, 0.16, 0.38, mat('#7b9290', 0.65, 0.22), -0.3, 3.24, 0, group);
        cylinder(0.11, 0.08, dark, -0.32, 3.02, 0, group).rotation.z =
          Math.PI / 2;
      }
      box(0.35, 1.2, 1.1, steel, enemy ? 0.5 : -0.5, 1.7, 0, group);
      return group;
    }
    person(5, true);
    person(-5, false);
    // Table-side meter housing and inspection tablet.
    box(0.8, 0.24, 0.8, enamel, -4.55, 1.88, 2.36);
    box(0.62, 0.02, 0.38, mat('#bad4b5', 0.2, 0.4), -4.55, 2.01, 2.3);
    for (let z = 2.1; z < 2.6; z += 0.15)
      box(0.4, 0.021, 0.025, black, -4.55, 2.025, z);
    const cardMeshes: CardMesh[] = [];
    const pickables: THREE.Object3D[] = [];
    function cardFace(card: FighterCard, side: number, width: number) {
      const d = cardDef(card.id),
        element = document.createElement('button');
      element.type = 'button';
      element.className = `art-physical-card side-${side}${d.size === 1 ? ' compact' : ''}`;
      element.style.width = '320px';
      element.style.height = `${((width - 0.045) / 1.46) * 320}px`;
      element.setAttribute(
        'aria-label',
        `${side ? '敌方' : '我方'} ${d.name}，查看卡牌`,
      );
      element.addEventListener('click', () => latest.current.onSelect(card));
      const header = document.createElement('div');
      header.className = 'art-card-caption';
      const name = document.createElement('strong');
      name.textContent = d.name;
      const rarity = document.createElement('span');
      rarity.textContent = '·'.repeat(card.rarity + 1);
      header.appendChild(name);
      header.appendChild(rarity);
      const art = document.createElement('div');
      art.className = 'art-card-illustration';
      art.setAttribute('aria-hidden', 'true');
      const index = ATLAS[card.id] ?? 0;
      art.style.backgroundPosition = `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`;
      const footer = document.createElement('div');
      footer.className = 'art-card-numbers';
      const value = document.createElement('b');
      value.textContent = `${combatValue(card.id, card.level, card.quality)} ${KIND[d.kind] ?? '效果'}`;
      const cooldownText = document.createElement('span');
      cooldownText.textContent = `${d.cd}s`;
      footer.appendChild(value);
      footer.appendChild(cooldownText);
      const meta = document.createElement('small');
      meta.textContent = `Lv.${card.level} / ${d.size} 格`;
      [header, art, footer, meta].forEach((child) =>
        element.appendChild(child),
      );
      const face = new CSS3DObject(element);
      face.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
      face.scale.setScalar(1.46 / 320);
      textScene.add(face);
      return { face, cooldownText };
    }
    [props.duel.player, props.duel.enemy].forEach((board, side) =>
      board.forEach((card) => {
        const pos = cardPosition(card, side),
          group = new THREE.Group();
        scene.add(group);
        group.position.set(pos.x, 1.8, pos.z);
        box(pos.width, 0.095, 1.52, side ? dark : enamel, 0, 0, 0, group);
        const material = mat(side ? '#283d39' : '#435448', 0.35, 0.48);
        const { face, cooldownText } = cardFace(card, side, pos.width);
        for (const z of [-0.72, 0.72])
          box(pos.width, 0.025, 0.025, ochre, 0, 0.061, z, group);
        const plate = new THREE.Mesh(
          new THREE.PlaneGeometry(pos.width - 0.045, 1.46),
          material,
        );
        plate.rotation.x = -Math.PI / 2;
        plate.position.y = 0.055;
        plate.userData.card = card;
        group.add(plate);
        pickables.push(plate);
        box(0.055, 0.025, 1.34, black, -pos.width / 2 + 0.09, 0.068, 0, group);
        const fill = box(
          0.055,
          0.03,
          1.34,
          ochre,
          -pos.width / 2 + 0.09,
          0.071,
          0,
          group,
        );
        cardMeshes.push({
          card,
          side,
          group,
          plate,
          fill,
          material,
          face,
          cooldownText,
        });
      }),
    );
    const barriers: {
      mesh: THREE.Mesh;
      side: number;
      lane: number;
      material: THREE.MeshStandardMaterial;
      label: HTMLSpanElement;
    }[] = [];
    for (const side of [0, 1])
      for (const lane of [0, 1, 2]) {
        const x = side ? 0.48 : -0.48,
          z = (lane - 1) * 1.8;
        box(0.12, 0.08, 1.59, enamel, x, 1.82, z);
        const m = new THREE.MeshStandardMaterial({
          color: '#9dc2aa',
          emissive: '#3c6851',
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.65,
          roughness: 0.25,
          metalness: 0.3,
        });
        materials.push(m);
        const mesh = box(0.055, 0.45, 1.48, m, x, 2.08, z);
        const label = document.createElement('span');
        label.className = 'art-room-barrier-label';
        labels.current?.appendChild(label);
        barriers.push({ mesh, side, lane, material: m, label });
      }
    const projectilePool = new Map<string, THREE.Group>();
    const freeProjectiles: THREE.Group[] = [];
    const projectileMat: Record<string, THREE.MeshBasicMaterial> = {};
    for (const [k, v] of Object.entries({
      damage: '#ffd899',
      corrode: '#bded75',
      charge: '#72d7ef',
      heal: '#9be0b3',
      shield: '#bdd4ec',
      energy: '#f5cd82',
    })) {
      projectileMat[k] = new THREE.MeshBasicMaterial({ color: v });
      materials.push(projectileMat[k]);
    }
    const sparkGeometry = new THREE.SphereGeometry(0.065, 6, 4);
    const hitGeometry = new THREE.RingGeometry(0.09, 0.12, 12);
    const hits: THREE.Mesh[] = [];
    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(hitGeometry, projectileMat.damage);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      hits.push(mesh);
    }
    const pointer = new THREE.Vector2(),
      ray = new THREE.Raycaster();
    function select(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(pickables)[0];
      if (hit) latest.current.onSelect(hit.object.userData.card);
    }
    renderer.domElement.addEventListener('pointerup', select);
    function resize() {
      const width = el!.clientWidth,
        height = el!.clientHeight;
      renderer.setSize(width, height);
      cssRenderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let seenEntry = latest.current.entry,
      entryStart = -10000,
      lastTick = performance.now();
    const look = new THREE.Vector3(0, 1.45, 0),
      targetLook = new THREE.Vector3(),
      projected = new THREE.Vector3();
    function at(
      uid: string | undefined,
      side: number,
      lane: number,
      host = false,
    ): THREE.Vector3 {
      if (host)
        return new THREE.Vector3(side ? 4.8 : -4.8, 2.1, (lane - 1) * 1.8);
      const c = cardMeshes.find((m) => m.card.uid === uid);
      if (c) return c.group.position.clone().add(new THREE.Vector3(0, 0.28, 0));
      return new THREE.Vector3(
        latest.current.frame.barriers[side][lane].broken
          ? side
            ? 4.8
            : -4.8
          : side
            ? 0.48
            : -0.48,
        2.1,
        (lane - 1) * 1.8,
      );
    }
    renderer.setAnimationLoop((now: number) => {
      const p = latest.current,
        visualTime = p.playbackTime.current,
        f =
          p.frames[
            Math.min(Math.floor((visualTime + 1e-9) * 4), p.frames.length - 1)
          ] ?? p.frame,
        dt = Math.min(0.06, (now - lastTick) / 1000);
      lastTick = now;
      if (p.entry !== seenEntry) {
        seenEntry = p.entry;
        entryStart = now;
        if (!p.reduced && p.countdown > 3) {
          camera.position.set(-6.35, 3.45, 0.18);
          look.set(0.4, 1.77, 0);
        }
      }
      let seat = p.view === 'seat' ? 1 : 0;
      if (p.countdown > 3 && !p.reduced) {
        const t = Math.max(
          0,
          Math.min(1, ((now - entryStart) / 1000 - 0.65) / 2.35),
        );
        seat = 1 - t * t * (3 - 2 * t);
      }
      const wide = camera.aspect < 1.2 ? 1.4 : 1;
      overhead.visible = seat > 0.72;
      const targetPos = new THREE.Vector3(
        -6.35 * seat - 2.8 * (1 - seat),
        3.45 * seat + 12.7 * wide * (1 - seat),
        0.18 * seat,
      );
      targetLook.set(0.4 * seat, 1.55 + 0.22 * seat, 0);
      camera.position.lerp(targetPos, p.reduced ? 1 : 1 - Math.exp(-dt * 5));
      look.lerp(targetLook, p.reduced ? 1 : 1 - Math.exp(-dt * 5));
      camera.lookAt(look);
      cardMeshes.forEach((m) => {
        const progress = Math.max(
            0.01,
            Math.min(
              1,
              (f.timers[m.side][m.card.at] + (visualTime - f.time)) /
                (f.cd[m.side][m.card.at] || 1),
            ),
          ),
          width = 1.34;
        m.fill.scale.z = progress;
        m.fill.position.z = (-(1 - progress) * width) / 2;
        const firing = f.fired.includes(m.card.uid);
        m.group.position.y =
          1.8 +
          (p.selected === m.card.uid ? 0.17 : 0) +
          (firing && !p.reduced
            ? Math.max(0, 1 - (visualTime - f.time) / 0.22) * 0.11
            : 0);
        m.face.position
          .copy(m.group.position)
          .add(new THREE.Vector3(0, 0.058, 0));
        m.face.element.classList.toggle('selected', p.selected === m.card.uid);
        m.face.element.classList.toggle('firing', firing);
        m.face.element.setAttribute(
          'aria-pressed',
          String(p.selected === m.card.uid),
        );
        m.face.element.style.setProperty('--charge', `${progress * 100}%`);
        const remaining = Math.max(
          0,
          (f.cd[m.side][m.card.at] || 0) -
            f.timers[m.side][m.card.at] -
            (visualTime - f.time),
        );
        const text = `${remaining.toFixed(1)}s`;
        if (m.cooldownText.textContent !== text)
          m.cooldownText.textContent = text;
        m.material.emissive.set(
          p.selected === m.card.uid
            ? '#6c6336'
            : firing
              ? '#6e5230'
              : '#000000',
        );
      });
      barriers.forEach((b) => {
        const barrier = f.barriers[b.side][b.lane];
        b.mesh.scale.y = barrier.broken ? 0.06 : Math.max(0.1, barrier.hp / 90);
        b.mesh.position.y = 1.86 + 0.225 * b.mesh.scale.y;
        b.material.color.set(
          barrier.broken
            ? '#a56d4b'
            : f.corrosion[b.side][b.lane] > 0
              ? '#94b85d'
              : '#9dc2aa',
        );
        projected
          .set(b.mesh.position.x, 2.55, b.mesh.position.z)
          .project(camera);
        b.label.style.left = `${(projected.x * 0.5 + 0.5) * el!.clientWidth}px`;
        b.label.style.top = `${(-projected.y * 0.5 + 0.5) * el!.clientHeight}px`;
        b.label.style.display = seat > 0.5 ? 'none' : 'block';
        b.label.className =
          'art-room-barrier-label' + (barrier.broken ? ' broken' : '');
        b.label.textContent = `${['I', 'II', 'III'][b.lane]} ${barrier.broken ? '破损' : Math.ceil(barrier.hp)}${f.corrosion[b.side][b.lane] > 0 ? ' · 蚀' + f.corrosion[b.side][b.lane].toFixed(0) : ''}`;
      });
      const live = new Set(f.projectiles.map((v) => v.id));
      projectilePool.forEach((mesh, id) => {
        if (!live.has(id)) {
          mesh.visible = false;
          freeProjectiles.push(mesh);
          projectilePool.delete(id);
        }
      });
      f.projectiles.forEach((v) => {
        let mesh = projectilePool.get(v.id);
        if (!mesh) {
          mesh = freeProjectiles.pop() ?? new THREE.Group();
          if (!mesh.children.length) {
            for (let i = 0; i < 5; i++)
              mesh.add(new THREE.Mesh(sparkGeometry, projectileMat.damage));
            scene.add(mesh);
          }
          mesh.visible = true;
          projectilePool.set(v.id, mesh);
        }
        const from = at(v.sourceUid, 1 - v.side, v.targetLane ?? 1),
          to = at(
            v.targetUid,
            v.side,
            v.targetLane ?? 1,
            v.kind === 'heal' || v.kind === 'energy',
          );
        const t = flightProgress(visualTime, v.launchedAt, v.impactAt);
        mesh.children.forEach((particle, i) => {
          const part = particle as THREE.Mesh;
          const trailT = Math.max(0, t - i * 0.022);
          part.visible = i === 0 || (!p.reduced && t > i * 0.022);
          part.material = projectileMat[v.kind] ?? projectileMat.damage;
          part.position.lerpVectors(from, to, trailT);
          part.position.y +=
            Math.sin(trailT * Math.PI) * (v.kind === 'damage' ? 0.18 : 0.38);
          const size = Math.max(0.2, 1 - i * 0.18);
          part.scale.set(
            v.kind === 'damage' ? size * 2.4 : size * 1.4,
            size,
            size,
          );
          part.rotation.y = -Math.atan2(to.z - from.z, to.x - from.x);
        });
      });
      hits.forEach((m, i) => {
        const h = f.hits[i];
        m.visible = !!h && visualTime - f.time < 0.24;
        if (h) {
          m.position.copy(
            at(
              h.targetUid,
              h.side,
              h.targetLane ?? 1,
              h.kind === 'heal' || h.kind === 'energy',
            ),
          );
          m.position.y = 2.2;
          m.material = projectileMat[h.kind] ?? projectileMat.damage;
          const s = 1 + (visualTime - f.time) / 0.065;
          m.scale.set(s, s, s);
        }
      });
      renderer.render(scene, camera);
      cssRenderer.render(textScene, camera);
    });
    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerup', select);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      cardMeshes.forEach((m) => m.face.element.remove());
      cssRenderer.domElement.remove();
      barriers.forEach((b) => b.label.remove());
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      resources.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [props.duel]);
  return (
    <>
      <div className="art-room" ref={mount} />
      <div className="art-room-grain" />
      <div className="art-room-labels" ref={labels} />
      {error && (
        <div className="art-webgl-error">
          <p>
            当前设备未能启动三维画面。
            <br />
            可切换到「2D · 炭笔档案」继续查看同一场战斗。
          </p>
        </div>
      )}
      <div className="art-webgl-cards" aria-label="键盘查看物件">
        {props.duel.player.map((c) => (
          <button key={c.uid} onClick={() => props.onSelect(c)}>
            {cardDef(c.id).name}
          </button>
        ))}
      </div>
    </>
  );
}
