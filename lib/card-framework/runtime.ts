import type {
  Ability,
  BattleInput,
  BattleState,
  CardState,
  Cause,
  Contribution,
  Effect,
  GameEvent,
  Ref,
  Submission,
} from './types.ts';
import {
  ENGINE_VERSION,
  HASH_VERSION,
  PROFILE,
  RNG_VERSION,
} from './registry.ts';
import {
  canonical,
  copy,
  fingerprint,
  proportional,
  splitCents,
} from './canonical.ts';
import { validateDraft } from './validation.ts';
import { describeCard } from './describe.ts';
import {
  attackCents,
  cardRef,
  currentMetric,
  definition,
  findCard,
  frozen,
  refKey,
  select,
} from './selectors.ts';

export const simulatorVersion = ENGINE_VERSION;
const freshId = (s: BattleState, prefix: string) => `${prefix}:${s.serial++}`;
const isDamage = (kind: string) => kind === 'physical_damage';
const publicStatus = (kind: string) =>
  kind.startsWith('attack_') ? 'modify_attack' : kind;
const same = (a: Ref, b: Ref) => refKey(a) === refKey(b);
function root(s: BattleState): Cause {
  const key = freshId(s, 'root');
  s.roots[key] = { visited: [], commits: 0 };
  return { rootIds: [key], visited: [], depth: 0, parentEventId: null };
}
function merged(causes: Cause[]): Cause {
  return {
    rootIds: [...new Set(causes.flatMap((c) => c.rootIds))].sort(),
    visited: [...new Set(causes.flatMap((c) => c.visited))].sort(),
    depth: Math.max(0, ...causes.map((c) => c.depth)),
    parentEventId:
      causes
        .map((c) => c.parentEventId)
        .filter((id): id is string => id !== null)
        .sort((a, b) => a.localeCompare(b, 'en'))[0] ?? null,
  };
}
function event(
  s: BattleState,
  kind: string,
  sourceRef: Ref | null,
  targetRefs: Ref[],
  payload: GameEvent['payload'] = {},
  cause: Cause = root(s),
): GameEvent {
  const e: GameEvent = {
    ...copy(cause),
    eventId: freshId(s, 'event'),
    kind,
    atMs: s.now,
    sourceRef: copy(sourceRef),
    targetRefs: copy(targetRefs),
    payload: copy(payload),
  };
  s.events.push(e);
  if (s.events.length > 100000) throw Error('EVENT_BUDGET_EXCEEDED');
  return e;
}
function causeOf(e: GameEvent): Cause {
  return {
    rootIds: [...e.rootIds],
    visited: [...e.visited],
    depth: e.depth + 1,
    parentEventId: e.eventId,
  };
}
function subjectRefs(e: GameEvent): Ref[] {
  return [
    'damage_dealt',
    'healing_done',
    'repair_done',
    'card_activated',
    'cooldown_ready',
    'chain_received',
  ].includes(e.kind)
    ? e.sourceRef
      ? [e.sourceRef]
      : []
    : e.targetRefs;
}
function guardsPass(
  s: BattleState,
  c: CardState,
  a: Ability,
  e: GameEvent,
): boolean {
  return a.when.guards.every((g) => {
    if (g.kind === 'barrier_state') {
      const refs = select(
        s,
        c,
        {
          entity: 'barrier',
          side: g.side,
          scope: g.scope,
          excludeSelf: false,
          filters: {},
          selection: { mode: 'all' },
          sampling: 'at_submit',
        },
        e,
        `${e.eventId}:guard`,
      );
      return (
        refs.length > 0 &&
        refs.every((r) => g.states.includes(s.barriers[r.side][r.lane!].state))
      );
    }
    const refs = select(s, c, g.target, e, `${e.eventId}:guard`);
    return (
      refs.length > 0 &&
      refs.every((r) => {
        const v = currentMetric(s, r, g.stat);
        return g.op === 'lt'
          ? v < g.value
          : g.op === 'lte'
            ? v <= g.value
            : g.op === 'eq'
              ? v === g.value
              : g.op === 'gte'
                ? v >= g.value
                : v > g.value;
      })
    );
  });
}
function magnitude(
  e: GameEvent,
  fx: Effect,
  atk: number,
): number {
  const m = fx.magnitude;
  if (!m) return 0;
  if (m.kind === 'fixed') return Math.round(m.value * 100);
  const base = m.kind === 'attack_ratio' ? atk : e.payload[m.field];
  if (typeof base !== 'number') throw Error(`MISSING_EVENT_FIELD:${fx.id}`);
  return Math.min(
    m.cap === null ? Infinity : Math.round(m.cap * 100),
    Math.round((base * m.ratioBps) / 10000),
  );
}
function commit(
  s: BattleState,
  c: CardState,
  a: Ability,
  e: GameEvent,
  kind: 'cycle' | 'reactive' | 'chain',
  inherited?: Cause,
): boolean {
  if (frozen(s, c) || !guardsPass(s, c, a, e)) return false;
  const st = c.abilities[a.id];
  if (kind !== 'chain') st.occurrences++;
  if (kind !== 'chain' && st.occurrences % a.when.occurrence.everyNth !== 0)
    return false;
  if (
    a.limits &&
    (st.count >= a.limits.maxActivationsPerBattle || s.now < st.nextAt)
  )
    return false;
  const cause = inherited ?? causeOf(e),
    key = `${c.instance.instanceId}/${a.id}`;
  const ledgers = cause.rootIds.map((id) => s.roots[id]);
  if (ledgers.some((l) => !l)) throw Error('MISSING_CAUSAL_ROOT');
  const reason =
    cause.depth > PROFILE.maxDepth
      ? 'DEPTH_LIMIT'
      : cause.visited.includes(key) ||
          ledgers.some((l) => l.visited.includes(key))
        ? 'ABILITY_ALREADY_VISITED'
        : ledgers.some((l) => l.commits >= PROFILE.maxCommits)
          ? 'ROOT_COMMIT_LIMIT'
          : null;
  if (reason) {
    event(
      s,
      'ability_suppressed',
      cardRef(c),
      [],
      { abilityId: a.id, reason },
      cause,
    );
    return false;
  }
  // Select the entire ability atomically before committing any effect or quota.
  const beforeRandom = s.randomCounter,
    atk = attackCents(s, c);
  const prepared = a.effects.map((fx) => {
    const targets = select(s, c, fx.target, e, `${e.eventId}:${key}:${fx.id}`),
      amount = magnitude(e, fx, atk);
    const amounts =
      fx.distribution === 'split_total'
        ? splitCents(amount, targets.length)
        : targets.map(() => amount);
    return {
      fx,
      targets: targets.map((ref, i) => ({ ref, amount: amounts[i] })),
    };
  });
  if (kind !== 'cycle' && !prepared.some((p) => p.targets.length)) {
    s.randomCounter = beforeRandom;
    return false;
  }
  for (const l of ledgers) {
    l.visited.push(key);
    l.commits++;
  }
  const committed = {
    ...cause,
    visited: [...new Set([...cause.visited, key])],
  };
  st.count++;
  st.nextAt = s.now + (a.limits?.internalCooldownMs ?? 0);
  if (kind === 'chain')
    event(
      s,
      'chain_received',
      cardRef(c),
      [cardRef(c)],
      { abilityId: a.id },
      committed,
    );
  if (kind !== 'cycle')
    event(
      s,
      'card_activated',
      cardRef(c),
      [cardRef(c)],
      { activationKind: kind, abilityId: a.id, attack: atk },
      committed,
    );
  for (const p of prepared) {
    if (!p.targets.length) {
      event(
        s,
        'effect_skipped',
        cardRef(c),
        [],
        { effectId: p.fx.id, reason: 'NO_TARGET' },
        committed,
      );
      continue;
    }
    const queued: Submission = {
      id: freshId(s, 'effect'),
      effectId: p.fx.id,
      atMs: s.now + (a.delivery.travelMs ?? 0),
      source: cardRef(c),
      abilityId: a.id,
      kind: p.fx.kind,
      targets: p.targets,
      params: p.fx.params ? copy(p.fx.params) : undefined,
      cause: copy(committed),
    };
    // JSON never stores undefined fields.
    if (!p.fx.params) delete queued.params;
    s.queue.push(queued);
    event(
      s,
      'effect_submitted',
      cardRef(c),
      p.targets.map((t) => t.ref),
      {
        effectId: p.fx.id,
        kind: p.fx.kind,
        arrivesAtMs: queued.atMs,
        requestedAmount: p.targets.reduce((n, t) => n + t.amount, 0),
      },
      committed,
    );
  }
  return true;
}
function cycle(s: BattleState, c: CardState, e: GameEvent) {
  const a = definition(s, c).abilities.find(
    (a) => a.when.event === 'cooldown_ready',
  )!;
  event(
    s,
    'card_activated',
    cardRef(c),
    [cardRef(c)],
    { activationKind: 'cycle', abilityId: a.id, attack: attackCents(s, c) },
    causeOf(e),
  );
  commit(s, c, a, e, 'cycle');
}
function respond(s: BattleState, e: GameEvent) {
  for (const c of s.cards)
    for (const a of definition(s, c).abilities) {
      const w = a.when;
      if (w.event !== e.kind || w.event === 'cooldown_ready') continue;
      if (frozen(s, c)) continue;
      const f = w.filters;
      if (
        f.activationKinds &&
        !f.activationKinds.includes(String(e.payload.activationKind))
      )
        continue;
      if (
        f.damageKinds &&
        !f.damageKinds.includes(String(e.payload.damageKind))
      )
        continue;
      if (
        e.payload.damageKind === 'corruption' &&
        w.event === 'damage_received' &&
        !f.damageKinds?.includes('corruption')
      )
        continue;
      if (
        f.statusKinds &&
        !f.statusKinds.includes(String(e.payload.statusKind))
      )
        continue;
      if (
        e.payload.ownerAbility &&
        e.payload.ownerAbility !== `${c.instance.instanceId}/${a.id}`
      )
        continue;
      if (w.subjects) {
        const watches =
          w.subjects.sampling === 'battle_start'
            ? c.watched[a.id]
            : select(
                s,
                c,
                w.subjects,
                e,
                `${e.eventId}:listen:${c.instance.instanceId}/${a.id}`,
              );
        if (
          !subjectRefs(e).some((subject) =>
            watches.some((r) => same(r, subject)),
          )
        )
          continue;
      }
      commit(s, c, a, e, 'reactive');
    }
}
function breakBarrier(
  s: BattleState,
  ref: Ref,
  cause: Cause,
  source: Ref | null,
) {
  const b = s.barriers[ref.side][ref.lane!];
  b.state = 'broken';
  b.hp = 0;
  b.graceExpiresAtMs = null;
  event(s, 'barrier_broken', source, [ref], {}, cause);
}
function damage(
  s: BattleState,
  target: Ref,
  requested: number,
  damageKind: string,
  source: Ref | null,
  cause: Cause,
  contributors?: Contribution[],
) {
  let barrierLoss = 0,
    coreLoss = 0;
  const before = s.hp[target.side];
  if (target.entity === 'core') {
    coreLoss = Math.min(before, requested);
    s.hp[target.side] -= coreLoss;
  } else {
    const b = s.barriers[target.side][target.lane!],
      barrierRef: Ref = {
        entity: 'barrier',
        side: target.side,
        lane: target.lane,
      };
    const old = b.hp;
    barrierLoss = b.state === 'broken' ? 0 : Math.min(b.hp, requested);
    b.hp -= barrierLoss;
    if (target.entity === 'lane') {
      coreLoss = Math.min(before, requested - barrierLoss);
      s.hp[target.side] -= coreLoss;
    }
    if (damageKind === 'corrosion' && b.state !== 'broken') {
      b.maxHp = Math.max(100, b.maxHp - requested);
      b.hp = Math.min(b.hp, b.maxHp);
    }
    if (old > 0 && b.hp === 0) {
      b.zeroCause = copy(cause);
      b.zeroSource = copy(source);
      if (b.graceProviderRef && b.graceUsesConsumed === 0) {
        b.state = 'pending_break';
        b.graceUsesConsumed++;
        b.graceExpiresAtMs = s.now + b.graceDurationMs;
        event(
          s,
          'barrier_grace_started',
          source,
          [barrierRef],
          { expiresAtMs: b.graceExpiresAtMs },
          cause,
        );
      } else breakBarrier(s, barrierRef, cause, source);
      event(s, 'barrier_zero', source, [barrierRef], {}, cause);
    }
  }
  event(
    s,
    'damage_resolved',
    source,
    [target],
    {
      damageKind,
      requestedAmount: requested,
      barrierLoss,
      coreLoss,
      totalLoss: barrierLoss + coreLoss,
    },
    cause,
  );
  const recipients: Ref[] = [];
  if (barrierLoss > 0)
    recipients.push({
      entity: 'barrier',
      side: target.side,
      lane: target.lane,
    });
  if (coreLoss > 0) recipients.push({ entity: 'core', side: target.side });
  if (recipients.length)
    event(
      s,
      'damage_received',
      source,
      recipients,
      { damageKind, barrierLoss, coreLoss, totalLoss: barrierLoss + coreLoss },
      cause,
    );
  if (contributors) {
    const weights = contributors.map((c) => c.amount),
      bShares = proportional(barrierLoss, weights),
      hShares = proportional(coreLoss, weights);
    contributors.forEach((c, i) => {
      if (bShares[i] + hShares[i] > 0)
        event(
          s,
          'damage_dealt',
          c.source,
          [target],
          {
            damageKind,
            barrierLoss: bShares[i],
            coreLoss: hShares[i],
            totalLoss: bShares[i] + hShares[i],
          },
          merged([cause, c.cause]),
        );
    });
  } else if (source && barrierLoss + coreLoss > 0)
    event(
      s,
      'damage_dealt',
      source,
      [target],
      { damageKind, barrierLoss, coreLoss, totalLoss: barrierLoss + coreLoss },
      cause,
    );
}
function apply(s: BattleState, q: Submission) {
  const sourceCard = findCard(s, q.source);
  if (!sourceCard) throw Error('INVALID_EFFECT_SOURCE');
  for (const target of q.targets) {
    const r = target.ref,
      n = target.amount,
      cause = q.cause;
    if (q.kind === 'physical_damage') {
      damage(s, r, n, 'physical', q.source, cause);
      continue;
    }
    if (q.kind === 'apply_burn' || q.kind === 'apply_corrosion') {
      const kind = q.kind === 'apply_burn' ? 'burn' : 'corrosion',
        dots = s.dots[r.side][r.lane!][kind];
      const existing = dots.reduce((sum, c) => sum + c.amount, 0),
        add = Math.max(
          0,
          Math.min(
            n,
            (kind === 'burn' ? PROFILE.burnCap : PROFILE.corrosionCap) * 100 -
              existing,
          ),
        );
      if (add) {
        dots.push({
          key: q.id,
          source: copy(q.source),
          amount: add,
          cause: copy(cause),
        });
        event(
          s,
          'status_applied',
          q.source,
          [r],
          {
            statusKind: kind,
            effectiveAmount: add,
            requestedAmount: n,
            capLoss: n - add,
          },
          cause,
        );
      } else
        event(
          s,
          'effect_zero',
          q.source,
          [r],
          { kind: q.kind, requestedAmount: n, reason: 'STATUS_CAP' },
          cause,
        );
      continue;
    }
    if (q.kind === 'repair_barrier') {
      const b = s.barriers[r.side][r.lane!],
        amount = b.state === 'broken' ? 0 : Math.min(n, b.maxHp - b.hp);
      b.hp += amount;
      event(
        s,
        'repair_resolved',
        q.source,
        [r],
        { requestedAmount: n, effectiveAmount: amount },
        cause,
      );
      if (amount > 0) {
        if (b.state === 'pending_break') {
          b.state = 'intact';
          b.graceExpiresAtMs = null;
          event(
            s,
            'barrier_grace_ended',
            q.source,
            [r],
            { reason: 'REPAIRED' },
            cause,
          );
        }
        event(
          s,
          'repair_done',
          q.source,
          [r],
          { effectiveAmount: amount },
          cause,
        );
        event(
          s,
          'barrier_repaired',
          q.source,
          [r],
          { effectiveAmount: amount },
          cause,
        );
      }
      continue;
    }
    if (q.kind === 'heal_core') {
      const amount = Math.min(n, PROFILE.initialHp * 100 - s.hp[r.side]);
      s.hp[r.side] += amount;
      event(
        s,
        'heal_resolved',
        q.source,
        [r],
        { requestedAmount: n, effectiveAmount: amount },
        cause,
      );
      if (amount) {
        event(
          s,
          'healing_done',
          q.source,
          [r],
          { effectiveAmount: amount },
          cause,
        );
        event(
          s,
          'healing_received',
          q.source,
          [r],
          { effectiveAmount: amount },
          cause,
        );
      }
      continue;
    }
    const card = findCard(s, r);
    if (!card) {
      event(
        s,
        'effect_skipped',
        q.source,
        [r],
        { reason: 'INVALID_TARGET' },
        cause,
      );
      continue;
    }
    const m = definition(s, card),
      p = q.params ?? {};
    if (q.kind === 'advance_cooldown') {
      if (frozen(s, card) || m.cooldownMs === null) {
        event(
          s,
          'effect_zero',
          q.source,
          [r],
          { reason: frozen(s, card) ? 'FROZEN' : 'NO_COOLDOWN' },
          cause,
        );
        continue;
      }
      const amount = Math.max(
        0,
        Math.min(p.amountMs! * 10000, m.cooldownMs * 10000 - card.progress),
      );
      card.progress += amount;
      if (amount > 0) {
        const e = event(
          s,
          'cooldown_advanced',
          q.source,
          [r],
          { amountMs: amount / 10000, requestedMs: p.amountMs! },
          cause,
        );
        if (card.progress >= m.cooldownMs * 10000 && s.hp[r.side] > 0) {
          card.progress -= m.cooldownMs * 10000;
          // The original cause is retained; charging cannot launder a chain into a fresh root.
          cycle(s, card, e);
        }
      }
      continue;
    }
    if (q.kind === 'trigger_chain') {
      if (
        card.instance.instanceId === q.source.uid ||
        !m.chainEntryAbilityId ||
        frozen(s, card)
      ) {
        event(
          s,
          'chain_rejected',
          q.source,
          [r],
          { reason: 'NO_ELIGIBLE_ENTRY' },
          cause,
        );
        continue;
      }
      const a = m.abilities.find((a) => a.id === m.chainEntryAbilityId)!;
      const e = event(s, 'chain_requested', q.source, [r], {}, cause);
      commit(s, card, a, e, 'chain');
      continue;
    }
    const before = attackCents(s, card),
      kind = q.kind === 'modify_attack' ? `attack_${p.mode}` : q.kind;
    // Key by source, ability and kind: refreshing never accumulates another copy.
    const key = `${q.source.uid}/${q.abilityId}/${q.effectId}/${kind}`;
    const amount =
      q.kind === 'modify_attack'
        ? p.mode === 'flat'
          ? Math.round(p.delta! * 100)
          : p.delta!
        : (p.rateBps ?? 0);
    const old = card.statuses.find((st) => st.key === key),
      until = s.now + p.durationMs!;
    const changed = !old || until > old.until || amount !== old.amount;
    if (old) {
      old.until = Math.max(old.until, until);
      old.amount = ['haste', 'slow'].includes(kind)
        ? Math.max(old.amount, amount)
        : amount;
      old.cause = merged([old.cause, cause]);
    } else
      card.statuses.push({
        key,
        kind,
        amount,
        until,
        source: copy(q.source),
        cause: copy(cause),
      });
    if (changed)
      event(
        s,
        'status_applied',
        q.source,
        [r],
        { statusKind: publicStatus(kind), expiresAtMs: until },
        cause,
      );
    const after = attackCents(s, card);
    if (after !== before)
      event(
        s,
        'attack_changed',
        q.source,
        [r],
        { before, after, delta: after - before },
        cause,
      );
  }
}
// Event cursor is transient; every public advance drains all immediate work before saving.
function settle(s: BattleState, start: number) {
  let cursor = start,
    operations = 0;
  while (cursor < s.events.length || s.queue.some((q) => q.atMs <= s.now)) {
    if (++operations > 10000) throw Error('EVENT_BUDGET_EXCEEDED');
    const due = s.queue
      .filter((q) => q.atMs <= s.now)
      .sort(
        (a, b) =>
          a.atMs - b.atMs ||
          (isDamage(a.kind) ? 0 : a.kind === 'advance_cooldown' ? 3 : 2) -
            (isDamage(b.kind) ? 0 : b.kind === 'advance_cooldown' ? 3 : 2) ||
          Number(a.id.split(':')[1]) - Number(b.id.split(':')[1]),
      );
    const keys = new Set(due.map((q) => q.id));
    s.queue = s.queue.filter((q) => !keys.has(q.id));
    for (const q of due) apply(s, q);
    const end = s.events.length;
    while (cursor < end) respond(s, s.events[cursor++]);
  }
}
function expire(s: BattleState) {
  for (const c of s.cards) {
    // Compare immediately before the boundary against the after-expiration value.
    const before = attackAtPreviousBoundary(s, c),
      expired = c.statuses.filter((x) => x.until <= s.now);
    c.statuses = c.statuses.filter((x) => x.until > s.now);
    for (const st of expired)
      event(
        s,
        'status_expired',
        st.source,
        [cardRef(c)],
        { statusKind: publicStatus(st.kind) },
        st.cause,
      );
    const after = attackCents(s, c);
    if (before !== after && expired.length)
      event(
        s,
        'attack_changed',
        null,
        [cardRef(c)],
        { before, after, delta: after - before },
        merged(expired.map((x) => x.cause)),
      );
  }
  for (const side of [0, 1] as const)
    for (const lane of [0, 1, 2]) {
      const b = s.barriers[side][lane];
      if (b.state === 'pending_break' && b.graceExpiresAtMs! <= s.now) {
        const r: Ref = { entity: 'barrier', side, lane },
          cause = b.zeroCause!;
        event(
          s,
          'barrier_grace_ended',
          b.zeroSource,
          [r],
          { reason: 'EXPIRED' },
          cause,
        );
        breakBarrier(s, r, cause, b.zeroSource);
      }
    }
}
function attackAtPreviousBoundary(s: BattleState, c: CardState) {
  const now = s.now;
  s.now -= PROFILE.stepMs;
  const n = attackCents(s, c);
  s.now = now;
  return n;
}
function periodic(s: BattleState) {
  for (const side of [0, 1] as const)
    for (const lane of [0, 1, 2])
      for (const kind of ['corrosion', 'burn'] as const) {
        if (s.now % (kind === 'burn' ? 500 : 1000)) continue;
        const dots = s.dots[side][lane][kind],
          total = dots.reduce((n, x) => n + x.amount, 0);
        if (!total) continue;
        const cause = merged(dots.map((d) => d.cause));
        damage(
          s,
          { entity: 'lane', side, lane },
          total,
          kind,
          null,
          cause,
          copy(dots),
        );
        if (kind === 'burn') {
          const loss = proportional(
            Math.min(total, 100),
            dots.map((d) => d.amount),
          );
          dots.forEach((d, i) => (d.amount -= loss[i]));
          s.dots[side][lane].burn = dots.filter((d) => d.amount > 0);
          if (!s.dots[side][lane].burn.length)
            event(
              s,
              'status_expired',
              null,
              [{ entity: 'lane', side, lane }],
              { statusKind: 'burn' },
              cause,
            );
        }
      }
  if (s.now === PROFILE.corruptionStartMs)
    event(s, 'corruption_started', null, [], {});
  if (
    s.now >= PROFILE.corruptionFirstMs &&
    (s.now - PROFILE.corruptionFirstMs) % PROFILE.corruptionPeriodMs === 0
  ) {
    const cause = root(s),
      n = ++s.corruptionRound;
    // All six packets resolve before any response or death check.
    for (const side of [0, 1] as const)
      for (const lane of [0, 1, 2])
        damage(
          s,
          { entity: 'lane', side, lane },
          n * 100,
          'corruption',
          null,
          cause,
        );
    event(
      s,
      'corruption_pulse',
      null,
      [],
      { round: n, damagePerLane: n * 100 },
      cause,
    );
  }
}
function verdict(s: BattleState) {
  if (s.hp[0] <= 0 || s.hp[1] <= 0) {
    s.result = {
      winner: s.hp[0] <= 0 && s.hp[1] <= 0 ? -1 : s.hp[0] <= 0 ? 1 : 0,
      atMs: s.now,
    };
    event(s, 'battle_ended', null, [], { winner: s.result.winner });
  }
}
function step(s: BattleState) {
  s.now += PROFILE.stepMs;
  let start = s.events.length;
  expire(s);
  // Prior committed projectiles and this tick's periodic damage share a death batch.
  const damageDue = s.queue.filter((q) => q.atMs <= s.now && isDamage(q.kind));
  const ids = new Set(damageDue.map((q) => q.id));
  s.queue = s.queue.filter((q) => !ids.has(q.id));
  for (const q of damageDue) apply(s, q);
  periodic(s);
  settle(s, start);
  start = s.events.length;
  for (const c of s.cards) {
    for (const a of definition(s, c).abilities) {
      const f = a.when.filters;
      if (a.when.event === 'time_reached' && s.now === f.atMs)
        event(s, 'time_reached', null, [], {
          ownerAbility: `${c.instance.instanceId}/${a.id}`,
        });
      if (
        a.when.event === 'interval_elapsed' &&
        s.now >= f.firstAtMs! &&
        (s.now - f.firstAtMs!) % f.periodMs! === 0
      )
        event(s, 'interval_elapsed', null, [], {
          ownerAbility: `${c.instance.instanceId}/${a.id}`,
        });
    }
  }
  settle(s, start);
  start = s.events.length;
  const ready: CardState[] = [];
  for (const c of s.cards) {
    const m = definition(s, c);
    if (s.hp[c.instance.side] <= 0 || m.cooldownMs === null || frozen(s, c))
      continue;
    const haste = Math.max(
        0,
        ...c.statuses.filter((x) => x.kind === 'haste').map((x) => x.amount),
      ),
      slow = Math.max(
        0,
        ...c.statuses.filter((x) => x.kind === 'slow').map((x) => x.amount),
      );
    c.progress +=
      PROFILE.stepMs * Math.min(25000, Math.max(0, 10000 + haste - slow));
    if (c.progress >= m.cooldownMs * 10000) {
      c.progress -= m.cooldownMs * 10000;
      ready.push(c);
    }
  }
  for (const c of ready) {
    const e = event(s, 'cooldown_ready', cardRef(c), [cardRef(c)]);
    cycle(s, c, e);
  }
  settle(s, start);
  verdict(s);
  if (!s.result && s.now >= PROFILE.maxSimulationMs)
    throw Error('SIMULATION_BUDGET_EXCEEDED');
}
export async function createBattle(input: BattleInput): Promise<BattleState> {
  const clean = copy(input);
  if (
    clean.profileId !== PROFILE.id ||
    !Number.isInteger(clean.seed) ||
    clean.seed < 0 ||
    clean.seed > 0xffffffff
  )
    throw Error('INVALID_RULE_PROFILE_OR_SEED');
  if (
    !Array.isArray(clean.blueprints) ||
    clean.blueprints.length > 36 ||
    !Array.isArray(clean.instances) ||
    clean.instances.length > 18
  )
    throw Error('INVALID_BATTLE_INPUT');
  const refs = new Set<string>();
  for (const b of clean.blueprints) {
    if (
      typeof b.blueprintId !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,79}$/.test(b.blueprintId) ||
      !Number.isInteger(b.revision) ||
      b.revision < 1
    )
      throw Error('INVALID_BLUEPRINT_IDENTITY');
    const key = `${b.blueprintId}@${b.revision}`;
    if (refs.has(key)) throw Error('DUPLICATE_BLUEPRINT');
    refs.add(key);
    validateDraft(b.draft);
    if (b.rulesText !== describeCard(b.draft))
      throw Error('BLUEPRINT_DESCRIPTION_MISMATCH');
    if (
      b.hashVersion !== HASH_VERSION ||
      (await fingerprint(b.draft)) !== b.contentHash ||
      (await fingerprint(b.draft.mechanics)) !== b.mechanicsHash
    )
      throw Error('BLUEPRINT_HASH_MISMATCH');
  }
  const occupied = new Set<string>(),
    uids = new Set<string>();
  for (const c of clean.instances) {
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,79}$/.test(c.instanceId) ||
      uids.has(c.instanceId) ||
      !refs.has(`${c.blueprintId}@${c.revision}`) ||
      ![0, 1].includes(c.side) ||
      !Number.isInteger(c.at) ||
      c.at < 0 ||
      c.at > 8 ||
      c.level !== 0 ||
      c.quality !== 0
    )
      throw Error('INVALID_INSTANCE');
    uids.add(c.instanceId);
    const size = clean.blueprints.find(
      (b) => b.blueprintId === c.blueprintId && b.revision === c.revision,
    )!.draft.mechanics.sizeCells;
    if ((c.at % 3) + size > 3) throw Error('CROSS_LANE_PLACEMENT');
    for (let i = 0; i < size; i++) {
      const key = `${c.side}:${c.at + i}`;
      if (occupied.has(key)) throw Error('OVERLAPPING_PLACEMENT');
      occupied.add(key);
    }
  }
  clean.instances.sort(
    (a, b) =>
      a.side - b.side ||
      a.at - b.at ||
      a.instanceId.localeCompare(b.instanceId, 'en'),
  );
  clean.blueprints.sort(
    (a, b) =>
      a.blueprintId.localeCompare(b.blueprintId, 'en') ||
      a.revision - b.revision,
  );
  const s: BattleState = {
    format: 'f9-framework-snapshot/1',
    profileId: PROFILE.id,
    input: clean,
    inputHash: await fingerprint(clean),
    rulesSnapshot: {
      engineVersion: ENGINE_VERSION,
      profile: { ...PROFILE },
      specialModules: ['barrier_break_grace/1-draft'],
    },
    now: 0,
    serial: 0,
    randomCounter: 0,
    rngVersion: RNG_VERSION,
    corruptionRound: 0,
    hp: [30000, 30000],
    cards: [],
    barriers: [0, 1].map(() =>
      [0, 1, 2].map(() => ({
        hp: 9000,
        maxHp: 9000,
        state: 'intact',
        graceExpiresAtMs: null,
        graceUsesConsumed: 0,
        graceProviderRef: null,
        graceDurationMs: 0,
        zeroCause: null,
        zeroSource: null,
      })),
    ),
    dots: [0, 1].map(() => [0, 1, 2].map(() => ({ burn: [], corrosion: [] }))),
    queue: [],
    roots: {},
    events: [],
    result: null,
    error: null,
  };
  for (const instance of clean.instances) {
    const draft = clean.blueprints.find(
      (b) =>
        b.blueprintId === instance.blueprintId &&
        b.revision === instance.revision,
    )!.draft;
    s.cards.push({
      instance,
      progress: 0,
      statuses: [],
      abilities: Object.fromEntries(
        draft.mechanics.abilities.map((a) => [
          a.id,
          { count: 0, occurrences: 0, nextAt: 0 },
        ]),
      ),
      watched: {},
    });
  }
  for (const c of s.cards) {
    const m = definition(s, c);
    for (const a of m.abilities)
      if (a.when.subjects?.sampling === 'battle_start')
        c.watched[a.id] = select(
          s,
          c,
          a.when.subjects,
          null,
          `start:${c.instance.instanceId}/${a.id}`,
        );
    for (const special of m.specialRules)
      for (const ref of select(
        s,
        c,
        special.target,
        null,
        `start:${c.instance.instanceId}/${special.id}`,
      )) {
        const b = s.barriers[ref.side][ref.lane!],
          provider = `${c.instance.instanceId}/${special.id}`;
        if (
          special.params.durationMs > b.graceDurationMs ||
          (special.params.durationMs === b.graceDurationMs &&
            provider < (b.graceProviderRef ?? '~'))
        ) {
          b.graceDurationMs = special.params.durationMs;
          b.graceProviderRef = provider;
        }
      }
  }
  event(s, 'battle_started', null, [], {});
  for (const c of s.cards)
    for (const a of definition(s, c).abilities)
      if (a.when.event === 'time_reached' && a.when.filters.atMs === 0)
        event(s, 'time_reached', null, [], {
          ownerAbility: `${c.instance.instanceId}/${a.id}`,
        });
  settle(s, 0);
  verdict(s);
  return s;
}
/** Atomic public operation: on failure, the caller's state is untouched. */
export function advanceBattle(state: BattleState, toMs: number): BattleState {
  if (
    !Number.isInteger(toMs) ||
    toMs % 10 ||
    toMs < state.now ||
    toMs > PROFILE.maxSimulationMs
  )
    throw Error('INVALID_ADVANCE_TIME');
  const s = copy(state);
  while (s.now < toMs && !s.result) step(s);
  return s;
}
export const runBattle = (state: BattleState) =>
  advanceBattle(state, PROFILE.maxSimulationMs);
