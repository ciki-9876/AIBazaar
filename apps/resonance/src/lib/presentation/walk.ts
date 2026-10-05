// The throw prototype's fixed-step horizontal controls, adapted locally.
// This module never imports another product or reads an ambient clock.
export const WALK_STEP_MS = 20;
export const WAYSTATION_WIDTH = 1000;
export type WalkState = {
  x: number;
  facing: -1 | 1;
  steps: number;
};
export const initialWalk = (): WalkState => ({ x: 385, facing: 1, steps: 0 });
export function walkStep(
  state: WalkState,
  direction: -1 | 0 | 1,
  steps: number,
  paused = false,
): WalkState {
  if (
    paused ||
    direction === 0 ||
    ![-1, 1].includes(direction) ||
    !Number.isInteger(steps) ||
    steps < 1 ||
    steps > 5
  )
    return state;
  const x = Math.max(
    65,
    Math.min(WAYSTATION_WIDTH - 65, state.x + direction * 3 * steps),
  );
  return {
    x,
    facing: direction,
    steps: state.steps + (x === state.x ? 0 : steps),
  };
}
export const WAYSTATION_SPOTS = [
  { id: 'mentor', x: 310, title: '许师傅', verb: '坐下来听' },
  { id: 'door', x: 530, title: '驿站的门', verb: '进入心景' },
  { id: 'letter', x: 820, title: '信箱', verb: '读一封来信' },
] as const;
export type SpotId = (typeof WAYSTATION_SPOTS)[number]['id'];
export function nearbySpot(state: WalkState) {
  return (
    [...WAYSTATION_SPOTS]
      .filter((spot) => Math.abs(spot.x - state.x) <= 65)
      .sort(
        (a, b) =>
          Math.abs(a.x - state.x) - Math.abs(b.x - state.x) ||
          (a.id < b.id ? -1 : 1),
      )[0] ?? null
  );
}
