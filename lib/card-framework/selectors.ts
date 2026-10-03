import type {
  BattleState,
  CardState,
  GameEvent,
  Ref,
  Selector,
} from './types.ts';
import { PROFILE } from './registry.ts';
import { seededRandom } from './canonical.ts';

export const refKey = (r: Ref) =>
  `${r.side}:${r.entity}:${r.uid ?? r.lane ?? ''}`;
export const cardRef = (c: CardState): Ref => ({
  entity: 'card',
  side: c.instance.side,
  uid: c.instance.instanceId,
  lane: Math.floor(c.instance.at / 3),
});
export function definition(s: BattleState, c: CardState) {
  return s.input.blueprints.find(
    (b) =>
      b.blueprintId === c.instance.blueprintId &&
      b.revision === c.instance.revision,
  )!.draft.mechanics;
}
export const findCard = (s: BattleState, r: Ref) =>
  s.cards.find(
    (c) => c.instance.instanceId === r.uid && c.instance.side === r.side,
  );
export function attackCents(s: BattleState, c: CardState): number {
  let flat = definition(s, c).baseAttack * 100,
    percent = 10000;
  for (const status of c.statuses)
    if (status.until > s.now) {
      if (status.kind === 'attack_flat') flat += status.amount;
      else if (status.kind === 'attack_percent') percent += status.amount;
    }
  return Math.round(
    Math.min(
      PROFILE.maxAttack * 100,
      Math.max(0, (flat * Math.max(0, percent)) / 10000),
    ),
  );
}
export const frozen = (s: BattleState, c: CardState) =>
  c.statuses.some((x) => x.kind === 'freeze' && x.until > s.now);
const order = (s: BattleState, a: Ref, b: Ref) =>
  a.side - b.side ||
  (a.lane ?? -1) - (b.lane ?? -1) ||
  (findCard(s, a)?.instance.at ?? -1) - (findCard(s, b)?.instance.at ?? -1) ||
  (a.uid ?? '').localeCompare(b.uid ?? '', 'en');
export function currentMetric(s: BattleState, r: Ref, metric: string): number {
  if (r.entity === 'card') {
    const c = findCard(s, r)!;
    return metric === 'attack'
      ? attackCents(s, c) / 100
      : Math.max(0, (definition(s, c).cooldownMs ?? 0) - c.progress / 10000);
  }
  if (r.entity === 'core')
    return metric === 'coreHealth'
      ? s.hp[r.side] / 100
      : s.hp[r.side] / (PROFILE.initialHp * 100);
  const b = s.barriers[r.side][r.lane!];
  return metric === 'barrierHealth' ? b.hp / 100 : b.hp / b.maxHp;
}
export function select(
  s: BattleState,
  source: CardState,
  selector: Selector,
  event: GameEvent | null,
  selectionKey: string,
): Ref[] {
  const sides =
    selector.side === 'both'
      ? [0, 1]
      : [
          selector.side === 'ally'
            ? source.instance.side
            : 1 - source.instance.side,
        ];
  let all: Ref[] =
    selector.entity === 'card'
      ? s.cards.map(cardRef)
      : sides.flatMap<Ref>((side) =>
          selector.entity === 'core'
            ? [{ entity: 'core' as const, side: side as 0 | 1 }]
            : [0, 1, 2].map((lane) => ({
                entity: selector.entity,
                side: side as 0 | 1,
                lane,
              })),
        );
  const ownLane = Math.floor(source.instance.at / 3),
    ownStart = source.instance.at % 3,
    ownEnd = ownStart + definition(s, source).sizeCells;
  all = all.filter((r) => {
    if (!sides.includes(r.side)) return false;
    const c = r.entity === 'card' ? findCard(s, r) : undefined;
    if (selector.excludeSelf && r.uid === source.instance.instanceId)
      return false;
    const scope = selector.scope.kind;
    if (
      scope === 'event_source' &&
      (!event?.sourceRef || refKey(event.sourceRef) !== refKey(r))
    )
      return false;
    if (
      scope === 'event_target' &&
      !event?.targetRefs.some((t) => refKey(t) === refKey(r))
    )
      return false;
    if (scope === 'self' && r.uid !== source.instance.instanceId) return false;
    if (scope === 'same_lane' && r.lane !== ownLane) return false;
    if (scope === 'adjacent_lanes' && Math.abs(r.lane! - ownLane) !== 1)
      return false;
    if (
      scope === 'fixed_lanes' &&
      !selector.scope.lanes?.includes(
        (['left', 'center', 'right'] as const)[r.lane!],
      )
    )
      return false;
    if (
      [
        'adjacent_left',
        'adjacent_right',
        'adjacent_both',
        'opposing_overlap',
      ].includes(scope)
    ) {
      if (!c || r.lane !== ownLane) return false;
      const start = c.instance.at % 3,
        end = start + definition(s, c).sizeCells;
      if (scope === 'adjacent_left' && end !== ownStart) return false;
      if (scope === 'adjacent_right' && start !== ownEnd) return false;
      if (scope === 'adjacent_both' && end !== ownStart && start !== ownEnd)
        return false;
      if (scope === 'opposing_overlap' && !(start < ownEnd && end > ownStart))
        return false;
    }
    const f = selector.filters;
    if (f.sizes && (!c || !f.sizes.includes(definition(s, c).sizeCells)))
      return false;
    if (
      f.hasCooldown !== undefined &&
      !!definition(s, c!).cooldownMs !== f.hasCooldown
    )
      return false;
    if (
      f.barrierStates &&
      !f.barrierStates.includes(s.barriers[r.side][r.lane!].state)
    )
      return false;
    if (
      f.statusKinds &&
      !f.statusKinds.every((k) =>
        c
          ? c.statuses.some(
              (x) =>
                (k === 'modify_attack'
                  ? x.kind.startsWith('attack_')
                  : x.kind === k) && x.until > s.now,
            )
          : s.dots[r.side][r.lane!][k as 'burn' | 'corrosion'].some(
              (x) => x.amount > 0,
            ),
      )
    )
      return false;
    return true;
  });
  all.sort((a, b) => order(s, a, b));
  const mode = selector.selection.mode;
  if (mode === 'random' && all.length) {
    const rand = seededRandom(
      `${s.input.seed}|${selectionKey}|${s.randomCounter++}`,
    );
    for (let i = all.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [all[i], all[j]] = [all[j], all[i]];
    }
  }
  if (mode === 'highest' || mode === 'lowest')
    all.sort(
      (a, b) =>
        (mode === 'highest' ? -1 : 1) *
        (currentMetric(s, a, selector.selection.metric!) -
          currentMetric(s, b, selector.selection.metric!)),
    );
  if (mode !== 'all') all = all.slice(0, selector.selection.count);
  // Distribution remainder order is stable even when the selection itself was random.
  return all.sort((a, b) => order(s, a, b));
}
