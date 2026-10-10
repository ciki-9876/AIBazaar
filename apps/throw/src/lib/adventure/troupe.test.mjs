import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceDialogue,
  battleSetup,
  chooseDialogue,
  createAdventure,
  finishAdventureBattle,
  interactAdventure,
  memberBook,
  RECRUITS,
  restoreAdventure,
  serializeAdventure,
  startShow,
  visibleHotspots,
  walkAdventure,
} from './magician-world.ts';

const read = (state) => {
  while (state.mode === 'dialogue') {
    const next = advanceDialogue(state);
    if (next === state) break;
    state = next;
  }
  return state;
};
const walkTo = (state, x) => {
  while (Math.abs(state.player.x - x) >= 5) state = walkAdventure(state, state.player.x < x ? 1 : -1, 1);
  return state;
};
const spot = (state, id) => visibleHotspots(state).find((entry) => entry.id === id);
const go = (state, id) => {
  const target = spot(state, id);
  assert.ok(target, `${id} should be visible on ${state.map}`);
  return interactAdventure(walkTo(state, target.x), id);
};
const talk = (state, id) => read(go(state, id));
const duel = (state, id, choice, winner = 0) => {
  state = chooseDialogue(talk(state, id), choice);
  assert.equal(state.mode, 'battle');
  return read(finishAdventureBattle(state, state.battle.id, winner));
};
const toTown = (state) => (state.map === 'bridgeport' ? state : go(state, `${state.map}-exit`));
const toGoose = (state) => (state.map === 'goose' ? state : go(toTown(state), 'goose-door'));
const toTheatre = (state) => (state.map === 'thursday' ? state : go(toTown(state), 'thursday-door'));
const arrived = () => read(createAdventure(4242, 2));
const show = (state, id) => {
  state = go(toTown(state), 'busk-stage');
  if (state.mode === 'dialogue') state = chooseDialogue(read(state), 'shows');
  return startShow(state, id);
};
/** Registered, both morning duels and three shows won, main hall open. */
const groupStage = () => {
  let state = toTheatre(arrived());
  state = talk(state, 'doris');
  state = duel(state, 'ada', 'ada');
  state = duel(state, 'bea', 'bea');
  for (const id of ['double', 'single', 'quick']) state = read(finishAdventureBattle(show(state, id), show(state, id).battle.id, 0));
  return talk(toTheatre(state), 'doris');
};

test('a new adventure tours alone; every recruit says how to meet them', () => {
  const state = createAdventure(1);
  assert.deepEqual(state.troupe, ['eli']);
  assert.deepEqual(state.affinity, {});
  for (const recruit of Object.values(RECRUITS)) assert.ok(recruit.hint);
});

test('tavern: Stan joins for a pound, once; without the pound he waits', () => {
  let state = toGoose(arrived());
  state = talk(state, 'goose-board');
  assert.equal(state.dialogue.id, 'tavern-board');
  const broke = read(chooseDialogue({ ...state, fee: 0 }, 'hire-stan'));
  assert.deepEqual(broke.troupe, ['eli']);
  assert.equal(broke.fee, 0);
  const fee = state.fee;
  state = read(chooseDialogue(state, 'hire-stan'));
  assert.deepEqual(state.troupe, ['eli', 'stan']);
  assert.equal(state.fee, fee - 1);
  assert.equal(go(state, 'goose-board').dialogue.id, 'tavern-board-empty');
});

