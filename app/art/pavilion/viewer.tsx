'use client';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Atelier } from '../../../packages/render-kit/atelier';
import { pavilionCreature } from '../../survival/pavilion-creatures';
import { buildGarden } from '../../survival/pavilion-assets';
import { gardenWeather } from '../../survival/pavilion';
import {
  GARDEN_MOODS,
  gardenManifest,
  type PavilionMood,
} from '@/lib/survival-pavilion';

export type GardenView = 'court' | 'gate' | 'roof' | 'spirits';
export default function GardenViewer({
  mood,
  view,
  motion,
}: {
  mood: PavilionMood;
  view: GardenView;
  motion: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef({ view, motion });
  const [error, setError] = useState('');
  useEffect(() => {
    latest.current = { view, motion };
  }, [view, motion]);
  useEffect(() => {
    if (!host.current) return;
    const mount = host.current,
      c = GARDEN_MOODS[mood];
    const kit = new Atelier(true),
      scene = new T.Scene();
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      queueMicrotask(() =>
        setError('画面未能启动，请开启浏览器硬件加速后刷新。'),
      );
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = c.exposure;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.domElement.setAttribute(
      'aria-label',
      '中国庭院实时三维样板，可拖动旋转、缩放',
    );
    renderer.domElement.setAttribute('role', 'img');
    mount.appendChild(renderer.domElement);
    scene.background = new T.Color(c.sky);
    scene.fog = new T.FogExp2(c.sky, c.fog * 0.66);
    const camera = new T.PerspectiveCamera(43, 1, 0.2, 220);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 6;
    controls.maxDistance = 90;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(48, 2, 52);
    const envScene = new RoomEnvironment(),
      pmrem = new T.PMREMGenerator(renderer),
      env = pmrem.fromScene(envScene, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.32;
    envScene.dispose();
    pmrem.dispose();
    scene.add(new T.HemisphereLight(c.moon, '#192f2b', 1.15));
    const moon = new T.DirectionalLight(c.moon, 2.1);
    moon.position.set(27, 39, 19);
    moon.target.position.set(48, 0, 52);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.bias = -0.0004;
    moon.shadow.normalBias = 0.06;
    Object.assign(moon.shadow.camera, {
      left: -39,
      right: 39,
      top: 39,
      bottom: -39,
      far: 100,
    });
    scene.add(moon, moon.target);
    const rim = new T.DirectionalLight(
      mood === 'feast' ? '#ffa46b' : '#93b5b3',
      0.75,
    );
    rim.position.set(85, 16, 75);
    scene.add(rim);
    buildGarden(kit, gardenManifest(92623, mood));
    if (mood === 'rain') gardenWeather(kit, 92623);
    const spirits = (['crawler', 'runner', 'brute', 'boss'] as const).map(
      (kind, i) => {
        const actor = pavilionCreature(kit, kind);
        actor.group.position.set(41 + i * 3.5, 0, 72);
        actor.group.visible = false;
        return actor;
      },
    );
    kit.compile();
    scene.add(kit.root);
    const composer = new EffectComposer(renderer),
      bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.24, 0.4, 1.3),
      output = new OutputPass();
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloom);
    composer.addPass(output);
    const resize = () => {
      const w = mount.clientWidth,
        h = mount.clientHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    let frame = 0,
      last = 0,
      time = 0,
      lastView = '';
    const render = (now: number) => {
      if (lastView !== latest.current.view) {
        lastView = latest.current.view;
        spirits.forEach((actor) => {
          actor.group.visible = lastView === 'spirits';
        });
        if (lastView === 'spirits') {
          camera.position.set(49, 7, 86);
          controls.target.set(46.5, 1.7, 72);
        }
        if (lastView === 'court') {
          camera.position.set(78, 32, 89);
          controls.target.set(47, 1.6, 51);
        }
        if (lastView === 'gate') {
          camera.position.set(54, 5.1, 79);
          controls.target.set(47.8, 2, 55);
        }
        if (lastView === 'roof') {
          camera.position.set(61, 12, 54);
          controls.target.set(47, 4, 37);
        }
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (latest.current.motion) time += dt;
      kit.animations.forEach((f) => f(time));
      spirits.forEach((a) =>
        a.limbs.forEach((l, i) => {
          l.rotation.z = Math.sin(time * 3 + i) * 0.12;
        }),
      );
      controls.update();
      composer.render();
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      kit.dispose();
      env.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mood]);
  return (
    <div className="garden-viewer" ref={host}>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
