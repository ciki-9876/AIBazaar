import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_CARDS, AMPLIFIERS } from './arena-catalog.ts';
import { simulateDuel } from './cards/combat.ts';
import { simulateArenaDuel } from './arena-engine.ts';
import { arenaReview } from './arena-presentation.ts';
import {
  createWandeng,
  wandengReducer as act,
  previewWandengBattle,
  eventItems,
  eventOffers,
  parseWandeng,
  SOULS,
  validateWandengBattle,
  serializeWandengReplay,
  parseWandengReplay,
} from './wandeng-game.ts';

const journey = () => ({ ...createWandeng(), phase: 'journey', step: 3 });

test('wandeng restoration: all 50 original IDs retain their mechanics and are reachable in offers', () => {
  assert.equal(Object.keys(SOULS).length, 50);
  const seen = new Set();
  for (let seed = 0; seed < 500; seed++) {
    const s = { ...createWandeng(seed), selectedEvent: 'find' };
    assert.deepEqual(eventItems(s), eventItems(structuredClone(s)));
    eventItems(s).forEach((id) => seen.add(id));
  }
  assert.deepEqual(
    [...seen].sort((a, b) => a.localeCompare(b)),
    ARENA_CARDS.map((c) => c.id).sort((a, b) => a.localeCompare(b)),
  );
});

test('wandeng restoration: preview is the exact committed duel, with no attempt consumption', () => {
  let s = act(journey(), { type: 'amplifier', lane: 0, id: 'amp-04' });
  s = act(s, { type: 'amplifier', lane: 1, id: 'amp-06' });
  const raw = JSON.stringify(s),
    preview = previewWandengBattle(s, 'boss');
  assert.equal(JSON.stringify(s), raw);
  const started = act(s, { type: 'start-boss' });
  assert.deepEqual(started.battle, preview);
  assert.equal(started.attempt, s.attempt + 1);
  assert.deepEqual(preview.duel.arena.amplifiers, [
    ['amp-04', 'amp-06', null],
    ['amp-04', 'amp-05', 'amp-01'],
  ]);
  assert.throws(() =>
    act(started, { type: 'amplifier', lane: 0, id: 'amp-01' }),
  );
  assert.throws(() =>
    act(started, { type: 'place', uid: s.inventory[0].uid, at: null }),
  );
});

test('wandeng restoration: all original cards and 10 amplifiers survive save/replay and use the original engine route', () => {
  ARENA_CARDS.forEach((card, i) => {
    let s = {
      ...journey(),
      inventory: [
        { uid: `check-${i}`, id: card.id, level: i % 7, at: 0, origin: '验证' },
      ],
    };
    s = act(s, { type: 'amplifier', lane: 0, id: AMPLIFIERS[i % 10].id });
    s = act(s, { type: 'start-boss' });
    const restored = parseWandeng(JSON.stringify(s));
    assert.deepEqual(restored.battle, s.battle);
    assert.deepEqual(
      simulateDuel(restored.battle.duel),
      simulateArenaDuel(s.battle.duel),
    );
  });
});

test('wandeng restoration: amplifier changes are atomic and barrier rupture disables it in the actual battle', () => {
  const original = journey(),
    before = JSON.stringify(original);
  for (const action of [
    { lane: 3, id: 'amp-01' },
    { lane: 0, id: 'bad' },
    { lane: 1.5, id: null },
  ])
    assert.throws(() => act(original, { type: 'amplifier', ...action }));
  assert.equal(JSON.stringify(original), before);
  const s = act(act(original, { type: 'amplifier', lane: 2, id: 'amp-01' }), {
    type: 'start-boss',
  });
  const frames = simulateArenaDuel(s.battle.duel).frames;
  assert.equal(frames[0].barriers[0][2].maxHp, 120);
  const broken = frames.find((f) => f.barriers[1][0].broken);
  assert.ok(broken);
  assert.equal(broken.amplifierActive[1][0], false);
});

