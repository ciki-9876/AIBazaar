// Rendering uses a continuous clock; combat snapshots remain at 250 ms.
export function advanceReplay(
  time: number,
  elapsedMs: number,
  speed: number,
  duration: number,
) {
  return Math.min(
    duration,
    time + (Math.max(0, Math.min(100, elapsedMs)) * speed) / 1000,
  );
}
export function flightProgress(
  time: number,
  launchedAt: number,
  impactAt: number,
) {
  return Math.max(
    0,
    Math.min(1, (time - launchedAt) / Math.max(0.001, impactAt - launchedAt)),
  );
}
