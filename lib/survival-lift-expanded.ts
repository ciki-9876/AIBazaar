// Local coordinates relative to ELEVATOR. Shared by art and navigation.
export const LIFT = {
  width: 6.9,
  depth: 6.8,
  centerZ: 0.45,
  doorZ: -2.55,
  walls: [
    { x: -3.25, z: 0.5, w: 0.3, d: 6.5 },
    { x: 3.25, z: 0.5, w: 0.3, d: 6.5 },
    { x: 0, z: 3.6, w: 6.8, d: 0.3 },
    { x: -3.075, z: -2.55, w: 1.95, d: 0.7 },
    { x: 3.075, z: -2.55, w: 1.95, d: 0.7 },
  ],
  fixtures: [
    { id: 'workbench', x: -2.25, z: 1.6, w: 1.35, d: 2.3 },
    { id: 'cargo', x: -2.3, z: -1.0, w: 1.25, d: 1.0 },
    { id: 'cot', x: 2.23, z: 1.7, w: 1.32, d: 2.35 },
    { id: 'console', x: 2.35, z: -1.1, w: 1.05, d: 0.9 },
  ],
} as const;
