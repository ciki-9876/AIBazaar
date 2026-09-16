import * as T from 'three';
import { BAYS, FACILITIES, footprint, type Module } from './base-state';
import type { SceneKit } from './scene-kit';

export function facilityModel(
  k: SceneKit,
  module: Module,
  expanded: boolean,
  asset?: T.Object3D,
) {
  const { box: b, cylinder: c, pipe: p, m, glow, glass, label, gauge } = k,
    root = new T.Group(),
    s = FACILITIES[module.kind].slots,
    w = s === 1 ? 1.95 : 4.25;
  const area = footprint(module.kind, module.slot, expanded).map(
    (id) => BAYS[id],
  );
  root.position.set(
    BAYS[module.slot].x,
    0.06,
    area.reduce((n, v) => n + v.z, 0) / area.length,
  );
  root.rotation.y = BAYS[module.slot].wall === 0 ? Math.PI / 2 : -Math.PI / 2;
  root.userData.moduleId = module.id;
  b(root, w, 0.12, 1.85, m.steel, 0, 0.07, 0, true);
  for (const x of [-w / 2 + 0.14, w / 2 - 0.14])
    for (const z of [-0.72, 0.72])
      b(root, 0.11, 0.18, 0.11, m.rubber, x, 0.17, z);
  if (asset) {
    root.add(asset.clone(true));
  } else if (module.kind === 'generator') {
    b(root, 1.7, 1.05, 1.38, m.enamel, 0, 0.87, 0, true);
    b(root, 1.52, 0.2, 1.46, m.brass, 0, 1.48, 0, true);
    const housing = c(root, 0.41, 0.35, m.steel, 0, 0.92, 0.78);
    housing.rotation.x = Math.PI / 2;
    const rotor = new T.Group();
    rotor.position.set(0, 0.92, 0.99);
    rotor.userData.motor = true;
    root.add(rotor);
    for (let i = 0; i < 8; i++) {
      const blade = b(rotor, 0.105, 0.62, 0.045, m.ivory);
      blade.rotation.z = (i * Math.PI) / 4;
    }
    const cap = c(root, 0.12, 0.12, m.brass, 0, 0.92, 1.01);
    cap.rotation.x = Math.PI / 2;
    for (let x = -0.7; x <= 0.7; x += 0.16)
      b(root, 0.065, 0.55, 0.03, m.rubber, x, 0.85, -0.71);
    p(root, [-0.6, 1.55, -0.4], [-0.6, 2.3, -0.4], 0.07, m.steel);
    p(root, [-0.6, 2.3, -0.4], [0.15, 2.3, -0.4], 0.07, m.steel);
    gauge(root, 0.56, 1.72, 0.6);
    label(root, 'PWR / 01', 'FUEL CONVERTER', 1.4, 0.38, 0, 1.98, 0.13);
  } else if (module.kind === 'clinic') {
    b(root, 3.65, 0.24, 1.25, m.steel, -0.1, 0.62, 0.13, true);
    b(root, 3.45, 0.26, 1.17, m.ivory, -0.1, 0.85, 0.13, true);
    b(root, 2.15, 0.12, 1.18, m.cloth, 0.5, 1.02, 0.13, true);
    b(root, 0.65, 0.19, 0.87, m.ivory, -1.36, 1.06, 0.13, true);
    for (const x of [-1.7, 1.6])
      p(root, [x, 0.65, -0.6], [x, 1.4, -0.6], 0.045, m.steel);
    p(root, [-1.8, 0.15, -0.5], [-1.8, 2.52, -0.5], 0.035, m.steel);
    p(root, [-1.8, 2.52, -0.5], [-1.2, 2.52, -0.5], 0.035, m.steel);
    b(root, 0.25, 0.48, 0.18, glass, -1.45, 2.17, -0.5, true);
    p(root, [-1.45, 1.98, -0.5], [-1.1, 1.04, -0.2], 0.009, m.brass);
    b(root, 0.52, 0.52, 0.38, m.enamel, 1.65, 1.65, -0.42, true);
    b(root, 0.29, 0.065, 0.025, m.ivory, 1.65, 1.65, -0.21);
    b(root, 0.065, 0.28, 0.025, m.ivory, 1.65, 1.65, -0.21);
    label(root, 'MED / 02', 'REST • RECOVER', 1.8, 0.42, 0, 2.42, -0.75);
  } else if (module.kind === 'grow') {
    const green = k.material('#768b47', 0, 0.95);
    for (const x of [-1.9, 1.9])
      for (const z of [-0.73, 0.73])
        b(root, 0.08, 2.45, 0.08, m.steel, x, 1.37, z);
    for (const y of [0.42, 1.25, 2.08]) {
      b(root, 3.82, 0.13, 1.45, m.enamel, 0, y, 0, true);
      b(root, 3.45, 0.1, 1.23, m.soil, 0, y + 0.1, 0);
      for (let x = -1.5; x <= 1.6; x += 0.5)
        for (const z of [-0.35, 0.35]) {
          c(root, 0.1, 0.25, green, x, y + 0.25, z);
          for (const a of [-0.7, 0.7]) {
            const leaf = b(
              root,
              0.25,
              0.035,
              0.09,
              green,
              x + a * 0.08,
              y + 0.34,
              z,
            );
            leaf.rotation.z = a;
          }
        }
      b(root, 3.5, 0.04, 0.06, glow, 0, y + 0.68, -0.35);
    }
    b(root, 4, 2.4, 0.025, glass, 0, 1.45, 0.8);
    b(root, 4.03, 0.2, 1.65, m.enamel, 0, 2.73, 0, true);
    label(root, 'BIO / 03', 'CULTIVATION SYSTEM', 1.7, 0.35, 0, 2.75, 0.86);
  } else if (module.kind === 'workshop') {
    b(root, 4.0, 0.18, 1.7, m.ivory, 0, 1.13, 0, true);
    for (const x of [-1.7, 1.7]) b(root, 0.22, 1, 0.8, m.steel, x, 0.57, -0.2);
    b(root, 3.8, 1.3, 0.09, m.steel, 0, 1.96, -0.75);
    for (let x = -1.7; x < 1.8; x += 0.24)
      for (let y = 1.45; y < 2.55; y += 0.24)
        b(root, 0.035, 0.035, 0.025, m.rubber, x, y, -0.69);
    b(root, 0.82, 0.52, 0.7, m.enamel, -1.2, 1.48, 0, true);
    gauge(root, -1.2, 1.54, 0.39);
    b(root, 0.67, 0.21, 0.65, m.steel, 0.35, 1.31, 0.12);
    b(root, 0.15, 0.4, 0.18, m.brass, 0.17, 1.52, 0.12);
    b(root, 0.15, 0.4, 0.18, m.brass, 0.53, 1.52, 0.12);
    p(root, [1.45, 1.23, -0.45], [1.45, 2.15, -0.45], 0.035, m.steel);
    p(root, [1.45, 2.15, -0.45], [0.65, 2.5, 0.1], 0.035, m.steel);
    b(root, 0.65, 0.07, 0.38, glow, 0.65, 2.45, 0.1);
    label(root, 'LAB / 04', 'IDENTIFICATION CHARGE', 1.8, 0.38, 0, 2.78, -0.65);
  } else {
    for (const x of [-0.8, 0.8])
      for (const z of [-0.6, 0.6])
        b(root, 0.07, 2.4, 0.07, m.steel, x, 1.35, z);
    for (const y of [0.38, 1.25, 2.12]) {
      b(root, 1.8, 0.1, 1.4, m.enamel, 0, y, 0);
      for (const x of [-0.46, 0.46]) {
        b(root, 0.59, 0.64, 0.83, m.brass, x, y + 0.36, 0, true);
        b(root, 0.22, 0.065, 0.15, m.rubber, x, y + 0.71, 0);
        b(root, 0.45, 0.13, 0.025, m.ivory, x, y + 0.38, 0.43);
      }
    }
    label(root, 'STO / 05', 'SECURE FUEL STORAGE', 1.7, 0.38, 0, 2.64, 0.63);
  }
  for (let i = 1; i < module.level; i++) {
    b(root, w - 0.18, 0.075, 0.07, m.brass, 0, 0.32 + i * 0.15, 0.93);
    gauge(root, -w / 2 + 0.25 + i * 0.3, 1.85, 0.86);
  }
  const status = b(
    root,
    0.08,
    0.08,
    0.06,
    module.used ? m.brass : glow,
    w / 2 - 0.18,
    0.32,
    0.94,
  );
  status.userData.status = true;
  label(
    root,
    `Mk.${module.level}`,
    module.used ? 'DAILY CYCLE COMPLETE' : 'SYSTEM READY',
    0.78,
    0.24,
    0,
    0.3,
    0.95,
  );
  root.traverse((o) => {
    if (o instanceof T.Mesh) o.userData.moduleId = module.id;
  });
  return root;
}
