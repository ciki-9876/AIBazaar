import test from 'node:test';
import assert from 'node:assert/strict';
import {
  abandonAdventureBattle,
  advanceDialogue,
  chooseDialogue,
  createAdventure,
  DIALOGUES,
  finishAdventureBattle,
  interactAdventure,
  keepExploring,
  MAPS,
  nearbyHotspot,
  hotspotInReach,
  unlockedKit,
  adventureObjective,
  walkAdventure,
} from './magician-world.ts';
import {
  createThrowDuel,
  launchThrow,
  RULES_VERSION,
  stepThrowDuel,
} from '../cards/throw-duel.ts';

const readToEnd = (state) => {
  while (state.mode === 'dialogue') {
    const next = advanceDialogue(state);
    if (next === state) break;
    state = next;
  }
  return state;
};
const walkTo = (state, x) => {
  while (Math.abs(state.player.x - x) >= 5) {
    state = walkAdventure(state, state.player.x < x ? 1 : -1, 1);
  }
  return state;
};
const meetMentor = (seed = 1024) => {
  let state = readToEnd(createAdventure(seed));
  state = interactAdventure(walkTo(state, 485), 'workshop-door');
  return readToEnd(interactAdventure(walkTo(state, 900), 'reed'));
};
const trained = () => {
  const battle = chooseDialogue(meetMentor(), 'practice');
  return readToEnd(finishAdventureBattle(battle, battle.battle.id, 1));
};
const meetRival = () => {
  let state = trained();
  state = interactAdventure(walkTo(state, 140), 'workshop-exit');
  state = interactAdventure(walkTo(state, 1340), 'theatre-door');
  return readToEnd(interactAdventure(walkTo(state, 1030), 'felix'));
};

test('walking remains on the horizontal map, stops at both bounds, and dialogue freezes movement', () => {
  const opening = createAdventure(1024);
  assert.strictEqual(walkAdventure(opening, 1, 5), opening);
  let state = readToEnd(opening);
  for (let i = 0; i < 100; i++) state = walkAdventure(state, -1, 5);
  assert.equal(state.player.x, 48);
  for (let i = 0; i < 100; i++) state = walkAdventure(state, 1, 5);
  assert.equal(state.player.x, MAPS.street.width - 48);
  assert.deepEqual(Object.keys(state.player).sort(), [
    'facing',
    'walkTicks',
    'x',
  ]);
  for (const ticks of [-1, 0, 6, 1.5])
    assert.strictEqual(walkAdventure(state, 1, ticks), state);
});

test('buildings require physical proximity and return to the matching street entrance', () => {
  const state = readToEnd(createAdventure(1024));
  assert.strictEqual(interactAdventure(state, 'workshop-door'), state);
  assert.strictEqual(interactAdventure(state, 'reed'), state);
  const near = walkTo(state, 485);
  assert.equal(nearbyHotspot(near).id, 'workshop-door');
  const inside = interactAdventure(near);
  assert.equal(inside.map, 'workshop');
  assert.equal(inside.player.x, 210);
  const outside = interactAdventure(walkTo(inside, 140));
  assert.equal(outside.map, 'street');
  assert.equal(outside.player.x, 540);
});

test('dialogue choices cannot launch early, remotely, or while another duel is active', () => {
  let state = readToEnd(createAdventure(1024));
  assert.strictEqual(chooseDialogue(state, 'practice'), state);
  state = interactAdventure(walkTo(state, 485), 'workshop-door');
  state = interactAdventure(walkTo(state, 900), 'reed');
  assert.strictEqual(chooseDialogue(state, 'practice'), state);
  state = readToEnd(state);
  assert.equal(state.dialogue.step, DIALOGUES['mentor-first'].lines.length - 1);
  const battle = chooseDialogue(state, 'practice');
  assert.equal(battle.mode, 'battle');
  assert.strictEqual(chooseDialogue(battle, 'practice'), battle);
  assert.strictEqual(interactAdventure(battle), battle);
  assert.strictEqual(walkAdventure(battle, 1, 5), battle);
});

