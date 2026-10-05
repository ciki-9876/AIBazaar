/** JSON with sorted object keys; array and string order is preserved exactly. */
export function canonicalJson(value: unknown): string {
  const active = new Set<object>();
  const clean = (input: unknown, array = false): unknown => {
    if (input === undefined) return array ? null : undefined;
    if (input === null || typeof input === 'boolean' || typeof input === 'string') return input;
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) throw Error('存档包含无效数值');
      return input;
    }
    if (typeof input !== 'object' || (!Array.isArray(input) && ![Object.prototype, null].includes(Object.getPrototypeOf(input)))) throw Error('存档包含非 JSON 数据');
    if (active.has(input)) throw Error('存档包含循环引用');
    active.add(input);
    let result: unknown;
    if (Array.isArray(input)) result = Array.from(input, (v) => clean(v, true));
    else {
      const out: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(input).sort((a, b) => a < b ? -1 : a > b ? 1 : 0)) {
        const v = clean((input as Record<string, unknown>)[key]);
        if (v !== undefined) out[key] = v;
      }
      result = out;
    }
    active.delete(input);
    return result;
  };
  const result = JSON.stringify(clean(value));
  if (result === undefined) throw Error('存档为空');
  return result;
}

/** Corruption detection, not a signature or protection against manual edits. */
export function checksum(value: unknown): string {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(canonicalJson(value))) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}
