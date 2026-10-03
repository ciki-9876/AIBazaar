import * as T from 'three';
import { sitePath } from '@/lib/site-path';

/** Image PBR maps shared per room. Color is sRGB; normal and ARM are data. */
export function createSurfaceLibrary(anisotropy = 4) {
  const textures: T.Texture[] = [];
  const materials: T.MeshStandardMaterial[] = [];
  const loader = new T.TextureLoader();
  function surface(asset: string, tint: string, scale: number, normal = 0.4) {
    const load = (suffix: string, color = false) => {
      const t = loader.load(
        sitePath(`/art-assets/material-study/${asset}-${suffix}.jpg`),
      );
      t.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.anisotropy = anisotropy;
      textures.push(t);
      return t;
    };
    const arm = load('arm');
    const m = new T.MeshStandardMaterial({
      color: tint,
      map: load('color', true),
      normalMap: load('normal'),
      normalScale: new T.Vector2(normal, normal),
      roughnessMap: arm,
      aoMap: arm,
      aoMapIntensity: 0.45,
      roughness: 1,
      metalness: 0,
    });
    m.userData.tileSize = scale;
    materials.push(m);
    return m;
  }
  const wood = surface('wood_table_001', '#b7c4cd', 3.5, 0.3);
  wood.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor = 0.48 + 0.42 * roughnessFactor;',
    );
  };
  wood.customProgramCacheKey = () => 'worn-wood-roughness';
  const plaster = surface('grey_plaster_02', '#a2aea6', 4, 0.35);
  const floor = surface('concrete_floor_worn_001', '#acb1a3', 4.2, 0.4);
  const paint = surface('blue_metal_plate', '#afbeb0', 3.8, 0.27);
  return {
    wood,
    plaster,
    floor,
    paint,
    dispose() {
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

/** Project by actual dimensions so thin cabinet sides don't stretch a whole texture. */
export function surfaceUV(
  geometry: T.BufferGeometry,
  tile: number,
  wood = false,
) {
  const pos = geometry.getAttribute('position'),
    normals = geometry.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(normals.getX(i)),
      ny = Math.abs(normals.getY(i)),
      nz = Math.abs(normals.getZ(i));
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const pair =
      ny > nx && ny > nz ? (wood ? [z, x] : [x, z]) : nx > nz ? [z, y] : [x, y];
    uv[i * 2] = pair[0] / tile;
    uv[i * 2 + 1] = pair[1] / tile;
  }
  geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
}

/** Soft local contact darkening; no full-screen pass, keeps transparent barriers clean. */
export function contactTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  const g = c.createRadialGradient(64, 64, 10, 64, 64, 62);
  g.addColorStop(0, 'rgba(7,9,8,.65)');
  g.addColorStop(0.5, 'rgba(7,9,8,.3)');
  g.addColorStop(1, 'rgba(7,9,8,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(canvas);
}
