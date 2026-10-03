import * as T from 'three';
import { Atelier, rng } from '../../packages/render-kit/atelier';
import { buildGarden } from './pavilion-assets';
import { buildPortalLift } from './wasteland';
import { industrialPalette } from './art-direction';
import { gardenManifest } from '@/lib/survival-pavilion';
import type { RoomWorld } from '@/lib/survival-world';

export function gardenWeather(kit: Atelier, seed: number) {
  const rand = rng(seed),
    count = 950,
    positions = new Float32Array(count * 6),
    bases = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = 22 + rand() * 53,
      y = rand() * 15,
      z = 28 + rand() * 50;
    positions.set([x, y, z, x + 0.05, y + 0.33, z - 0.025], i * 6);
    bases.set([y, y], i * 2);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(positions, 3));
  geo.setAttribute('rainBase', new T.BufferAttribute(bases, 1));
  const material = new T.LineBasicMaterial({
    color: '#9eb8b9',
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const clock = { value: 0 };
  material.onBeforeCompile = (s) => {
    s.uniforms.rainTime = clock;
    s.vertexShader =
      'uniform float rainTime; attribute float rainBase;\n' + s.vertexShader;
    s.vertexShader = s.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.y = mod(rainBase - rainTime * 9., 15.) + position.y - rainBase;',
    );
  };
  kit.materials.add(material);
  kit.geometries.add(geo);
  const rain = new T.LineSegments(geo, material);
  rain.name = 'garden-weather';
  rain.frustumCulled = false;
  kit.root.add(rain);
  kit.animations.push((t) => {
    clock.value = t;
  });
}
export function buildPavilion(kit: Atelier, world: RoomWorld) {
  const manifest = world.garden ?? gardenManifest(world.seed);
  buildGarden(kit, manifest);
  if (manifest.mood === 'rain') gardenWeather(kit, world.seed);
  return buildPortalLift(kit, industrialPalette(kit));
}