test('abandoned training grants nothing; an acknowledged completed practice teaches the basics without claiming a win', () => {
  const battle = chooseDialogue(meetMentor(), 'practice');
  const abandoned = abandonAdventureBattle(battle);
  assert.equal(abandoned.map, 'workshop');
  assert.equal(abandoned.player.x, battle.battle.returnX);
  assert.equal(abandoned.flags.trained, false);
  assert.equal(abandoned.flags.invitation, false);
  const loss = finishAdventureBattle(battle, battle.battle.id, 1);
  assert.equal(loss.dialogue.id, 'practice-loss');
  assert.equal(loss.flags.trained, true);
  assert.equal(loss.flags.ticket, false);
  const result = readToEnd(loss);
  assert.equal(result.flags.invitation, true);
  assert.equal(result.mode, 'explore');
});

test('the qualifier is gated by the invitation; victory alone grants its ticket, with stale results rejected', () => {
  let state = readToEnd(createAdventure(1024));
  state = interactAdventure(walkTo(state, 1340), 'theatre-door');
  state = readToEnd(interactAdventure(walkTo(state, 1030), 'felix'));
  assert.equal(state.mode, 'explore');
  assert.strictEqual(chooseDialogue(state, 'qualifier'), state);
  const battle = chooseDialogue(meetRival(), 'qualifier');
  assert.equal(battle.battle.enemyStyle, 'burn');
  assert.strictEqual(
    finishAdventureBattle(battle, battle.battle.id + 1, 0),
    battle,
  );
  for (const winner of [1, 'draw']) {
    const failed = finishAdventureBattle(battle, battle.battle.id, winner);
    assert.equal(failed.flags.ticket, false);
    assert.equal(failed.map, 'theatre');
  }
  const won = finishAdventureBattle(battle, battle.battle.id, 0);
  assert.equal(won.flags.ticket, true);
  assert.strictEqual(finishAdventureBattle(won, battle.battle.id, 0), won);
});

test('complete opening route connects training, qualifying duel, departure, and revisiting the town', () => {
  const battle = chooseDialogue(meetRival(), 'qualifier');
  let state = readToEnd(finishAdventureBattle(battle, battle.battle.id, 0));
  state = interactAdventure(walkTo(state, 150), 'theatre-exit');
  state = interactAdventure(walkTo(state, 1785), 'bus');
  assert.equal(state.dialogue.id, 'departure');
  state = readToEnd(state);
  assert.equal(state.mode, 'complete');
  assert.equal(state.flags.departed, true);
  const town = keepExploring(state);
  assert.equal(town.mode, 'explore');
  assert.equal(town.flags.ticket, true);
});

test('adventure battles reuse real v6 combat and deterministic seeds, including repeat practice', () => {
  const battle = chooseDialogue(meetMentor(1337), 'practice');
  const run = () => {
    let duel = createThrowDuel(
      battle.battle.seed,
      ['quick', 'needle'],
      battle.battle.enemyStyle,
      null,
    );
    for (let i = 0; i < 2400 && duel.status !== 'ended'; i++) {
      if (i % 60 === 0)
        duel = launchThrow(
          duel,
          0,
          duel.fighters[0].hand.slice(0, 1).map((card) => card.uid),
        );
      duel = stepThrowDuel(duel);
    }
    assert.equal(duel.status, 'ended');
    return readToEnd(
      finishAdventureBattle(battle, battle.battle.id, duel.winner),
    );
  };
  assert.equal(RULES_VERSION, 'throw-duel-v10');
  assert.equal(battle.battle.enemyStyle, 'lesson');
  assert.equal(battle.battle.coach, 'lesson');
  const result = run();
  assert.deepEqual(result, run());
  assert.equal(result.flags.invitation, true);
  const repeat = chooseDialogue(
    readToEnd(interactAdventure(result, 'reed')),
    'practice',
  );
  assert.notEqual(repeat.battle.seed, battle.battle.seed);
  assert.equal(repeat.battle.enemyStyle, 'quick');
  assert.equal(repeat.battle.coach, null);
  assert.equal(repeat.battle.id, battle.battle.id + 1);
  assert.throws(() => createAdventure(-1), RangeError);
  assert.throws(() => createAdventure(0x100000000), RangeError);
});

