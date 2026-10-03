import * as T from 'three';
import {
  ELEVATOR,
  isVisible,
  type Cache,
  type Point,
  type SurvivalState,
} from '@/lib/survival-room';
import { insideLift } from '@/lib/survival-lift';
import type { presentationPose } from '@/lib/survival-presentation';

export type Marker = { id: string; x: number; y: number; visible: boolean };

/** Optional legacy DOM labels. The opening uses world-space labels and never calls this. */
export function projectMarkers(
  s: SurvivalState,
  pose: ReturnType<typeof presentationPose>,
  camera: T.Camera,
  width: number,
  height: number,
  overhead: number,
  cacheVisible: (state: SurvivalState, cache: Cache) => boolean,
) {
  const markers: Marker[] = [],
    vector = new T.Vector3();
  const project = (id: string, p: Point, y: number, visible: boolean) => {
    vector.set(p.x, y, p.z).project(camera);
    markers.push({
      id,
      x: ((vector.x + 1) * width) / 2,
      y: ((1 - vector.y) * height) / 2,
      visible:
        visible &&
        overhead > 0.95 &&
        Math.abs(vector.x) < 1 &&
        Math.abs(vector.y) < 1 &&
        Math.abs(vector.z) < 1,
    });
  };
  s.caches.forEach((cache) =>
    project(
      cache.id,
      cache,
      cache.container === 'locker' ? 2.7 : 1.7,
      cacheVisible(s, cache),
    ),
  );
  project(
    'lift',
    ELEVATOR,
    2.8,
    isVisible(s, ELEVATOR) && !insideLift(s.player, ELEVATOR),
  );
  const boss = pose.enemies.find((enemy) => enemy.kind === 'boss');
  if (boss) project('warden', boss, 3.5, isVisible(s, boss));
  project('player', pose.player, 2.2, true);
  return markers;
}
