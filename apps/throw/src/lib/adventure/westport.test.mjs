import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdventure, advanceDialogue, chooseDialogue, interactAdventure, walkAdventure, visibleHotspots,
  finishAdventureBattle, battleSetup, adventureGains, adventureObjective, adventureSideObjectives,
  serializeAdventure, restoreAdventure, keepExploring, troupeUnlocked, hireRecruit, rentLodging,
  lodgingsFor, lodgingEntrancesFor, lodgingOf, haveTea, rehearse, upgradeItem, buyOffer, shopFor, MAPS, DIALOGUES, BATTLES, repeatAdventureBattle,
} from './magician-world.ts';

function read(s) { for (let i = 0; i < 60 && s.mode === 'dialogue'; i++) { const next = advanceDialogue(s); if (next === s) break; s = next; } return s; }
function go(s, id) {
  const resolvedId = id === 'tour-bus' ? s.act === 1 ? 'bus' : s.act === 2 ? 'bp-bus' : 'wp-bus' : id;
  const spot = visibleHotspots(s).find((x) => x.id === resolvedId);
  assert.ok(spot, `${s.map}/${id}`);
  for (let i = 0; Math.abs(s.player.x - spot.x) >= 5 && i < 1000; i++) s = walkAdventure(s, s.player.x < spot.x ? 1 : -1, 1);
  const interacted = interactAdventure(s, resolvedId);
  return id === 'tour-bus' && interacted.dialogue?.id === 'wp-bus-choice' ? chooseDialogue(read(interacted), 'enter-bus') : interacted;
}
const talk = (s, id) => read(go(s, id));
const city = (s) => s.map === 'westport' ? s : go(s, `${s.map}-exit`);
const room = (s, id) => s.map === id ? s : go(city(s), `${id}-door`);
function fight(s, npc, kind, winner = 0, report) {
  const duel = chooseDialogue(talk(s, npc), kind);
  assert.equal(duel.mode, 'battle', `${npc}/${kind}`);
  const result = finishAdventureBattle(duel, duel.battle.id, winner, report);
  assert.equal(adventureGains(duel, result), null, 'never celebrate before the award conversation');
  assert.ok(restoreAdventure(serializeAdventure(result)), 'an unread award survives reloading');
  const ended = read(result);
  assert.equal(ended.pendingReward, null);
  return ended;
}
const fresh = () => ({ ...read(createAdventure(9001, 3)), fee: 300, meals: 'plain' });
const rent = (s, id) => read(chooseDialogue(talk(go(s, lodgingEntrancesFor(s).find((entry) => entry.lodgingId === id)?.id ?? 'tour-bus'), 'house-butler'), 'rent'));
const start = () => go(rent(fresh(), 'wp-friend'), 'home-exit');
function finalists(choice = 'wp-expose', interview = 'wp-broadcast-honest') {
  let s = talk(room(start(), 'league'), 'nora');
  s = fight(s, 'vale', 'wp-entry', 0, { suits: [0, 1, 0, 0], kinds: [1, 0, 0, 0, 0, 0, 0, 0, 0], playerSuits: [0, 0, 8, 0], playerKinds: [4, 0, 0, 0, 0, 0, 0, 0, 0] });
  const counter = chooseDialogue(talk(s, 'vale'), 'wp-counter');
  assert.equal(counter.battle.enemyStyle, 'mend', 'public poison usage is scouted into a healing counter');
  s = read(finishAdventureBattle(counter, counter.battle.id, 0));
  s = read(chooseDialogue(talk(room(s, 'docks'), 'felix'), choice));
  s = talk(room(s, 'league'), 'nora');
  s = read(chooseDialogue(talk(room(s, 'radio'), 'radio-theo'), interview));
  return room(s, 'league');
}

