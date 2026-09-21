import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_VARIANTS,
  CARDS,
  cardDef,
  identifyVariant,
} from './demo-cards.ts';
import { cardMechanics, combatValue } from './demo-card-rules.ts';
import { describeCard } from './card-description.ts';
import { simulateDuel } from './demo-combat.ts';
import { newRun, act, makeItem, validSave } from './demo-engine.ts';
test('variants: fixed rarity, same-tier alternatives, definitions drive text and mechanics', () => {
  for (const family of CARDS) {
    for (let rarity = 0; rarity < 5; rarity++) {
      const c = identifyVariant(family.id, rarity, 17);
      assert.equal(c.rarity, rarity);
      assert.equal(c.size, family.size);
      assert.equal(cardDef(c.id), c);
      const d = describeCard({
        uid: 'v',
        id: c.id,
        at: 0,
        rarity,
        level: 0,
        quality: 0,
      });
      assert.equal(d.cd, c.cd);
      assert.equal(d.effects[0].value, combatValue(c.id, 0));
    }
    assert.notEqual(
      identifyVariant(family.id, 2, 0).id,
      identifyVariant(family.id, 2, 1).id,
    );
  }
  assert.equal(
    new Set(CARD_VARIANTS.map((c) => c.name)).size,
    CARD_VARIANTS.length,
  );
  assert.equal(cardMechanics('rubber~precision', 0).buffer, 10);
  assert.equal(cardMechanics('rubber~swift', 0).buffer, 9);
});
test('variants: differing buffers apply actual mitigation and replay exactly', () => {
  const make = (id) => ({
    uid: id,
    id,
    at: 3,
    rarity: cardDef(id).rarity,
    level: 0,
    quality: 0,
  });
  const duel = (id) => ({
    player: [make(id)],
    enemy: [make('springbow')],
    maxHp: [240, 1000],
    barrierHp: [
      [72, 72, 72],
      [72, 72, 72],
    ],
    weather: 0,
    weatherEnabled: false,
    layout: 0,
    name: 'variants',
    kind: 'guardian',
    botId: null,
  });
  const a = simulateDuel(duel('rubber~worn')),
    b = simulateDuel(duel('rubber~void'));
  const blocked = (r) =>
    r.frames
      .flatMap((f) => f.hits)
      .filter((h) => h.blocked)
      .map((h) => h.blocked);
  assert.equal(blocked(a)[0], 6);
  assert.equal(blocked(b)[0], 12);
  assert.notDeepEqual(a.frames, b.frames);
  assert.deepEqual(
    b,
    simulateDuel(JSON.parse(JSON.stringify(duel('rubber~void')))),
  );
});
test('variants: scanning preserves identity, slots and save; mismatched variant rarity rejected', () => {
  let s = act(newRun(42), { type: 'begin' });
  s.items.push(makeItem('object', 'rubber', 'physical'));
  s = act(s, { type: 'buy-scanner' });
  s = act(s, { type: 'scan', id: 'object' });
  assert.ok(validSave(s));
  const x = s.items.find((x) => x.uid === 'object');
  assert.equal(x.rarity, cardDef(x.id).rarity);
  assert.ok(x.id.startsWith('rubber~'));
  const bad = structuredClone(s);
  bad.items.find((x) => x.uid === 'object').rarity = (x.rarity + 1) % 5;
  assert.equal(validSave(bad), false);
});

test('onboarding systems: permanent shop sale advances guide, first sleep does not unlock terminal', () => {
  let s = act(newRun(44, true), { type: 'begin' });
  s.homeGuide = 'sell';
  s.items.push(makeItem('treasure', 'relic', 'tool'));
  const before = s.material;
  s = act(s, { type: 'sell', id: 'treasure' });
  assert.equal(s.material, before + 30);
  assert.equal(s.homeGuide, 'buy');
  s = act(s, { type: 'buy-scanner' });
  assert.equal(s.homeGuide, 'scan');
  assert.throws(() => act(s, { type: 'upgrade' }), /尚未/);
  s.homeGuide = 'sleep';
  s = act(s, { type: 'sleep' });
  assert.equal(s.homeGuide, 'done');
  assert.equal(s.systemsUnlocked, undefined);
  assert.throws(() => act(s, { type: 'upgrade' }), /尚未/);
  const upgraded = { ...s, level: 2 };
  assert.doesNotThrow(() => act(upgraded, { type: 'upgrade' }));
});
