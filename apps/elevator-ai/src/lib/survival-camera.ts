/** North stays at the top of the screen, matching world-axis WASD in the survival game. */
export function battleCamera(
  player: { x: number; z: number },
  aspect: number,
  clearing = false,
) {
  const target = { x: player.x, y: 0, z: player.z - 2.2 };
  return {
    target,
    position: {
      x: target.x,
      y: clearing ? 14 : 32,
      z: target.z + (clearing ? 12 : 26),
    },
    fov: aspect < 1.3 ? 46 : 38,
  };
}