test('chapter three main route exposes the leak, interviews and wins a true best-of-three, then remains explorable', () => {
  let s = finalists();
  assert.ok(s.flags.felixExposed && s.flags.noraStatement && s.flags.broadcastDone);
  s = fight(s, 'nora', 'wp-nora-1');
  assert.equal(s.noraSeries.wins, 1);
  s = fight(s, 'nora', 'wp-nora-2', 1);
  assert.deepEqual(s.noraSeries, { wins: 1, losses: 1, round: 3 });
  const before = s.fee;
  s = fight(s, 'nora', 'wp-nora-3');
  assert.ok(s.flags.noraChampion);
  assert.equal(s.fee, before + 60);
  s = read(chooseDialogue(talk(city(s), 'wp-bus'), 'wp-departure'));
  assert.equal(s.mode, 'complete');
  assert.ok(s.flags.westDeparted);
  s = keepExploring(s);
  assert.equal(s.mode, 'explore');
  assert.ok(adventureSideObjectives(s).length >= 3);
  assert.ok(restoreAdventure(serializeAdventure(s)));
});

test('forgiving the leak and broadcasting a bluff creates a different next match; a lost series can restart', () => {
  let s = finalists('wp-false-case', 'wp-broadcast-bluff');
  assert.ok(s.flags.felixForgiven && s.flags.broadcastBluff);
  s = fight(s, 'nora', 'wp-nora-1', 1);
  const match = chooseDialogue(talk(s, 'nora'), 'wp-nora-2');
  assert.equal(match.battle.enemyStyle, 'quick', 'Nora publicly prepares for the announced large hands');
  s = read(finishAdventureBattle(match, match.battle.id, 1));
  assert.equal(s.flags.noraChampion, false);
  const restart = chooseDialogue(talk(s, 'nora'), 'wp-nora-1');
  assert.deepEqual(restart.noraSeries, { wins: 0, losses: 0, round: 1 });
  s = read(finishAdventureBattle(restart, restart.battle.id, 0));
  s = fight(s, 'nora', 'wp-nora-2');
  assert.ok(s.flags.noraChampion, 'two wins end the series without a needless third match');
});