test('affinity: stew and a chat count once each; beating Rosie adds the rest; then she can be asked', () => {
  let state = toGoose(arrived());
  state = { ...state, fee: 20 };
  state = talk(state, 'rosie-kitchen');
  assert.equal(state.dialogue.id, 'rosie-kitchen');
  state = read(chooseDialogue(state, 'stew'));
  assert.equal(state.affinity.rosie, 25);
  assert.equal(state.fee, 17);
  state = read(chooseDialogue(talk(state, 'rosie-kitchen'), 'stew'));
  assert.equal(state.affinity.rosie, 25, 'a second stew is just lunch');
  state = read(chooseDialogue(talk(state, 'rosie-kitchen'), 'fire'));
  state = read(chooseDialogue(talk(state, 'rosie-kitchen'), 'fire'));
  assert.equal(state.affinity.rosie, 35);
  assert.deepEqual(state.bonds, ['rosie-stew', 'rosie-fire']);
  assert.equal(talk(state, 'rosie-kitchen').dialogue.id, 'rosie-kitchen', 'not yet');
  // Beating her in the group stage is the rest of the way.
  let group = groupStage();
  group = { ...group, affinity: state.affinity, bonds: state.bonds };
  group = duel(group, 'rosie', 'rosie');
  assert.equal(group.affinity.rosie, 70);
  group = duel(group, 'rosie', 'rosie');
  assert.equal(group.affinity.rosie, 70, 'a rematch pays nothing, affinity included');
  group = talk(toGoose(group), 'rosie-kitchen');
  assert.equal(group.dialogue.id, 'rosie-invite');
  group = read(chooseDialogue(group, 'invite'));
  assert.deepEqual(group.troupe, ['eli', 'rosie']);
  assert.equal(go(group, 'rosie-kitchen').dialogue.id, 'rosie-member');
});

test('story: Juno joins after the final, keeping her deck except the jack she gave away', () => {
  let state = groupStage();
  for (const id of ['agnes', 'rosie', 'basil', 'pike']) state = duel(state, id, id);
  state = duel(state, 'juno', 'juno');
  assert.deepEqual(state.troupe, ['eli', 'juno']);
  const book = memberBook(state, 'juno');
  assert.equal(book['0-11'], undefined, '♠J now belongs to Eli');
  assert.equal(book['0-14'], 'gold');
});

test('members may take street-show stages; story duels and borrowed trunks stay with Eli', () => {
  let state = toGoose(arrived());
  state = read(chooseDialogue(talk(state, 'goose-board'), 'hire-stan'));
  const busk = show(state, 'double');
  assert.deepEqual(battleSetup(busk).performers, ['eli', 'stan']);
  assert.deepEqual(battleSetup(busk).books, { stan: {} });
  const borrowed = show(state, 'borrowed');
  assert.deepEqual(battleSetup(borrowed).performers, ['eli']);
  let story = toTheatre(state);
  story = chooseDialogue(talk(talk(story, 'doris'), 'ada'), 'ada');
  assert.deepEqual(battleSetup(story).performers, ['eli']);
});

test('saves: v5 round-trips the troupe; tampered rosters, affinity and bonds are refused', () => {
  let state = toGoose(arrived());
  state = read(chooseDialogue(talk(state, 'goose-board'), 'hire-stan'));
  const saved = serializeAdventure(state);
  assert.deepEqual(restoreAdventure(saved).state.troupe, ['eli', 'stan']);
  const tamper = (patch) => {
    const envelope = JSON.parse(saved);
    Object.assign(envelope.state, patch);
    return restoreAdventure(JSON.stringify(envelope));
  };
  assert.equal(tamper({ troupe: ['stan'] }), null, 'Eli always leads');
  assert.equal(tamper({ troupe: ['eli', 'felix'] }), null);
  assert.equal(tamper({ troupe: ['eli', 'stan', 'stan'] }), null);
  assert.equal(tamper({ affinity: { rosie: 101 } }), null);
  assert.equal(tamper({ affinity: { nobody: 5 } }), null);
  assert.equal(tamper({ bonds: ['free-stew'] }), null);
  assert.ok(tamper({ affinity: { rosie: 40 }, bonds: ['rosie-fire'] }));
  // v4 saves gain an empty troupe.
  const old = JSON.parse(saved);
  old.version = 'magician-adventure-v4';
  old.state.version = 'magician-adventure-v4';
  delete old.state.troupe;
  delete old.state.affinity;
  delete old.state.bonds;
  const migrated = restoreAdventure(JSON.stringify(old));
  assert.equal(migrated.state.version, 'magician-adventure-v6', 'v4 → v5 → v6');
  assert.deepEqual(migrated.state.troupe, ['eli']);
});
