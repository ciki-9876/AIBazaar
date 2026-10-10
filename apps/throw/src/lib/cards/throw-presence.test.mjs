import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createThrowDuel,
  curtainFor,
  launchThrow,
  previewThrow,
  stepThrowDuel,
  MAX_HP,
  PRESENCE_LIMIT,
} from './throw-duel.ts';

// v11 presence (气场, ADR-0059): each fighter carries its own cap.
const duel = (presence, extra = {}) => {
  const state = createThrowDuel(41, [], 'quick', null, null, undefined, {}, { enemyItems: [], presence, ...extra });
  state.ai.thinkTick = 99999;
  return state;
};

test('presence caps default to 320 and can be set per side', () => {
  const plain = duel(undefined);
  assert.deepEqual(plain.fighters.map((f) => [f.hp, f.maxHp]), [[MAX_HP, MAX_HP], [MAX_HP, MAX_HP]]);
  const grown = duel({ player: 412, enemy: 460 });
  assert.deepEqual(grown.fighters.map((f) => [f.hp, f.maxHp]), [[412, 412], [460, 460]]);
  for (const bad of [0, -5, 12.5, PRESENCE_LIMIT + 1, Number.NaN])
    assert.throws(() => duel({ player: bad }), /Invalid presence/);
});

test('house hp floors are checked against the player cap', () => {
  assert.throws(() => duel(undefined, { terms: { hpFloor: 400 } }), /Invalid duel terms/);
  assert.equal(duel({ player: 640 }, { terms: { hpFloor: 400 } }).terms.hpFloor, 400);
});

test('the curtain scales with each fighter cap; at the default cap it is unchanged', () => {
  assert.equal(curtainFor(MAX_HP, 7), 7);
  assert.equal(curtainFor(640, 1), 2);
  assert.equal(curtainFor(400, 3), 4);
  let state = duel({ player: 640, enemy: 320 });
  state.tick = 1199;
  state = stepThrowDuel(state);
  const curtain = state.events.filter((event) => event.kind === 'curtain');
  // Events are credited to the other seat; side 1's entry is the damage to the player.
  assert.deepEqual(curtain.map((event) => [event.side, event.value]), [[1, 2], [0, 1]]);
  assert.equal(state.fighters[0].hp, 638);
  assert.equal(state.fighters[1].hp, 319);
});

test('shields are no longer capped at 160, in the preview and in play', () => {
  const card = { uid: 'p0', rank: 2, suit: 0, ench: 'lining' };
  assert.equal(previewThrow([card], [], { shield: 300 }).shield, 4);
  const state = duel(undefined);
  state.fighters[0].shield = 158;
  state.fighters[0].hand = [card];
  assert.equal(launchThrow(state, 0, ['p0']).fighters[0].shield, 162);
});

test('half-presence rules read the fighter own cap', () => {
  const stan = (cap) => {
    let state = createThrowDuel(41, [], 'quick', null, null, undefined, {}, { enemyItems: [], performers: { player: 'stan' }, presence: { player: cap } });
    state.ai.thinkTick = 99999;
    state.fighters[0].hp = 300;
    state = stepThrowDuel(state);
    return state.fighters[0].talentUsed;
  };
  assert.equal(stan(MAX_HP), false, '300 is above half of 320');
  assert.equal(stan(640), true, '300 is below half of 640');
  const low = { hp: 300, maxHp: 640 };
  const legend = { uid: 'p0', rank: 10, suit: 0, ench: 'LS10' };
  assert.equal(previewThrow([legend], [], low).shield, 26, '十分体面 reads the cap');
  assert.equal(previewThrow([legend], [], { hp: 300 }).shield, 0);
});
