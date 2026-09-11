import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newRun,
  act,
  currentFloor,
  merchantOffers,
  offerPrice,
  sellPrice,
  makeItem,
  volume,
  bagCap,
  validSave,
  RARITY,
  unlockedItem,
} from './demo-engine.ts';
import { floorRoute, puzzleSpec, sceneTitle } from './demo-content.ts';
import { simulateDuel } from './demo-combat.ts';
const start = (seed = 123) => act(newRun(seed), { type: 'begin' });
function go(s, target) {
  return { ...s, node: currentFloor(s).nodes.indexOf(target) };
}
function enterNode(target, seed = 123) {
  let s = start(seed);
  const floor = s.floors.find((f) => f.nodes.includes(target)).id;
  s = act(s, { type: 'enter', floor });
  return go(s, target);
}
test('v1.1: generation varies route length/order, content rules and thematic identities, not only floor names', () => {
  const routes = Array.from({ length: 40 }, (_, seed) => floorRoute(seed, 1));
  assert.ok(new Set(routes.map((x) => x.join(','))).size > 15);
  assert.ok(new Set(routes.map((x) => x.length)).size >= 2);
  for (const route of routes) {
    assert.equal(route.at(-1), 'guardian');
    assert.ok(route.includes('search'));
  }
  assert.deepEqual(floorRoute(42, 3), floorRoute(42, 3));
  assert.notEqual(
    sceneTitle('月面金库', 'event'),
    sceneTitle('倒置医院', 'event'),
  );
  assert.ok(
    new Set(Array.from({ length: 20 }, (_, i) => puzzleSpec(i, 1, 1).hint))
      .size === 3,
  );
});
test('v1.1: search holds position, charges once, persists save and exits only on explicit next', () => {
  let s = enterNode('search');
  const node = s.node,
    stamina = s.stamina;
  s = act(s, { type: 'search' });
  assert.equal(s.node, node);
  assert.equal(s.interaction, 'search');
  assert.ok(s.stamina < stamina);
  assert.throws(() => act(s, { type: 'search' }));
  assert.throws(() => act(s, { type: 'skip' }));
  const item = currentFloor(s).stock.find(
    (x) => unlockedItem(s, x.id) && x.type !== 'resource',
  );
  s = act(s, { type: 'pickup', id: item.uid });
  assert.ok(s.items.some((x) => x.uid === item.uid && x.zone === 'bag'));
  assert.ok(!currentFloor(s).stock.some((x) => x.uid === item.uid));
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  s = act(s, { type: 'next-node' });
  assert.equal(s.node, node + 1);
  assert.equal(s.interaction, null);
  assert.throws(() =>
    act(s, {
      type: 'pickup',
      id: currentFloor(s).stock.find((x) => unlockedItem(s, x.id)).uid,
    }),
  );
});
test('v1.1: merchant shows persistent offers; a full bag rejects atomically, selling frees room and buys once', () => {
  let s = enterNode('merchant');
  s = act(s, { type: 'open-trade' });
  const node = s.node,
    offers = merchantOffers(s);
  assert.ok(offers.length >= 4);
  assert.deepEqual(offers, merchantOffers(s));
  while (volume(s.items.filter((x) => x.zone === 'bag')) < bagCap(s))
    s.items.push(makeItem(`filler-${s.items.length}`, 'scrap', 'resource'));
  const old = structuredClone(s),
    offer = offers.find((x) => x.volume === 1);
  assert.throws(() => act(s, { type: 'trade', id: offer.uid }), /背包/);
  assert.deepEqual(s, old);
  const sale = s.items.find((x) => x.id === 'apple');
  const before = s.material;
  s = act(s, { type: 'sell', id: sale.uid });
  assert.equal(s.material, before + sellPrice(sale));
  s = act(s, { type: 'trade', id: offer.uid });
  assert.equal(s.material, before + sellPrice(sale) - offerPrice(offer));
  assert.equal(s.node, node);
  assert.equal(s.interaction, 'trade');
  assert.ok(s.items.some((x) => x.uid === offer.uid));
  assert.throws(() => act(s, { type: 'trade', id: offer.uid }));
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  s = act(s, { type: 'next-node' });
  assert.equal(s.interaction, null);
  assert.throws(() => act(s, { type: 'sell', id: s.items[0].uid }));
});
test('v1.1: legacy saved routes stay valid while untouched floors adopt new content on entry', () => {
  let s = start();
  for (const floor of s.floors) {
    delete floor.routeVersion;
    delete floor.soldOffers;
    floor.nodes = ['event', 'search', 'puzzle', 'merchant', 'guardian'];
  }
  delete s.interaction;
  assert.ok(validSave(s));
  s = act(s, { type: 'enter', floor: 1 });
  assert.equal(currentFloor(s).routeVersion, 3);
  assert.deepEqual(currentFloor(s).nodes, floorRoute(s.seed, 1));
  const old = s.floors[1];
  old.visitors = [0];
  const route = [...old.nodes];
  s = act(s, { type: 'extract' });
  s = act(s, { type: 'sleep' });
  s = act(s, { type: 'enter', floor: 2 });
  assert.deepEqual(currentFloor(s).nodes, route);
  assert.ok(validSave(s));
});
test('v1.1: all emitted card projectiles carry real source and target entities, charge lands on cards', () => {
  const card = (uid, id, at) => ({
    uid,
    id,
    at,
    rarity: 0,
    quality: 2,
    level: 1,
  });
  const player = [
      card('p1', 'wire', 0),
      card('p2', 'bell', 1),
      card('p3', 'bottle', 3),
      card('p4', 'cell', 6),
    ],
    enemy = [card('e1', 'knife', 0), card('e2', 'shelter', 3)];
  const r = simulateDuel({
    player,
    enemy,
    maxHp: [500, 500],
    weather: 0,
    layout: 0,
    name: 'fixture',
    kind: 'guardian',
    botId: null,
  });
  const ids = new Set(
    [...player, ...enemy]
      .map((x) => x.uid)
      .concat(
        [0, 1].flatMap((side) =>
          [0, 1, 2].flatMap((lane) => [
            `barrier-${side}-${lane}`,
            `host-${side}-lane-${lane}`,
          ]),
        ),
      ),
  );
  const effects = r.frames.flatMap((f) => f.hits).filter((h) => h.sourceUid);
  for (const h of effects) {
    assert.ok(ids.has(h.sourceUid));
    assert.ok(ids.has(h.targetUid ?? `host-${h.side}`));
  }
  assert.ok(effects.some((h) => h.kind === 'charge' && h.targetUid === 'p1'));
  assert.ok(
    effects.some((h) => h.kind === 'heal' && h.targetUid === 'host-0-lane-1'),
  );
  assert.ok(effects.some((h) => h.kind === 'shield' && h.visual === 'armor'));
  assert.equal(RARITY[3].name, '传说');
});
test('v1.1: a sealed encounter is followed by exactly one clearly identified guardian stage', () => {
  let s = start(55);
  s = act(s, { type: 'enter', floor: 1 });
  s = go(s, 'guardian');
  s.encounter = 1;
  s.encounterDone = false;
  s.items
    .filter((x) => x.type === 'card')
    .forEach((x) => {
      x.level = 3;
      x.quality = 2;
    });
  const node = s.node;
  s = act(s, { type: 'fight' });
  assert.equal(s.duel.kind, 'survivor');
  s = act(s, { type: 'resolve' });
  assert.equal(s.node, node);
  assert.equal(s.encounterDone, true);
  assert.match(s.notice, /1\/2/);
  s = act(s, { type: 'fight' });
  assert.equal(s.duel.kind, 'guardian');
  s = act(s, { type: 'resolve' });
  assert.ok(s.objective);
  assert.equal(s.node, node + 1);
  assert.match(s.notice, /全部战斗结束/);
  assert.throws(() => act(s, { type: 'fight' }));
});
