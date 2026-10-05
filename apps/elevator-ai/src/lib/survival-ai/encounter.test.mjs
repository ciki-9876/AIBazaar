import test from 'node:test';
import assert from 'node:assert/strict';
import checkpoint from './encounter-model.json' with { type: 'json' };
import {
  createEncounter,
  stepEncounter,
  playerCommand,
  encounterRequest,
  applyEncounterReply,
  ownedItemIds,
  canSee,
  PROFILES,
  SCENARIOS,
} from './encounter.ts';
import {
  chooseEncounter,
  validateEncounterModel,
  validateEncounterRequest,
} from './encounter-policy.ts';
import { ITEMS, searchDuration } from '../survival-room.ts';
import { revealFog } from '../survival-world.ts';
import { putInBag } from '../survival-cargo.ts';
const make = (profile = 'ally', scenario = 'water') =>
  createEncounter(20261003, profile, scenario, 'test');
const refresh = (s) => {
  for (const a of s.actors) a.fog = revealFog(a, a.fog, s.world, 11);
};
const noCombat = (s) => {
  s.enemies = [];
  s.actors.forEach((a) => {
    a.equipment = [];
  });
};
const chooseKey = (s, key) => {
  const q = encounterRequest(s),
    c = q.candidates.find((c) => c.key === key);
  assert.ok(c, key);
  return applyEncounterReply(s, q, {
    requestId: q.id,
    candidateId: c.id,
    modelVersion: checkpoint.version,
  }).state;
};

test('tactical commitment preserves a reachable goal but urgent threats can interrupt', () => {
  let s = make('ally', 'cover');
  noCombat(s);
  const first = encounterRequest(s).candidates.find(
    (c) => c.action.type === 'move',
  );
  assert.ok(first);
  s = chooseKey(s, first.key);
  s = stepEncounter(s);
  const choices = encounterRequest(s).candidates;
  assert.ok(
    choices.every((c) => c.key === 'move:continue' || c.key === first.key),
  );
  const old = s.actors[1].intent.to;
  for (let i = 0; i < 4; i++) s = chooseKey(stepEncounter(s), 'move:continue');
  assert.deepEqual(s.actors[1].intent.to, old);
  s.actors[1].hp = 20;
  assert.ok(encounterRequest(s).candidates.some((c) => c.key === 'extract'));
});
test('one second of blocked movement releases the goal and records a recovery', () => {
  let s = make();
  noCombat(s);
  const a = s.actors[1];
  a.path = [{ x: a.x, z: a.z }];
  // A colliding waypoint at the opposite side of an obstacle must not be pursued forever.
  a.x = 43;
  a.z = 62;
  a.path = [{ x: 44, z: 62 }];
  a.intent = { type: 'move', to: a.path[0] };
  for (let i = 0; i < 60; i++) s = stepEncounter(s);
  assert.ok(s.actors[1].navigation.recoveries >= 1);
  assert.equal(s.actors[1].path.length, 0);
});

