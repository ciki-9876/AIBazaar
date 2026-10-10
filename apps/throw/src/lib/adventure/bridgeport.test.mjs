import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adventureObjective,
  advanceDialogue,
  BATTLES,
  battleSetup,
  buyOffer,
  chooseDialogue,
  closePanel,
  createAdventure,
  DIALOGUES,
  filterBook,
  finishAdventureBattle,
  interactAdventure,
  isFinalist,
  MAPS,
  restoreAdventure,
  serializeAdventure,
  SHOP,
  SHOWS,
  startShow,
  travelOn,
  unlockedKit,
  visibleHotspots,
  walkAdventure,
} from './magician-world.ts';
import { createThrowDuel } from '../cards/throw-duel.ts';
import { packThrowItems } from '../cards/throw-loadout.ts';

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
/** Walk to a person, accept their duel, and report the result. */
const duel = (state, id, choice, winner = 0, report) => {
  state = talk(state, id);
  state = chooseDialogue(state, choice);
  assert.equal(state.mode, 'battle', `${choice} should start a duel`);
  return read(finishAdventureBattle(state, state.battle.id, winner, report));
};
const toTown = (state) => (state.map === 'bridgeport' ? state : go(state, `${state.map}-exit`));
const toTheatre = (state) => (state.map === 'thursday' ? state : go(toTown(state), 'thursday-door'));
const show = (state, id, winner = 0) => {
  state = toTown(state);
  state = go(state, 'busk-stage');
  if (state.mode === 'dialogue') state = chooseDialogue(read(state), 'shows');
  assert.equal(state.panel, 'shows');
  state = startShow(state, id);
  assert.equal(state.battle.kind, `show-${id}`);
  return read(finishAdventureBattle(state, state.battle.id, winner));
};
const arrived = () => read(createAdventure(4242, 2));

test('act one ends at the bus and the act-complete card travels on to Bridgeport', () => {
  let state = createAdventure(5, 1);
  state = { ...state, mode: 'complete', flags: { ...state.flags, departed: true } };
  const next = travelOn(state);
  assert.equal(next.act, 2);
  assert.equal(next.map, 'bridgeport');
  assert.equal(next.dialogue.id, 'bp-arrival');
  const fresh = createAdventure(5, 1);
  assert.strictEqual(travelOn(fresh), fresh, 'only from the act-complete card');
  const here = read(next);
  assert.equal(here.fee, 10, 'Mia’s biscuit money');
  assert.equal(read(next).fee, 10, 'and only once');
  assert.ok(here.flags.arrived);
});

test('every referenced dialogue, battle result and hotspot conversation exists', () => {
  for (const [id, battle] of Object.entries(BATTLES)) {
    for (const key of ['win', 'loss', 'draw']) if (battle[key]) assert.ok(DIALOGUES[battle[key]], `${id}.${key}`);
  }
  for (const dialogue of Object.values(DIALOGUES))
    for (const choice of dialogue.choices ?? []) {
      if (choice.action.type === 'battle') assert.ok(BATTLES[choice.action.battle], choice.action.battle);
      if (choice.action.type === 'pay') assert.ok(DIALOGUES[choice.action.nextDialogue] && DIALOGUES[choice.action.poor]);
    }
  for (const show of SHOWS) assert.ok(BATTLES[`show-${show.id}`]);
  for (const map of Object.values(MAPS))
    for (const hotspot of map.hotspots) if (hotspot.target) assert.ok(MAPS[hotspot.target], hotspot.id);
  assert.ok(DIALOGUES['rematch-win'] && DIALOGUES['rematch-loss']);
});

