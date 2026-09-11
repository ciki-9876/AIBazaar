import { refineIngredient } from './demo-engine.ts';
import { growthCost } from './demo-card-rules.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newRun,
  act,
  itemCount,
  validSave,
  playerCards,
  currentNode,
  puzzle,
  currentFloor,
  bagCap,
  safeCap,
  rescueCost,
  ranking,
} from './demo-engine.ts';
import { simulateDuel } from './demo-combat.ts';
const start = (seed = 123) => act(newRun(seed), { type: 'begin' });
const doAct = (s, type, rest = {}) => act(s, { type, ...rest });
// Position fixtures at the node under test; the journey test traverses the actual route.
function advance(s, target) {
  return { ...s, node: currentFloor(s).nodes.indexOf(target) };
}
function gather(s) {
  for (const x of currentFloor(s).stock.filter(
    (x) =>
      (x.type === 'resource' && ['material', 'supply'].includes(x.id)) ||
      x.id === 'apple' ||
      (x.type === 'physical' && ['knife', 'wire'].includes(x.id)),
  )) {
    try {
      s = doAct(s, 'pickup', { id: x.uid });
    } catch {}
  }
  return s;
}
function explore(s) {
  for (
    let guard = 0;
    guard < 30 && s.phase === 'floor' && !s.objective;
    guard++
  ) {
    const apple = s.items.find(
      (x) => x.id === 'apple' && ['bag', 'safe'].includes(x.zone),
    );
    if (s.stamina < 30 && apple) s = doAct(s, 'consume', { id: apple.uid });
    const n = currentNode(s);
    if (s.interaction === 'search') {
      s = gather(s);
      s = doAct(s, 'next-node');
    } else if (n === 'search') s = doAct(s, 'search');
    else if (['event', 'rest', 'hazard'].includes(n)) s = doAct(s, n);
    else if (n === 'puzzle')
      s = doAct(s, 'puzzle', { choice: puzzle(s).answer });
    else if (n === 'cache') s = doAct(s, 'cache', { choice: 2 });
    else if (n === 'bargain') s = doAct(s, 'bargain');
    else if (n === 'merchant') s = doAct(s, 'skip');
    else if (['patrol', 'elite', 'guardian'].includes(n)) {
      s = doAct(s, 'fight');
      s = doAct(s, 'resolve');
    }
  }
  return s;
}
test('demo: deterministic ten-floor worlds change themes by seed, with 99 peers and 12 quotas', () => {
  assert.deepEqual(newRun(7), newRun(7));
  assert.notEqual(newRun(7).floors[0].name, newRun(71).floors[0].name);
  const s = start();
  assert.equal(s.quota, 12);
  assert.equal(s.bots.length, 99);
  assert.ok(s.bots.every((x) => x.quota === 12));
  assert.equal(new Set(s.floors.map((f) => f.name)).size, 10);
  assert.ok(validSave(s));
});
test('demo: full ten-floor journey completes through real battles, growth, sleep, save/restore and extraction', () => {
  for (const seed of [12, 123, 711]) {
    let s = start(seed);
    for (let floor = 1; floor <= 10; floor++) {
      // Unlock room for looted damage cards before growing the starting pair.
      if (s.level < 4 && s.material >= 5 + s.level) s = doAct(s, 'upgrade');
      for (const id of ['starter-knife', 'starter-wire']) {
        let card = s.items.find((x) => x.uid === id);
        if (
          card.level < 5 &&
          itemCount(s, 'scrap', false) >= growthCost(card.level)
        )
          s = doAct(s, 'grow', { id });
        card = s.items.find((x) => x.uid === id);
        if (card.quality < 1 && refineIngredient(s, card))
          s = doAct(s, 'refine', { id });
      }
      if (s.level < 4 && s.material >= 5 + s.level) s = doAct(s, 'upgrade');
      s = doAct(s, 'enter', { floor });
      s = explore(s);
      assert.equal(
        s.phase,
        'floor',
        `seed ${seed}, floor ${floor}: ${s.notice} ${JSON.stringify(playerCards(s))} mat${s.material}`,
      );
      assert.ok(s.objective);
      assert.ok(validSave(JSON.parse(JSON.stringify(s))));
      const apple = s.items.find(
        (x) => x.id === 'apple' && ['bag', 'safe'].includes(x.zone),
      );
      if (s.stamina < 8 && apple) s = doAct(s, 'consume', { id: apple.uid });
      s = doAct(s, 'extract');
      assert.equal(s.best, floor);
      if (floor < 10) {
        for (const x of [...s.items].filter((x) => x.type === 'physical')) {
          s = doAct(s, 'scan', { id: x.uid });
          for (const at of [1, 2, 5, 7, 8]) {
            try {
              s = doAct(s, 'move', { id: x.uid, to: 'board', at });
              break;
            } catch {}
          }
        }
      }
      if (floor < 10) s = doAct(s, 'sleep');
    }
    assert.equal(s.phase, 'ended');
    assert.equal(s.quota, 3);
    assert.equal(s.best, 10);
    assert.ok(s.ending.includes('完成'));
    assert.throws(() => doAct(s, 'extract'));
  }
});
test('demo: item zones conserve identities and volume; multi-cell cards cannot cross lanes or use locked cells', () => {
  let s = start();
  const initial = structuredClone(s);
  assert.throws(
    () => doAct(s, 'move', { id: 'starter-shelter', to: 'board', at: 2 }),
    /跨路/,
  );
  assert.deepEqual(s, initial);
  s = doAct(s, 'move', { id: 'starter-shelter', to: 'bag' });
  assert.equal(s.items.find((x) => x.uid === 'starter-shelter').zone, 'bag');
  s = doAct(s, 'move', { id: 'starter-shelter', to: 'safe' });
  assert.equal(safeCap(s), 2);
  assert.throws(() => doAct(s, 'move', { id: 'lighter', to: 'safe' }), /容量/);
  assert.equal(new Set(s.items.map((x) => x.uid)).size, s.items.length);
  assert.equal(bagCap(s), 12);
});
test('demo: scanner needs carried tool and charge, rarity locks once, scanning is atomic', () => {
  let s = doAct(doAct(start(), 'upgrade'), 'upgrade');
  s = doAct(s, 'move', { id: 'scanner', to: 'bag' });
  s = doAct(s, 'enter', { floor: 1 });
  s = advance(s, 'search');
  s = doAct(s, 'search');
  const raw = currentFloor(s).stock.find((x) => x.type === 'physical');
  s = doAct(s, 'pickup', { id: raw.uid });
  assert.equal(s.items.find((x) => x.uid === raw.uid).rarity, undefined);
  s = doAct(s, 'scan', { id: raw.uid });
  const locked = s.items.find((x) => x.uid === raw.uid).rarity;
  assert.equal(s.charges, 0);
  assert.throws(() => doAct(s, 'scan', { id: raw.uid }));
  assert.equal(s.items.find((x) => x.uid === raw.uid).rarity, locked);
});
test('demo: retreat does not count objective, persistent stock is conserved and same-floor retry is allowed', () => {
  let s = start();
  s = doAct(s, 'enter', { floor: 2 });
  s = advance(s, 'search');
  s = doAct(s, 'search');
  const x = currentFloor(s).stock[0];
  s = doAct(s, 'pickup', { id: x.uid });
  s = doAct(s, 'extract');
  assert.equal(s.best, 0);
  assert.ok(!s.floors[1].stock.some((i) => i.uid === x.uid));
  assert.throws(() => doAct(s, 'enter', { floor: 2 }));
  s = doAct(s, 'sleep');
  assert.equal(doAct(s, 'enter', { floor: 1 }).floor, 1);
  assert.equal(s.floor, 0);
  s = doAct(s, 'enter', { floor: 2 });
  assert.equal(s.phase, 'floor');
});
test('demo: rescue preserves board, secure and base, costs keep rising beyond 9 and sleep does not reset', () => {
  let s = doAct(doAct(start(), 'upgrade'), 'upgrade');
  s = doAct(s, 'move', { id: 'scanner', to: 'safe' });
  s = doAct(s, 'enter', { floor: 1 });
  s = doAct(s, 'rescue');
  assert.equal(s.quota, 9);
  assert.ok(!s.items.some((x) => x.id === 'apple'));
  assert.equal(playerCards(s).length, 3);
  assert.ok(s.items.some((x) => x.id === 'scanner'));
  s = doAct(s, 'sleep');
  assert.equal(rescueCost(s), 5);
  s = doAct(s, 'enter', { floor: 1 });
  s = doAct(s, 'extract');
  assert.equal(rescueCost(s), 3);
  assert.equal(rescueCost({ ...s, streak: 5 }), 13);
});
test('demo: initial identification is permanent; weather is unavailable and production obeys daily limits', () => {
  let s = start();
  s.level = 4;
  assert.ok(s.installed.includes('identify'));
  assert.throws(() => doAct(s, 'remove', { id: 'identify' }));
  assert.throws(() => doAct(s, 'build', { id: 'weather' }));
  s = doAct(s, 'build', { id: 'generator' });
  s = doAct(s, 'facility', { id: 'generator' });
  assert.throws(() => doAct(s, 'facility', { id: 'generator' }));
  s = doAct(s, 'remove', { id: 'generator' });
  s = doAct(s, 'build', { id: 'generator' });
  assert.throws(() => doAct(s, 'facility', { id: 'generator' }));
  s = doAct(s, 'sleep');
  s = doAct(s, 'facility', { id: 'generator' });
  assert.equal(s.forecast, false);
});