test('wandeng restoration: historical duels are frozen, stored once and independent of later growth', () => {
  let s = act(journey(), { type: 'start-boss' });
  const duel = structuredClone(s.battle),
    result = simulateArenaDuel(duel.duel);
  s = act(s, { type: 'resolve-battle' });
  assert.deepEqual(s.history, [duel]);
  assert.throws(() => act(s, { type: 'resolve-battle' }));
  s = act(s, { type: 'continue' });
  s = act(s, { type: 'amplifier', lane: 0, id: 'amp-02' });
  s = act(s, { type: 'repair', uid: s.inventory[0].uid });
  const restored = parseWandeng(JSON.stringify(s));
  assert.deepEqual(simulateArenaDuel(restored.history[0].duel), result);
  const review = arenaReview(duel.duel, result.frames);
  for (const side of [0, 1])
    assert.equal(
      Math.round(review.lanes[side].reduce((n, l) => n + l.host, 0) * 10),
      Math.round((duel.duel.maxHp[side] - result.frames.at(-1).hp[side]) * 10),
    );
});

test('wandeng restoration: old v1 battles are not retrofitted with new enemy amplifiers', () => {
  const old = act(journey(), { type: 'start-boss' });
  old.battle.duel.arena.amplifiers = [
    [null, null, null],
    [null, null, null],
  ];
  delete old.amplifiers;
  delete old.history;
  const expected = simulateArenaDuel(old.battle.duel);
  const migrated = parseWandeng(JSON.stringify(old));
  assert.deepEqual(migrated.amplifiers, [null, null, null]);
  assert.deepEqual(simulateArenaDuel(migrated.battle.duel), expected);
  assert.deepEqual(parseWandeng(JSON.stringify(migrated)), migrated);
});

test('wandeng restoration: old open shops preserve their offer IDs and preparation in duel events remains legal', () => {
  let s = { ...journey(), step: 1 };
  s = act(s, { type: 'choose-event', id: eventOffers(s)[0].id });
  delete s.amplifiers;
  delete s.history;
  const migrated = parseWandeng(JSON.stringify(s));
  assert.equal(migrated.pendingItems.length, 2);
  const id = eventItems(migrated)[0];
  const purchased = act(migrated, { type: 'event-choice', choice: 0 });
  assert.equal(purchased.inventory.at(-1).id, id);
  assert.equal(purchased.pendingItems, undefined);
  s = { ...journey(), step: 1 };
  s = act(s, {
    type: 'choose-event',
    id: eventOffers(s).find((e) => e.kind === 'duel').id,
  });
  s = act(s, { type: 'amplifier', lane: 1, id: 'amp-08' });
  s = act(s, { type: 'place', uid: s.inventory[3].uid, at: 5 });
  const preview = previewWandengBattle(s, 'duel');
  assert.deepEqual(act(s, { type: 'event-choice', choice: 0 }).battle, preview);
});

test('wandeng restoration: malformed historical or imported combat inputs cannot become replay state', () => {
  const b = previewWandengBattle(journey(), 'boss');
  b.duel.arena.amplifiers[0][0] = 'made-up';
  assert.throws(() => validateWandengBattle(b));
  const s = journey();
  s.history = [b];
  assert.throws(() => parseWandeng(JSON.stringify(s)));
  const duplicate = previewWandengBattle(journey(), 'boss');
  duplicate.duel.enemy[0].uid = duplicate.duel.player[0].uid;
  assert.throws(() => validateWandengBattle(duplicate));
});

test('wandeng restoration: portable replay text reproduces input and results without touching a journey', () => {
  const s = journey(),
    before = JSON.stringify(s),
    battle = previewWandengBattle(s, 'boss');
  const encoded = serializeWandengReplay(battle),
    decoded = parseWandengReplay(encoded);
  assert.deepEqual(decoded, battle);
  assert.deepEqual(
    simulateArenaDuel(decoded.duel),
    simulateArenaDuel(battle.duel),
  );
  assert.equal(JSON.stringify(s), before);
  assert.throws(() => parseWandengReplay('{bad'));
  assert.throws(() =>
    parseWandengReplay(JSON.stringify({ version: 2, battle })),
  );
  assert.throws(() => parseWandengReplay('x'.repeat(100001)));
});
