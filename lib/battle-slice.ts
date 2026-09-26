import { newRun, makeItem, makeDuel, act, type Run } from './demo-engine.ts';
import { cardDef, cardFamily } from './demo-cards.ts';
import type { CombatFrame, Duel } from './demo-combat.ts';

// Isolated, repeatable checkpoint after the existing first three tutorial rooms.
// No browser storage is read or written and no adventure reward is granted.
export function createBattleSlice(): Run {
  const s = newRun(10909, true);
  s.phase = 'floor';
  s.floor = 1;
  s.node = 4;
  s.encounter = null;
  s.equipmentExplained = true;
  s.energyExplained = true;
  s.tutorialBattleStep = 99;
  s.items = [
    { ...makeItem('slice-sling', 'slingshot', 'card', 'board'), at: 6 },
    { ...makeItem('slice-blade', 'gapblade', 'card', 'board'), at: 0 },
    makeItem('slice-pad', 'rubber~precision', 'card'),
  ];
  return s;
}

// Slice-only tuning: the same flight duration drives simulation and rendering.
function withSliceFlights(duel: Duel): Duel {
  const configure = (cards: Duel['player']) =>
    cards.map((card) => ({
      ...card,
      flightTime:
        cardFamily(card.id) === 'springbow'
          ? 0.5
          : cardFamily(card.id) === 'slingshot'
            ? 0.75
            : 1.25,
    }));
  return {
    ...duel,
    player: configure(duel.player),
    enemy: configure(duel.enemy),
  };
}
export const slicePreview = (s: Run) =>
  withSliceFlights(makeDuel(s, 'guardian'));
export const startSlice = (s: Run) => {
  const next = act(s, { type: 'fight' });
  return { ...next, duel: withSliceFlights(next.duel!) };
};
export function settleSlice(s: Run) {
  return act(s, { type: 'resolve' });
}

export function sliceEvidence(frames: CombatFrame[]) {
  const last = frames.at(-1)!;
  let breakLine = '本场未击破敌方屏障';
  let reduced = 0;
  for (let i = 1; i < frames.length; i++) {
    const frame = frames[i];
    if (breakLine.startsWith('本场')) {
      const lane = frame.barriers[1].findIndex(
        (b, l) => b.broken && !frames[i - 1].barriers[1][l].broken,
      );
      if (lane >= 0)
        breakLine = `${frame.time.toFixed(2)}s · 敌方${['左', '中', '右'][lane]}路屏障击破`;
    }
    for (const hit of frame.hits)
      if (hit.side === 0 && !hit.periodic) reduced += hit.blocked ?? 0;
  }
  return {
    breakLine,
    reduced,
    ownLoss: frames[0].hp[0] - last.hp[0],
    enemyLoss: frames[0].hp[1] - last.hp[1],
  };
}

export const sliceCard = (item: Run['items'][number]) => ({
  uid: item.uid,
  id: item.id,
  at: item.at ?? -1,
  rarity: item.rarity ?? cardDef(item.id).rarity ?? 0,
  quality: item.quality,
  level: item.level,
});
