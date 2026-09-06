import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld,
  expeditionStart,
  expeditionAction,
  cargoStart,
  cargoAction,
  cargoVolume,
  cardPower,
  newLedger,
  tickLedger,
  replayLedger,
  rankEntries,
} from './design-model.ts';
import {
  emptyReview,
  parseReviews,
  serializeReviews,
  exportReviews,
} from './design-review.ts';

test('world: 100 unique blueprints are deterministic, with new content across seeds', () => {
  const first = createWorld(907);
  assert.equal(first.length, 100);
  assert.deepEqual(first, createWorld(907));
  assert.notDeepEqual(first, createWorld(908));
  assert.equal(
    new Set(first.map((f) => `${f.name}|${f.anomaly}|${f.objective}`)).size,
    100,
  );
  for (const [i, f] of first.entries()) {
    assert.equal(f.id, i + 1);
    assert.equal(f.nodes[0], '入口');
    assert.equal(f.nodes.at(-1), '撤离');
    assert.ok(f.nodes.includes('主目标'));
    assert.ok(f.stock >= 8 && f.stock <= 16);
    if (i) assert.ok(f.budget > first[i - 1].budget);
  }
  assert.ok(createWorld(907, true).every((f) => f.fallback));
});
test('cargo: physical objects have no rarity; scanning preserves capacity and charges once', () => {
  const before = cargoStart();
  assert.ok(before.bag.every((x) => !Object.hasOwn(x, 'rarity')));
  const scanned = cargoAction(before, 'scan', 'knife-001');
  assert.equal(cargoVolume(scanned), cargoVolume(before));
  assert.equal(before.charges, 2);
  assert.equal(scanned.charges, 1);
  assert.equal(scanned.cycles, 1);
  const card = scanned.bag.find((x) => x.uid === 'card-knife-001');
  assert.equal(card.kind, 'card');
  assert.ok(card.rarity >= 0 && card.rarity <= 3);
  const retried = cargoAction(scanned, 'scan', 'knife-001');
  assert.deepEqual(retried.bag, scanned.bag);
  assert.equal(retried.charges, 1);
  assert.equal(retried.cycles, 1);
  const pickedBack = cargoAction(
    cargoAction(scanned, 'drop', card.uid),
    'take',
    card.uid,
  );
  assert.deepEqual(
    pickedBack.bag.find((x) => x.uid === card.uid),
    card,
  );
  assert.throws(() => cargoAction(pickedBack, 'scan', card.uid), /尚未鉴定/);
});
test('cargo: overcapacity and missing scanner reject atomically', () => {
  let s = cargoStart();
  s = cargoAction(s, 'take', 'return-001');
  s = cargoAction(s, 'take', 'sling-001');
  s = cargoAction(s, 'take', 'battery-001');
  assert.equal(cargoVolume(s), 12);
  const snapshot = structuredClone(s);
  assert.throws(() => cargoAction(s, 'take', 'medkit-001'), /容量不足/);
  assert.deepEqual(s, snapshot);
  assert.throws(
    () =>
      cargoAction(
        cargoAction(cargoStart(), 'drop', 'scanner-001'),
        'scan',
        'knife-001',
      ),
    /携带便携/,
  );
});
test('cargo: empty charges cannot identify a new object, but duplicate receipt stays idempotent', () => {
  let s = cargoAction(cargoStart(), 'scan', 'knife-001');
  s = cargoAction(s, 'scan', 'lighter-001');
  s = cargoAction(s, 'take', 'sling-001');
  assert.equal(s.charges, 0);
  assert.throws(() => cargoAction(s, 'scan', 'sling-001'), /耗尽/);
  assert.equal(cargoAction(s, 'scan', 'knife-001').charges, 0);
});
test('expedition: early extraction saves loot without claiming the current floor', () => {
  let s = expeditionAction(expeditionStart(), 'search');
  s = expeditionAction(s, 'retreat');
  s = expeditionAction(s, 'return-step');
  assert.equal(s.phase, 'extracted');
  assert.equal(s.best, 7);
  assert.equal(s.loot.length, 1);
  assert.throws(() => expeditionAction(s, 'search'), /此阶段/);
});
test('expedition: main objective does not count until extraction finishes', () => {
  let s = expeditionStart();
  for (let i = 0; i < 3; i++) s = expeditionAction(s, 'advance');
  assert.equal(s.objective, true);
  assert.equal(s.best, 7);
  const returning = expeditionAction(s, 'retreat');
  const dead = expeditionAction(returning, 'defeat');
  assert.equal(dead.best, 7);
  assert.equal(dead.carried, 0);
  assert.equal(dead.phase, 'dead');
  s = returning;
  for (let i = 0; i < 4; i++) s = expeditionAction(s, 'return-step');
  assert.equal(s.phase, 'extracted');
  assert.equal(s.best, 12);
  assert.equal(s.supply, 2);
});
test('expedition: unaffordable return fails, one-use emergency extracts without inventing objectives', () => {
  const poor = { ...expeditionStart(), supply: 0 };
  assert.throws(() => expeditionAction(poor, 'retreat'), /资源不足/);
  const escaped = expeditionAction(poor, 'emergency');
  assert.equal(escaped.phase, 'extracted');
  assert.equal(escaped.carried, 4);
  assert.equal(escaped.best, 7);
  assert.throws(() => expeditionAction(escaped, 'emergency'), /回程器/);
  const full = { ...expeditionStart(), carried: 12 };
  assert.throws(() => expeditionAction(full, 'search'), /背包已满/);
  assert.equal(full.supply, 9);
});
test('cards: quality and levels improve a locked rarity, with bounded rarity advantage', () => {
  assert.ok(cardPower(1, 1, 0) > cardPower(1, 0, 0));
  assert.ok(cardPower(1, 0, 1) > cardPower(1, 0, 0));
  assert.ok(cardPower(3, 0, 0) > cardPower(0, 0, 0));
  assert.ok(cardPower(0, 3, 5) > cardPower(3, 0, 0));
});
test('ledger: every affected floor retains stock; events replay all bot and inventory changes', () => {
  const original = newLedger();
  let s = original;
  for (let i = 0; i < 30; i++) {
    const before = s;
    s = tickLedger(s);
    for (let f = 0; f < 100; f++) {
      assert.ok(s.stock[f] >= 0);
      assert.ok(s.stock[f] <= before.stock[f]);
      assert.equal(s.stock[f] + s.taken[f], s.initial[f]);
    }
    for (const bot of s.bots) {
      const prior = before.bots.find((b) => b.id === bot.id);
      assert.ok(bot.floor >= prior.floor);
      if (!prior.alive) assert.deepEqual(bot, prior);
    }
  }
  assert.deepEqual(original, newLedger());
  assert.equal(s.bots.length, 99);
  assert.ok(s.bots.some((b) => !b.alive));
  assert.ok(s.taken.some((n) => n > 0));
  assert.deepEqual(replayLedger(s.events, s.cycle), s);
  const deadAt = new Set();
  for (const e of s.events) {
    if (deadAt.has(e.actor)) assert.equal(e.amount, 0);
    if (!e.after.alive) deadAt.add(e.actor);
  }
});
test('ranking: cleared height dominates reached height; ties share competition rank and death preserves record', () => {
  const entry = (id, cleared, reached, cycles, alive = true) => ({
    id,
    cleared,
    reached,
    cycles,
    alive,
    exit: false,
  });
  const results = rankEntries([
    entry('jump', 8, 100, 10, false),
    entry('tieA', 12, 13, 32),
    entry('tieB', 12, 18, 32, false),
    entry('slow', 12, 18, 40),
    entry('leader', 22, 24, 50),
  ]);
  assert.deepEqual(
    results.map((e) => e.id),
    ['leader', 'tieA', 'tieB', 'slow', 'jump'],
  );
  assert.deepEqual(
    results.map((e) => e.rank),
    [1, 2, 2, 4, 5],
  );
});
test('reviews: never auto-approve, reject wrong versions and corrupt storage, export all nine modules', () => {
  assert.equal(emptyReview().status, 'pending');
  assert.deepEqual(parseReviews('not json'), {});
  assert.deepEqual(parseReviews('{"version":"wrong","reviews":{}}'), {});
  const reviews = {
    world: {
      ...emptyReview(),
      notes: '保留预算校验',
      checks: [0, 2],
      decisions: { fallback: '模板回退' },
    },
  };
  assert.deepEqual(parseReviews(serializeReviews(reviews)), reviews);
  const doc = exportReviews(reviews);
  assert.equal(doc.modules.length, 9);
  assert.ok(doc.modules.every((m) => m.status === 'pending'));
  assert.equal(
    doc.modules.find((m) => m.moduleId === 'world').notes,
    '保留预算校验',
  );
});
