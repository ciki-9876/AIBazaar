import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceDialogue,
  battleSetup,
  chooseDialogue,
  clearNotice,
  createAdventure,
  finishAdventureBattle,
  haveTea,
  helpLandlady,
  interactAdventure,
  LODGINGS,
  MEALS,
  memberStatus,
  passTime,
  payArrears,
  presenceBreakdown,
  presenceOf,
  RECRUITS,
  rehearse,
  rentLodging,
  restoreAdventure,
  serializeAdventure,
  setMeals,
  stageLevel,
  stageThreshold,
  startShow,
  visibleHotspots,
  walkAdventure,
  weekday,
  AWAY_DAYS,
  REHEARSAL_STAGE,
  START_FAME,
} from './magician-world.ts';

// v6 life (ADR-0059): presence, the clock, lodging, meals, wages and mood.
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
const arrived = () => read(createAdventure(4242, 2));
/** Pass slots until the given weekday (0 = Monday) morning. */
const until = (state, day) => {
  do state = passTime(state);
  while (!(weekday(state.clock.day) === day && state.clock.slot === 0));
  return state;
};
const withTroupe = (state, members) => ({
  ...state,
  troupe: ['eli', ...members],
  stage: { ...state.stage, ...Object.fromEntries(members.map((id) => [id, RECRUITS[id].stage])) },
  mood: { ...state.mood, ...Object.fromEntries(members.map((id) => [id, 2])) },
});

test('stage levels follow 5 × n(n−1)/2 and stop at twenty', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(stageThreshold), [0, 5, 15, 30, 50]);
  assert.deepEqual([0, 4, 5, 14, 15, 29, 30].map(stageLevel), [1, 1, 2, 2, 3, 3, 4]);
  assert.equal(stageLevel(1e6), 20);
});

test('presence starts at the classic 320 and grows with experience, fame, lodging and mood', () => {
  const home = createAdventure(1, 1);
  assert.equal(presenceOf(home, 'eli'), 320);
  let state = arrived();
  assert.equal(state.lodging, 'bus');
  assert.equal(presenceOf(state, 'eli'), 320, 'the bus adds nothing');
  state = { ...state, stage: { eli: stageThreshold(4) }, fame: START_FAME + 8 };
  assert.deepEqual(presenceBreakdown(state, 'eli'), { level: 4, base: 295, fame: 48, lodging: 0, mood: 0, total: 343 });
  state = { ...state, lodging: 'boarding' };
  assert.equal(presenceOf(state, 'eli'), Math.round(343 * 1.06));
  state = { ...state, mood: { eli: 4 } };
  assert.equal(presenceOf(state, 'eli'), Math.round(343 * 1.14), 'lodging and mood add up');
  state = { ...state, mood: { eli: 1 }, lodging: 'bus' };
  assert.equal(presenceOf(state, 'eli'), Math.round(343 * 0.92));
  // The duel table receives each performer's cap and the opponent's.
  state = toTheatre(arrived());
  state = chooseDialogue(talk(talk(state, 'doris'), 'ada'), 'ada');
  const setup = battleSetup(state);
  assert.deepEqual(setup.presence, { eli: 320 });
  assert.equal(setup.enemyPresence, 320);
});

test('duels take a slot, grant experience and fame on first wins; Sunday night settles the week', () => {
  let state = toTheatre(arrived());
  assert.deepEqual(state.clock, { day: 0, slot: 0 });
  state = talk(state, 'doris');
  state = chooseDialogue(talk(state, 'ada'), 'ada');
  const before = state.stage.eli;
  state = read(finishAdventureBattle(state, state.battle.id, 0));
  assert.deepEqual(state.clock, { day: 0, slot: 1 });
  assert.equal(state.stage.eli, before + 3);
  assert.equal(state.fame, START_FAME + 1);
  state = { ...state, fee: 100, lodging: 'boarding', meals: 'feast' };
  state = until(state, 0);
  assert.equal(weekday(state.clock.day), 0);
  assert.equal(state.fee, 100 - LODGINGS[2].price - MEALS.feast.perHead);
  assert.equal(state.mood.eli, 3 + 1, 'a win and a feast');
  assert.match(state.notice[0], /结账/);
  assert.equal(clearNotice(state).notice, null);
  assert.deepEqual(state.week, [], 'a fresh week');
});