test('room scenarios have legal spawns, unique physical items and private perception', () => {
  for (const row of SCENARIOS)
    for (const profile of Object.keys(PROFILES)) {
      const s = make(profile, row.id),
        ids = ownedItemIds(s);
      assert.equal(new Set(ids).size, ids.length);
      assert.equal(s.actors[0].bag.length, 0);
      validateEncounterRequest(encounterRequest(s));
    }
});
test('closed container contents, player inventory and unseen actor conditions cannot leak into observations', () => {
  const s = make(),
    first = encounterRequest(s);
  const hidden = s.caches.find((c) => c.container === 'crate');
  hidden.contents = [{ ...ITEMS.laser, uid: 'private-loot' }];
  s.actors[0].bag = [{ ...ITEMS.water, uid: 'private-player-bag' }];
  s.actors[0].water = 1;
  s.actors[0].food = 1;
  assert.deepEqual(encounterRequest(s), first);
  const a = s.actors[1];
  a.x = 45.5;
  a.z = 62;
  s.actors[0].x = 42.5;
  s.actors[0].z = 62;
  refresh(s);
  assert.equal(canSee(s, a, s.actors[0]), false);
  assert.deepEqual(encounterRequest(s).observation.others, []);
});
test('same container cannot yield duplicate loot when two actors search simultaneously', () => {
  let s = make('ally', 'search');
  noCombat(s);
  const c = s.caches[0];
  for (const a of s.actors) {
    a.x = c.x;
    a.z = c.z;
    a.intent = { type: 'search', cacheId: c.id };
  }
  refresh(s);
  for (let i = 0; i <= searchDuration(c, 100) + 2; i++) s = stepEncounter(s);
  const ids = ownedItemIds(s);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(
    s.actors.reduce((n, a) => n + a.bag.length, 0),
    2,
  );
  assert.equal(s.caches[0].contents.length, 0);
  assert.equal(s.actors.filter((a) => a.bag.length).length, 1);
});
test('item transfer is atomic when recipient has no capacity', () => {
  let s = make('ally', 'help');
  noCombat(s);
  s.actors[0].bag = Array.from({ length: 16 }, (_, i) => ({
    ...ITEMS.scrap,
    uid: 'full:' + i,
    slot: i,
  }));
  s.actors[0].help = { kind: 'water', until: 999 };
  s = chooseKey(s, 'give:' + s.actors[1].bag[0].uid + ':player');
  const before = s.actors.map((a) => structuredClone(a.bag));
  s = stepEncounter(s);
  assert.deepEqual(
    s.actors.map((a) => a.bag),
    before,
  );
});
test('manual water use belongs to the actor, gains only available capacity and removes only its UID', () => {
  let s = make('ally', 'help');
  noCombat(s);
  s.actors[1].water = 74;
  const uid = s.actors[1].bag[0].uid,
    other = s.actors[1].bag[1].uid,
    playerWater = s.actors[0].water;
  s = chooseKey(s, 'consume:' + uid);
  s = stepEncounter(s);
  assert.equal(s.actors[1].water, 100);
  assert.deepEqual(
    s.actors[1].bag.map((i) => i.uid),
    [other],
  );
  assert.ok(s.actors[0].water < playerWater);
});
test('a learned checkpoint makes different choices for the exact same request for help', () => {
  validateEncounterModel(checkpoint);
  const choices = Object.keys(PROFILES).map((profile) => {
    const s = make(profile, 'help');
    s.actors[0].help = { kind: 'water', until: 999 };
    const q = encounterRequest(s),
      reply = chooseEncounter(checkpoint, q);
    return q.candidates.find((c) => c.id === reply.candidateId).action.type;
  });
  assert.equal(choices[0], 'give');
  assert.notEqual(choices[1], 'give');
  assert.equal(choices[2], 'engage');
});
test('worker replies cannot cross sessions, expire, inject parameters or loot an emptied cache', () => {
  const s = make(),
    q = encounterRequest(s),
    c = q.candidates.find((c) => c.action.type === 'search');
  const reply = {
    requestId: q.id,
    candidateId: c.id,
    modelVersion: checkpoint.version,
  };
  assert.equal(
    applyEncounterReply({ ...s, sessionId: 'other' }, q, reply).reason,
    'wrong-request',
  );
  assert.equal(
    applyEncounterReply({ ...s, tick: 31 }, q, reply).reason,
    'expired',
  );
  assert.equal(
    applyEncounterReply(s, q, { ...reply, action: { type: 'extract' } }).reason,
    'malformed',
  );
  s.caches.find((cache) => cache.id === c.action.cacheId).contents = [];
  const result = applyEncounterReply(s, q, reply);
  assert.equal(result.reason, 'no-longer-legal');
  assert.equal(result.state, s);
});
test('movement and damage interrupt 66-tick extraction; continuing the same intent preserves progress', () => {
  let s = make('ally', 'exit');
  noCombat(s);
  const a = s.actors[1];
  a.x = 48.5;
  a.z = 75.5;
  refresh(s);
  s = chooseKey(s, 'extract');
  for (let i = 0; i < 30; i++) s = stepEncounter(s);
  s = chooseKey(s, 'extract');
  assert.equal(s.actors[1].extraction, 30);
  for (let i = 0; i < 36; i++) s = stepEncounter(s);
  assert.equal(s.actors[1].status, 'extracted');
  let p = make();
  noCombat(p);
  p.actors[0].x = 48.5;
  p.actors[0].z = 75.5;
  p = playerCommand(p, { type: 'extract' });
  p = stepEncounter(p);
  assert.equal(p.actors[0].extraction, 1);
  p = stepEncounter(p, { x: 1, z: 0 });
  assert.equal(p.actors[0].extraction, 0);
});
test('monster is updated once, respects walls and stops an ambush chase after 3 seconds without sight', () => {
  let s = make('ally', 'cover');
  s.actors[0].equipment = [];
  s.actors[1].equipment = [];
  const e = s.enemies[1];
  s.enemies = [e];
  e.x = 40;
  e.z = 64;
  e.lastSeen = { x: 42, z: 64 };
  e.lastSeenTick = 0;
  e.awake = true;
  s.actors.forEach((a) => {
    a.x = 60;
    a.z = 74;
  });
  refresh(s);
  const start = { x: e.x, z: e.z };
  s = stepEncounter(s);
  assert.ok(
    Math.hypot(s.enemies[0].x - start.x, s.enemies[0].z - start.z) <=
      1.5 / 30 + 0.000001,
  );
  for (let i = 0; i < 100; i++) s = stepEncounter(s);
  assert.equal(s.enemies[0].awake, false);
  const pos = [s.enemies[0].x, s.enemies[0].z];
  s = stepEncounter(s);
  assert.deepEqual([s.enemies[0].x, s.enemies[0].z], pos);
});
test('death preserves equipped identities and leaves one recoverable shared backpack', () => {
  let s = make('ally', 'help');
  noCombat(s);
  const a = s.actors[0];
  a.bag = putInBag([], { ...ITEMS.water, uid: 'recover-this' });
  a.hp = 0;
  s = stepEncounter(s);
  assert.equal(s.actors[0].status, 'dead');
  assert.equal(s.actors[0].bag.length, 0);
  const bag = s.caches.find((c) => c.id.startsWith('deathbag:'));
  assert.equal(bag.contents[0].uid, 'recover-this');
  s.actors[1].x = bag.x;
  s.actors[1].z = bag.z;
  refresh(s);
  s = chooseKey(s, 'search:' + bag.id);
  for (let i = 0; i < searchDuration(bag, 100) + 2; i++) s = stepEncounter(s);
  assert.ok(s.actors[1].bag.some((i) => i.uid === 'recover-this'));
  assert.equal(ownedItemIds(s).filter((id) => id === 'recover-this').length, 1);
});
test('recorded model choices and explicit inputs replay independently of worker timing', () => {
  let s = make('broker', 'search'),
    replay = structuredClone(s);
  const records = [];
  for (let t = 0; t < 90; t++) {
    if (t % 15 === 0) {
      const q = encounterRequest(s),
        r = chooseEncounter(checkpoint, q);
      records.push({ t, q, r });
      s = applyEncounterReply(s, q, r).state;
    }
    const input = t < 20 ? { x: 0, z: -1 } : { x: 0, z: 0 };
    s = stepEncounter(s, input);
  }
  for (let t = 0; t < 90; t++) {
    const record = records.find((row) => row.t === t);
    if (record) replay = applyEncounterReply(replay, record.q, record.r).state;
    replay = stepEncounter(replay, t < 20 ? { x: 0, z: -1 } : { x: 0, z: 0 });
  }
  assert.deepEqual(replay, s);
});
test('empty sealed caches remain observable until searched and observed events are remembered', () => {
  let s = make('ally', 'help');
  noCombat(s);
  const c = s.caches.find(
    (c) => c.container === 'crate' && canSee(s, s.actors[1], c),
  );
  const before = encounterRequest(s);
  c.contents = [];
  assert.deepEqual(encounterRequest(s), before);
  s.actors[0].help = { kind: 'water', until: 999 };
  s = chooseKey(s, 'give:' + s.actors[1].bag[0].uid + ':player');
  s = stepEncounter(s);
  const event = s.events.find((e) => e.text.includes('给了'));
  assert.equal(event.visibleToPlayer, true);
  s.actors[1].x = 62;
  s.actors[1].z = 48;
  refresh(s);
  assert.equal(canSee(s, s.actors[0], s.actors[1]), false);
  assert.equal(s.events.find((e) => e.id === event.id).visibleToPlayer, true);
});
test('profiles are priorities rather than invariant assist/attack switches', () => {
  const ally = make('ally', 'help');
  ally.actors[1].water = 12;
  ally.actors[0].help = { kind: 'water', until: 999 };
  const predator = make('predator', 'help');
  predator.actors[1].hp = 15;
  predator.actors[0].help = { kind: 'water', until: 999 };
  for (const [s, expected] of [
    [ally, 'consume'],
    [predator, 'extract'],
  ]) {
    const q = encounterRequest(s),
      r = chooseEncounter(checkpoint, q);
    assert.equal(
      q.candidates.find((c) => c.id === r.candidateId).action.type,
      expected,
    );
  }
});
