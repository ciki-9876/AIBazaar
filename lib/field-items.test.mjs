import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, cardDef } from './demo-cards.ts';
import { OBJECTS, FIELD_NODES, fieldTask } from './field-items.ts';
import { RETIRED_CARDS, retiredSize } from './card-migration.ts';
import {
  newRun,
  act,
  makeItem,
  currentFloor,
  fieldWorkPreview,
  fieldToolState,
  validSave,
  migrateCargo,
  makeDuel,
  upgradeCost,
} from './demo-engine.ts';
import { simulateDuel } from './demo-combat.ts';
const start = () => act(newRun(10909), { type: 'begin' });
function fixture(id) {
  const s = act(start(), { type: 'enter', floor: 1 });
  currentFloor(s).nodes = [OBJECTS[id].node, 'patrol', 'guardian'];
  s.node = 0;
  s.items.push({
    ...makeItem('subject', id, 'physical'),
    slot: 4,
    rotated: false,
  });
  return s;
}
function submit(s, id = 'subject', at = 1) {
  const x = s.items.find((x) => x.uid === id);
  return {
    type: 'field-work',
    id,
    at,
    choice: fieldTask(s.seed, s.floor, OBJECTS[x.id].node).answer,
  };
}
function rejects(s, a) {
  const before = structuredClone(s);
  assert.throws(() => act(s, a));
  assert.deepEqual(s, before);
}

test('catalog12 is the entire active catalog; retired IDs cannot be spawned', () => {
  assert.equal(CARDS.length, 12);
  assert.equal(Object.keys(OBJECTS).length, 12);
  for (const id of Object.keys(RETIRED_CARDS)) assert.throws(() => cardDef(id));
  for (let seed = 0; seed < 20; seed++)
    for (const f of newRun(seed).floors)
      for (const x of f.stock)
        if (['card', 'physical'].includes(x.type)) assert.ok(OBJECTS[x.id]);
});

test('34 legacy aliases retain instance identity, grade, level, position and migrate only once', () => {
  for (const [oldId, newId] of Object.entries(RETIRED_CARDS)) {
    const s = start();
    delete s.catalogVersion;
    const old = {
      ...makeItem('legacy', newId, 'card', 'board'),
      id: oldId,
      volume: retiredSize(oldId),
      quality: 2,
      level: 5,
      at: 3,
    };
    s.level = 6;
    s.items = s.items.filter((x) => x.zone !== 'board');
    s.items.push(old);
    currentFloor({ ...s, floor: 1 }).stock = [
      {
        ...old,
        uid: 'stock',
        type: 'physical',
        zone: 'bag',
        at: undefined,
        slot: 0,
        rarity: undefined,
      },
    ];
    s.duel = {
      ...makeDuel({ ...start(), floor: 1 }, 'guardian'),
      player: [
        { uid: 'legacy', id: oldId, at: 3, quality: 2, level: 5, rarity: 0 },
      ],
      enemy: [
        { uid: 'enemy', id: oldId, at: 3, quality: 2, level: 5, rarity: 0 },
      ],
    };
    // makeDuel must receive the modern ID; build the raw legacy snapshot separately.
    const before = structuredClone(s),
      n = migrateCargo(s),
      x = n.items.find((x) => x.uid === 'legacy');
    assert.deepEqual(
      [x.id, x.uid, x.at, x.quality, x.level, x.volume],
      [newId, 'legacy', 3, 2, 5, cardDef(newId).size],
    );
    assert.equal(n.floors[0].stock[0].id, newId);
    assert.equal(n.duel.enemy[0].id, newId);
    assert.deepEqual(migrateCargo(n), n);
    assert.deepEqual(s, before);
    assert.ok(validSave(n));
    assert.equal(validSave({ ...s, catalogVersion: 999 }), false);
    const bad = structuredClone(s);
    bad.items.find((x) => x.uid === 'legacy').volume = 999;
    assert.equal(validSave(bad), false);
  }
});

test('all12 tools use matching physical instances; preview equals atomic settlement at 120 stamina boundaries', () => {
  for (const id of Object.keys(OBJECTS))
    for (const stamina of [0, 1, 2, 3, 4, 5, 6, 90, 99, 100]) {
      const s = fixture(id);
      s.stamina = stamina;
      const before = structuredClone(s),
        p = fieldWorkPreview(s, 'subject', 1);
      if (!p.allowed) {
        rejects(s, submit(s));
        continue;
      }
      const n = act(s, submit(s));
      assert.deepEqual(s, before);
      assert.equal(n.stamina, p.values.stamina - p.road);
      assert.equal(n.power, p.values.power);
      assert.equal(n.material, p.values.material);
      assert.deepEqual(n.fieldResearch, p.values.fieldResearch);
      assert.equal(n.fieldPrep.hp, p.values.fieldPrep.hp);
      assert.deepEqual(n.fieldPrep.barrier, p.values.fieldPrep.barrier);
      assert.equal(
        n.fieldPrep.steps,
        Math.max(0, p.values.fieldPrep.steps - 1),
      );
      assert.equal(
        n.items.some((x) => x.uid === 'subject'),
        !OBJECTS[id].consumed,
      );
      assert.ok(n.utilityUsed.includes('subject'));
      assert.ok(currentFloor(n).workResolved.includes(OBJECTS[id].node));
      assert.ok(validSave(n));
    }
});

