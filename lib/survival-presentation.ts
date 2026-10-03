import type { SurvivalState } from './survival-room.ts';

// Written by the fixed-step loop; read by the camera, actors and labels together.
// Presentation never feeds back into collision, aiming, fog or serialized rules.
export type PresentationFrame = {
  previous: SurvivalState;
  current: SurvivalState;
  alpha: number;
};
export const presentationFrame = (s: SurvivalState): PresentationFrame => ({
  previous: s,
  current: s,
  alpha: 1,
});
// Inventory/path commands between ticks must not snap a moving actor forward.
export function retargetPresentation(
  frame: PresentationFrame,
  next: SurvivalState,
): PresentationFrame {
  return next.seed !== frame.current.seed ||
    next.tick < frame.current.tick ||
    Math.hypot(
      next.player.x - frame.current.player.x,
      next.player.z - frame.current.player.z,
    ) > 1
    ? presentationFrame(next)
    : { ...frame, current: next };
}
export function presentationPose(frame: PresentationFrame) {
  const a = frame.previous,
    b = frame.current;
  const t =
    a.seed === b.seed && b.tick >= a.tick
      ? Math.max(0, Math.min(1, frame.alpha))
      : 1;
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    player: {
      x: lerp(a.player.x, b.player.x),
      z: lerp(a.player.z, b.player.z),
      facing:
        a.player.facing +
        Math.atan2(
          Math.sin(b.player.facing - a.player.facing),
          Math.cos(b.player.facing - a.player.facing),
        ) *
          t,
    },
    enemies: b.enemies.map((e) => {
      const old = a.enemies.find((p) => p.id === e.id) ?? e;
      return { ...e, x: lerp(old.x, e.x), z: lerp(old.z, e.z) };
    }),
    tick: lerp(a.tick, b.tick),
    departureTick: lerp(a.departureTick, b.departureTick),
    extraction: lerp(a.extraction, b.extraction),
  };
}
