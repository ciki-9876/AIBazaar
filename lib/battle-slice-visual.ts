import { cardDef } from './demo-cards.ts';
import type { FighterCard } from './demo-combat.ts';

// Presentation coordinates only. Simulation time, lanes and damage stay unchanged.
export const equipmentZ = (side: number) => (side === 0 ? 1.68 : -1.68);
export const barrierZ = (side: number) => (side === 0 ? 2.62 : -2.62);
export const coreZ = (side: number) => (side === 0 ? 3.3 : -3.3);
export const SHOT_HEIGHT = 0.72;
export const BARRIER_HEIGHT = 0.96;
export const BARRIER_WIDTH = 3.4;

export function boardCamera(aspect: number, arena = false) {
  const pitch = (58 * Math.PI) / 180,
    fov = 40;
  const tan = Math.tan((fov * Math.PI) / 360);
  let distance = 0;
  // Fit the complete board, cores and their anchored labels without wide-angle distortion.
  for (const x of [-5.55, 5.55])
    for (const y of [0, 1.15])
      for (const z of arena ? [-3.25, 3.25] : [-4.2, 4.2]) {
        const depth = y * Math.sin(pitch) + z * Math.cos(pitch);
        const up = y * Math.cos(pitch) - z * Math.sin(pitch);
        distance = Math.max(
          distance,
          depth + Math.abs(up) / tan,
          depth + Math.abs(x) / (tan * aspect),
        );
      }
  distance *= 1.04;
  return {
    position: [0, distance * Math.sin(pitch), distance * Math.cos(pitch)],
    target: [0, 0, 0],
    fov,
  };
}

export const slotX = (at: number, size = 1) =>
  (Math.floor(at / 3) - 1) * 3.46 + ((at % 3) + (size - 1) / 2 - 1) * 0.96;

// Retain the muzzle's within-lane offset. Cross-lane effects explicitly shift
// by lane spacing; ordinary shots stay parallel, including after a breach.
export function impactX(source: FighterCard, targetLane: number) {
  return (
    slotX(source.at, cardDef(source.id).size) +
    (targetLane - Math.floor(source.at / 3)) * 3.46
  );
}
