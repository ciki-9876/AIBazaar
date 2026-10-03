'use client';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sitePath } from '@/lib/site-path';
import { backTexture, frontTextures, paperBump } from './card-textures';
import { EDITIONS, type SpecimenView } from './specimen';
import { StylePostProcess } from '../../../packages/render-kit/post-process';
import type { RenderStyleSettings } from '../../../packages/render-kit/presets';

type Props = {
  view: SpecimenView;
  tier: number;
  flipped: boolean;
  zoom: boolean;
  reduced: boolean;
  reveal: number;
  reset: number;
  skip: boolean;
  onPhase: (phase: number) => void;
  onReady: (ready: boolean) => void;
  renderStyle?: RenderStyleSettings;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function rounded(w: number, h: number, r: number) {
  const s = new T.Shape(),
    x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function faceGeometry(w: number, h: number) {
  const g = new T.ShapeGeometry(rounded(w, h, 0.095), 32),
    p = g.getAttribute('position'),
    uv = g.getAttribute('uv');
  for (let i = 0; i < p.count; i++)
    uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return g;
}
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.12, '#ffffffba');
  g.addColorStop(0.4, '#ffffff20');
  g.addColorStop(1, '#ffffff00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(c);
}

export default function CardScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null),
    live = useRef(props);
  const [loaded, setLoaded] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    live.current = props;
  }, [props]);
  useEffect(() => {
    const node = mount.current;
    if (!node) return;
    let disposed = false,
      raf = 0;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      raf = requestAnimationFrame(() =>
        setError('3D 展示暂不可用。仍可在下方查看物品图与卡牌能力。'),
      );
      return () => cancelAnimationFrame(raf);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.97;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    node.appendChild(renderer.domElement);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(35, 1, 0.1, 50);
    let postProcess: StylePostProcess | undefined;
    camera.position.set(0, 0.1, 8.2);
    camera.lookAt(0, 0, 0);
    const envScene = new RoomEnvironment(),
      pmrem = new T.PMREMGenerator(renderer),
      env = pmrem.fromScene(envScene, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.45;
    envScene.dispose();
    pmrem.dispose();
    scene.add(new T.HemisphereLight('#d7e4dc', '#30352b', 1.1));
    const key = new T.DirectionalLight('#fff0ce', 2.1);
    key.position.set(-3, 4, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0003;
    scene.add(key);
    const rim = new T.DirectionalLight('#9bbef2', 2.4);
    rim.position.set(3, 1, -2);
    scene.add(rim);
    const wash = new T.PointLight('#79baff', 0, 8, 2);
    wash.position.set(0, -0.5, 1.3);
    scene.add(wash);
    const floor = new T.Mesh(
      new T.PlaneGeometry(200, 200),
      new T.ShadowMaterial({ opacity: 0.06 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.12;
    floor.receiveShadow = true;
    scene.add(floor);

    const actor = new T.Group(),
      card = new T.Group(),
      object = new T.Group();
    scene.add(actor);
    actor.add(card, object);
    const paper = paperBump(),
      back = backTexture();
    const sideMat = new T.MeshStandardMaterial({
      color: '#c7baa0',
      roughness: 0.83,
      bumpMap: paper,
      bumpScale: 0.008,
    });
    const body = new T.Mesh(
      new T.ExtrudeGeometry(rounded(2.64, 3.72, 0.1), {
        depth: 0.024,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.007,
        bevelThickness: 0.007,
        curveSegments: 24,
      }),
      sideMat,
    );
    body.position.z = -0.012;
    body.castShadow = true;
    card.add(body);
    const frontMat = new T.MeshStandardMaterial({
      roughness: 0.77,
      bumpMap: paper,
      bumpScale: 0.006,
      metalness: 0,
    });
    const front = new T.Mesh(faceGeometry(2.64, 3.72), frontMat);
    front.position.z = 0.02;
    card.add(front);
    const backMat = new T.MeshStandardMaterial({
      map: back,
      roughness: 0.83,
      bumpMap: paper,
      bumpScale: 0.006,
    });
    const backFace = new T.Mesh(faceGeometry(2.64, 3.72), backMat);
    backFace.rotation.y = Math.PI;
    backFace.position.z = -0.021;
    card.add(backFace);
    const foilMat = new T.MeshPhysicalMaterial({
      metalness: 0.95,
      roughness: 0.29,
      color: EDITIONS[2].color,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.02,
      clearcoat: 0.22,
      clearcoatRoughness: 0.18,
      iridescence: 0.6,
      iridescenceIOR: 1.4,
      iridescenceThicknessRange: [130, 380],
    });
    const foil = new T.Mesh(faceGeometry(2.64, 3.72), foilMat);
    foil.position.z = 0.0215;
    card.add(foil);
    // Angle-dependent security film on the illustration only. No glow over rules.
    const filmMat = new T.ShaderMaterial({
      uniforms: {
        strength: { value: 0.18 },
        tint: { value: new T.Color(EDITIONS[2].color) },
      },
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      vertexShader: `varying vec2 vUv; varying vec3 vView; varying vec3 vNormal;
        void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vView=-mv.xyz;vNormal=normalMatrix*normal;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying vec2 vUv;varying vec3 vView;varying vec3 vNormal;uniform float strength;uniform vec3 tint;
        void main(){
          float mask=smoothstep(.40,.43,vUv.y)*(1.-smoothstep(.80,.83,vUv.y))*smoothstep(.07,.10,vUv.x)*(1.-smoothstep(.90,.93,vUv.x));
          float angle=dot(normalize(vView),normalize(vNormal));
          float slant=vUv.x*.65+vUv.y*.4+normalize(vView).x*.85;
          float band=pow(max(0.,sin(slant*8.-angle*4.)),12.);
          float grain=.5+.5*sin((vUv.x+vUv.y)*1800.);
          vec3 spectral=.55+.45*cos(6.2831*(vec3(0.,.33,.67)+slant*.85));
          gl_FragColor=vec4(mix(tint,spectral,.48),mask*strength*band*(.45+.55*grain));
        }`,
    });
    const film = new T.Mesh(faceGeometry(2.64, 3.72), filmMat);
    film.position.z = 0.022;
    card.add(film);
    // Laminate cross-section: three fine paper plies, visible when the card turns.
    for (const z of [-0.009, 0, 0.009]) {
      const points = rounded(2.643, 3.723, 0.1)
        .getPoints(80)
        .map((p) => new T.Vector3(p.x, p.y, z));
      card.add(
        new T.LineLoop(
          new T.BufferGeometry().setFromPoints(points),
          new T.LineBasicMaterial({
            color: z === 0 ? '#726b59' : '#cfc4ac',
            transparent: true,
            opacity: 0.8,
          }),
        ),
      );
    }
    const seal = new T.Mesh(
      new T.OctahedronGeometry(0.035),
      new T.MeshPhysicalMaterial({
        color: '#9ebdc6',
        metalness: 0.9,
        roughness: 0.2,
      }),
    );
    seal.position.set(0, -1.675, 0.038);
    seal.scale.set(1, 0.85, 0.4);
    card.add(seal);

    const glow = glowTexture();
    const glintMat = new T.SpriteMaterial({
      map: glow,
      color: EDITIONS[2].color,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    const glints: T.Sprite[] = [];
    for (const [x, y] of [
      [-1.22, 1.68],
      [1.22, -1.68],
      [1.22, 1.68],
      [-1.22, -1.68],
    ]) {
      const g = new T.Sprite(glintMat);
      g.position.set(x, y, 0.03);
      card.add(g);
      glints.push(g);
    }
    const auraMat = new T.SpriteMaterial({
      map: glow,
      color: EDITIONS[2].color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    const aura = new T.Sprite(auraMat);
    aura.position.z = -0.5;
    aura.scale.set(6.4, 6.4, 1);
    scene.add(aura);
    const ringMat = new T.MeshBasicMaterial({
      color: EDITIONS[2].color,
      transparent: true,
      opacity: 0,
      side: T.DoubleSide,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    const halo = new T.Mesh(new T.RingGeometry(2.07, 2.075, 180), ringMat);
    halo.position.z = -0.25;
    scene.add(halo);
    const innerHalo = new T.Mesh(
      new T.RingGeometry(2.14, 2.148, 180, 1, 0, Math.PI * 1.45),
      ringMat,
    );
    innerHalo.position.z = -0.26;
    scene.add(innerHalo);
    const scanMaterial = new T.MeshBasicMaterial({
      color: '#a9d9df',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    const scan = new T.Mesh(new T.PlaneGeometry(3.35, 0.025), scanMaterial);
    scan.position.z = 0.9;
    scene.add(scan);
    const particles = new T.Group();
    scene.add(particles);
    const particleMaterial = new T.SpriteMaterial({
      map: glow,
      color: '#d8ecff',
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    const sparks: T.Sprite[] = [];
    for (let i = 0; i < 42; i++) {
      const p = new T.Sprite(particleMaterial);
      p.scale.setScalar(0.03 + (i % 4) * 0.013);
      sparks.push(p);
      particles.add(p);
    }

    let icon: HTMLImageElement | null = null,
      currentTier = -1,
      currentView = '',
      currentReveal = 0,
      revealStart = -1,
      lastPhase = -1,
      currentReset = -1;
    let face: T.CanvasTexture | null = null,
      mask: T.CanvasTexture | null = null;
    let model: T.Group | null = null;
    const modelResources: {
      geometries: Set<T.BufferGeometry>;
      materials: Set<T.Material>;
      textures: Set<T.Texture>;
    } = { geometries: new Set(), materials: new Set(), textures: new Set() };
    const loadModel = new GLTFLoader()
      .loadAsync(sitePath('/art-assets/card-specimen/cushion.glb'))
      .then((g) => {
        g.scene.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            modelResources.geometries.add(o.geometry);
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of ms) {
              modelResources.materials.add(m);
              for (const v of Object.values(m))
                if (v instanceof T.Texture) modelResources.textures.add(v);
            }
          }
        });
        if (disposed) {
          modelResources.geometries.forEach((g) => g.dispose());
          modelResources.materials.forEach((m) => m.dispose());
          modelResources.textures.forEach((t) => t.dispose());
          return;
        }
        model = g.scene;
        const bounds = new T.Box3().setFromObject(model),
          center = bounds.getCenter(new T.Vector3());
        model.position.sub(center);
        object.add(model);
        object.scale.setScalar(3.1);
        object.rotation.set(0.67, 0.3, -0.1);
      });
    const loadIcon = new Promise<void>((resolve, reject) => {
      const i = new Image();
      i.onload = () => {
        icon = i;
        resolve();
      };
      i.onerror = reject;
      i.src = sitePath('/art-assets/card-specimen/cushion-icon.png');
    });
    Promise.all([loadModel, loadIcon, document.fonts.ready])
      .then(() => {
        if (!disposed) {
          setLoaded(true);
          live.current.onReady(true);
        }
      })
      .catch(() => {
        if (!disposed) setError('标本资源加载失败，请刷新重试。');
      });

    const size = () => {
      const r = node.getBoundingClientRect();
      renderer.setSize(r.width, r.height);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    };
    const resize = new ResizeObserver(size);
    resize.observe(node);
    size();
    let drag = false,
      lastX = 0,
      lastY = 0,
      dragY = 0,
      dragX = 0,
      pointerX = 0,
      pointerY = 0;
    const canvas = renderer.domElement;
    const down = (e: PointerEvent) => {
      if (live.current.view === 'identify' && lastPhase > 0 && lastPhase < 4)
        return;
      drag = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      node.classList.add('is-dragging');
    };
    const move = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (drag) {
        dragY += (e.clientX - lastX) * 0.007;
        dragX = clamp(dragX + (e.clientY - lastY) * 0.004, -0.6, 0.6);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const up = (e: PointerEvent) => {
      drag = false;
      node.classList.remove('is-dragging');
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    };
    const leave = () => {
      pointerX = pointerY = 0;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', leave);

    const started = performance.now();
    let previous = started;
    const frame = (now: number) => {
      const p = live.current,
        t = (now - started) / 1000,
        dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (p.tier !== currentTier && icon) {
        currentTier = p.tier;
        face?.dispose();
        mask?.dispose();
        const textures = frontTextures(p.tier, icon);
        face = textures.front;
        mask = textures.foil;
        frontMat.map = face;
        frontMat.needsUpdate = true;
        foilMat.map = mask;
        foilMat.color.set(EDITIONS[p.tier].color);
        foilMat.iridescence =
          p.tier < 2 ? 0 : p.tier === 2 ? 0.42 : p.tier === 3 ? 0.6 : 1;
        foilMat.emissive.set(EDITIONS[p.tier].color);
        foilMat.emissiveIntensity = p.tier < 2 ? 0 : 0.045;
        foilMat.needsUpdate = true;
        filmMat.uniforms.strength.value =
          p.tier < 2 ? 0 : p.tier === 2 ? 0.16 : p.tier === 3 ? 0.23 : 0.32;
        filmMat.uniforms.tint.value.set(EDITIONS[p.tier].color);
        (seal.material as T.MeshPhysicalMaterial).color.set(
          EDITIONS[p.tier].color,
        );
      }
      if (currentView !== p.view || currentReset !== p.reset) {
        currentView = p.view;
        currentReset = p.reset;
        dragX = dragY = pointerX = pointerY = 0;
        revealStart = -1;
        lastPhase = -1;
      }
      if (currentReveal !== p.reveal) {
        currentReveal = p.reveal;
        if (p.view === 'identify' && p.reveal > 0) {
          revealStart = now;
          dragX = dragY = 0;
        }
      }
      let elapsed = revealStart < 0 ? -1 : (now - revealStart) / 1000;
      if (p.skip || (p.reduced && elapsed >= 0)) elapsed = 8;
      const revealing = p.view === 'identify',
        result = revealing && elapsed >= 5.6;
      const phase = !revealing
        ? 0
        : elapsed < 0
          ? 0
          : elapsed < 1.5
            ? 1
            : elapsed < 3.3
              ? 2
              : elapsed < 5.6
                ? 3
                : 4;
      if (phase !== lastPhase) {
        lastPhase = phase;
        p.onPhase(phase);
      }
      let colorTier = p.tier;
      if (revealing && elapsed >= 0 && !result)
        colorTier = Math.min(
          p.tier,
          Math.floor(smooth(0.7, 3.5, elapsed) * (p.tier + 1)),
        );
      const color = EDITIONS[colorTier].color;
      wash.color.set(color);
      auraMat.color.set(color);
      ringMat.color.set(color);
      particleMaterial.color.set(color);
      const ceremony = revealing && elapsed >= 0 && !result;
      const breath = p.reduced ? 0 : Math.sin(t * 2.0) * 0.025;
      const ordinary = p.view === 'item' || (revealing && elapsed < 2.1);
      object.visible = ordinary;
      card.visible = !ordinary;
      object.scale.setScalar(
        3.1 *
          (revealing && elapsed > 1.5
            ? 1 - smooth(1.5, 2.15, elapsed) * 0.78
            : 1),
      );
      object.position.y = breath;
      let targetY =
        (p.flipped ? Math.PI : 0) +
        dragY +
        (p.reduced ? 0 : pointerX * 0.12) -
        0.07;
      let targetX = dragX + (p.reduced ? 0 : pointerY * 0.055) + 0.018;
      if (revealing && elapsed >= 2.1 && !result) {
        targetY = Math.PI * (1 - smooth(3.3, 5.2, elapsed));
        targetX = 0.07;
      }
      if (p.view === 'item') {
        targetY = dragY + pointerX * 0.08;
        targetX = dragX;
      }
      actor.rotation.y = T.MathUtils.damp(actor.rotation.y, targetY, 7, dt);
      actor.rotation.x = T.MathUtils.damp(actor.rotation.x, targetX, 7, dt);
      actor.position.y = T.MathUtils.damp(
        actor.position.y,
        revealing ? 0.26 : 0,
        7,
        dt,
      );
      card.position.y = p.reduced ? 0 : breath;
      card.scale.setScalar(
        revealing
          ? (0.8 + 0.2 * smooth(2.1, 5.3, elapsed)) *
              smooth(2.05, 2.55, elapsed)
          : 1,
      );
      const desiredZ =
        (p.zoom ? 6.15 : revealing ? 7.25 : 7.0) *
        Math.max(1, 0.78 / camera.aspect);
      camera.position.z = T.MathUtils.damp(camera.position.z, desiredZ, 5, dt);
      auraMat.opacity =
        ordinary && !ceremony
          ? 0.045
          : ceremony
            ? 0.14 + 0.17 * smooth(0.5, 3.3, elapsed)
            : 0.075 + p.tier * 0.055;
      aura.scale.setScalar(ceremony ? 5 + smooth(2, 4, elapsed) * 3 : 6.8);
      wash.intensity = ceremony
        ? 1.3 + Math.sin(elapsed * 4) * 0.4
        : p.tier >= 3
          ? 0.22
          : 0;
      const showHalo = (p.tier === 4 && !ordinary) || ceremony;
      scanMaterial.opacity =
        ceremony && elapsed < 3.3
          ? 0.45 * Math.sin(Math.PI * clamp(elapsed / 3.3, 0, 1))
          : 0;
      scanMaterial.color.set(color);
      scan.position.y = 1.7 - smooth(0, 3.3, elapsed) * 3.4;
      ringMat.opacity = showHalo ? (ceremony ? 0.25 : 0.13) : 0;
      halo.rotation.z = p.reduced ? 0 : t * 0.035;
      innerHalo.rotation.z = p.reduced ? 0.4 : -t * 0.06;
      const amount = p.reduced
        ? 0
        : ceremony
          ? 42
          : !ordinary
            ? p.tier < 2
              ? 0
              : p.tier === 2
                ? 10
                : p.tier === 3
                  ? 22
                  : 36
            : 0;
      glintMat.color.set(color);
      glintMat.opacity = p.tier < 2 ? 0 : p.tier === 2 ? 0.3 : 0.48;
      for (let i = 0; i < glints.length; i++) {
        const k = p.reduced
          ? 0.1
          : 0.09 +
            Math.pow(Math.max(0, Math.sin(t * 0.6 + i * 1.8)), 8) *
              (0.1 + p.tier * 0.035);
        glints[i].scale.set(k * (p.tier >= 3 ? 1.3 : 1), k * 0.65, 1);
      }
      for (let i = 0; i < sparks.length; i++) {
        const sp = sparks[i];
        sp.visible = i < amount;
        if (!sp.visible) continue;
        const speed = ceremony ? 0.34 : 0.065,
          cycle = (t * speed + i * 0.618) % 1,
          angle = i * 2.39996 + t * 0.04;
        const r = 1.65 + (i % 5) * 0.15;
        sp.position.set(
          Math.cos(angle) * r,
          (cycle - 0.5) * 5.1,
          Math.sin(angle) * 0.55 - 0.22,
        );
        const k =
          Math.sin(cycle * Math.PI) *
          (0.016 + (i % 4) * 0.009) *
          (ceremony ? 1.6 : 1);
        sp.scale.setScalar(k);
      }
      if (!document.hidden) {
        if (p.renderStyle) {
          postProcess ??= new StylePostProcess(renderer);
          postProcess.render(scene, camera, p.renderStyle);
        } else renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', leave);
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      scene.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Line) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      modelResources.textures.forEach((t) => t.dispose());
      face?.dispose();
      mask?.dispose();
      back.dispose();
      paper.dispose();
      glow.dispose();
      env.dispose();
      auraMat.dispose();
      particleMaterial.dispose();
      glintMat.dispose();
      postProcess?.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);
  return (
    <div
      ref={mount}
      className="cs-webgl"

      aria-label={
        props.view === 'item'
          ? '缓冲垫实物 3D 模型，可拖动旋转'
          : '有纸张厚度与箔光的实体卡牌，可拖动旋转'
      }
    >
      {!loaded && !error && <span className="cs-loading">正在取出标本…</span>}
      {error && (
        <span className="cs-loading" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
