'use client';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWorld, type World } from './worlds';
import type { ViewerOptions } from './catalog';

type Props = {
  options: ViewerOptions;
  onStatus: (status: string) => void;
  onStats: (fps: number) => void;
};
export default function ShowcaseViewer({ options, onStatus, onStats }: Props) {
  const container = useRef<HTMLDivElement>(null),
    latest = useRef({ options, onStatus, onStats });
  const [error, setError] = useState('');
  useEffect(() => {
    latest.current = { options, onStatus, onStats };
  }, [options, onStatus, onStats]);
  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let disposed = false,
      frame = 0,
      world: World | undefined,
      renderer: T.WebGLRenderer | undefined,
      composer: EffectComposer | undefined,
      ao: SSAOPass | undefined,
      envTarget: T.WebGLRenderTarget | undefined,
      controls: OrbitControls | undefined,
      observer: ResizeObserver | undefined;
    const scene = new T.Scene();
    const camera = new T.OrthographicCamera(-10, 10, 9, -9, 0.1, 90);
    const resourceCleanup: (() => void)[] = [];
    queueMicrotask(() => {
      if (!disposed) {
        setError('');
        latest.current.onStatus('正在布置场景');
      }
    });
    const start = async () => {
      try {
        const r = new T.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        });
        renderer = r;
        r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        r.shadowMap.enabled = true;
        r.shadowMap.type = T.PCFShadowMap;
        r.outputColorSpace = T.SRGBColorSpace;
        r.toneMapping = T.ACESFilmicToneMapping;
        host.appendChild(r.domElement);
        r.domElement.setAttribute('aria-label', '可旋转的实时三维场景');
        r.domElement.setAttribute('role', 'img');
        const onLost = (event: Event) => {
          event.preventDefault();
          latest.current.onStatus('图形连接中断');
          setError('图形连接中断，请重新载入场景。');
        };
        r.domElement.addEventListener('webglcontextlost', onLost);
        resourceCleanup.push(() =>
          r.domElement.removeEventListener('webglcontextlost', onLost),
        );
        world = await buildWorld(options.study);
        if (disposed) {
          world.kit.dispose();
          world.water?.dispose();
          return;
        }
        const w = world;
        scene.add(w.kit.root);
        scene.background = new T.Color(w.background);
        r.toneMappingExposure = w.exposure;
        const environment = new RoomEnvironment();
        const pmrem = new T.PMREMGenerator(r);
        envTarget = pmrem.fromScene(environment, 0.04);
        scene.environment = envTarget.texture;
        scene.environmentIntensity = options.study === 'industrial' ? 0.5 : 0.7;
        environment.dispose();
        pmrem.dispose();
        const hemisphere = new T.HemisphereLight(
          w.fill,
          options.study === 'myth' ? '#172830' : '#344137',
          options.study === 'myth'
            ? 1.1
            : options.study === 'garden'
              ? 0.65
              : 0.6,
        );
        scene.add(hemisphere);
        const sun = new T.DirectionalLight(
          w.key,
          options.study === 'industrial'
            ? 2.1
            : options.study === 'garden'
              ? 2.4
              : 3.0,
        );
        sun.position.set(...w.light);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -10;
        sun.shadow.camera.right = 10;
        sun.shadow.camera.top = 10;
        sun.shadow.camera.bottom = -10;
        sun.shadow.camera.near = 0.1;
        sun.shadow.camera.far = 35;
        sun.shadow.bias = -0.0003;
        sun.shadow.normalBias = 0.045;
        sun.shadow.radius = 3;
        scene.add(sun);
        const rim = new T.DirectionalLight(
          options.study === 'garden' ? '#e8d9b2' : '#93d1ce',
          options.study === 'industrial' ? 1.1 : 0.75,
        );
        rim.position.set(3, 6, -5);
        scene.add(rim);
        resourceCleanup.push(() => sun.shadow.dispose());
        const c = new OrbitControls(camera, r.domElement);
        controls = c;
        c.enableDamping = true;
        c.dampingFactor = 0.08;
        c.enablePan = true;
        c.minZoom = 0.65;
        c.maxZoom = 3.0;
        c.minPolarAngle = 0.1;
        c.maxPolarAngle = Math.PI * 0.47;
        c.target.set(...w.target);
        c.rotateSpeed = 0.65;
        c.zoomSpeed = 0.65;
        const comp = new EffectComposer(r);
        composer = comp;
        comp.addPass(new RenderPass(scene, camera));
        const ssao = new SSAOPass(scene, camera, 800, 600, 16);
        ao = ssao;
        ssao.ssaoMaterial.defines.PERSPECTIVE_CAMERA = 0;
        ssao.depthRenderMaterial.defines.PERSPECTIVE_CAMERA = 0;
        ssao.kernelRadius = options.study === 'myth' ? 0.3 : 0.6;
        ssao.minDistance = 0.001;
        ssao.maxDistance = 0.07;
        // Glass, light veils and particles should not become solid AO occluders.
        const translucent: T.Mesh[] = [];
        scene.traverse((object) => {
          if (
            object instanceof T.Mesh &&
            !Array.isArray(object.material) &&
            object.material.transparent
          )
            translucent.push(object);
        });
        const renderAO = ssao.render.bind(ssao);
        ssao.render = (...args: Parameters<SSAOPass['render']>) => {
          const visible = translucent.map((mesh) => mesh.visible);
          translucent.forEach((mesh) => (mesh.visible = false));
          try {
            renderAO(...args);
          } finally {
            translucent.forEach(
              (mesh, index) => (mesh.visible = visible[index]),
            );
          }
        };
        comp.addPass(ssao);
        const bloom = new UnrealBloomPass(
          new T.Vector2(800, 600),
          w.bloom,
          0.45,
          2.3,
        );
        comp.addPass(bloom);
        const output = new OutputPass();
        comp.addPass(output);
        const fxaa = new ShaderPass(FXAAShader);
        comp.addPass(fxaa);
        resourceCleanup.push(() => {
          bloom.dispose();
          output.dispose();
          fxaa.dispose();
        });
        let width = 1,
          height = 1,
          lastView = '',
          lastReset = -1,
          lastNeutral: boolean | undefined,
          lastBurst = latest.current.options.burst,
          pulseStart = -100,
          time = 0,
          previous = performance.now(),
          reportAt = previous,
          frames = 0;
        function frameView() {
          const opts = latest.current.options;
          const target = opts.view === 'detail' ? w.detail : w.target;
          c.target.set(...target);
          const a =
            opts.view === 'game'
              ? [1, 19, 15]
              : opts.view === 'detail'
                ? [9, 7, 11]
                : [14, 13, 18];
          camera.position.set(
            target[0] + a[0],
            target[1] + a[1],
            target[2] + a[2],
          );
          camera.zoom = opts.view === 'detail' ? 1.9 : 1;
          camera.updateProjectionMatrix();
          c.update();
          lastView = opts.view;
          lastReset = opts.reset;
        }
        const resize = () => {
          width = host.clientWidth;
          height = host.clientHeight;
          const aspect = width / Math.max(height, 1);
          const viewHeight = Math.max(13.7, 19.5 / aspect);
          camera.left = (-viewHeight * aspect) / 2;
          camera.right = (viewHeight * aspect) / 2;
          camera.top = viewHeight / 2;
          camera.bottom = -viewHeight / 2;
          camera.updateProjectionMatrix();
          r.setSize(width, height);
          comp.setSize(width, height);
          const pixel = r.getPixelRatio();
          fxaa.material.uniforms.resolution.value.set(
            1 / (width * pixel),
            1 / (height * pixel),
          );
        };
        observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();
        frameView();
        await r.compileAsync(scene, camera);
        if (disposed) return;
        latest.current.onStatus('实时 3D · 可拖动旋转');
        const render = (now: number) => {
          if (disposed) return;
          const delta = Math.min((now - previous) / 1000, 0.06);
          previous = now;
          const opts = latest.current.options;
          if (opts.view !== lastView || opts.reset !== lastReset) frameView();
          if (opts.neutral !== lastNeutral) {
            sun.color.set(opts.neutral ? '#ffffff' : w.key);
            hemisphere.color.set(opts.neutral ? '#cdd7dc' : w.fill);
            r.toneMappingExposure = opts.neutral ? 1.15 : w.exposure;
            scene.environmentIntensity = opts.neutral
              ? 1
              : options.study === 'industrial'
                ? 0.5
                : 0.7;
            bloom.strength = opts.neutral ? 0.05 : w.bloom;
            lastNeutral = opts.neutral;
          }
          if (!document.hidden) {
            if (opts.motion) time += delta;
            w.update(time);
            if (opts.burst !== lastBurst) {
              pulseStart = time;
              lastBurst = opts.burst;
            }
            const age = time - pulseStart;
            w.pulse.visible = age < 1.35;
            w.pulse.children.forEach((child, i) => {
              const t = Math.max(0, age - i * 0.12);
              child.scale.setScalar(0.15 + t * 3);
              if (child instanceof T.Mesh)
                (child.material as T.MeshBasicMaterial).opacity =
                  Math.max(0, 1 - t) * 0.8;
            });
            c.update();
            ssao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(
              camera.projectionMatrix,
            );
            ssao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(
              camera.projectionMatrixInverse,
            );
            w.water?.render(r, scene, camera, time);
            comp.render();
            frames++;
          }
          if (now - reportAt > 1200) {
            latest.current.onStats(
              Math.round((frames * 1000) / (now - reportAt)),
            );
            reportAt = now;
            frames = 0;
          }
          frame = requestAnimationFrame(render);
        };
        frame = requestAnimationFrame(render);
      } catch (reason) {
        if (!disposed) {
          setError(reason instanceof Error ? reason.message : '场景载入失败');
          latest.current.onStatus('场景未能载入');
        }
      }
    };
    void start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      controls?.dispose();
      ao?.dispose();
      resourceCleanup.forEach((f) => f());
      composer?.dispose();
      world?.kit.dispose();
      world?.water?.dispose();
      envTarget?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [options.study]);
  return (
    <div className="atelier-canvas" ref={container}>
      {error && (
        <div className="atelier-error">
          <strong>场景载入失败</strong>
          <p>{error}</p>
          <button onClick={() => location.reload()}>重新载入</button>
        </div>
      )}
    </div>
  );
}
