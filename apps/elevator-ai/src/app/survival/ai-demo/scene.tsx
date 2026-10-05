'use client';
import { useEffect, useRef } from 'react';
import * as T from 'three';
import { Atelier } from '../../../packages/render-kit/atelier';
import { createActors } from '../creatures';
import { combatEffect } from '../effects';
import { industrialPalette } from '../art-direction';
import { ELEVATOR } from '../../../lib/survival-world';
import { battleCamera } from '../../../lib/survival-camera';
import { LIFT } from '../../../lib/survival-lift';
import { buildServiceLift } from '../elevator';
import { createSurvival } from '../../../lib/survival-room';
import { canSee, PROFILES } from '../../../lib/survival-ai/encounter';
import type { Encounter, Intent } from '../../../lib/survival-ai/encounter';

export default function EncounterScene({
  state,
  command,
}: {
  state: React.RefObject<Encounter>;
  command: (intent: Intent) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current!;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    element.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color('#0c1418');
    scene.fog = new T.FogExp2('#111c20', 0.021);
    const camera = new T.PerspectiveCamera(38, 1, 0.025, 180);
    const kit = new Atelier(true);
    scene.add(kit.root);
    const p = industrialPalette(kit),
      ground = kit.weather(kit.mat('#61706a'), 0.36, 2.1, true);
    const cabin = state.current.mail ? buildServiceLift(kit, p, true) : null;
    const cabinState = createSurvival(state.current.seed);
    cabinState.liftLightOn = true;
    if (cabin) {
      cabin.root.visible = false;
      cabin.update(cabinState, true, 0, 1 / 60, false, false, false);
    }
    kit.box(100, 0.15, 100, ground, [48, -0.1, 55], 0);
    const random = (n: number) => {
      const v = Math.sin(n * 127.1 + state.current.seed) * 43758.54;
      return v - Math.floor(v);
    };
    // Dressing is decorative, outside the gameplay recipe. It continues beyond invisible bounds.
    for (let i = 0; i < 210; i++) {
      const x = 27 + random(i * 3) * 48,
        z = 39 + random(i * 3 + 1) * 49;
      if (i % 3) {
        kit.box(
          0.5 + random(i) * 0.7,
          0.02,
          0.42 + random(i + 2) * 0.4,
          i % 2 ? p.ink : p.shadow,
          [x, 0.01, z],
          0,
        );
      } else {
        const g = kit.group([x, 0.03, z]);
        for (let j = 0; j < 3; j++) {
          const blade = kit.box(
            0.025,
            0.25 + random(i + j) * 0.3,
            0.08,
            p.teal,
            [j * 0.1, 0.1, 0],
            0,
            g,
          );
          blade.rotation.z = (j - 1) * 0.4;
        }
      }
    }
    const obstacles = state.current.world.obstacles.map((o) => {
      const g = kit.group([o.x, 0, o.z]),
        h = o.height === 'low' ? 0.65 : 2.5;
      kit.box(o.w, h, o.d, p.shadow, [0, h / 2, 0], 0.07, g);
      kit.box(o.w + 0.12, 0.12, o.d + 0.12, p.edge, [0, h + 0.04, 0], 0.03, g);
      for (let x = -0.4; x < o.w / 2; x += 0.65)
        kit.box(0.06, h, 0.07, p.ink, [x, h / 2, o.d / 2 + 0.02], 0.01, g);
      if (o.type === 'tank')
        kit.cyl(1.18, 1.3, 2.7, p.teal, [0, 1.4, 0], 12, g);
      if (o.type === 'pump') {
        kit.box(1.2, 1.5, 0.25, p.red, [0, 1.1, o.d / 2 + 0.12], 0.04, g);
      }
      return { o, g };
    });
    const portal = kit.group([ELEVATOR.x, 0, ELEVATOR.z]);
    kit.box(2.55, 3.2, 0.48, p.ink, [0, 1.6, 0], 0.03, portal);
    const dark = kit.basic('#030a0c');
    kit.box(1.8, 2.7, 0.1, dark, [0, 1.35, -0.29], 0, portal);
    for (const x of [-1.12, 1.12])
      kit.box(0.25, 3.1, 0.58, p.gold, [x, 1.55, -0.14], 0.025, portal);
    kit.box(2.5, 0.24, 0.65, p.edge, [0, 3.1, -0.14], 0.02, portal);
    kit.box(1.7, 0.12, 0.05, p.teal, [0, 2.78, -0.34], 0.01, portal);
    const hemi = new T.HemisphereLight('#d0d9bf', '#243842', 1.7);
    scene.add(hemi);
    const sun = new T.DirectionalLight('#b7c1b5', 2.1);
    sun.position.set(39, 26, 72);
    sun.target.position.set(48, 0, 62);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.001;
    scene.add(sun, sun.target);
    // Personal visibility is a fog mask, not a lamp hovering over the player.
    const fogPixels = new Uint8Array(96 * 80 * 4),
      fogTexture = new T.DataTexture(fogPixels, 96, 80);
    fogTexture.minFilter = fogTexture.magFilter = T.LinearFilter;
    fogTexture.needsUpdate = true;
    kit.textures.add(fogTexture);
    const fogMaterial = new T.ShaderMaterial({
      uniforms: { mask: { value: fogTexture } },
      transparent: true,
      depthWrite: false,
      vertexShader:
        'varying vec2 pos;void main(){vec4 p=modelMatrix*vec4(position,1.);pos=p.xz;gl_Position=projectionMatrix*viewMatrix*p;}',
      fragmentShader:
        'uniform sampler2D mask;varying vec2 pos;void main(){float v=texture2D(mask,pos/vec2(96.,80.)).r;float border=min(min(pos.x-34.,65.-pos.x),min(pos.y-46.,78.-pos.y));float edge=1.-smoothstep(-3.,1.,border);gl_FragColor=vec4(.025,.043,.052,max(v,edge)*.98);}',
    });
    kit.materials.add(fogMaterial);
    const fog = kit.mesh(
      new T.PlaneGeometry(100, 100),
      fogMaterial,
      [48, 0.055, 55],
    );
    fog.rotation.x = -Math.PI / 2;
    fog.renderOrder = 2;
    const factory = createActors(kit, 'maintenance'),
      player = factory.human(true),
      rival = factory.human(true);
    rival.group.traverse((child) => {
      if (
        child instanceof T.Mesh &&
        child.material instanceof T.MeshToonMaterial &&
        child.material.color.getHexString() === 'ad343a'
      ) {
        const m = child.material.clone();
        m.color.set(PROFILES[state.current.profile].color);
        child.material = m;
        kit.materials.add(m);
      }
    });
    const actors = [player, rival],
      enemies = new Map<string, ReturnType<typeof factory.enemy>>(),
      caches = new Map<string, T.Group>();
    function label(text: string, color: string, parent: T.Group, y = 2.35) {
      const canvas = document.createElement('canvas');
      canvas.width = text.length > 7 ? 512 : 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.font = '28px "F9 Pixel", monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#0b161b';
      ctx.lineWidth = 8;
      ctx.strokeText(text, canvas.width / 2, 43);
      ctx.fillStyle = color;
      ctx.fillText(text, canvas.width / 2, 43);
      const tex = new T.CanvasTexture(canvas);
      tex.minFilter = tex.magFilter = T.NearestFilter;
      kit.textures.add(tex);
      const mat = new T.SpriteMaterial({
        map: tex,
        depthTest: false,
        toneMapped: false,
      });
      kit.materials.add(mat);
      const sprite = new T.Sprite(mat);
      sprite.position.y = y;
      sprite.scale.set(canvas.width / 80, 0.8, 1);
      parent.add(sprite);
      return sprite;
    }
    label('你', '#f4e4b6', player.group);
    label(
      PROFILES[state.current.profile].name,
      PROFILES[state.current.profile].color,
      rival.group,
    );
    label('⇧ 电梯 · E', '#d9c48a', portal, 3.8);
    const cursor = kit.mesh(
      new T.RingGeometry(0.4, 0.48, 24),
      kit.basic('#d7bc7c', 0.55),
    );
    cursor.rotation.x = -Math.PI / 2;
    cursor.visible = false;
    const effects = new Map<number, ReturnType<typeof combatEffect>>();
    const raycaster = new T.Raycaster(),
      mouse = new T.Vector2(),
      plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    function click(event: PointerEvent) {
      if (event.button !== 0 || state.current.mail?.stage === 'home') return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      const hit = new T.Vector3();
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const s = state.current,
        a = s.actors[0];
      const cache = s.caches.find(
        (c) =>
          c.contents.length &&
          canSee(s, a, c) &&
          Math.hypot(hit.x - c.x, hit.z - c.z) < 1.35,
      );
      if (cache) command({ type: 'search', cacheId: cache.id });
      else command({ type: 'move', to: { x: hit.x, z: hit.z } });
      cursor.position.set(hit.x, 0.09, hit.z);
      cursor.visible = true;
    }
    renderer.domElement.addEventListener('pointerdown', click);
    const resize = () => {
      const w = element.clientWidth,
        h = element.clientHeight,
        aspect = w / Math.max(h, 1);
      renderer.setSize(w, h);
      camera.aspect = aspect;
      camera.fov = aspect < 1.3 ? 46 : 38;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let frame = 0,
      lastTick = -1,
      focusX = 48.5,
      focusZ = 67,
      lastSession = state.current.sessionId;
    function draw() {
      const s = state.current,
        a = s.actors[0];
      if (s.sessionId !== lastSession) {
        lastSession = s.sessionId;
        lastTick = -1;
      }
      const home = s.mail?.stage === 'home';
      focusX += (a.x - focusX) * 0.4;
      focusZ += (a.z - focusZ) * 0.4;
      if (cabin) cabin.root.visible = home;
      portal.visible = !home;
      if (home) {
        camera.position.set(
          ELEVATOR.x + 0.06,
          LIFT.eyeHeight,
          ELEVATOR.z + 0.35,
        );
        camera.lookAt(ELEVATOR.x - 0.4, 1.43, ELEVATOR.z - 0.28);
        camera.fov = 65;
      } else {
        const pose = battleCamera({ x: focusX, z: focusZ }, camera.aspect);
        camera.position.set(pose.position.x, pose.position.y, pose.position.z);
        camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
        camera.fov = pose.fov;
      }
      camera.updateProjectionMatrix();
      actors.forEach((visual, i) => {
        const body = s.actors[i];
        visual.group.position.lerp(
          new T.Vector3(body.x, body.status === 'dead' ? 0.2 : 0, body.z),
          0.4,
        );
        visual.group.rotation.y = body.facing;
        visual.group.rotation.z = body.status === 'dead' ? 1.35 : 0;
        visual.group.visible =
          !home &&
          body.status !== 'extracted' &&
          (i === 0 || canSee(s, a, body));
        visual.limbs.forEach((limb, j) => {
          limb.rotation.x = body.path.length
            ? Math.sin(s.tick * 0.32 + j * Math.PI) * 0.55
            : 0;
        });
      });
      if (s.tick !== lastTick) {
        lastTick = s.tick;
        for (let i = 0; i < 96 * 80; i++) {
          const v = a.fog.visible[i] ? 0 : a.fog.explored[i] ? 150 : 255;
          fogPixels.set([v, v, v, 255], i * 4);
        }
        fogTexture.needsUpdate = true;
        obstacles.forEach(({ o, g }) => {
          g.visible = !!a.fog.explored[Math.floor(o.z) * 96 + Math.floor(o.x)];
        });
        for (const c of s.caches) {
          if (!caches.has(c.id)) {
            const g = factory.cache(c);
            g.position.set(c.x, 0, c.z);
            caches.set(c.id, g);
          }
          caches.get(c.id)!.visible = !c.opened && canSee(s, a, c);
        }
        for (const [id, g] of caches)
          if (!s.caches.some((c) => c.id === id)) {
            (g.userData.dispose as (() => void) | undefined)?.();
            caches.delete(id);
          }
        for (const e of s.enemies) {
          if (!enemies.has(e.id)) {
            const g = factory.enemy(e.kind);
            enemies.set(e.id, g);
          }
          const visual = enemies.get(e.id)!,
            g = visual.group;
          g.position.set(e.x, 0, e.z);
          g.visible = canSee(s, a, e);
          g.rotation.y = e.lastSeen
            ? Math.atan2(e.lastSeen.x - e.x, e.lastSeen.z - e.z)
            : 0;
          visual.flash(s.tick - e.hitAt < 4);
        }
        for (const [id, visual] of enemies)
          if (!s.enemies.some((e) => e.id === id)) {
            visual.group.removeFromParent();
            visual.dispose();
            enemies.delete(id);
          }
        for (const e of s.effects)
          if (
            !effects.has(e.id) &&
            (canSee(s, a, e.to) || canSee(s, a, e.from))
          ) {
            const fx = combatEffect(
              {
                ...e,
                kind:
                  e.kind === 'beam'
                    ? 'phone-beam'
                    : e.kind === 'pickup'
                      ? 'pickup'
                      : 'hit',
                amount: e.color === '#ff5c58' ? -e.amount : e.amount,
              },
              false,
            );
            if (e.kind === 'pickup' && e.label) {
              const sprite = label(e.label, e.color, fx.group, 2);
              sprite.position.set(e.to.x, 2, e.to.z);
              sprite.userData.pickup = true;
            }
            scene.add(fx.group);
            effects.set(e.id, fx);
          }
        for (const [id, fx] of effects) {
          const e = s.effects.find((row) => row.id === id);
          if (!e) {
            fx.dispose();
            effects.delete(id);
          } else {
            fx.update(s.tick - e.tick);
            for (const child of fx.group.children)
              if (child instanceof T.Sprite && child.userData.pickup) {
                child.position.y = 2 + (s.tick - e.tick) * 0.025;
                child.material.opacity = Math.max(
                  0,
                  1 - (s.tick - e.tick) / 42,
                );
              }
          }
        }
      }
      const breathing = 0.8 + Math.sin(s.tick / 36) * 0.12;
      fog.visible = !home;
      hemi.intensity = home ? 0.16 : 1.7;
      sun.intensity = home ? 0 : 2.1;
      portal.scale.setScalar(1);
      cursor.material.opacity = breathing * 0.55;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', click);
      effects.forEach((fx) => fx.dispose());
      caches.forEach((g) =>
        (g.userData.dispose as (() => void) | undefined)?.(),
      );
      kit.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [state, command]);
  return (
    <div
      className="enc-scene"
      ref={host}
      aria-label="共享房间，点击地面移动，点击容器翻找"
    />
  );
}
