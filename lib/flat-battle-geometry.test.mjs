import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flatEffectPath,
  flatPathPoint,
  flatSurfacePoint,
} from './flat-battle-geometry.ts';
import { combatNumbers } from './arena-numbers.ts';

const cards = [
  { id: 'arena-01', uid: 'one', at: 0 },
  { id: 'arena-02', uid: 'two', at: 4 },
  { id: 'arena-03', uid: 'three', at: 6 },
].map((c) => ({ ...c, rarity: 0, quality: 0, level: 0 }));
const duel = {
  player: cards,
  enemy: cards.map((c) => ({ ...c, uid: `enemy-${c.uid}` })),
};
const anchors = {};
for (const side of [0, 1]) {
  const y = side ? 180 : 520;
  for (const lane of [0, 1, 2]) {
    const centre = 170 + lane * 330;
    anchors[`barrier-${side}-${lane}`] = {
      x: centre,
      y: side ? 100 : 600,
      width: 300,
      height: 60,
    };
    anchors[`host-${side}-lane-${lane}`] = {
      x: centre,
      y: side ? 35 : 665,
      width: 300,
      height: 70,
    };
    for (const col of [0, 1, 2])
      anchors[`slot-${side}-${lane * 3 + col}`] = {
        x: centre + (col - 1) * 102,
        y,
        width: 96,
        height: 180,
      };
  }
  for (const [i, card] of (side ? duel.enemy : duel.player).entries()) {
    anchors[card.uid] = {
      x: [68, 551, 830][i],
      y,
      width: [96, 198, 300][i],
      height: 180,
    };
  }
}
const frame = {
  barriers: [0, 1].map(() =>
    [0, 1, 2].map(() => ({ hp: 90, maxHp: 90, broken: false })),
  ),
};

test('every same-lane card size travels vertically in both directions, even a damage shot carrying a control target', () => {
  for (const side of [0, 1])
    for (const card of side ? duel.player : duel.enemy) {
      const hit = {
        sourceUid: card.uid,
        kind: 'damage',
        side,
        targetLane: Math.floor(card.at / 3),
        targetUid: 'one',
      };
      const path = flatEffectPath(hit, duel, frame, anchors);
      assert.equal(path.from.x, path.to.x);
      for (const p of [0, 0.25, 0.5, 0.75, 1])
        assert.equal(flatPathPoint(path, p).x, anchors[card.uid].x);
      assert.equal(path.to.y, side ? 100 : 600);
    }
});

test('cross-lane attacks keep their explicit target and relative slot; ally links still address the actual card', () => {
  const path = flatEffectPath(
    { sourceUid: 'two', kind: 'damage', side: 1, targetLane: 2 },
    duel,
    frame,
    anchors,
  );
  assert.equal(path.to.x, 881);
  assert.equal(path.to.y, 100);
  const support = flatEffectPath(
    {
      sourceUid: 'one',
      kind: 'charge',
      side: 0,
      targetUid: 'two',
      targetLane: 0,
    },
    duel,
    frame,
    anchors,
  );
  assert.deepEqual(support.to, anchors.two);
});

test('a breaking impact lands on the curtain; later shots go to the soul, and overflow numbers retain both contact surfaces', () => {
  const broken = structuredClone(frame);
  broken.barriers[1][0].broken = true;
  const base = {
    sourceUid: 'one',
    kind: 'damage',
    side: 1,
    targetLane: 0,
    value: 20,
  };
  const impact = {
    ...base,
    barrierAbsorbed: 5,
    healthLoss: 15,
    targetUid: 'host-1-lane-0',
  };
  assert.equal(flatEffectPath(impact, duel, broken, anchors).to.y, 100);
  assert.equal(flatEffectPath(base, duel, broken, anchors).to.y, 35);
  const numbers = combatNumbers(duel, [{ time: 3, hits: [impact] }]);
  const positions = numbers.map((n) =>
    flatSurfacePoint(anchors, n.side, n.lane, n.column, n.surface),
  );
  assert.deepEqual(positions, [
    { x: 68, y: 100 },
    { x: 68, y: 35 },
  ]);
});
