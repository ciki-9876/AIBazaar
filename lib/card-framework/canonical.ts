import { HASH_VERSION } from './registry.ts';

export function canonical(value: unknown): string {
  function clean(v: unknown): unknown {
    if (typeof v === 'string') return v.normalize('NFC');
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw Error('NON_FINITE_NUMBER');
      return Object.is(v, -0) ? 0 : v;
    }
    if (v === null || typeof v === 'boolean') return v;
    if (Array.isArray(v)) return v.map(clean);
    if (
      v &&
      typeof v === 'object' &&
      Object.getPrototypeOf(v) === Object.prototype
    ) {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(v).sort()) {
        const normalized = key.normalize('NFC');
        if (
          ['__proto__', 'prototype', 'constructor'].includes(normalized) ||
          Object.hasOwn(out, normalized)
        )
          throw Error('UNSAFE_OR_DUPLICATE_KEY');
        out[normalized] = clean((v as Record<string, unknown>)[key]);
      }
      return out;
    }
    throw Error('NON_JSON_VALUE');
  }
  return JSON.stringify(clean(value));
}
export async function fingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `${HASH_VERSION}:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
export const copy = <T>(value: T): T => JSON.parse(canonical(value)) as T;
export function splitCents(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count),
    remainder = total - base * count;
  return Array.from(
    { length: count },
    (_, i) => base + (i < remainder ? 1 : 0),
  );
}
/** Stable proportional allocation of integer cents; ties use the existing stable order. */
export function proportional(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const result = weights.map((w) => Math.floor((total * w) / sum));
  let remainder = total - result.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % weights.length)
    if (weights[i] > 0) {
      result[i]++;
      remainder--;
    }
  return result;
}
export function seededRandom(key: string) {
  let seed = 2166136261;
  for (let i = 0; i < key.length; i++)
    seed = Math.imul(seed ^ key.charCodeAt(i), 16777619) >>> 0;
  return (bound: number) => {
    const limit = Math.floor(4294967296 / bound) * bound;
    let n: number;
    do {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      n = (t ^ (t >>> 14)) >>> 0;
    } while (n >= limit);
    return n % bound;
  };
}
