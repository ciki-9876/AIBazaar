import * as THREE from 'three';
import type { SurfaceEvent } from '@/lib/battle-slice-fx';
import {
  barrierZ,
  coreZ,
  SHOT_HEIGHT,
  BARRIER_HEIGHT,
  BARRIER_WIDTH,
} from '@/lib/battle-slice-visual';

// All uniforms, debris and impacts are pure functions of the replay clock.
// No wall-clock time, accumulating particles or random state to desynchronise.
export function barrierMaterial(side: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      tint: { value: new THREE.Color(side ? '#dc9f69' : '#7fdacb') },
      health: { value: 1 },
      time: { value: 0 },
      contacts: {
        value: Array.from({ length: 4 }, () => new THREE.Vector3(0, 99, 0)),
      },
    },
    vertexShader: `varying vec2 p;
      void main(){ p=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 p; uniform vec3 tint; uniform float health,time;
      uniform vec3 contacts[4];
      void main(){
        vec2 q=vec2(p.x*${BARRIER_WIDTH},p.y*${BARRIER_HEIGHT});
        float edge=pow(abs(p.y-.5)*2.,14.);
        vec2 grid=abs(fract(q*vec2(9.,15.))-.5);
        float lattice=(1.-smoothstep(.015,.035,min(grid.x,grid.y)))*.07;
        float wave=0.; vec3 light=tint;
        for(int i=0;i<4;i++){
          float age=contacts[i].y;
          if(age>=0. && age<.85){
            float d=length(q-vec2(contacts[i].x+.5*${BARRIER_WIDTH},${SHOT_HEIGHT - 0.05}));
            float ring=exp(-pow((d-age*2.7)/.065,2.))*(1.-age/.85);
            wave+=ring;
            if(contacts[i].z>0.5) light=mix(light,vec3(.48,1.,.75),ring*.6);
          }
        }
        float fracture=0.;
        for(int i=0;i<5;i++){
          float k=float(i);
          float path=.2+k*.55+sin(p.y*19.+k*3.)*.035;
          fracture+= (1.-smoothstep(.003,.012,abs(q.x-path))) * step(health,.86-k*.13);
        }
        float scan=exp(-pow((p.y-fract(time*.13))/.10,2.))*.035;
        gl_FragColor=vec4(light*(.55+wave*1.3+fracture*.65),
          min(.85,.08+health*.15+edge*.40+lattice+scan+wave*.60+fracture*.32));
      }`,
  });
}

