import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateDuel } from './demo-combat.ts';
import {
  act,
  newRun,
  makeItem,
  migrateCargo,
  itemCount,
  refineIngredient,
  currentFloor,
} from './demo-engine.ts';
import { rarityOf, growthCost } from './demo-card-rules.ts';
const card = (uid, id, at, quality = 0, level = 0) => ({
  uid,
  id,
  at,
  quality,
  level,
  rarity: rarityOf(id),
});
const duel = (player, enemy = [], extra = {}) => ({
  player,
  enemy,
  maxHp: [1000, 1000],
  barrierHp: [
    [20, 20, 20],
    [20, 20, 20],
  ],
  weather: 0,
  layout: 0,
  name: 'test',
  kind: 'guardian',
  botId: null,
  ...extra,
});
const start = () => act(newRun(71), { type: 'begin' });
test('barriers absorb only their lane; breaking hit spills to host; cards are never damage targets', () => {
  const d = duel([card('p', 'knife', 0)], [card('e', 'wire', 0)]),
    before = structuredClone(d),
    r = simulateDuel(d);
  const hits = r.frames
    .flatMap((f) => f.hits)
    .filter((h) => h.sourceUid === 'p' && h.kind === 'damage');
  assert.equal(hits[0].barrierAbsorbed, 12);
  assert.equal(hits[0].healthLoss, 0);
  assert.equal(hits[1].barrierAbsorbed, 8);
  assert.equal(hits[1].healthLoss, 4);
  assert.equal(hits[2].targetUid, 'host-1-lane-0');
  assert.ok(
    r.frames.every(
      (f) => f.barriers[1][1].hp === 20 && f.barriers[1][2].hp === 20,
    ),
  );
  assert.ok(
    r.frames
      .flatMap((f) => f.hits)
      .filter((h) => h.kind === 'damage')
      .every((h) => !['p', 'e'].includes(h.targetUid)),
  );
  const broken = r.frames.findIndex((f) => f.barriers[1][0].broken);
  assert.ok(r.frames.slice(broken + 1).some((f) => f.fired.includes('e')));
  assert.ok(r.frames.slice(broken).every((f) => f.barriers[1][0].hp === 0));
  assert.deepEqual(d, before);
  assert.deepEqual(simulateDuel(d), r);
});
test('repair redirects after lane destruction and cannot rebuild or exceed maximum', () => {
  const r = simulateDuel(
    duel([card('p', 'brick', 0, 2, 5)], [card('repair', 'shelter', 0)], {
      barrierHp: [
        [20, 20, 20],
        [10, 20, 20],
      ],
    }),
  );
  const at = r.frames.findIndex((f) => f.barriers[1][0].broken);
  assert.ok(at >= 0);
  assert.ok(r.frames.slice(at).every((f) => f.barriers[1][0].hp === 0));
  assert.ok(r.frames.slice(at).some((f) => f.fired.includes('repair')));
  assert.ok(
    r.frames
      .flatMap((f) => f.hits)
      .some(
        (h) =>
          h.sourceUid === 'repair' && h.kind === 'shield' && h.targetLane !== 0,
      ),
  );
  assert.ok(
    r.frames.every((f) =>
      f.barriers.flat().every((b) => b.hp >= 0 && b.hp <= b.maxHp),
    ),
  );
});
test('coil supports another weak lane; upgraded bell charges across all three lanes', () => {
  const d = duel(
    [
      card('cell', 'cell', 0),
      card('coil', 'coil', 1),
      card('bell', 'bell', 3, 1),
      card('knife', 'knife', 6),
    ],
    [],
    {
      barrierHp: [
        [100, 100, 100],
        [80, 50, 10],
      ],
    },
  );
  const hits = simulateDuel(d).frames.flatMap((f) => f.hits);
  assert.equal(
    hits.find((h) => h.sourceUid === 'coil' && h.kind === 'damage').targetLane,
    2,
  );
  assert.ok(hits.some((h) => h.sourceUid === 'bell' && h.targetUid === 'cell'));
  assert.ok(
    hits.some((h) => h.sourceUid === 'bell' && h.targetUid === 'knife'),
  );
});
test('timeout is a draw regardless of remaining host health and no collapse exists', () => {
  const d = duel([], [], { maxHp: [10, 1000] }),
    r = simulateDuel(d);
  assert.equal(r.winner, -1);
  assert.equal(r.duration, 90);
  assert.equal(r.timedOut, true);
  assert.deepEqual(r.frames.at(-1).hp, d.maxHp);
  assert.ok(r.frames.every((f) => !f.hits.length));
});
test('rarity is fixed across identification and old saves; old quality and levels survive', () => {
  const s = start(),
    original = s.items.find((x) => x.type === 'card');
  original.rarity = 4;
  original.level = 3;
  original.quality = 2;
  const n = migrateCargo(s),
    migrated = n.items.find((x) => x.uid === original.uid);
  assert.equal(migrated.rarity, rarityOf(migrated.id));
  assert.equal(migrated.level, 3);
  assert.equal(migrated.quality, 2);
  assert.deepEqual(migrateCargo(n), n);
  for (const id of ['knife', 'shelter', 'coil', 'battery']) {
    let a = start();
    a.items.push(makeItem('raw', id, 'physical', 'warehouse'));
    a = act(a, { type: 'scan', id: 'raw' });
    assert.equal(a.items.find((x) => x.uid === 'raw').rarity, rarityOf(id));
  }
});
test('growth spends physical scrap; refinement consumes a matching unequipped card atomically', () => {
  let s = start();
  s.level = 2;
  const gold = s.material,
    old = itemCount(s, 'scrap', false);
  s = act(s, { type: 'grow', id: 'starter-knife' });
  assert.equal(s.material, gold);
  assert.equal(itemCount(s, 'scrap', false), old - growthCost(0));
  const before = structuredClone(s);
  assert.throws(() => act(s, { type: 'refine', id: 'starter-knife' }));
  assert.deepEqual(s, before);
  s.items.push(makeItem('duplicate', 'knife', 'card', 'warehouse'));
  s = act(s, { type: 'refine', id: 'starter-knife' });
  const knife = s.items.find((x) => x.uid === 'starter-knife');
  assert.equal(knife.quality, 1);
  assert.equal(knife.level, 1);
  assert.equal(knife.rarity, 0);
  assert.ok(!s.items.some((x) => x.uid === 'duplicate'));
  s.items.push(makeItem('wrong-tier', 'knife', 'card', 'warehouse'));
  assert.equal(refineIngredient(s, knife), undefined);
});
test('ordinary draws advance without life loss; boss and survivor draws return without rewards', () => {
  for (const [stage, kind] of [
    ['normal', 'guardian'],
    ['boss', 'guardian'],
    ['normal', 'survivor'],
  ]) {
    let s = act(start(), { type: 'enter', floor: 1 });
    s.node = currentFloor(s).nodes.indexOf(
      stage === 'boss' ? 'guardian' : 'patrol',
    );
    s.phase = 'combat';
    s.duel = duel([], [], { stage, kind });
    const node = s.node,
      life = s.quota,
      ids = s.items.map((x) => x.uid),
      gold = s.material;
    s = act(s, { type: 'resolve' });
    assert.equal(s.quota, life);
    assert.equal(s.material, gold);
    assert.deepEqual(
      s.items.map((x) => x.uid),
      ids,
    );
    assert.equal(s.best, 0);
    if (stage === 'normal' && kind === 'guardian') {
      assert.equal(s.phase, 'floor');
      assert.equal(s.node, node + 1);
    } else assert.equal(s.phase, 'base');
  }
});
