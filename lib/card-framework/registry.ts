import type { EffectKind, Entity } from './types.ts';

export const SCHEMA_VERSION = 'f9-generated-card/0.2-draft';
export const MECHANISM_VERSION = 'f9-card-lexicon/0.2-draft';
// Separate from arena version 1, including the six training cards.
export const PROFILE = Object.freeze({
  id: 'generated-core-v0.2',
  revision: 'implementation-1',
  stepMs: 10,
  maxSimulationMs: 300000,
  maxAttack: 100000,
  maxDepth: 8,
  maxCommits: 64,
  burnCap: 24,
  corrosionCap: 12,
  corruptionStartMs: 90000,
  corruptionFirstMs: 91000,
  corruptionPeriodMs: 1000,
  initialHp: 300,
  initialBarrier: 90,
});
export const ENGINE_VERSION = 'f9-structured-runtime/1';
export const VALIDATOR_VERSION = 'f9-structured-validator/1';
export const HASH_VERSION = 'nfc-sorted-json-sha256/1';
export const RNG_VERSION = 'fnv1a-mulberry32-rejection/1';
export const CONSTRAINTS_ID = 'generated-review-v0.2';
export const EFFECTS: Record<
  EffectKind,
  { targets: Entity[]; numeric: boolean }
> = {
  physical_damage: { targets: ['lane', 'barrier', 'core'], numeric: true },
  apply_burn: { targets: ['lane'], numeric: true },
  apply_corrosion: { targets: ['lane'], numeric: true },
  repair_barrier: { targets: ['barrier'], numeric: true },
  heal_core: { targets: ['core'], numeric: true },
  haste: { targets: ['card'], numeric: false },
  slow: { targets: ['card'], numeric: false },
  advance_cooldown: { targets: ['card'], numeric: false },
  trigger_chain: { targets: ['card'], numeric: false },
  freeze: { targets: ['card'], numeric: false },
  modify_attack: { targets: ['card'], numeric: false },
};
export const EVENTS = [
  'battle_started',
  'time_reached',
  'interval_elapsed',
  'cooldown_ready',
  'card_activated',
  'chain_received',
  'cooldown_advanced',
  'damage_dealt',
  'damage_received',
  'barrier_broken',
  'healing_done',
  'healing_received',
  'repair_done',
  'barrier_repaired',
  'barrier_zero',
  'barrier_grace_started',
  'barrier_grace_ended',
  'status_applied',
  'status_expired',
  'attack_changed',
  'corruption_started',
  'corruption_pulse',
] as const;
export const SUPPORT = {
  supportedEffects: Object.keys(EFFECTS),
  supportedEvents: [...EVENTS],
  supportedSpecialModules: ['barrier_break_grace/1-draft'],
  rejectedUntilImplemented: [
    'stat_crossed',
    'status_removed',
    'battle_ended effects',
    'ammo',
    'storage',
    'copy',
    'transform',
    'legacy card adapter',
    'amplifier modules',
  ],
  releaseBlockers: ['No calibrated budget policy', 'No balance certification'],
};
