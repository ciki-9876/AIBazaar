import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createThrowDuel,
  stepThrowDuel,
  launchThrow,
  previewThrow,
  arrangeThrow,
  recommendCards,
  drawInterval,
  MAX_HP,
  PRESETS,
} from './throw-duel.ts';
import {
  packThrowItems,
  placeThrowItem,
  validThrowLayout,
  adjacentThrowItems,
} from './throw-loadout.ts';
const cards = (ranks, suits = ranks.map((_, index) => index % 4)) =>
  ranks.map((rank, index) => ({
    uid: 'proof:' + index,
    rank,
    suit: suits[index],
  }));
const run = (state, ticks) => {
  for (let i = 0; i < ticks; i++) state = stepThrowDuel(state);
  return state;
};
const idle = (items = [], relic = null, layout) => {
  const state = createThrowDuel(27, items, 'quick', relic, null, layout);
  state.ai.thinkTick = 99999;
  return state;
};
test('three-second draws are exact for every build, without an accelerated default preset', () => {
  for (const build of Object.values(PRESETS)) {
    let state = idle(build.items, build.relic);
    assert.equal(drawInterval(build.items), 60);
    state = run(state, 59);
    assert.equal(state.fighters[0].drawn, 5);
    state = run(state, 1);
    assert.equal(state.fighters[0].drawn, 6);
  }
});
test('the AI cannot form a scattered pair without selecting all intervening cards', () => {
  const hand = cards([2, 14, 13, 2, 12]);
  for (const style of Object.keys(PRESETS)) {
    const picked = recommendCards(hand, PRESETS[style].items, style);
    const indexes = picked.map((card) =>
      hand.findIndex((entry) => entry.uid === card.uid),
    );
    assert.deepEqual(
      indexes,
      Array.from({ length: indexes.length }, (_, i) => indexes[0] + i),
    );
    if (
      picked.some((card) => card.uid === hand[0].uid) &&
      picked.some((card) => card.uid === hand[3].uid)
    )
      assert.ok(
        picked.some((card) => card.uid === hand[1].uid) &&
          picked.some((card) => card.uid === hand[2].uid),
      );
  }
});
test('natural AI announcements and actual launches obey contiguous selection for all nine builds', () => {
  for (const style of Object.keys(PRESETS)) {
    let state = createThrowDuel(108435, [], style);
    let announcements = 0, launches = 0;
    for (let tick = 0; tick < 400 && state.status === 'playing'; tick++) {
      const before = state;
      state = stepThrowDuel(state);
      if (state.ai.intent.length) {
        announcements++;
        const indexes = state.ai.intent.map((id) =>
          state.fighters[1].hand.findIndex((card) => card.uid === id),
        );
        assert.deepEqual(
          indexes,
          Array.from({ length: indexes.length }, (_, i) => indexes[0] + i),
        );
      }
      for (const shot of state.shots.filter(
        (shot) =>
          shot.side === 1 &&
          !before.shots.some((previous) => previous.id === shot.id),
      )) {
        launches++;
        const positions = shot.cards.map((card) =>
          before.fighters[1].hand.findIndex((entry) => entry.uid === card.uid),
        );
        assert.deepEqual(
          positions,
          Array.from({ length: positions.length }, (_, i) => positions[0] + i),
        );
      }
    }
    assert.ok(announcements > 0, `${style} must announce a real selection`);
    assert.ok(launches > 0, `${style} must launch that selection`);
  }
});
test('layout placement is atomic, respects sizes and gaps, and does not invent cross-gap adjacency', () => {
  const layout = packThrowItems(['cinder', 'bellows', 'ash']);
  assert.ok(validThrowLayout(layout));
  assert.equal(placeThrowItem(layout, 'ash', 1), layout);
  assert.equal(placeThrowItem(layout, 'sequence', 9), layout);
  assert.equal(placeThrowItem(layout, 'quick', 0), layout);
  const separated = placeThrowItem(layout, 'bellows', 8);
  assert.deepEqual(adjacentThrowItems(separated, 'cinder'), []);
  const single = cards([2]);
  assert.equal(
    previewThrow(
      single,
      layout.map((p) => p.id),
      { layout },
    ).burn,
    4,
  );
  assert.equal(
    previewThrow(
      single,
      separated.map((p) => p.id),
      { layout: separated },
    ).burn,
    3,
  );
});
test('dual adjacency and left/right end positions change real effects', () => {
  const hand = cards([2, 2], [0, 1]),
    layout = packThrowItems(['pair', 'compass', 'quick']);
  assert.equal(
    previewThrow(
      hand,
      layout.map((p) => p.id),
      { layout },
    ).damage,
    18,
  );
  const gap = placeThrowItem(layout, 'quick', 9);
  assert.equal(
    previewThrow(
      hand,
      gap.map((p) => p.id),
      { layout: gap },
    ).damage,
    16,
  );
  assert.equal(previewThrow(cards([2]), ['ward']).shield, 10);
  assert.equal(
    previewThrow(cards([2]), ['ward'], { layout: [{ id: 'ward', start: 4 }] })
      .shield,
    6,
  );
  const full = cards([2, 3, 4, 5, 6]);
  assert.equal(previewThrow(full, ['draw']).draw, 1);
  assert.equal(
    previewThrow(full, ['draw'], { layout: [{ id: 'draw', start: 9 }] }).draw,
    2,
  );
});
test('sorting buttons preserve identities; gathering keeps stable order and cooldown failure is atomic', () => {
  let state = idle([], 'order');
  state.fighters[0].hand = cards([2, 13, 3, 2], [2, 1, 0, 3]);
  const identities = state.fighters[0].hand.map((c) => c.uid);
  state = arrangeThrow(state, 0, 'gather', [identities[0], identities[3]]);
  assert.deepEqual(
    state.fighters[0].hand.map((c) => c.uid),
    [identities[0], identities[3], identities[1], identities[2]],
  );
  const serialized = JSON.stringify(state);
  assert.equal(arrangeThrow(state, 0, 'rank'), state);
  assert.equal(JSON.stringify(state), serialized);
  state = run(state, 60);
  const beforeSort = state.fighters[0].hand;
  state = arrangeThrow(state, 0, 'rank');
  assert.deepEqual(
    state.fighters[0].hand.map((c) => c.rank),
    beforeSort.map((c) => c.rank).sort((a, b) => a - b),
  );
  assert.deepEqual(
    new Set(state.fighters[0].hand.map((c) => c.uid)),
    new Set(beforeSort.map((c) => c.uid)),
  );
});
test('burn is blocked by shield and decays; poison bypasses shield and persists', () => {
  let state = idle();
  state.fighters[0].shield = 30;
  state.fighters[0].burn = 7;
  state.fighters[0].poison = 5;
  state = run(state, 20);
  assert.equal(state.fighters[0].hp, MAX_HP - 5);
  assert.equal(state.fighters[0].shield, 23);
  assert.equal(state.fighters[0].burn, 6);
  assert.equal(state.fighters[0].poison, 5);
  const events = state.events.filter((event) => event.type === 'dot');
  assert.equal(events[0].shieldDamage, 7);
  assert.equal(events[1].shieldDamage, 0);
});
test('a projectile applies ailments only at impact; fire and poison relics augment actual stacks', () => {
  let state = idle(['cinder'], 'ember');
  state.fighters[0].hand = cards([2]);
  state = launchThrow(state, 0, ['proof:0']);
  assert.equal(state.fighters[1].burn, 0);
  assert.equal(state.shots[0].burn, 5);
  state = run(state, 9);
  assert.equal(state.fighters[1].burn, 5);
  state = idle(['poison', 'venom'], 'toxin');
  state.fighters[0].hand = cards([2], [2]);
  state = run(launchThrow(state, 0, ['proof:0']), 9);
  assert.equal(state.fighters[1].poison, 6);
});
test('shield reaction never recursively reflects and shield-bash uses the launch snapshot', () => {
  let state = idle(['umbrella', 'thorns'], 'bastion');
  state.fighters[0].shield = 80;
  state.fighters[1].shield = 80;
  state.fighters[1].relic = 'bastion';
  state.fighters[1].hand = cards([14]);
  state = run(launchThrow(state, 1, ['proof:0']), 9);
  assert.equal(state.fighters[0].shield, 61); // quick adds 4, its two-sided link adds 1
  assert.equal(state.fighters[1].shield, 64); // ten thorns + floor(19*.35)
  assert.equal(state.events.filter((e) => e.type === 'hit').length, 2);
  const score = previewThrow(cards([2, 2]), ['shieldbash'], { shield: 80 });
  assert.equal(score.damage, 38);
});
test('lifesteal measures actual HP loss, while penetration bypasses only its stated share', () => {
  let state = idle(['drain']);
  state.fighters[0].hp = 300;
  state.fighters[1].hp = 5;
  state.fighters[0].hand = cards([14]);
  state = run(launchThrow(state, 0, ['proof:0']), 9);
  assert.equal(state.fighters[0].hp, 301);
  state = idle(['drain']);
  state.fighters[0].hp = 300;
  state.fighters[1].shield = 100;
  state.fighters[0].hand = cards([14]);
  state = run(launchThrow(state, 0, ['proof:0']), 9);
  assert.equal(state.fighters[0].hp, 300);
  state = idle(['needle']);
  state.fighters[1].shield = 100;
  state.fighters[0].hand = cards([10, 10], [0, 2]);
  state = run(launchThrow(state, 0, ['proof:0', 'proof:1']), 9);
  assert.equal(state.fighters[1].hp, 310);
  assert.equal(state.fighters[1].shield, 80);
});
test('purification works at full life and multiple recovery sources share the same real capacity', () => {
  let state = idle(['wash', 'mend']);
  state.fighters[0].burn = 9;
  state.fighters[0].poison = 7;
  state.fighters[0].hp = 318;
  state.fighters[0].hand = cards([2, 3, 4, 5, 6], [1, 1, 1, 1, 1]);
  const score = previewThrow(
    state.fighters[0].hand,
    state.fighters[0].items,
    state.fighters[0],
  );
  assert.equal(score.heal, 2);
  const capped = previewThrow(
    state.fighters[0].hand,
    ['umbrella', 'compass', 'mend'],
    {
      hp: MAX_HP,
      shield: 160,
    },
  );
  assert.ok(!capped.effects.some((effect) => effect.kind === 'link'));
  state = launchThrow(
    state,
    0,
    state.fighters[0].hand.map((c) => c.uid),
  );
  assert.equal(state.fighters[0].hp, 320);
  assert.equal(state.fighters[0].burn, 5);
  assert.equal(state.fighters[0].poison, 3);
});
test('growth affects following throws and slow refresh pauses the draw clock without banking draws', () => {
  let state = idle(['growth']);
  state.fighters[0].lastSuit = 2;
  state.fighters[0].power = 39;
  state.fighters[0].hand = cards([2], [2]);
  state = launchThrow(state, 0, ['proof:0']);
  assert.equal(state.shots[0].damage, 41);
  assert.equal(state.fighters[0].power, 40);
  state = idle(['slow'], 'frost');
  state.fighters[0].hand = cards([2, 3], [0, 2]);
  state.fighters[1].drawClock = 59;
  state = launchThrow(state, 0, ['proof:0', 'proof:1']);
  assert.equal(state.fighters[0].shield, 12);
  state.fighters[1].slowUntil = 9;
  state = run(state, 9);
  assert.equal(state.fighters[1].drawClock, 59);
  assert.equal(state.fighters[1].slowUntil, 39);
  state = run(state, 29);
  assert.equal(state.fighters[1].drawn, 5);
  state = run(state, 1);
  assert.equal(state.fighters[1].drawn, 6);
});
test('all nine seeded strategy duels reproduce their entire serialized state', () => {
  for (const [style, preset] of Object.entries(PRESETS)) {
    const replay = () => {
      let state = createThrowDuel(991, preset.items, style, preset.relic);
      for (let i = 0; i < 240 && state.status === 'playing'; i++) {
        if (i % 40 === 0)
          state = launchThrow(
            state,
            0,
            recommendCards(
              state.fighters[0].hand,
              state.fighters[0].items,
              style,
              {
                ...state.fighters[0],
                target: state.fighters[1],
                tick: state.tick,
              },
            ).map((c) => c.uid),
          );
        state = stepThrowDuel(state);
      }
      return JSON.stringify(state);
    };
    assert.equal(replay(), replay());
  }
});