test('moving in is atomic and paid up front; the bus is always free', () => {
  let state = { ...arrived(), fee: 5 };
  assert.strictEqual(rentLodging(state, 'boarding'), state, 'not enough');
  state = { ...state, fee: 30 };
  state = rentLodging(state, 'boarding');
  assert.equal(state.lodging, 'boarding');
  assert.equal(state.fee, 18);
  assert.strictEqual(rentLodging(state, 'nowhere'), state);
  assert.equal(rentLodging({ ...state, arrears: 1 }, 'suite').lodging, 'boarding', 'pay what you owe first');
  const bus = rentLodging({ ...state, arrears: 1 }, 'bus');
  assert.equal(bus.lodging, 'bus');
  assert.equal(bus.arrears, 0);
});

test('unpaid rent only gets less comfortable: warning, locked rehearsal and gloom, then the bus', () => {
  let state = withTroupe({ ...arrived(), lodging: 'boarding', fee: 0, meals: 'home' }, ['juno']);
  state = until(state, 0);
  assert.equal(state.arrears, 1);
  assert.equal(state.lodging, 'boarding');
  state = until(state, 0);
  assert.equal(state.arrears, 2);
  assert.equal(state.mood.eli, 1, 'gloom, but Eli never refuses');
  assert.strictEqual(rehearse(state, 'eli'), state, 'the rehearsal room is locked');
  state = until(state, 0);
  assert.equal(state.arrears, 0);
  assert.equal(state.lodging, 'bus');
  assert.deepEqual(state.troupe, ['eli', 'juno'], 'nobody is lost');
  // Paying off and working off a week.
  let owing = { ...state, lodging: 'attic', arrears: 2, fee: 12 };
  assert.equal(payArrears(owing).fee, 0);
  assert.equal(payArrears(owing).arrears, 0);
  const short = { ...owing, fee: 11 };
  assert.strictEqual(payArrears(short), short, 'all or nothing');
  const helped = helpLandlady(owing);
  assert.equal(helped.arrears, 1);
  assert.notDeepEqual(helped.clock, owing.clock, 'a morning of sweeping');
});

test('meals set the mood; a member who has refused the stage goes home hungry and comes back with jam', () => {
  let state = withTroupe({ ...arrived(), fee: 0 }, ['stan']);
  state = setMeals(state, 'feast');
  state = until(state, 0);
  assert.match(state.notice.join(' '), /降成了「清汤寡水」/, 'no money, no feast');
  assert.equal(state.mood.stan, 0, 'plain fare and unpaid wages');
  assert.equal(memberStatus(state, 'stan'), 'refuses');
  state = toTown(state);
  state = go(state, 'busk-stage');
  if (state.mode === 'dialogue') state = chooseDialogue(read(state), 'shows');
  assert.deepEqual(battleSetup(startShow(state, 'double')).performers, ['eli'], 'he will not go on');
  state = until({ ...state, mode: 'explore', panel: null }, 0);
  assert.equal(memberStatus(state, 'stan'), 'away');
  const back = state.away.stan;
  assert.equal(back, state.clock.day + AWAY_DAYS);
  state = until(state, 0);
  assert.equal(state.away.stan, undefined);
  assert.equal(state.mood.stan, 2);
  assert.ok(state.keepsakes.includes('jam-stan'));
});

