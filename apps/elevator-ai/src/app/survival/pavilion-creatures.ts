import * as T from 'three';
import type { Atelier } from '../../packages/render-kit/atelier';
import type { EnemyKind } from '../../lib/survival-room';

/** Jiangnan kit fauna. Floating ritual objects and beasts, never human actors. */
export function pavilionCreature(kit: Atelier, kind: EnemyKind) {
  const group = kit.group();
  group.userData.dynamic = true;
  const limbs: T.Group[] = [];
  const ink = kit.mat('#18211f'),
    paper = kit.mat('#b1aa88'),
    red = kit.mat('#631f25');
  const bronze = kit.mat('#3d5548'),
    gold = kit.mat('#9c8250');
  const ember = kit.mat('#bd4635', 1, 0, '#551511');
  ember.emissiveIntensity = 0.65;
  const shard = (
    m: T.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    parent = group,
  ) => {
    const mesh = kit.mesh(
      kit.geo('spirit-shard', () => new T.OctahedronGeometry(1, 0)),
      m,
      [x, y, z],
      parent,
    );
    mesh.scale.set(w, h, d);
    return mesh;
  };
  const talisman = (
    x: number,
    y: number,
    z: number,
    height: number,
    parent = group,
  ) => {
    const strip = kit.group([x, y, z], parent);
    limbs.push(strip);
    kit.box(0.14, height, 0.025, paper, [0, -height / 2, 0], 0, strip);
    for (let n = 0; n < 4; n++) {
      kit.box(
        n % 2 ? 0.08 : 0.055,
        0.026,
        0.012,
        red,
        [n % 2 ? -0.018 : 0.015, -0.09 - n * 0.085, 0.019],
        0,
        strip,
      );
    }
    return strip;
  };
  if (kind === 'runner') {
    // An enormous torn funeral kite; no torso or head.
    shard(ink, 0, 1.2, 0, 0.24, 0.2, 0.85);
    for (const side of [-1, 1]) {
      const wing = kit.group([side * 0.18, 1.2, 0], group);
      limbs.push(wing);
      const sail = shard(
        paper,
        side * 0.53,
        0.05,
        -0.1,
        0.82,
        0.065,
        0.56,
        wing,
      );
      sail.rotation.y = side * 0.3;
      shard(
        red,
        side * 0.56,
        0.115,
        -0.11,
        0.64,
        0.015,
        0.25,
        wing,
      ).rotation.y = side * 0.3;
      shard(ink, side * 0.95, -0.08, -0.34, 0.18, 0.14, 0.43, wing);
      talisman(side * 0.48, 1.08, -0.46, 0.9);
    }
    shard(ember, 0, 1.23, 0.71, 0.09, 0.055, 0.12);
    for (let i = 0; i < 3; i++)
      shard(ink, 0, 0.92 - i * 0.22, -0.7 - i * 0.21, 0.1, 0.2, 0.28);
  } else if (kind === 'crawler') {
    // A broken lantern cage enclosing an empty, tooth-filled mask.
    shard(red, 0, 1.0, 0, 0.52, 0.64, 0.42);
    shard(ink, 0, 1.07, 0.3, 0.37, 0.47, 0.17);
    for (const side of [-1, 1]) {
      shard(paper, side * 0.24, 1.13, 0.38, 0.18, 0.37, 0.055).rotation.z =
        side * -0.27;
      shard(ember, side * 0.16, 1.16, 0.445, 0.1, 0.028, 0.032).rotation.z =
        side * -0.25;
      for (let n = 0; n < 3; n++)
        shard(paper, side * (0.07 + n * 0.07), 0.86, 0.4, 0.028, 0.11, 0.035);
      talisman(side * 0.28, 0.83, 0.03, 0.72);
      shard(ink, side * 0.56, 0.7, 0.2, 0.08, 0.54, 0.09).rotation.z =
        side * -0.55;
    }
    kit.box(0.72, 0.085, 0.56, ink, [0, 1.56, 0], 0, group);
    kit.box(0.55, 0.09, 0.46, gold, [0, 0.5, 0], 0, group);
    shard(ink, 0, 1.75, 0, 0.13, 0.23, 0.13);
  } else {
    // A crawling bronze taotie vessel; the shrine guardian is its splintered elder.
    group.scale.setScalar(kind === 'boss' ? 1.9 : 1.2);
    shard(bronze, 0, 0.81, -0.13, 0.64, 0.55, 0.67);
    kit.box(0.98, 0.16, 0.84, gold, [0, 1.17, -0.1], 0, group);
    kit.box(0.81, 0.15, 0.71, ink, [0, 1.28, -0.1], 0, group);
    shard(ink, 0, 0.77, 0.5, 0.39, 0.3, 0.12);
    for (const side of [-1, 1]) {
      shard(bronze, side * 0.36, 1.1, 0.36, 0.25, 0.43, 0.26).rotation.z =
        side * -0.4;
      shard(gold, side * 0.5, 1.46, 0.05, 0.08, 0.48, 0.11).rotation.z =
        side * -0.35;
      shard(ember, side * 0.22, 0.94, 0.625, 0.13, 0.035, 0.045);
      for (let i = 0; i < 3; i++) {
        const leg = kit.group([side * 0.4, 0.55, -0.5 + i * 0.42], group);
        limbs.push(leg);
        shard(ink, side * 0.28, -0.03, 0, 0.4, 0.065, 0.13, leg).rotation.z =
          side * 0.22;
        shard(bronze, side * 0.55, -0.22, 0.07, 0.08, 0.35, 0.09, leg);
      }
      for (let i = 0; i < 3; i++)
        shard(paper, side * (0.055 + i * 0.1), 0.69, 0.62, 0.035, 0.16, 0.07);
      if (kind === 'boss') {
        talisman(side * 0.61, 1.35, -0.12, 1.1);
        shard(ink, side * 0.64, 1.78, -0.2, 0.12, 0.72, 0.16).rotation.z =
          side * -0.48;
      }
    }
    if (kind === 'boss') {
      kit.box(1.6, 0.13, 1.1, ink, [0, 1.6, -0.23], 0, group);
      shard(red, 0, 1.88, -0.23, 0.76, 0.27, 0.52);
      shard(gold, 0, 2.15, -0.23, 0.035, 0.24, 0.06);
    }
  }
  return { group, limbs };
}
