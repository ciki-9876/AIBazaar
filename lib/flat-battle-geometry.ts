import { cardDef } from './cards/catalog.ts';
import type { CombatFrame, Duel, Hit } from './cards/combat.ts';

export type FlatAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type FlatAnchors = Record<string, FlatAnchor>;

// A contact is a point on a whole lane surface, not the lane's centre badge.
export function flatSurfacePoint(
  anchors: FlatAnchors,
  side: number,
  lane: number,
  column: number,
  surface: 'barrier' | 'core',
) {
  const target =
    anchors[
      surface === 'core'
        ? `host-${side}-lane-${lane}`
        : `barrier-${side}-${lane}`
    ];
  if (!target) return undefined;
  const first = anchors[`slot-${side}-${lane * 3}`];
  const last = anchors[`slot-${side}-${lane * 3 + 2}`];
  const x =
    first && last
      ? first.x + ((last.x - first.x) * column) / 2
      : target.x - target.width / 2 + (target.width * (column + 0.5)) / 3;
  return { x, y: target.y };
}

export function flatEffectPath(
  hit: Hit,
  duel: Duel,
  frame: CombatFrame,
  anchors: FlatAnchors,
) {
  const source = anchors[hit.sourceUid ?? ''];
  if (!source) return undefined;
  const card = [...duel.player, ...duel.enemy].find(
    (c) => c.uid === hit.sourceUid,
  );
  const lane = hit.targetLane ?? 0;
  const column = card ? (card.at % 3) + (cardDef(card.id).size - 1) / 2 : 1;
  let surface: 'barrier' | 'core' | undefined;
  if (hit.kind === 'damage') {
    // A breaking hit still contacts the curtain it actually damaged.
    surface =
      (hit.barrierAbsorbed ?? 0) > 0
        ? 'barrier'
        : (hit.healthLoss ?? 0) > 0 || frame.barriers[hit.side][lane].broken
          ? 'core'
          : 'barrier';
  } else if (['burn', 'corrode', 'shield'].includes(hit.kind))
    surface = 'barrier';
  else if (hit.kind === 'heal') surface = 'core';
  let to = surface
    ? flatSurfacePoint(anchors, hit.side, lane, column, surface)
    : anchors[hit.targetUid ?? ''];
  if (!to) return undefined;
  if (surface && card && Math.floor(card.at / 3) === lane)
    to = { x: source.x, y: to.y };
  const from = { x: source.x, y: source.y };
  return { from, to };
}

export function flatPathPoint(
  path: { from: { x: number; y: number }; to: { x: number; y: number } },
  progress: number,
) {
  return {
    x: path.from.x + (path.to.x - path.from.x) * progress,
    y: path.from.y + (path.to.y - path.from.y) * progress,
  };
}
