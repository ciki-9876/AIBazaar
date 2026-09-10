import test from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  newRun,
  migrateCargo,
  itemCount,
  makeItem,
  validSave,
  currentFloor,
  searchCost,
} from './demo-engine.ts';
import { simulateDuel, reviveTimeOf, armorOf } from './demo-combat.ts';
const start = () => act(newRun(515), { type: 'begin' });
const fighter = (id, at, uid = id) => ({
  id,
  at,
  uid,
  quality: 2,
  level: 0,
  rarity: 0,
});

test('physical supplies migrate losslessly and facilities consume real item units', () => {
  const old = newRun(51),
    next = migrateCargo(old);
  for (const id of ['supply', 'fuel', 'medicine', 'scrap']) {
    assert.equal(itemCount(next, id, false), old[id]);
    assert.equal(next[id], 0);
    assert.ok(next.items.find((x) => x.id === id && x.type === 'tool'));
  }
  assert.ok(next.installed.includes('identify'));
  assert.ok(validSave(next));
  assert.deepEqual(migrateCargo(next), next);
  let s = start();
  s.level = 3;
  s = act(s, { type: 'build', id: 'generator' });
  const before = itemCount(s, 'fuel', false),
    power = s.power;
  s = act(s, { type: 'facility', id: 'generator' });
  assert.equal(itemCount(s, 'fuel', false), before - 1);
  assert.equal(s.power, power + 8);
  s.items.push(makeItem('med-test', 'medicine', 'tool', 'bag', 3));
  s.stamina = 20;
  s = act(s, { type: 'consume', id: 'med-test' });
  assert.equal(s.stamina, 55);
  assert.equal(s.items.find((x) => x.uid === 'med-test').amount, 2);
});

test('sleep advances once and records the prior day for all 99 rivals', () => {
  const s = start(),
    before = structuredClone(s),
    next = act(s, { type: 'sleep' });
  assert.deepEqual(s, before);
  assert.equal(next.day, s.day + 1);
  assert.equal(next.quota, s.quota - 1);
  assert.equal(
    itemCount(next, 'supply', false),
    itemCount(s, 'supply', false) - 1,
  );
  assert.equal(next.dailyReport.day, s.day);
  assert.equal(next.dailyReport.rows.length, 99);
  for (const row of next.dailyReport.rows) {
    const bot = next.bots.find((x) => x.id === row.id);
    assert.equal(row.floor, bot.floor);
    assert.equal(row.alive, bot.alive);
    assert.equal(row.status, bot.status);
  }
  assert.ok(validSave(JSON.parse(JSON.stringify(next))));
});

test('disabled weather has no effect and former shelter weather passive now adds armor', () => {
  const d = {
    player: [fighter('knife', 0, 'p'), fighter('shelter', 1, 's')],
    enemy: [fighter('knife', 0, 'e')],
    maxHp: [1000, 1000],
    weather: 0,
    weatherEnabled: false,
    layout: 0,
    name: 'test',
    kind: 'guardian',
    botId: null,
  };
  const r = simulateDuel(d);
  for (const weather of [1, 2, 3])
    assert.deepEqual(simulateDuel({ ...d, weather }), r);
  assert.ok(
    r.frames.some((f) =>
      f.hits.some(
        (h) => h.targetUid === 'p' && h.armor === armorOf(d.player[0]) + 20,
      ),
    ),
  );
  const s = start();
  assert.equal(searchCost(s), 10);
});

test('revival depends on size; host damage retains its lane; collapse produces no damage', () => {
  assert.equal(reviveTimeOf(fighter('knife', 0)), 6);
  assert.equal(reviveTimeOf(fighter('shelter', 0)), 8);
  assert.equal(reviveTimeOf(fighter('battery', 0)), 10);
  const d = {
    player: [fighter('knife', 6, 'p')],
    enemy: [],
    maxHp: [10000, 10000],
    weather: 0,
    weatherEnabled: false,
    layout: 0,
    name: 'test',
    kind: 'guardian',
    botId: null,
  };
  const r = simulateDuel(d);
  assert.ok(
    r.frames.some((f) =>
      f.hits.some(
        (h) => h.sourceUid === 'p' && h.targetLane === 2 && !h.targetUid,
      ),
    ),
  );
  assert.ok(
    r.frames.every((f) => !f.hits.some((h) => h.source === '空间坍缩')),
  );
  const passive = simulateDuel({ ...d, player: [] });
  assert.deepEqual(passive.frames.at(-1).hp, d.maxHp);
  assert.equal(passive.duration, 60);
  assert.equal(passive.timedOut, true);
});

test('inventory and board moves are reversible; invalid cross-lane placement is atomic', () => {
  let s = start();
  s = act(s, { type: 'move', id: 'starter-shelter', to: 'bag', slot: 4 });
  const before = structuredClone(s);
  assert.throws(() =>
    act(s, { type: 'move', id: 'starter-shelter', to: 'board', at: 2 }),
  );
  assert.deepEqual(s, before);
  s = act(s, { type: 'move', id: 'starter-shelter', to: 'board', at: 3 });
  assert.equal(s.items.find((x) => x.uid === 'starter-shelter').zone, 'board');
  s = act(s, { type: 'move', id: 'starter-shelter', to: 'bag', slot: 4 });
  assert.equal(s.items.find((x) => x.uid === 'starter-shelter').slot, 4);
  s = act(s, { type: 'enter', floor: 1 });
  s.node = currentFloor(s).nodes.indexOf('search');
  s = act(s, { type: 'search' });
  const card = currentFloor(s).stock.find((x) => x.type === 'physical');
  s = act(s, { type: 'pickup', id: card.uid });
  assert.ok(
    s.items.some(
      (x) => x.uid === card.uid && x.zone === 'bag' && Number.isInteger(x.slot),
    ),
  );
});
