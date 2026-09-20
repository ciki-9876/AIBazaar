import { claimReward } from './test-reward-helper.mjs';
import { floorRoute } from './demo-content.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newRun,
  act,
  makeItem,
  currentFloor,
  currentNode,
  makeDuel,
  playerCards,
  openCells,
  identificationState,
  previewPlacement,
  validSave,
  migrateCargo,
  merchantOffers,
  offerPrice,
  itemCount,
  puzzle,
  bagCap,
} from './demo-engine.ts';
import { isFieldNode, fieldTask } from './field-items.ts';
import { fieldToolState } from './demo-engine.ts';
import { CARDS } from './demo-cards.ts';
import { describeCard } from './card-description.ts';
import { simulateDuel } from './demo-combat.ts';
import { battleEvidence, formatHit } from './battle-evidence.ts';
import { archetypeDuel } from './demo-archetypes.ts';
// Retain coverage of persisted pre-introduction routes (including elite and merchant).
const start = () => {
  const s = newRun(10909);
  s.floors[0].nodes = floorRoute(s.seed, 1);
  s.floors[0].routeVersion = 4;
  return act(s, { type: 'begin' });
};
const card = (id, at, uid = id) => ({
  ...makeItem(uid, id, 'card', 'board'),
  at,
});
const duel = (player, enemy = [card('gapblade', 0, 'enemy')]) => ({
  player,
  enemy,
  maxHp: [5000, 5000],
  weather: 0,
  weatherEnabled: false,
  layout: 0,
  kind: 'guardian',
  name: 'regression',
  botId: null,
});
const reject = (s, action, pattern) => {
  const old = structuredClone(s);
  assert.throws(() => act(s, action), pattern);
  assert.deepEqual(s, old);
};

test('catalog descriptions separate current and future for all cards and quality tiers', () => {
  for (const c of CARDS)
    for (const quality of [0, 1, 2]) {
      const d = describeCard({ ...card(c.id, 0), quality });
      assert.equal(d.future.length, 2 - quality);
      assert.equal(d.unlocked.length, 0);
      assert.ok(d.effects.every((e) => Number.isFinite(e.value)));
      assert.ok(d.innate.length);
      if (c.id === 'nailer' || c.id === 'springbow') {
        const hits = simulateDuel(duel([{ ...card(c.id, 0), quality }]))
          .frames.flatMap((f) => f.hits)
          .filter((h) => h.sourceUid === c.id && h.kind === 'damage');
        assert.equal(hits[0].raw, d.effects[0].value + 16 + quality * 4);
        assert.equal(hits[c.id === 'nailer' ? 2 : 3].raw, d.effects[0].value);
      }
    }
});

test('identification consumes a carried scanner atomically; late table has a lower repeatable cost', () => {
  const s = act(start(), { type: 'enter', floor: 1 });
  s.items.push(makeItem('unknown', 'fuse', 'physical'));
  reject(s, { type: 'scan', id: 'unknown' }, /鉴定仪/);
  s.items.push(makeItem('scanner-test', 'scanner', 'tool', 'warehouse'));
  assert.equal(identificationState(s).allowed, false);
  s.items.at(-1).zone = 'safe';
  const next = act(s, { type: 'scan', id: 'unknown' });
  assert.equal(
    next.items.some((x) => x.uid === 'scanner-test'),
    false,
  );
  assert.equal(next.power, s.power);
  assert.equal(next.material, s.material);
  reject(next, { type: 'scan', id: 'unknown' }, /未鉴定/);
  let b = start();
  b.level = 4;
  b.items.push(makeItem('base-unknown', 'fuse', 'physical', 'warehouse'));
  const gold = b.material;
  b = act(b, { type: 'scan', id: 'base-unknown' });
  assert.equal(b.material, gold - 2);
  assert.equal(b.items.find((x) => x.uid === 'base-unknown').zone, 'warehouse');
});