export const saveBattle = (state: BattleState) => canonical(state);
export async function loadBattle(raw: string): Promise<BattleState> {
  if (raw.length > 20000000) throw Error('SNAPSHOT_TOO_LARGE');
  const s = JSON.parse(raw) as BattleState;
  if (
    s.format !== 'f9-framework-snapshot/1' ||
    s.profileId !== PROFILE.id ||
    s.rngVersion !== RNG_VERSION
  )
    throw Error('UNKNOWN_SNAPSHOT_VERSION');
  // Recompute from the embedded input to authenticate *all* dynamic fields against the deterministic contract.
  const initial = await createBattle(s.input);
  if (initial.inputHash !== s.inputHash) throw Error('SNAPSHOT_INPUT_MISMATCH');
  const expected = advanceBattle(initial, s.now);
  if (canonical(expected) !== canonical(s))
    throw Error('SNAPSHOT_STATE_MISMATCH');
  return copy(s);
}
/** Presentation-only interpolation: does not dispatch abilities or modify simulation state. */
export function cooldownView(
  state: BattleState,
  uid: string,
  elapsedMs: number,
): number {
  const c = state.cards.find((c) => c.instance.instanceId === uid);
  if (!c) return 0;
  const cd = definition(state, c).cooldownMs;
  if (cd === null) return 1;
  const haste = Math.max(
      0,
      ...c.statuses.filter((x) => x.kind === 'haste').map((x) => x.amount),
    ),
    slow = Math.max(
      0,
      ...c.statuses.filter((x) => x.kind === 'slow').map((x) => x.amount),
    );
  const rate =
    frozen(state, c) || state.result
      ? 0
      : Math.min(25000, Math.max(0, 10000 + haste - slow));
  return Math.min(
    1,
    (c.progress + Math.max(0, Math.min(PROFILE.stepMs, elapsedMs)) * rate) /
      (cd * 10000),
  );
}
