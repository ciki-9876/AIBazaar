import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acknowledgeBackpack, adventureGains, adventureObjective, adventureSideObjectives, backpackUnlocked,
  buyOffer, createAdventure, finishAdventureBattle, hireRecruit, MAPS, restoreAdventure, serializeAdventure, SHOP,
  advanceDialogue, repeatAdventureBattle,
} from './magician-world.ts';

test('side quest remains independent of the main route and always points at a reachable local hotspot', () => {
  const state = createAdventure(21, 2);
  assert.deepEqual(adventureSideObjectives(state), []);
  for (const map of ['bridgeport', 'goose', 'curios', 'thursday']) {
    const advanced = { ...state, map, won: [...state.won, 'ada', 'bea'] };
    const main = adventureObjective(advanced);
    const [side] = adventureSideObjectives(advanced);
    assert.equal(side.title, '姐妹的赌约');
    assert.ok(MAPS[map].hotspots.some((spot) => spot.id === side.target && (!spot.when || spot.when(advanced))));
    assert.deepEqual(adventureObjective(advanced), main);
    assert.deepEqual(adventureSideObjectives({ ...advanced, won: [...advanced.won, 'sisters'] }), []);
  }
});

test('backpack requires chapter completion; guidance acknowledgment is idempotent and saved', () => {
  const state = createAdventure(31);
  assert.equal(backpackUnlocked(state), false);
  assert.equal(acknowledgeBackpack(state), state);
  const won = { ...state, flags: { ...state.flags, ticket: true } };
  assert.equal(backpackUnlocked(won), false);
  const complete = { ...won, flags: { ...won.flags, departed: true } };
  const guided = acknowledgeBackpack(complete);
  assert.equal(backpackUnlocked(complete), true);
  assert.equal(guided.flags.backpackGuided, true);
  assert.equal(acknowledgeBackpack(guided), guided);
  assert.equal(restoreAdventure(serializeAdventure(guided)).state.flags.backpackGuided, true);
});

test('v6 saves keep inventory, progress and scheduling, while receiving backpack guidance once', () => {
  const old = createAdventure(48, 2);
  old.won.push('ada', 'bea');
  old.fee = 83;
  old.clock = { day: 5, slot: 2 };
  const envelope = JSON.parse(serializeAdventure(old));
  envelope.version = envelope.state.version = 'magician-adventure-v6';
  delete envelope.state.flags.backpackGuided;
  const restored = restoreAdventure(JSON.stringify(envelope));
  assert.ok(restored);
  assert.equal(restored.state.fee, 83);
  assert.deepEqual(restored.state.clock, old.clock);
  assert.deepEqual(restored.state.won, old.won);
  assert.equal(restored.state.flags.backpackGuided, false);
  assert.equal(adventureSideObjectives(restored.state).length, 1);
});

test('reward receipts aggregate new items, relics, variants and money, but never duplicate ownership', () => {
  const before = createAdventure(1);
  const after = { ...before, fee: 12, flags: { ...before.flags, miaMet: true },
    owned: { items: ['cinder'], relics: ['ember'], variants: ['1-3:LH3'] } };
  const receipt = adventureGains(before, after);
  assert.equal(receipt.fee, 12);
  assert.ok(receipt.items.includes('cinder'));
  assert.ok(receipt.relics.includes('ember'));
  assert.deepEqual(receipt.variants, ['1-3:LH3']);
  assert.equal(adventureGains(after, { ...after }), null);
  assert.equal(adventureGains(after, { ...after, fee: 2 }), null);
});

test('shop receipts expose the acquired object after an atomic purchase, not the amount spent', () => {
  const before = { ...createAdventure(5, 2), mode: 'panel', dialogue: null, panel: 'shop', fee: 1000 };
  const offer = SHOP.find((entry) => entry.kind === 'item' && (!entry.stocked || entry.stocked(before)) && buyOffer(before, entry.id) !== before);
  assert.ok(offer);
  const after = buyOffer(before, offer.id);
  assert.deepEqual(adventureGains(before, after).items, [offer.ref]);
  assert.equal(adventureGains(before, after).fee, 0);
  assert.equal(adventureGains(after, buyOffer(after, offer.id)), null);
});

test('the Sunday ledger settles before an unpaid battle award; receipt appears when the dialogue closes', () => {
  const before = { ...createAdventure(21, 2), mode: 'battle', dialogue: null, panel: null, fee: 0,
    clock: { day: 3, slot: 2 }, meals: 'feast', nextBattleId: 2,
    battle: { id: 1, kind: 'ada', seed: 21, enemyStyle: 'guard', coach: null, returnMap: 'thursday', returnX: 820 } };
  const after = finishAdventureBattle(before, 1, 0);
  assert.equal(adventureGains(before, after), null);
  let paid = after;
  while (paid.mode === 'dialogue') paid = advanceDialogue(paid);
  assert.equal(adventureGains(after, paid).fee, 10);
});

test('recruitment board cannot hire remotely, double-charge, or hire unavailable candidates', () => {
  const state = createAdventure(82, 3);
  const board = { ...state, mode: 'panel', dialogue: null, panel: 'recruits', fee: 1 };
  assert.equal(hireRecruit(state, 'stan'), state);
  assert.equal(hireRecruit(board, 'juno'), board);
  assert.equal(hireRecruit({ ...board, fee: 0 }, 'stan').fee, 0);
  const hired = hireRecruit(board, 'stan');
  assert.equal(hired.fee, 0);
  assert.deepEqual(hired.troupe, ['eli', 'juno', 'stan']);
  assert.equal(hireRecruit(hired, 'stan'), hired);
  assert.equal(MAPS.goose.hotspots.find((spot) => spot.id === 'pettigrew').x, 650);
});

test('victory followed by retry and defeat retains the first payment and cannot pay it twice', () => {
  const before = { ...createAdventure(21, 2), mode: 'battle', dialogue: null, panel: null, fee: 0, nextBattleId: 2,
    map: 'thursday', player: { x: 820, facing: 1, walkTicks: 0 },
    battle: { id: 1, kind: 'ada', seed: 21, enemyStyle: 'guard', coach: null, returnMap: 'thursday', returnX: 820 } };
  let won = finishAdventureBattle(before, 1, 0);
  assert.equal(won.fee, 0, 'pending until the award dialogue finishes');
  assert.equal(repeatAdventureBattle(won, before.battle), won, 'result dialogue must be acknowledged');
  while (won.mode === 'dialogue') won = advanceDialogue(won);
  const awarded = won.fee;
  assert.ok(awarded > 0);
  const retry = repeatAdventureBattle(won, before.battle);
  assert.equal(retry.mode, 'battle');
  assert.equal(retry.battle.kind, 'ada');
  assert.notEqual(retry.battle.id, before.battle.id);
  assert.notEqual(retry.battle.seed, before.battle.seed);
  const lost = finishAdventureBattle(retry, retry.battle.id, 1);
  assert.ok(lost.won.includes('ada'));
  assert.equal(lost.fee, awarded);
  assert.equal(adventureGains(retry, lost), null);
  assert.equal(finishAdventureBattle(lost, retry.battle.id, 0), lost, 'stale duplicate callback cannot repay');
  const other = { ...won, map: 'bridgeport' };
  assert.equal(repeatAdventureBattle(other, before.battle), other, 'cannot replay an encounter from another location');
});
