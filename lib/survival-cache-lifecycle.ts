import type { Cache } from './survival-room.ts';

/** Only procedural drops retire. Authored tutorial props and persistent containers keep their identity. */
export function isSpentDrop(cache: Cache) {
  return (
    cache.container === 'loose' &&
    cache.opened &&
    cache.contents.length === 0 &&
    (cache.id.startsWith('brain-cache-') || cache.id.startsWith('dropped-'))
  );
}

export function activeCaches(caches: Cache[]) {
  return caches.filter((cache) => !isSpentDrop(cache));
}
