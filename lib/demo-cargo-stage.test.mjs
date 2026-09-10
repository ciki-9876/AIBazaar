import test from 'node:test';
import assert from 'node:assert/strict';
import { layout, cells } from './cargo-layout.ts';
import {
  act,
  newRun,
  validSave,
  currentFloor,
  merchantOffers,
} from './demo-engine.ts';
import { describeCard } from './card-description.ts';
import { floorRoute } from './demo-content.ts';
const start = () => act(newRun(51), { type: 'begin' });
test('cargo: horizontal dimensions ignore legacy orientation, overlaps and boundary crossings reject', () => {
  assert.deepEqual(
    cells({ uid: 'x', volume: 3, rotated: true }, 1, 4, 12),
    [1, 2, 3],
  );
  assert.equal(cells({ uid: 'x', volume: 3 }, 3, 4, 12), null);
  assert.throws(() =>
    layout(
      [
        { uid: 'a', volume: 2, slot: 0 },
        { uid: 'b', volume: 1, slot: 1 },
      ],
      4,
      12,
    ),
  );
  const original = [
    { uid: 'a', volume: 3 },
    { uid: 'b', volume: 2 },
  ];
  assert.equal(layout(original, 4, 12).length, 2);
  assert.equal(original[0].slot, undefined);
});
test('cargo: rejected pickup or purchase preserves inventory, stock and gold; horizontal placement survives save', () => {
  let s = start();
  s.items = s.items.filter((x) => x.zone === 'board');
  s = act(s, {
    type: 'move',
    id: 'starter-shelter',
    to: 'bag',
    slot: 0,
    rotated: false,
  });
  assert.equal(s.items.find((x) => x.uid === 'starter-shelter').rotated, false);
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  s = act(s, { type: 'enter', floor: 1 });
  s.node = currentFloor(s).nodes.indexOf('search');
  s = act(s, { type: 'search' });
  const item = currentFloor(s).stock.find((x) => x.type === 'physical');
  const snapshot = structuredClone(s);
  assert.throws(() => act(s, { type: 'pickup', id: item.uid, slot: 0 }));
  assert.deepEqual(s, snapshot);
  s.node = currentFloor(s).nodes.indexOf('merchant');
  s.interaction = 'trade';
  const offer = merchantOffers(s)[0];
  const before = structuredClone(s);
  assert.throws(() => act(s, { type: 'trade', id: offer.uid, slot: 0 }));
  assert.deepEqual(s, before);
});
test('cargo: legacy slots are assigned without mutating validation and cross-container placement is atomic', () => {
  const s = start();
  for (const x of s.items) {
    delete x.slot;
    delete x.rotated;
  }
  const before = structuredClone(s);
  assert.ok(validSave(s));
  assert.deepEqual(s, before);
  const next = act(s, { type: 'move', id: 'apple', to: 'safe', slot: 0 });
  assert.equal(next.items.find((x) => x.uid === 'apple').slot, 0);
  assert.throws(() =>
    act(next, { type: 'move', id: 'lighter', to: 'safe', slot: 0 }),
  );
});
test('cards: roles, innate and weather sections describe actual card abilities without base targeting rules', () => {
  for (const id of [
    'knife',
    'wire',
    'bottle',
    'shelter',
    'bell',
    'brick',
    'box',
    'cell',
    'coil',
    'battery',
  ]) {
    const d = describeCard({
      id,
      uid: id,
      at: 0,
      quality: 1,
      rarity: 0,
      level: 0,
    });
    assert.ok(d.role);
    assert.ok(d.effects.length);
    assert.ok(d.cd > 0);
    assert.ok(!JSON.stringify(d).includes('同路为空'));
    assert.ok(!JSON.stringify(d).includes('默认攻击'));
  }
  assert.equal(
    describeCard({
      id: 'wire',
      uid: 'w',
      at: 0,
      quality: 1,
      rarity: 0,
      level: 0,
    }).weather[0].name,
    '潮湿',
  );
});
test('floors: 9–11 nodes include normal, elite, boss in that order; new branches occur', () => {
  const routes = Array.from({ length: 50 }, (_, seed) => floorRoute(seed, 1));
  for (const route of routes) {
    assert.ok(route.length >= 9 && route.length <= 11);
    assert.ok(route.indexOf('patrol') < route.indexOf('elite'));
    assert.ok(route.indexOf('elite') < route.indexOf('guardian'));
    assert.equal(route.at(-1), 'guardian');
  }
  assert.ok(routes.some((r) => r.includes('cache')));
  assert.ok(routes.some((r) => r.includes('bargain')));
});
test('defeat: normal and elite lose stamina only; boss loses life and ordinary inventory', () => {
  for (const node of ['patrol', 'elite', 'guardian']) {
    let s = act(start(), { type: 'enter', floor: 10 });
    s.node = currentFloor(s).nodes.indexOf(node);
    s.encounter = null;
    s = act(s, { type: 'fight' });
    s.duel.maxHp = [1, 10000];
    const life = s.quota,
      stamina = s.stamina,
      bag = s.items.filter((x) => x.zone === 'bag');
    const result = act(s, { type: 'resolve' });
    assert.equal(result.phase, 'base');
    assert.equal(result.best, 0);
    assert.equal(result.floor, 0);
    if (node === 'guardian') {
      assert.ok(result.quota < life);
      assert.equal(result.items.filter((x) => x.zone === 'bag').length, 0);
    } else {
      assert.equal(result.quota, life);
      assert.equal(result.stamina, Math.max(0, stamina - 35));
      assert.deepEqual(
        result.items.filter((x) => x.zone === 'bag'),
        bag,
      );
    }
    assert.ok(validSave(result));
  }
});
test('skirmish rewards pay once per floor and do not mark the boss cleared', () => {
  let s = act(start(), { type: 'enter', floor: 1 });
  s.encounter = null;
  s.node = currentFloor(s).nodes.indexOf('patrol');
  const fight = () => {
    s = act(s, { type: 'fight' });
    s.duel.maxHp = [10000, 1];
    s = act(s, { type: 'resolve' });
  };
  const gold = s.material;
  fight();
  assert.equal(s.material, gold + 1);
  assert.equal(s.objective, false);
  s.node = currentFloor(s).nodes.indexOf('patrol');
  fight();
  assert.equal(s.material, gold + 1);
});
