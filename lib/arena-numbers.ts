import type { CombatFrame, Duel } from './demo-combat.ts';
import { cardDef } from './demo-cards.ts';

export const NUMBER_LIFETIME = 1.35;
export type CombatNumber = {
  id: string;
  time: number;
  side: number;
  lane: number;
  column: number;
  surface: 'barrier' | 'core';
  kind: 'damage' | 'burn' | 'corrode' | 'repair' | 'heal';
  value: number;
  track: number;
};

// Resolved losses only: applying stacks is not damage; overkill is not HP loss.
// Combine only simultaneous, identical contacts. Overflow keeps two surfaces.
export function combatNumbers(
  duel: Duel,
  frames: CombatFrame[],
): CombatNumber[] {
  const cards = new Map([...duel.player, ...duel.enemy].map((c) => [c.uid, c]));
  return frames.flatMap((frame) => {
    const groups = new Map<string, CombatNumber>();
    for (const hit of frame.hits) {
      const card = hit.sourceUid ? cards.get(hit.sourceUid) : undefined;
      const column = card ? (card.at % 3) + (cardDef(card.id).size - 1) / 2 : 1;
      const lane = hit.targetLane ?? 0;
      function add(
        surface: CombatNumber['surface'],
        kind: CombatNumber['kind'],
        value: number,
      ) {
        if (!(value > 0)) return;
        const id = `${frame.time}/${hit.side}/${lane}/${column}/${surface}/${kind}`;
        const current = groups.get(id);
        if (current)
          current.value = Math.round((current.value + value) * 100) / 100;
        else
          groups.set(id, {
            id,
            time: frame.time,
            side: hit.side,
            lane,
            column,
            surface,
            kind,
            value,
            track: ((Math.round(frame.time * 4) + groups.size) % 3) - 1,
          });
      }
      const damage =
        hit.periodic && (hit.kind === 'burn' || hit.kind === 'corrode')
          ? hit.kind
          : 'damage';
      add('barrier', damage, hit.barrierAbsorbed ?? 0);
      add('core', damage, hit.healthLoss ?? 0);
      if (hit.kind === 'shield') add('barrier', 'repair', hit.value);
      if (hit.kind === 'heal') add('core', 'heal', hit.value);
    }
    return [...groups.values()];
  });
}

// Replay time drives every pose, including pause, speed changes and seeking.
export function numberPose(
  number: CombatNumber,
  time: number,
  reduced = false,
) {
  const age = time - number.time;
  const visible = age >= 0 && age < NUMBER_LIFETIME;
  const progress = Math.max(0, Math.min(1, age / NUMBER_LIFETIME));
  const positive = number.kind === 'repair' || number.kind === 'heal';
  return {
    opacity: visible ? Math.min(1, (1 - progress) / 0.28) : 0,
    x: number.track * 18 + (reduced ? 0 : number.track * progress * 18),
    y: reduced ? -12 : -8 - progress * (positive ? 48 : 64),
    scale: reduced
      ? 1
      : 1 + (positive ? 0.14 : 0.32) * Math.max(0, 1 - age / 0.18),
  };
}
