import * as T from 'three';
import { ELEVATOR, type Point, type SurvivalState } from '@/lib/survival-room';
import { returnPath } from '@/lib/survival-return-path';
/** Thin world-space ribbon. Rebuild only on navigation-cell changes, then move its origin every frame. */
export function returnGuide(scene: T.Scene) {
  const points = new Float32Array(511 * 6 * 3),
    lengths = new Float32Array(511 * 6),
    sides = new Float32Array(511 * 6);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(points, 3));
  geo.setAttribute('routeSide', new T.BufferAttribute(sides, 1));
  geo.setAttribute('routeDistance', new T.BufferAttribute(lengths, 1));
  const material = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    toneMapped: false,
    uniforms: { color: { value: new T.Color('#d1c58a') }, time: { value: 0 } },
    vertexShader:
      'attribute float routeDistance; attribute float routeSide; varying float vSide; varying float vDistance; void main(){vSide=routeSide;vDistance=routeDistance;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:
      'varying float vDistance;varying float vSide;uniform vec3 color;uniform float time;void main(){float p=fract((vDistance-time*1.7)/1.05);float chevron=abs(p-(.68-abs(vSide)*.28));float arrow=1.-smoothstep(.07,.13,chevron);float rail=(1.-smoothstep(.06,.13,abs(vSide)))*.12;gl_FragColor=vec4(color,max(arrow*.72,rail));}',
  });
  const line = new T.Mesh(geo, material);
  line.frustumCulled = false;
  line.renderOrder = 3;
  scene.add(line);
  const ringGeo = new T.RingGeometry(0.57, 0.62, 40),
    ringMat = new T.MeshBasicMaterial({
      color: '#c3b789',
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      toneMapped: false,
    });
  const ring = new T.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(ELEVATOR.x, 0.05, ELEVATOR.z - 0.9);
  scene.add(ring);
  let key = '',
    route: Point[] = [];
  return {
    update(s: SurvivalState, pose: Point, visible: boolean, reduced = false) {
      material.uniforms.time.value = reduced ? 0 : s.tick / 30;
      line.visible = ring.visible = visible;
      if (!visible) return;
      const k = `${s.seed}/${Math.floor(pose.x)}/${Math.floor(pose.z)}`;
      if (key !== k) {
        route = returnPath(pose, s.world);
        key = k;
      }
      const vertices = [pose, ...route].slice(0, 512);
      let length = 0;
      for (let i = 0; i < vertices.length - 1; i++) {
        const a = vertices[i],
          b = vertices[i + 1],
          d = Math.hypot(b.x - a.x, b.z - a.z),
          nx = (-(b.z - a.z) / (d || 1)) * 0.25,
          nz = ((b.x - a.x) / (d || 1)) * 0.25;
        const quad = [
          [a.x + nx, a.z + nz, length],
          [a.x - nx, a.z - nz, length],
          [b.x + nx, b.z + nz, length + d],
          [b.x + nx, b.z + nz, length + d],
          [a.x - nx, a.z - nz, length],
          [b.x - nx, b.z - nz, length + d],
        ];
        quad.forEach(([x, z, t], j) => {
          const index = i * 6 + j;
          points[index * 3] = x;
          points[index * 3 + 1] = 0.055;
          points[index * 3 + 2] = z;
          lengths[index] = t;
          sides[index] = [1, -1, 1, 1, -1, -1][j];
        });
        length += d;
      }
      geo.setDrawRange(0, Math.max(0, vertices.length - 1) * 6);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.routeDistance.needsUpdate = true;
      geo.attributes.routeSide.needsUpdate = true;
    },
    dispose() {
      line.removeFromParent();
      ring.removeFromParent();
      geo.dispose();
      material.dispose();
      ringGeo.dispose();
      ringMat.dispose();
    },
  };
}