test('incorrect readings cost two only; invalid scope, card forms and parameters cannot mutate inventory', () => {
  const s = fixture('acid'),
    a = submit(s),
    n = act(s, { ...a, choice: a.choice + 1 });
  assert.equal(n.stamina, s.stamina - 2);
  assert.deepEqual(n.items, s.items);
  assert.equal(n.material, s.material);
  assert.equal(n.node, s.node);
  assert.deepEqual(n.fieldPrep, s.fieldPrep);
  for (const bad of [
    { ...a, choice: NaN },
    { ...a, choice: -9 },
    { ...a, at: 3 },
    { ...a, id: 'missing' },
  ])
    rejects(s, bad);
  for (const change of [{ phase: 'combat' }, { phase: 'base' }])
    rejects({ ...s, ...change }, a);
  const card = structuredClone(s);
  card.items.find((x) => x.uid === 'subject').type = 'card';
  assert.equal(fieldToolState(card, 'subject').allowed, false);
  rejects(card, a);
  const remote = structuredClone(s);
  remote.items.find((x) => x.uid === 'subject').zone = 'warehouse';
  rejects(remote, a);
  const other = structuredClone(s);
  currentFloor(other).nodes[0] = 'relay';
  rejects(other, a);
});

test('caps show actual zero benefit; consumable choice remains explicit and no copy is consumed', () => {
  const s = fixture('sealant');
  s.fieldPrep.barrier = [36, 36, 36];
  s.items.push(makeItem('spare', 'sealant', 'physical'));
  const p = fieldWorkPreview(s, 'subject', 1);
  assert.match(p.summary, /下场中路屏障 108→108/);
  const n = act(s, submit(s));
  assert.ok(n.items.some((x) => x.uid === 'spare'));
  assert.ok(!n.items.some((x) => x.uid === 'subject'));
  assert.deepEqual(n.fieldPrep.barrier, [36, 36, 36]);
  for (const [id, key, limit] of [
    ['catalyst', 'hp', 32],
    ['culture', 'vitality', 10],
    ['counterweight', 'credit', 4],
  ]) {
    const s = fixture(id);
    (key === 'hp' ? s.fieldPrep : s.fieldResearch)[key] = limit;
    const n = act(s, submit(s));
    assert.equal((key === 'hp' ? n.fieldPrep : n.fieldResearch)[key], limit);
  }
});

test('resolved and bypassed workshops never repay on retry or another departure', () => {
  for (const choice of ['success', 'skip']) {
    let s = fixture('rubber');
    s = act(
      s,
      choice === 'skip' ? { type: 'field-work', choice: -1 } : submit(s),
    );
    const reward = s.material;
    s.node = 0;
    rejects(s, submit(s));
    const old = s.stamina;
    s = act(s, { type: 'field-work', choice: -2 });
    assert.equal(s.material, reward);
    assert.equal(s.stamina, old - 3);
    s = act(s, { type: 'extract' });
    s = act(s, { type: 'sleep' });
    s = act(s, { type: 'enter', floor: 1 });
    assert.equal(s.utilityUsed.length, 0);
    rejects(s, submit(s));
    assert.equal(fieldToolState(s, 'subject').allowed, false);
  }
});