test('the main route is gated in story order and pays each first win once', () => {
  let state = arrived();
  assert.equal(adventureObjective(state).target, 'thursday-door');
  // The sisters will not play an unregistered magician.
  state = toTheatre(state);
  state = talk(state, 'ada');
  assert.equal(state.mode, 'explore');
  state = talk(state, 'doris');
  assert.ok(state.flags.metDoris);
  state = duel(state, 'ada', 'ada');
  assert.equal(state.fee, 20);
  state = duel(state, 'bea', 'bea', 1);
  assert.equal(state.fee, 20, 'a loss pays nothing');
  state = duel(state, 'bea', 'bea');
  assert.equal(state.fee, 30);
  assert.equal(spot(state, 'ada'), undefined, 'the sisters leave the stage for the Goose');
  // Doris wants an audience first.
  state = talk(state, 'doris');
  assert.equal(state.flags.mainHall, false);
  assert.match(adventureObjective(state).title, /街头演出/);
  for (const id of ['double', 'single', 'quick']) state = show(state, id);
  assert.equal(state.fee, 30 + 10 + 10 + 12);
  assert.ok(state.owned.variants.includes('1-8:mint'));
  state = talk(toTheatre(state), 'doris');
  assert.ok(state.flags.mainHall);
  for (const id of ['agnes', 'rosie', 'basil', 'pike']) state = duel(state, id, id);
  assert.ok(isFinalist(state));
  assert.equal(spot(state, 'juno').x, 1500, 'Juno now waits on the theatre stage');
  const before = state.fee;
  state = duel(state, 'juno', 'juno');
  assert.ok(state.flags.champion);
  assert.equal(state.fee, before + 40);
  assert.ok(unlockedKit(state).items.includes('stride'));
  assert.ok(unlockedKit(state).relics.includes('relay'));
  assert.ok(state.owned.variants.includes('0-11:LSJ'));
  // A rematch pays nothing and says so.
  const rematch = talk(state, 'juno');
  assert.equal(rematch.dialogue, null);
  state = toTown(state);
  state = go(state, 'bp-bus');
  assert.equal(state.dialogue.id, 'bp-departure');
  state = read(state);
  assert.equal(state.mode, 'complete');
  assert.ok(state.flags.leftBridgeport);
  assert.strictEqual(travelOn(state), state, 'Westport has not opened yet');
});

test('rematches with a paid reward use the rematch dialogue and keep the money where it is', () => {
  let state = arrived();
  state = talk(toTheatre(state), 'doris');
  state = duel(state, 'ada', 'ada');
  state = duel(state, 'bea', 'bea');
  state = toTown(state);
  state = show(state, 'double');
  const fee = state.fee;
  state = toTown(state);
  state = go(state, 'busk-stage');
  state = startShow(state, 'double');
  state = finishAdventureBattle(state, state.battle.id, 0);
  assert.equal(state.dialogue.id, 'rematch-win');
  assert.equal(read(state).fee, fee);
});

test('street shows carry their terms and kit restrictions into the duel', () => {
  let state = arrived();
  state = go(state, 'busk-stage');
  assert.equal(state.dialogue.id, 'busk-intro');
  state = chooseDialogue(read(state), 'shows');
  state = startShow(state, 'noshield');
  let setup = battleSetup(state);
  assert.ok(!setup.available.items.some((id) => ['umbrella', 'ward', 'thorns', 'shieldbash'].includes(id)));
  assert.equal(setup.rule, '巡演箱里不许带护盾类道具。');
  state = read(finishAdventureBattle(state, state.battle.id, 1));
  state = go(state, 'busk-stage');
  assert.equal(state.panel, 'shows', 'the intro plays only once');
  state = startShow(state, 'borrowed');
  setup = battleSetup(state);
  assert.deepEqual(setup.forced, { items: ['poison', 'venom', 'slow', 'pair', 'draw'], relic: 'toxin' });
  state = read(finishAdventureBattle(state, state.battle.id, 1));
  state = go(state, 'busk-stage');
  state = startShow(state, 'tea');
  setup = battleSetup(state);
  assert.deepEqual(setup.terms, { hpFloor: 160 });
  // The setup builds a real, valid duel.
  const real = createThrowDuel(
    state.battle.seed,
    ['pair'],
    setup.enemyStyle,
    null,
    setup.enemyRelic,
    packThrowItems(['pair']),
    { enemy: setup.enemyBook },
    { enemyItems: setup.enemyItems, terms: setup.terms },
  );
  assert.deepEqual(real.terms, { hpFloor: 160 });
  assert.deepEqual(real.fighters[1].items.sort(), ['pair', 'sequence']);
});

test('Hobbs’s shop is atomic, stocks follow wins, and owned things cannot be bought twice', () => {
  let state = arrived();
  state = go(toTown(state), 'curios-door');
  state = talk(state, 'hobbs');
  state = chooseDialogue(state, 'shop');
  assert.equal(state.mode, 'panel');
  assert.equal(state.fee, 10);
  assert.strictEqual(buyOffer(state, 'compass'), state, 'too dear');
  assert.strictEqual(buyOffer(state, 'poison'), state, 'not stocked before Agnes is beaten');
  assert.strictEqual(buyOffer(state, 'v-mint'), state, '12 is more than 10');
  state = { ...state, fee: 100 };
  state = buyOffer(state, 'v-mint');
  assert.equal(state.fee, 88);
  assert.ok(state.owned.variants.includes('1-7:mint'));
  assert.strictEqual(buyOffer(state, 'v-mint'), state);
  state = buyOffer(state, 'compass');
  assert.ok(unlockedKit(state).items.includes('compass'));
  assert.equal(state.fee, 63);
  const closed = closePanel(state);
  assert.strictEqual(buyOffer(closed, 'heart'), closed, 'only at the counter');
  state = { ...state, won: [...state.won, 'agnes'] };
  assert.notStrictEqual(buyOffer(state, 'poison'), state);
});

