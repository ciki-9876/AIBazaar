import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePoker } from './throw-poker.ts';
import {
  createThrowDuel,
  CURTAIN_MS,
  curtainDamage,
  launchThrow,
  MAX_HP,
  previewThrow,
  stepThrowDuel,
  TICK_MS,
} from './throw-duel.ts';
import {
  ENCHANTS,
  GENERIC_ENCHANTS,
  legendaryFor,
  SMALL_RANK,
  validDeckBook,
  variantsFor,
} from './throw-enchant.ts';

const card = (rank, suit, ench, uid = `c${rank}${suit}${ench ?? ''}`) => ({
  uid,
  rank,
  suit,
  ...(ench ? { ench } : {}),
});
const idle = (books) => {
  const state = createThrowDuel(1024, [], 'guard', null, null, undefined, books);
  state.ai.thinkTick = 1e9;
  return state;
};
const run = (state, count) => {
  for (let i = 0; i < count; i++) state = stepThrowDuel(state);
  return state;
};
const curtainTick = CURTAIN_MS / TICK_MS;

test('curtain call: nothing before one minute, then 1, 2, 3 … to both sides every second', () => {
  assert.equal(curtainDamage(curtainTick - 1), 0);
  assert.equal(curtainDamage(curtainTick), 1);
  assert.equal(curtainDamage(curtainTick + 20), 2);
  assert.equal(curtainDamage(curtainTick + 20 * 9), 10);
  let state = idle();
  state.tick = curtainTick - 1;
  state = run(state, 1);
  assert.equal(state.fighters[0].hp, MAX_HP - 1);
  assert.equal(state.fighters[1].hp, MAX_HP - 1);
  assert.equal(state.events.at(-1).text, '落幕');
});

test('curtain damage is ordinary damage: shields absorb it and a double knockout is a draw', () => {
  let state = idle();
  state.tick = curtainTick + 20 * 4 - 1;
  state.fighters[0].shield = 3;
  state = run(state, 1);
  assert.equal(state.fighters[0].shield, 0);
  assert.equal(state.fighters[0].hp, MAX_HP - 2);
  assert.equal(state.fighters[1].hp, MAX_HP - 5);
  state.fighters[0].hp = 3;
  state.fighters[1].hp = 3;
  state.tick = curtainTick + 20 * 5 - 1;
  state = run(state, 1);
  assert.equal(state.status, 'ended');
  assert.equal(state.winner, 'draw');
});

test('a deck is one standard 52 shuffled in order, reshuffled whole per cycle, regardless of variants', () => {
  const plain = idle();
  const fancy = idle({ player: { '1-14': 'LHA', '0-2': 'gold' } });
  const order = (state) => [...state.fighters[0].hand, ...state.fighters[0].pile].map((c) => `${c.suit}-${c.rank}`);
  assert.equal(order(plain).length, 52);
  assert.equal(new Set(order(plain)).size, 52);
  assert.deepEqual(order(fancy), order(plain));
  const ace = [...fancy.fighters[0].hand, ...fancy.fighters[0].pile].find((c) => c.suit === 1 && c.rank === 14);
  assert.equal(ace.ench, 'LHA');
});

test('every card has common, six rare, six epic and its own legendary variant', () => {
  assert.equal(GENERIC_ENCHANTS.filter((e) => e.rarity === 'rare').length, 6);
  assert.equal(GENERIC_ENCHANTS.filter((e) => e.rarity === 'epic').length, 6);
  const legends = ENCHANTS.filter((e) => e.rarity === 'legendary');
  assert.equal(legends.length, 52);
  assert.equal(new Set(legends.map((e) => e.id)).size, 52);
  for (let suit = 0; suit < 4; suit++)
    for (let rank = 2; rank <= 14; rank++) {
      const variants = variantsFor(suit, rank);
      assert.equal(variants.length, 14);
      const legend = legendaryFor(suit, rank);
      assert.deepEqual(legend.card, { suit, rank });
      assert.ok(legend.name && legend.text && legend.quip);
    }
});

test('silver adds 4 points and gold doubles a card’s points, including inside the combo bonus', () => {
  assert.equal(scorePoker([card(14, 0, 'gold')]).damage, 28);
  assert.equal(scorePoker([card(14, 0, 'silver')]).damage, 18);
  // Pair of 2s: (2×2 + 2) × 1.5 = 9.
  assert.equal(scorePoker([card(2, 0, 'gold'), card(2, 1)]).damage, 9);
});

test('wild cards complete a flush; resonant cards count several times for per-suit items', () => {
  const four = [2, 5, 8, 11].map((rank) => card(rank, 1));
  assert.equal(scorePoker([...four, card(4, 0)]).kind, 5);
  assert.equal(scorePoker([...four, card(4, 0)]).comboIds.length, 4);
  assert.equal(scorePoker([...four, card(4, 0, 'wild')]).kind, 5);
  assert.equal(scorePoker([...four, card(4, 0, 'wild')]).comboIds.length, 5);
  assert.equal(scorePoker([...four, card(13, 2, 'LCK')]).kind, 5);
  // A full healing line (three items), so the v9 splash tax does not halve the lamp.
  const healers = ['mend', 'wash', 'drain'];
  assert.equal(previewThrow([card(2, 1)], healers).heal, 9);
  assert.equal(previewThrow([card(2, 1, 'resonant')], healers).heal, 18);
  assert.equal(previewThrow([card(2, 1, 'LH2')], healers).heal, 27);
});

