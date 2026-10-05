'use client';
import { homecomingCamera } from '@/lib/survival-homecoming-camera';
import {
  DEPARTURE,
  departureRise,
  insideLift,
  LIFT,
} from '@/lib/survival-lift';
import type { OpeningState } from '@/lib/survival-opening';
import { dialogueCue } from '@/lib/survival-opening';
import { GARDEN_MOODS } from '@/lib/survival-pavilion';
import {
  presentationFrame,
  presentationPose,
  type PresentationFrame,
} from '@/lib/survival-presentation';
import {
  ELEVATOR,
  isVisible,
  ROOM,
  type Point,
  type SurvivalState,
} from '@/lib/survival-room';
import { walkable } from '@/lib/survival-world';
import { useEffect, useRef, useState, type RefObject } from 'react';
import * as T from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Atelier } from '../../packages/render-kit/atelier';
import { createCacheLayer } from './cache-layer';
import { createRaceStations } from './race-stations';
import { createSeasonActors } from './season-actors';
import { createActors } from './creatures';
import { buildDunes } from './dunes';
import { combatEffect } from './effects';
import { buildWaterworks } from './environment';
import { openingPhone } from './opening-phone';
import { buildPavilion } from './pavilion';
import { pickupIcon } from './pickup-icon';
import { pickupText } from './pickup-text';
import { returnGuide } from './return-guide';
import { projectMarkers, type Marker } from './scene-markers';
import { loadTerminalAssets } from './terminal-assets';
import { buildWasteland } from './wasteland';
export type { Marker } from './scene-markers';

