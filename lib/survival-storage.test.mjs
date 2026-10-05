import test from 'node:test';
import assert from 'node:assert/strict';
import { createGMCheckpoint } from './survival-gm.ts';
import {
  createOpening,
  openingAction,
  stepOpening,
} from './survival-opening.ts';
import { ITEMS, survivalAction } from './survival-room.ts';
import { cargoFits, putInBag, warehouseRows } from './survival-cargo.ts';
import { transferItem, firstTransferTarget } from './survival-transfer.ts';
import { feedLift, liftFed } from './survival-lift-feed.ts';
import { itemIds, itemCount } from './survival-stacks.ts';
import {
  readOpeningCheckpoint,
  serializeOpeningCheckpoint,
} from './survival-checkpoint.ts';
import { encodeSave } from '../packages/core/save-envelope.ts';
import { settlementCards } from './survival-settlement.ts';
import { revealFog, visionRange, cellKey } from './survival-world.ts';

const item = (uid, kind = 'lift-material', quality = 'normal') => ({
  ...ITEMS[kind],
  uid,
  ...(kind === 'lift-material' ? { quality } : {}),
});
const home = () => createGMCheckpoint('race:terminal');
test('warehouse starts at 4×6 and gains a complete row per elevator level', () => {
  assert.equal(warehouseRows(), 6);
  assert.equal(warehouseRows(5), 10);
  const layout = Array.from({ length: 24 }, (_, i) => ({
    item: item(`w-${i}`, 'water'),
    slot: i,
    rotated: false,
  }));
  assert.equal(cargoFits(layout, 1, 24, false, '', 6), false);
  assert.equal(cargoFits(layout, 1, 24, false, '', 7), true);
  assert.equal(
    putInBag(
      layout.map((p) => ({ ...p.item, slot: p.slot })),
      item('extra', 'water'),
      undefined,
      false,
      6,
    ),
    null,
  );
});
test('warehouse transfers and swaps validate both footprints and preserve stable identities', () => {
  const s = home().room;
  s.bag = [{ ...item('a', 'laser'), slot: 0 }];
  s.warehouse = [{ ...item('b', 'water'), slot: 0 }];
  const n = transferItem(s, {
    type: 'transfer',
    uid: 'a',
    zone: 'warehouse',
    slot: 0,
  });
  assert.deepEqual(
    n.bag.map((i) => i.uid),
    ['b'],
  );
  assert.deepEqual(
    n.warehouse.map((i) => i.uid),
    ['a'],
  );
  const invalid = transferItem(n, {
    type: 'transfer',
    uid: 'a',
    zone: 'bag',
    slot: 3,
  });
  assert.equal(invalid, n);
  assert.deepEqual(
    s.bag.map((i) => i.uid),
    ['a'],
  );
});
test('a full warehouse can merge a same-quality stack; over-capacity drops stay atomic', () => {
  const s = home().room,
    rows = warehouseRows(s.liftLevel);
  s.warehouse = Array.from({ length: rows * 4 }, (_, n) => ({
    ...item(`s${n}`, n ? 'water' : 'lift-material'),
    slot: n,
  }));
  s.bag = [item('brain')];
  const target = firstTransferTarget(s, s.bag[0], 'warehouse');
  assert.equal(target.slot, 0);
  const n = transferItem(s, target);
  assert.deepEqual(itemIds(n.warehouse[0]), ['s0', 'brain']);
  n.bag = [item('other', 'water')];
  assert.equal(firstTransferTarget(n, n.bag[0], 'warehouse'), null);
  assert.equal(
    transferItem(n, {
      type: 'transfer',
      uid: 'other',
      zone: 'warehouse',
      slot: rows * 4,
    }),
    n,
  );
});
test('feeding is incremental, consumes only the deficit and keeps unused stack units', () => {
  let r = home().room;
  r.liftLevel = 1;
  r.liftExperience = 0;
  r.liftParts = 0;
  r.bag = [
    { ...item('brain'), stack: ['b2', 'b3', 'b4', 'b5'] },
    item('part', 'scrap'),
  ];
  r = feedLift(r, 'part');
  assert.equal(r.liftParts, 1);
  assert.equal(liftFed(r), false);
  r = feedLift(r, 'brain');
  assert.equal(r.liftExperience, 30);
  assert.deepEqual(itemIds(r.bag[0]), ['b3', 'b4', 'b5']);
  assert.equal(feedLift(r, 'b3'), r);
  assert.equal(feedLift(r, 'missing'), r);
});
test('feeding from the warehouse finishes the recipe once, expands storage and retains excess XP', () => {
  let s = home();
  s.room.liftExperience = 0;
  s.room.liftParts = 1;
  s.room.bag = [];
  s.room.warehouse = [
    item('premium', 'lift-material', 'supreme'),
    item('last-part', 'scrap'),
  ];
  s = openingAction(s, { type: 'feed-lift', uid: 'premium' });
  assert.equal(s.room.liftLevel, 2);
  assert.equal(s.room.liftExperience, 100);
  s = openingAction(s, { type: 'feed-lift', uid: 'last-part' });
  assert.equal(s.room.liftLevel, 3);
  assert.equal(s.room.liftExperience, 60);
  assert.equal(s.room.liftParts, 0);
  assert.deepEqual(s.room.warehouse, []);
  assert.equal(openingAction(s, { type: 'feed-lift', uid: 'last-part' }), s);
});
test('storage and partial contributions survive serialization and one-way floor travel', () => {
  let s = home();
  s.room.warehouse = [item('keep', 'water')];
  s.room.bag.push(item('donate', 'lift-material', 'low'));
  s.room.liftExperience = 0;
  s = openingAction(s, { type: 'feed-lift', uid: 'donate' });
  const copy = readOpeningCheckpoint(serializeOpeningCheckpoint(s));
  assert.deepEqual(copy, s);
  s = openingAction(openingAction(copy, { type: 'open-door' }), {
    type: 'choose-floor',
    floor: 6,
  });
  assert.equal(s.room.floor, 6);
  assert.equal(s.room.liftExperience, 5);
  assert.equal(s.room.warehouse[0].uid, 'keep');
});
test('legacy v6/v7 saves migrate to the storage envelope, while duplicate storage UIDs are rejected', () => {
  for (const s of [createOpening(), home()]) {
    delete s.room.warehouse;
    delete s.room.liftParts;
    const version = s.race ? 'f9-survival/7' : 'f9-survival/6';
    const copy = readOpeningCheckpoint(encodeSave('elevator', version, s));
    assert.ok(copy);
    assert.equal(
      JSON.parse(serializeOpeningCheckpoint(copy)).rulesVersion,
      'f9-survival/8',
    );
  }
  const s = home();
  s.room.warehouse = [{ ...s.room.equipment[0].item }];
  assert.equal(readOpeningCheckpoint(serializeOpeningCheckpoint(s)), null);
  assert.equal(
    readOpeningCheckpoint(encodeSave('elevator', 'f9-survival/99', home())),
    null,
  );
});
test('warehouse is inaccessible outdoors and rescue does not discard stored goods or paid progress', () => {
  let s = createGMCheckpoint('field:expedition');
  s.guidance.active = null;
  s.room.warehouse = [item('kept', 'water')];
  s.room.liftParts = 1;
  s.room.liftExperience = 15;
  const a = {
    type: 'inventory',
    action: { type: 'transfer', uid: 'kept', zone: 'bag', slot: 0 },
  };
  assert.equal(openingAction(s, a), s);
  assert.equal(openingAction(s, { type: 'feed-lift', uid: 'kept' }), s);
  s.room.player.hp = 0;
  for (let n = 0; n < 200 && s.stage !== 'home'; n++) {
    if (s.guidance.active) s = openingAction(s, { type: 'ack-guide' });
    s = stepOpening(s);
  }
  assert.equal(s.stage, 'home');
  assert.equal(s.room.warehouse[0].uid, 'kept');
  assert.equal(s.room.liftParts, 1);
  assert.equal(s.room.liftExperience, 15);
});
test('destroy removes the complete stack forever, never creates a recoverable cache', () => {
  const r = home().room;
  r.bag = [{ ...item('gone'), stack: ['g2', 'g3'] }];
  const n = survivalAction(r, { type: 'destroy', uid: 'gone' });
  assert.deepEqual(n.bag, []);
  assert.equal(n.caches.length, r.caches.length);
  assert.equal(survivalAction(n, { type: 'destroy', uid: 'gone' }), n);
  assert.equal(itemCount(r.bag[0]), 3);
});
test('receipts group same-quality stackable units, keeping distinct outcomes and non-stackable gear', () => {
  const receipt = [
    { ...item('a'), location: '带回' },
    { ...item('b'), stack: ['c'], location: '带回' },
    { ...item('d', 'lift-material', 'fine'), location: '带回' },
    { ...item('e'), location: '安全容器' },
    { ...item('f', 'water'), location: '带回' },
    { ...item('g', 'water'), location: '带回' },
  ];
  const cards = settlementCards(receipt);
  assert.deepEqual(
    cards.map((c) => c.count),
    [3, 1, 1, 1, 1],
  );
  assert.deepEqual(cards[0].ids, ['a', 'b', 'c']);
  assert.equal(receipt.length, 6);
});
test('flashlight still expands visible terrain by two metres on every playable theme, but never through walls', () => {
  for (const id of ['field:expedition', 'guide:garden-court', 'race:passes']) {
    const r = createGMCheckpoint(id).room;
    r.player = { ...r.player, x: 48, z: 40 };
    r.world.obstacles = [];
    r.equipment = [];
    const empty = {
      explored: Array(96 * 80).fill(0),
      visible: Array(96 * 80).fill(0),
    };
    const base = visionRange(r);
    r.equipment = [{ item: item('light', 'flashlight'), slot: 0 }];
    assert.equal(visionRange(r), base + 2);
    const point = { x: 48, z: 40 - base - 1 };
    const dark = revealFog(r.player, empty, r.world, base),
      lit = revealFog(r.player, empty, r.world, visionRange(r));
    assert.equal(dark.visible[cellKey(point)], 0);
    assert.equal(lit.visible[cellKey(point)], 1);
    r.world.obstacles = [{ x: 48, z: 38, w: 5, d: 1, type: 'wall' }];
    assert.equal(
      revealFog(r.player, empty, r.world, visionRange(r)).visible[
        cellKey(point)
      ],
      0,
    );
  }
});