test('Hobbs’s lost things are found once each, then he duels for his recipe', () => {
  let state = arrived();
  state = go(toTown(state), 'curios-door');
  state = read(chooseDialogue(talk(state, 'hobbs'), 'close'));
  assert.ok(state.flags.hobbsAsked);
  state = talk(toTown(state), 'bridge-crate');
  assert.deepEqual(state.found, ['pestle']);
  assert.equal(spot(state, 'bridge-crate'), undefined);
  state = talk(go(state, 'goose-door'), 'goose-cellar');
  state = talk(toTheatre(state), 'wings-trunk');
  assert.deepEqual(state.found.sort(), ['jar', 'pestle', 'scale']);
  state = go(toTown(state), 'curios-door');
  state = go(state, 'hobbs');
  assert.equal(state.dialogue.id, 'hobbs-return');
  state = chooseDialogue(read(state), 'hobbs');
  assert.equal(battleSetup(state).enemyBook['2-14'], 'LCA');
  state = read(finishAdventureBattle(state, state.battle.id, 0));
  assert.ok(unlockedKit(state).items.includes('venom'));
  assert.ok(state.owned.variants.includes('2-10:LC10'));
});

test('Stan’s lavatory needs a paid-for paper and Doris’s key, and pays out once', () => {
  let state = arrived();
  state = talk(state, 'stan');
  assert.ok(state.flags.stanAsked);
  state = go(state, 'dodd');
  assert.equal(state.dialogue.id, 'dodd-paper-offer');
  const poor = chooseDialogue(read({ ...state, fee: 1 }), 'paper');
  assert.equal(poor.dialogue.id, 'dodd-poor');
  assert.equal(poor.fee, 1);
  state = read(chooseDialogue(read(state), 'paper'));
  assert.ok(state.flags.stanPaper);
  assert.equal(state.fee, 8);
  state = talk(toTheatre(state), 'doris');
  state = talk(state, 'doris');
  assert.ok(state.flags.stanKey);
  state = go(toTown(state), 'stan');
  assert.equal(state.dialogue.id, 'stan-done');
  state = read(state);
  assert.equal(state.fee, 23);
  assert.ok(state.owned.variants.includes('1-4:LH4'));
  assert.equal(read(go(state, 'stan')).fee, 23);
});

test('the dossier files what each opponent actually threw', () => {
  let state = arrived();
  state = talk(toTheatre(state), 'doris');
  state = duel(state, 'ada', 'ada', 1, { suits: [6, 0, 0, 1], kinds: [1, 3, 0, 0, 0, 0, 0, 0, 0] });
  state = duel(state, 'ada', 'ada', 0, { suits: [4, 0, 0, 0], kinds: [0, 2, 0, 0, 0, 0, 0, 0, 0] });
  assert.deepEqual(state.dossier.ada, { duels: 2, wins: 1, losses: 1, suits: [10, 0, 0, 1], kinds: [1, 5, 0, 0, 0, 0, 0, 0, 0] });
  // Nonsense reports are ignored, not trusted.
  state = duel(state, 'bea', 'bea', 0, { suits: [-1, 'x'], kinds: [] });
  assert.deepEqual(state.dossier.bea.suits, [0, 0, 0, 0]);
});

test('deck books keep owned variants only', () => {
  let state = arrived();
  state = { ...state, owned: { ...state.owned, variants: ['1-8:mint', '0-11:LSJ'] } };
  assert.deepEqual(filterBook(state, { '1-8': 'mint', '0-11': 'LSJ', '2-2': 'gold' }), { '1-8': 'mint', '0-11': 'LSJ' });
});

