import test from 'node:test';
import assert from 'node:assert/strict';
import { putInBag, cargoLayout, packBag } from './survival-cargo.ts';
import {
  ITEMS,
  createSurvival,
  stepSurvival,
  survivalAction,
  capacity,
  enemyLimit,
} from './survival-room.ts';
import {
  itemCount,
  itemIds,
  brainExperience,
  countKind,
} from './survival-stacks.ts';
import { transferItem } from './survival-transfer.ts';
import { clearSight, revealFog, blocksVision } from './survival-world.ts';
import { payAscent } from './survival-ascent.ts';
import { createGMCheckpoint } from './survival-gm.ts';
import { openingAction, stepOpening, dialogueCue } from './survival-opening.ts';
import { readOpeningCheckpoint } from './survival-checkpoint.ts';
const item = (uid, quality = 'low') => ({
  ...ITEMS['lift-material'],
  uid,
  quality,
});
const field = () => {
  const r = createSurvival(92621);
  r.floor = 2;
  r.status = 'running';
  r.world = { ...r.world, obstacles: [], gates: [] };
  r.player = { ...r.player, x: 40, z: 40 };
  r.enemies = [];
  r.spawns = [];
  r.caches = [];
  r.equipment = [];
  r.nextWave = 99999;
  r.fog = revealFog(r.player, r.fog, r.world);
  return r;
};
const monster = (pursuit, x = 41, z = 40) => ({
  id: pursuit,
  kind: 'crawler',
  x,
  z,
  hp: 100,
  maxHp: 100,
  awake: false,
  nextAttack: 999999,
  hitAt: -100,
  windup: 0,
  aim: null,
  pursuit,
  home: { x, z },
  sight: 10,
});
test('brain stacks cap at 20, keep all unit identities, merge atomically even when other cells are full', () => {
  let bag = [];
  for (let n = 0; n < 23; n++) bag = putInBag(bag, item(`b-${n}`));
  assert.deepEqual(bag.map(itemCount), [20, 3]);
  assert.equal(capacity(bag), 2);
  assert.equal(new Set(bag.flatMap(itemIds)).size, 23);
  bag = putInBag(bag, item('fine', 'fine'));
  assert.equal(bag.length, 3);
  assert.equal(brainExperience(bag), 155);
  const full = [
    ...bag,
    ...Array.from({ length: 13 }, (_, n) => ({
      ...ITEMS.water,
      uid: `water-${n}`,
      slot: n + 3,
    })),
  ];
  assert.ok(putInBag(full, item('more')));
  const snapshot = structuredClone(full);
  assert.equal(putInBag(full, item('other-quality', 'normal')), null);
  assert.deepEqual(full, snapshot);
  assert.equal(cargoLayout(full).length, 16);
});
test('stack transfers merge the same quality; upgrading consumes XP without losing remaining identities', () => {
  const r = field();
  r.bag = packBag([
    item('a'),
    item('b'),
    { ...item('c', 'normal'), stack: ['d', 'e'] },
    { ...ITEMS.scrap, uid: 's1' },
    { ...ITEMS.scrap, uid: 's2' },
  ]);
  const paid = payAscent(r);
  assert.ok(paid);
  assert.equal(brainExperience(r.bag), 55);
  assert.equal(brainExperience(paid.bag), 15);
  assert.equal(countKind(paid.bag, 'scrap'), 0);
  assert.equal(paid.liftLevel, 2);
  assert.equal(paid.liftExperience, 10);
  const split = {
    ...r,
    bag: [
      { ...item('x'), slot: 0 },
      { ...item('y'), slot: 1 },
    ],
    safe: [],
  };
  const merged = transferItem(split, {
    type: 'transfer',
    uid: 'y',
    zone: 'bag',
    slot: 0,
  });
  assert.equal(merged.bag.length, 1);
  assert.deepEqual(itemIds(merged.bag[0]), ['x', 'y']);
  const protectedStack = survivalAction(merged, { type: 'protect', uid: 'x' });
  assert.equal(itemCount(protectedStack.safe[0]), 2);
});
test('only tall obstacles occlude vision, but both heights block navigation segments', () => {
  const r = field(),
    a = { x: 38, z: 40 },
    b = { x: 42, z: 40 };
  for (const type of ['container', 'low-wall', 'lift-fixture']) {
    const o = { type, x: 40, z: 40, w: 1, d: 2 };
    const world = { ...r.world, obstacles: [o] };
    assert.equal(blocksVision(o), false);
    assert.equal(clearSight(a, b, world), true);
    assert.equal(clearSight(a, b, world, 0.3, true), false);
  }
  for (const type of ['wall', 'pump', 'shelf', 'tank', 'lift-wall']) {
    const o = { type, x: 40, z: 40, w: 1, d: 2 };
    assert.equal(blocksVision(o), true);
    assert.equal(clearSight(a, b, { ...r.world, obstacles: [o] }), false);
  }
  assert.equal(
    clearSight(a, b, {
      ...r.world,
      obstacles: [{ x: 40, z: 40, w: 1, d: 2, type: 'wall' }],
    }),
    false,
  );
  assert.equal(
    clearSight(a, b, {
      ...r.world,
      obstacles: [
        { x: 40, z: 40, w: 1, d: 2, type: 'container', height: 'tall' },
      ],
    }),
    false,
  );
});
test('enemies acquire by sight, search last position for 3 seconds, territorial ones return and ambush ones stop', () => {
  for (const mode of ['territorial', 'ambush']) {
    let r = field();
    r.enemies = [monster(mode, 45, 40)];
    r = stepSurvival(r, {}, { waves: false, needs: false, combat: false });
    assert.ok(r.enemies[0].awake);
    r = { ...r, player: { ...r.player, x: 75, z: 70 } };
    for (let n = 0; n < 89; n++)
      r = stepSurvival(r, {}, { waves: false, needs: false, combat: false });
    assert.ok(r.enemies[0].awake);
    for (let n = 0; n < 3; n++)
      r = stepSurvival(r, {}, { waves: false, needs: false, combat: false });
    assert.equal(r.enemies[0].awake, false);
    const at = { x: r.enemies[0].x, z: r.enemies[0].z };
    for (let n = 0; n < 30; n++)
      r = stepSurvival(r, {}, { waves: false, needs: false, combat: false });
    assert.equal(
      r.enemies[0].x === at.x && r.enemies[0].z === at.z,
      mode === 'ambush',
    );
  }
});
test('ambush materialization never occurs within five meters and remains inside the concurrent budget', () => {
  let r = field();
  r.spawns = [
    { id: 7, x: 42, z: 40, at: 0, kind: 'crawler', pursuit: 'ambush' },
  ];
  r = stepSurvival(r, {}, { waves: false, needs: false });
  assert.equal(r.enemies.length, 0);
  assert.equal(r.spawns.length, 1);
  r.player.x = 30;
  for (let n = 0; n < 16; n++)
    r = stepSurvival(r, {}, { waves: false, needs: false });
  assert.equal(r.enemies.length, 1);
  assert.ok(r.enemies.length + r.spawns.length <= enemyLimit(r));
});
test('every killed monster drops deterministic graded brain loot', () => {
  for (const floor of [1, 2, 3]) {
    const r = field();
    r.floor = floor;
    r.equipment = [{ item: { ...ITEMS.phone, uid: 'weapon' }, slot: 0 }];
    r.enemies = [{ ...monster('territorial', 41, 40), hp: 1 }];
    const a = stepSurvival(r, {}, { waves: false, needs: false });
    const b = stepSurvival(
      structuredClone(r),
      {},
      { waves: false, needs: false },
    );
    assert.deepEqual(a, b);
    const loot = a.caches.find((c) => c.item.kind === 'lift-material');
    assert.ok(loot);
    assert.equal(
      loot.contents[0].quality,
      ['low', 'normal', 'fine'][floor - 1],
    );
  }
});
test('collapse lasts before return, leaves one recoverable backpack and retains protected / equipped items', () => {
  let s = createGMCheckpoint('field:expedition');
  s.guidance.seen = ['spirit', 'low', 'needs'];
  s.guidance.active = null;
  s.room.bag = [
    { ...ITEMS.water, uid: 'fallen-water', slot: 0 },
    { ...item('fallen-brain'), stack: ['brain-extra'], slot: 1 },
  ];
  s.room.safe = [{ ...ITEMS.bread, uid: 'safe-bread' }];
  s.room.player.hp = 0;
  s.room.enemies = [];
  s = stepOpening(s);
  assert.equal(s.stage, 'collapse');
  const cache = s.room.caches.find((c) => c.container === 'backpack');
  assert.ok(cache);
  assert.equal(cache.contents.length, 2);
  const restored = readOpeningCheckpoint(JSON.stringify(s));
  assert.ok(restored);
  assert.deepEqual(restored, s);
  for (let n = 0; n < 144; n++) s = stepOpening(s);
  assert.equal(s.stage, 'collapse');
  s = stepOpening(s);
  assert.equal(s.stage, 'home');
  assert.equal(s.room.safe[0].uid, 'safe-bread');
  assert.equal(s.room.bag.length, 0);
  let r = {
    ...s.room,
    status: 'running',
    player: { ...s.room.player, x: cache.x, z: cache.z },
    enemies: [],
    spawns: [],
  };
  for (let n = 0; n < 170; n++)
    r = stepSurvival(r, {}, { needs: false, waves: false, combat: false });
  assert.ok(r.bag.some((i) => i.uid === 'fallen-water'));
  assert.equal(countKind(r.bag, 'lift-material'), 2);
  assert.equal(
    r.caches.filter((c) => c.container === 'backpack' && !c.opened).length,
    0,
  );
});
test('emergency bread and water are granted once, defer atomically for a full bag, and water never auto-consumes', () => {
  let s = createGMCheckpoint('after:depart');
  s.room.player.food = 50;
  s.room.player.water = 30;
  s.guidance.active = null;
  s.guidance.seen = ['low'];
  s.room.bag = Array.from({ length: 16 }, (_, slot) => ({
    ...ITEMS.scrap,
    uid: `full-${slot}`,
    slot,
  }));
  s = stepOpening(s);
  assert.equal(s.guidance.active.id, 'aid');
  assert.ok(!s.guidance.aidGiven);
  assert.equal(s.room.bag.length, 16);
  s = openingAction(s, { type: 'ack-guide' });
  s.room.bag = s.room.bag.slice(0, 14);
  s = stepOpening(s);
  assert.equal(s.guidance.aidGiven, true);
  assert.equal(s.room.bag.length, 16);
  s.room.bag = s.room.bag.filter((i) => !i.uid.startsWith('anbo-emergency'));
  for (let n = 0; n < 10; n++) s = stepOpening(s);
  assert.equal(s.room.bag.length, 14);
  let r = field();
  r.player.water = 10;
  r.bag = [{ ...ITEMS.water, uid: 'water' }];
  r = stepSurvival(r, {}, { needs: false, waves: false });
  assert.equal(r.player.water, 10);
  assert.equal(r.bag.length, 1);
  r = survivalAction(r, { type: 'consume', uid: 'water' });
  assert.equal(r.player.water, 55);
  assert.equal(r.bag.length, 0);
});
test('player thoughts remain player speech while terminal has the previous robot line', () => {
  const s = createGMCheckpoint('after:quiet');
  s.afterlight.tick = 70;
  s.lastRobotLine = '感谢投喂，我现在可以为你开灯了！';
  assert.equal(dialogueCue(s).speaker, 'player');
  assert.match(dialogueCue(s).text, /灯真的亮了/);
  assert.equal(stepOpening(s).lastRobotLine, s.lastRobotLine);
});

