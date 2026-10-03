import { UI_FONT } from './design-tokens';
import * as T from 'three';
import { Atelier } from '../../packages/render-kit/atelier';
import { type SurvivalState } from '@/lib/survival-room';

import type { OpeningState } from '@/lib/survival-opening';
import { paintTerminal, screenBrightness } from './terminal-screen';

/** Diegetic details; no random simulation state and no downloaded ad content. */
export function liftAtmosphere(
  kit: Atelier,
  root: T.Group,
  walls: T.Group,
  opening = false,
) {
  const local = <M extends T.Material>(m: M) => {
    m.userData.liftInterior = true;
    kit.materials.add(m);
    return m;
  };
  const dark = local(kit.mat('#152725'));
  const trim = local(kit.mat('#4b5143'));
  const phosphor = local(
    new T.MeshBasicMaterial({ color: '#91b6a8', toneMapped: false }),
  );

  // Physical, portrait-format screen opposite the existing car operating panel.
  const ad = kit.group([-0.512, 1.43, -0.22], walls);
  ad.name = 'lift-os-display';
  ad.rotation.y = Math.PI / 2;
  kit.box(0.48, 0.67, 0.041, dark, [0, 0, 0], 0.018, ad);
  kit.box(0.446, 0.63, 0.044, trim, [0, 0, 0.008], 0.01, ad);
  kit.box(0.426, 0.608, 0.045, dark, [0, 0, 0.016], 0.008, ad);
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 860;
  const ctx = canvas.getContext('2d')!;
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 8;
  kit.textures.add(texture);
  const screenMat = local(
    new T.MeshBasicMaterial({
      map: texture,
      color: '#8b9f94',
      toneMapped: false,
    }),
  );
  const terminalTarget = kit.mesh(
    new T.PlaneGeometry(0.409, 0.577),
    screenMat,
    [0, 0.005, 0.042],
    ad,
  );
  kit.sphere(0.003, phosphor, [0.179, -0.306, 0.044], [1, 1, 0.4], ad);
  const cable = kit.pipe(
    [
      [0, -0.32, -0.012],
      [0, -0.43, -0.012],
      [0.035, -0.5, -0.012],
    ],
    0.006,
    dark,
    ad,
  );
  cable.castShadow = false;
  const spill = new T.PointLight('#80b6a3', 0.18, 1.65, 2);
  spill.position.set(-0.43, 1.45, -0.2);
  root.add(spill);
  const bread = kit.group([0, -0.177, 0.058], ad);
  const crust = local(kit.mat('#ba8242')),
    crumb = local(kit.mat('#e4bd75'));
  kit.box(0.095, 0.044, 0.055, crust, [0, 0, 0], 0.009, bread);
  kit.box(0.078, 0.014, 0.044, crumb, [0, 0.023, 0], 0.004, bread);
  for (let i = -1; i <= 1; i++) {
    const cut = kit.box(
      0.004,
      0.002,
      0.038,
      crust,
      [i * 0.024, 0.031, 0],
      0,
      bread,
    );
    cut.rotation.y = -0.25;
  }
  bread.visible = false;
  let currentOpening: OpeningState | undefined;
  let screenKey = '';
  const holeTarget = kit.mesh(
    new T.PlaneGeometry(0.29, 0.115),
    local(new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false })),
    [0, -0.177, 0.047],
    ad,
  );
  holeTarget.castShadow = false;
  holeTarget.visible = false;
  paintTerminal(ctx);
  texture.needsUpdate = true;
  // A real mesh icon at the door, with an intentionally restrained breathing glow.
  const guide = kit.group([0, 1.39, -0.625], root);
  const glyph = local(
    new T.MeshBasicMaterial({
      color: '#a9c9b4',
      transparent: true,
      opacity: 0.76,
      toneMapped: false,
    }),
  );
  const stroke = (a: [number, number, number], b: [number, number, number]) =>
    kit.beam(a, b, 0.0028, glyph, guide);
  stroke([-0.043, -0.035, 0], [-0.043, 0.044, 0]);
  stroke([0.043, -0.035, 0], [0.043, 0.044, 0]);
  stroke([-0.043, 0.044, 0], [0.043, 0.044, 0]);
  stroke([0, -0.035, 0], [0, 0.038, 0]);
  for (const side of [-1, 1]) {
    stroke([side * 0.066, 0, 0], [side * 0.109, 0, 0]);
    stroke([side * 0.109, 0, 0], [side * 0.09, 0.017, 0]);
    stroke([side * 0.109, 0, 0], [side * 0.09, -0.017, 0]);
  }
  const keyCanvas = document.createElement('canvas');
  keyCanvas.width = 128;
  keyCanvas.height = 128;
  const k = keyCanvas.getContext('2d')!;
  k.strokeStyle = '#a9c9b4';
  k.lineWidth = 3;
  k.strokeRect(25, 21, 78, 82);
  k.fillStyle = '#a9c9b4';
  k.font = `64px ${UI_FONT}`;
  k.textAlign = 'center';
  k.fillText('E', 64, 84);
  const keyTexture = new T.CanvasTexture(keyCanvas);
  keyTexture.colorSpace = T.SRGBColorSpace;
  kit.textures.add(keyTexture);
  const keyMat = local(
    new T.MeshBasicMaterial({
      map: keyTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
      toneMapped: false,
    }),
  );
  kit.mesh(new T.PlaneGeometry(0.049, 0.049), keyMat, [0, -0.085, 0], guide);
  const hitMaterial = local(
    new T.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  const hit = kit.mesh(
    new T.PlaneGeometry(0.86, 1.85),
    hitMaterial,
    [0, 1.01, -0.619],
    root,
  );
  hit.castShadow = false;
  hit.receiveShadow = false;
  if (opening) {
    guide.position.set(0.492, 1.28, -0.32);
    guide.rotation.y = -Math.PI / 2;
    guide.scale.setScalar(0.7);
    hit.position.set(0.483, 1.23, -0.32);
    hit.rotation.y = -Math.PI / 2;
    hit.scale.set(0.36, 0.43, 1);
    keyCanvas.width = 256;
    keyCanvas.height = 128;
    k.clearRect(0, 0, 256, 128);
    k.fillStyle = '#b3d0bd';
    k.font = `48px ${UI_FONT}`;
    k.textAlign = 'center';
    k.fillText('按 E', 128, 80);
    keyTexture.needsUpdate = true;
    const plaque = guide.children.find(
      (o) => o instanceof T.Mesh && o.material === keyMat,
    );
    if (plaque) plaque.scale.set(3, 1.5, 1);
  }

  // An opaque optical baffle BEHIND the leaves seals tiny real geometry gaps.
  // The smoke in front remains translucent; it is not used to hide a visible world leak.
  const baffleMat = local(
    new T.MeshBasicMaterial({
      color: '#020706',
      side: T.DoubleSide,
      transparent: true,
    }),
  );
  const baffle = kit.mesh(
    new T.PlaneGeometry(1.01, 2.06),
    baffleMat,
    [0, 1.02, -0.781],
    root,
  );
  baffle.castShadow = false;
  const smokeMat = local(
    new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      uniforms: { time: { value: 0 }, strength: { value: 1 } },
      vertexShader:
        'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv;uniform float time;uniform float strength;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
void main(){vec2 p=vec2(vUv.x*3.3,vUv.y*7.-time*.12);
float n=noise(p)*.65+noise(p*2.1+time*.025)*.35;
float center=.5+.14*sin(vUv.y*11.+time*.22);
float edge=1.-smoothstep(.04,.49,abs(vUv.x-center));
float ends=smoothstep(0.,.08,vUv.y)*(1.-smoothstep(.91,1.,vUv.y));
gl_FragColor=vec4(vec3(.008,.014,.014),edge*ends*(.18+n*.46)*strength);}`,
    }),
  );
  const smoke = kit.group([0, 0, 0], root);
  for (const [x, w] of [
    [0, 0.17],
    [-0.469, 0.1],
    [0.469, 0.1],
  ]) {
    const m = kit.mesh(
      new T.PlaneGeometry(w, 2.05),
      smokeMat,
      [x, 1.02, -0.607],
      smoke,
    );
    m.castShadow = false;
  }
  const sill = kit.mesh(
    new T.PlaneGeometry(0.19, 0.94),
    smokeMat,
    [0, 0.035, -0.596],
    smoke,
  );
  sill.rotation.z = Math.PI / 2;
  sill.castShadow = false;
  let atmosphereTime = 0;
  return {
    hit,
    terminalTarget,
    holeTarget,
    present(this: void, value?: OpeningState) {
      currentOpening = value;
    },
    update(
      s: SurvivalState,
      reduced: boolean,
      overhead: number,
      openness: number,
      dt: number,
      hover: boolean,
      paused: boolean,
      guideEnabled = true,
    ) {
      if (!paused && !reduced) atmosphereTime += dt;
      smokeMat.uniforms.time.value = atmosphereTime;
      const closed = 1 - T.MathUtils.smoothstep(openness, 0.03, 0.88);
      smokeMat.uniforms.strength.value = closed;
      smoke.visible = closed > 0.001 && overhead < 0.6;
      baffle.visible = closed > 0.001;
      baffleMat.opacity = closed;
      baffleMat.depthWrite = closed > 0.999;
      guide.visible =
        guideEnabled &&
        (s.status === 'ready' || s.status === 'extracted') &&
        openness < 0.05;
      const breath = reduced ? .83 : .74 + Math.sin(atmosphereTime * 1.25) * .20;
      glyph.opacity = breath;
      keyMat.opacity = breath;
      glyph.color.setScalar(hover ? 1.18 : 1.05);
      guide.position.y = opening ? 1.28 : 1.39;
      hit.visible = guide.visible;
      const brightness = screenBrightness(currentOpening, reduced);
      spill.intensity = overhead < 0.72 ? brightness * 0.055 : 0;
      screenMat.color.setScalar(brightness);
      const meal = currentOpening?.afterlight;
      const serving =
        currentOpening?.stage === 'home' && meal?.phase === 'serve-food';
      bread.visible = serving && overhead < 0.12;
      if (serving && meal) {
        const t = Math.min(1, meal.tick / 90);
        bread.position.set(
          Math.sin(t * Math.PI) * 0.045,
          -0.177 + Math.sin(t * Math.PI) * 0.11 - t * t * 0.18,
          0.058 + t * 0.42,
        );
        bread.rotation.set(t * 0.3, 0, -t * 0.25);
        bread.scale.setScalar(1 - Math.max(0, t - 0.72) * 3.4);
      }
      const h = currentOpening?.homecoming;
      holeTarget.visible =
        currentOpening?.stage === 'home' && h?.scene === 'mouth';
      const key = `${currentOpening?.stage}/${h?.scene}/${Math.floor((h?.tick || 0) / 2)}/${reduced}/${currentOpening?.lastRobotLine}/${currentOpening?.dialogueAuto}/${currentOpening?.afterlight.phase}`;
      if (key !== screenKey) {
        paintTerminal(ctx, currentOpening, reduced);
        texture.needsUpdate = true;
        screenKey = key;
      }
    },
  };
}