export type Contact = SurfaceEvent & { x: number };
export function createImpactEffects(parent: THREE.Group) {
  const root = new THREE.Group();
  parent.add(root);
  const capacity = 640;
  const fragments = new THREE.InstancedMesh(
    new THREE.TetrahedronGeometry(1),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      metalness: 0.6,
      roughness: 0.32,
    }),
    capacity,
  );
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fragments.frustumCulled = false;
  root.add(fragments);
  const rings = Array.from({ length: 32 }, () => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.32, 48),
      new THREE.MeshBasicMaterial({
        color: '#c2f4e3',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    root.add(ring);
    return ring;
  });
  const blooms = Array.from({ length: 24 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { tint: { value: new THREE.Color() }, opacity: { value: 0 } },
        vertexShader:
          'varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:
          'varying vec2 p; uniform vec3 tint;uniform float opacity;void main(){float d=length(p-.5)*2.;float a=pow(max(0.,1.-d),2.);gl_FragColor=vec4(tint,a*opacity);}',
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    root.add(mesh);
    return mesh;
  });
  const slashes = Array.from({ length: 8 }, () => {
    const slash = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.46, 32, 1, -0.6, 2.1),
      new THREE.MeshBasicMaterial({
        color: '#fff0cb',
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    slash.rotation.x = -Math.PI / 2;
    root.add(slash);
    return slash;
  });
  const dummy = new THREE.Object3D(),
    color = new THREE.Color();
  return {
    update(
      time: number,
      contacts: Contact[],
      reduced: boolean,
      knifeUids: Set<string>,
    ) {
      let count = 0,
        ringCount = 0,
        slashCount = 0,
        bloomCount = 0;
      rings.forEach((r) => (r.visible = false));
      slashes.forEach((r) => (r.visible = false));
      blooms.forEach((r) => (r.visible = false));
      for (const event of contacts) {
        const age = time - event.time;
        if (age < 0 || age > 1.4) continue;
        const core = event.kind === 'core' || event.kind === 'death';
        const repair = event.kind === 'repair' || event.kind === 'block';
        const breaking = event.kind === 'break';
        const death = event.kind === 'death';
        const z = core ? coreZ(event.side) : barrierZ(event.side);
        const y = core ? (event.side ? 0.48 : 0.12) : SHOT_HEIGHT;
        const tint = repair
          ? '#90e8c7'
          : core
            ? event.side
              ? '#86647a'
              : '#7eb2ce'
            : event.side
              ? '#f1bd84'
              : '#a9e7dc';
        if (!reduced && age < 0.55 && bloomCount < blooms.length && !death) {
          const bloom = blooms[bloomCount++];
          bloom.visible = true;
          bloom.position.set(event.x, y + 0.035, z);
          bloom.scale.setScalar(0.7 + age * 2.2);
          bloom.material.uniforms.tint.value.set(core ? '#463249' : tint);
          bloom.material.uniforms.opacity.value = (1 - age / 0.55) * 0.65;
        }
        if (age < 0.65 && ringCount < rings.length && !death) {
          const ring = rings[ringCount++];
          ring.visible = true;
          ring.position.set(event.x, y, z);
          ring.rotation.set(core ? -Math.PI / 2 : 0, 0, repair ? 0 : 0.35);
          const radius = reduced ? 0.65 : 0.5 + age * (breaking ? 5 : 3.5);
          ring.scale.set(radius, repair ? radius * 0.7 : radius, 1);
          ring.material.opacity = (1 - age / 0.65) * (reduced ? 0.25 : 0.8);
          ring.material.color.set(tint);
        }
        if (
          !reduced &&
          !repair &&
          !breaking &&
          !death &&
          age < 0.32 &&
          knifeUids.has(event.sourceUid ?? '') &&
          slashCount < slashes.length
        ) {
          const slash = slashes[slashCount++];
          slash.visible = true;
          slash.position.set(event.x, y + 0.06, z);
          slash.rotation.z = -0.7 + age * 4;
          slash.scale.setScalar(1.1 + age * 2);
          slash.material.opacity = 1 - age / 0.32;
        }
        if (reduced) continue;
        const duration = death ? 1.4 : breaking ? 1.1 : repair ? 0.7 : 0.65;
        if (age >= duration) continue;
        const n = death ? 96 : breaking ? 42 : repair ? 12 : 18;
        for (let i = 0; i < n && count < capacity; i++) {
          const seed = i * 2.399963 + event.time * 1.73 + event.lane;
          const speed = 0.3 + (i % 7) * 0.15;
          const origin =
            breaking || death
              ? (i / (n - 1) - 0.5) * (death ? 9.8 : BARRIER_WIDTH)
              : 0;
          dummy.position.set(
            event.x + origin + Math.cos(seed) * speed * age,
            Math.max(
              0.08,
              y +
                (repair
                  ? age * 0.55
                  : Math.sin((age / duration) * Math.PI) *
                    (0.2 + speed * 0.45)),
            ),
            z + Math.sin(seed) * speed * age * (repair ? 0.25 : 1),
          );
          dummy.rotation.set(
            seed + age * 5,
            seed * 0.7 + age * 3,
            seed + age * 2,
          );
          const scale =
            (breaking ? 0.095 : death ? 0.12 : repair ? 0.04 : 0.055) *
            (1 - age / duration);
          dummy.scale.set(
            scale,
            scale * (core ? 1.7 : 1),
            scale * (repair ? 3 : 1),
          );
          dummy.updateMatrix();
          fragments.setMatrixAt(count, dummy.matrix);
          color.set(tint).multiplyScalar(0.65 + (i % 4) * 0.16);
          fragments.setColorAt(count, color);
          count++;
        }
      }
      fragments.count = count;
      fragments.instanceMatrix.needsUpdate = true;
      if (fragments.instanceColor) fragments.instanceColor.needsUpdate = true;
    },
  };
}
