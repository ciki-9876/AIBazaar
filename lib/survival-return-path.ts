import {
  pathTo,
  ELEVATOR,
  clearSight,
  distance,
  type Point,
} from './survival-room.ts';
import { walkable, type RoomWorld } from './survival-world.ts';
import { PLAYER_RADIUS } from './survival-lift.ts';
/** A valid world position can sit in a navigation cell whose centre is obstructed. */
export function returnPath(from: Point, world: RoomWorld): Point[] {
  const direct = pathTo(from, ELEVATOR, world);
  if (direct.length) return direct;
  const starts: Point[] = [];
  for (let dz = -2; dz <= 2; dz++)
    for (let dx = -2; dx <= 2; dx++) {
      const p = {
        x: Math.floor(from.x) + dx + 0.5,
        z: Math.floor(from.z) + dz + 0.5,
      };
      if (
        walkable(p, PLAYER_RADIUS, world) &&
        clearSight(from, p, world, PLAYER_RADIUS + 0.02)
      )
        starts.push(p);
    }
  starts.sort((a, b) => distance(from, a) - distance(from, b));
  for (const p of starts) {
    const tail = pathTo(p, ELEVATOR, world);
    if (tail.length) return [p, ...tail];
  }
  return [];
}
