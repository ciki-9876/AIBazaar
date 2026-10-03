import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEMS,
  createSurvival,
  survivalAction,
  stepSurvival,
  enemyLimit,
} from './survival-room.ts';
import {
  ITEM_PROPERTIES,
  hasTrait,
  equipmentMechanics,
} from './survival-item-traits.ts';
import { createGMCheckpoint } from './survival-gm.ts';
import {
  advanceDialogue,
  dialogueCue,
  stepOpeningDialogue,
  openingAction,
} from './survival-opening.ts';
import { creaturePack } from './survival-theme-assets.ts';
import { readOpeningCheckpoint } from './survival-checkpoint.ts';

test('every item has coherent traits; active supplies and gear eligibility share one registry', () => {
  assert.deepEqual(
    Object.keys(ITEM_PROPERTIES).sort(),
    Object.keys(ITEMS).sort(),
  );
  for (const [kind, p] of Object.entries(ITEM_PROPERTIES)) {
    assert.ok(p.traits.length);
    assert.equal(hasTrait(kind, 'usable'), !!p.use);
    if (p.traits.includes('combat') || p.traits.includes('mechanism'))
      assert.ok(hasTrait(kind, 'equippable'));
  }
  assert.deepEqual(
    equipmentMechanics([
      { item: { kind: 'flashlight' } },
      { item: { kind: 'flashlight' } },
    ]),
    { vision: 2, illumination: 0 },
  );
  assert.deepEqual(equipmentMechanics(), { vision: 0, illumination: 0 });
});
test('all usable supplies support atomic manual use; capped stats and protected items cannot be consumed', () => {
  for (const kind of ['water', 'food', 'bread', 'medicine']) {
    const item = { ...ITEMS[kind], uid: 'supply', slot: 0 };
    const s = { ...createSurvival(), status: 'running', bag: [item] };
    const stat = ITEM_PROPERTIES[kind].use.stat;
    s.player = { ...s.player, [stat]: 60 };
    const next = survivalAction(s, { type: 'consume', uid: item.uid });
    assert.equal(next.player[stat], 100);
    assert.equal(next.effects.at(-1).amount, 40);
    assert.equal(next.bag.length, 0);
    assert.equal(s.bag.length, 1);
    assert.equal(s.player[stat], 60);
    assert.equal(
      survivalAction(next, { type: 'consume', uid: item.uid }),
      next,
    );
    const full = { ...s, player: { ...s.player, [stat]: 100 } };
    assert.equal(
      survivalAction(full, { type: 'consume', uid: item.uid }),
      full,
    );
    const safe = { ...s, bag: [], safe: [item] };
    assert.equal(
      survivalAction(safe, { type: 'consume', uid: item.uid }),
      safe,
    );
  }
});
test('manual supplies appear in the expedition receipt exactly once', () => {
  let s = createGMCheckpoint('field:module');
  const water = s.room.bag.find((i) => i.kind === 'water');
  assert.ok(water);
  s.room.player.water = 60;
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'consume', uid: water.uid },
  });
  assert.equal(s.afterlight.used.filter((i) => i.uid === water.uid).length, 1);
});
test('population cap reserves pending spawns and blocks old overbooked saves from overflowing', () => {
  for (const floor of [2, 3]) {
    let s = {
      ...createSurvival(),
      floor,
      status: 'running',
      leftLift: true,
      nextWave: 0,
      equipment: [],
      caches: [],
    };
    s.player = { ...s.player, x: 48, z: 40, hp: 1000000 };
    s.world = { ...s.world, obstacles: [], gates: [{ x: 60, z: 40 }] };
    s.enemies = [];
    for (let tick = 0; tick < 2800; tick++) {
      s = stepSurvival(s, {}, { combat: false, needs: false, search: false });
      assert.ok(s.enemies.length + s.spawns.length <= enemyLimit(s));
    }
    assert.equal(s.enemies.length + s.spawns.length, enemyLimit(s));
    const legacy = {
      ...s,
      spawns: [{ id: 99999, at: 0, kind: 'crawler', x: 60, z: 40 }],
    };
    let next = stepSurvival(
      legacy,
      {},
      { waves: false, combat: false, needs: false },
    );
    assert.equal(next.enemies.length, enemyLimit(s));
    assert.equal(next.spawns.length, 1);
    next = { ...next, enemies: next.enemies.slice(1) };
    next = stepSurvival(
      next,
      {},
      { waves: false, combat: false, needs: false },
    );
    assert.equal(next.enemies.length, enemyLimit(s));
    assert.equal(next.spawns.length, 0);
  }
});
test('manual story waits, click advances the utterance, task dialogue never pays or confirms', () => {
  let s = createGMCheckpoint('opening:where');
  for (let i = 0; i < 250; i++) s = stepOpeningDialogue(s, {}, false, null);
  assert.equal(s.stage, 'where');
  assert.ok(dialogueCue(s));
  s = advanceDialogue(s);
  assert.equal(s.stage, 'phone');
  let task = createGMCheckpoint('home:feed');
  assert.equal(advanceDialogue(task), task);
  task = createGMCheckpoint('after:report');
  assert.equal(advanceDialogue(task), task);
  let question = createGMCheckpoint('after:question');
  question = advanceDialogue(question);
  assert.equal(question.afterlight.phase, 'question');
  assert.equal(question.afterlight.tick, 90);
  question = advanceDialogue(question);
  assert.equal(question.afterlight.phase, 'safe');
});
test('field manual utterance holds text without pausing exploration, and automatic mode progresses', () => {
  const s = createGMCheckpoint('field:expedition');
  s.guidance.active = null;
  s.guidance.seen = ['needs', 'spirit', 'threshold'];
  const tick = s.room.tick;
  const next = stepOpeningDialogue(s, { x: 1 }, false, null);
  assert.equal(next.room.tick, tick + 1);
  assert.ok(next.room.player.water < s.room.player.water);
  let story = createGMCheckpoint('opening:where');
  for (let i = 0; i < 120; i++)
    story = stepOpeningDialogue(story, {}, true, null);
  assert.equal(story.stage, 'phone');
});
test('Chinese creatures are part of the theme pack, old full-food meal saves stay playable', () => {
  assert.equal(creaturePack('pavilion').creatureRenderer, 'jiangnan-spirits-1');
  assert.equal(Object.keys(creaturePack('pavilion').creatures).length, 4);
  const s = createGMCheckpoint('after:eat-food');
  s.room.player.food = 100;
  const loaded = readOpeningCheckpoint(JSON.stringify(s));
  assert.equal(loaded.room.player.food, 55);
  const ate = openingAction(loaded, {
    type: 'inventory',
    action: { type: 'consume', uid: 'anbo-welcome-bread' },
  });
  assert.equal(ate.afterlight.breadEaten, true);
  assert.equal(ate.room.player.water, 60);
});
