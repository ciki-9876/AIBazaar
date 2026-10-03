import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWandeng,
  wandengReducer as act,
  eventOffers,
  playerBoard,
  parseWandeng,
} from './wandeng-game.ts';
import { simulateArenaDuel } from './arena-engine.ts';

function lesson() {
  let s = act(createWandeng(), { type: 'comic-done' });
  s = act(s, { type: 'lesson-next' });
  s = act(s, { type: 'place', uid: s.inventory[3].uid, at: 5 });
  return act(s, { type: 'start-lesson' });
}
function journey() {
  let s = act(act(lesson(), { type: 'resolve-battle' }), { type: 'continue' });
  assert.equal(s.phase, 'letter');
  s = act(s, { type: 'read-letter' });
  return act(s, { type: 'depart' });
}
function event(s, kind, uid) {
  const offer = eventOffers(s).find((e) => e.kind === kind);
  s = act(s, { type: 'choose-event', id: offer.id });
  return act(s, { type: 'event-choice', choice: 0, uid });
}

test('wandeng: teaching requires real placement and a reproducible engine victory before the letter', () => {
  const s = act(createWandeng(), { type: 'comic-done' });
  assert.throws(() => act(s, { type: 'start-lesson' }));
  const battle = lesson();
  assert.equal(simulateArenaDuel(battle.battle.duel).winner, 0);
  assert.deepEqual(
    simulateArenaDuel(battle.battle.duel),
    simulateArenaDuel(parseWandeng(JSON.stringify(battle)).battle.duel),
  );
  const before = JSON.stringify(battle);
  const result = act(battle, { type: 'resolve-battle' });
  assert.equal(JSON.stringify(battle), before);
  assert.equal(result.receipt.paid, 0);
  assert.equal(result.receipt.gain, 0);
  assert.throws(() => act(result, { type: 'resolve-battle' }));
  assert.equal(journey().inventory.length, 7);
});

test('wandeng: invalid placement and failed purchases do not partially change resources or inventory', () => {
  const s = journey(),
    before = JSON.stringify(s);
  assert.throws(() =>
    act(s, { type: 'place', uid: s.inventory[0].uid, at: 2 }),
  );
  assert.equal(JSON.stringify(s), before);
  s.coins = 0;
  const shop = act(
    { ...s, step: 1 },
    { type: 'choose-event', id: eventOffers({ ...s, step: 1 })[0].id },
  );
  const frozen = JSON.stringify(shop);
  assert.throws(() => act(shop, { type: 'event-choice', choice: 0 }));
  assert.equal(JSON.stringify(shop), frozen);
  assert.throws(() => act(s, { type: 'repair', uid: s.inventory[0].uid }));
  assert.equal(s.inventory[0].level, 0);
});

test('wandeng: a choice consumes one stop only and stale offers cannot be claimed twice', () => {
  const s = journey(),
    offer = eventOffers(s)[0];
  const next = event(s, 'find');
  assert.equal(next.step, 1);
  assert.equal(next.inventory.length, s.inventory.length + 1);
  assert.throws(() => act(next, { type: 'choose-event', id: offer.id }));
  assert.throws(() => act(next, { type: 'event-choice', choice: 0 }));
  assert.deepEqual(event(s, 'find'), next);
});

test('wandeng: battle loss ransoms every item, records a shortfall and charges exactly once', () => {
  let s = journey();
  s = { ...s, step: 3, coins: 3 };
  // A legal but deliberately non-attacking arrangement loses to the actual boss.
  for (const c of s.inventory.filter((c) => c.id !== 'arena-21'))
    s = act(s, { type: 'place', uid: c.uid, at: null });
  s = act(s, { type: 'start-boss' });
  assert.equal(simulateArenaDuel(s.battle.duel).winner, 1);
  const before = structuredClone(s.inventory);
  const result = act(s, { type: 'resolve-battle' });
  assert.deepEqual(result.inventory, before);
  assert.equal(result.coins, 0);
  assert.equal(result.debt, 5);
  assert.equal(result.receipt.paid, 3);
  assert.equal(result.receipt.borrowed, 5);
  assert.throws(() => act(result, { type: 'resolve-battle' }));
  const retry = act(parseWandeng(JSON.stringify(result)), { type: 'continue' });
  assert.equal(retry.phase, 'journey');
  assert.equal(retry.step, 2);
  assert.equal(retry.chapter, 0);
  const paid = event(retry, 'work');
  assert.equal(paid.debt, 0);
  assert.equal(paid.coins, 5);
});

test('wandeng: victories transfer a real enemy instance, preserving identity and growth', () => {
  let s = journey();
  s = { ...s, chapter: 1, step: 3 };
  s.inventory.forEach((c) => {
    c.level = 6;
  });
  s = act(s, { type: 'start-boss' });
  const a = act(s, { type: 'resolve-battle' });
  const b = act(parseWandeng(JSON.stringify(s)), { type: 'resolve-battle' });
  assert.deepEqual(a, b);
  assert.equal(a.receipt.winner, 0);
  const received = a.inventory.find((c) => c.uid === a.receipt.received);
  const enemy = s.battle.duel.enemy.find((c) => c.uid === received.uid);
  assert.equal(received.id, enemy.id);
  assert.equal(received.level, enemy.level);
  assert.equal(received.at, null);
  assert.deepEqual(playerBoard(a), playerBoard(s));
  assert.deepEqual(parseWandeng(JSON.stringify(a)), a);
});

test('wandeng: the complete three-boss journey grows cards and delivers only at the ending', () => {
  let s = journey();
  assert.throws(() => act(s, { type: 'deliver' }));
  for (let chapter = 0; chapter < 3; chapter++) {
    assert.equal(s.chapter, chapter);
    for (let i = 0; i < 3; i++)
      s = event(s, 'repair', s.inventory[chapter].uid);
    assert.equal(s.inventory[chapter].level, 6);
    s = act(s, { type: 'start-boss' });
    s = act(s, { type: 'resolve-battle' });
    assert.equal(s.receipt.winner, 0);
    s = act(s, { type: 'continue' });
  }
  assert.equal(s.phase, 'ending');
  assert.equal(s.inventory.length, 10);
  const delivered = act(s, { type: 'deliver' });
  assert.equal(delivered.delivered, true);
  assert.deepEqual(delivered.inventory, s.inventory);
  assert.throws(() => act(delivered, { type: 'deliver' }));
  assert.throws(() => act(delivered, { type: 'start-boss' }));
  assert.deepEqual(parseWandeng(JSON.stringify(delivered)), delivered);
});

test('wandeng: corrupt saves reject duplicate identities, impossible boards and incomplete battles', () => {
  const s = journey();
  assert.throws(() => parseWandeng('{bad'));
  assert.throws(() => parseWandeng(JSON.stringify({ ...s, coins: -1 })));
  assert.throws(() => parseWandeng(JSON.stringify({ ...s, phase: 'battle' })));
  assert.throws(() => parseWandeng(JSON.stringify({ ...s, delivered: true })));
  s.inventory.push({ ...s.inventory[0], at: null });
  assert.throws(() => parseWandeng(JSON.stringify(s)));
});
