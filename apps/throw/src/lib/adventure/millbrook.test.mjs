import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdventure,
  advanceDialogue,
  chooseDialogue,
  walkAdventure,
  interactAdventure,
  visibleHotspots,
  finishAdventureBattle,
  battleSetup,
  adventureGains,
  adventureObjective,
  adventureSideObjectives,
  serializeAdventure,
  restoreAdventure,
  buyOffer,
  upgradeItem,
  travelOn,
  keepExploring,
  gatherIntel,
  BATTLES,
  DIALOGUES,
  MAPS,
  lodgingsFor,
  memberStatus,
} from './magician-world.ts';
import { validDeckBook } from '../cards/throw-enchant.ts';
import { MILLBROOK_BATTLES, millbrookReserves } from './millbrook.ts';
import { createThrowDuel } from '../cards/throw-duel.ts';
const read = (s) => {
  for (let i = 0; i < 60 && s.mode === 'dialogue'; i++) {
    const n = advanceDialogue(s);
    if (n === s) break;
    s = n;
  }
  return s;
};
const go = (s, id) => {
  const spot = visibleHotspots(s).find((x) => x.id === id);
  assert.ok(spot, `${s.map}/${id}`);
  for (let i = 0; Math.abs(s.player.x - spot.x) > 4 && i < 1200; i++)
    s = walkAdventure(s, s.player.x < spot.x ? 1 : -1, 1);
  return interactAdventure(s, id);
};
const city = (s) => (s.map === 'millbrook' ? s : go(s, `${s.map}-exit`));
const room = (s, id) => (s.map === id ? s : go(city(s), `${id}-door`));
const talk = (s, id) => read(go(s, id));
const fresh = () => read(createAdventure(677, 4));
function fight(s, who, kind, winner = 0) {
  const duel = chooseDialogue(talk(s, who), kind);
  assert.equal(duel.mode, 'battle', kind);
  const setup = battleSetup(duel);
  assert.equal(setup.playerTeam.length >= 2, true);
  assert.equal(setup.enemyTeam.length, 2);
  const before = duel.fee,
    pending = finishAdventureBattle(duel, duel.battle.id, winner, {
      suits: [0, 0, 0, 0],
      kinds: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      performer: 'juno',
      participants: ['juno', 'stan'],
    });
  assert.equal(pending.fee, before);
  assert.equal(adventureGains(duel, pending), null);
  const restored = restoreAdventure(serializeAdventure(pending));
  assert.ok(restored, `${kind} unread save`);
  const paid = read(restored.state);
  assert.equal(paid.pendingReward, null);
  assert.ok(restoreAdventure(serializeAdventure(paid)));
  return paid;
}
function registered() {
  const s = talk(room(fresh(), 'mb-hall'), 'mb-edith');
  return talk(room(s, 'mb-pub'), 'mb-stan');
}
function finalists() {
  let s = registered();
  s = fight(room(s, 'mb-hall'), 'mb-edith', 'mb-entry');
  s = fight(s, 'mb-holt', 'mb-regular');
  s = talk(room(s, 'mb-mill'), 'mb-wire');
  s = talk(s, 'mb-ledger');
  s = talk(room(s, 'mb-hall'), 'mb-edith');
  s = talk(room(s, 'mb-mill'), 'mb-mia');
  s = fight(room(s, 'mb-hall'), 'mb-holt', 'mb-rematch');
  s = talk(s, 'mb-holt');
  s = chooseDialogue(talk(room(s, 'mb-pub'), 'mb-stan'), 'mb-stan-return');
  return read(s);
}
test('fourth act has a reachable main story with evidence gates, real recruits, rewards after dialogue and a replayable finale', () => {
  let s = fresh();
  assert.equal(s.act, 4);
  assert.equal(s.troupe.length, 2);
  assert.ok(s.flags.millArrived);
  s = talk(room(s, 'mb-hall'), 'mb-edith');
  assert.equal(s.flags.millRegistered, true);
  const blocked = chooseDialogue(talk(s, 'mb-edith'), 'mb-entry');
  assert.equal(blocked.mode, 'dialogue');
  assert.equal(blocked.dialogue.id, 'mb-team-needed');
  s = finalists();
  assert.ok(
    s.flags.millExposed &&
      s.flags.millRepaired &&
      s.flags.stanPast &&
      s.flags.stanReturned,
  );
  assert.equal(s.affinity.stan, 60);
  assert.ok(s.troupe.includes('stan'));
  assert.equal(memberStatus(s, 'stan'), 'ready');
  assert.ok(s.stage.juno > 0 && s.stage.stan > 0);
  s = talk(room(s, 'mb-hall'), 'mb-roster');
  assert.equal(s.flags.millOrderKnown, true);
  const before = s.fee;
  s = fight(s, 'mb-holt', 'mb-final', 1);
  assert.equal(s.flags.millChampion, false);
  assert.equal(s.fee, before);
  s = fight(s, 'mb-holt', 'mb-final');
  assert.equal(s.fee, before + 60);
  assert.ok(s.flags.millChampion);
  assert.ok(s.keepsakes.includes('霍尔特的指挥棒'));
  const paid = s.fee;
  s = fight(s, 'mb-holt', 'mb-final');
  assert.equal(s.fee, paid, 'repeat has no extra champion reward');
  s = read(chooseDialogue(talk(city(s), 'mb-bus'), 'mb-departure'));
  assert.equal(s.mode, 'complete');
  assert.ok(s.flags.millDeparted);
  assert.strictEqual(
    travelOn(s),
    s,
    'act five is a teaser, no dead travel link',
  );
  assert.equal(keepExploring(s).mode, 'explore');
});
test('four town side quests close independently and Pip joins only after his invitation', () => {
  let s = registered();
  s = fight(room(s, 'mb-square'), 'mb-pip', 'mb-brass');
  assert.equal(s.troupe.includes('pip'), false);
  s = read(chooseDialogue(talk(s, 'mb-pip'), 'mb-pip-join'));
  assert.ok(s.troupe.includes('pip'));
  assert.ok(s.flags.pipJoined);
  s = fight(s, 'mb-bonfire', 'mb-bonfire');
  assert.ok(s.owned.variants.includes('3-5:LD5'));
  assert.ok(s.flags.millBonfire);
  s = fight(s, 'mb-midnight', 'mb-night');
  assert.ok(s.flags.millMidnight);
  let proof = finalists();
  const before = proof.fee;
  proof = talk(proof, 'mb-dodd');
  assert.equal(proof.fee, before + 8);
  assert.ok(proof.flags.millBookmaker);
  proof = talk(proof, 'mb-dodd');
  assert.equal(proof.fee, before + 8);
  assert.equal(adventureSideObjectives(s).length, 0);
});
test('gold upgrade atomically pays a duplicate, restores unlimited gold and preserves old v9 saves', () => {
  let s = { ...fresh(), mode: 'panel', panel: 'shop', fee: 500 };
  const base = s.owned.items;
  const bought = buyOffer(s, 'mb-quick');
  assert.equal(bought.spareItems.quick, 1);
  assert.deepEqual(bought.owned.items, base);
  assert.ok(adventureGains(s, bought));
  s = upgradeItem({ ...bought, panel: 'workshop' }, 'quick', 'silver');
  const insufficient = { ...s, fee: 27 };
  assert.strictEqual(upgradeItem(insufficient, 'quick', 'gold'), insufficient);
  const missing = { ...s, spareItems: {} };
  assert.strictEqual(upgradeItem(missing, 'quick', 'gold'), missing);
  const gold = upgradeItem(s, 'quick', 'gold');
  assert.equal(gold.fee, s.fee - 28);
  assert.equal(gold.spareItems.quick, 0);
  assert.ok(restoreAdventure(serializeAdventure(gold)));
  const unlimited = {
    ...gold,
    itemUpgrades: { quick: 'gold', needle: 'gold', mend: 'gold' },
  };
  assert.ok(restoreAdventure(serializeAdventure(unlimited)));
  const old = JSON.parse(
    serializeAdventure(read(createAdventure(831, 3)), {
      loadout: { style: 'quick', layout: [], relic: null },
    }),
  );
  old.version = old.state.version = 'magician-adventure-v9';
  delete old.state.spareItems;
  for (const key of Object.keys(old.state.flags).filter(
    (x) =>
      x.startsWith('mill') ||
      x.startsWith('stanP') ||
      ['stanBond', 'stanReturned', 'pipJoined'].includes(x),
  ))
    delete old.state.flags[key];
  const upgraded = restoreAdventure(JSON.stringify(old));
  assert.ok(upgraded);
  assert.equal(upgraded.state.act, 3);
  assert.equal(upgraded.state.fee, old.state.fee);
  assert.deepEqual(upgraded.state.spareItems, {});
  assert.deepEqual(upgraded.envelope.loadout, old.loadout);
  const malformed = JSON.parse(serializeAdventure(gold));
  malformed.state.spareItems.quick = -1;
  assert.equal(restoreAdventure(JSON.stringify(malformed)), null);
});
test('all fourth act maps, objectives, shops, teams and card books are executable and scoped', () => {
  const s = registered();
  for (const [id, def] of Object.entries(MAPS).filter(
    ([, def]) => def.act === 4 && !def.image.endsWith('home'),
  )) {
    for (const spot of def.hotspots)
      assert.ok(spot.x >= 48 && spot.x <= def.width - 48, `${id}/${spot.id}`);
    const targets = [
      adventureObjective({ ...s, map: id }),
      ...adventureSideObjectives({ ...s, map: id }),
    ];
    for (const o of targets)
      assert.ok(
        def.hotspots.some((h) => h.id === o.target),
        `${id}/${o.target}`,
      );
  }
  assert.equal(lodgingsFor(s).length, 4);
  for (const [id, b] of Object.entries(MILLBROOK_BATTLES)) {
    assert.ok(DIALOGUES[b.win] && DIALOGUES[b.loss]);
    assert.ok(validDeckBook(b.book ?? {}));
    const reserves = millbrookReserves(id);
    assert.equal(
      new Set([b.performer, ...reserves.map((r) => r.performer)]).size,
      3,
    );
    assert.doesNotThrow(() =>
      createThrowDuel(
        833,
        [],
        b.style,
        null,
        undefined,
        undefined,
        { enemy: b.book },
        {
          enemyItems: b.items,
          performers: { enemy: b.performer },
          enemyReserves: reserves,
        },
      ),
    );
    assert.equal(BATTLES[id].teamSize, 3);
  }
  const intelState = {
    ...s,
    mode: 'panel',
    panel: 'dossier',
    clock: { ...s.clock, slot: 2 },
  };
  assert.equal(
    gatherIntel(intelState, 'mb-final', 'pub').flags.millOrderKnown,
    true,
  );
});
