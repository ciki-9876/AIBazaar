import * as T from 'three';
import type { RaceState } from '@/lib/survival-race';
import type { SeasonState } from '@/lib/survival-season';
import { ROOM, clearSight, type SurvivalState } from '@/lib/survival-room';

/** World-space geometry and sprites share the camera frame; no DOM projection jitter. */
export function createRaceStations(scene: T.Scene) {
  const entries = new Map<
    string,
    {
      root: T.Group;
      marker: T.Sprite;
      ring: T.Mesh<T.RingGeometry, T.MeshBasicMaterial>;
      screen: T.Mesh<T.BoxGeometry, T.MeshBasicMaterial>;
    }
  >();
  const box = new T.BoxGeometry(1, 1, 1),
    ringGeo = new T.RingGeometry(0.72, 0.83, 48);
  const iron = new T.MeshToonMaterial({ color: '#263638' }),
    edge = new T.MeshBasicMaterial({ color: '#101718' });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d5b772';
  ctx.fillRect(12, 16, 40, 32);
  ctx.clearRect(8, 28, 10, 8);
  ctx.clearRect(46, 28, 10, 8);
  ctx.strokeStyle = '#161d1c';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 23, 24, 18);
  for (let y = 20; y < 47; y += 7) ctx.clearRect(28, y, 3, 3);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.magFilter = T.NearestFilter;
  function create(id: string) {
    const root = new T.Group();
    const body = new T.Mesh(box, iron);
    body.scale.set(0.72, 1.15, 0.56);
    body.position.y = 0.61;
    root.add(body);
    const borders = new T.LineSegments(
      new T.EdgesGeometry(box),
      new T.LineBasicMaterial({ color: '#080e10' }),
    );
    borders.scale.copy(body.scale);
    borders.position.copy(body.position);
    root.add(borders);
    const base = new T.Mesh(box, edge);
    base.scale.set(0.92, 0.14, 0.72);
    base.position.y = 0.08;
    root.add(base);
    const screen = new T.Mesh(
      box,
      new T.MeshBasicMaterial({ color: '#baa15f' }),
    );
    screen.scale.set(0.42, 0.22, 0.025);
    screen.position.set(0, 0.92, 0.29);
    root.add(screen);
    const ring = new T.Mesh(
      ringGeo,
      new T.MeshBasicMaterial({
        color: '#d8b46b',
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    root.add(ring);
    const marker = new T.Sprite(
      new T.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    marker.position.y = 1.9;
    marker.scale.set(0.9, 0.9, 1);
    root.add(marker);
    scene.add(root);
    const entry = { root, marker, ring, screen };
    entries.set(id, entry);
    return entry;
  }
  return {
    update(
      s: SurvivalState,
      r: RaceState | undefined,
      overhead: number,
      season?: SeasonState,
    ) {
      for (const obj of entries.values()) obj.root.visible = false;
      if (!r && !season) return;
      const sources = season
        ? season.sources
            .filter((q) => q.actor === 'player')
            .map((q) => ({
              ...q,
              exhausted: q.taken,
              nextAt: 0,
              guarded: false,
            }))
        : r!.sources;
      const tick = season?.tick ?? r!.tick;
      for (const source of sources.filter((v) => v.floor === s.floor)) {
        const cell = Math.floor(source.z) * ROOM.width + Math.floor(source.x);
        if (!s.fog.explored[cell]) continue;
        const obj = entries.get(source.id) || create(source.id);
        obj.root.position.set(source.x, 0, source.z);
        obj.root.visible = true;
        const visible =
          !!s.fog.visible[cell] && clearSight(s.player, source, s.world);
        const active = visible && !source.exhausted && source.nextAt <= tick;
        obj.marker.visible =
          active && overhead > 0.99 && s.status === 'running';
        obj.ring.visible = obj.marker.visible;
        const pulse = 0.65 + Math.sin(tick / 42) * 0.15;
        (obj.marker.material as T.SpriteMaterial).opacity = pulse;
        obj.ring.material.opacity = pulse * 0.3;
        obj.screen.material.color.set(
          active
            ? source.guarded &&
              s.enemies.some((e) => e.kind === 'boss' && e.hp > 0)
              ? '#9f4745'
              : '#baa15f'
            : '#303633',
        );
      }
    },
    dispose() {
      for (const obj of entries.values()) {
        obj.root.removeFromParent();
        obj.marker.material.dispose();
        obj.ring.material.dispose();
        obj.screen.material.dispose();
        obj.root.traverse((v) => {
          if (v instanceof T.LineSegments) {
            v.geometry.dispose();
            (v.material as T.Material).dispose();
          }
        });
      }
      entries.clear();
      box.dispose();
      ringGeo.dispose();
      texture.dispose();
      iron.dispose();
      edge.dispose();
    },
  };
}
