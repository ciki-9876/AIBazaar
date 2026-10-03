import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sitePath } from '@/lib/site-path';

export type V3 = [number, number, number];
export function rng(seed = 91) {
  let n = seed;
  return () => (n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296;
}
export class Atelier {
  root = new T.Group();
  geometries = new Set<T.BufferGeometry>();
  materials = new Set<T.Material>();
  textures = new Set<T.Texture>();
  animations: ((time: number) => void)[] = [];
  private cache = new Map<string, T.BufferGeometry>();
  private loader = new T.TextureLoader();
  private gradient?: T.DataTexture;
  private outline = new T.MeshBasicMaterial({
    color: '#121e27',
    side: T.BackSide,
  });
  constructor(public toon = false) {
    this.outline.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        'vec3 transformed = vec3(position) + normal * 0.025;',
      );
    };
    this.materials.add(this.outline);
  }
  geo(key: string, make: () => T.BufferGeometry) {
    if (!this.cache.has(key)) {
      const g = make();
      this.geometries.add(g);
      this.cache.set(key, g);
    }
    return this.cache.get(key)!;
  }
  mat(color: string, rough = 0.7, metal = 0, emissive?: string) {
    let m: T.MeshStandardMaterial | T.MeshToonMaterial;
    if (this.toon && !metal && !emissive) {
      if (!this.gradient) {
        this.gradient = new T.DataTexture(
          new Uint8Array([70, 142, 204, 255]),
          4,
          1,
          T.RedFormat,
        );
        this.gradient.minFilter = this.gradient.magFilter = T.NearestFilter;
        this.gradient.needsUpdate = true;
        this.textures.add(this.gradient);
      }
      m = new T.MeshToonMaterial({ color, gradientMap: this.gradient });
    } else
      m = new T.MeshStandardMaterial({
        color,
        roughness: rough,
        metalness: metal,
        emissive: emissive || '#000000',
        emissiveIntensity: emissive ? 2.3 : 0,
      });
    this.materials.add(m);
    return m;
  }
  physical(options: T.MeshPhysicalMaterialParameters) {
    const m = new T.MeshPhysicalMaterial(options);
    this.materials.add(m);
    return m;
  }
  weather(
    material: T.MeshStandardMaterial | T.MeshToonMaterial,
    amount = 0.18,
    scale = 2,
    painted = false,
  ) {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        'varying vec3 vSurfacePosition;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSurfacePosition = (modelMatrix * vec4(position, 1.0)).xyz;',
      );
      shader.fragmentShader =
        `varying vec3 vSurfacePosition;
float surfaceHash(vec3 p){p=fract(p*.3183099+vec3(.17,.39,.63));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float surfaceNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1)),f.x),f.y),f.z);}
` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec3 surfaceP=vSurfacePosition*${scale.toFixed(2)};
float patina=surfaceNoise(surfaceP*vec3(2.7,.6,2.7))*.7+surfaceNoise(surfaceP*9.)*.3;
float scrape=smoothstep(.63,.72,surfaceNoise(surfaceP*vec3(22.,1.2,22.)));
${painted ? 'patina=floor(patina*6.)/6.;' : ''}
diffuseColor.rgb*=1.-${amount.toFixed(2)}*(1.-patina);
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.18,1.06,.85),scrape*${(amount * 0.48).toFixed(3)});`,
      );
      if (material instanceof T.MeshStandardMaterial)
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(patina-.5)*.24,.12,1.);`,
        );
    };
    material.customProgramCacheKey = () =>
      `weather-${amount}-${scale}-${painted}`;
    material.needsUpdate = true;
    return material;
  }
  basic(color: string, opacity = 1) {
    const m = new T.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity === 1,
      side: T.DoubleSide,
    });
    this.materials.add(m);
    return m;
  }
  async texture(file: string, repeats = 1, color = true) {
    const t = await this.loader.loadAsync(sitePath(file));
    t.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repeats, repeats);
    t.anisotropy = 8;
    this.textures.add(t);
    return t;
  }
  async surface(
    name: string,
    tint: string,
    repeats: number,
    metal = 0,
    rough = 0.85,
  ) {
    const prefix = '/art-assets/material-study/' + name;
    const [map, normalMap, arm] = await Promise.all([
      this.texture(prefix + '-color.jpg', repeats),
      this.texture(prefix + '-normal.jpg', repeats, false),
      this.texture(prefix + '-arm.jpg', repeats, false),
    ]);
    const m = new T.MeshStandardMaterial({
      color: tint,
      map,
      normalMap,
      roughnessMap: arm,
      metalness: metal,
      roughness: rough,
      normalScale: new T.Vector2(0.5, 0.5),
    });
    this.materials.add(m);
    return m;
  }
  mesh(
    g: T.BufferGeometry,
    mat: T.Material,
    p: V3 = [0, 0, 0],
    parent: T.Object3D = this.root,
  ) {
    this.geometries.add(g);
    const mesh = new T.Mesh(g, mat);
    mesh.position.set(...p);
    mesh.castShadow = !mat.transparent;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  group(p: V3 = [0, 0, 0], parent: T.Object3D = this.root) {
    const g = new T.Group();
    g.position.set(...p);
    parent.add(g);
    return g;
  }
  box(
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    p: V3 = [0, 0, 0],
    bevel = 0.05,
    parent: T.Object3D = this.root,
  ) {
    return this.mesh(
      this.geo(`b${w}/${h}/${d}/${bevel}`, () =>
        bevel
          ? new RoundedBoxGeometry(
              w,
              h,
              d,
              2,
              Math.min(bevel, w / 3, h / 3, d / 3),
            )
          : new T.BoxGeometry(w, h, d),
      ),
      mat,
      p,
      parent,
    );
  }
  cyl(
    rt: number,
    rb: number,
    h: number,
    mat: T.Material,
    p: V3 = [0, 0, 0],
    n = 40,
    parent: T.Object3D = this.root,
  ) {
    return this.mesh(
      this.geo(
        `c${rt}/${rb}/${h}/${n}`,
        () => new T.CylinderGeometry(rt, rb, h, n),
      ),
      mat,
      p,
      parent,
    );
  }
  sphere(
    r: number,
    mat: T.Material,
    p: V3 = [0, 0, 0],
    scale: V3 = [1, 1, 1],
    parent: T.Object3D = this.root,
  ) {
    const m = this.mesh(
      this.geo(`s${r}`, () => new T.SphereGeometry(r, 24, 16)),
      mat,
      p,
      parent,
    );
    m.scale.set(...scale);
    return m;
  }
  ring(
    r: number,
    t: number,
    mat: T.Material,
    p: V3 = [0, 0, 0],
    parent: T.Object3D = this.root,
  ) {
    return this.mesh(
      this.geo(`r${r}/${t}`, () => new T.TorusGeometry(r, t, 10, 64)),
      mat,
      p,
      parent,
    );
  }
  pipe(
    points: V3[],
    radius: number,
    mat: T.Material,
    parent: T.Object3D = this.root,
  ) {
    const curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
    );
    return this.mesh(
      new T.TubeGeometry(
        curve,
        Math.max(12, points.length * 9),
        radius,
        10,
        false,
      ),
      mat,
      [0, 0, 0],
      parent,
    );
  }
  beam(
    a: V3,
    b: V3,
    r: number,
    mat: T.Material,
    parent: T.Object3D = this.root,
  ) {
    const av = new T.Vector3(...a),
      bv = new T.Vector3(...b),
      delta = bv.clone().sub(av);
    const m = this.cyl(r, r, delta.length(), mat, [0, 0, 0], 12, parent);
    m.position.copy(av.add(bv).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    return m;
  }
  extrude(
    points: [number, number][],
    depth: number,
    mat: T.Material,
    p: V3 = [0, 0, 0],
    bevel = 0.035,
    parent: T.Object3D = this.root,
  ) {
    const s = new T.Shape();
    points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    return this.mesh(
      new T.ExtrudeGeometry(s, {
        depth,
        bevelEnabled: bevel > 0,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 2,
        steps: 1,
      }),
      mat,
      p,
      parent,
    );
  }
  lathe(
    profile: [number, number][],
    mat: T.Material,
    p: V3 = [0, 0, 0],
    parent: T.Object3D = this.root,
  ) {
    return this.mesh(
      new T.LatheGeometry(
        profile.map((v) => new T.Vector2(...v)),
        48,
      ),
      mat,
      p,
      parent,
    );
  }
  label(
    text: string,
    sub: string,
    w: number,
    h: number,
    matColor: string,
    p: V3,
    parent: T.Object3D = this.root,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 384;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#18262a';
    c.fillRect(0, 0, 1024, 384);
    c.strokeStyle = matColor;
    c.lineWidth = 8;
    c.strokeRect(15, 15, 994, 354);
    c.fillStyle = matColor;
    c.textAlign = 'center';
    c.font = 'bold 140px Bahnschrift, sans-serif';
    c.fillText(text, 512, 185, 950);
    c.font = '44px Bahnschrift, sans-serif';
    c.fillText(sub, 512, 290, 950);
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    this.textures.add(tex);
    const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.75 });
    this.materials.add(mat);
    return this.mesh(new T.PlaneGeometry(w, h), mat, p, parent);
  }
  stone(r: number, mat: T.Material, p: V3, scale: V3 = [1, 1, 1], seed = 4) {
    const rand = rng(seed);
    const g = new T.IcosahedronGeometry(r, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const factor = 0.88 + rand() * 0.22;
      pos.setXYZ(
        i,
        pos.getX(i) * factor,
        pos.getY(i) * factor,
        pos.getZ(i) * factor,
      );
    }
    g.computeVertexNormals();
    const m = this.mesh(g, mat, p);
    m.scale.set(...scale);
    return m;
  }
  particles(
    count: number,
    color: string,
    extent: V3,
    origin: V3,
    speed = 0.25,
  ) {
    const rand = rng(314);
    const a = new Float32Array(count * 3),
      initial = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      initial[i * 3] = (rand() - 0.5) * extent[0];
      initial[i * 3 + 1] = rand() * extent[1];
      initial[i * 3 + 2] = (rand() - 0.5) * extent[2];
    }
    a.set(initial);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(a, 3));
    this.geometries.add(geo);
    const mat = new T.PointsMaterial({
      color,
      size: 0.038,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    this.materials.add(mat);
    const points = new T.Points(geo, mat);
    points.position.set(...origin);
    this.root.add(points);
    this.animations.push((time) => {
      for (let i = 0; i < count; i++) {
        a[i * 3] = initial[i * 3] + Math.sin(time * 0.3 + i) * 0.12;
        a[i * 3 + 1] = (initial[i * 3 + 1] + time * speed) % extent[1];
      }
      geo.attributes.position.needsUpdate = true;
    });
    return points;
  }
  flame(p: V3, color: string) {
    const g = this.group(p);
    g.userData.dynamic = true;
    const mat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        fireColor: { value: new T.Color(color) },
      },
      vertexShader:
        'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float time; uniform vec3 fireColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){vec2 uv=vUv;float n=noise(vec2(uv.x*5.,uv.y*7.-time*3.));float x=uv.x-.5+sin(uv.y*8.-time*4.)*.06*uv.y;float w=(1.-uv.y)*.35;float shape=1.-smoothstep(w*.3,w+.09,abs(x)+(n-.5)*.14);float a=shape*smoothstep(0.,.10,uv.y)*(1.-smoothstep(.75,1.,uv.y));vec3 c=mix(vec3(1.,.94,.6),fireColor,smoothstep(.05,.8,uv.y));gl_FragColor=vec4(c*2.2,a*.85);}`,
    });
    this.materials.add(mat);
    const f = this.mesh(new T.PlaneGeometry(0.64, 0.95), mat, [0, 0.43, 0], g);
    f.castShadow = false;
    const cross = this.mesh(f.geometry, mat, [0, 0.43, 0], g);
    cross.rotation.y = Math.PI / 2;
    cross.castShadow = false;
    const l = new T.PointLight(color, 5, 5, 2);
    l.position.set(...p);
    l.position.y += 0.4;
    this.root.add(l);
    this.animations.push((t) => {
      mat.uniforms.time.value = t + p[0];
      l.intensity = 5 + Math.sin(t * 10 + p[0]) * 0.8;
    });
    return g;
  }
  // Merge only static opaque geometry. Transparent surfaces keep their sorting;
  // animated hierarchies remain independent, so orbiting never reveals a backdrop.
  compile() {
    this.root.updateMatrixWorld(true);
    const batches = new Map<
      T.Material,
      { meshes: T.Mesh[]; geometries: T.BufferGeometry[] }
    >();
    this.root.traverse((o) => {
      if (
        !(o instanceof T.Mesh) ||
        Array.isArray(o.material) ||
        o.material.transparent
      )
        return;
      let p: T.Object3D | null = o;
      while (p) {
        if (p.userData.dynamic) return;
        p = p.parent;
      }
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const compatible = g.index ? g.toNonIndexed() : g;
      for (const attr of Object.keys(compatible.attributes))
        if (!['position', 'normal', 'uv'].includes(attr))
          compatible.deleteAttribute(attr);
      if (!compatible.attributes.uv)
        compatible.setAttribute(
          'uv',
          new T.BufferAttribute(
            new Float32Array(compatible.attributes.position.count * 2),
            2,
          ),
        );
      if (!compatible.attributes.normal) compatible.computeVertexNormals();
      if (g !== compatible) g.dispose();
      let b = batches.get(o.material);
      if (!b) {
        b = { meshes: [], geometries: [] };
        batches.set(o.material, b);
      }
      b.meshes.push(o);
      b.geometries.push(compatible);
    });
    for (const [mat, b] of batches) {
      const merged = mergeGeometries(b.geometries, false);
      b.geometries.forEach((g) => g.dispose());
      if (!merged) continue;
      b.meshes.forEach((m) => m.removeFromParent());
      this.mesh(merged, mat);
      if (this.toon && mat instanceof T.MeshToonMaterial) {
        const edge = this.mesh(merged, this.outline);
        edge.castShadow = false;
        edge.receiveShadow = false;
      }
    }
  }
  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