test('demo: deterministic immutable combat uses individual rarity/levels and emits owner effect events', () => {
  let s = start();
  s = doAct(s, 'enter', { floor: 1 });
  s = advance(s, 'guardian');
  s = doAct(s, 'fight');
  const copy = structuredClone(s.duel),
    r = simulateDuel(s.duel);
  assert.deepEqual(simulateDuel(s.duel), r);
  assert.deepEqual(s.duel, copy);
  assert.ok(
    r.frames.some((f) =>
      f.hits.some((h) => h.kind === 'damage' && h.side === 1),
    ),
  );
  assert.ok(validSave(s));
  assert.throws(() => doAct(s, 'move', { id: 'starter-knife', to: 'bag' }));
  s = doAct(s, 'resolve');
  assert.throws(() => doAct(s, 'resolve'));
});
test('demo: bots progress with reasons, never descend, share actual stock and deduct the same daily quota', () => {
  let s = start();
  for (let day = 0; day < 6; day++) {
    const previous = s.bots.map((b) => b.floor),
      stock = s.floors.reduce((n, f) => n + f.stock.length, 0);
    s = doAct(s, 'sleep');
    assert.ok(s.bots.every((b, i) => b.floor >= previous[i]));
    assert.ok(s.floors.reduce((n, f) => n + f.stock.length, 0) <= stock);
  }
  assert.ok(s.bots.filter((b) => b.alive).every((b) => b.floor >= 6));
  assert.deepEqual(
    s,
    Array.from({ length: 6 }).reduce((x) => doAct(x, 'sleep'), start()),
  );
  assert.ok(ranking(s).every((x) => x.rank >= 1));
});
test('demo: corrupt versions, invalid levels, overlapping boards and incomplete snapshots are rejected', () => {
  const s = start();
  assert.equal(validSave({ ...s, version: 2 }), false);
  assert.equal(validSave({ ...s, level: 99 }), false);
  assert.equal(validSave({ ...s, phase: 'combat', duel: null }), false);
  s.items.find((x) => x.uid === 'starter-knife').at = 0;
  assert.equal(validSave(s), false);
});