test('prepared battle snapshot equals preview, consumes once, retains positions and replays after save', () => {
  let s = act(fixture('catalyst'), submit(fixture('catalyst')));
  s.fieldPrep.barrier = [12, 0, 8];
  const preview = makeDuel(s, 'guardian'),
    before = structuredClone(s);
  s = act(s, { type: 'fight' });
  assert.deepEqual(s.duel, preview);
  assert.equal(s.fieldPrep.hp, 0);
  assert.deepEqual(s.fieldPrep.barrier, [0, 0, 0]);
  assert.equal(preview.maxHp[0], 256);
  assert.deepEqual(preview.barrierHp[0], [89, 77, 85]);
  assert.ok(validSave(s));
  const restored = migrateCargo(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(simulateDuel(restored.duel), simulateDuel(s.duel));
  assert.deepEqual(s.duel.player, makeDuel(before, 'guardian').player);
  s = act(s, { type: 'resolve' });
  assert.ok(validSave(s));
  rejects(s, { type: 'resolve' });
});

test('permanent research survives extraction; next upgrade credit spends once; new run clears both', () => {
  let s = act(fixture('counterweight'), submit(fixture('counterweight')));
  s.fieldResearch.vitality = 2;
  s.fieldPrep.hp = 16;
  s.fieldPrep.barrier = [12, 0, 0];
  s = act(s, { type: 'extract' });
  assert.equal(s.fieldPrep.hp, 0);
  assert.deepEqual(s.fieldPrep.barrier, [0, 0, 0]);
  assert.equal(s.fieldResearch.vitality, 2);
  const gold = s.material,
    cost = upgradeCost(s);
  s = act(s, { type: 'upgrade' });
  assert.equal(s.material, gold - cost);
  assert.equal(s.fieldResearch.credit, 0);
  assert.equal(s.fieldResearch.vitality, 2);
  assert.deepEqual(start().fieldResearch, { vitality: 0, credit: 0 });
});

test('workshop puzzles are stable, solvable public readings for all seeds and all six nodes', () => {
  for (let seed = 0; seed < 30; seed++)
    for (const node of FIELD_NODES) {
      const task = fieldTask(seed, 1, node);
      assert.deepEqual(task, fieldTask(seed, 1, node));
      assert.equal(task.tools.length, 2);
      assert.ok(Number.isInteger(task.answer));
    }
});

test('corrupt legacy footprints are rejected before a three-cell card shrinks', () => {
  const s = start();
  s.level = 6;
  s.items = s.items.filter((x) => x.zone !== 'board');
  s.items.push({
    ...makeItem('old', 'recoil', 'card', 'board'),
    id: 'battery',
    volume: 3,
    at: 1,
  });
  assert.equal(validSave(s), false);
  s.items.at(-1).at = 0;
  s.items.push({ ...makeItem('overlap', 'gapblade', 'card', 'board'), at: 2 });
  assert.equal(validSave(s), false);
});

test('quantity selection applies each physical copy once, with one operation and one road fee', () => {
  const s = fixture('rubber');
  s.stamina = 40;
  s.items.push({ ...makeItem('second', 'rubber', 'physical'), slot: 5 });
  const ids = ['subject', 'second'];
  const preview = fieldWorkPreview(s, ids, 0);
  assert.equal(preview.values.stamina - preview.road, 59);
  const next = act(s, { ...submit(s), ids, at: 0 });
  assert.equal(next.stamina, 59);
  assert.equal(next.node, 1);
  for (const uid of ids) {
    assert.ok(next.items.some((x) => x.uid === uid));
    assert.equal(next.utilityUsed.filter((id) => id === uid).length, 1);
  }
  assert.ok(validSave(JSON.parse(JSON.stringify(next))));
  rejects(next, { ...submit(s), ids });
});

test('mixed quantities share the actual capped preview and consume only selected instances', () => {
  const s = fixture('sealant');
  s.items.push(
    { ...makeItem('second', 'sealant', 'physical'), slot: 5 },
    { ...makeItem('rest', 'rubber', 'physical'), slot: 6 },
  );
  s.stamina = 90;
  const ids = ['subject', 'second', 'rest'];
  const preview = fieldWorkPreview(s, ids, 1);
  const next = act(s, { ...submit(s), ids });
  assert.equal(next.fieldPrep.barrier[1], 36);
  assert.equal(next.stamina, 97);
  assert.deepEqual(next.fieldPrep, preview.values.fieldPrep);
  assert.ok(!next.items.some((x) => ['subject', 'second'].includes(x.uid)));
  assert.ok(next.items.some((x) => x.uid === 'rest'));
  assert.ok(validSave(next));
});

test('duplicate, empty, unavailable and partially invalid selections reject atomically', () => {
  const s = fixture('rubber');
  for (const ids of [[], ['subject', 'subject'], ['subject', 'missing']]) {
    assert.equal(fieldWorkPreview(s, ids).allowed, false);
    rejects(s, { ...submit(s), ids });
  }
  s.utilityUsed.push('subject');
  rejects(s, { ...submit(s), ids: ['subject'] });
});

test('wrong multi-tool reading spends only attempt energy and preview cancellation mutates nothing', () => {
  const s = fixture('sealant');
  s.items.push({ ...makeItem('rest', 'rubber', 'physical'), slot: 5 });
  const before = structuredClone(s);
  fieldWorkPreview(s, ['subject', 'rest']);
  fieldWorkPreview(s, []);
  assert.deepEqual(s, before);
  const next = act(s, { ...submit(s), ids: ['subject', 'rest'], choice: 999 });
  assert.equal(next.stamina, s.stamina - 2);
  assert.deepEqual(next.items, s.items);
  assert.deepEqual(next.utilityUsed, s.utilityUsed);
  assert.equal(next.node, s.node);
});
