import * as T from 'three';
import {
  ROOM,
  distance,
  clearSight,
  type Cache,
  type SurvivalState,
} from '../../lib/survival-room.ts';
import { visionRange } from '../../lib/survival-world.ts';

/** Owns loot instances, visibility hysteresis and retirement; authored containers stay visible in explored fog. */
export function createCacheLayer(
  create: (cache: Cache, garden: boolean) => T.Group,
) {
  const caches = new Map<string, T.Group>();
  const seenCaches = new Set<string>();
  const cacheVisible = (s: SurvivalState, cache: Cache) => {
    const visible =
      !cache.opened &&
      cache.available <= s.tick &&
      distance(s.player, cache) <=
        visionRange(s) - (seenCaches.has(cache.id) ? 0 : 0.3) &&
      !!s.fog.visible[Math.floor(cache.z) * ROOM.width + Math.floor(cache.x)] &&
      clearSight(s.player, cache, s.world);
    if (visible) seenCaches.add(cache.id);
    else seenCaches.delete(cache.id);
    return visible;
  };

  const remove = (id: string, obj: T.Group) => {
    obj.userData.dispose?.();
    obj.removeFromParent();
    caches.delete(id);
    seenCaches.delete(id);
  };
  return {
    visible: cacheVisible,
    clear() {
      for (const [id, obj] of caches) remove(id, obj);
      seenCaches.clear();
    },
    update(s: SurvivalState, stage: string, overhead: number) {
      const live = new Set(s.caches.map((cache) => cache.id));
      for (const [id, obj] of caches) if (!live.has(id)) remove(id, obj);
      for (const c of s.caches) {
        const visible = cacheVisible(s, c);
        if (!visible) {
          const obj = caches.get(c.id);
          if (obj) {
            obj.visible =
              c.container !== 'loose' &&
              !!s.fog.explored[Math.floor(c.z) * ROOM.width + Math.floor(c.x)];
            const lid = obj.getObjectByName('lid');
            if (lid) {
              if (c.container === 'locker')
                lid.rotation.y = c.searched ? -1.6 : 0;
              else lid.rotation.x = c.searched ? -1.15 : 0;
            }
            const beacon = obj.getObjectByName('beacon');
            if (beacon) beacon.visible = false;
            const aura = obj.getObjectByName('loot-aura');
            if (aura) aura.visible = false;
          }
          continue;
        }
        let obj = caches.get(c.id);
        if (!obj) {
          obj = create(c, s.world.theme === 'pavilion');
          caches.set(c.id, obj);
        }
        obj.position.set(c.x, 0, c.z);
        obj.visible = true;
        const lid = obj.getObjectByName('lid');
        if (lid) {
          if (c.container === 'locker') lid.rotation.y = c.searched ? -1.6 : 0;
          else lid.rotation.x = c.searched ? -1.15 : 0;
        }
        const beacon = obj.getObjectByName('beacon')!;
        beacon.visible =
          s.status === 'running' &&
          !['departing', 'second-departing', 'collapse'].includes(stage) &&
          overhead > 0.99;
        beacon.rotation.y = 0;
        obj.getObjectByName('loot-aura')!.visible = beacon.visible;
      }
    },
  };
}