test('phase1 placement covers sizes, locks, cancellation, full bag, unequal swaps and invalid multi-overlap', () => {
  let s = start();
  const original = structuredClone(s);
  assert.equal(previewPlacement(s, 'starter-gapblade', 0).allowed, true);
  assert.deepEqual(s, original);
  s = act(s, { type: 'place', id: 'starter-gapblade', at: 0 });
  assert.equal(s.items.find((x) => x.uid === 'starter-sealant').at, 6);
  reject(s, { type: 'place', id: 'starter-nailer', at: 2 }, /跨路/);
  reject(s, { type: 'place', id: 'starter-sealant', at: 1 }, /解锁/);
  s.level = 6;
  s.items = s.items.filter((x) => x.zone === 'board');
  // Fill bag using legal compact one-cell stacks; board swaps ignore it.
  for (let i = 0; i < bagCap(s); i++)
    s.items.push(makeItem('full-' + i, 'apple', 'tool'));
  s = act(s, { type: 'place', id: 'starter-nailer', at: 6 }); // two cells swap with one cell; old lane has space.
  assert.equal(s.items.find((x) => x.uid === 'starter-sealant').at, 3);
  reject(s, { type: 'unequip', id: 'starter-sealant' }, /背包/);
  s = act(s, { type: 'place', id: 'starter-sealant', at: 4 });
  assert.equal(s.items.find((x) => x.uid === 'starter-sealant').at, 4);
  // Three-cell candidate would overlap current knife: use fresh board for size boundaries.
  let t = start();
  t.level = 6;
  t.items = [
    card('recoil', 0, 'three'),
    card('recoil', 3, 'two'),
    card('gapblade', 6, 'one'),
  ];
  t = act(t, { type: 'place', id: 'three', at: 3 });
  assert.equal(t.items.find((x) => x.uid === 'two').at, 0);
  t = act(t, { type: 'place', id: 'three', at: 6 });
  assert.equal(t.items.find((x) => x.uid === 'one').at, 3);
  t.items.push(card('gapblade', 4, 'blocker'));
  reject(t, { type: 'place', id: 'three', at: 3 }, /多张/);
  reject(t, { type: 'place', id: 'three', at: 8 }, /跨路/);
  let u = start();
  u.items.push(makeItem('candidate', 'fuse', 'card'));
  u = act(u, { type: 'place', id: 'candidate', at: 0 });
  assert.equal(u.items.find((x) => x.uid === 'starter-sealant').zone, 'bag');
  u = act(u, { type: 'unequip', id: 'candidate' });
  u = act(u, { type: 'equip', id: 'candidate' });
  assert.equal(u.items.find((x) => x.uid === 'candidate').at, 0);
});

test('phase1 unequal swap validates both resulting footprints and keeps old state on failure', () => {
  const s = start();
  s.level = 6;
  s.items = [
    card('recoil', 0, 'two'),
    card('gapblade', 3, 'one'),
    card('gapblade', 4, 'adjacent'),
  ];
  reject(s, { type: 'place', id: 'one', at: 0 }, /占用/);
  assert.equal(s.items.find((x) => x.uid === 'two').at, 0);
});

test('phase1 board position survives legacy migration, save, preview, opening, replay; no node/cost changes', () => {
  let s = start();
  s = act(s, { type: 'place', id: 'starter-gapblade', at: 0 });
  const legacy = JSON.parse(JSON.stringify(s));
  legacy.items.forEach((x) => {
    delete x.slot;
  });
  assert.ok(validSave(legacy));
  s = migrateCargo(legacy);
  assert.deepEqual(playerCards(s), playerCards(legacy));
  s = act(s, { type: 'enter', floor: 1 });
  s.node = currentFloor(s).nodes.indexOf('elite');
  const before = structuredClone(s);
  const preview = makeDuel(s, 'guardian');
  s = act(s, { type: 'place', id: 'starter-sealant', at: 0 });
  assert.equal(s.node, before.node);
  assert.equal(s.stamina, before.stamina);
  assert.equal(s.material, before.material);
  const expected = makeDuel(s, 'guardian');
  s = act(s, { type: 'fight' });
  assert.deepEqual(s.duel.enemy, preview.enemy);
  assert.deepEqual(s.duel, expected);
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  assert.deepEqual(
    simulateDuel(s.duel),
    simulateDuel(JSON.parse(JSON.stringify(s.duel))),
  );
  const snapshot = structuredClone(s.duel);
  s = act(s, { type: 'place', id: 'starter-sealant', at: 6 });
  assert.deepEqual(s.duel, snapshot);
  s = claimReward(act(s, { type: 'resolve' }));
  const resolved = structuredClone(s);
  reject(s, { type: 'resolve' }, /没有/);
  assert.deepEqual(s, resolved);
});

