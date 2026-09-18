import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateDuel } from './demo-combat.ts';
import {
  ARCHETYPES,
  archetypeDuel,
  archetypeBoard,
} from './demo-archetypes.ts';
import { CARDS, SYSTEM_CARDS, cardDef } from './demo-cards.ts';
import { rarityOf, combatValue } from './demo-card-rules.ts';
import { describeCard } from './card-description.ts';
import { newRun, validSave, makeItem, merchantOffers } from './demo-engine.ts';
const card = (id, at = 0, uid = id, quality = 0, level = 0) => ({
  id,
  at,
  uid,
  quality,
  level,
  rarity: rarityOf(id),
});
const duel = (player, enemy = [], barrier = 1000) => ({
  player,
  enemy,
  maxHp: [2000, 2000],
  barrierHp: [
    [barrier, barrier, barrier],
    [barrier, barrier, barrier],
  ],
  weather: 0,
  layout: 0,
  name: 'fixture',
  kind: 'guardian',
  botId: null,
});
const hits = (result, uid, kind = 'damage') =>
  result.frames
    .flatMap((f) => f.hits)
    .filter((h) => h.sourceUid === uid && h.kind === kind);
test('12 system cards have fixed rarity, readable roles and meaningful growth; all preset boards fill 9 cells without overlap', () => {
  assert.equal(SYSTEM_CARDS.length, 12);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length);
  for (const c of SYSTEM_CARDS) {
    assert.ok(describeCard(card(c.id)).role);
    assert.ok(combatValue(c.id, 1) > combatValue(c.id, 0));
  }
  for (const a of ARCHETYPES)
    for (let v = 0; v < 2; v++)
      for (let p = 0; p < 6; p++) {
        const board = archetypeBoard(a.id, 'fixture', v, p),
          cells = [];
        for (const c of board) {
          const size = cardDef(c.id).size;
          assert.equal(Math.floor(c.at / 3), Math.floor((c.at + size - 1) / 3));
          for (let j = 0; j < size; j++) cells.push(c.at + j);
        }
        assert.deepEqual(
          cells.sort((a, b) => a - b),
          [0, 1, 2, 3, 4, 5, 6, 7, 8],
        );
      }
});
test('burst expires and exposed damage checks the barrier on impact', () => {
  const r = simulateDuel(duel([card('nailer')], [], 10000)),
    shots = hits(r, 'nailer');
  assert.deepEqual(
    shots.slice(0, 3).map((h) => h.raw),
    [49, 49, 33],
  );
  const gap = hits(simulateDuel(duel([card('gapblade')], [], 5)), 'gapblade');
  assert.equal(gap[0].value, 20);
  assert.equal(gap[0].healthLoss, 15);
  assert.equal(gap[1].value, 32);
});
test('buffer applies only on its intact lane, does not stack, and recoil stores actual direct barrier damage', () => {
  const r = simulateDuel(
    duel(
      [card('gapblade', 0, 'attack')],
      [card('recoil', 0), card('rubber', 2)],
    ),
  );
  assert.equal(hits(r, 'attack')[0].blocked, 8);
  assert.equal(hits(r, 'attack')[0].barrierAbsorbed, 12);
  assert.equal(hits(r, 'recoil')[0].raw, 49);
  const off = simulateDuel(
    duel([card('gapblade', 3, 'attack')], [card('rubber', 2)]),
  );
  assert.equal(hits(off, 'attack')[0].blocked, 0);
  const stacked = simulateDuel(
    duel(
      [card('gapblade', 0, 'attack')],
      [card('rubber', 0, 'a'), card('rubber', 1, 'b')],
    ),
  );
  assert.equal(hits(stacked, 'attack')[0].blocked, 8);
});
test('corrosion ticks after impact, bypasses buffer, reduces repair ceiling, persists through a broken barrier, caps at 12', () => {
  const r = simulateDuel(
    duel([card('acid')], [card('recoil', 0), card('rubber', 2)], 30),
  );
  assert.equal(r.frames.find((f) => f.time === 7).corrosion[1][0], 0);
  assert.equal(r.frames.find((f) => f.time === 7.25).corrosion[1][0], 8);
  const tick = hits(r, 'acid').find((h) => h.periodic);
  assert.equal(tick.value, 8);
  assert.equal(tick.blocked, 0);
  assert.ok(
    hits(r, 'acid').some(
      (h) => h.targetUid === 'host-1-lane-0' && h.healthLoss > 0,
    ),
  );
  assert.ok(r.frames.every((f) => f.corrosion[1][0] <= 12));
  assert.ok(
    r.frames.every((f) => f.barriers[1][0].hp <= f.barriers[1][0].maxHp),
  );
  assert.ok(r.frames.every((f) => (f.stored.recoil ?? 0) === 0));
  assert.equal(hits(r, 'recoil')[0].raw, 49);
});
test('culture grows and redirects to the most corroded lane; catalyst and distiller create distinct support effects', () => {
  const r = simulateDuel(
    duel([
      card('acid', 0),
      card('culture', 3),
      card('distiller', 5),
      card('catalyst', 2),
    ]),
  );
  const culture = hits(r, 'culture');
  assert.equal(culture[0].targetLane, 1);
  assert.equal(culture[1].targetLane, 0);
  assert.deepEqual(
    culture.slice(0, 3).map((h) => h.raw),
    [6, 14, 22],
  );
  assert.ok(hits(r, 'catalyst', 'charge').some((h) => h.value === 1.6));
  assert.ok(hits(r, 'distiller', 'heal').length > 0);
  assert.equal(describeCard(card('distiller')).effects.at(-1).kind, 'heal');
});
test('nominal standard decks retain a counter advantage across all lane permutations, with symmetric sides', () => {
  for (const a of ARCHETYPES) {
    let score = 0;
    for (let pa = 0; pa < 6; pa++)
      for (let pb = 0; pb < 6; pb++) {
        const d = archetypeDuel(a.id, a.beats, 0, 0, pa, pb),
          r = simulateDuel(d),
          reverse = simulateDuel({ ...d, player: d.enemy, enemy: d.player });
        assert.equal(reverse.winner, r.winner === -1 ? -1 : 1 - r.winner);
        assert.equal(reverse.duration, r.duration);
        score += r.winner === 0 ? 1 : r.winner === -1 ? 0.5 : 0;
      }
    assert.ok(
      score / 36 >= 0.55,
      a.id + ' must retain aggregate advantage: ' + score / 36,
    );
  }
});

test('new cards survive item/save validation and appear in generated loot/merchant pools', () => {
  const run = newRun(93);
  run.items.push(
    ...SYSTEM_CARDS.map((c) =>
      makeItem(`new-${c.id}`, c.id, 'physical', 'warehouse'),
    ),
  );
  // Real migration allocates these physical specimens into storage slots.
  const restored = validSave(JSON.parse(JSON.stringify(run)));
  assert.ok(restored);
  const available = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    const s = newRun(seed);
    s.floor = 1;
    s.node = 2;
    for (const f of s.floors)
      for (const item of f.stock) available.add(item.id);
    for (const item of merchantOffers(s)) available.add(item.id);
  }
  for (const c of SYSTEM_CARDS) assert.ok(available.has(c.id));
});
