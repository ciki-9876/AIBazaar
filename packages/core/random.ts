/** Named streams for new mechanisms. Existing versioned game RNGs remain intact. */
export function randomStream(seed: number, scope: string): () => number {
  let state = seed >>> 0;
  for (const byte of new TextEncoder().encode(scope)) state = Math.imul(state ^ byte, 16777619) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
