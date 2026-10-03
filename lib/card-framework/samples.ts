import type { Ability, CardDraft, Effect, Selector } from './types.ts';
import {
  CONSTRAINTS_ID,
  MECHANISM_VERSION,
  PROFILE,
  SCHEMA_VERSION,
} from './registry.ts';

export const target = (
  entity: Selector['entity'],
  side: Selector['side'] = 'ally',
  scope: Selector['scope'] = { kind: entity === 'core' ? 'all' : 'same_lane' },
): Selector => ({
  entity,
  side,
  scope,
  excludeSelf: false,
  filters: {},
  selection: { mode: 'all' },
  sampling: 'at_submit',
});
export const numeric = (
  id: string,
  kind: Effect['kind'],
  selector: Selector,
  ratioBps: number,
): Effect => ({
  id,
  kind,
  target: selector,
  distribution: 'per_target',
  magnitude: { kind: 'attack_ratio', ratioBps, cap: null },
});
export function cardDraft(
  name: string,
  attack: number,
  cooldownMs: number | null,
  effects: Effect[],
): CardDraft {
  return {
    schemaVersion: SCHEMA_VERSION,
    mechanismVersion: MECHANISM_VERSION,
    context: {
      ruleProfileId: PROFILE.id,
      constraintsProfileId: CONSTRAINTS_ID,
      allowedSizeCells: [1, 2, 3],
      rarityTier: 0,
      level: 0,
      quality: 0,
      budgetPolicyRef: null,
    },
    presentation: {
      name,
      flavorText: '留一点温热，等你回来。',
      rulesTextDraft: '',
    },
    mechanics: {
      sizeCells: 1,
      rarityTier: 0,
      baseAttack: attack,
      cooldownMs,
      chainEntryAbilityId: null,
      abilities:
        cooldownMs === null
          ? []
          : [
              {
                id: 'cycle',
                when: {
                  event: 'cooldown_ready',
                  subjects: target('card', 'ally', { kind: 'self' }),
                  filters: {},
                  guards: [],
                  occurrence: { everyNth: 1 },
                },
                delivery: { kind: 'instant' },
                effects,
                limits: null,
              },
            ],
      specialRules: [],
    },
    designNotes: {
      intent: '验证机制组合',
      tradeoff: '数值未经预算校准',
      unsupportedIdeas: [],
      reviewNotes: ['仅限实验，不可发布'],
    },
  };
}
export const WARM_CUP = cardDraft('留温杯', 8, 6000, [
  numeric('heal', 'heal_core', target('core'), 10000),
  numeric(
    'repair',
    'repair_barrier',
    {
      ...target('barrier'),
      filters: { barrierStates: ['intact', 'pending_break'] },
    },
    7500,
  ),
]);
export const SPARK_BOX = cardDraft('火星盒', 40, 6000, [
  numeric('hit', 'physical_damage', target('lane', 'enemy'), 10000),
  numeric('burn', 'apply_burn', target('lane', 'enemy'), 2500),
]);
SPARK_BOX.mechanics.abilities[0].delivery = {
  kind: 'projectile',
  travelMs: 1250,
};
export const COMPANION_BELL = cardDraft('伴行小铃', 0, null, []);
COMPANION_BELL.mechanics.abilities = [
  {
    id: 'encourage',
    when: {
      event: 'card_activated',
      subjects: target('card', 'ally', { kind: 'adjacent_both' }),
      filters: { activationKinds: ['cycle'] },
      guards: [],
      occurrence: { everyNth: 1 },
    },
    delivery: { kind: 'instant' },
    effects: [
      {
        id: 'charge',
        kind: 'advance_cooldown',
        target: {
          ...target('card', 'ally', { kind: 'fixed_lanes', lanes: ['left'] }),
          filters: { hasCooldown: true },
          selection: { mode: 'random', count: 2 },
        },
        distribution: 'per_target',
        params: { amountMs: 500 },
      },
    ],
    limits: { internalCooldownMs: 3000, maxActivationsPerBattle: 30 },
  },
];
export const AFTERGLOW_VEIL = cardDraft('余光护罩', 0, null, []);
AFTERGLOW_VEIL.mechanics.specialRules = [
  {
    id: 'grace',
    specialId: 'barrier_break_grace',
    version: '1-draft',
    target: {
      ...target('barrier'),
      selection: { mode: 'first', count: 1 },
      sampling: 'battle_start',
    },
    params: { durationMs: 5000, usesPerBarrier: 1 },
  },
];
export const SAMPLE_DRAFTS = [
  WARM_CUP,
  SPARK_BOX,
  COMPANION_BELL,
  AFTERGLOW_VEIL,
];
export function response(
  id: string,
  event: string,
  subjects: Selector | null,
  effects: Effect[],
): Ability {
  return {
    id,
    when: {
      event,
      subjects,
      filters: {},
      guards: [],
      occurrence: { everyNth: 1 },
    },
    delivery: { kind: 'instant' },
    effects,
    limits: { internalCooldownMs: 10, maxActivationsPerBattle: 100 },
  };
}
