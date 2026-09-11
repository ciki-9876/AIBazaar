import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, heroOwner } from './heroes.ts';
import { HERO_CARDS } from './hero-cards.ts';
import { HERO_DECKS, heroBoard, heroDuel, heroPool } from './hero-decks.ts';
import { addHeroCard, compactHeroLane } from './hero-builder.ts';
import { simulateDuel } from './demo-combat.ts';
import { cardDef, CARDS } from './demo-cards.ts';
import { rarityOf } from './demo-card-rules.ts';
import { describeCard } from './card-description.ts';
const card = (id, at = 0, uid = id) => ({
  id,
  at,
  uid,
  level: 0,
  quality: 0,
  rarity: rarityOf(id),
});
const duel = (player, enemy = [], heroes = ['archivist', null], hp = 2000) => ({
  player,
  enemy,
  heroes,
  maxHp: [hp, hp],
  weather: 0,
  layout: 0,
  name: 'fixture',
  kind: 'guardian',
  botId: null,
});
test('hero pools have 7/8/9 exclusive cards, fixed rarity and descriptions; adventure neutral pool remains unchanged', () => {
  assert.deepEqual(
    HEROES.map((h) => HERO_CARDS.filter((c) => c.hero === h.id).length),
    [7, 8, 9],
  );
  assert.equal(CARDS.length, 22);
  for (const c of HERO_CARDS) {
    assert.ok(describeCard(card(c.id)).role);
    assert.ok(describeCard(card(c.id)).effects.length);
    assert.ok(
      describeCard(card(c.id)).innate.every((x) => typeof x === 'string'),
    );
  }
  for (const h of HEROES)
    assert.ok(
      heroPool(h.id).every((c) => !heroOwner(c.id) || heroOwner(c.id) === h.id),
    );
  assert.deepEqual(
    HEROES.map((h) => heroPool(h.id).filter((c) => heroOwner(c.id)).length),
    [11, 12, 13],
  );
});
test('nine starting decks span four to nine cards, contain all three sizes and fill exactly nine legal cells', () => {
  const counts = new Set(),
    sizes = new Set();
  for (const d of HERO_DECKS)
    for (let p = 0; p < 6; p++) {
      const b = heroBoard(d, 'p', p),
        occupied = [];
      counts.add(b.length);
      for (const c of b) {
        const def = cardDef(c.id);
        sizes.add(def.size);
        assert.ok(!def.hero || def.hero === d.hero);
        assert.equal(
          Math.floor(c.at / 3),
          Math.floor((c.at + def.size - 1) / 3),
        );
        for (let n = 0; n < def.size; n++) occupied.push(c.at + n);
      }
      assert.deepEqual(
        occupied.sort((a, b) => a - b),
        [0, 1, 2, 3, 4, 5, 6, 7, 8],
      );
      if (b.some((c) => cardDef(c.id).energyCost > 0))
        assert.ok(b.some((c) => cardDef(c.id).energyGain > 0));
    }
  assert.equal(Math.min(...counts), 4);
  assert.equal(Math.max(...counts), 9);
  assert.deepEqual(
    [...sizes].sort((a, b) => a - b),
    [1, 2, 3],
  );
});
test('exclusive-card ownership is enforced even if a hero passive is disabled', () => {
  assert.throws(() => simulateDuel(duel([card('c-ram')])), /对应回响/);
  assert.throws(() => simulateDuel(duel([card('nailer')])), /对应回响/);
  assert.doesNotThrow(() =>
    simulateDuel({
      ...duel([card('c-ram')], [], ['breaker', null]),
      heroPassives: false,
    }),
  );
});
test('copied primary effects retain targeting scope without duplicating extra energy', () => {
  const r = simulateDuel(
    duel([
      card('w-clock'),
      card('w-pen', 2),
      card('knife', 3),
      card('bottle', 4),
    ]),
  );
  const copies = r.frames
    .flatMap((f) => f.hits)
    .filter((h) => h.source === '闻砂 · 复写 阅览室摆钟');
  assert.ok(copies.some((h) => h.targetUid === 'knife'));
  assert.ok(copies.some((h) => h.targetUid === 'bottle'));
  assert.ok(copies.every((h) => h.kind === 'charge'));
  const neutral = simulateDuel(
    duel([card('coil'), card('cell', 2), card('w-pen', 3)]),
  );
  const coilCopies = neutral.frames
    .flatMap((f) => f.hits)
    .filter((h) => h.source === '闻砂 · 复写 ' + cardDef('coil').name);
  assert.ok(coilCopies.length);
  assert.ok(coilCopies.every((h) => h.targetLane !== 0));
  const cell = simulateDuel(
    duel([card('cell'), card('w-pen', 1), card('knife', 2)]),
  );
  const cellCopies = cell.frames
    .flatMap((f) => f.hits)
    .filter((h) => h.source === '闻砂 · 复写 ' + cardDef('cell').name);
  assert.ok(cellCopies.length);
  assert.ok(cellCopies.every((h) => h.kind === 'shield'));
});
test('breaker opens with real charge projectiles and each enemy barrier can trigger the global charge only once', () => {
  const d = {
    ...duel([card('c-ram'), card('c-cut', 3)], [], ['breaker', null]),
    barrierHp: [
      [100, 100, 100],
      [1, 1, 1],
    ],
  };
  const r = simulateDuel(d);
  assert.equal(
    r.frames[0].projectiles.filter((p) => p.source.includes('回响')).length,
    2,
  );
  assert.ok(
    r.frames.some((f) =>
      f.hits.some((h) => h.kind === 'charge' && h.source.includes('回响')),
    ),
  );
  assert.ok(r.frames.every((f) => f.heroMeters[0].every((n) => n <= 1)));
  assert.equal(r.frames.at(-1).heroMeters[0][2], 0);
});
test('mender counts only effective repairs, and its large station repairs three lanes independently', () => {
  const empty = simulateDuel(duel([card('b-cart')], [], ['mender', null]));
  assert.ok(empty.frames.every((f) => f.heroMeters[0].every((n) => n === 0)));
  assert.ok(
    empty.frames.every(
      (f) => !f.projectiles.some((p) => p.source.includes('回响')),
    ),
  );
  const r = simulateDuel(
    duel(
      [card('b-cart')],
      [card('knife', 0, 'a'), card('knife', 3, 'b'), card('knife', 6, 'c')],
      ['mender', null],
    ),
  );
  const first = r.frames.find((f) =>
    f.hits.some((h) => h.sourceUid === 'b-cart' && h.kind === 'shield'),
  );
  assert.equal(
    first.hits.filter((h) => h.sourceUid === 'b-cart' && h.kind === 'shield')
      .length,
    3,
  );
  assert.ok(
    r.frames.some((f) => f.projectiles.some((p) => p.source.includes('回响'))),
  );
  assert.ok(
    r.frames.every((f) =>
      f.barriers.flat().every((b) => b.hp >= 0 && b.hp <= b.maxHp),
    ),
  );
});
test('archivist copies largest-card primary value without growth specials or recursive activation', () => {
  const r = simulateDuel(duel([card('w-press'), card('w-pen', 2)]));
  const copies = r.frames
    .flatMap((f) => f.hits)
    .filter((h) => h.source.startsWith('闻砂 · 复写'));
  assert.ok(copies.length);
  assert.ok(copies.every((h) => h.kind === 'damage' && h.raw === 18));
  const launched = new Set(
    r.frames
      .flatMap((f) => f.projectiles)
      .filter((p) => p.id.startsWith('echo-'))
      .map((p) => p.id),
  );
  const fired = r.frames.reduce((n, f) => n + f.fired.length, 0);
  assert.equal(launched.size, Math.floor(fired / 3));
  assert.ok(r.frames.every((f) => f.heroMeters[0][0] < 3));
});
test('builder supports size changes, removal and lane compaction without consuming or mutating another deck', () => {
  const start = [];
  let b = addHeroCard(start, 'breaker', 'c-cut', 0, 'p');
  b = addHeroCard(b, 'breaker', 'c-punch', 0, 'p');
  assert.equal(start.length, 0);
  assert.throws(() => addHeroCard(b, 'breaker', 'c-cut', 0, 'p'), /连续/);
  assert.throws(() => addHeroCard(b, 'breaker', 'w-pen', 1, 'p'), /专属/);
  b = b.filter((c) => c.id !== 'c-cut');
  b = compactHeroLane(b, 0);
  assert.equal(b[0].at, 0);
  b = addHeroCard(b, 'breaker', 'knife', 0, 'p');
  assert.equal(b[1].at, 2);
  const emptyLane = b.filter((c) => Math.floor(c.at / 3) !== 0);
  const full = addHeroCard(emptyLane, 'breaker', 'c-ram', 0, 'p');
  assert.equal(full.length, 1);
  assert.equal(cardDef(full[0].id).size, 3);
});
test('swapping sides preserves outcomes with hero charge, copied effects and simultaneous repairs', () => {
  for (let i = 0; i < HERO_DECKS.length; i++) {
    const a = HERO_DECKS[i],
      b = HERO_DECKS[(i + 4) % HERO_DECKS.length],
      d = heroDuel(a, b, 0, 3),
      r = simulateDuel(d),
      s = simulateDuel({
        ...d,
        player: d.enemy,
        enemy: d.player,
        heroes: [b.hero, a.hero],
      });
    assert.equal(s.winner, r.winner === -1 ? -1 : 1 - r.winner);
    assert.equal(s.duration, r.duration);
  }
});
