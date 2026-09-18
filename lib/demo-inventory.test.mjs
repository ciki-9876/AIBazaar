import test from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  newRun,
  makeItem,
  autoBoardPosition,
  bagCap,
} from './demo-engine.ts';
const start = () => act(newRun(515), { type: 'begin' });

test('automatic equip finds contiguous unlocked cells in a single lane', () => {
  let s = start();
  s.items = s.items.filter((x) => x.zone !== 'board');
  const card = makeItem('wide', 'recoil', 'card', 'warehouse');
  card.rarity = 0;
  s.items.push(card);
  assert.equal(autoBoardPosition(s, card), 3);
  s = act(s, { type: 'equip', id: card.uid });
  assert.equal(s.items.find((x) => x.uid === card.uid).at, 3);
  s = act(s, { type: 'unequip', id: card.uid });
  assert.equal(s.items.find((x) => x.uid === card.uid).zone, 'bag');
  s = act(s, { type: 'equip', id: card.uid });
  assert.equal(s.items.find((x) => x.uid === card.uid).at, 3);
});

test('failed automatic equip and full-bag unequip leave the original inventory intact', () => {
  const s = start();
  const card = makeItem('extra', 'recoil', 'card', 'warehouse');
  card.rarity = 0;
  s.items.push(card);
  const before = structuredClone(s);
  assert.throws(() => act(s, { type: 'equip', id: card.uid }));
  assert.deepEqual(s, before);
  s.items = s.items.filter((x) => x.zone !== 'bag');
  for (let i = 0; i < bagCap(s); i++)
    s.items.push(makeItem('fill-' + i, 'gapblade', 'physical', 'bag'));
  const full = structuredClone(s);
  const boardCard = s.items.find((x) => x.zone === 'board');
  assert.throws(() => act(s, { type: 'unequip', id: boardCard.uid }));
  assert.deepEqual(s, full);
});

test('identification preserves item identity and source and cannot reroll a completed card', () => {
  for (const zone of ['bag', 'safe', 'warehouse']) {
    let s = start();
    s.items = s.items.filter((x) => x.zone !== zone);
    s.items.push(makeItem('scan-once', 'gapblade', 'physical', zone));
    s = act(s, { type: 'scan', id: 'scan-once' });
    const card = s.items.find((x) => x.uid === 'scan-once');
    assert.equal(card.zone, zone);
    assert.equal(card.type, 'card');
    assert.throws(() => act(s, { type: 'scan', id: card.uid }));
    assert.deepEqual(
      JSON.parse(JSON.stringify(s)).items.find((x) => x.uid === card.uid),
      card,
    );
  }
});
