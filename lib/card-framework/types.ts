/** Approved draft-0.2 contract. All executable additions require a new profile. */
export type Entity = 'card' | 'barrier' | 'core' | 'lane';
export type Side = 0 | 1;
export type Ref = { entity: Entity; side: Side; lane?: number; uid?: string };
export type Selector = {
  entity: Entity;
  side: 'ally' | 'enemy' | 'both';
  scope: {
    kind:
      | 'self'
      | 'same_lane'
      | 'adjacent_lanes'
      | 'fixed_lanes'
      | 'adjacent_left'
      | 'adjacent_right'
      | 'adjacent_both'
      | 'opposing_overlap'
      | 'all'
      | 'event_source'
      | 'event_target';
    lanes?: ('left' | 'center' | 'right')[];
  };
  excludeSelf: boolean;
  filters: {
    sizes?: number[];
    hasCooldown?: boolean;
    barrierStates?: BarrierState[];
    statusKinds?: string[];
  };
  selection: {
    mode: 'all' | 'first' | 'random' | 'highest' | 'lowest';
    count?: number;
    metric?: 'attack' | 'cooldownRemainingMs' | 'healthRatio';
  };
  sampling: 'at_submit' | 'battle_start';
};
export type Magnitude =
  | { kind: 'fixed'; value: number }
  | { kind: 'attack_ratio'; ratioBps: number; cap: number | null }
  | {
      kind: 'event_ratio';
      field: 'barrierLoss' | 'coreLoss' | 'totalLoss' | 'effectiveAmount';
      ratioBps: number;
      cap: number | null;
    };
export type EffectKind =
  | 'physical_damage'
  | 'apply_burn'
  | 'apply_corrosion'
  | 'repair_barrier'
  | 'heal_core'
  | 'haste'
  | 'slow'
  | 'advance_cooldown'
  | 'trigger_chain'
  | 'freeze'
  | 'modify_attack';
export type Effect = {
  id: string;
  kind: EffectKind;
  target: Selector;
  distribution: 'per_target' | 'split_total';
  magnitude?: Magnitude;
  params?: {
    rateBps?: number;
    durationMs?: number;
    amountMs?: number;
    mode?: 'flat' | 'percent';
    delta?: number;
  };
};
export type Guard =
  | {
      kind: 'barrier_state';
      side: Selector['side'];
      scope: Selector['scope'];
      states: BarrierState[];
    }
  | {
      kind: 'stat_compare';
      target: Selector;
      stat:
        | 'attack'
        | 'barrierHealth'
        | 'barrierRatio'
        | 'coreHealth'
        | 'coreRatio'
        | 'cooldownRemainingMs';
      op: 'lt' | 'lte' | 'eq' | 'gte' | 'gt';
      value: number;
    };