test('phase1 refinement consumes named deterministic copy once, keeps primary; sleep consumes actual supply', () => {
  let s = start();
  s.level = 2;
  s.items.push(makeItem('copy', 'sealant', 'card'));
  const count = s.items.length;
  s = act(s, { type: 'refine', id: 'starter-sealant' });
  assert.equal(s.items.length, count - 1);
  assert.ok(!s.items.some((x) => x.uid === 'copy'));
  assert.equal(s.items.find((x) => x.uid === 'starter-sealant').quality, 1);
  reject(s, { type: 'refine', id: 'starter-sealant' }, /同名/);
  const supply = itemCount(s, 'supply', false);
  const first = s.items.find((x) => x.id === 'supply');
  s = act(s, { type: 'sleep' });
  assert.equal(itemCount(s, 'supply', false), supply - 1);
  assert.match(s.notice, /基地可用总量/);
  assert.equal(
    s.items.find((x) => x.uid === first.uid)?.amount ?? 0,
    first.amount - 1,
  );
  assert.ok(
    s.dailyReport.rows.every((row) => !row.status.includes('低于环境挑战')),
  );
});

test('phase1 early previews are deterministic differences and 5F keeps prior enemy IDs/positions', () => {
  for (const floor of [1, 3, 5]) {
    const s = act(start(), { type: 'enter', floor });
    const enemies = [];
    for (const node of ['patrol', 'elite', 'guardian']) {
      s.node = currentFloor(s).nodes.indexOf(node);
      s.encounter = null;
      const d = makeDuel(s, 'guardian');
      enemies.push(d.enemy.map((x) => [x.id, x.at]));
      const result = simulateDuel(d);
      assert.deepEqual(result, simulateDuel(d));
      assert.ok(result.duration <= 90);
    }
    if (floor <= 3) {
      assert.notDeepEqual(enemies[0], enemies[1]);
      assert.notDeepEqual(enemies[1], enemies[2]);
    } else {
      assert.deepEqual(enemies[0], enemies[1]);
      assert.deepEqual(enemies[1], enemies[2]);
    }
  }
});

test('phase1 same resources / cards, only position changes produce explainable events', () => {
  let s = act(start(), { type: 'enter', floor: 3 });
  s.node = currentFloor(s).nodes.indexOf('elite');
  const a = makeDuel(s, 'guardian');
  s = act(s, { type: 'place', id: 'starter-gapblade', at: 0 });
  const b = makeDuel(s, 'guardian');
  assert.deepEqual(a.enemy, b.enemy);
  assert.deepEqual(a.maxHp, b.maxHp);
  const ra = simulateDuel(a),
    rb = simulateDuel(b);
  assert.notDeepEqual(ra.frames, rb.frames);
  const ea = battleEvidence(a, ra.frames),
    eb = battleEvidence(b, rb.frames);
  assert.notDeepEqual(ea.breaks, eb.breaks);
  assert.ok(ea.hostDamage.every(Number.isFinite));
  const pair = simulateDuel(duel([card('fuse', 0), card('gapblade', 1)]));
  const hit = pair.frames
    .flatMap((f) => f.hits)
    .find((h) => h.kind === 'charge');
  assert.equal(hit.targetUid, 'gapblade');
  assert.match(hit.targetName, /猎隙刃/);
  assert.ok(hit.value > 0);
  assert.match(
    formatHit(duel([card('fuse', 0), card('gapblade', 1)]), hit, 6),
    /我方.*引信线.*我方.*猎隙刃/,
  );
  const solo = simulateDuel(duel([card('fuse', 0)]));
  assert.ok(
    solo.frames.flatMap((f) => f.log).some((x) => x.includes('实际生效 0 秒')),
  );
});

