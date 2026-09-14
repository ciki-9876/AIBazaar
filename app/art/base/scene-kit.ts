import * as T from 'three';

// Shared physical vocabulary. Change palette here, not in every facility.
export const PALETTE = {
  steel: '#344c53',
  enamel: '#66807e',
  ivory: '#c7cbb2',
  rubber: '#18262d',
  brass: '#bd914e',
  cloth: '#5e6b62',
  soil: '#302f26',
};
export function createSceneKit() {
  const geometries = new Map<string, T.BufferGeometry>(),
    materials = new Map<string, T.Material>(),
    textures: T.Texture[] = [];
  const geo = (key: string, create: () => T.BufferGeometry) => {
    if (!geometries.has(key)) geometries.set(key, create());
    return geometries.get(key)!;
  };
  function material(color: string, metal = 0.25, rough = 0.7) {
    const key = `${color}/${metal}/${rough}`;
    if (!materials.has(key))
      materials.set(
        key,
        new T.MeshStandardMaterial({
          color,
          metalness: metal,
          roughness: rough,
        }),
      );
    return materials.get(key)! as T.MeshStandardMaterial;
  }
  const m = Object.fromEntries(
    Object.entries(PALETTE).map(([key, value]) => [
      key,
      material(
        value,
        key === 'steel' ? 0.7 : 0.2,
        key === 'rubber' ? 0.94 : 0.68,
      ),
    ]),
  ) as Record<keyof typeof PALETTE, T.MeshStandardMaterial>;
  const glow = material('#ffe7af', 0.1, 0.5);
  glow.emissive.set('#ffd08b');
  glow.emissiveIntensity = 2;
  const cyan = material('#9ad8d5', 0.1, 0.4);
  cyan.emissive.set('#448a87');
  cyan.emissiveIntensity = 0.8;
  const glass = new T.MeshStandardMaterial({
    color: '#a3c5b6',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    roughness: 0.2,
    metalness: 0.1,
  });
  materials.set('glass', glass);
  function box(
    parent: T.Object3D,
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    x = 0,
    y = 0,
    z = 0,
    bevel = false,
  ) {
    const key = `b/${w}/${h}/${d}/${bevel}`;
    const geometry = geo(key, () => {
      if (!bevel) return new T.BoxGeometry(w, h, d);
      const s = new T.Shape();
      s.moveTo(0.05, 0);
      s.lineTo(w - 0.05, 0);
      s.lineTo(w, 0.05);
      s.lineTo(w, h - 0.05);
      s.lineTo(w - 0.05, h);
      s.lineTo(0.05, h);
      s.lineTo(0, h - 0.05);
      s.lineTo(0, 0.05);
      s.closePath();
      const g = new T.ExtrudeGeometry(s, {
        depth: d - 0.06,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.025,
        bevelSegments: 1,
        steps: 1,
      });
      g.translate(-w / 2, -h / 2, -d / 2 + 0.03);
      return g;
    });
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(
    parent: T.Object3D,
    r: number,
    h: number,
    mat: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const mesh = new T.Mesh(
      geo(`c/${r}/${h}`, () => new T.CylinderGeometry(r, r, h, 16)),
      mat,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function pipe(
    parent: T.Object3D,
    a: number[],
    b: number[],
    radius: number,
    mat: T.Material,
  ) {
    const from = new T.Vector3().fromArray(a),
      to = new T.Vector3().fromArray(b);
    const c = cylinder(parent, radius, from.distanceTo(to), mat);
    c.position.copy(from).add(to).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      to.sub(from).normalize(),
    );
    return c;
  }
  function label(
    parent: T.Object3D,
    title: string,
    sub: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    color = '#bdd3c5',
  ) {
    const key = `label/${title}/${sub}/${color}`;
    let mat = materials.get(key);
    if (!mat) {
      const canvas = document.createElement('canvas');
      canvas.width = 768;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#172a2d';
      ctx.fillRect(0, 0, 768, 256);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(14, 14, 740, 228);
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.font = 'bold 72px Bahnschrift, Microsoft YaHei, sans-serif';
      ctx.fillText(title, 384, 110, 700);
      ctx.font = '30px Bahnschrift, Microsoft YaHei, sans-serif';
      ctx.fillText(sub, 384, 182, 700);
      const tex = new T.CanvasTexture(canvas);
      tex.colorSpace = T.SRGBColorSpace;
      textures.push(tex);
      mat = new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide });
      materials.set(key, mat);
    }
    const mesh = new T.Mesh(
      geo(`labelgeo/${w}/${h}`, () => new T.PlaneGeometry(w, h)),
      mat,
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function gauge(parent: T.Object3D, x: number, y: number, z: number) {
    const dial = cylinder(parent, 0.13, 0.06, m.rubber, x, y, z);
    dial.rotation.x = Math.PI / 2;
    const face = cylinder(parent, 0.105, 0.065, m.ivory, x, y, z + 0.02);
    face.rotation.x = Math.PI / 2;
    const needle = box(
      parent,
      0.013,
      0.15,
      0.015,
      m.brass,
      x + 0.025,
      y + 0.015,
      z + 0.06,
    );
    needle.rotation.z = -0.45;
  }
  return {
    m,
    glow,
    cyan,
    glass,
    material,
    box,
    cylinder,
    pipe,
    label,
    gauge,
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
export type SceneKit = ReturnType<typeof createSceneKit>;
