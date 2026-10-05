import * as T from 'three';
import type { SeasonState } from '@/lib/survival-season';
import { isVisible, type SurvivalState } from '@/lib/survival-room';
import type { Atelier } from '../../packages/render-kit/atelier';
import { createActors } from './creatures';

/** Bodies display authoritative poses only; there is no opponent decision loop here. */
export function createSeasonActors(scene: T.Scene, kit: Atelier) {
  const actors = new Map<string, T.Group>(),
    pods = new Map<string, T.Group>(),
    human = createActors(kit, 'maintenance').human;
  function label(text: string, color = '#d5c99b') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#132727';
    ctx.fillRect(0, 0, 128, 48);
    ctx.fillStyle = color;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 64, 34);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    kit.textures.add(map);
    const material = new T.SpriteMaterial({
      map,
      depthWrite: false,
      fog: false,
    });
    // Body visibility follows authoritative room fog; labels are screen markers.
    material.userData.screenMarker = true;
    kit.materials.add(material);
    const sprite = new T.Sprite(material);
    sprite.scale.set(1.25, 0.47, 1);
    return sprite;
  }
  return {
    update(room: SurvivalState, season?: SeasonState, target?: string) {
      for (const body of actors.values()) body.visible = false;
      for (const pod of pods.values()) pod.visible = false;
      if (!season || (room.floor !== 4 && room.floor! % 10 !== 0)) return;
      const entrances = room.world.seasonLayout?.entrances || [];
      for (const [i, a] of season.actors.entries()) {
        if (i > 0 && entrances[i]) {
          let pod = pods.get(a.id);
          if (!pod) {
            pod = kit.group();
            kit.box(
              1.5,
              2.3,
              0.14,
              kit.mat('#263c3c'),
              [0, 1.15, 0],
              0.04,
              pod,
            );
            kit.box(
              0.05,
              2.05,
              0.05,
              kit.mat('#bead76'),
              [0, 1.13, 0.1],
              0.01,
              pod,
            );
            const number = label(a.number);
            number.position.y = 2.65;
            pod.add(number);
            pods.set(a.id, pod);
            scene.add(pod);
          }
          const entrance = entrances[i];
          pod.position.set(entrance.x, 0, entrance.z);
          pod.rotation.y = entrance.x < 48 ? Math.PI / 2 : -Math.PI / 2;
          pod.visible = room.floor === 4 || isVisible(room, entrance);
        }
        if (
          a.controller === 'player' ||
          a.floor !== room.floor ||
          a.status !== 'alive' ||
          a.inLift
        )
          continue;
        let body = actors.get(a.id);
        if (!body) {
          body = human().group;
          const number = label(a.number);
          number.position.y = 2.25;
          body.add(number);
          const ring = new T.Mesh(
            new T.RingGeometry(0.38, 0.46, 32),
            new T.MeshBasicMaterial({
              color: '#d27b66',
              side: T.DoubleSide,
              transparent: true,
              opacity: 0.75,
            }),
          );
          kit.materials.add(ring.material);
          kit.geometries.add(ring.geometry);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.04;
          ring.name = 'hostile-ring';
          body.add(ring);
          actors.set(a.id, body);
          scene.add(body);
        }
        body.position.set(a.position.x, 0, a.position.z);
        body.visible = room.floor === 4 || isVisible(room, a.position);
        body.getObjectByName('hostile-ring')!.visible = a.id === target;
      }
    },
    dispose() {
      for (const body of [...actors.values(), ...pods.values()])
        body.removeFromParent();
      actors.clear();
      pods.clear();
    },
  };
}
