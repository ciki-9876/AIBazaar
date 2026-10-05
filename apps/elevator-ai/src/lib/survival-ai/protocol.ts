export const AI_SCHEMA = 'f9-decision-v1';
/** Stable request fingerprint, not a security signature. */
export function fingerprint(value: unknown): string {
  let hash = 2166136261;
  for (const char of JSON.stringify(value))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(16).padStart(8, '0');
}
