import test from 'node:test';
import assert from 'node:assert/strict';
import {
  armorOf,
  armorDamage,
  selectTarget,
  simulateDuel,
} from './demo-combat.ts';
const card = (uid, id, at, level = 0, quality = 0, rarity = 0) => ({
  uid,
  id,
  at,
  level,
  quality,
  rarity,
});
const duel = (player, enemy) => ({
  player,
  enemy,
  maxHp: [1000, 1000],
  weather: 2,
  layout: 0,
  name: '测试',
  kind: 'guardian',
  botId: null,
});
test('combat revision: default attacks choose same-lane front, ignoring rear positions and other lanes', () => {
  const attacker = card('p', 'knife', 2),
    front = card('f', 'shelter', 0),
    back = card('b', 'bottle', 2),
    other = card('o', 'wire', 3);
  assert.equal(selectTarget(attacker, [back, other, front]).uid, 'f');
  assert.equal(selectTarget(attacker, [other]), null);
  assert.equal(selectTarget(attacker, [back]).uid, 'b');
});
test('combat revision: damage after armor reduces card health without consuming host shield', () => {
  const p = card('p', 'knife', 0),
    e = card('e', 'shelter', 0);
  const d = duel([p], [e]),
    copy = structuredClone(d),
    r = simulateDuel(d);
  const hit = r.frames.flatMap((f) => f.hits).find((h) => h.targetUid === 'e');
  assert.equal(hit.raw, 12);
  assert.equal(hit.armor, 45);
  assert.equal(hit.value, armorDamage(12, 45));
  assert.equal(hit.cardHealthLoss, hit.value);
  assert.equal(hit.shieldAbsorbed, undefined);
  assert.ok(
    r.frames
      .filter((f) => f.time > 20)
      .some((f) => f.hits.some((h) => h.targetUid === 'e')),
  );
  assert.deepEqual(d, copy);
  assert.equal('hp' in e, false);
});
test('combat revision: empty lanes bypass all other-lane armor, while authored special attacks select another lane rear', () => {
  const front = card('f', 'brick', 3),
    rear = card('r', 'bottle', 5),
    same = card('s', 'shelter', 0);
  assert.equal(
    selectTarget(card('p', 'coil', 0), [front, rear, same]).uid,
    'r',
  );
  assert.equal(selectTarget(card('p', 'coil', 0), [same]).uid, 's');
  const r = simulateDuel(duel([card('p', 'knife', 0)], [front]));
  const hit = r.frames
    .flatMap((f) => f.hits)
    .find((h) => h.source === '水果刀');
  assert.equal(hit.targetName, '空路宿主');
  assert.equal(hit.armor, 0);
  assert.equal(hit.value, 12);
});
test('combat revision: front position and individual armor growth alter transmitted damage before removing card health', () => {
  assert.equal(armorOf(card('a', 'shelter', 0, 3, 2)), 61);
  assert.equal(armorDamage(100, 100), 50);
  assert.ok(armorDamage(100, 10000) > 0);
  const a = simulateDuel(
    duel(
      [card('p', 'knife', 0)],
      [card('b', 'bottle', 0), card('s', 'shelter', 1)],
    ),
  );
  const b = simulateDuel(
    duel(
      [card('p', 'knife', 0)],
      [card('s', 'shelter', 0), card('b', 'bottle', 2)],
    ),
  );
  const first = (r) =>
    r.frames.flatMap((f) => f.hits).find((h) => h.source === '水果刀').value;
  assert.ok(first(b) < first(a));
});
test('combat revision: miracle echo uses the same target and armor without recursive echoes', () => {
  const r = simulateDuel(
    duel([card('p', 'knife', 0, 0, 0, 4)], [card('s', 'shelter', 0)]),
  );
  const hits = r.frames
    .filter((f) => f.time < 40)
    .flatMap((f) => f.hits)
    .filter((h) => h.source === '水果刀');
  const echo = hits.find((h) => h.raw === 14.5);
  assert.ok(echo);
  assert.equal(echo.targetUid, 's');
  assert.equal(echo.value, armorDamage(14.5, 45));
  assert.ok(
    hits.every((h) => h.targetUid === 's' || h.targetUid === undefined),
  );
});