test('saves round-trip and refuse other products, versions and broken shapes', () => {
  let state = arrived();
  state = talk(toTheatre(state), 'doris');
  const json = serializeAdventure(state, { loadout: { relic: null } });
  const back = restoreAdventure(json);
  assert.deepEqual(back.state, state);
  assert.deepEqual(back.envelope.loadout, { relic: null });
  const envelope = JSON.parse(json);
  assert.equal(restoreAdventure(JSON.stringify({ ...envelope, product: 'elevator' })), null);
  assert.equal(restoreAdventure(JSON.stringify({ ...envelope, version: 'magician-adventure-v2' })), null);
  assert.equal(restoreAdventure('{nope'), null);
  for (const broken of [
    { map: 'atlantis' },
    { fee: -1 },
    { act: 1 },
    { owned: { items: ['laser'], relics: [], variants: [] } },
    { owned: { items: [], relics: [], variants: ['0-2:LHA'] } },
    { flags: { ...state.flags, extra: true } },
    { map: '__proto__' },
    { dossier: [] },
    { dossier: { ada: null } },
    { dossier: { ada: { duels: 1, wins: 1, losses: 1, suits: [0, 0, 0, 0], kinds: Array(9).fill(0) } } },
    { dossier: { ada: { duels: 1, wins: 1, losses: 0, suits: [0, 0, 0], kinds: Array(9).fill(0) } } },
    { dossier: { ada: { duels: 1, wins: 1, losses: 0, suits: [0, -1, 0, 0], kinds: Array(9).fill(0) } } },
    { dossier: { ada: { duels: 1, wins: 1, losses: 0, suits: [0, 0, 0, 0], kinds: ['bad', ...Array(8).fill(0)] } } },
  ])
    assert.equal(restoreAdventure(JSON.stringify({ ...envelope, state: { ...state, ...broken } })), null, JSON.stringify(broken));
  // A duel in progress is not resumable; the hero is put back.
  const fighting = chooseDialogue(read(go(state, 'ada')), 'ada');
  const resumed = restoreAdventure(serializeAdventure(fighting)).state;
  assert.equal(resumed.mode, 'explore');
  assert.equal(resumed.battle, null);
  for (const broken of [
    { returnX: -1 }, { returnX: MAPS.thursday.width }, { returnX: '430' },
    { returnMap: 'workshop' }, { returnMap: '__proto__' }, { seed: -1 }, { id: fighting.nextBattleId },
    { enemyStyle: 'laser' }, { coach: 'forged' }, { kind: 'practice' },
  ]) assert.equal(restoreAdventure(serializeAdventure({ ...fighting, battle: { ...fighting.battle, ...broken } })), null, JSON.stringify(broken));
});

test('v3 saves preserve progress and earned kits while retiring the sorting relic', () => {
  const current = arrived();
  const legacy = { ...current, version: 'magician-adventure-v3', fee: 125,
    owned: { items: ['poison'], relics: ['order', 'heart'], variants: ['1-7:mint'] } };
  const json = JSON.stringify({ product: 'throw-adventure', version: 'magician-adventure-v3', state: legacy,
    loadout: { style: 'quick', layout: [{ id: 'quick', start: 0 }], relic: 'order' } });
  const restored = restoreAdventure(json);
  assert.ok(restored);
  assert.equal(restored.state.version, 'magician-adventure-v5');
  assert.deepEqual(restored.state.troupe, ['eli']);
  assert.deepEqual(restored.state.affinity, {});
  assert.deepEqual(restored.state.bonds, []);
  assert.equal(restored.envelope.version, 'magician-adventure-v5');
  assert.equal(restored.state.fee, 125);
  assert.deepEqual(restored.state.won, current.won);
  assert.deepEqual(restored.state.flags, current.flags);
  assert.deepEqual(restored.state.owned.relics, ['heart']);
  assert.equal(restored.envelope.loadout.relic, null);
  assert.deepEqual(restored.envelope.loadout.layout, [{ id: 'quick', start: 0 }]);
  assert.ok(['pair', 'draw', 'mend', 'wash', 'umbrella', 'thorns', 'poison'].every((id) => restored.state.owned.items.includes(id)));
  assert.deepEqual(restoreAdventure(serializeAdventure(restored.state)).state, restored.state);
  const mismatched = JSON.parse(json);
  mismatched.state.version = 'magician-adventure-v2';
  assert.equal(restoreAdventure(JSON.stringify(mismatched)), null);
});

test('save adapter extras cannot replace the product, rules version or deterministic state', () => {
  const state = arrived();
  assert.deepEqual(restoreAdventure(serializeAdventure(state, { product: 'elevator', version: 'garbage', state: null })).state, state);
});

test('every shop offer and battle reward names real items, relics and valid variants', () => {
  for (const offer of SHOP) assert.ok(offer.price > 0 && offer.note);
  let state = { ...arrived(), fee: 10000, won: ['agnes', 'rosie', 'basil', 'pike'], flags: { ...arrived().flags, mainHall: true } };
  state = { ...state, mode: 'panel', panel: 'shop' };
  for (const offer of SHOP) {
    const next = buyOffer(state, offer.id);
    assert.notStrictEqual(next, state, offer.id);
    state = next;
  }
  assert.ok(restoreAdventure(serializeAdventure(state)));
});

test('every story battle builds a legal duel from its definition', () => {
  for (const [id, def] of Object.entries(BATTLES)) {
    const duel = createThrowDuel(
      77,
      ['pair'],
      def.style,
      null,
      def.relic !== undefined ? def.relic : undefined,
      packThrowItems(['pair']),
      { enemy: def.book },
      { enemyItems: def.items, terms: def.terms },
    );
    assert.equal(duel.status, 'playing', id);
    if (def.items) assert.deepEqual([...duel.fighters[1].items].sort(), [...def.items].sort(), id);
  }
});
