import { creaturePack } from '@/lib/survival-theme-assets';
import type { RoomWorld } from '@/lib/survival-world';
import { pavilionCreature } from './pavilion-creatures';
import { pickupIcon } from './pickup-icon';
import * as T from 'three';
import { Atelier } from '../../packages/render-kit/atelier';
import type { EnemyKind, Cache } from '@/lib/survival-room';

export function createActors(
  kit: Atelier,
  theme: RoomWorld['theme'] = 'wasteland',
) {
  const pack = creaturePack(theme);
  const handIcon = pickupIcon(kit);
  const ink = kit.mat('#1b3036'),
    skin = kit.mat('#d1bea0'),
    coat = kit.mat('#ad343a');
  const ivory = kit.mat('#ebe0b8'),
    shell = kit.mat('#707b64');
  const glow = kit.mat('#70efdc', 0.3, 0, '#35bfa1'),
    violet = kit.mat('#ceb5f4', 0.4, 0, '#7965c1');
  const gold = kit.mat('#dfab58'),
    black = kit.basic('#10252a');
  const outline = (root: T.Group, owner = kit) => {
    const meshes: T.Mesh[] = [];
    root.traverse((o) => {
      if (
        o instanceof T.Mesh &&
        !o.userData.inkOutline &&
        (o.material instanceof T.MeshToonMaterial ||
          o.material instanceof T.MeshStandardMaterial) &&
        !o.material.transparent
      )
        meshes.push(o);
    });
    const mat = new T.MeshBasicMaterial({
      color: '#070c10',
      side: T.BackSide,
      toneMapped: false,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        'vec3 transformed = vec3(position) + normal * .055;',
      );
    };
    owner.materials.add(mat);
    meshes.forEach((m) => {
      const edge = new T.Mesh(m.geometry, mat);
      edge.userData.inkOutline = true;
      edge.castShadow = false;
      m.add(edge);
    });
  };
  function human(opening = false) {
    const g = kit.group();
    g.userData.dynamic = true;
    kit.box(0.52, 0.62, 0.38, coat, [0, 0.96, 0], 0.09, g);
    kit.box(0.43, 0.16, 0.4, ink, [0, 0.65, 0], 0.03, g);
    kit.sphere(0.23, skin, [0, 1.5, 0], [1, 1.1, 1], g);
    kit.sphere(0.24, ivory, [0, 1.64, -0.01], [1.05, 0.55, 1.05], g);
    kit.box(0.4, 0.1, 0.12, ink, [0, 1.51, 0.19], 0.02, g);
    kit.box(0.12, 0.08, 0.13, ink, [0.11, 1.52, 0.25], 0.01, g);
    kit.box(0.4, 0.54, 0.24, ink, [0, 0.98, -0.28], 0.04, g);
    const legs: T.Group[] = [];
    for (const side of [-1, 1]) {
      const leg = kit.group([side * 0.16, 0.59, 0], g);
      legs.push(leg);
      kit.box(0.2, 0.45, 0.22, ink, [0, -0.22, 0], 0.035, leg);
      kit.box(0.22, 0.14, 0.36, ivory, [0, -0.47, 0.06], 0.03, leg);
      kit.box(0.18, 0.42, 0.21, coat, [side * 0.34, 1, 0.09], 0.04, g);
    }
    if (opening) {
      const phone = kit.group([-0.34, 0.96, 0.22], g);
      kit.box(0.16, 0.27, 0.035, ink, [0, 0, 0], 0.015, phone);
      kit.box(0.13, 0.22, 0.008, glow, [0, 0, 0.022], 0.008, phone);
      const torch = kit.group([0.34, 0.95, 0.32], g);
      torch.name = 'carried-flashlight';
      kit.box(0.14, 0.15, 0.38, ink, [0, 0, 0], 0.035, torch);
      kit.box(0.22, 0.22, 0.12, gold, [0, 0, 0.22], 0.04, torch);
      kit.box(0.16, 0.16, 0.015, ivory, [0, 0, 0.287], 0.025, torch);
    } else {
      kit.box(0.18, 0.2, 0.74, gold, [0.34, 0.95, 0.49], 0.025, g);
      kit.box(0.12, 0.14, 0.28, ink, [0.34, 0.96, 0.94], 0.01, g);
    }
    outline(g);
    return { group: g, limbs: legs };
  }
  const carapace = kit.mat(
      theme === 'maintenance'
        ? '#333b3e'
        : theme === 'dunes'
          ? '#473c31'
          : '#303633',
    ),
    chitin = kit.mat(
      theme === 'maintenance'
        ? '#66433a'
        : theme === 'dunes'
          ? '#786653'
          : '#4d4648',
    ),
    bone = kit.mat('#a3977b'),
    blood = kit.mat('#692e32');
  const slit = kit.mat('#af3c36', 0.7, 0, '#521715');
  const angular = kit.geo(
    'creature-shard',
    () => new T.OctahedronGeometry(1, 0),
  );
  function makeEnemy(kind: EnemyKind) {
    const g = kit.group();
    g.userData.dynamic = true;
    const limbs: T.Group[] = [];
    const shard = (
      material: T.Material,
      pos: [number, number, number],
      scale: [number, number, number],
      parent = g,
    ) => {
      const m = kit.mesh(angular, material, pos, parent);
      m.scale.set(...scale);
      return m;
    };
    if (kind === 'runner') {
      // A split, suspended husk. No face, round eye or humanoid body.
      for (const side of [-1, 1]) {
        const wing = shard(carapace, [side * 0.3, 0.95, 0], [0.28, 0.85, 0.55]);
        wing.rotation.z = side * -0.22;
        shard(bone, [side * 0.19, 1.2, 0.31], [0.065, 0.52, 0.13]).rotation.z =
          side * -0.32;
        shard(slit, [side * 0.05, 0.91, 0.33], [0.025, 0.43, 0.045]);
        for (let i = 0; i < 3; i++) {
          const limb = kit.group([side * 0.23, 0.57, -0.2 + i * 0.17], g);
          limbs.push(limb);
          shard(
            chitin,
            [side * 0.18, -0.19, 0.1],
            [0.055, 0.47, 0.07],
            limb,
          ).rotation.z = side * -0.65;
        }
      }
      shard(blood, [0, 0.82, 0.01], [0.13, 0.36, 0.21]);
    } else {
      g.scale.setScalar(kind === 'boss' ? 2.25 : kind === 'brute' ? 1.42 : 1);
      shard(carapace, [0, 0.54, -0.2], [0.43, 0.37, 0.91]);
      for (let i = 0; i < 4; i++) {
        const plate = shard(
          i % 2 ? carapace : chitin,
          [0, 0.68, -0.72 + i * 0.32],
          [0.49, 0.22, 0.33],
        );
        plate.rotation.x = -0.22;
        shard(
          bone,
          [0, 0.98, -0.69 + i * 0.3],
          [0.045, 0.3 + i * 0.025, 0.09],
        ).rotation.x = -0.55;
      }
      shard(chitin, [0, 0.4, 0.55], [0.32, 0.19, 0.4]);
      shard(blood, [0, 0.36, 0.8], [0.22, 0.09, 0.15]);
      for (const side of [-1, 1]) {
        shard(
          slit,
          [side * 0.15, 0.48, 0.77],
          [0.095, 0.023, 0.04],
        ).rotation.z = side * 0.22;
        const jaw = shard(bone, [side * 0.27, 0.29, 0.81], [0.085, 0.09, 0.36]);
        jaw.rotation.y = side * -0.34;
        for (let i = 0; i < 4; i++) {
          const limb = kit.group([side * 0.3, 0.42, -0.76 + i * 0.38], g);
          limbs.push(limb);
          const upper = shard(
            chitin,
            [side * 0.35, 0.17, -0.08],
            [0.47, 0.055, 0.095],
            limb,
          );
          upper.rotation.z = side * 0.4;
          const blade = shard(
            bone,
            [side * 0.68, -0.07, 0.05],
            [0.055, 0.47, 0.08],
            limb,
          );
          blade.rotation.z = side * 0.28;
        }
        if (kind === 'boss' || kind === 'brute') {
          const horn = shard(
            carapace,
            [side * 0.4, 1.15, 0.33],
            [0.16, 0.76, 0.2],
          );
          horn.rotation.z = side * -0.35;
          shard(
            bone,
            [side * 0.26, 1.63, 0.43],
            [0.035, 0.32, 0.06],
          ).rotation.z = side * 0.25;
        }
      }
    }
    outline(g);
    return { group: g, limbs };
  }
  const templates = new Map<EnemyKind, ReturnType<typeof makeEnemy>>();
  function enemy(kind: EnemyKind) {
    let template = templates.get(kind);
    if (!template) {
      template =
        pack.creatureRenderer === 'jiangnan-spirits-1'
          ? pavilionCreature(kit, kind)
          : makeEnemy(kind);
      if (theme === 'pavilion') outline(template.group);
      template.group.removeFromParent();
      template.limbs.forEach((limb, i) => {
        limb.name = 'limb-' + i;
      });
      templates.set(kind, template);
    }
    const group = template.group.clone(true);
    kit.root.add(group);
    // Materials belong to this actor; flashing one insect cannot flash the entire pack.
    const copies = new Map<
      T.Material,
      T.MeshStandardMaterial | T.MeshToonMaterial
    >();
    group.traverse((o) => {
      if (
        !(o instanceof T.Mesh) ||
        !(
          o.material instanceof T.MeshStandardMaterial ||
          o.material instanceof T.MeshToonMaterial
        )
      )
        return;
      let material = copies.get(o.material);
      if (!material) {
        material = o.material.clone();
        copies.set(o.material, material);
        kit.materials.add(material);
      }
      o.material = material;
    });
    const colors = [...copies.values()].map((m) => ({
      m,
      color: m.color.clone(),
      emissive: m.emissive.clone(),
      intensity: m.emissiveIntensity,
    }));
    return {
      group,
      flash(white: boolean) {
        for (const { m, color, emissive, intensity } of colors) {
          m.color.copy(white ? new T.Color('#ffffff') : color);
          m.emissive.copy(white ? new T.Color('#ffffff') : emissive);
          m.emissiveIntensity = white ? 0.65 : intensity;
        }
      },
      dispose() {
        for (const m of copies.values()) {
          kit.materials.delete(m);
          m.dispose();
        }
      },
      limbs: template.limbs.map(
        (_, i) => group.getObjectByName('limb-' + i) as T.Group,
      ),
    };
  }
  function cache(cache: Cache, garden = false) {
    const local = new Atelier(kit.toon);
    const g = local.root;
    kit.root.add(g);
    g.userData.dynamic = true;
    const kind = cache.item.kind,
      mat = kind === 'coil' ? glow : kind === 'laser' ? violet : gold;
    const chestWood = garden
      ? local.weather(local.mat('#58362b'), 0.35, 3, true)
      : shell;
    const chestLid = garden ? chestWood : ivory;
    if (cache.container === 'locker') {
      local.box(1.25, 2.15, 0.8, ink, [0, 1.08, -0.9], 0.045, g);
      local.box(1.1, 1.96, 0.66, shell, [0, 1.1, -0.88], 0.02, g);
      for (const y of [0.55, 1.1, 1.65])
        local.box(1.1, 0.06, 0.6, ivory, [0, y, -0.84], 0.01, g);
      const lid = local.group([-0.63, 0, -0.46], g);
      lid.name = 'lid';
      local.box(1.25, 2.12, 0.12, ivory, [0.63, 1.09, 0], 0.035, lid);
      for (let y = 1.57; y < 1.96; y += 0.12)
        local.box(0.75, 0.03, 0.02, ink, [0.61, y, 0.072], 0.005, lid);
      local.box(0.065, 0.38, 0.07, gold, [1.02, 1.08, 0.105], 0.01, lid);
      local.box(0.42, 0.36, 0.015, coat, [0.62, 0.58, 0.076], 0.01, lid);
    } else if (cache.container === 'crate') {
      local.box(1.35, 0.7, 0.9, chestWood, [0, 0.38, -0.85], 0.055, g);
      local.box(1.15, 0.05, 0.75, ink, [0, 0.77, -0.85], 0.01, g);
      const lid = local.group([0, 0.78, -1.32], g);
      lid.name = 'lid';
      local.box(1.42, 0.14, 0.98, chestLid, [0, 0.04, 0.48], 0.035, lid);
      for (const x of [-0.43, 0.43]) {
        local.box(0.1, 0.16, 1, gold, [x, 0.05, 0.48], 0.005, lid);
        local.box(0.14, 0.68, 0.045, gold, [x, 0.38, -0.36], 0.01, g);
      }
    } else if (kind === 'golden') {
      local.box(.9,.08,.55,gold,[0,.16,0],.02,g);
      local.box(.56,.025,.34,ivory,[0,.21,0],.01,g);
      for(const x of [-.25,.25])local.box(.035,.026,.36,ink,[x,.23,0],0,g);
    } else if (kind === 'flashlight') {
      local.box(0.19, 0.18, 0.68, ink, [0, 0.14, 0], 0.04, g);
      local.box(0.29, 0.26, 0.18, gold, [0, 0.18, 0.38], 0.04, g);
      local.box(0.23, 0.2, 0.02, ivory, [0, 0.18, 0.482], 0.02, g);
    } else if (kind === 'lift-material') {
      const flesh = local.mat(
        (
          {
            low: '#997176',
            normal: '#ae7e88',
            fine: '#907eac',
            supreme: '#b6a47d',
          } as const
        )[cache.item.quality || 'low'],
      );
      for (const side of [-1, 1])
        local.mesh(
          new T.IcosahedronGeometry(0.2, 0),
          flesh,
          [side * 0.13, 0.2, 0],
          g,
        );
      local.box(0.04, 0.19, 0.3, ink, [0, 0.21, 0], 0.01, g);
      local.mesh(
        new T.IcosahedronGeometry(0.07, 0),
        flesh,
        [0.24, 0.07, 0.19],
        g,
      );
    } else if (kind === 'coil') {
      local.cyl(0.3, 0.3, 0.5, ink, [0, 0.27, 0], 20, g);
      for (const y of [0.15, 0.26, 0.37]) {
        const ring = local.ring(0.32, 0.045, glow, [0, y, 0], g);
        ring.rotation.x = Math.PI / 2;
      }
    } else if (kind === 'laser' || kind === 'nail') {
      local.box(0.29, 0.23, 0.9, ivory, [0, 0.18, 0], 0.03, g);
      local.box(0.16, 0.17, 0.28, mat, [0, 0.19, 0.46], 0.015, g);
      local.box(0.14, 0.25, 0.23, ink, [0, 0.25, -0.15], 0.025, g);
    } else if (kind === 'water' || kind === 'medicine' || kind === 'food') {
      local.box(
        0.34,
        0.46,
        0.32,
        kind === 'medicine' ? coat : ivory,
        [0, 0.26, 0],
        0.04,
        g,
      );
      local.box(0.16, 0.065, 0.14, mat, [0, 0.52, 0], 0.01, g);
    } else {
      local.mesh(new T.OctahedronGeometry(0.28), mat, [0, 0.33, 0], g);
    }
    if (cache.container === 'backpack') {
      g.children.forEach((child) => (child.visible = false));
      const cloth = local.mat('#38413b'),
        strap = local.mat('#a1906b');
      local.box(0.9, 0.75, 0.46, cloth, [0, 0.43, 0], 0.08, g);
      local.box(0.63, 0.33, 0.14, strap, [0, 0.25, 0.27], 0.025, g);
      for (const x of [-0.25, 0.25])
        local.box(0.08, 0.67, 0.035, strap, [x, 0.46, 0.26], 0.01, g);
      local.box(0.4, 0.09, 0.12, strap, [0, 0.86, 0], 0.02, g);
    }
    if (cache.container === 'locker')
      for (const child of g.children) {
        child.position.y *= 0.6;
        child.scale.y *= 0.6;
      }
    const beacon = handIcon();
    beacon.position.set(
      0,
      cache.container === 'locker' ? 1.78 : 1.35,
      cache.container === 'loose' ? 0 : -0.8,
    );
    g.add(beacon);
    beacon.name = 'beacon';
    const ringMat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: T.DoubleSide,
      vertexShader:
        'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:
        'varying vec2 vUv; void main(){float r=length(vUv-.5)*2.;float a=exp(-pow((r-.7)*11.,2.))*.22;gl_FragColor=vec4(.75,.83,.69,a);}',
    });
    local.materials.add(ringMat);
    const ring = local.mesh(
      new T.PlaneGeometry(2, 2),
      ringMat,
      [0, 0.035, 0],
      g,
    );
    ring.name = 'loot-aura';
    ring.rotation.x = -Math.PI / 2;
    outline(g, local);
    local.materials.forEach((material) => kit.materials.add(material));
    g.userData.dispose = () => {
      local.materials.forEach((material) => kit.materials.delete(material));
      local.dispose();
      g.removeFromParent();
    };
    return g;
  }
  return { human, enemy, cache, black };
}
