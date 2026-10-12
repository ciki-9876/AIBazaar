import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createThrowDuel,
  setAutoPlay,
  autoPlayCards,
  stepThrowDuelInPlace,
  useSleight,
  fighterSleight,
  TICK_MS,
} from './throw-duel.ts';
const hand = (...pairs) =>
  pairs.map(([suit, rank], i) => ({ suit, rank, uid: `t${i}` }));
const duel = (items = [], options = {}) =>
  createThrowDuel(
    447,
    items,
    'quick',
    null,
    null,
    undefined,
    {},
    { enemyItems: [], ...options },
  );
const run = (s, n) => {
  for (let i = 0; i < n; i++) stepThrowDuelInPlace(s);
  return s;
};
test('autoplay uses full real build, chooses healing only when useful and obeys terms', () => {
  const s = duel(['mend']);
  s.fighters[0].hand = hand([1, 2], [0, 14]);
  assert.equal(
    autoPlayCards(s)[0].rank,
    14,
    'full health must not value wasted healing',
  );
  s.fighters[0].hp = 10;
  assert.equal(autoPlayCards(s)[0].suit, 1, 'low health values heart healing');
  s.terms = { suits: [0], maxCards: 1 };
  assert.equal(autoPlayCards(s).length, 1);
  assert.equal(autoPlayCards(s)[0].suit, 0);
  s.terms = { suits: [3] };
  assert.deepEqual(autoPlayCards(s), []);
});
test('autoplay values poison, burning, combinations, gold output and reflects safely', () => {
  const s = duel(['poison']);
  s.fighters[0].hand = hand([0, 9], [2, 8]);
  assert.equal(autoPlayCards(s)[0].suit, 2);
  s.fighters[0].items = ['cinder'];
  assert.equal(autoPlayCards(s)[0].suit, 0);
  s.fighters[0].hand = hand([3, 7], [0, 9]);
  assert.equal(autoPlayCards(s)[0].suit, 3);
  s.fighters[0].items = ['sequence', 'suit'];
  s.fighters[0].hand = hand([0, 5], [0, 6], [0, 7]);
  assert.equal(
    autoPlayCards(s).length,
    3,
    'short straight flush earns its actual combo',
  );
  s.fighters[1].relic = 'bastion';
  s.fighters[1].shield = 500;
  s.fighters[0].hp = 1;
  s.fighters[0].items = ['quick'];
  assert.equal(
    autoPlayCards(s).length,
    1,
    'avoid shield-reflected batches while fragile',
  );
});
test('autoplay is opt-in, deterministic, honours launch cooldown and yields instantly when disabled', () => {
  const initial = duel(['quick'], { performers: { player: 'eli' } });
  run(initial, 30);
  assert.equal(initial.stats[0].throws, 0);
  const s = setAutoPlay(initial, true),
    same = structuredClone(s);
  run(s, 240);
  run(same, 240);
  assert.deepEqual(s, same);
  assert.ok(s.stats[0].throws > 0);
  for (let i = 1; i < s.stats[0].actions.length; i++)
    assert.ok(
      s.stats[0].actions[i].tick - s.stats[0].actions[i - 1].tick >=
        (s.stats[0].actions[i - 1].cards.length * 1000) / TICK_MS,
    );
  const off = setAutoPlay(s, false),
    count = off.stats[0].throws;
  assert.deepEqual(off.autoPlayer.intent, []);
  run(off, 80);
  assert.equal(off.stats[0].throws, count);
});
test('Stan encore swaps the full hand once per appearance while keeping exact card identities and count', () => {
  const s = duel([], { performers: { player: 'stan' }, stanEncore: true });
  assert.equal(fighterSleight(s.fighters[0]).name, '重新来过');
  const ids = new Set(
    [...s.fighters[0].hand, ...s.fighters[0].pile].map((c) => c.uid),
  );
  const next = useSleight(s, 0);
  assert.notStrictEqual(next, s);
  assert.equal(next.fighters[0].hand.length, 5);
  assert.deepEqual(
    new Set(
      [...next.fighters[0].hand, ...next.fighters[0].pile].map((c) => c.uid),
    ),
    ids,
  );
  assert.equal(next.fighters[0].encoreUsed, true);
  assert.strictEqual(useSleight(next, 0), next);
  assert.equal(
    fighterSleight(duel([], { performers: { player: 'stan' } }).fighters[0])
      .name,
    '换牌',
  );
});
test('three-person relay promotes two distinct queues, protects each intermission and resets phases', () => {
  const reserve = (performer, style, items) => ({
    performer,
    style,
    items,
    presence: 360,
  });
  const s = duel(['quick'], {
    performers: { player: 'eli' },
    playerReserves: [
      reserve('juno', 'guard', ['ward']),
      reserve('stan', 'mend', ['mend']),
    ],
  });
  assert.deepEqual(s.teamOrder[0], ['eli', 'juno', 'stan']);
  assert.equal(s.reserveQueues[0].length, 1);
  const all = [s.fighters[0], s.reserves[0], ...s.reserveQueues[0]].flatMap(
    (f) => [...f.hand, ...f.pile],
  );
  assert.equal(new Set(all.map((c) => c.uid)).size, 156);
  for (const [index, id] of ['juno', 'stan'].entries()) {
    s.tick += 1300;
    s.fighters[0].hp = 0;
    run(s, 1);
    assert.ok(s.intermission);
    const hp = s.fighters[1].hp;
    run(s, 99);
    assert.ok(s.intermission);
    assert.equal(s.fighters[1].hp, hp);
    run(s, 1);
    assert.equal(s.intermission, null);
    assert.equal(s.tick - s.roundStartTick, 0);
    assert.equal(s.fighters[0].performer, id);
    assert.equal(s.activeSeats[0], index + 1);
  }
  s.fighters[0].hp = 0;
  run(s, 1);
  assert.equal(s.status, 'ended');
  assert.equal(s.winner, 1);
  assert.throws(
    () =>
      duel([], {
        performers: { player: 'eli' },
        playerReserves: [reserve('eli', 'quick', [])],
      }),
    /Duplicate/,
  );
});
