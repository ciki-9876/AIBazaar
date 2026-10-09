/**
 * One presentation clock for every animated drawing on the page.
 * Wall-clock time lives here only; rules and simulation never read it.
 */
type Listener = (time: number, delta: number) => void;
const listeners = new Set<Listener>();
let frame = 0;
let last = 0;

function loop(time: number) {
  const delta = last ? Math.min(0.1, (time - last) / 1000) : 1 / 60;
  last = time;
  if (!document.hidden) for (const listener of listeners) listener(time / 1000, delta);
  frame = listeners.size ? requestAnimationFrame(loop) : 0;
  if (!frame) last = 0;
}

export function subscribeFrame(listener: Listener) {
  listeners.add(listener);
  if (!frame && typeof window !== 'undefined')
    frame = requestAnimationFrame(loop);
  return () => {
    listeners.delete(listener);
  };
}

export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Frame-rate independent exponential approach. */
export const approach = (from: number, to: number, delta: number, half = 0.06) =>
  to + (from - to) * Math.pow(0.5, delta / half);