test('public scouting recognises sustained single-card suit play, mixed quick throws and a dominant combo plan', () => {
  const registered = talk(room(start(), 'league'), 'nora');
  const duel = chooseDialogue(talk(registered, 'vale'), 'wp-entry');
  const inspect = (playerSuits, playerKinds) => {
    const result = read(finishAdventureBattle(duel, duel.battle.id, 0, {
      suits: [0, 1, 0, 0], kinds: [1, 0, 0, 0, 0, 0, 0, 0, 0], playerSuits, playerKinds,
    }));
    const counter = chooseDialogue(talk(result, 'vale'), 'wp-counter');
    return [result.publicStyle, counter.battle.enemyStyle];
  };
  const singles = [20, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(inspect([2, 2, 14, 2], singles), ['poison', 'mend'], 'long single-card clubs play must not collapse to quick');
  assert.deepEqual(inspect([12, 3, 3, 2], singles), ['guard', 'poison'], 'exactly sixty percent identifies the public suit plan');
  assert.deepEqual(inspect([2, 14, 2, 2], singles), ['mend', 'burn']);
  assert.deepEqual(inspect([2, 2, 2, 14], singles), ['burn', 'guard']);
  assert.deepEqual(inspect([5, 5, 5, 5], singles), ['quick', 'guard'], 'balanced suits identify mixed single-card tempo');
  assert.deepEqual(inspect([0, 0, 3, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0]), ['quick', 'guard'], 'three cards are insufficient evidence of a suit strategy');
  assert.deepEqual(inspect([1, 1, 16, 2], [2, 4, 2, 0, 0, 0, 0, 0, 0]), ['combo', 'quick'], 'combination-heavy play takes priority over the dominant suit');
});

test('the retry button follows the next scheduled series round instead of farming the previous opponent', () => {
  const s = finalists();
  const first = chooseDialogue(talk(s, 'nora'), 'wp-nora-1');
  const result = read(finishAdventureBattle(first, first.battle.id, 0));
  const retry = repeatAdventureBattle(result, first.battle);
  assert.equal(retry.battle.kind, 'wp-nora-2');
  const champion = read(finishAdventureBattle(retry, retry.battle.id, 0));
  assert.equal(repeatAdventureBattle(champion, retry.battle), champion);
});

test('Molly radio chain awards once and recruits her only after the actual invitation dialogue', () => {
  let s = room(start(), 'radio');
  for (const round of [1, 2, 3]) s = fight(s, 'molly', `wp-molly-${round}`);
  assert.equal(s.affinity.molly, 60);
  assert.equal(s.troupe.includes('molly'), false);
  const invite = chooseDialogue(talk(s, 'molly'), 'wp-molly-join');
  assert.equal(invite.troupe.includes('molly'), false);
  s = read(invite);
  assert.ok(s.troupe.includes('molly'));
  assert.ok(s.flags.mollyJoined);
  assert.ok(restoreAdventure(serializeAdventure(s)));
});

test('Brannigan investigation, seven coastal engagements and relay have a playable receipt-backed closure', () => {
  let s = talk(room(start(), 'docks'), 'brannigan');
  s = talk(city(s), 'theo');
  s = fight(room(s, 'docks'), 'brannigan', 'wp-brannigan');
  assert.ok(s.owned.relics.includes('ember'));
  s = talk(s, 'coast-board');
  for (let i = 1; i <= 7; i++) s = fight(s, 'coast-board', `wp-coast-${i}`);
  assert.ok(s.flags.coastComplete);
  assert.equal(s.won.filter((kind) => kind.startsWith('wp-coast')).length, 7);
  const relay = chooseDialogue(talk(room(s, 'subway'), 'kit'), 'wp-relay');
  const setup = battleSetup(relay);
  assert.equal(setup.playerReserve.performer, 'juno');
  assert.equal(setup.enemyReserve.performer, 'molly');
  assert.equal(setup.enemyReserveCharacter, 'vale');
  s = read(finishAdventureBattle(relay, relay.battle.id, 0));
  assert.ok(s.won.includes('wp-relay'));
  assert.ok(!adventureSideObjectives(s).some((entry) => entry.title === '地铁双人赛'));
});

test('troupe and hiring remain locked before chapter three; each city home and bus can be physically visited', () => {
  const old = read(createAdventure(7, 2));
  assert.equal(troupeUnlocked(old), false);
  const locked = { ...old, mode: 'panel', panel: 'recruits', fee: 100 };
  assert.equal(hireRecruit(locked, 'stan'), locked);
  let s = start();
  const allIds = new Set();
  for (const [act, id] of [[3, 'westport'], [2, 'bridgeport'], [1, 'graywick']]) {
    s = go(s, 'tour-bus');
    const route = talk(s, 'travel-desk');
    s = chooseDialogue(route, id);
    assert.equal(s.act, act);
    assert.ok(troupeUnlocked(s));
    assert.ok(restoreAdventure(serializeAdventure(s)));
    for (const entry of lodgingsFor(s)) { assert.ok(!allIds.has(entry.id)); allIds.add(entry.id); }
    const entry = lodgingEntrancesFor(s)[0];
    s = rent(s, entry.lodgingId);
    assert.ok(visibleHotspots(s).some((spot) => spot.id === 'member-juno'));
    assert.ok(restoreAdventure(serializeAdventure(s)));
    s = go(s, 'home-exit');
    if (act < 3) {
      const money = s.fee, clock = s.clock, won = s.won;
      s = go(s, act === 1 ? 'bus' : 'bp-bus');
      assert.equal(s.map, 'bus-interior', 'old chapter station opens the live bus, not the historical ending');
      s = go(s, 'home-exit');
      assert.deepEqual(s.clock, clock);
      assert.deepEqual(s.won, won);
      assert.equal(s.fee, money);
    }
  }
});

test('city rents, room activities and upgrades are atomic and use their actual benefit', () => {
  let s = start();
  assert.equal(rentLodging(s, 'boarding'), s, 'another city cannot be rented remotely');
  assert.equal(rentLodging({ ...s, fee: 7 }, 'wp-netloft').lodging, 'wp-friend');
  s = rent(s, 'wp-warehouse');
  s = { ...s, mode: 'panel', panel: 'troupe', clock: { day: 0, slot: 0 } };
  const practice = rehearse(s, 'eli');
  assert.equal(practice.stage.eli, s.stage.eli + 3);
  const tea = haveTea({ ...practice, mood: { ...practice.mood, juno: 1 } }, 'juno');
  assert.equal(tea.mood.juno, 3);
  const workbench = { ...start(), mode: 'panel', panel: 'workshop' };
  assert.equal(upgradeItem(workbench, 'quick', 'gold'), workbench);
  const silver = upgradeItem(workbench, 'quick', 'silver');
  assert.equal(silver.fee, workbench.fee - 12);
  assert.strictEqual(upgradeItem(silver, 'quick', 'gold'), silver, 'missing duplicate must not spend money');
  const gold = upgradeItem({ ...silver, spareItems: { quick: 1 } }, 'quick', 'gold');
  assert.equal(gold.spareItems.quick, 0);
  assert.equal(gold.fee, silver.fee - 28);
  assert.ok(restoreAdventure(serializeAdventure(gold)));
  assert.equal(upgradeItem(gold, 'quick', 'gold'), gold);
  const shop = { ...workbench, panel: 'shop' };
  const offer = shopFor(shop).find((entry) => buyOffer(shop, entry.id) !== shop);
  assert.ok(offer);
  const bought = buyOffer(shop, offer.id);
  assert.ok(adventureGains(shop, bought));
  if (offer.kind !== 'item') assert.equal(buyOffer(bought, offer.id), bought);
  else assert.equal(buyOffer(bought, offer.id).spareItems[offer.ref], (bought.spareItems[offer.ref] ?? 0) + 1);
});

test('unread rewards survive v8 reload exactly once; v7 already-paid awards never become pending again', () => {
  let s = talk(room(start(), 'league'), 'nora');
  s = chooseDialogue(talk(s, 'vale'), 'wp-entry');
  const pending = finishAdventureBattle(s, s.battle.id, 0);
  assert.equal(pending.fee, s.fee);
  const loaded = restoreAdventure(serializeAdventure(pending)).state;
  const paid = read(loaded);
  assert.equal(paid.fee, s.fee + 20);
  assert.equal(adventureGains(loaded, paid).fee, 20);
  assert.equal(advanceDialogue(paid), paid);
  const old = JSON.parse(serializeAdventure(read(createAdventure(81, 2))));
  old.state.owned.items = ['cinder']; old.state.fee = 88;
  old.version = old.state.version = 'magician-adventure-v7';
  old.state.troupe = ['eli', 'juno']; old.state.stage.juno = 75; old.state.mood.juno = 2;
  const upgraded = restoreAdventure(JSON.stringify(old)).state;
  assert.equal(upgraded.fee, 88);
  assert.ok(upgraded.owned.items.includes('cinder'));
  assert.ok(upgraded.troupe.includes('juno'));
  assert.equal(upgraded.pendingReward, null);
  assert.equal(troupeUnlocked(upgraded), false, 'legacy ownership survives but feature waits for act three');
  const corrupted = JSON.parse(serializeAdventure(pending));
  corrupted.state.pendingReward.reward.items = ['not-an-item'];
  assert.equal(restoreAdventure(JSON.stringify(corrupted)), null);
  const forged = JSON.parse(serializeAdventure(pending));
  forged.state.pendingReward.reward.fee = 999;
  assert.equal(restoreAdventure(JSON.stringify(forged)), null, 'known reward ids cannot carry an invented fee');
  const duplicate = JSON.parse(serializeAdventure(pending));
  duplicate.state.won.push('wp-entry');
  assert.equal(restoreAdventure(JSON.stringify(duplicate)), null, 'a claimed first win cannot already have been paid');
});

test('chapter three routes, authored content and tutorial language remain structurally valid', () => {
  const state = start();
  for (const [map, def] of Object.entries(MAPS).filter(([, def]) => def.act === 3)) {
    for (const spot of def.hotspots) assert.ok(spot.x >= 48 && spot.x <= def.width - 48, `${map}/${spot.id}`);
    if (map.endsWith('-home') || map === 'bus-interior') continue;
    const here = { ...state, map };
    const targets = [adventureObjective(here), ...adventureSideObjectives(here)];
    for (const objective of targets) assert.ok(def.hotspots.some((spot) => spot.id === objective.target), `${map}/${objective.target}`);
  }
  for (const definition of Object.values(BATTLES).filter((entry) => entry.act === 3)) {
    assert.ok(DIALOGUES[definition.win] && DIALOGUES[definition.loss]);
  }
  const mentor = DIALOGUES['mentor-first'].lines.map((line) => line.text).join(' ');
  assert.match(mentor, /快抽/); assert.match(mentor, /十五秒/); assert.doesNotMatch(mentor, /假洗|十八秒/);
});


test('third chapter first anchors the troupe in Juno friend’s home before registration and never repeats the free lease', () => {
  let s = fresh();
  assert.equal(adventureObjective(s).target, 'troupe-home');
  s = talk(room(s, 'league'), 'nora');
  assert.equal(s.flags.westRegistered, false);
  s = city(s);
  const fee = s.fee;
  s = go(s, 'troupe-home');
  assert.equal(s.viewedLodging, 'wp-friend');
  assert.equal(s.lodging, 'wp-bus', 'viewing a property does not move the troupe');
  assert.ok(!visibleHotspots(s).some((spot) => spot.id === 'member-juno'));
  assert.equal(adventureObjective(s).target, 'house-butler');
  const offer = talk(s, 'house-butler');
  assert.ok(restoreAdventure(serializeAdventure(offer)), 'an unconfirmed lease can be saved');
  assert.equal(offer.fee, fee);
  s = read(chooseDialogue(offer, 'rent'));
  assert.equal(s.lodging, 'wp-friend');
  assert.equal(s.fee, fee);
  assert.ok(s.flags.westHomeGuided && s.flags.westLoanUsed && s.flags.westLoanActive);
  assert.equal(lodgingOf(s).price, 0);
  assert.ok(visibleHotspots(s).some((spot) => spot.id === 'member-juno'));
  s = talk(room(go(s, 'home-exit'), 'league'), 'nora');
  assert.ok(s.flags.westRegistered);
  s = rent(city(s), 'wp-netloft');
  assert.equal(s.fee, fee - 8);
  assert.equal(s.flags.westLoanActive, false);
  s = rent(go(s, 'home-exit'), 'wp-friend');
  assert.equal(s.fee, fee - 13, 'returning to the former free base pays the ordinary five-pound rent');
  assert.equal(lodgingOf(s).price, 5);
});

test('property rent requires that building’s last dialogue choice; rejected rent keeps money, lease and companions atomic', () => {
  let s = start();
  const original = s;
  assert.strictEqual(rentLodging(s, 'wp-radio-suite'), s, 'no remote rent');
  s = go(s, 'home-wp-radio-suite');
  assert.equal(s.viewedLodging, 'wp-radio-suite');
  assert.equal(s.lodging, 'wp-friend');
  assert.ok(!visibleHotspots(s).some((spot) => spot.id.startsWith('member-') || spot.id === 'troupe-desk'));
  const offer = talk(s, 'house-butler');
  const remote = { ...offer, map: 'league' };
  assert.strictEqual(rentLodging(remote, 'wp-radio-suite'), remote, 'the right dialogue cannot rent from a different map');
  assert.strictEqual(rentLodging({ ...offer, dialogue: { ...offer.dialogue, step: 0 } }, 'wp-radio-suite').lodging, 'wp-friend');
  assert.strictEqual(rentLodging(offer, 'wp-warehouse'), offer, 'the landlord cannot rent a different building');
  const poor = { ...offer, fee: 29 };
  assert.strictEqual(rentLodging(poor, 'wp-radio-suite'), poor);
  const refused = read(chooseDialogue(poor, 'rent'));
  assert.equal(refused.fee, 29);
  assert.equal(refused.lodging, original.lodging);
  assert.equal(refused.flags.westLoanActive, true);
  const leased = read(chooseDialogue(offer, 'rent'));
  assert.equal(leased.fee, offer.fee - 30);
  assert.equal(leased.lodging, 'wp-radio-suite');
  assert.ok(visibleHotspots(leased).some((spot) => spot.id === 'member-juno'));
  assert.ok(restoreAdventure(serializeAdventure(leased)));
  const outside = go(leased, 'home-exit');
  const oldHome = go(outside, 'troupe-home');
  assert.ok(!visibleHotspots(oldHome).some((spot) => spot.id.startsWith('member-')), 'companions no longer live at the old lease');
});

test('v8 advanced saves retain story, money and lease without replaying the new welcome; newcomers receive the welcome', () => {
  const legacy = (state) => {
    const data = JSON.parse(serializeAdventure(state));
    data.version = data.state.version = 'magician-adventure-v8';
    delete data.state.viewedLodging;
    for (const flag of ['westHomeGuided', 'westLoanUsed', 'westLoanActive']) delete data.state.flags[flag];
    return restoreAdventure(JSON.stringify(data))?.state;
  };
  const advanced = { ...start(), flags: { ...start().flags, westRegistered: true }, lodging: 'wp-radio-suite' };
  const restored = legacy(advanced);
  assert.ok(restored);
  assert.equal(restored.fee, advanced.fee);
  assert.equal(restored.lodging, advanced.lodging);
  assert.ok(restored.flags.westHomeGuided);
  assert.equal(restored.flags.westLoanActive, false);
  assert.equal(adventureObjective(restored).title, '联赛首轮');
  const newcomer = legacy(fresh());
  assert.ok(newcomer);
  assert.equal(adventureObjective(newcomer).target, 'troupe-home');
});


test('every local property has a distinct reachable facade, its own rental dialogue and a persistent viewed identity', () => {
  let s = start();
  for (const [_act, destination] of [[3, 'westport'], [2, 'bridgeport'], [1, 'graywick']]) {
    s = chooseDialogue(talk(go(s, 'tour-bus'), 'travel-desk'), destination);
    assert.equal(visibleHotspots(s).filter((spot) => spot.kind === 'bus' || spot.target === 'bus-interior').length, 1, 'one physical bus has one interaction and icon row');
    const entries = lodgingEntrancesFor(s);
    assert.equal(entries.length + 1, lodgingsFor(s).length);
    for (const [index, entry] of entries.entries()) {
      assert.ok(entry.x < MAPS[s.map].width - 48);
      if (index) assert.ok(entry.x - entries[index - 1].x >= 150);
      const before = s.fee;
      s = rent(s, entry.lodgingId);
      assert.equal(s.viewedLodging, entry.lodgingId);
      assert.equal(s.lodging, entry.lodgingId);
      assert.ok(s.fee < before || (entry.lodgingId === 'wp-friend' && s.flags.westLoanActive));
      assert.ok(restoreAdventure(serializeAdventure(s)));
      s = go(s, 'home-exit');
      assert.equal(s.viewedLodging, null);
      assert.ok(Math.abs(s.player.x - entry.x) <= 5);
    }
    s = go(s, 'tour-bus');
    assert.equal(s.viewedLodging, lodgingsFor(s)[0].id);
    assert.ok(!visibleHotspots(s).some((spot) => spot.id.startsWith('member-')));
    s = read(chooseDialogue(talk(s, 'house-butler'), 'rent'));
    assert.equal(s.lodging, lodgingsFor(s)[0].id);
    assert.ok(visibleHotspots(s).some((spot) => spot.id === 'member-juno'));
    s = go(s, 'home-exit');
  }
});
