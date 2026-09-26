import * as THREE from 'three';
import type { ArenaCard } from '@/lib/arena-catalog';

// Compact physical models for every arena card. Geometry is presentation only.
// Each mechanism family shares construction parts, with stable card variants.
export function arenaEquipment(card: ArenaCard) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: '#64746c',
    metalness: 0.72,
    roughness: 0.37,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: '#25362e',
    metalness: 0.45,
    roughness: 0.56,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: '#b89a5d',
    metalness: 0.7,
    roughness: 0.34,
  });
  const colors = {
    damage: '#bea078',
    burn: '#d1753d',
    corrode: '#91ae59',
    shield: '#6fae9e',
    heal: '#97bca0',
    tempo: '#c5ac63',
    control: '#89b4c6',
    passive: '#a49776',
  };
  const accent = new THREE.MeshStandardMaterial({
    color: colors[card.kind],
    metalness: 0.35,
    roughness: 0.33,
    emissive: colors[card.kind],
    emissiveIntensity: 0.1,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: colors[card.kind],
    metalness: 0.18,
    roughness: 0.2,
    transparent: true,
    opacity: 0.76,
  });
  const width = card.size * 0.84,
    variant = card.number % 3;
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m = metal,
    name = '',
  ) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.name = name;
    o.castShadow = true;
    o.receiveShadow = true;
    group.add(o);
    return o;
  };
  const cylinder = (
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    m = metal,
    along = false,
    name = '',
  ) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), m);
    o.position.set(x, y, z);
    if (along) o.rotation.x = Math.PI / 2;
    o.name = name;
    o.castShadow = true;
    group.add(o);
    return o;
  };
  box(width, 0.07, 0.58, 0, 0.075, 0, dark);
  for (const x of [-width / 2 + 0.07, width / 2 - 0.07]) {
    box(0.07, 0.07, 0.55, x, 0.025, 0, brass);
    cylinder(0.035, 0.025, x, 0.125, 0.22, brass);
    cylinder(0.035, 0.025, x, 0.125, -0.22, brass);
  }
  if (card.kind === 'damage') {
    const barrels = card.number === 2 ? 2 : card.number === 3 ? 3 : 1;
    for (let i = 0; i < barrels; i++) {
      const x = (i - (barrels - 1) / 2) * 0.25;
      box(0.23, 0.24, 0.3, x, 0.24, 0.09, metal);
      cylinder(0.075, 0.51, x, 0.29, -0.2, dark, true, 'arena-barrel');
      cylinder(0.09, 0.06, x, 0.29, -0.44, brass, true);
    }
    box(width * 0.7, 0.14, 0.18, 0, 0.2, 0.27, accent);
    if (card.size > 1)
      for (const x of [-width * 0.34, width * 0.34])
        cylinder(0.13, 0.14, x, 0.19, 0.05, brass, true);
    if (card.number === 26) {
      box(width * 0.87, 0.08, 0.43, 0, 0.41, 0, metal);
      for (let i = 0; i < 4; i++)
        box(0.025, 0.09, 0.1, (i - 1.5) * 0.14, 0.36, 0.12, accent);
    }
    if (card.number === 50)
      for (let i = 0; i < 7; i++)
        box(
          0.09,
          0.28 + (i % 2) * 0.05,
          0.12,
          (i - 3) * 0.27,
          0.32,
          0.18,
          accent,
        );
  } else if (card.kind === 'burn' || card.kind === 'corrode') {
    const count = card.size === 3 ? 3 : card.size === 2 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 0.48;
      cylinder(
        0.17,
        0.38,
        x,
        0.29,
        0.06,
        card.kind === 'corrode' ? glass : accent,
      );
      cylinder(0.19, 0.05, x, 0.5, 0.06, brass);
      cylinder(0.08, 0.06, x, 0.555, 0.06, dark);
      box(0.045, 0.12, 0.23, x, 0.59, 0.02, brass, 'arena-valve');
      cylinder(0.065, 0.3, x, 0.25, -0.22, dark, true);
      cylinder(0.085, 0.04, x, 0.25, -0.37, brass, true);
    }
    if (card.number === 14)
      for (let i = 0; i < 8; i++)
        box(0.04, 0.2, 0.25, (i - 3.5) * 0.26, 0.25, -0.17, dark);
    if (card.number === 15)
      for (let i = 0; i < 5; i++)
        box(0.035, 0.35, 0.38, (i - 2) * 0.11, 0.29, 0, metal);
  } else if (card.kind === 'shield') {
    box(width * 0.82, 0.3, 0.31, 0, 0.28, 0.05, metal);
    box(width * 0.7, 0.2, 0.025, 0, 0.3, -0.12, accent);
    for (let i = 0; i < card.size + 1; i++)
      cylinder(
        0.075,
        0.26,
        ((i - card.size / 2) * width) / (card.size + 1),
        0.37,
        0.16,
        brass,
        false,
        'arena-piston',
      );
    if (card.number === 30) {
      for (const x of [-width * 0.4, width * 0.4])
        box(0.08, 0.5, 0.1, x, 0.36, 0, brass);
      box(width * 0.8, 0.08, 0.1, 0, 0.61, 0, metal);
    }
  } else if (card.kind === 'heal') {
    cylinder(0.2, 0.32, 0, 0.28, 0, glass);
    cylinder(0.21, 0.055, 0, 0.46, 0, brass);
    box(0.3, 0.1, 0.2, 0, 0.54, 0, metal, 'arena-piston');
    box(0.035, 0.18, 0.02, 0, 0.29, -0.203, accent);
    box(0.16, 0.035, 0.02, 0, 0.29, -0.21, accent);
    for (const x of [-width * 0.35, width * 0.35])
      box(0.09, 0.2, 0.32, x, 0.22, 0, dark);
  } else if (card.kind === 'tempo') {
    const rotor = cylinder(0.24, 0.09, 0, 0.33, 0, brass, true, 'arena-rotor');
    rotor.rotation.z = variant * 0.4;
    cylinder(0.07, 0.14, 0, 0.33, -0.055, accent, true);
    box(0.08, 0.37, 0.08, 0, 0.27, 0.13, metal);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      box(
        0.04,
        0.05,
        0.08,
        Math.cos(angle) * 0.19,
        0.33 + Math.sin(angle) * 0.19,
        -0.05,
        dark,
      );
    }
    if (card.size > 1)
      for (const x of [-width * 0.35, width * 0.35])
        box(0.14, 0.37, 0.18, x, 0.31, 0.1, accent);
  } else if (card.kind === 'control') {
    for (let i = 0; i < card.size; i++) {
      const x = (i - (card.size - 1) / 2) * 0.62;
      box(0.15, 0.34, 0.16, x, 0.29, 0.05, metal);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.28, 6), glass);
      cone.position.set(x, 0.58, 0.05);
      cone.castShadow = true;
      group.add(cone);
      cylinder(0.04, 0.24, x, 0.37, -0.16, brass, true);
    }
  } else {
    for (let i = 0; i < card.size + 2; i++) {
      const x = ((i - (card.size + 1) / 2) * width) / (card.size + 2);
      const o = box(
        (width / (card.size + 2)) * 0.7,
        0.08,
        0.43,
        x,
        0.2 + (i % 2) * 0.12,
        0,
        i % 2 ? brass : accent,
        'arena-resonator',
      );
      o.rotation.x = 0.12 * (variant - 1);
    }
    if (card.number === 49)
      cylinder(0.12, 0.35, 0, 0.43, 0.03, glass, false, 'arena-valve');
    if (card.number === 22) box(width * 0.94, 0.09, 0.56, 0, 0.42, 0, metal);
  }
  // Stable physical signature for the named variant, independent of rarity/size.
  for (let i = 0; i <= variant; i++)
    box(0.05, 0.025, 0.07, width / 2 - 0.1 - i * 0.075, 0.126, 0.21, accent);
  return group;
}

export function arenaAmplifier(id: string) {
  const group = new THREE.Group(),
    n = Number(id.slice(-2));
  const metal = new THREE.MeshStandardMaterial({
    color: '#65766b',
    metalness: 0.7,
    roughness: 0.4,
  });
  const lamp = new THREE.MeshStandardMaterial({
    color: '#e3c98e',
    emissive: '#e3c98e',
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.21, 0.27), metal);
  body.position.y = 0.12;
  body.castShadow = true;
  group.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 12), lamp);
  ring.position.set(0, 0.27, 0);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  for (let i = 0; i < 1 + (n % 3); i++) {
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.1 + (n % 2) * 0.04, 6),
      metal,
    );
    pin.position.set((i - (n % 3) / 2) * 0.075, 0.27, 0.075);
    group.add(pin);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), lamp);
  eye.position.set(0, 0.14, -0.145);
  group.add(eye);
  return { group, lamp };
}

export function disposeArenaModel(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        materials.add(m),
      );
    }
  });
  materials.forEach((m) => m.dispose());
}
