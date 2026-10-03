import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createSurvival, stepSurvival, ITEMS, ROOM } from './survival-room.ts';
import { itemIds } from './survival-stacks.ts';
import { activeCaches } from './survival-cache-lifecycle.ts';
import { createCacheLayer } from '../app/survival/cache-layer.ts';

const fixture = () => {
  const s = createSurvival();
  s.status = 'running';
  s.enemies = [];
  s.spawns = [];
  s.equipment = [];
  s.bag = [];
  s.caches = [];
  s.player = { ...s.player, x: 48, z: 60 };
  s.world = { ...s.world, obstacles: [] };
  s.fog = {
    visible: Array(ROOM.width * ROOM.depth).fill(1),
    explored: Array(ROOM.width * ROOM.depth).fill(1),
  };
  return s;
};
const drop = (id, p, extra = {}) => ({
  id,
  ...p,
  item: { ...ITEMS['lift-material'], uid: `loot-${id}` },
  contents: [{ ...ITEMS['lift-material'], uid: `loot-${id}` }],
  container: 'loose',
  pickup: 'touch',
  available: 0,
  opened: false,
  searched: false,
  ...extra,
});
const rules = { combat: false, waves: false, needs: false, search: false };

test('hundreds of collected drops retire without losing or duplicating inventory identities', () => {
  let s = fixture();
  const carried = new Set();
  for (let i = 0; i < 240; i++) {
    const cache = drop(`brain-cache-${i}`, s.player);
    s = { ...s, caches: [...s.caches, cache] };
    const before = JSON.stringify(s);
    const restored = JSON.parse(before);
    const next = stepSurvival(s, {}, rules);
    assert.equal(JSON.stringify(s), before);
    assert.deepEqual(next, stepSurvival(restored, {}, rules));
    assert.ok(!next.caches.some((c) => c.id === cache.id));
    const ids = next.bag.flatMap(itemIds);
    assert.ok(ids.includes(cache.item.uid));
    assert.equal(new Set(ids).size, ids.length);
    carried.add(cache.item.uid);
    s = next;
  }
  assert.equal(carried.size, 240);
  assert.equal(s.bag.flatMap(itemIds).length, 240);
  assert.ok(s.caches.length < 20);
});
test('full bags retain drops; authored props, partially looted and death containers never retire', () => {
  const s = fixture();
  s.bag = Array.from({ length: 16 }, (_, slot) => ({
    ...ITEMS.scrap,
    uid: `full-${slot}`,
    slot,
  }));
  const cache = drop('brain-cache-full', s.player);
  s.caches = [cache];
  const next = stepSurvival(s, {}, rules);
  assert.equal(next.caches.length, 1);
  assert.equal(next.caches[0].contents[0].uid, cache.item.uid);
  assert.equal(next.effects.filter((e) => e.kind === 'pickup').length, 0);
  const spent = drop('brain-cache-spent', s.player, {
    opened: true,
    contents: [],
  });
  const protectedCaches = [
    { ...spent, id: 'opening-light' },
    { ...spent, id: 'death-backpack', container: 'backpack' },
    { ...spent, id: 'brain-cache-full', contents: cache.contents },
    { ...spent, id: 'cabinet', container: 'locker' },
  ];
  assert.deepEqual(activeCaches([spent, ...protectedCaches]), protectedCaches);
});
test('retired drop render instances dispose once; unseen and explored containers retain their lifecycle', () => {
  const s = fixture(),
    parent = new T.Group(),
    released = [];
  const layer = createCacheLayer((cache) => {
    const group = new T.Group();
    for (const name of ['beacon', 'loot-aura']) {
      const node = new T.Group();
      node.name = name;
      group.add(node);
    }
    group.userData.dispose = () => released.push(cache.id);
    parent.add(group);
    return group;
  });
  const brain = drop('brain-cache-render', s.player),
    chest = drop('cabinet', s.player, { container: 'locker' });
  s.caches = [brain, chest];
  layer.update(s, 'expedition', 1);
  assert.equal(parent.children.length, 2);
  s.caches = [chest];
  layer.update(s, 'expedition', 1);
  layer.update(s, 'expedition', 1);
  assert.deepEqual(released, [brain.id]);
  assert.equal(parent.children.length, 1);
  layer.clear();
  layer.clear();
  assert.deepEqual(released, [brain.id, chest.id]);
  assert.equal(parent.children.length, 0);
});
