import { UI_FONT } from './design-tokens';
import * as T from 'three';
import type { Effect } from '../../lib/survival-room';

// Each visible effect owns and releases its short-lived GPU resources.
export function combatEffect(e: Effect, reduced: boolean) {
  const group = new T.Group(),
    materials: T.Material[] = [],
    geometries: T.BufferGeometry[] = [],
    textures: T.Texture[] = [];
  const animations: ((age: number) => void)[] = [];
  const color =
    e.kind === 'phone-beam'
      ? '#85e9ff'
      : e.kind === 'torch-beam'
        ? '#ffe5a0'
        : e.kind === 'arc'
          ? '#7fffe0'
          : e.kind === 'laser'
            ? '#c3a5ff'
            : e.kind === 'blade'
              ? '#ffc267'
              : e.kind === 'heal'
                ? '#9eedd4'
                : '#ffbe83';
  const material = (c: string, opacity = 1) => {
    const m = new T.MeshBasicMaterial({
      color: new T.Color(c).multiplyScalar(0.95),
      transparent: true,
      opacity: opacity * 0.65,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
    });
    materials.push(m);
    return m;
  };
  const add = (geo: T.BufferGeometry, mat: T.Material) => {
    geometries.push(geo);
    const m = new T.Mesh(geo, mat);
    group.add(m);
    return m;
  };
  const beam = (
    a: T.Vector3,
    b: T.Vector3,
    radius: number,
    mat: T.Material,
  ) => {
    const delta = b.clone().sub(a),
      m = add(
        new T.CylinderGeometry(
          radius,
          radius,
          Math.max(0.001, delta.length()),
          8,
        ),
        mat,
      );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    return m;
  };
  const start = new T.Vector3(e.from.x, 0.95, e.from.z),
    end = new T.Vector3(e.to.x, 0.65, e.to.z);
  const light = material(color),
    core = material('#ffffff');
  if (
    e.kind === 'arc' ||
    e.kind === 'shot' ||
    e.kind === 'laser' ||
    e.kind === 'phone-beam' ||
    e.kind === 'torch-beam'
  ) {
    if (e.kind === 'arc') {
      let prev = start;
      for (let i = 1; i <= 9; i++) {
        const p = start.clone().lerp(end, i / 9);
        if (i < 9) {
          p.x += Math.sin(e.id * 13 + i * 7) * 0.38;
          p.y += Math.cos(i * 5) * 0.23;
          p.z += Math.sin(i * 2) * 0.3;
        }
        beam(prev, p, 0.036, light);
        beam(prev, p, 0.012, core);
        prev = p;
      }
    } else {
      beam(
        start,
        end,
        e.kind === 'laser' || e.kind === 'torch-beam' ? 0.065 : 0.035,
        light,
      );
      beam(start, end, e.kind === 'laser' ? 0.02 : 0.01, core);
      if (e.kind === 'laser') beam(start, end, 0.28, material(color, 0.13));
      if (e.kind === 'phone-beam' || e.kind === 'torch-beam') {
        beam(start, end, 0.14, material(color, 0.07));
        const flare = add(new T.RingGeometry(0.07, 0.17, 24), light);
        flare.position.copy(end);
        flare.lookAt(start);
        animations.push((age) => flare.scale.setScalar(1 + age * 0.06));
      }
    }
    animations.push((age) => {
      group.visible =
        age < (['laser', 'phone-beam', 'torch-beam'].includes(e.kind) ? 12 : 8);
    });
  }
  if (e.kind === 'blade') {
    group.position.set(e.from.x, 0.25, e.from.z);
    const radius = e.amount || 2.8;
    const ring = add(
      new T.RingGeometry(radius - 0.28, radius, 64, 1, 0, Math.PI * 1.65),
      light,
    );
    ring.rotation.x = -Math.PI / 2;
    const trail = add(
      new T.RingGeometry(
        radius - 0.7,
        radius - 0.05,
        64,
        1,
        0.1,
        Math.PI * 1.2,
      ),
      material(color, 0.17),
    );
    trail.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const shard = add(new T.ConeGeometry(0.13, 0.6, 3), core);
      shard.position.set(Math.sin(a) * radius, 0.04, Math.cos(a) * radius);
      shard.rotation.set(Math.PI / 2, 0, -a);
    }
    animations.push((age) => {
      group.rotation.y = reduced ? 0 : age * 0.17;
    });
  } else {
    const count = reduced
      ? 4
      : e.kind === 'death'
        ? 24
        : e.kind === 'laser'
          ? 20
          : 10;
    const positions = new Float32Array(count * 3),
      velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i * 2.39996 + e.id) % (Math.PI * 2),
        speed = 0.035 + (i % 5) * 0.012;
      velocities.set(
        [Math.sin(a) * speed, 0.025 + (i % 7) * 0.013, Math.cos(a) * speed],
        i * 3,
      );
    }
    const geo = new T.BufferGeometry();
    geometries.push(geo);
    geo.setAttribute('position', new T.BufferAttribute(positions, 3));
    const mat = new T.PointsMaterial({
      color: new T.Color(color).multiplyScalar(0.95),
      size: 0.085,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    materials.push(mat);
    const points = new T.Points(geo, mat);
    group.add(points);
    animations.push((age) => {
      for (let i = 0; i < count; i++)
        positions.set(
          [
            end.x + velocities[i * 3] * age,
            Math.max(
              0.05,
              end.y + velocities[i * 3 + 1] * age - 0.002 * age * age,
            ),
            end.z + velocities[i * 3 + 2] * age,
          ],
          i * 3,
        );
      geo.attributes.position.needsUpdate = true;
    });
    if (e.kind === 'death' || e.kind === 'heal') {
      const ring = add(new T.RingGeometry(0.45, 0.5, 40), light);
      ring.position.set(end.x, 0.08, end.z);
      ring.rotation.x = -Math.PI / 2;
      animations.push((age) => ring.scale.setScalar(1 + age * 0.07));
    }
  }
  if ((e.kind === 'hit' && e.amount) || (e.kind === 'heal' && e.amount)) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `32px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    const value = `${e.kind === 'heal' ? '+' : ''}${Math.round(e.amount)}`;
    ctx.strokeStyle = '#122529';
    ctx.strokeText(value, 64, 43);
    ctx.fillStyle =
      e.kind === 'hit' ? (e.amount < 0 ? '#ff333f' : '#ffffff') : color;
    ctx.fillText(value, 64, 43);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    textures.push(texture);
    const mat = new T.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    materials.push(mat);
    const sprite = new T.Sprite(mat);
    sprite.scale.set(1.8, 0.9, 1);
    group.add(sprite);
    animations.push((age) =>
      sprite.position.set(e.to.x, 1.6 + age * 0.025, e.to.z),
    );
  }
  const baseOpacity = new Map(materials.map((m) => [m, m.opacity]));
  return {
    group,
    update(age: number) {
      materials.forEach((m) => {
        m.opacity = (baseOpacity.get(m) ?? 1) * Math.max(0, 1 - age / 28);
      });
      animations.forEach((fn) => fn(age));
    },
    dispose() {
      group.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