test('walls prevent initial detection while low cover still exposes the player', () => {
  for (const height of ['low', 'tall']) {
    const r = field();
    r.world.obstacles = [
      { type: 'container', height, x: 42, z: 40, w: 1, d: 3 },
    ];
    r.enemies = [monster('territorial', 44, 40)];
    const next = stepSurvival(
      r,
      {},
      { waves: false, needs: false, combat: false },
    );
    assert.equal(next.enemies[0].awake, height === 'low');
    if (height === 'tall') assert.equal(next.enemies[0].lastSeen, undefined);
  }
});

test('all enemy archetypes drop brain units and higher monster level cannot downgrade the same seeded roll', () => {
  for (const [kind, quantity] of [
    ['crawler', 1],
    ['runner', 2],
    ['brute', 3],
    ['boss', 6],
  ]) {
    const kill = (level) => {
      const r = field();
      r.floor = 1;
      r.equipment = [{ item: { ...ITEMS.phone, uid: 'kill-test' }, slot: 0 }];
      r.enemies = [{ ...monster('territorial'), kind, level, hp: 1 }];
      const next = stepSurvival(r, {}, { waves: false, needs: false });
      assert.equal(next.kills, 1);
      const drop = next.caches.find((c) => c.item.kind === 'lift-material');
      assert.ok(drop);
      assert.equal(countKind(drop.contents, 'lift-material'), quantity);
      return brainExperience(drop.contents);
    };
    assert.ok(kill(5) >= kill(1));
  }
});