test('tea is an afternoon thing, once a week each; rehearsal needs a morning and a room', () => {
  let state = withTroupe(arrived(), ['rosie']);
  assert.strictEqual(haveTea(state, 'rosie'), state, 'morning');
  state = passTime(state);
  const tea = haveTea(state, 'rosie');
  assert.equal(tea.mood.rosie, 3);
  assert.equal(tea.affinity.rosie, 3);
  assert.equal(tea.clock.slot, 2);
  const again = { ...tea, clock: state.clock };
  assert.strictEqual(haveTea(again, 'rosie'), again, 'once a week');
  state = arrived();
  assert.strictEqual(rehearse(state, 'eli'), state, 'no room on the bus');
  state = { ...state, lodging: 'boarding' };
  const practised = rehearse(state, 'eli');
  assert.equal(practised.stage.eli, state.stage.eli + REHEARSAL_STAGE);
  const later = passTime(state);
  assert.strictEqual(rehearse(later, 'eli'), later, 'mornings only');
});

test('beds limit who can perform; recruits never start more than three levels behind Eli', () => {
  let state = withTroupe(arrived(), ['juno', 'rosie', 'stan']);
  assert.equal(memberStatus(state, 'stan'), 'lodged', 'two beds on the bus');
  assert.equal(memberStatus({ ...state, lodging: 'attic' }, 'stan'), 'ready');
  state = toTown({ ...arrived(), stage: { eli: stageThreshold(8) } });
  state = go(toTown(state), 'goose-door');
  state = read(chooseDialogue(talk(state, 'goose-board'), 'hire-stan'));
  assert.ok(state.troupe.includes('stan'));
  assert.equal(stageLevel(state.stage.stan), 5, 'raised to Eli’s level − 3');
  assert.equal(state.mood.stan, 2);
});

test('saves round-trip v6 life and refuse tampered fields; v5 saves gain counted experience', () => {
  let state = withTroupe({ ...arrived(), lodging: 'attic', arrears: 1, keepsakes: ['jam-juno'] }, ['juno']);
  const saved = serializeAdventure(state);
  assert.deepEqual(restoreAdventure(saved).state.mood, state.mood);
  const tamper = (patch) => {
    const envelope = JSON.parse(saved);
    Object.assign(envelope.state, patch);
    return restoreAdventure(JSON.stringify(envelope));
  };
  assert.equal(tamper({ mood: { eli: 0, juno: 2 } }), null, 'Eli never refuses');
  assert.equal(tamper({ mood: { eli: 2 } }), null, 'every member has a mood');
  assert.equal(tamper({ stage: { eli: -1, juno: 0 } }), null);
  assert.equal(tamper({ lodging: 'palace' }), null);
  assert.equal(tamper({ arrears: 3 }), null);
  assert.equal(tamper({ meals: 'banquet' }), null);
  assert.equal(tamper({ clock: { day: 0, slot: 3 } }), null);
  assert.equal(tamper({ away: { eli: 9 } }), null);
  assert.equal(tamper({ week: ['free:money'] }), null);
  assert.equal(tamper({ keepsakes: ['gold-bar'] }), null);
  assert.ok(tamper({ away: { juno: 12 }, week: ['tea:juno'] }));
  const old = JSON.parse(saved);
  old.version = old.state.version = 'magician-adventure-v5';
  old.state.won = ['practice', 'qualifier', 'ada', 'bea'];
  for (const key of ['clock', 'stage', 'fame', 'mood', 'lodging', 'meals', 'arrears', 'away', 'week', 'keepsakes', 'intel', 'notice'])
    delete old.state[key];
  delete old.state.flags.falseIntelSeen;
  delete old.state.flags.doddCorrection;
  const migrated = restoreAdventure(JSON.stringify(old)).state;
  assert.equal(migrated.version, 'magician-adventure-v6');
  assert.equal(migrated.stage.eli, 3 + 3 + 3, 'the qualifier and both morning duels');
  assert.equal(migrated.fame, START_FAME + 2);
  assert.equal(migrated.lodging, 'bus');
  assert.deepEqual(migrated.intel.ada.seen.includes('relic'), true, 'what was fought is known');
});
