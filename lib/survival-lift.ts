// Metres. Starter car: Schindler 1000 MENA, 630 kg / 8 person, C2 900 mm door.
export const LIFT = {
  width: 1.1,
  depth: 1.4,
  height: 2.139,
  centerZ: 0,
  doorZ: -0.7,
  doorWidth: 0.9,
  doorHeight: 2,
  eyeHeight: 1.62,
  walls: [
    { x: -0.59, z: 0, w: 0.08, d: 1.48 },
    { x: 0.59, z: 0, w: 0.08, d: 1.48 },
    { x: 0, z: 0.74, w: 1.26, d: 0.08 },
    { x: -0.69, z: -0.74, w: 0.48, d: 0.08 },
    { x: 0.69, z: -0.74, w: 0.48, d: 0.08 },
  ],
  fixtures: [] as { id: string; x: number; z: number; w: number; d: number }[],
} as const;

export const PLAYER_RADIUS = 0.28;
export const DEPARTURE = {
  openTicks: 36,
  walkTicks: 54,
  riseTicks: 48,
} as const;
export const DEPARTURE_TICKS =
  DEPARTURE.openTicks + DEPARTURE.walkTicks + DEPARTURE.riseTicks;
export const departureDistance = (ticks: number) =>
  Math.min(
    1,
    Math.max(0, (ticks - DEPARTURE.openTicks) / DEPARTURE.walkTicks),
  ) * 2.4;
export const departureRise = (ticks: number) => {
  const t = Math.min(
    1,
    Math.max(
      0,
      (ticks - DEPARTURE.openTicks - DEPARTURE.walkTicks) / DEPARTURE.riseTicks,
    ),
  );
  return t * t * (3 - 2 * t);
};
export function insideLift(
  p: { x: number; z: number },
  origin: { x: number; z: number },
) {
  return (
    Math.abs(p.x - origin.x) <= LIFT.width / 2 - PLAYER_RADIUS &&
    Math.abs(p.z - origin.z) <= LIFT.depth / 2 - PLAYER_RADIUS
  );
}
