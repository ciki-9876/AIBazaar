import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createThrowDuel,
  stepThrowDuel,
  stepThrowDuelInPlace,
  launchThrow,
  launchThrowInPlace,
  previewThrow,
  arrangeThrow,
  recommendCards,
  aiReady,
  aiArrange,
  aiThinkMs,
  drawInterval,
  MAX_HP,
  PRESETS,
  FAN_PARRY_HAND,
  REORDER_MS,
  TICK_MS,
} from './throw-duel.ts';
import {
  packThrowItems,
  placeThrowItem,
  validThrowLayout,
  adjacentThrowItems,
  COMPETITIVE_STYLES,
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
/** Fire one card from the player at an idle opponent and resolve the hit. */
const hit = (state, hand, side = 0) => {
  state.fighters[side].hand = hand;
  return run(launchThrow(state, side, hand.map((card) => card.uid)), 9);
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
  }
});
test('Reed demonstrates single-card tools even when his hand can form a straight flush', () => {
  const hand = cards([12, 13, 14], [0, 0, 0]);
  const pick = recommendCards(hand, PRESETS.lesson.items, 'lesson');
  assert.equal(pick.length, 1);
  assert.equal(pick[0].rank, 14);
  assert.deepEqual(PRESETS.lesson.items, ['quick', 'needle']);
  assert.equal(PRESETS.lesson.relic, null);
});
test('natural AI announcements and actual launches obey contiguous selection for every build', () => {
  for (const style of Object.keys(PRESETS)) {
    let state = createThrowDuel(108435, [], style);
    let announcements = 0,
      launches = 0;
    for (let tick = 0; tick < 900 && state.status === 'playing'; tick++) {
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
  const diamond = cards([2], [3]);
  assert.equal(previewThrow(diamond, ['cinder', 'bellows', 'ash'], { layout }).burn, 4);
  assert.equal(previewThrow(diamond, ['cinder', 'bellows', 'ash'], { layout: separated }).burn, 3);
  assert.equal(previewThrow(cards([2], [0]), ['cinder']).burn, 0);
});
test('dual adjacency amplifies both neighbours; suits drive the four condition items', () => {
  const hand = cards([2, 2], [0, 1]),
    layout = packThrowItems(['pair', 'compass', 'quick']);
  assert.equal(previewThrow(hand, layout.map((p) => p.id), { layout }).damage, 18);
  const gap = placeThrowItem(layout, 'quick', 9);
  assert.equal(previewThrow(hand, gap.map((p) => p.id), { layout: gap }).damage, 16);
  const mixed = cards([2, 3, 4, 5], [0, 1, 2, 3]);
  assert.equal(previewThrow(mixed, ['ward']).shield, 14);
  assert.equal(previewThrow(mixed, ['mend']).heal, 9);
  assert.equal(previewThrow(mixed, ['poison']).poison, 3);
  assert.equal(previewThrow(mixed, ['cinder']).burn, 3);
  assert.equal(previewThrow(cards([2]), ['draw'], { throws: 2 }).draw, 0);
  assert.equal(previewThrow(cards([2]), ['draw'], { throws: 3 }).draw, 1);
});
test('sorting buttons preserve identities; gathering keeps stable order and cooldown failure is atomic', () => {
  let state = idle([], null);
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
  state = run(state, REORDER_MS / TICK_MS);
  const beforeSort = state.fighters[0].hand;
  state = arrangeThrow(state, 0, 'rank');
  assert.deepEqual(
    state.fighters[0].hand.map((c) => c.rank),
    beforeSort.map((c) => c.rank).sort((a, b) => a - b),
  );
});
test('an AI tidies its hand by the same default action and pays the same cooldown', () => {
  const state = createThrowDuel(5, [], 'combo');
  // The straight 2–6 is spread across the whole hand; only sorting makes it a tidy five.
  state.fighters[1].hand = cards([2, 13, 3, 12, 4, 11, 5, 10, 6], [0, 1, 2, 3, 0, 1, 2, 3, 0]);
  aiArrange(state, 1);
  assert.deepEqual(state.fighters[1].hand.map((c) => c.rank), [2, 3, 4, 5, 6, 10, 11, 12, 13]);
  assert.equal(state.fighters[1].nextReorder, REORDER_MS / TICK_MS);
  const before = JSON.stringify(state);
  aiArrange(state, 1);
  assert.equal(JSON.stringify(state), before);
});

// ── v4 counter wheel: each relationship is a rule, tested on its own ──

test('scorched healing: burning or wounded fighters receive 60% of a heal', () => {
  let state = idle(['mend']);
  state.fighters[0].hp = 200;
  state.fighters[0].burn = 5;
  state = launchThrow(state, 0, ((state.fighters[0].hand = cards([2, 3], [1, 1])), ['proof:0', 'proof:1']));
  assert.equal(state.fighters[0].hp, 200 - 2 + Math.floor(18 * 0.6)); // scorch 2 then 60% of 18
  state = idle(['mend']);
  state.fighters[0].hp = 200;
  state.fighters[0].woundUntil = 100;
  state.fighters[0].hand = cards([2], [1]);
  state = launchThrow(state, 0, ['proof:0']);
  assert.equal(state.fighters[0].hp, 205);
});
test('cleansing: every heal removes poison equal to half its nominal amount, even at full life', () => {
  let state = idle(['mend']);
  state.fighters[0].poison = 20;
  state.fighters[0].hand = cards([2, 3], [1, 1]);
  state = launchThrow(state, 0, ['proof:0', 'proof:1']);
  assert.equal(state.fighters[0].hp, MAX_HP);
  assert.equal(state.fighters[0].poison, 11);
  assert.ok(state.events.some((event) => event.text === '净化剧毒' && event.value === 9));
});
test('smother: shields halve fresh flames on contact and soak ticks without letting them reach the body', () => {
  let state = idle(['cinder']);
  state.fighters[1].shield = 40;
  state = hit(state, cards([2, 3], [3, 3]));
  assert.equal(state.fighters[1].burn, 3); // six stacks land on a shield at half
  state = idle();
  state.fighters[0].shield = 30;
  state.fighters[0].burn = 7;
  state = run(state, 20);
  assert.equal(state.fighters[0].hp, MAX_HP);
  assert.equal(state.fighters[0].shield, 27);
  assert.equal(state.fighters[0].burn, 4);
  assert.equal(state.events.find((event) => event.type === 'dot').text, '闷火');
  state = idle();
  state.fighters[0].burn = 7;
  state = run(state, 20);
  assert.equal(state.fighters[0].hp, MAX_HP - 7);
  assert.equal(state.fighters[0].burn, 6);
});
test('poison ignores shields, festers on hoarded cards and ebbs every second tick', () => {
  let state = idle();
  state.fighters[0].shield = 50;
  state.fighters[0].poison = 6;
  state.fighters[0].hand = cards([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  state.fighters[0].drawClock = -9999;
  state = run(state, 40);
  assert.equal(state.fighters[0].shield, 50);
  assert.equal(state.fighters[0].hp, MAX_HP - (6 + 2) - (6 + 2));
  assert.equal(state.fighters[0].poison, 5);
});
test('scorch: throwing while properly alight costs two life, shield or no shield', () => {
  let state = idle();
  state.fighters[0].burn = 3;
  state.fighters[0].shield = 50;
  state.fighters[0].hand = cards([2]);
  state = launchThrow(state, 0, ['proof:0']);
  assert.equal(state.fighters[0].hp, MAX_HP - 2);
  state = idle();
  state.fighters[0].burn = 2;
  state.fighters[0].hand = cards([2]);
  assert.equal(launchThrow(state, 0, ['proof:0']).fighters[0].hp, MAX_HP);
});
test('shred: single cards spend extra shield and slip past the mirror', () => {
  let state = idle([], null);
  state.fighters[1].shield = 100;
  state.fighters[1].relic = 'bastion';
  state = hit(state, cards([10]));
  assert.equal(state.fighters[1].shield, 89);
  assert.equal(state.fighters[0].hp, MAX_HP);
  state = idle([], null);
  state.fighters[1].shield = 100;
  state.fighters[1].relic = 'bastion';
  state = hit(state, cards([5, 5], [0, 1]));
  assert.equal(state.fighters[1].shield, 85);
  assert.equal(state.fighters[0].hp, MAX_HP - 6, 'v7: a pair is reflected at 40% (15 blocked)');
});
test('wound: straights and better leave the target healing at 60% for five seconds', () => {
  let state = idle();
  state = hit(state, cards([2, 3, 4, 5, 6]));
  assert.equal(state.fighters[1].woundUntil, state.tick + 100 - 0);
  const preview = previewThrow(cards([2, 3, 4, 5, 6]), []);
  assert.ok(preview.wound);
  assert.ok(!previewThrow(cards([2, 2]), []).wound);
});
test('finale: five cards or more snuff your own flames and keep you fireproof for six seconds', () => {
  let state = idle(['cinder']);
  state.fighters[0].burn = 12;
  state.fighters[0].hand = cards([2, 9, 4, 11, 6]);
  state = launchThrow(state, 0, state.fighters[0].hand.map((c) => c.uid));
  assert.equal(state.fighters[0].burn, 0);
  assert.equal(state.fighters[0].fireproofUntil, 120);
  state.fighters[1].hand = cards([2], [3]);
  state.fighters[1].items = ['cinder'];
  state.fighters[1].layout = packThrowItems(['cinder']);
  state = run(launchThrow(state, 1, ['proof:0']), 9);
  assert.equal(state.fighters[0].burn, 0);
});
test('fan parry: a sequence-fan holder with seven cards takes half from single cards', () => {
  let state = idle();
  state.fighters[1].items = ['sequence'];
  state.fighters[1].layout = packThrowItems(['sequence']);
  state.fighters[1].hand = cards(Array.from({ length: FAN_PARRY_HAND }, () => 5));
  state.fighters[0].hand = [{ uid: 'thrown', rank: 13, suit: 0 }];
  state = run(launchThrow(state, 0, ['thrown']), 9);
  assert.equal(state.fighters[1].hp, MAX_HP - 7);
  assert.ok(state.events.some((event) => event.text === '扇面格挡'));
});
test('reactive kit: the heart blanket patches single hits and keeps spilled healing; the needle box only answers big batches', () => {
  let state = idle();
  state.fighters[1].relic = 'heart';
  state.fighters[1].hp = 300;
  state = hit(state, cards([5]));
  assert.equal(state.fighters[1].hp, 297, '5 damage, 2 patched with no healing items');
  state = idle();
  state.fighters[1].relic = 'heart';
  state.fighters[1].items = ['mend', 'wash', 'drain'];
  state.fighters[1].layout = packThrowItems(['mend', 'wash', 'drain']);
  state.fighters[1].hp = 300;
  state = hit(state, cards([5]));
  assert.equal(state.fighters[1].hp, 300, '5 damage, 5 patched: two plus one per healing item');
  state = idle(['mend'], 'heart');
  state.fighters[0].hp = MAX_HP - 4;
  state.fighters[0].hand = cards([5, 6], [1, 1]);
  state = launchThrow(state, 0, ['proof:0', 'proof:1']);
  assert.equal(state.fighters[0].hp, MAX_HP);
  assert.equal(state.fighters[0].shield, 7, '18 healing, 4 needed: half of the 14 spilled becomes shield');
  state = idle();
  state.fighters[1].items = ['thorns'];
  state.fighters[1].layout = packThrowItems(['thorns']);
  state = hit(state, cards([2, 3]));
  assert.equal(state.fighters[0].hp, MAX_HP);
  state = hit(state, cards([2, 3, 9]));
  assert.equal(state.fighters[0].hp, MAX_HP - 15);
});
test('a projectile applies ailments only at impact; the coal ember adds heat and halves the cure', () => {
  let state = idle(['cinder'], 'ember');
  state.fighters[0].hand = cards([2], [3]);
  state = launchThrow(state, 0, ['proof:0']);
  assert.equal(state.fighters[1].burn, 0);
  assert.equal(state.shots[0].burn, 5, 'cinder 3 + ember 2');
  state = run(state, 9);
  assert.equal(state.fighters[1].burn, 5);
  const cure = (relic) => {
    const duel = idle([], relic);
    duel.fighters[1].items = ['wash'];
    duel.fighters[1].layout = packThrowItems(['wash']);
    duel.fighters[1].burn = 8;
    duel.fighters[1].hand = [{ uid: 'tea', rank: 2, suit: 1 }];
    return launchThrow(duel, 1, ['tea']).fighters[1].burn;
  };
  assert.equal(cure(null), 4, 'the remedy douses 4');
  assert.equal(cure('ember'), 6, 'against the ember only 2 come out');
});
test('the toxin spoon slows poison ebb from one stack per two seconds to one per three', () => {
  const left = (relic) => {
    let state = idle([], relic);
    state.fighters[1].poison = 10;
    state.fighters[1].hp = MAX_HP;
    for (let i = 0; i < 120; i++) {
      state.fighters[1].hand = [];
      state = stepThrowDuel(state);
    }
    return state.fighters[1].poison;
  };
  assert.equal(left(null), 7, 'six seconds: three stacks ebb');
  assert.equal(left('toxin'), 8, 'six seconds: two stacks ebb');
});
test('the brass mirror reflects big batches harder and the double letterbox pays off a full hand', () => {
  const reflect = (ranks) => {
    let state = idle();
    state.fighters[1].shield = 100;
    state.fighters[1].relic = 'bastion';
    state = hit(state, cards(ranks, ranks.map(() => 0)));
    return MAX_HP - state.fighters[0].hp;
  };
  assert.equal(reflect([5, 5]), 6, 'pair: 40% of 15');
  assert.equal(reflect([5, 5, 5]), 19, 'three of a kind: 70% of 28');
  const state = idle([], 'capacity');
  const full = cards([2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const context = (hand) => ({ ...state.fighters[0], hand, target: state.fighters[1] });
  assert.equal(previewThrow([full[0]], [], context(full.slice(0, 8))).relicBonus, 0);
  assert.equal(previewThrow([full[0]], [], context(full)).relicBonus, 8);
});
test('lifesteal measures actual HP loss, while penetration bypasses only its stated share', () => {
  let state = idle(['drain']);
  state.fighters[0].hp = 300;
  state.fighters[1].hp = 5;
  state = hit(state, cards([14]));
  assert.equal(state.fighters[0].hp, 301);
  state = idle(['needle']);
  state.fighters[1].shield = 100;
  state = hit(state, cards([10]));
  assert.equal(state.fighters[1].hp, MAX_HP - 3);
});
test('growth affects following throws and slow refresh pauses the draw clock without banking draws', () => {
  let state = idle(['growth']);
  state.fighters[0].lastSuit = 2;
  state.fighters[0].power = 29;
  state.fighters[0].hand = cards([2], [2]);
  state = launchThrow(state, 0, ['proof:0']);
  assert.equal(state.shots[0].damage, 31);
  assert.equal(state.fighters[0].power, 30);
  state = idle(['slow']);
  state.fighters[0].hand = cards([2, 3], [2, 2]);
  state.fighters[1].drawClock = 59;
  state = launchThrow(state, 0, ['proof:0', 'proof:1']);
  state = run(state, 9);
  assert.equal(state.fighters[1].slowUntil, 33);
  const frozen = state.fighters[1].drawClock;
  state = run(state, 23);
  assert.equal(state.fighters[1].drawClock, frozen);
  state = run(state, 1);
  assert.equal(state.fighters[1].drawClock, frozen + 1);
});
test('every seeded strategy duel reproduces its entire serialized state', () => {
  for (const [style, preset] of Object.entries(PRESETS)) {
    const replay = () => {
      let state = createThrowDuel(991, preset.items, style, preset.relic);
      for (let i = 0; i < 240 && state.status === 'playing'; i++) {
        if (i % 40 === 0)
          state = launchThrow(
            state,
            0,
            recommendCards(state.fighters[0].hand, state.fighters[0].items, style, {
              ...state.fighters[0],
              target: state.fighters[1],
              tick: state.tick,
            }).map((c) => c.uid),
          );
        state = stepThrowDuel(state);
      }
      return JSON.stringify(state);
    };
    assert.equal(replay(), replay());
  }
});

/** Both seats driven by the shipped AI; returns the first build's win share. */
function matchup(a, b, seeds) {
  let wins = 0;
  for (const seed of seeds) {
    const state = createThrowDuel(seed, [...PRESETS[a].items], b, PRESETS[a].relic, PRESETS[b].relic);
    let next = 48,
      intent = [],
      release = 0;
    while (state.status === 'playing') {
      stepThrowDuelInPlace(state);
      if (state.status !== 'playing') break;
      const fighter = state.fighters[0];
      if (intent.length && state.tick >= release) {
        launchThrowInPlace(state, 0, intent);
        intent = [];
        next = state.tick + aiThinkMs(a) / 50;
      } else if (!intent.length && state.tick >= next && fighter.hand.length) {
        aiArrange(state, 0, a);
        const pick = recommendCards(fighter.hand, fighter.items, a, {
          ...fighter,
          target: state.fighters[1],
          tick: state.tick,
        });
        if (aiReady(a, pick, fighter)) {
          intent = pick.map((card) => card.uid);
          release = state.tick + 20;
        } else next = state.tick + 9;
      }
    }
    wins += state.winner === 0 ? 1 : state.winner === 'draw' ? 0.5 : 0;
  }
  return wins / seeds.length;
}
test('balance regression: every declared counter holds and no build runs away with the field', () => {
  // The handbook requires 40 seeds for a balance conclusion; the original
  // seed family remains intact rather than dropping inconvenient samples.
  const seeds = Array.from({ length: 40 }, (_, i) => 5000 + i * 7919);
  const total = Object.fromEntries(COMPETITIVE_STYLES.map((s) => [s, 0]));
  for (const a of COMPETITIVE_STYLES)
    for (const b of COMPETITIVE_STYLES) {
      if (a >= b) continue;
      const share = (matchup(a, b, seeds) + 1 - matchup(b, a, seeds)) / 2;
      total[a] += share;
      total[b] += 1 - share;
      if (PRESETS[a].beats.includes(b)) assert.ok(share >= 0.6, `${a} should beat ${b}: ${share}`);
      if (PRESETS[b].beats.includes(a)) assert.ok(share <= 0.4, `${b} should beat ${a}: ${share}`);
    }
  for (const style of COMPETITIVE_STYLES) {
    const average = total[style] / (COMPETITIVE_STYLES.length - 1);
    assert.ok(average > 0.35 && average < 0.65, `${style} average ${average}`);
  }
});
