// N/E/S/W bit masks. Five rotatable sections lead from inlet 0 to outlet 8.
export const PIPE_SHAPES = [10, 12, 0, 0, 3, 12, 0, 0, 3];
export function rotatedPipe(mask: number, turns: number) {
  for (let i = 0; i < turns; i++) mask = ((mask << 1) & 15) | (mask >> 3);
  return mask;
}
export function pipeFlow(turns: number[]) {
  const masks = PIPE_SHAPES.map((m, i) => rotatedPipe(m, turns[i] ?? 0));
  const wet = new Set<number>();
  if (!(masks[0] & 8)) return wet;
  const queue = [0];
  wet.add(0);
  for (let j = 0; j < queue.length; j++) {
    const i = queue[j];
    for (const [bit, opposite, next, valid] of [
      [1, 4, i - 3, i >= 3],
      [2, 8, i + 1, i % 3 < 2],
      [4, 1, i + 3, i < 6],
      [8, 2, i - 1, i % 3 > 0],
    ] as const) {
      if (valid && masks[i] & bit && masks[next] & opposite && !wet.has(next)) {
        wet.add(next);
        queue.push(next);
      }
    }
  }
  return wet;
}
export function pipeConnected(turns: unknown): turns is number[] {
  return (
    Array.isArray(turns) &&
    turns.length === 9 &&
    Array.from(turns).every((x) => Number.isInteger(x) && x >= 0 && x < 4) &&
    pipeFlow(turns).has(8) &&
    !!(rotatedPipe(PIPE_SHAPES[8], turns[8]) & 2)
  );
}
export const initialPipes = (seed: number) =>
  PIPE_SHAPES.map((m, i) => (m ? 1 + ((seed + i) % 3) : 0));