export type Ability = {
  id: string;
  when: {
    event: string;
    subjects: Selector | null;
    filters: {
      atMs?: number;
      firstAtMs?: number;
      periodMs?: number;
      activationKinds?: string[];
      damageKinds?: string[];
      statusKinds?: string[];
    };
    guards: Guard[];
    occurrence: { everyNth: number };
  };
  delivery: { kind: 'instant' | 'projectile'; travelMs?: number };
  effects: Effect[];
  limits: {
    internalCooldownMs: number;
    maxActivationsPerBattle: number;
  } | null;
};
export type Special = {
  id: string;
  specialId: 'barrier_break_grace';
  version: '1-draft';
  target: Selector;
  params: { durationMs: number; usesPerBarrier: 1 };
};
export type Context = {
  ruleProfileId: string;
  constraintsProfileId: string;
  allowedSizeCells: number[];
  rarityTier: number;
  level: number;
  quality: number;
  budgetPolicyRef: string | null;
};
export type CardDraft = {
  schemaVersion: string;
  mechanismVersion: string;
  context: Context;
  presentation: { name: string; flavorText: string; rulesTextDraft: string };
  mechanics: {
    sizeCells: number;
    rarityTier: number;
    baseAttack: number;
    cooldownMs: number | null;
    chainEntryAbilityId: string | null;
    abilities: Ability[];
    specialRules: Special[];
  };
  designNotes: {
    intent: string;
    tradeoff: string;
    unsupportedIdeas: string[];
    reviewNotes: string[];
  };
};
export type GenerationRequest = {
  requestId: string;
  itemInput: unknown;
  preferences: unknown;
  context: Context & { schemaVersion: string; mechanismVersion: string };
  parentDraftRef?: string;
};
export type ValidationReport = {
  reportId: string;
  draftHash: string;
  validatorVersion: string;
  simulatorVersion: string;
  versions: {
    schema: string;
    mechanism: string;
    ruleProfile: string;
    ruleRevision: string;
    constraints: string;
    budget: null;
  };
  lifecycle: 'rejected' | 'balance_pending';
  checks: {
    id: string;
    status: 'passed' | 'failed' | 'not_run';
    detail: string;
  }[];
  warnings: string[];
  blockingReasons: string[];
  seeds: number[];
  publishable: false;
  generatedAt: string;
};
export type Blueprint = {
  blueprintId: string;
  revision: number;
  parentRevisionRef: string | null;
  mechanicsHash: string;
  contentHash: string;
  hashVersion: string;
  validationReportRefs: string[];
  status: 'balance_pending';
  draft: CardDraft;
  rulesText: string;
};
export type Instance = {
  instanceId: string;
  blueprintId: string;
  revision: number;
  at: number;
  side: Side;
  level: 0;
  quality: 0;
};
export type BattleInput = {
  profileId: string;
  seed: number;
  blueprints: Blueprint[];
  instances: Instance[];
};
export type BarrierState = 'intact' | 'pending_break' | 'broken';
export type Cause = {
  rootIds: string[];
  visited: string[];
  depth: number;
  parentEventId: string | null;
};
export type GameEvent = Cause & {
  eventId: string;
  kind: string;
  atMs: number;
  sourceRef: Ref | null;
  targetRefs: Ref[];
  payload: Record<string, number | string>;
};
export type Status = {
  key: string;
  kind: string;
  amount: number;
  until: number;
  source: Ref;
  cause: Cause;
};
export type CardState = {
  instance: Instance;
  progress: number;
  statuses: Status[];
  abilities: Record<
    string,
    { count: number; occurrences: number; nextAt: number }
  >;
  watched: Record<string, Ref[]>;
};
export type Barrier = {
  hp: number;
  maxHp: number;
  state: BarrierState;
  graceExpiresAtMs: number | null;
  graceUsesConsumed: number;
  graceProviderRef: string | null;
  graceDurationMs: number;
  zeroCause: Cause | null;
  zeroSource: Ref | null;
};
export type Contribution = {
  key: string;
  source: Ref;
  amount: number;
  cause: Cause;
};
export type Submission = {
  id: string;
  effectId: string;
  atMs: number;
  source: Ref;
  abilityId: string;
  kind: EffectKind;
  targets: { ref: Ref; amount: number }[];
  params?: Effect['params'];
  cause: Cause;
};
export type BattleState = {
  format: 'f9-framework-snapshot/1';
  profileId: string;
  input: BattleInput;
  inputHash: string;
  rulesSnapshot: {
    engineVersion: string;
    profile: Record<string, string | number>;
    specialModules: string[];
  };
  now: number;
  serial: number;
  randomCounter: number;
  rngVersion: string;
  corruptionRound: number;
  hp: [number, number];
  cards: CardState[];
  barriers: Barrier[][];
  dots: { burn: Contribution[]; corrosion: Contribution[] }[][];
  queue: Submission[];
  roots: Record<string, { visited: string[]; commits: number }>;
  events: GameEvent[];
  result: null | { winner: number; atMs: number };
  error: string | null;
};
