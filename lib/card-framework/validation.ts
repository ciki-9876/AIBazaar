import type {
  Blueprint,
  CardDraft,
  Context,
  GenerationRequest,
  Selector,
  ValidationReport,
} from './types.ts';
import {
  CONSTRAINTS_ID,
  EFFECTS,
  ENGINE_VERSION,
  EVENTS,
  HASH_VERSION,
  MECHANISM_VERSION,
  PROFILE,
  SCHEMA_VERSION,
  VALIDATOR_VERSION,
} from './registry.ts';
import { canonical, copy, fingerprint } from './canonical.ts';
import { describeCard } from './describe.ts';

type Obj = Record<string, unknown>;
const fail = (p: string, why: string): never => {
  throw Error(`${p}: ${why}`);
};
function object(
  v: unknown,
  required: string[],
  optional: string[],
  p: string,
): Obj {
  if (!v || Array.isArray(v) || typeof v !== 'object')
    return fail(p, '需要对象');
  const o = v as Obj;
  for (const key of required)
    if (!Object.hasOwn(o, key)) fail(p, `缺少 ${key}`);
  for (const key of Object.keys(o))
    if (![...required, ...optional].includes(key)) fail(p, `未知字段 ${key}`);
  return o;
}
function text(v: unknown, p: string, max = 1000): string {
  if (typeof v !== 'string' || v.length > max)
    return fail(p, '字符串无效或过长');
  return v;
}
function id(v: unknown, p: string) {
  const s = text(v, p, 80);
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(s) ||
    ['constructor', 'prototype', '__proto__'].includes(s)
  )
    fail(p, '标识格式无效');
  return s;
}
function number(
  v: unknown,
  min: number,
  max: number,
  p: string,
  integer = false,
): number {
  if (
    typeof v !== 'number' ||
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    (integer && !Number.isInteger(v)) ||
    Math.abs(v * 100 - Math.round(v * 100)) > 1e-6
  )
    return fail(p, '数值超出范围或精度');
  return v;
}
function ms(v: unknown, p: string, min = 10, max = 300000) {
  const n = number(v, min, max, p, true);
  if (n % 10) fail(p, '时间必须是10毫秒整倍数');
  return n;
}
function one(v: unknown, values: readonly unknown[], p: string) {
  if (!values.includes(v)) fail(p, `未支持的取值 ${String(v)}`);
}
function list(v: unknown, p: string, max = 32): unknown[] {
  if (!Array.isArray(v) || v.length > max) return fail(p, '数组无效或过长');
  return v;
}
function arrayOf(v: unknown, values: readonly unknown[], p: string) {
  const a = list(v, p);
  if (!a.length || new Set(a).size !== a.length) fail(p, '数组不能为空或重复');
  a.forEach((x) => one(x, values, p));
}
const states = ['intact', 'pending_break', 'broken'];
const statusKinds = [
  'burn',
  'corrosion',
  'haste',
  'slow',
  'freeze',
  'modify_attack',
];
const lanes = ['left', 'center', 'right'];
const scopeKinds = [
  'self',
  'same_lane',
  'adjacent_lanes',
  'fixed_lanes',
  'adjacent_left',
  'adjacent_right',
  'adjacent_both',
  'opposing_overlap',
  'all',
  'event_source',
  'event_target',
];
function scope(v: unknown, p: string) {
  const o = object(v, ['kind'], ['lanes'], p);
  one(o.kind, scopeKinds, p);
  if (o.kind === 'fixed_lanes') arrayOf(o.lanes, lanes, p);
  else if ('lanes' in o) fail(p, '此范围不能指定lanes');
  return o;
}
export function validateSelector(
  v: unknown,
  p = 'selector',
  purpose: 'effect' | 'listener' | 'special' | 'guard' = 'effect',
): Selector {
  const s = object(
    v,
    [
      'entity',
      'side',
      'scope',
      'excludeSelf',
      'filters',
      'selection',
      'sampling',
    ],
    [],
    p,
  );
  one(s.entity, ['card', 'barrier', 'core', 'lane'], p);
  one(s.side, ['ally', 'enemy', 'both'], p);
  one(s.excludeSelf, [true, false], p);
  one(s.sampling, ['at_submit', 'battle_start'], p);
  const sc = scope(s.scope, `${p}.scope`);
  if (s.entity !== 'card' && s.excludeSelf) fail(p, '非卡牌不能excludeSelf');
  if (sc.kind === 'self' && (s.entity !== 'card' || s.side !== 'ally'))
    fail(p, 'self必须是己方卡牌');
  if (
    s.entity === 'core' &&
    !['all', 'event_source', 'event_target'].includes(String(sc.kind))
  )
    fail(p, '核心不能按路线重复选择');
  if (
    [
      'adjacent_left',
      'adjacent_right',
      'adjacent_both',
      'opposing_overlap',
    ].includes(String(sc.kind)) &&
    s.entity !== 'card'
  )
    fail(p, '相邻格范围只支持卡牌');
  if (sc.kind === 'opposing_overlap' && s.side !== 'enemy')
    fail(p, '对位范围只支持敌方');
  const filters = object(
    s.filters,
    [],
    s.entity === 'card'
      ? ['sizes', 'hasCooldown', 'statusKinds']
      : s.entity === 'core'
        ? []
        : ['barrierStates', 'statusKinds'],
    `${p}.filters`,
  );
  if ('sizes' in filters) arrayOf(filters.sizes, [1, 2, 3], p);
  if ('hasCooldown' in filters) one(filters.hasCooldown, [true, false], p);
  if ('barrierStates' in filters) arrayOf(filters.barrierStates, states, p);
  if ('statusKinds' in filters)
    arrayOf(
      filters.statusKinds,
      s.entity === 'card' ? statusKinds.slice(2) : statusKinds.slice(0, 2),
      p,
    );
  const sel = object(
    s.selection,
    ['mode'],
    ['count', 'metric'],
    `${p}.selection`,
  );
  one(sel.mode, ['all', 'first', 'random', 'highest', 'lowest'], p);
  if (sel.mode === 'all') {
    if ('count' in sel || 'metric' in sel) fail(p, 'all不接受count/metric');
  } else number(sel.count, 1, 18, p, true);
  if (['highest', 'lowest'].includes(String(sel.mode))) {
    one(
      sel.metric,
      s.entity === 'card' ? ['attack', 'cooldownRemainingMs'] : ['healthRatio'],
      p,
    );
  } else if ('metric' in sel) fail(p, '只有极值选择允许metric');
  if (
    (purpose === 'effect' || purpose === 'guard') &&
    s.sampling !== 'at_submit'
  )
    fail(p, '效果/条件必须在提交时选目标');
  if (purpose === 'special' && s.sampling !== 'battle_start')
    fail(p, '特殊模块必须战初安装');
  if (
    purpose === 'listener' &&
    sel.mode === 'random' &&
    s.sampling !== 'battle_start'
  )
    fail(p, '随机监听须战初固定');
  if (
    s.sampling === 'battle_start' &&
    ['event_source', 'event_target'].includes(String(sc.kind))
  )
    fail(p, '战初抽样没有事件目标');
  return copy(v) as Selector;
}
function validateContext(raw: unknown): Context {
  const c = object(
    raw,
    [
      'ruleProfileId',
      'constraintsProfileId',
      'allowedSizeCells',
      'rarityTier',
      'level',
      'quality',
      'budgetPolicyRef',
    ],
    [],
    'context',
  );
  one(c.ruleProfileId, [PROFILE.id], 'context.ruleProfileId');
  one(c.constraintsProfileId, [CONSTRAINTS_ID], 'context.constraintsProfileId');
  arrayOf(c.allowedSizeCells, [1, 2, 3], 'allowedSizeCells');
  number(c.rarityTier, 0, 4, 'rarity', true);
  one(c.level, [0], 'level');
  one(c.quality, [0], 'quality');
  // No policy has been calibrated; a caller-supplied name cannot grant publishing authority.
  if (c.budgetPolicyRef !== null)
    fail('budgetPolicyRef', '尚未登记任何已校准预算策略');
  return c as Context;
}
function guards(raw: unknown, p: string) {
  for (const [i, g] of list(raw, p, 8).entries()) {
    const v = g as Obj,
      at = `${p}[${i}]`;
    if (v?.kind === 'barrier_state') {
      const o = object(v, ['kind', 'side', 'scope', 'states'], [], at);
      one(o.side, ['ally', 'enemy', 'both'], at);
      scope(o.scope, at);
      arrayOf(o.states, states, at);
      validateSelector(
        {
          entity: 'barrier',
          side: o.side,
          scope: o.scope,
          excludeSelf: false,
          filters: {},
          selection: { mode: 'all' },
          sampling: 'at_submit',
        },
        at,
        'guard',
      );
    } else if (v?.kind === 'stat_compare') {
      const o = object(v, ['kind', 'target', 'stat', 'op', 'value'], [], at);
      const target = validateSelector(o.target, at, 'guard');
      one(
        o.stat,
        target.entity === 'card'
          ? ['attack', 'cooldownRemainingMs']
          : target.entity === 'core'
            ? ['coreHealth', 'coreRatio']
            : ['barrierHealth', 'barrierRatio'],
        at,
      );
      one(o.op, ['lt', 'lte', 'eq', 'gte', 'gt'], at);
      number(o.value, 0, 100000, at);
    } else fail(at, '未知条件谓词');
  }
}
export function validateDraft(
  raw: unknown,
  request?: GenerationRequest,
): CardDraft {
  canonical(raw);
  const d = object(
    raw,
    [
      'schemaVersion',
      'mechanismVersion',
      'context',
      'presentation',
      'mechanics',
      'designNotes',
    ],
    [],
    'draft',
  );
  one(d.schemaVersion, [SCHEMA_VERSION], 'schemaVersion');
  one(d.mechanismVersion, [MECHANISM_VERSION], 'mechanismVersion');
  const ctx = validateContext(d.context);
  if (request) {
    const { schemaVersion, mechanismVersion, ...rest } = request.context;
    if (
      schemaVersion !== d.schemaVersion ||
      mechanismVersion !== d.mechanismVersion ||
      canonical(rest) !== canonical(ctx)
    )
      fail('request', '草案提升或改变了请求边界');
  }
  const p = object(
    d.presentation,
    ['name', 'flavorText', 'rulesTextDraft'],
    [],
    'presentation',
  );
  if (!text(p.name, 'name', 80).trim()) fail('name', '不能为空');
  text(p.flavorText, 'flavorText');
  text(p.rulesTextDraft, 'rulesTextDraft', 4000);
  const notes = object(
    d.designNotes,
    ['intent', 'tradeoff', 'unsupportedIdeas', 'reviewNotes'],
    [],
    'designNotes',
  );
  text(notes.intent, 'intent');
  text(notes.tradeoff, 'tradeoff');
  for (const key of ['unsupportedIdeas', 'reviewNotes'])
    list(notes[key], key).forEach((v) => text(v, key));
  const m = object(
    d.mechanics,
    [
      'sizeCells',
      'rarityTier',
      'baseAttack',
      'cooldownMs',
      'chainEntryAbilityId',
      'abilities',
      'specialRules',
    ],
    [],
    'mechanics',
  );
  one(m.sizeCells, ctx.allowedSizeCells, 'sizeCells');
  one(m.rarityTier, [ctx.rarityTier], 'rarityTier');
  number(m.baseAttack, 0, PROFILE.maxAttack, 'baseAttack');
  if (m.cooldownMs !== null) ms(m.cooldownMs, 'cooldownMs');
  const abilities = list(m.abilities, 'abilities', 4),
    ids = new Set<string>();
  let effectCount = 0,
    cycles = 0;
  for (const [i, rawAbility] of abilities.entries()) {
    const path = `abilities[${i}]`,
      a = object(
        rawAbility,
        ['id', 'when', 'delivery', 'effects', 'limits'],
        [],
        path,
      ),
      aid = id(a.id, path);
    if (ids.has(aid)) fail(path, '能力ID重复');
    ids.add(aid);
    const w = object(
      a.when,
      ['event', 'subjects', 'filters', 'guards', 'occurrence'],
      [],
      path,
    );
    one(w.event, EVENTS, path);
    const event = String(w.event);
    if (event === 'cooldown_ready') cycles++;
    const global = [
      'battle_started',
      'time_reached',
      'interval_elapsed',
      'corruption_started',
      'corruption_pulse',
    ].includes(event);
    if (global) {
      if (w.subjects !== null) fail(path, '全局事件subjects必须为null');
    } else {
      const subjects = validateSelector(w.subjects, path, 'listener');
      const subjectTypes = ['damage_received'].includes(event)
        ? ['barrier', 'core']
        : [
              'barrier_broken',
              'barrier_zero',
              'barrier_repaired',
              'barrier_grace_started',
              'barrier_grace_ended',
            ].includes(event)
          ? ['barrier']
          : event === 'healing_received'
            ? ['core']
            : ['status_applied', 'status_expired'].includes(event)
              ? ['card', 'lane']
              : ['card'];
      one(subjects.entity, subjectTypes, `${path}.subjects.entity`);
      if (
        event === 'cooldown_ready' &&
        (subjects.entity !== 'card' || subjects.scope.kind !== 'self')
      )
        fail(path, '周期入口必须是自身');
    }
    const allowed =
      event === 'time_reached'
        ? ['atMs']
        : event === 'interval_elapsed'
          ? ['firstAtMs', 'periodMs']
          : event === 'card_activated'
            ? ['activationKinds']
            : ['damage_dealt', 'damage_received'].includes(event)
              ? ['damageKinds']
              : ['status_applied', 'status_expired'].includes(event)
                ? ['statusKinds']
                : [];
    const f = object(w.filters, [], allowed, `${path}.filters`);
    if (event === 'time_reached') ms(f.atMs, path, 0);
    if (event === 'interval_elapsed') {
      ms(f.firstAtMs, path);
      ms(f.periodMs, path);
    }
    if ('activationKinds' in f)
      arrayOf(f.activationKinds, ['cycle', 'reactive', 'chain'], path);
    if ('damageKinds' in f)
      arrayOf(
        f.damageKinds,
        ['physical', 'burn', 'corrosion', 'corruption'],
        path,
      );
    if ('statusKinds' in f) arrayOf(f.statusKinds, statusKinds, path);
    guards(w.guards, path);
    const occurrence = object(w.occurrence, ['everyNth'], [], path);
    number(occurrence.everyNth, 1, 1000, path, true);
    const delivery = object(a.delivery, ['kind'], ['travelMs'], path);
    one(delivery.kind, ['instant', 'projectile'], path);
    if (delivery.kind === 'projectile') ms(delivery.travelMs, path, 10, 10000);
    else if ('travelMs' in delivery) fail(path, '即时效果不能带travelMs');
    if (a.limits === null) {
      if (event !== 'cooldown_ready' || m.chainEntryAbilityId === aid)
        fail(path, '响应/连锁能力必须限制间隔与次数');
    } else {
      const l = object(
        a.limits,
        ['internalCooldownMs', 'maxActivationsPerBattle'],
        [],
        path,
      );
      ms(l.internalCooldownMs, path);
      number(l.maxActivationsPerBattle, 1, 1000, path, true);
    }
    const effects = list(a.effects, path, 4),
      eids = new Set<string>();
    if (!effects.length) fail(path, '能力必须包含效果');
    effectCount += effects.length;
    for (const [j, rawEffect] of effects.entries()) {
      const ep = `${path}.effects[${j}]`,
        e = object(
          rawEffect,
          ['id', 'kind', 'target', 'distribution'],
          ['magnitude', 'params'],
          ep,
        ),
        eid = id(e.id, ep);
      if (eids.has(eid)) fail(ep, '效果ID重复');
      eids.add(eid);
      one(e.kind, Object.keys(EFFECTS), ep);
      const rule = EFFECTS[e.kind as keyof typeof EFFECTS],
        target = validateSelector(e.target, ep);
      one(target.entity, rule.targets, ep);
      one(
        e.distribution,
        rule.numeric ? ['per_target', 'split_total'] : ['per_target'],
        ep,
      );
      if (rule.numeric) {
        if ('params' in e) fail(ep, '数值效果不能包含params');
        const v = object(
          e.magnitude,
          ['kind'],
          ['value', 'ratioBps', 'cap', 'field'],
          ep,
        );
        one(v.kind, ['fixed', 'attack_ratio', 'event_ratio'], ep);
        if (v.kind === 'fixed') {
          object(v, ['kind', 'value'], [], ep);
          number(v.value, 0, 100000, ep);
        } else {
          object(
            v,
            v.kind === 'event_ratio'
              ? ['kind', 'ratioBps', 'cap', 'field']
              : ['kind', 'ratioBps', 'cap'],
            [],
            ep,
          );
          number(v.ratioBps, 0, 100000, ep, true);
          if (v.cap !== null) number(v.cap, 0, 100000, ep);
          if (v.kind === 'event_ratio') {
            if (m.chainEntryAbilityId === aid)
              fail(ep, '连锁入口不能依赖事件数值');
            one(
              v.field,
              ['damage_received', 'damage_dealt'].includes(event)
                ? ['barrierLoss', 'coreLoss', 'totalLoss']
                : [
                      'healing_done',
                      'healing_received',
                      'repair_done',
                      'barrier_repaired',
                    ].includes(event)
                  ? ['effectiveAmount']
                  : [],
              ep,
            );
          }
        }
      } else {
        if ('magnitude' in e) fail(ep, '控制效果不能包含magnitude');
        const kind = String(e.kind),
          keys =
            kind === 'trigger_chain'
              ? []
              : kind === 'advance_cooldown'
                ? ['amountMs']
                : kind === 'freeze'
                  ? ['durationMs']
                  : kind === 'modify_attack'
                    ? ['mode', 'delta', 'durationMs']
                    : ['rateBps', 'durationMs'];
        const v = object(e.params, keys, [], ep);
        if ('amountMs' in v) ms(v.amountMs, ep);
        if ('durationMs' in v)
          ms(
            v.durationMs,
            ep,
            10,
            kind === 'freeze' ? 2000 : kind === 'modify_attack' ? 10000 : 4000,
          );
        if ('rateBps' in v) number(v.rateBps, 0, 25000, ep, true);
        if (kind === 'modify_attack') {
          one(v.mode, ['flat', 'percent'], ep);
          number(v.delta, -100000, 100000, ep, v.mode === 'percent');
        }
      }
    }
  }
  if (
    effectCount > 8 ||
    cycles > 1 ||
    (m.cooldownMs === null ? cycles !== 0 : cycles !== 1)
  )
    fail('mechanics', '公共冷却与周期入口不匹配或效果过多');
  if (
    m.chainEntryAbilityId !== null &&
    !ids.has(id(m.chainEntryAbilityId, 'chainEntryAbilityId'))
  )
    fail('chainEntryAbilityId', '能力引用不存在');
  for (const rawSpecial of list(m.specialRules, 'specialRules', 1)) {
    const s = object(
      rawSpecial,
      ['id', 'specialId', 'version', 'target', 'params'],
      [],
      'special',
    );
    id(s.id, 'special.id');
    one(s.specialId, ['barrier_break_grace'], 'specialId');
    one(s.version, ['1-draft'], 'special.version');
    const target = validateSelector(s.target, 'special.target', 'special');
    if (
      target.entity !== 'barrier' ||
      target.selection.mode === 'all' ||
      target.selection.count !== 1
    )
      fail('special', '每个提供者只能安装一面护幕');
    const params = object(
      s.params,
      ['durationMs', 'usesPerBarrier'],
      [],
      'special.params',
    );
    ms(params.durationMs, 'special.duration', 10, 10000);
    one(params.usesPerBarrier, [1], 'special.uses');
  }
  return copy(d) as CardDraft;
}
export async function compileDraft(
  raw: unknown,
  options: {
    blueprintId: string;
    revision?: number;
    parentRevisionRef?: string | null;
    request?: GenerationRequest;
    generatedAt?: string;
  },
): Promise<{ blueprint: Blueprint | null; report: ValidationReport }> {
  let draft: CardDraft | null = null;
  const errors: string[] = [];
  try {
    id(options.blueprintId, 'blueprintId');
    number(options.revision ?? 1, 1, 100000, 'revision', true);
    draft = validateDraft(raw, options.request);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  const hash = await fingerprint(raw).catch(() => 'invalid-json');
  const report: ValidationReport = {
    reportId: `validation:${hash.split(':').at(-1)}`,
    draftHash: hash,
    validatorVersion: VALIDATOR_VERSION,
    simulatorVersion: ENGINE_VERSION,
    versions: {
      schema: SCHEMA_VERSION,
      mechanism: MECHANISM_VERSION,
      ruleProfile: PROFILE.id,
      ruleRevision: PROFILE.revision,
      constraints: CONSTRAINTS_ID,
      budget: null,
    },
    lifecycle: errors.length ? 'rejected' : 'balance_pending',
    checks: [
      {
        id: 'structure-and-semantics',
        status: errors.length ? 'failed' : 'passed',
        detail: errors.join('; ') || '所有可执行字段均通过登记目录与语义校验',
      },
      {
        id: 'description',
        status: draft ? 'passed' : 'not_run',
        detail: '规则文字由已验证定义生成；展示草案不参与执行',
      },
      { id: 'budget', status: 'not_run', detail: '尚无校准预算策略' },
      {
        id: 'scenario-simulation',
        status: 'not_run',
        detail: '编译本身不冒充试打',
      },
      { id: 'replay', status: 'not_run', detail: '需使用具体对局验证' },
    ],
    warnings: ['实验数值未获平衡认证'],
    blockingReasons: [...errors, 'BUDGET_POLICY_UNCALIBRATED'],
    seeds: [],
    publishable: false,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
  if (!draft) return { blueprint: null, report };
  const blueprint: Blueprint = {
    blueprintId: options.blueprintId,
    revision: options.revision ?? 1,
    parentRevisionRef: options.parentRevisionRef ?? null,
    mechanicsHash: await fingerprint(draft.mechanics),
    contentHash: hash,
    hashVersion: HASH_VERSION,
    validationReportRefs: [report.reportId],
    status: 'balance_pending',
    draft,
    rulesText: describeCard(draft),
  };
  return { blueprint, report };
}
export function publishBlueprint(_blueprint: Blueprint): never {
  throw Error('BUDGET_POLICY_UNCALIBRATED: 当前仅允许沙盒试打，不可发布');
}