type Props = {
  state: RefObject<SurvivalState>;
  presentation?: RefObject<PresentationFrame>;
  reduced: boolean;
  onMove: (point: Point) => void;
  onMarkers?: (markers: Marker[]) => void;
  onReady: () => void;
  onDoor: () => void;
  onTerminal?: (toggleAuto?: boolean) => void;
  paused: boolean;
  opening?: RefObject<OpeningState>;
  onEdgeSpawns?: (points: Point[]) => void;
};
export default function SurvivalScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  const [error, setError] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    const host = mount.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true });
    } catch {
      queueMicrotask(() => setError(true));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    renderer.domElement.setAttribute(
      'aria-label',
      latest.current.opening
        ? '电梯内拖动或用方向键环顾；右侧按钮出现提示后按 E 开门。左墙为电子屏。出门后用 WASD 或点击地面移动。'
        : '电梯内拖动或用方向键环顾；点击门前图标或按 E 开门。左墙为电子屏。出门后用 WASD 移动。',
    );
    renderer.domElement.setAttribute('role', 'img');
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color('#0c191d');
    const camera = new T.PerspectiveCamera(65, 1, 0.025, 180);
    scene.add(camera);
    const isOpening = !!latest.current.opening;
    const clearing = isOpening && latest.current.state.current.seed === 92620;
    const kit = new Atelier(true),
      actorsKit = new Atelier(true);
    scene.add(kit.root, actorsKit.root);
    let phone: ReturnType<typeof openingPhone> | null = null;
    if (isOpening) {
      scene.fog = new T.FogExp2('#030807', 0.012);
      scene.background = new T.Color('#030807');
    }
    const hemi = new T.HemisphereLight('#d3e9d8', '#263e4b', 1.3);
    scene.add(hemi);
    const sun = new T.DirectionalLight('#ffe0a6', 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, {
      left: -23,
      right: 23,
      top: 23,
      bottom: -23,
      near: 0.5,
      far: 90,
    });
    scene.add(sun, sun.target);
    const fill = new T.DirectionalLight('#739dca', 0.55);
    fill.position.set(10, 8, -10);
    scene.add(fill);

    const portalClickBounds = new T.Box3(
      new T.Vector3(ELEVATOR.x - 0.85, 0, ELEVATOR.z - 1.15),
      new T.Vector3(ELEVATOR.x + 0.85, 2.65, ELEVATOR.z + 0.2),
    );
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.3, 0.5, 1.7);
    composer.addPass(bloom);
    const distortion = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        amount: { value: 0 },
        time: { value: 0 },
      },
      vertexShader:
        'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float amount,time; varying vec2 vUv;
        void main(){vec2 p=vUv; float edge=smoothstep(.15,.68,distance(p,vec2(.5)));
        vec2 wave=vec2(sin(p.y*25.+time*1.4),cos(p.x*21.+time*.9));
        p=clamp(p+wave*amount*.016*(.3+edge),.002,.998);
        vec4 c=texture2D(tDiffuse,p); c.r=texture2D(tDiffuse,clamp(p+vec2(amount*.0025,0.),.002,.998)).r;
        c.b=texture2D(tDiffuse,clamp(p-vec2(amount*.0025,0.),.002,.998)).b;
        gl_FragColor=vec4(c.rgb*(1.-edge*amount*.16),c.a);}`,
    });
    composer.addPass(distortion);
    composer.addPass(new OutputPass());
    const bytes = new Uint8Array(ROOM.width * ROOM.depth * 4);
    const fogTexture = new T.DataTexture(
      bytes,
      ROOM.width,
      ROOM.depth,
      T.RGBAFormat,
    );
    fogTexture.minFilter = fogTexture.magFilter = T.LinearFilter;
    fogTexture.needsUpdate = true;
    const fogUniforms = {
      roomFog: { value: fogTexture },
      fogBounds: { value: new T.Vector4(0, ROOM.width, 0, ROOM.depth) },
      visionReveal: { value: 0 },
    };
    const fogged = new WeakSet<T.Material>();
    function fogMaterial(mat: T.Material) {
      if (
        fogged.has(mat) ||
        mat.userData.liftInterior ||
        mat.userData.screenMarker
      )
        return;
      fogged.add(mat);
      const prior = mat.onBeforeCompile.bind(mat),
        priorKey = mat.customProgramCacheKey();
      mat.onBeforeCompile = (shader, r) => {
        prior.call(mat, shader, r);
        Object.assign(shader.uniforms, fogUniforms);
        shader.vertexShader = 'varying vec2 vFogWorld;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          'vFogWorld = (modelMatrix * vec4(transformed, 1.0)).xz;\n#include <project_vertex>',
        );
        shader.fragmentShader =
          'uniform sampler2D roomFog; uniform vec4 fogBounds; uniform float visionReveal; varying vec2 vFogWorld;\n' +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          `vec2 vision = texture2D(roomFog, vFogWorld / vec2(96.,80.)).rg;
