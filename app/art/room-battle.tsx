'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CombatFrame, Duel, FighterCard } from '@/lib/demo-combat';
import { cardDef } from '@/lib/demo-cards';
import { ATLAS, KIND, cardPosition } from './art-data';

type Props = {
  duel: Duel;
  frame: CombatFrame;
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
    let disposed = false;
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
    const image = new Image();
    const cardMeshes: CardMesh[] = [];
    const pickables: THREE.Object3D[] = [];
    function cardTexture(card: FighterCard, side: number) {
      const d = cardDef(card.id),
        canvas = document.createElement('canvas');
      canvas.width = d.size === 1 ? 256 : 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const w = canvas.width;
      ctx.fillStyle = side ? '#3c4844' : '#566359';
      ctx.fillRect(0, 0, w, 512);
      ctx.fillStyle = '#182823';
      ctx.fillRect(10, 10, w - 20, 492);
      ctx.strokeStyle = '#b5a675';
      ctx.lineWidth = 3;
      ctx.strokeRect(13, 13, w - 26, 486);
      for (let i = 0; i < 55; i++) {
        ctx.strokeStyle = i % 2 ? '#ffffff0d' : '#00000028';
        ctx.beginPath();
        const x = (i * 107) % w,
          y = (i * 193) % 512;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 12, y - 4);
        ctx.stroke();
      }
      ctx.fillStyle = '#c5b276';
      ctx.font = '19px Bahnschrift, sans-serif';
      ctx.fillText(`${'•'.repeat(card.rarity + 1)}  F9`, 26, 45);
      if (image.complete && image.naturalWidth) {
        const index = ATLAS[card.id] ?? 0,
          sw = image.naturalWidth / 3,
          sh = image.naturalHeight / 3;
        ctx.drawImage(
          image,
          (index % 3) * sw,
          Math.floor(index / 3) * sh,
          sw,
          sh,
          22,
          63,
          w - 44,
          280,
        );
      }
      ctx.fillStyle = '#e2dec5';
      ctx.textAlign = 'center';
      ctx.font = `${d.size === 1 ? 30 : 35}px SimSun, serif`;
      ctx.fillText(d.name, w / 2, 379, w - 30);
      ctx.fillStyle = '#b8c4ac';
      ctx.font = '21px Microsoft YaHei, sans-serif';
      ctx.fillText(
        `${d.power} ${KIND[d.kind] ?? '效果'} · ${d.cd}s`,
        w / 2,
        423,
        w - 30,
      );
      ctx.strokeStyle = '#a79569';
      ctx.beginPath();
      ctx.moveTo(22, 451);
      ctx.lineTo(w - 22, 451);
      ctx.stroke();
      ctx.fillStyle = '#9caa91';
      ctx.font = '16px sans-serif';
      ctx.fillText(`基础 / Lv.0 / ${d.size} 格`, w / 2, 479, w - 30);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      // Readable from the near (player) edge after the vertical camera change.
      tex.center.set(0.5, 0.5);
      tex.rotation = -Math.PI / 2;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      resources.push(tex);
      return tex;
    }
    [props.duel.player, props.duel.enemy].forEach((board, side) =>
      board.forEach((card) => {
        const pos = cardPosition(card, side),
          group = new THREE.Group();
        scene.add(group);
        group.position.set(pos.x, 1.8, pos.z);
        box(pos.width, 0.095, 1.52, side ? dark : enamel, 0, 0, 0, group);
        const material = mat('#ffffff', 0.1, 0.72);
        material.map = cardTexture(card, side);
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
        cardMeshes.push({ card, side, group, plate, fill, material });
      }),
    );
    image.onload = () => {
      if (disposed) return;
      cardMeshes.forEach((m) => {
        m.material.map?.dispose();
        m.material.map = cardTexture(m.card, m.side);
        m.material.needsUpdate = true;
      });
    };
    image.src = '/art-assets/object-atlas.png';
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
    const projectilePool = new Map<string, THREE.Mesh>();
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
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let seenEntry = latest.current.entry,
      entryStart = -10000,
      oldTime = -1,
      frameStart = performance.now(),
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
        f = p.frame,
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
      if (f.time !== oldTime) {
        oldTime = f.time;
        frameStart = now;
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
              f.timers[m.side][m.card.at] / (f.cd[m.side][m.card.at] || 1),
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
            ? Math.max(0, 1 - (now - frameStart) / 220) * 0.11
            : 0);
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
      projectilePool.forEach((m, id) => {
        if (!live.has(id)) {
          scene.remove(m);
          projectilePool.delete(id);
        }
      });
      f.projectiles.forEach((v) => {
        let mesh = projectilePool.get(v.id);
        if (!mesh) {
          mesh = new THREE.Mesh(
            sparkGeometry,
            projectileMat[v.kind] ?? projectileMat.damage,
          );
          scene.add(mesh);
          projectilePool.set(v.id, mesh);
        }
        const from = at(v.sourceUid, 1 - v.side, v.targetLane ?? 1),
          to = at(
            v.targetUid,
            v.side,
            v.targetLane ?? 1,
            v.kind === 'heal' || v.kind === 'energy',
          );
        const t = Math.max(
          0,
          Math.min(1, (f.time - v.launchedAt) / (v.impactAt - v.launchedAt)),
        );
        mesh.position.lerpVectors(from, to, t);
        mesh.position.y += Math.sin(t * Math.PI) * 0.25;
        mesh.scale.set(v.kind === 'damage' ? 2.7 : 1.3, 1, 1);
      });
      hits.forEach((m, i) => {
        const h = f.hits[i];
        m.visible = !!h && now - frameStart < 240;
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
          const s = 1 + (now - frameStart) / 65;
          m.scale.set(s, s, s);
        }
      });
      renderer.render(scene, camera);
    });
    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerup', select);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      image.onload = null;
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
