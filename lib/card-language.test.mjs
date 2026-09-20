import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from './demo-cards.ts';
import { describeCard, CARD_TERMS } from './card-description.ts';
import { combatValue } from './demo-card-rules.ts';
import { simulateDuel } from './demo-combat.ts';
const card = (id, quality = 0, level = 0, at = 0) => ({
  id,
  uid: id,
  quality,
  level,
  at,
  rarity: 0,
});
const duel = (player, enemy = [], hp = 10000) => ({
  player,
  enemy,
  maxHp: [hp, hp],
  barrierHp: [
    [hp, hp, hp],
    [hp, hp, hp],
  ],
  weather: 0,
  layout: 0,
  name: 'card language',
  kind: 'guardian',
  botId: null,
});
const hits = (r, id, kind) =>
  r.frames
    .flatMap((f) => f.hits)
    .filter((h) => h.sourceUid === id && h.kind === kind);

test('all live cards describe present timings, targets, keywords and separate future upgrades', () => {
  for (const c of CARDS)
    for (const quality of [0, 1, 2])
      for (const level of [0, 2, 5]) {
        const d = describeCard(card(c.id, quality, level));
        assert.equal(d.abilities[0].when, `每${c.cd}秒`);
        assert.ok(
          d.abilities[0].text.includes(
            String(combatValue(c.id, level, quality)),
          ),
        );
        assert.ok(d.summary.length <= 20);
        assert.ok(d.keywords.length > 0);
        for (const a of d.abilities)
          for (const id of a.terms) assert.ok(CARD_TERMS[id]);
        for (const tier of d.future) {
          assert.ok(tier.quality > quality);
          assert.ok(
            tier.abilities.some((a, i) => a.text !== d.abilities[i].text),
          );
        }
        assert.doesNotMatch(d.innate.join(''), /升阶|精制解锁|大师解锁/);
      }
});

test('opening and repeated damage descriptions match delivered attacks across qualities and growth', () => {
  for (const id of ['nailer', 'springbow', 'culture'])
    for (const quality of [0, 1, 2])
      for (const level of [0, 2, 5]) {
        const c = card(id, quality, level),
          d = describeCard(c);
        const shots = hits(simulateDuel(duel([c])), id, 'damage');
        const bonus = Number(
          d.abilities[1].text.match(/(?:额外造成|多造成)([\d.]+)/)[1],
        );
        const base = d.effects[0].value;
        if (id === 'culture') {
          assert.equal(shots[0].raw, base);
          assert.ok(Math.abs(shots[1].raw - base - bonus) < 1e-9);
        } else {
          const count = id === 'nailer' ? 2 : 3;
          assert.ok(Math.abs(shots[0].raw - base - bonus) < 1e-9);
          assert.equal(shots[count].raw, base);
        }
      }
});

test('impact condition is not confused with launch condition; first charge uses the displayed seconds', () => {
  const gap = describeCard(card('gapblade'));
  assert.equal(gap.abilities[1].when, '命中时');
  const d = duel([card('gapblade')]);
  d.barrierHp[1][0] = 5;
  const attacks = hits(simulateDuel(d), 'gapblade', 'damage');
  assert.equal(attacks[0].value, 10);
  assert.equal(attacks[1].value, 16);
  assert.equal(describeCard(card('counterweight')).abilities[1].when, '发动时');
  for (const quality of [0, 1, 2]) {
    const c = card('fuse', quality, 2, 2),
      desc = describeCard(c);
    const first = hits(
      simulateDuel(duel([card('nailer'), c])),
      'fuse',
      'charge',
    )[0];
    const bonus = Number(desc.abilities[1].text.match(/充能([\d.]+)/)[1]);
    assert.equal(first.value, desc.effects[0].value + bonus);
  }
});