float memory = vision.r * .14;
float currentSight = smoothstep(.1,.9,vision.g);
float visibility = max(memory, currentSight);
vec2 edge = min(vFogWorld - fogBounds.xz, fogBounds.yw - vFogWorld);
float fringe = min(edge.x, edge.y);
float wisps = sin(vFogWorld.x * 1.9 + sin(vFogWorld.y * .8)) * .22 + sin(vFogWorld.y * 2.3) * .13;
float boundary = smoothstep(.55, 3.5, fringe + wisps);
visibility *= boundary;
// A visibility treatment, not a physical light: reveal surface colour only in
// current line of sight, retaining occlusion, remembered darkness and black edges.
${mat.side === T.BackSide ? '' : 'outgoingLight += (diffuseColor.rgb * .45 + vec3(.014,.018,.02)) * currentSight * visionReveal;'}
outgoingLight = mix(vec3(.0035,.009,.012), outgoingLight, visibility);
#include <opaque_fragment>`,
        );
      };
      mat.customProgramCacheKey = () => priorKey + '-room-fog-v3-' + mat.side;
      mat.needsUpdate = true;
    }
    const actors = createActors(
        actorsKit,
        latest.current.state.current.world.theme,
      ),
      player = actors.human(isOpening);
    const enemies = new Map<string, ReturnType<typeof actors.enemy>>();
    const cacheLayer = createCacheLayer(actors.cache);
    const raceStations = createRaceStations(scene);
    const seasonActors = createSeasonActors(scene, actorsKit);
    const fx = new Map<number, ReturnType<typeof combatEffect>>();
    const warnings = new Map<string, T.Mesh>();
    const warningGeo = new T.RingGeometry(0.87, 1, 64);
    const warningMat = new T.MeshBasicMaterial({
      color: '#f69261',
      transparent: true,
      opacity: 0.6,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const haloMat = new T.MeshBasicMaterial({
      color: '#91e8cb',
      transparent: true,
      opacity: 0.8,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const halo = new T.Mesh(warningGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    scene.add(halo);
    const ray = new T.Raycaster(),
      plane = new T.Plane(new T.Vector3(0, 1, 0), 0),
      intersection = new T.Vector3();
    let width = 1,
      height = 1,
      raf = 0,
      disposed = false,
      built = false,
      lift: Awaited<ReturnType<typeof buildWaterworks>> | undefined,
      lastTick = -1,
      lastFog: SurvivalState['fog'] | null = null;
    let previousPlayer = { ...latest.current.state.current.player },
      previousSeed = latest.current.state.current.seed;
    const follow = new T.Vector3(ELEVATOR.x, 0, ELEVATOR.z - 2);
    let lookYaw = isOpening ? -0.3 : 0.16,
      lookPitch = isOpening ? -0.18 : -0.02,
      drag: {
        x: number;
        y: number;
        startX: number;
        startY: number;
        distance: number;
        pointer: number;
        door: boolean;
        terminal: boolean;
      } | null = null;
    let doorHovered = false;
    let lastFrameTime = 0;
    const eyeRotation = new T.Quaternion(),
      overheadRotation = new T.Quaternion();
    const lookMatrix = new T.Matrix4();
    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      const aspect = width / Math.max(1, height);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const cabin = () =>
      ['ready', 'extracted'].includes(latest.current.state.current.status);
    const pointRay = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new T.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((event.clientY - rect.top) / rect.height) * 2,
        ),
        camera,
      );
    };
    const hitsDoor = (event: PointerEvent) => {
      if (!lift?.doorTarget.visible || !cabin() || latest.current.paused)
        return false;
      pointRay(event);
      return ray.intersectObject(lift.doorTarget).length > 0;
    };
    const scripted = () => {
      const s = latest.current.opening?.current;
      return (
        s?.stage === 'home' &&
        (s.homecoming.scene !== 'complete' ||
          ['offer-food', 'serve-food'].includes(s.afterlight.phase))
      );
    };
    let mealCameraFrom: number | null = null;

    const guide = returnGuide(scene);
    const portalIcon = pickupIcon(actorsKit, true)();
    portalIcon.position.set(ELEVATOR.x, 3.1, ELEVATOR.z - 0.85);
    scene.add(portalIcon);
    const hitsTerminal = (event: PointerEvent) => {
      if (
        !lift ||
        latest.current.opening?.current.stage !== 'home' ||
        latest.current.paused
      )
        return false;
      pointRay(event);
      const stage = latest.current.opening?.current.homecoming.scene;
      if (
        stage !== 'mouth' &&
        stage !== 'complete' &&
        dialogueCue(latest.current.opening!.current)?.speaker !== 'robot'
      )
        return false;
      return (
        ray.intersectObject(
          stage === 'mouth' ? lift.holeTarget : lift.terminalTarget,
        ).length > 0
      );
    };
    const move = (event: PointerEvent) => {
      if (event.button !== 0 || !built || latest.current.paused) return;
      event.preventDefault();
      if (cabin()) {
        drag = {
          x: event.clientX,
          y: event.clientY,
          startX: event.clientX,
          startY: event.clientY,
          distance: 0,
          pointer: event.pointerId,
          door: hitsDoor(event),
          terminal: hitsTerminal(event),
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      if (latest.current.state.current.status !== 'running') return;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new T.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((event.clientY - rect.top) / rect.height) * 2,
        ),
        camera,
      );
      if (ray.ray.intersectsBox(portalClickBounds)) return;
      if (
        ray.ray.intersectPlane(plane, intersection) &&
        !insideLift({ x: intersection.x, z: intersection.z }, ELEVATOR)
      )
        latest.current.onMove({ x: intersection.x, z: intersection.z });
    };
    const look = (event: PointerEvent) => {
      if (!cabin() || latest.current.paused) return;
      doorHovered = !drag && (hitsDoor(event) || hitsTerminal(event));
      renderer.domElement.style.cursor = drag
        ? 'grabbing'
        : doorHovered
          ? 'pointer'
          : 'grab';
      if (!drag || scripted()) return;
      lookYaw -= (event.clientX - drag.x) * 0.004;
      lookPitch = T.MathUtils.clamp(
        lookPitch - (event.clientY - drag.y) * 0.003,
        -1.05,
        0.85,
      );
      drag.distance = Math.max(
        drag.distance,
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY),
      );
      drag.x = event.clientX;
      drag.y = event.clientY;
    };
    const release = (event: PointerEvent) => {
      const terminal =
        event.type === 'pointerup' &&
        drag?.terminal &&
        drag.distance < 6 &&
        hitsTerminal(event);
      const activate =
        event.type === 'pointerup' &&
        drag &&
        drag.door &&
        drag.distance < 6 &&
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <
          6 &&
        hitsDoor(event);
      drag = null;
      renderer.domElement.style.cursor = '';
      if (activate) latest.current.onDoor();
      if (renderer.domElement.hasPointerCapture(event.pointerId))
        renderer.domElement.releasePointerCapture(event.pointerId);
      if (terminal) {
        pointRay(event);
        const uv = lift && ray.intersectObject(lift.terminalTarget)[0]?.uv;
        latest.current.onTerminal?.(
          !!uv && uv.x > 0.6 && uv.y > 0.27 && uv.y < 0.34,
        );
      }
    };
    const lookKey = (event: KeyboardEvent) => {
      if (
        built &&
        cabin() &&
        !latest.current.paused &&
        event.code === 'KeyE' &&
        !event.repeat
      ) {
        event.preventDefault();
        latest.current.onDoor();
        return;
      }
      if (
        !cabin() ||
        scripted() ||
        latest.current.paused ||
        (event.target as HTMLElement).closest('button, input, a, dialog')
      )
        return;
      if (event.code === 'ArrowLeft') lookYaw += 0.13;
      if (event.code === 'ArrowRight') lookYaw -= 0.13;
      if (event.code === 'ArrowUp') lookPitch = Math.min(0.85, lookPitch + 0.1);
      if (event.code === 'ArrowDown')
        lookPitch = Math.max(-1.05, lookPitch - 0.1);
    };
    const cancelDrag = () => {
      const id = drag?.pointer;
      drag = null;
      renderer.domElement.style.cursor = '';
      if (id !== undefined && renderer.domElement.hasPointerCapture(id))
        renderer.domElement.releasePointerCapture(id);
    };
    window.addEventListener('blur', cancelDrag);
    renderer.domElement.addEventListener('lostpointercapture', cancelDrag);
    renderer.domElement.addEventListener('pointerdown', move);
    renderer.domElement.addEventListener('pointermove', look);
    renderer.domElement.addEventListener('pointerup', release);
    renderer.domElement.addEventListener('pointercancel', release);
    window.addEventListener('keydown', lookKey);
    const render = (time: number) => {
      if (disposed) return;
      const dt = Math.min(
        0.05,
        lastFrameTime ? (time - lastFrameTime) / 1000 : 1 / 60,
      );
      lastFrameTime = time;
      const { state, reduced } = latest.current,
        s = state.current;
      const pose = presentationPose(
        latest.current.presentation?.current ?? presentationFrame(s),
      );
      const fresh = lastTick !== s.tick || previousSeed !== s.seed;
      kit.animations.forEach((animate) =>
        animate(reduced ? 0 : pose.tick / 30),
      );
      if (s.tick < lastTick || previousSeed !== s.seed) {
        enemies.forEach((e) => {
          e.dispose();
          e.group.removeFromParent();
        });
        enemies.clear();
        cacheLayer.clear();
        fx.forEach((f) => f.dispose());
        fx.clear();
        lookYaw = isOpening ? -0.3 : 0.16;
        lookPitch = isOpening ? -0.18 : -0.02;
      }
      let overhead =
        s.status === 'ready' || s.status === 'extracted'
          ? 0
          : s.status === 'departing'
            ? reduced
              ? 0
              : departureRise(pose.departureTick)
            : 1;
      const opening = latest.current.opening?.current;
      const weather = kit.root.getObjectByName('garden-weather');
      if (weather) weather.visible = overhead > 0.2;
      if (opening?.stage === 'returning')
        overhead = 1 - T.MathUtils.smoothstep(pose.extraction, 1, 64);
      phone?.update(opening!, reduced);
      // Turn with simulation time too, so pausing also freezes camera orientation.
      const turn =
        s.status === 'departing'
          ? T.MathUtils.smoothstep(pose.departureTick, 0, DEPARTURE.openTicks)
          : 0;
      const backInCabin =
        opening && ['returning', 'home'].includes(opening.stage);
      const eye = new T.Vector3(
        backInCabin ? ELEVATOR.x : pose.player.x,
        LIFT.eyeHeight,
        (backInCabin ? ELEVATOR.z : pose.player.z) + 0.22,
      );
      let cinema =
        opening?.stage === 'home' && opening.homecoming.scene !== 'complete'
          ? homecomingCamera(
              opening.homecoming.scene,
              opening.homecoming.tick +
                (latest.current.paused
                  ? 0
                  : latest.current.presentation?.current.alpha || 0),
              reduced,
            )
          : null;
      if (
        opening?.stage === 'home' &&
        opening.homecoming.scene === 'complete' &&
        ['offer-food', 'serve-food'].includes(opening.afterlight.phase)
      ) {
        mealCameraFrom ??= lookYaw;
        const turn =
          opening.afterlight.phase === 'serve-food' || reduced
            ? 1
            : T.MathUtils.smoothstep(opening.afterlight.tick, 0, 45);
        cinema = {
          x: 0,
          y: LIFT.eyeHeight,
          z: 0.22,
          yaw: T.MathUtils.lerp(mealCameraFrom, 0.86, turn),
          pitch: -0.16,
          roll: 0,
        };
      } else mealCameraFrom = null;
      if (cinema) {
        eye.set(ELEVATOR.x + cinema.x, cinema.y, ELEVATOR.z + cinema.z);
        lookYaw = cinema.yaw;
        lookPitch = cinema.pitch;
      }
      const target = new T.Vector3(pose.player.x, 0, pose.player.z - 2.2);
      follow.copy(target);
      const battlePosition = new T.Vector3(
        follow.x,
        clearing ? 14 : 32,
        follow.z + (clearing ? 12 : 26),
      );
      camera.position.copy(eye).lerp(battlePosition, overhead);
      eyeRotation.setFromEuler(
        new T.Euler(
          T.MathUtils.lerp(lookPitch, -0.08, turn),
          T.MathUtils.lerp(
            Math.atan2(Math.sin(lookYaw), Math.cos(lookYaw)),
            0,
            turn,
          ),
          cinema?.roll || 0,
          'YXZ',
        ),
      );
      lookMatrix.lookAt(battlePosition, follow, new T.Vector3(0, 1, 0));
      overheadRotation.setFromRotationMatrix(lookMatrix);
      camera.quaternion.copy(eyeRotation).slerp(overheadRotation, overhead);
      camera.fov = T.MathUtils.lerp(
        width < 600 ? (cinema ? 100 : 78) : 65,
        width / height < 1.3 ? 46 : 38,
        overhead,
      );
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      if (opening?.stage === 'edge') {
        const points = [
          [-1.08, 0.05],
          [1.08, 0.15],
          [0.15, 1.08],
          [-0.12, 1.08],
          [0, 1.08],
        ]
          .map(([x, y]) => {
            ray.setFromCamera(new T.Vector2(x, y), camera);
            const p = new T.Vector3();
            ray.ray.intersectPlane(plane, p);
            // Narrow windows can put the side edges very close to the player.
            // Extend along the same ray on the ground, still outside the frame.
            const dx = p.x - s.player.x,
              dz = p.z - s.player.z;
            const length = Math.hypot(dx, dz);
            if (length < 6.5 && length > 0) {
              p.x = s.player.x + (dx * 6.5) / length;
              p.z = s.player.z + (dz * 6.5) / length;
            }
            return { x: p.x, z: p.z };
          })
          .filter((p) => walkable(p, 0.4, s.world))
          .slice(0, 3);
        latest.current.onEdgeSpawns?.(points);
      }
      lift?.present(opening);
      guide.update(
        s,
        pose.player,
        !!opening &&
          ['aftermath', 'return', 'returning'].includes(opening.stage) &&
          overhead > 0.8,
        reduced,
      );
      lift?.update(
        s,
        reduced,
        overhead,
        dt,
        doorHovered,
        latest.current.paused,
        !opening ||
          opening.stage === 'door' ||
          opening.afterlight.phase === 'recover-opening' ||
          (opening.stage === 'home' &&
            opening.homecoming.scene === 'complete' &&
            [
              'depart',
              'upgrade-goal',
              'ascend',
              'branches',
              'complete',
            ].includes(opening.afterlight.phase)),
      );
      const gardenLight =
        s.world.theme === 'pavilion'
          ? GARDEN_MOODS[s.world.garden?.mood ?? 'rain']
          : null;
      // Cabin light comes from its fixtures; room values rise smoothly with the camera.
      hemi.intensity = T.MathUtils.lerp(
        s.liftLightOn ? 0.12 : 0,
        s.floor === 4 && s.seasonRules
          ? 0.85
          : gardenLight
            ? 0.65
            : s.world.theme === 'maintenance'
              ? 0.38
              : 0.66,
        overhead,
      );
      sun.intensity = T.MathUtils.lerp(
        0,
        s.floor === 4 && s.seasonRules
          ? 1.55
          : gardenLight
            ? 1.3
            : s.world.theme === 'maintenance'
              ? 0.85
              : 1.35,
        overhead,
      );
      sun.color.set(
        gardenLight?.moon ??
          (s.world.theme === 'maintenance' ? '#bdc8bd' : '#ffe0a6'),
      );
      hemi.color.set(gardenLight?.moon ?? '#d3e9d8');
      fogUniforms.visionReveal.value = T.MathUtils.smoothstep(
        overhead,
        0.65,
        1,
      );
      const bounds = s.world.bounds;
      fogUniforms.fogBounds.value.set(
        bounds?.minX ?? 0,
        bounds?.maxX ?? ROOM.width,
        bounds?.minZ ?? 0,
        bounds?.maxZ ?? ROOM.depth,
      );
      distortion.uniforms.amount.value =
        isOpening && s.status === 'running'
          ? Math.max(0, (50 - s.player.water) / 50) * overhead
          : 0;
      distortion.uniforms.time.value = reduced ? 0 : s.tick / 30;
      fill.intensity = T.MathUtils.lerp(0, 0.22, overhead);
      renderer.toneMappingExposure = T.MathUtils.lerp(
        0.88,
        gardenLight ? 0.98 : s.world.theme === 'maintenance' ? 0.86 : 1.0,
        overhead,
      );
      sun.position.set(follow.x - 12, 26, follow.z - 10);
      sun.target.position.copy(follow);
      const shadowExtent = T.MathUtils.lerp(4, 23, overhead);
      Object.assign(sun.shadow.camera, {
        left: -shadowExtent,
        right: shadowExtent,
        top: shadowExtent,
        bottom: -shadowExtent,
      });
      sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.bias = T.MathUtils.lerp(-0.00003, -0.0005, overhead);
      sun.shadow.normalBias = T.MathUtils.lerp(0.0015, 0.03, overhead);
      player.group.position.set(pose.player.x, 0, pose.player.z);
      if (opening?.stage === 'collapse')
        player.group.position.y = Math.min(1, opening.beat / 24) * 0.2;
      player.group.visible = overhead > 0.07;
      halo.visible = !isOpening && overhead > 0.9;
      portalIcon.visible = overhead > 0.99 && s.status === 'running';
      portalIcon.material.opacity = reduced
        ? 0.82
        : 0.72 + Math.sin((pose.tick / 30) * 1.25) * 0.18;
      if (latest.current.paused && drag) cancelDrag();
      const carriedLight = player.group.getObjectByName('carried-flashlight');
      if (carriedLight)
        carriedLight.visible = s.equipment.some(
          (e) => e.item.kind === 'flashlight',
        );
      player.group.rotation.y = pose.player.facing;
      player.group.rotation.x =
        opening?.stage === 'collapse'
          ? (Math.min(1, opening.beat / 24) * -Math.PI) / 2
          : 0;
      halo.position.set(pose.player.x, 0.055, pose.player.z);
      const moving =
        fresh &&
        Math.hypot(
          s.player.x - previousPlayer.x,
          s.player.z - previousPlayer.z,
        ) > 0.001;
      if (fresh)
        player.limbs.forEach((l, i) => {
          l.rotation.x =
            moving && !reduced
              ? Math.sin(s.tick * 0.45 + i * Math.PI) * 0.55
              : 0;
        });
      if (lastFog !== s.fog) {
        for (let i = 0; i < s.fog.explored.length; i++) {
          bytes[i * 4] = s.fog.explored[i] * 255;
          bytes[i * 4 + 1] = s.fog.visible[i] * 255;
          bytes[i * 4 + 3] = 255;
        }
        fogTexture.needsUpdate = true;
        lastFog = s.fog;
      }
      if (fresh || !built) {
        const live = new Set(s.enemies.map((e) => e.id));
        for (const [id, actor] of enemies)
          if (!live.has(id)) {
            actor.dispose();
            actor.group.removeFromParent();
            enemies.delete(id);
          }
        for (const e of s.enemies) {
          if (!isVisible(s, e)) {
            const actor = enemies.get(e.id);
            if (actor) actor.group.visible = false;
            continue;
          }
          let actor = enemies.get(e.id);
          if (!actor) {
            actor = actors.enemy(e.kind);
            enemies.set(e.id, actor);
          }
          actor.flash(s.tick - e.hitAt < 5);
          actor.group.visible = true;
          actor.group.position.set(
            e.x,
            e.kind === 'runner' && !reduced ? Math.sin(s.tick * 0.1) * 0.12 : 0,
            e.z,
          );
          actor.group.rotation.y = Math.atan2(
            s.player.x - e.x,
            s.player.z - e.z,
          );
          actor.limbs.forEach((l, i) => {
            l.rotation.z =
              reduced || !e.awake
                ? 0
                : Math.sin(
                    s.tick * (e.kind === 'runner' ? 0.17 : 0.3) + i * 2,
                  ) * 0.22;
          });
        }
        cacheLayer.update(s, opening?.stage || '', overhead);
        raceStations.update(s, opening?.race, overhead, opening?.season);
        seasonActors.update(s, opening?.season, opening?.hostileTarget);
        const activeWarnings = new Set<string>();
        const warn = (id: string, p: Point, radius: number) => {
          if (!isVisible(s, p)) return;
          activeWarnings.add(id);
          let obj = warnings.get(id);
          if (!obj) {
            obj = new T.Mesh(warningGeo, warningMat);
            obj.rotation.x = -Math.PI / 2;
            warnings.set(id, obj);
            scene.add(obj);
          }
          obj.position.set(p.x, 0.08, p.z);
          obj.scale.setScalar(radius);
        };
        s.spawns.forEach((e) =>
          warn('spawn-' + e.id, e, 0.4 + (1 - (e.at - s.tick) / 60) * 0.6),
        );
        s.enemies.forEach((e) => {
          if (e.windup && e.aim) warn('slam-' + e.id, e.aim, 2.5);
        });
        for (const [id, obj] of warnings)
          if (!activeWarnings.has(id)) {
            obj.removeFromParent();
            warnings.delete(id);
          }
        for (const mat of actorsKit.materials) fogMaterial(mat);
      }
      // All moving mesh anchors use the same interpolated pose as the camera.
      for (const e of pose.enemies) {
        const actor = enemies.get(e.id);
        if (actor)
          actor.group.position.set(
            e.x,
            e.kind === 'runner' && !reduced
              ? Math.sin(pose.tick * 0.1) * 0.12
              : 0,
            e.z,
          );
      }
      const ids = new Set(s.effects.map((e) => e.id));
      for (const [id, effect] of fx)
        if (!ids.has(id)) {
          effect.dispose();
          fx.delete(id);
        }
      for (const e of s.effects) {
        if (!isVisible(s, e.to) && !isVisible(s, e.from)) {
          const old = fx.get(e.id);
          if (old) old.group.visible = false;
          continue;
        }
        let effect = fx.get(e.id);
        if (!effect) {
          effect =
            e.kind === 'pickup'
              ? pickupText(e, reduced)
              : combatEffect(e, reduced);
          fx.set(e.id, effect);
          scene.add(effect.group);
        }
        effect.update(Math.max(0, pose.tick - e.tick));
        // A previously created effect must disappear as soon as its source AND
        // destination leave vision, including depth-test-free damage labels.
        if (
          s.status !== 'running' ||
          (!isVisible(s, e.to) && !isVisible(s, e.from))
        )
          effect.group.visible = false;
      }
      if (latest.current.onMarkers)
        latest.current.onMarkers(
          projectMarkers(
            s,
            pose,
            camera,
            width,
            height,
            overhead,
            cacheLayer.visible,
          ),
        );
      previousPlayer = { ...s.player };
      previousSeed = s.seed;
      lastTick = s.tick;
      composer.render();
      raf = requestAnimationFrame(render);
    };
    loadTerminalAssets()
      .then(() => {
        phone = isOpening ? openingPhone(actorsKit, camera) : null;
        return latest.current.state.current.world.theme === 'pavilion'
          ? buildPavilion(kit, latest.current.state.current.world)
          : latest.current.state.current.world.theme === 'dunes'
            ? buildDunes(kit, latest.current.state.current.world)
            : clearing
              ? buildWasteland(kit)
              : buildWaterworks(
                  kit,
                  latest.current.state.current.world,
                  isOpening,
                );
      })
      .then((builtLift) => {
        if (disposed) {
          kit.dispose();
          return;
        }
        kit.materials.forEach(fogMaterial);
        actorsKit.materials.forEach(fogMaterial);
        lift = builtLift;
        built = true;
        setLoading(false);
        latest.current.onReady();
        raf = requestAnimationFrame(render);
      })
      .catch((error: unknown) => {
        console.error('Elevator scene assets failed to load', error);
        if (!disposed) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('blur', cancelDrag);
      renderer.domElement.removeEventListener('lostpointercapture', cancelDrag);
      renderer.domElement.removeEventListener('pointerdown', move);
      renderer.domElement.removeEventListener('pointermove', look);
      renderer.domElement.removeEventListener('pointerup', release);
      renderer.domElement.removeEventListener('pointercancel', release);
      window.removeEventListener('keydown', lookKey);
      fx.forEach((e) => e.dispose());
      portalIcon.removeFromParent();
      guide.dispose();
      warningGeo.dispose();
      warningMat.dispose();
      haloMat.dispose();
      fogTexture.dispose();
      cacheLayer.clear();
      raceStations.dispose();
      seasonActors.dispose();
      kit.dispose();
      actorsKit.dispose();
      distortion.dispose();
      composer.dispose();
      bloom.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div ref={mount} className="survival-canvas">
      {loading && !error && (
        <span className="survival-screen-reader">正在加载场景…</span>
      )}
      {error && (
        <div className="survival-render-error">
          画面加载失败，请确认浏览器硬件加速已开启后刷新。
        </div>
      )}
    </div>
  );
}