test('demo: final-floor defeat permits retry while quota remains, without granting a clear', () => {
  let s = start(11);
  s = doAct(s, 'enter', { floor: 10 });
  s = advance(s, 'guardian');
  s = doAct(s, 'fight');
  s.duel.maxHp[0] = 1;
  s.duel.enemy = [
    {
      uid: 'fixture-enemy',
      id: 'knife',
      at: 0,
      rarity: 4,
      quality: 2,
      level: 5,
    },
  ];
  s = doAct(s, 'resolve');
  assert.equal(s.phase, 'base');
  assert.equal(s.quota, 9);
  assert.equal(s.best, 0);
  s = doAct(s, 'sleep');
  s = doAct(s, 'enter', { floor: 10 });
  assert.equal(s.floor, 10);
  assert.equal(s.phase, 'floor');
});
test('demo: lost scanner is replaceable and inventory corruption is rejected before rendering', () => {
  let s = doAct(doAct(start(), 'upgrade'), 'upgrade');
  s = doAct(s, 'move', { id: 'scanner', to: 'bag' });
  s = doAct(s, 'enter', { floor: 1 });
  s = doAct(s, 'rescue');
  s = doAct(s, 'craft-scanner');
  assert.ok(s.items.some((x) => x.id === 'scanner'));
  assert.throws(() => doAct(s, 'craft-scanner'));
  assert.equal(validSave({ ...s, moduleCap: 999 }), false);
  const corrupt = structuredClone(s);
  corrupt.items[0].id = 'unknown';
  assert.equal(validSave(corrupt), false);
});
test('demo: all installed facilities change real shared resources and preparation affects the next search', () => {
  const fixtures = {
    grow: 'supply',
    generator: 'power',
    clinic: 'stamina',
    recycle: 'material',
    workshop: 'charges',
    storage: 'fuel',
    adapt: 'adapted',
  };
  for (const [id, key] of Object.entries(fixtures)) {
    let s = start();
    s.level = 6;
    s.stamina = 50;
    s = doAct(s, 'build', { id });
    const read = (state) =>
      ['supply', 'fuel'].includes(key)
        ? itemCount(state, key, false)
        : state[key];
    const before = read(s);
    s = doAct(s, 'facility', { id });
    assert.notEqual(read(s), before);
    assert.throws(() => doAct(s, 'facility', { id }));
    if (id === 'adapt') {
      s = doAct(s, 'enter', { floor: 1 });
      assert.ok(s.prepared);
      assert.equal(s.adapted, false);
    }
  }
});