test('phase1 lab route/variant input reaches simulation and same serialized input replays exactly', () => {
  const a = archetypeDuel('rush', 'erosion');
  const b = structuredClone(a);
  b.player = b.player.map((c) => ({ ...c, at: (c.at + 3) % 9 }));
  assert.notDeepEqual(simulateDuel(a).frames, simulateDuel(b).frames);
  const c = structuredClone(a);
  c.player[0].id = 'springbow';
  assert.notDeepEqual(simulateDuel(a).frames, simulateDuel(c).frames);
  assert.deepEqual(
    simulateDuel(c),
    simulateDuel(JSON.parse(JSON.stringify(c))),
  );
});

test('phase1 guaranteed low-cost natural acquisition before second departure, no injected ideal inventory', () => {
  let s = act(start(), { type: 'enter', floor: 1 });
  for (let guard = 0; guard < 30 && currentNode(s) !== 'merchant'; guard++) {
    const node = currentNode(s);
    if (['patrol', 'elite', 'guardian'].includes(node)) {
      s = act(s, { type: 'fight' });
      s = claimReward(act(s, { type: 'resolve' }));
    } else if (isFieldNode(node)) {
      const tool = s.items.find((x) => fieldToolState(s, x.uid).allowed);
      s = act(s, {
        type: 'field-work',
        ...(tool
          ? {
              id: tool.uid,
              choice: fieldTask(s.seed, s.floor, node).answer,
              at: 0,
            }
          : { choice: -1 }),
      });
    } else if (node === 'puzzle')
      s = act(s, { type: 'puzzle', choice: puzzle(s).answer });
    else s = act(s, { type: node === 'search' ? 'skip' : node });
  }
  assert.equal(currentNode(s), 'merchant');
  s = act(s, { type: 'open-trade' });
  const offer = merchantOffers(s).find((x) => x.id === 'rubber');
  assert.equal(offerPrice(offer), 4);
  const before = s.material;
  s = act(s, { type: 'trade', id: offer.uid });
  assert.equal(s.material, before - 4);
  assert.equal(s.items.find((x) => x.uid === offer.uid).type, 'physical');
  s = act(s, { type: 'extract' });
  s = act(s, { type: 'buy-scanner' });
  s = act(s, { type: 'scan', id: offer.uid });
  s = act(s, { type: 'place', id: offer.uid, at: 0 });
  assert.equal(s.level, 1);
  assert.equal(openCells(s).length, 4);
  assert.equal(s.items.find((x) => x.uid === offer.uid).zone, 'board');
  s = act(s, { type: 'sleep' });
  s = act(s, { type: 'enter', floor: 3 });
  s.node = currentFloor(s).nodes.indexOf('patrol');
  const nextBattle = makeDuel(s, 'guardian');
  assert.ok(
    simulateDuel(nextBattle)
      .frames.flatMap((f) => f.hits)
      .some(
        (h) =>
          h.kind === 'damage' &&
          h.targetLane === 0 &&
          h.side === 0 &&
          h.blocked > 0,
      ),
  );
  assert.ok(validSave(s));
});

test('phase1 legacy daily-report wording is corrected without altering past outcomes', () => {
  const s = start();
  s.bots[0].status = '4 层构筑强度 37 低于环境挑战 36，回收 -3 生命';
  const before = structuredClone(s);
  const next = migrateCargo(s);
  assert.match(next.bots[0].status, /环境波动/);
  assert.equal(next.bots[0].quota, s.bots[0].quota);
  assert.deepEqual(s, before);
});
