import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceDialogue,
  battleKit,
  BATTLES,
  battleSetup,
  chooseDialogue,
  createAdventure,
  finishAdventureBattle,
  fogOf,
  gatherIntel,
  INTEL_PRICES,
  intelUnits,
  intelView,
  interactAdventure,
  passTime,
  RUMOURS,
  scoutable,
  startShow,
  visibleHotspots,
  walkAdventure,
  weekday,
} from './magician-world.ts';
import { ITEMS } from '../cards/throw-loadout.ts';

// v6 intel (ADR-0059): formal shows are hidden, street shows half hidden, rumours can lie.
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
const go = (state, id) => {
  const target = visibleHotspots(state).find((entry) => entry.id === id);
  assert.ok(target, id);
  return interactAdventure(walkTo(state, target.x), id);
};
const talk = (state, id) => read(go(state, id));
const toTown = (state) => (state.map === 'bridgeport' ? state : go(state, `${state.map}-exit`));
const toTheatre = (state) => (state.map === 'thursday' ? state : go(toTown(state), 'thursday-door'));
const at = (state, slot) => {
  while (state.clock.slot !== slot) state = passTime(state);
  return state;
};
const registered = () => ({ ...talk(toTheatre(read(createAdventure(4242, 2))), 'doris'), fee: 100 });
const mainHall = (state) => ({ ...state, flags: { ...state.flags, mainHall: true }, won: [...state.won, 'ada', 'bea'] });

test('every rumour tells the truth about the real kit exactly when it says it does', () => {
  for (const [kind, rumours] of Object.entries(RUMOURS)) {
    assert.equal(fogOf(kind), 'formal', `${kind} is a formal performance`);
    const kit = battleKit(kind);
    for (const rumour of rumours) {
      const [unit, ref] = rumour.unit.split(':');
      const real = unit === 'relic' ? kit.relic === ref : kit.items.includes(ref);
      assert.equal(rumour.truth, real, rumour.id);
      if (unit === 'item') assert.ok(ITEMS.some((item) => item.id === ref), rumour.id);
    }
    assert.ok(rumours.some((rumour) => rumour.source === 'paper') && rumours.some((rumour) => rumour.source === 'pub'), kind);
  }
  // The first lies wait in the group stage, where being fooled costs little.
  const lies = Object.entries(RUMOURS).flatMap(([kind, list]) => list.filter((r) => !r.truth).map(() => kind));
  assert.deepEqual([...new Set(lies)].sort(), ['basil', 'pike']);
});

test('fog: act one is open, street shows show their style and big props, formal shows hide everything', () => {
  assert.equal(fogOf('qualifier'), 'open');
  assert.equal(fogOf('show-noshield'), 'street');
  assert.equal(fogOf('juno'), 'formal');
  const state = registered();
  assert.deepEqual(intelView(state, 'qualifier').visible, intelUnits('qualifier'));
  assert.deepEqual(intelView(state, 'show-noshield').visible, ['style', 'item:cinder', 'item:ash', 'item:pair']);
  assert.deepEqual(intelView(state, 'ada').visible, []);
  const setup = battleSetup(chooseDialogue(talk(state, 'ada'), 'ada'));
  assert.equal(setup.intel.fog, 'formal');
  assert.deepEqual(setup.intel.visible, []);
});

test('sources cost a slot and fee, keep their hours, and work once per opponent', () => {
  let state = registered();
  assert.deepEqual(scoutable(state), ['ada', 'bea']);
  assert.strictEqual(gatherIntel(state, 'agnes', 'paper'), state, 'not on the bill yet');
  const paper = gatherIntel(state, 'ada', 'paper');
  assert.equal(paper.fee, state.fee - INTEL_PRICES.paper);
  assert.equal(paper.clock.slot, state.clock.slot + 1);
  assert.deepEqual(intelView(paper, 'ada').visible, ['style']);
  assert.deepEqual(intelView(paper, 'ada').rumours.map((r) => [r.id, r.status]), [['ada-paper', 'heard']]);
  const again = at(paper, 0);
  assert.strictEqual(gatherIntel(again, 'ada', 'paper'), again, 'once');
  assert.strictEqual(gatherIntel(paper, 'ada', 'pub'), paper, 'the pub is an evening thing');
  const evening = at(paper, 2);
  const watched = gatherIntel(evening, 'ada', 'watch');
  assert.deepEqual(intelView(watched, 'ada').visible, ['style', 'item:umbrella', 'item:ward', 'item:pair']);
  assert.equal(intelView(watched, 'ada').rumours[0].status, 'true', 'confirmed by your own eyes');
  assert.strictEqual(gatherIntel(state, 'ada', 'backstage'), state, 'backstage needs the main hall');
  const hall = mainHall(state);
  assert.deepEqual(intelView(gatherIntel(hall, 'agnes', 'backstage'), 'agnes').visible, ['relic']);
  const broke = { ...state, fee: 1 };
  assert.strictEqual(gatherIntel(broke, 'ada', 'paper'), broke);
});

test('after the duel everything is seen; a false rumour is stamped, Mrs Dodd explains, Sunday prints the correction', () => {
  let state = toTheatre(mainHall(registered()));
  state = at(state, 0);
  state = gatherIntel(state, 'basil', 'paper');
  assert.deepEqual(intelView(state, 'basil').rumours.map((r) => r.status), ['heard']);
  state = chooseDialogue(talk(state, 'basil'), 'basil');
  assert.equal(state.mode, 'battle');
  state = finishAdventureBattle(state, state.battle.id, 1);
  assert.deepEqual(intelView(state, 'basil').visible, intelUnits('basil'));
  assert.deepEqual(intelView(state, 'basil').rumours.map((r) => r.status), ['false']);
  assert.ok(state.flags.falseIntelSeen);
  assert.ok(state.notice.some((line) => line.startsWith('情报核对 · 情报有误')));
  state = read(state);
  state = chooseDialogue(talk(toTown(state), 'dodd'), 'close');
  assert.ok(state.flags.doddCorrection, 'she explains once');
  while (weekday(state.clock.day) !== 0 || state.clock.slot !== 0) state = passTime({ ...state, mode: 'explore', dialogue: null, panel: null });
  assert.ok(state.notice.some((line) => line.includes('更正启事')));
});

test('formal battles and their rumours are consistent with the battle table', () => {
  const formal = Object.entries(BATTLES).filter(([, def]) => def.formal).map(([id]) => id).sort();
  assert.deepEqual(formal, ['ada', 'agnes', 'basil', 'bea', 'juno', 'pike', 'rosie'].sort());
  assert.deepEqual(Object.keys(RUMOURS).sort(), formal);
  // A street show is fully seen after it is fought, too.
  let state = registered();
  state = go(toTown(state), 'busk-stage');
  if (state.mode === 'dialogue') state = chooseDialogue(read(state), 'shows');
  state = startShow(state, 'single');
  state = finishAdventureBattle(state, state.battle.id, 0);
  assert.deepEqual(intelView(state, 'show-single').visible, intelUnits('show-single'));
});