test('legendary effects read the real duel: curtain, opponent statuses and your own poison', () => {
  const ace = [card(14, 0, 'LSA')];
  assert.equal(previewThrow(ace, [], { tick: 0 }).shield, 28);
  assert.equal(previewThrow(ace, [], { tick: curtainTick }).shield, 48);
  const shears = [card(10, 2, 'LC10')];
  assert.equal(previewThrow(shears, [], { target: { poison: 9 } }).damage, 10 + 4);
  const tea = [card(14, 1, 'LHA')];
  assert.equal(previewThrow(tea, [], { poison: 13 }).cleansePoison, 13);
  assert.equal(previewThrow([card(12, 3, 'LDQ')], [], {}).cleanseBurn, 4);
});

test('launching enchanted cards applies their effects atomically', () => {
  let state = idle({ player: { '1-14': 'LHA' } });
  const fighter = state.fighters[0];
  fighter.hand = [card(14, 1, 'LHA', 'tea')];
  fighter.hp = 200;
  fighter.poison = 7;
  state = launchThrow(state, 0, ['tea']);
  assert.equal(state.fighters[0].poison, 0);
  assert.ok(state.fighters[0].hp > 200);
});

test('deck books must fit their cards; there is no rarity cap (ADR-0058)', () => {
  assert.ok(validDeckBook({ '1-14': 'LHA', '0-2': 'gold' }));
  assert.ok(!validDeckBook({ '0-14': 'LHA' }));
  assert.ok(!validDeckBook({ '0-14': 'nonsense' }));
  assert.ok(!validDeckBook({ '4-14': 'gold' }));
  const legends = Object.fromEntries(
    [2, 3, 4, 5].map((rank) => [`0-${rank}`, legendaryFor(0, rank).id]),
  );
  assert.ok(validDeckBook(legends), 'four legendaries are fine');
  const golden = Object.fromEntries([0, 1, 2, 3].flatMap((suit) => [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((rank) => [`${suit}-${rank}`, 'gold'])));
  assert.ok(validDeckBook(golden), 'a fully gilded deck is legal');
  assert.throws(() => idle({ player: { '0-14': 'LHA' } }), /Invalid deck book/);
});

test('enchanted duels replay identically', () => {
  const book = { '0-14': 'LSA', '1-2': 'LH2', '2-9': 'gold', '3-13': 'wild' };
  const replay = () => {
    let state = createThrowDuel(77, ['mend', 'ward'], 'burn', null, undefined, undefined, { player: book, enemy: book });
    for (let i = 0; i < 1800; i++) {
      if (i % 30 === 0 && state.fighters[0].hand.length)
        state = launchThrow(state, 0, state.fighters[0].hand.slice(0, 2).map((c) => c.uid));
      state = stepThrowDuel(state);
    }
    return state;
  };
  assert.deepEqual(replay(), replay());
});

test('v6: rare crafts are banded by rank, so the same variant on ♠3 and ♠K differs', () => {
  const effect = (rank, ench) =>
    previewThrow([card(rank, 0, ench)], [], { hp: MAX_HP }).effects.filter((entry) => entry.source.startsWith('card:'));
  const value = (rank, ench, kind) => effect(rank, ench).find((entry) => entry.kind === kind)?.value ?? 0;
  assert.equal(SMALL_RANK, 8);
  for (const [ench, kind, small, big] of [
    ['edge', 'damage', 4, 1],
    ['lining', 'shield', 4, 1],
    ['mint', 'heal', 5, 2],
    ['seal', 'burn', 2, 1],
    ['moss', 'poison', 2, 1],
  ]) {
    assert.equal(value(3, ench, kind), small, `${ench} on a 3`);
    assert.equal(value(8, ench, kind), small, `${ench} on an 8`);
    assert.equal(value(9, ench, kind), big, `${ench} on a 9`);
    assert.equal(value(13, ench, kind), big, `${ench} on a king`);
  }
});

test('v6: curtain variants work all duel long and only grow stronger at the curtain', () => {
  const at = (tick, suit, rank, kind) =>
    previewThrow([card(rank, suit, legendaryFor(suit, rank).id)], [], { hp: MAX_HP, tick }).effects.find(
      (entry) => entry.source.startsWith('card:') && entry.kind === kind,
    )?.value ?? 0;
  const late = CURTAIN_MS / TICK_MS + 20;
  assert.deepEqual([at(0, 0, 5, 'shield'), at(late, 0, 5, 'shield')], [10, 24]);
  assert.deepEqual([at(0, 1, 12, 'heal'), at(late, 1, 12, 'heal')], [12, 30]);
  assert.deepEqual([at(0, 2, 5, 'poison'), at(late, 2, 5, 'poison')], [4, 9]);
  const encore = (tick, kind) =>
    previewThrow([card(9, 0, 'encore')], [], { hp: MAX_HP, tick }).effects.find(
      (entry) => entry.source.startsWith('card:') && entry.kind === kind,
    )?.value ?? 0;
  assert.deepEqual([encore(0, 'shield'), encore(0, 'heal'), encore(late, 'shield'), encore(late, 'heal')], [4, 3, 12, 9]);
});

test('v6: the pierce craft adds damage on every throw and pierces half a shield on a single card', () => {
  const single = previewThrow([card(14, 0, 'pierce')], [], { hp: MAX_HP });
  const pair = previewThrow([card(14, 0, 'pierce'), card(14, 1)], [], { hp: MAX_HP });
  assert.equal(single.cardBonus, 4);
  assert.equal(single.pierce, 50);
  assert.equal(pair.cardBonus, 4);
  assert.equal(pair.pierce, 0);
});
