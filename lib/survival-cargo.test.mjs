import test from 'node:test';
import assert from 'node:assert/strict';
import { cargoLayout, cargoFits, putInBag, packBag } from './survival-cargo.ts';
import {
  ITEMS,
  createSurvival,
  survivalAction,
  stepSurvival,
  searchDuration,
} from './survival-room.ts';
import { revealFog } from './survival-world.ts';
const item = (kind, uid = kind, slot) => ({
  ...ITEMS[kind],
  uid,
  ...(slot === undefined ? {} : { slot }),
});
// Inventory fixtures start after arrival; departure is covered in survival-room.
const start = () => ({ ...createSurvival(), status: 'running' });
const advance = (s, ticks, input = {}) => {
  for (let i = 0; i < ticks; i++) s = stepSurvival(s, input);
  return s;
};
const atCache = (id) => {
  const s = start(),
    cache = s.caches.find((c) => c.id === id);
  s.player = { ...s.player, x: cache.x, z: cache.z };
  s.nextWave = 999999;
  s.fog = revealFog(s.player, s.fog, s.world);
  return s;
};

test('survival cargo: 4x4 footprints reject crossing rows, overlap, invalid origins and over-height rotation', () => {
  const layout = cargoLayout([item('scrap', 'block', 4)]);
  assert.equal(cargoFits(layout, 2, 3), false);
  assert.equal(cargoFits(layout, 2, 0, true), false);
  assert.equal(cargoFits(layout, 3, 9, true), false);
  for (const origin of [-1, 16, 0.5, NaN])
    assert.equal(cargoFits(layout, 1, origin), false);
  assert.equal(cargoFits(layout, 2, 1, true), true);
});

test('survival cargo: a manual move is atomic and does not rearrange its neighbors', () => {
  let s = start();
  s.bag = [item('coil', 'coil', 0), item('water', 'water', 2)];
  const before = structuredClone(s);
  for (const slot of [2, 3, 7])
    assert.equal(
      survivalAction(s, {
        type: 'cargo-move',
        uid: 'coil',
        slot,
        rotated: false,
      }),
      s,
    );
  assert.deepEqual(s, before);
  s = survivalAction(s, {
    type: 'cargo-move',
    uid: 'coil',
    slot: 1,
    rotated: true,
  });
  assert.equal(s.bag.find((i) => i.uid === 'coil').slot, 1);
  assert.equal(s.bag.find((i) => i.uid === 'coil').rotated, true);
  assert.equal(s.bag.find((i) => i.uid === 'water').slot, 2);
  assert.deepEqual(
    cargoLayout(s.bag),
    cargoLayout(JSON.parse(JSON.stringify(s)).bag),
  );
});

test('survival cargo: fragmentation rejects an unequip even when total empty area is sufficient', () => {
  const s = start();
  s.bag = [0, 2, 5, 7, 8, 10, 13, 15].map((slot) => item('scrap', 'block-' + slot, slot));
  const before = structuredClone(s);
  assert.equal(putInBag(s.bag, item('coil')), null);
  assert.equal(survivalAction(s, { type: 'unequip', uid: 'starter-nail' }), s);
  assert.deepEqual(s, before);
});

test('survival cargo: packing uses rotation when necessary, retains identities and never duplicates across zones', () => {
  const bag = packBag([
    item('laser', 'a'),
    item('laser', 'b'),
    item('laser', 'd'),
    item('laser', 'e'),
    item('core', 'c'),
    item('core', 'f'),
  ]);
  assert.ok(bag);
  assert.equal(bag.find((i) => i.uid === 'c').rotated, true);
  assert.deepEqual(packBag(bag), bag);
  let s = start();
  s.bag = [item('coil', 'coil', 4)];
  s = survivalAction(s, { type: 'equip', uid: 'coil', slot: 3 });
  assert.equal(
    s.equipment.find((e) => e.item.uid === 'coil').item.slot,
    undefined,
  );
  s = survivalAction(s, { type: 'unequip', uid: 'coil' });
  assert.equal(s.bag.filter((i) => i.uid === 'coil').length, 1);
  assert.equal(
    s.equipment.some((e) => e.item.uid === 'coil'),
    false,
  );
});

test('survival containers: crate finishes at 3 seconds and grants several items in one atomic step', () => {
  let s = atCache('blade');
  const original = structuredClone(s);
  assert.equal(
    searchDuration(
      s.caches.find((c) => c.id === 'blade'),
      100,
    ),
    90,
  );
  s = advance(s, 89);
  assert.equal(s.bag.length, 0);
  assert.equal(s.caches.find((c) => c.id === 'blade').opened, false);
  s = stepSurvival(s);
  assert.ok(s.equipment.some((e) => e.item.kind === 'blade'));
  assert.deepEqual(
    s.bag.map((i) => i.kind),
    ['scrap', 'food'],
  );
  assert.equal(s.caches.find((c) => c.id === 'blade').contents.length, 0);
  assert.equal(s.caches.find((c) => c.id === 'blade').opened, true);
  assert.equal(
    original.caches.find((c) => c.id === 'blade').contents.length,
    3,
  );
  assert.equal(advance(s, 90).bag.length, 2);
});

test('survival containers: lockers take longer, interrupted search resets, low energy slows it', () => {
  let s = atCache('water-entry');
  const c = s.caches.find((c) => c.id === 'water-entry');
  assert.equal(searchDuration(c, 100), 150);
  assert.equal(searchDuration(c, 10), 255);
  s = advance(s, 100);
  s = stepSurvival(s, { x: 1 });
  assert.equal(s.searchTicks, 0);
  s = advance(s, 149);
  assert.equal(s.bag.length, 0);
  s = stepSurvival(s);
  assert.equal(s.bag.length, 3);
});

test('survival containers: partial loot survives moving away and serialized resumption without reroll or duplication', () => {
  let s = atCache('water-entry');
  s.bag = Array.from({ length: 15 }, (_, i) => item('scrap', 'filler-' + i));
  const expected = s.caches
    .find((c) => c.id === 'water-entry')
    .contents.map((i) => i.uid);
  s = advance(s, 150);
  assert.equal(s.caches.find((c) => c.id === 'water-entry').contents.length, 2);
  s = stepSurvival(s, { x: 1 });
  s = JSON.parse(JSON.stringify(s));
  s = survivalAction(s, { type: 'protect', uid: 'filler-0' });
  s = survivalAction(s, { type: 'discard', uid: 'filler-1' });
  s = stepSurvival(s);
  assert.equal(s.caches.find((c) => c.id === 'water-entry').opened, true);
  for (const uid of expected)
    assert.equal(s.bag.filter((i) => i.uid === uid).length, 1);
  assert.equal(s.caches.find((c) => c.id === 'water-entry').contents.length, 0);
});