test('chapter one teaches single cards before unlocking pair and suit builds after qualification', () => {
  let state = readToEnd(createAdventure(77));
  assert.deepEqual(unlockedKit(state), { items: ['quick', 'needle'], relics: [] });
  assert.equal(adventureObjective(state).target, 'workshop-door');
  state = readToEnd(interactAdventure(walkTo(state, 825), 'mia'));
  assert.equal(state.flags.miaMet, false, 'Mia sends you to Reed first');
  state = trained();
  assert.deepEqual(unlockedKit(state).items, ['quick', 'needle', 'tempo', 'wash']);
  assert.equal(adventureObjective(state).target, 'workshop-exit');
  state = interactAdventure(walkTo(state, 140), 'workshop-exit');
  state = interactAdventure(walkTo(state, 825), 'mia');
  assert.equal(state.dialogue.id, 'mia-first');
  state = readToEnd(state);
  assert.equal(state.flags.miaMet, true);
  assert.deepEqual(unlockedKit(state), {
    items: ['quick', 'needle', 'tempo', 'wash', 'ward'],
    relics: ['bastion'],
  });
  assert.equal(adventureObjective(state).target, 'theatre-door');
  assert.equal(readToEnd(interactAdventure(state, 'mia')).flags.miaMet, true);
  assert.equal(interactAdventure(state, 'mia').dialogue.id, 'mia-reminder');
  state = interactAdventure(walkTo(state, 1340), 'theatre-door');
  state = readToEnd(interactAdventure(walkTo(state, 1030), 'felix'));
  state = chooseDialogue(state, 'qualifier');
  const lost = readToEnd(finishAdventureBattle(state, state.battle.id, 1));
  assert.ok(!unlockedKit(lost).items.includes('pair'));
  const won = readToEnd(finishAdventureBattle(state, state.battle.id, 0));
  assert.deepEqual(unlockedKit(won).items, ['quick', 'needle', 'tempo', 'wash', 'ward', 'pair', 'umbrella', 'mend', 'stride', 'thorns', 'draw']);
});

test('name labels use physical reach while the objective always points to a visible local target', () => {
  const far = readToEnd(createAdventure(99));
  const door = MAPS.street.hotspots.find((entry) => entry.id === 'workshop-door');
  assert.equal(hotspotInReach(far, door), false);
  assert.equal(hotspotInReach({ ...far, player: { ...far.player, x: door.x + 95 } }, door), true);
  assert.equal(hotspotInReach({ ...far, player: { ...far.player, x: door.x + 96 } }, door), false);
  const inside = interactAdventure(walkTo(far, door.x), door.id);
  assert.equal(adventureObjective(inside).target, 'reed');
  const npc = MAPS.workshop.hotspots.find((entry) => entry.id === 'reed');
  assert.equal(hotspotInReach({ ...inside, player: { ...inside.player, x: npc.x - 130 } }, npc), true);
  assert.equal(hotspotInReach({ ...inside, player: { ...inside.player, x: npc.x - 131 } }, npc), false);
  assert.equal(hotspotInReach({ ...inside, mode: 'dialogue' }, npc), false);
  for (const flags of [far.flags, { ...far.flags, trained: true }, { ...far.flags, trained: true, miaMet: true }, { ...far.flags, trained: true, miaMet: true, ticket: true }]) {
    for (const map of ['street', 'workshop', 'theatre']) {
      const target = adventureObjective({ ...far, map, flags }).target;
      assert.ok(MAPS[map].hotspots.some((entry) => entry.id === target), `${map}: ${target}`);
    }
  }
});

test('the qualifier coaches only the first attempt and Felix always brings fire', () => {
  const first = chooseDialogue(meetRival(), 'qualifier');
  assert.equal(first.battle.enemyStyle, 'burn');
  assert.equal(first.battle.coach, 'qualifier');
  const lost = readToEnd(finishAdventureBattle(first, first.battle.id, 1));
  assert.equal(lost.flags.ticket, false);
  const again = chooseDialogue(readToEnd(interactAdventure(lost, 'felix')), 'qualifier');
  assert.equal(again.battle.coach, null);
  assert.equal(again.battle.enemyStyle, 'burn');
});
