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
  const d = duel([card('p', 'gapblade', 0)], [card('e', 'gapblade', 0)], {
      barrierHp: [
        [15, 15, 15],
        [15, 15, 15],
      ],
    }),
    before = structuredClone(d),
    r = simulateDuel(d);
  const hits = r.frames
    .flatMap((f) => f.hits)
    .filter((h) => h.sourceUid === 'p' && h.kind === 'damage');
  assert.equal(hits[0].barrierAbsorbed, 10);
  assert.equal(hits[0].healthLoss, 0);
  assert.equal(hits[1].barrierAbsorbed, 5);
  assert.equal(hits[1].healthLoss, 5);
  assert.equal(hits[2].targetUid, 'host-1-lane-0');
  assert.ok(
    r.frames.every(
      (f) => f.barriers[1][1].hp === 15 && f.barriers[1][2].hp === 15,
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
    duel([card('p', 'springbow', 0, 2, 5)], [card('repair', 'sealant', 0)], {
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
test('charge selects the leftmost other card on the same lane and never crosses lanes', () => {
  const r = simulateDuel(
    duel([
      card('support', 'fuse', 2, 1),
      card('left', 'gapblade', 0),
      card('right', 'gapblade', 1),
      card('other-lane', 'gapblade', 3),
    ]),
  );
  const charges = r.frames
    .flatMap((f) => f.hits)
    .filter((h) => h.kind === 'charge');
  assert.ok(charges.length);
  assert.ok(charges.every((h) => h.targetUid === 'left'));
  assert.ok(charges.some((h) => h.value > 0));
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
test('rarity is preserved across old saves and identification is deterministic; old quality and levels survive', () => {
  const s = start(),
    original = s.items.find((x) => x.type === 'card');
  original.rarity = 4;
  original.level = 3;
  original.quality = 2;
  const n = migrateCargo(s),
    migrated = n.items.find((x) => x.uid === original.uid);
  assert.equal(migrated.rarity, 4);
  assert.equal(migrated.level, 3);
  assert.equal(migrated.quality, 2);
  assert.deepEqual(migrateCargo(n), n);
  for (const id of ['gapblade', 'recoil', 'culture', 'recoil']) {
    let a = start();
    a = act(a, { type: 'buy-scanner' });
    a.items.push(makeItem('raw', id, 'physical', 'warehouse'));
    a = act(a, { type: 'scan', id: 'raw' });
    const saved = migrateCargo(a);
    assert.equal(
      saved.items.find((x) => x.uid === 'raw').rarity,
      a.items.find((x) => x.uid === 'raw').rarity,
    );
  }
});
test('growth spends physical scrap; refinement consumes a matching unequipped card atomically', () => {
  let s = start();
  s.level = 2;
  const gold = s.material,
    old = itemCount(s, 'scrap', false);
  s = act(s, { type: 'grow', id: 'starter-gapblade' });
  assert.equal(s.material, gold);
  assert.equal(itemCount(s, 'scrap', false), old - growthCost(0));
  const before = structuredClone(s);
  assert.throws(() => act(s, { type: 'refine', id: 'starter-gapblade' }));
  assert.deepEqual(s, before);
  s.items.push(makeItem('duplicate', 'gapblade', 'card', 'warehouse'));
  s = act(s, { type: 'refine', id: 'starter-gapblade' });
  const knife = s.items.find((x) => x.uid === 'starter-gapblade');
  assert.equal(knife.quality, 1);
  assert.equal(knife.level, 1);
  assert.equal(knife.rarity, 0);
  assert.ok(!s.items.some((x) => x.uid === 'duplicate'));
  s.items.push(makeItem('wrong-tier', 'gapblade', 'card', 'warehouse'));
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
