import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBase, reduceBase, canPlace, footprint } from './base-state.ts';

test('facility placement respects same-wall footprints and expansion', () => {
  const s = initialBase();
  assert.ok(canPlace(s, 'workshop', 5));
  assert.equal(canPlace(s, 'storage', 5), null);
  const expanded = reduceBase(s, { type: 'expand' });
  assert.equal(expanded.stock.scrap, 16);
  assert.deepEqual(footprint('workshop', 5, true), [5, 7]);
  assert.equal(canPlace(expanded, 'workshop', 5), null);
  const built = reduceBase(expanded, {
    type: 'build',
    kind: 'workshop',
    slot: 5,
  });
  assert.equal(built.stock.scrap, 10);
  assert.ok(canPlace(built, 'storage', 7));
  assert.equal(s.stock.scrap, 24);
});
test('daily production cannot be repeated or reset by rebuilding', () => {
  let s = reduceBase(initialBase(), { type: 'use', id: 1 });
  assert.equal(s.stock.power, 20);
  assert.equal(s.stock.fuel, 2);
  const again = reduceBase(s, { type: 'use', id: 1 });
  assert.deepEqual(again.stock, s.stock);
  s = reduceBase(s, { type: 'demolish', id: 1 });
  s = reduceBase(s, { type: 'build', kind: 'generator', slot: 0 });
  assert.equal(s.modules.find((m) => m.kind === 'generator').used, true);
  s = reduceBase(s, { type: 'sleep' });
  assert.equal(s.day, 2);
  assert.equal(s.stock.quota, 11);
  assert.equal(s.stock.supply, 4);
  assert.equal(s.stock.stamina, 100);
  assert.equal(
    s.modules.every((m) => !m.used),
    true,
  );
});
test('insufficient resources reject production without partial deductions', () => {
  const s = initialBase();
  s.stock.power = 2;
  const next = reduceBase(s, { type: 'use', id: 3 });
  assert.deepEqual(next.stock, s.stock);
  assert.equal(next.modules[2].used, false);
});
test('appearance upgrades cap at three and preserve recipe output', () => {
  let s = initialBase();
  s = reduceBase(s, { type: 'upgrade', id: 1 });
  s = reduceBase(s, { type: 'upgrade', id: 1 });
  assert.equal(s.modules[0].level, 3);
  assert.equal(s.stock.scrap, 12);
  assert.equal(reduceBase(s, { type: 'upgrade', id: 1 }).stock.scrap, 12);
  s = reduceBase(s, { type: 'use', id: 1 });
  assert.equal(s.stock.power, 20);
});
