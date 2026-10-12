import { randomStream } from '../../packages/core/random.ts';
import { scorePoker, type PlayingCard, type Suit } from './throw-poker.ts';
import {
  EMPTY_HAND_BONUS,
  JUNO_SHRED,
  PERFORMERS,
  STOKE_AI_BURN,
  STOKE_MIN_BURN,
  STOKE_SHARE,
  ALIGHT_DRAW,
  SWITCH_AI_RANK,
  QUICK_DRAW_COUNT,
  ROSIE_BURN_RESIST,
  MOLLY_HEART_HEAL,
  MOLLY_REMEDY,
  isPerformer,
  type PerformerId,
} from './throw-performer.ts';
import { itemValue, validItemUpgrades, type ItemUpgrades } from './throw-upgrades.ts';
import {
  cardKey,
  enchantEffects,
  suitWeight,
  validDeckBook,
  type DeckBook,
} from './throw-enchant.ts';
import {
  ITEMS,
  RELICS,
  PRESETS,
  BAG_CELLS,
  itemDefinition,
  packThrowItems,
  validThrowLayout,
  adjacentThrowItems,
  type ItemId,
  type RelicId,
  type Style,
  type ItemPlacement,
  type Family,
} from './throw-loadout.ts';
export { ITEMS, RELICS, PRESETS, BAG_CELLS };
export type { ItemId, RelicId, Style, ItemPlacement };
export const TICK_MS = 50,
  HAND_LIMIT = 10,
  /** Default presence (气场) cap: every fighter's unless the duel supplies its own (v11). */
  MAX_HP = 320,
  /** Largest presence cap a duel accepts (v11). */
  PRESENCE_LIMIT = 2000,
  MAX_POWER = 30;
/**
 * v6 retains the four-condition wheel introduced in v4:
 * healing cleanses poison, poison ignores shields, shields smother burn, and
 * burn halves healing. Direct-damage builds add shred (single cards) and
 * wounds (straights and better). Three-card runs/flushes have proportional
 * rewards, sorting is a shared action and draws accelerate by battle phase.
 * Deck streams are unchanged from v3.
 */
export const RULES_VERSION = 'throw-duel-v16';
/** A substitution is an announced, protected pause before a fresh stage clock. */
export const INTERMISSION_MS = 5000;
/** Opening recovery per card; later phases use the same speed ratio as dealing. */
export const THROW_LOCK_MS_PER_CARD = 1000;
/**
 * v12: Eli's own opening sleight is quick draw (up to five cards, 15 s),
 * replacing false shuffle. All other performers retain their identities.
 * Lifetime statistics record actual rule outcomes without reading the visual
 * event ring; the qualification coach can explicitly select a scripted deck.
 * Ordinary deck streams and every non-Eli combat formula are unchanged.
 */
/**
 * v11 presence (气场, ADR-0059): each fighter has its own cap (default 320),
 * supplied by the adventure from stage experience, fame, lodging and mood.
 * Every "half life" rule reads the fighter's own cap, the curtain scales with
 * it (round(ramp × cap / 320)), and shields are no longer capped. At the
 * default cap every result matches v10 except duels whose shield passed 160.
 */
/**
 * v7 relic pass (ADR-0053), on top of the v6 tempo: relics change a rule
 * rather than add a number, and none is generically best. Relay stops drawing
 * and instead sharpens consecutive single cards; echo gathers only below half
 * life; the heart blanket patches single hits in proportion to the healing
 * kit and keeps overflowing healing as shield; the coal ember also halves an
 * opponent's burn cleansing; the toxin spoon slows poison's ebb; the brass
 * mirror reflects pairs and batches harder; the double letterbox pays off a
 * full hand. Deck streams and phase draw intervals are unchanged.
 */
/** Relay: from the second consecutive single card, each hits RELAY_STEP harder (capped); a batch resets it. */
export const RELAY_STEP = 1;
export const RELAY_CAP = 1;
/** Echo only gathers while you are below half life: a comeback, not a tax. */
export const ECHO_GAIN = 3;
export const ECHO_CAP = 9;
/** Heart blanket: single-card hits patch this much life, plus one per healing item in the trunk. */
export const HEART_PATCH = 2;
export const HEART_PER_HEAL_ITEM = 1;
export const heartPatch = (items: readonly ItemId[]) =>
  HEART_PATCH + HEART_PER_HEAL_ITEM * items.filter((id) => itemDefinition(id).family === 'heal').length;
/** Heart blanket: half of any healing past full life is kept as shield. */
export const HEART_OVERFLOW = 0.5;
/** Coal ember: +2 to every burn you apply, and opponents cleanse only half of it. */
export const EMBER_BONUS = 2;
export const EMBER_CLEANSE_SHARE = 0.5;
export const FESTER_HAND = 5;
/** Poison ebbs one stack per this many seconds; the toxin spoon slows it. */
export const POISON_EBB_S = 2;
export const TOXIN_EBB_S = 3;
/** Toxin spoon: extra poison on every throw that poisons (kept small; the slow ebb is the rule). */
export const TOXIN_BONUS = 1;
/** Brass mirror: share of blocked damage reflected for two cards, and for three or more. Single cards slip past (shred). */
export const BASTION_REFLECT = 0.4;
export const BASTION_BATCH_REFLECT = 0.7;
export const CAPACITY_FULL_HAND = 9;
export const CAPACITY_BONUS = 8;
/**
 * v5 curtain call (落幕): from one minute in, the theatre starts closing on
 * both magicians. Since v14, every half-second each side takes damage that rises by
 * CURTAIN_RAMP per second (1, 1, 2, 2, 3, 3 …). It is ordinary damage, so shields
 * absorb it and healing outlasts it: surviving is itself a way to win.
 */
export const CURTAIN_MS = 60000;
/** After thirty seconds, faster replenishment raises the pressure on both seats. */
export const HEATED_MS = 30000;
/** Sorting is a basic action shared by every fighter, paid only when order changes. */
export const REORDER_MS = 20000;
export const CURTAIN_RAMP = 1;
/** v14: the same time-based curtain amount settles twice per second. */
export const CURTAIN_TICK_MS = 500;
/** Curtain damage dealt at the given tick (0 before the curtain falls). */
export const curtainDamage = (tick: number) =>
  tick < ticks(CURTAIN_MS) ? 0 : (Math.floor((tick - ticks(CURTAIN_MS)) / ticks(1000)) + 1) * CURTAIN_RAMP;
/** v11: the curtain scales with the fighter's presence cap, so it threatens every tier alike. */
export const curtainFor = (maxHp: number, base: number) => (maxHp === MAX_HP ? base : Math.round((base * maxHp) / MAX_HP));
export const SMOTHER_EXTRA_DECAY = 2;
export const WOUND_MS = 5000;
export const SHRED = 1.1;
export const FIREPROOF_MS = 6000;
export const FAN_PARRY_HAND = 7;
export const handLimit = (relic: RelicId | null) =>
  relic === 'capacity' ? 12 : HAND_LIMIT;
const ticks = (ms: number) => ms / TICK_MS;
export type BattlePhase = 'opening' | 'heated' | 'curtain';
/** The thirty-second boundary remains opening; the next simulation tick is heated. */
export const battlePhase = (tick: number): BattlePhase =>
  tick >= ticks(CURTAIN_MS) ? 'curtain' : tick > ticks(HEATED_MS) ? 'heated' : 'opening';
export const throwLockMsPerCard = (tick: number) =>
  THROW_LOCK_MS_PER_CARD * (battlePhase(tick) === 'curtain' ? 0.5 : battlePhase(tick) === 'heated' ? 2 / 3 : 1);
/**
 * v8 deal rounds: cards arrive DEAL_SIZE at a time, every DEAL_SIZE base
 * intervals (6 s / 4 s / 3 s by phase), so the card rate is unchanged but
 * a fast thrower always has a choice instead of one card at a time.
 */
export const DEAL_SIZE = 2;
/** Ticks between deal rounds. Builds share the phase's interval; elapsed progress is retained across transitions. */
export const drawInterval = (_items: readonly ItemId[], tick = 0) =>
  DEAL_SIZE * ticks(battlePhase(tick) === 'curtain' ? 1500 : battlePhase(tick) === 'heated' ? 2000 : 3000);
export type Side = 0 | 1;
export type EffectKind =
  | 'damage'
  | 'heal'
  | 'draw'
  | 'reorder'
  | 'charge'
  | 'burn'
  | 'poison'
  | 'shield'
  | 'cleanse'
  | 'growth'
  | 'slow'
  | 'pierce'
  | 'link'
  | 'leech'
  | 'wound'
  | 'curtain'
  | 'antidote'
  | 'douse'
  | 'sleight';
export type TriggerEffect = {
  source: string;
  name: string;
  value: number;
  kind: EffectKind;
};
export type Shot = {
  id: number;
  side: Side;
  cards: PlayingCard[];
  comboIds: string[];
  kind: number;
  damage: number;
  name: string;
  effects: TriggerEffect[];
  burn: number;
  poison: number;
  slow: number;
  pierce: number;
  leech: number;
  startTick: number;
  hitTick: number;
  /** v10: this single card comes back to the thrower's hand on impact. */
  boomerang?: boolean;
};
export type DuelEvent = {
  id: number;
  tick: number;
  side: Side;
  type: 'draw' | 'launch' | 'hit' | 'heal' | 'effect' | 'dot';
  text: string;
  value: number;
  source?: string;
  cardUid?: string;
  kind?: EffectKind;
  combo?: number;
  hpDamage?: number;
  shieldDamage?: number;
  /** Victim's cap at settlement, before a team substitution can replace them. */
  targetMaxHp?: number;
  /** Causal throw, when the effect belongs to a particular launch. */
  actionId?: number;
};
type StatusContribution = { actionId: number | null; stacks: number };
export type ThrowFighter = {
  hp: number;
  shield: number;
  burn: number;
  poison: number;
  /** Ordered causal stacks; cleansing and natural ebb remove the oldest first. */
  afflictions: { burn: StatusContribution[]; poison: StatusContribution[] };
  power: number;
  slowUntil: number;
  woundUntil: number;
  fireproofUntil: number;
  lastSuit: number | null;
  layout: ItemPlacement[];
  hand: PlayingCard[];
  items: ItemId[];
  upgrades: ItemUpgrades;
  drawClock: number;
  drawn: number;
  pile: PlayingCard[];
  cycle: number;
  relic: RelicId | null;
  /** Which variant sits in each of the 52 card slots; absent keys are plain. */
  book: DeckBook;
  nextReorder: number;
  throws: number;
  hits: number;
  echo: number;
  /** Consecutive single-card throws (relay counts these; any batch resets it). */
  singles: number;
  /** What this side actually threw: cards per suit and throws per poker kind (dossiers). */
  tally: { suits: [number, number, number, number]; kinds: number[] };
  /** v10 performer on stage (talent + sleight); null keeps the pre-v10 rules. */
  performer: PerformerId | null;
  /** Tick from which the sleight may be used again. */
  nextSleight: number;
  /** Juno's boomerang is armed for the next single card. */
  boomerang: boolean;
  /** Eli's false shuffle: the next deal is face up until it lands (or is buried). */
  peeking: boolean;
  /** A once-per-duel talent has fired (Stan's 中途下车). */
  talentUsed: boolean;
  encore: boolean;
  encoreUsed: boolean;
  /** v11 presence cap (气场上限). */
  maxHp: number;
};
export type DuelActionEffects = {
  /** Actual HP removed, after mitigation, separately from shield points removed. */
  direct: number; burn: number; poison: number; shieldDamage: number;
  shield: number; heal: number; burnApplied: number; poisonApplied: number; cleanse: number;
  /** Successful card arrivals and permanent power gained, after their respective caps. */
  draw: number; growth: number;
  /** Newly added duration at impact; refreshing an already longer status adds zero. */
  slowMs: number; woundMs: number;
  /** HP lost to the defender's reaction; never credited as damage this throw dealt. */
  reflected: number;
};
export type DuelAction = {
  id: number; tick: number; hitTick?: number; performer: PerformerId | null;
  cards: PlayingCard[]; kind: number; name: string;
  status: 'pending' | 'resolved' | 'cancelled'; effects: DuelActionEffects;
};
/** Lifetime, real outcomes for one side. Never reconstructed from the capped visual event feed. */
export type DuelStatistics = {
  throws: number;
  hits: number;
  cardsThrown: number;
  cards: Record<string, Pick<PlayingCard, 'suit' | 'rank' | 'ench'> & { count: number }>;
  kinds: number[];
  damage: { direct: number; burn: number; poison: number; reflection: number };
  damageTaken: { direct: number; burn: number; poison: number; reflection: number; curtain: number };
  actions: DuelAction[];
  shieldGenerated: number;
  healingDone: number;
  itemTriggers: Partial<Record<ItemId, number>>;
  relicTriggers: Partial<Record<RelicId, number>>;
  sleightsUsed: number;
  /** The theatre is environmental damage, never damage credited to an opponent. */
  curtainDamageTaken: number;
};
const freshStatistics = (): DuelStatistics => ({
  throws: 0, hits: 0, cardsThrown: 0, cards: {}, kinds: Array(9).fill(0),
  damage: { direct: 0, burn: 0, poison: 0, reflection: 0 },
  damageTaken: { direct: 0, burn: 0, poison: 0, reflection: 0, curtain: 0 }, actions: [],
  shieldGenerated: 0, healingDone: 0, itemTriggers: {}, relicTriggers: {},
  sleightsUsed: 0, curtainDamageTaken: 0,
});
/**
 * Optional house terms for a challenge duel (street shows). They bind the
 * player (side 0) only: illegal throws are refused whole, and breaking a
 * deadline or HP floor ends the duel as a loss. Absent terms change nothing.
 */
export type DuelTerms = {
  /** Suits the player may throw. */
  suits?: Suit[];
  /** Most cards per throw. */
  maxCards?: number;
  /** Fewest cards per throw. */
  minCards?: number;
  /** The player must win before this much duel time has passed. */
  deadlineMs?: number;
  /** The player loses as soon as their life drops below this. */
  hpFloor?: number;
};
export type EndReason = 'knockout' | 'time' | 'deadline' | 'floor';
export type ThrowDuel = {
  rules: typeof RULES_VERSION;
  seed: number;
  tick: number;
  fighters: [ThrowFighter, ThrowFighter];
  roundStartTick: number;
  round: number;
  intermission: { startTick: number; endTick: number; sides: Side[] } | null;
  shots: Shot[];
  events: DuelEvent[];
  nextId: number;
  nextLaunch: [number, number];
  /** Full duration of the current recovery, in ticks; progress uses this and nextLaunch. */
  throwLockDuration: [number, number];
  /** A two-person team keeps the surviving fighter exactly as they were. */
  reserves: [ThrowFighter | null, ThrowFighter | null];
  reserveStyles: [Style | null, Style | null];
  reserveQueues: [ThrowFighter[], ThrowFighter[]];
  reserveStyleQueues: [Style[], Style[]];
  autoPlayer: { enabled: boolean; intent: string[]; releaseTick: number; thinkTick: number };
  teamOrder: [Array<PerformerId | null>, Array<PerformerId | null>];
  activeSeats: [number, number];
  ai: {
    style: Style;
    thinkTick: number;
    intent: string[];
    releaseTick: number;
  };
  status: 'playing' | 'ended';
  winner: Side | 'draw' | null;
  terms: DuelTerms | null;
  endReason: EndReason | null;
  stats: [DuelStatistics, DuelStatistics];
};
/** Time still owed to the current throw, never a separate animation cooldown. */
export const throwLockRemainingMs = (state: ThrowDuel, side: Side) =>
  Math.max(0, state.nextLaunch[side] - state.tick) * TICK_MS;
export const throwLockProgress = (state: ThrowDuel, side: Side) => {
  const remainingMs = throwLockRemainingMs(state, side);
  const durationMs = Math.max(remainingMs, state.throwLockDuration[side] * TICK_MS);
  return { remainingMs, durationMs, remainingRatio: durationMs ? remainingMs / durationMs : 0 };
};
function setThrowLock(state: ThrowDuel, side: Side, cardCount: number) {
  const duration = Math.ceil(ticks(cardCount * throwLockMsPerCard(duelRoundTick(state))));
  state.throwLockDuration[side] = duration;
  state.nextLaunch[side] = state.tick + duration;
}
/** Absolute tick remains monotonic for events and timers; only stage time restarts. */
export const duelRoundTick = (state: ThrowDuel) => state.intermission ? 0 : state.tick - state.roundStartTick;
/** Optional second performer for a genuine two-person team match. */
export type DuelReserve = {
  performer: PerformerId;
  style: Style;
  items: ItemId[];
  relic?: RelicId | null;
  book?: DeckBook;
  presence?: number;
  name?: string;
  upgrades?: ItemUpgrades;
  layout?: ItemPlacement[];
  encore?: boolean;
};
/** Whether the player may throw these cards under the duel's terms. */
export function termsAllow(terms: DuelTerms | null | undefined, cards: readonly PlayingCard[]) {
  if (!terms) return true;
  if (terms.maxCards !== undefined && cards.length > terms.maxCards) return false;
  if (terms.minCards !== undefined && cards.length < terms.minCards) return false;
  if (terms.suits && cards.some((card) => !terms.suits!.includes(card.suit))) return false;
  return true;
}

/** How long each build's AI deliberates between throws. */
export const AI_THINK_MS: Record<Style, number> = {
  quick: 1500,
  combo: 3000,
  guard: 2600,
  burn: 2600,
  poison: 2800,
  mend: 2600,
  lesson: 5200,
};
export const aiThinkMs = (style: Style) => AI_THINK_MS[style];

/**
 * One standard 52-card deck, shuffled from its own stream and drawn in order;
 * when it runs out the whole deck is reshuffled as the next cycle. Variants
 * only decorate cards, so the shuffle order is independent of the deck book.
 */
function deck(seed: number, side: Side, cycle: number, book: DeckBook = {}): PlayingCard[] {
  const rng = randomStream(seed, `throw-duel/${side}/deck/${cycle}`),
    cards: PlayingCard[] = [];
  for (let suit = 0; suit < 4; suit++)
    for (let rank = 2; rank <= 14; rank++) {
      const ench = book[cardKey(suit, rank)];
      cards.push({
        uid: `${side}:${cycle}:${suit}:${rank}`,
        suit: suit as Suit,
        rank,
        ...(ench ? { ench } : {}),
      });
    }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
const actionEffects = (state: ThrowDuel, side: Side, actionId?: number) =>
  actionId === undefined ? undefined : state.stats[side].actions.find((action) => action.id === actionId)?.effects;
/** Reconcile externally supplied/test statuses without inventing a causal throw. */
function statusContributions(fighter: ThrowFighter, kind: 'burn' | 'poison') {
  const parts = fighter.afflictions[kind];
  const total = parts.reduce((sum, part) => sum + part.stacks, 0);
  if (total < fighter[kind]) parts.push({ actionId: null, stacks: fighter[kind] - total });
  let excess = Math.max(0, total - fighter[kind]);
  while (excess && parts.length) {
    const removed = Math.min(excess, parts[0].stacks);
    parts[0].stacks -= removed; excess -= removed;
    if (!parts[0].stacks) parts.shift();
  }
  return parts;
}
function setStatus(fighter: ThrowFighter, kind: 'burn' | 'poison', amount: number, actionId: number | null = null) {
  const parts = statusContributions(fighter, kind);
  const next = Math.max(0, amount);
  if (next > fighter[kind]) parts.push({ actionId, stacks: next - fighter[kind] });
  fighter[kind] = next;
  statusContributions(fighter, kind);
}
/** Proportional integer allocation in application order; the shares sum exactly to the actual outcome. */
function creditStatus(state: ThrowDuel, targetSide: Side, kind: 'burn' | 'poison', health: number, shield: number) {
  const fighter = state.fighters[targetSide], parts = statusContributions(fighter, kind);
  const total = fighter[kind];
  if (!total) return;
  let cumulative = 0, previousHp = 0, previousShield = 0;
  for (const part of parts) {
    cumulative += part.stacks;
    const hpShare = Math.floor(health * cumulative / total), shieldShare = Math.floor(shield * cumulative / total);
    const effects = actionEffects(state, targetSide === 0 ? 1 : 0, part.actionId ?? undefined);
    if (effects) { effects[kind] += hpShare - previousHp; effects.shieldDamage += shieldShare - previousShield; }
    previousHp = hpShare; previousShield = shieldShare;
  }
}
const addEvent = (
  state: ThrowDuel,
  side: Side,
  type: DuelEvent['type'],
  text: string,
  value: number,
  extra: Partial<
    Pick<
      DuelEvent,
      'source' | 'cardUid' | 'kind' | 'combo' | 'hpDamage' | 'shieldDamage' | 'actionId'
    >
  > = {},
) => {
  const stats = state.stats[side];
  if (extra.hpDamage !== undefined) {
    const victim = state.stats[side === 0 ? 1 : 0];
    const kind = extra.kind === 'curtain' ? 'curtain' : extra.kind === 'burn' ? 'burn' : extra.kind === 'poison' ? 'poison' : extra.source === 'rule:reflection' ? 'reflection' : 'direct';
    victim.damageTaken[kind] += extra.hpDamage;
    if (kind === 'curtain') victim.curtainDamageTaken += extra.hpDamage;
    else stats.damage[kind] += extra.hpDamage;
    const effects = actionEffects(state, side, extra.actionId);
    if (effects && (kind === 'direct' || kind === 'burn' || kind === 'poison')) {
      effects[kind] += extra.hpDamage;
      effects.shieldDamage += extra.shieldDamage ?? 0;
    }
  }
  if (type === 'heal') {
    stats.healingDone += value;
    const effects = actionEffects(state, side, extra.actionId);
    if (effects) effects.heal += value;
  }
  state.events.push({
    id: state.nextId++,
    tick: state.tick,
    side,
    type,
    text,
    value,
    ...(extra.hpDamage !== undefined ? { targetMaxHp: state.fighters[side === 0 ? 1 : 0].maxHp } : {}),
    ...Object.fromEntries(Object.entries(extra).filter(([, entry]) => entry !== undefined)),
  });
  if (state.events.length > 240) state.events.shift();
};
function countTrigger(state: ThrowDuel, side: Side, source: string) {
  const stats = state.stats[side];
  if (source.startsWith('item:')) {
    const id = source.slice(5) as ItemId;
    stats.itemTriggers[id] = (stats.itemTriggers[id] ?? 0) + 1;
  } else if (source.startsWith('relic:')) {
    const id = source.slice(6) as RelicId;
    stats.relicTriggers[id] = (stats.relicTriggers[id] ?? 0) + 1;
  }
}
const effectEvent = (state: ThrowDuel, side: Side, effect: TriggerEffect, count = true) => {
  if (count) countTrigger(state, side, effect.source);
  addEvent(state, side, 'effect', effect.name, effect.value, {
    source: effect.source,
    kind: effect.kind,
  });
};
/** Burning or wounded fighters receive 60% healing (rounded down). */
export const healingFactor = (fighter: Pick<ThrowFighter, 'burn' | 'woundUntil'>, tick: number) =>
  fighter.burn > 0 || tick < fighter.woundUntil ? 0.6 : 1;
/**
 * Every healing effect also cleanses poison equal to half its nominal amount,
 * even at full life: a remedy works whether or not you needed the plaster.
 */
function healFighter(
  state: ThrowDuel,
  side: Side,
  nominal: number,
  text: string,
  source?: string,
  count = false,
  actionId?: number,
) {
  const fighter = state.fighters[side];
  if (nominal <= 0) return 0;
  if (count && source) countTrigger(state, side, source);
  const cleansed = Math.min(fighter.poison, Math.ceil(nominal / 2));
  if (cleansed) {
    setStatus(fighter, 'poison', fighter.poison - cleansed);
    const effects = actionEffects(state, side, actionId);
    if (effects) effects.cleanse += cleansed;
    addEvent(state, side, 'effect', '净化剧毒', cleansed, {
      source,
      kind: 'cleanse', actionId,
    });
  }
  const actual = Math.min(
    Math.floor(nominal * healingFactor(fighter, state.tick)),
    fighter.maxHp - fighter.hp,
  );
  fighter.hp += actual;
  if (actual > 0)
    addEvent(state, side, 'heal', text, actual, { source, kind: 'heal', actionId });
  // Heart blanket: what would spill past full life is half kept as shield.
  if (fighter.relic === 'heart') {
    const spill = Math.floor(nominal * healingFactor(fighter, state.tick)) - actual;
    const kept = Math.floor(spill * HEART_OVERFLOW);
    if (kept > 0) {
      fighter.shield += kept;
      state.stats[side].shieldGenerated += kept;
      const effects = actionEffects(state, side, actionId);
      if (effects) effects.shield += kept;
      if (!count || source !== 'relic:heart') countTrigger(state, side, 'relic:heart');
      addEvent(state, side, 'effect', '补缝余温', kept, { source: 'relic:heart', kind: 'shield', actionId });
    }
  }
  return actual;
}
function draw(state: ThrowDuel, side: Side) {
  const fighter = state.fighters[side];
  if (fighter.hand.length >= handLimit(fighter.relic)) return;
  if (!fighter.pile.length)
    fighter.pile = deck(state.seed, side, ++fighter.cycle, fighter.book);
  const card = fighter.pile.pop()!;
  fighter.hand.push(card);
  fighter.drawn++;
  addEvent(state, side, 'draw', '记忆灵符', card.rank, { cardUid: card.uid });
}
export function createThrowDuel(
  seed: number,
  playerItems: ItemId[],
  aiStyle: Style = 'guard',
  relic: RelicId | null = null,
  enemyRelic: RelicId | null = PRESETS[aiStyle]?.relic ?? null,
  playerLayout?: ItemPlacement[],
  books: { player?: DeckBook; enemy?: DeckBook } = {},
  options: {
    enemyItems?: ItemId[];
    terms?: DuelTerms;
    performers?: { player?: PerformerId | null; enemy?: PerformerId | null };
    /** v11 presence caps; absent sides use MAX_HP. */
    presence?: { player?: number; enemy?: number };
    playerUpgrades?: ItemUpgrades;
    enemyUpgrades?: ItemUpgrades;
    playerReserves?: DuelReserve[];
    enemyReserves?: DuelReserve[];
    stanEncore?: boolean;
    playerReserve?: DuelReserve;
    enemyReserve?: DuelReserve;
  } = {},
): ThrowDuel {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Seed must be uint32');
  if (!PRESETS[aiStyle]) throw new Error('Invalid opponent');
  if (![options.playerUpgrades ?? {}, options.enemyUpgrades ?? {}].every(validItemUpgrades))
    throw new Error('Invalid item upgrades');
  const layout = playerLayout ?? packThrowItems(playerItems);
  if (
    !validThrowLayout(layout) ||
    layout.length !== playerItems.length ||
    new Set(playerItems).size !== playerItems.length ||
    playerItems.some((id) => !layout.some((entry) => entry.id === id))
  )
    throw new Error('Invalid loadout');
  if (
    [relic, enemyRelic].some(
      (id) => id !== null && !RELICS.some((entry) => entry.id === id),
    )
  )
    throw new Error('Invalid relic');
  const playerBook = books.player ?? {},
    enemyBook = books.enemy ?? {};
  if (!validDeckBook(playerBook) || !validDeckBook(enemyBook))
    throw new Error('Invalid deck book');
  const enemyItems = options.enemyItems ?? PRESETS[aiStyle].items;
  if (
    new Set(enemyItems).size !== enemyItems.length ||
    enemyItems.some((id) => !ITEMS.some((item) => item.id === id))
  )
    throw new Error('Invalid opponent loadout');
  const enemyLayout = packThrowItems(enemyItems);
  if (
    !validThrowLayout(enemyLayout) ||
    enemyLayout.length !== enemyItems.length ||
    new Set(enemyItems).size !== enemyItems.length
  )
    throw new Error('Invalid opponent loadout');
  const performers = [options.performers?.player ?? null, options.performers?.enemy ?? null] as const;
  const caps = [options.presence?.player ?? MAX_HP, options.presence?.enemy ?? MAX_HP] as const;
  if (caps.some((cap) => !Number.isInteger(cap) || cap < 1 || cap > PRESENCE_LIMIT)) throw new Error('Invalid presence');
  if (performers.some((id) => id !== null && !isPerformer(id))) throw new Error('Invalid performer');
  const terms = options.terms ? structuredClone(options.terms) : null;
  if (
    terms &&
    ((terms.suits && (!terms.suits.length || terms.suits.some((suit) => ![0, 1, 2, 3].includes(suit)))) ||
      (terms.maxCards !== undefined && !(Number.isInteger(terms.maxCards) && terms.maxCards >= 1)) ||
      (terms.minCards !== undefined && !(Number.isInteger(terms.minCards) && terms.minCards >= 1 && terms.minCards <= 5)) ||
      (terms.deadlineMs !== undefined && !(Number.isInteger(terms.deadlineMs) && terms.deadlineMs > 0)) ||
      (terms.hpFloor !== undefined && !(Number.isInteger(terms.hpFloor) && terms.hpFloor > 0 && terms.hpFloor <= caps[0])))
  )
    throw new Error('Invalid duel terms');
  const make = (
    side: Side,
    bag: ItemPlacement[],
    equippedRelic: RelicId | null,
    book: DeckBook,
  ): ThrowFighter => ({
    hp: caps[side],
    maxHp: caps[side],
    shield: 0,
    burn: 0,
    poison: 0,
    afflictions: { burn: [], poison: [] },
    power: 0,
    slowUntil: 0,
    woundUntil: 0,
    fireproofUntil: 0,
    lastSuit: null,
    layout: structuredClone(bag),
    hand: [],
    items: bag.map((entry) => entry.id),
    upgrades: { ...(side === 0 ? options.playerUpgrades : options.enemyUpgrades) },
    drawClock: 0,
    drawn: 0,
    pile: deck(seed, side, 0, book),
    cycle: 0,
    relic: equippedRelic,
    book: { ...book },
    nextReorder: 0,
    throws: 0,
    hits: 0,
    echo: 0,
    singles: 0,
    tally: { suits: [0, 0, 0, 0], kinds: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    performer: performers[side],
    nextSleight: 0,
    boomerang: false,
    peeking: false,
    talentUsed: false,
    encore: Boolean(options.stanEncore && (side === 0 ? options.performers?.player : options.performers?.enemy) === 'stan'),
    encoreUsed: false,
  });
  const state: ThrowDuel = {
    rules: RULES_VERSION,
    seed,
    tick: 0,
    roundStartTick: 0,
    round: 1,
    intermission: null,
    fighters: [
      make(0, layout, relic, playerBook),
      make(1, enemyLayout, enemyRelic, enemyBook),
    ],
    shots: [],
    events: [],
    nextId: 1,
    nextLaunch: [0, 0],
    throwLockDuration: [0, 0],
    reserves: [null, null],
    reserveStyles: [null, null],
    reserveQueues: [[], []],
    reserveStyleQueues: [[], []],
    autoPlayer: { enabled: false, intent: [], releaseTick: 0, thinkTick: ticks(600) },
    teamOrder: [[performers[0]], [performers[1]]],
    activeSeats: [0, 0],
    ai: {
      style: aiStyle,
      thinkTick: ticks(2400),
      intent: [],
      releaseTick: 0,
    },
    status: 'playing',
    winner: null,
    terms,
    endReason: null,
    stats: [freshStatistics(), freshStatistics()],
  };
  for (let i = 0; i < 5; i++) {
    draw(state, 0);
    draw(state, 1);
  }
  for (const side of [0, 1] as const) {
    const list = (side === 0 ? options.playerReserves ?? (options.playerReserve ? [options.playerReserve] : []) : options.enemyReserves ?? (options.enemyReserve ? [options.enemyReserve] : []));
    if (list.length > 2) throw new Error('Teams support at most three performers');
    const identities = [performers[side], ...list.map((r) => r.performer)].filter(Boolean);
    if (new Set(identities).size !== identities.length) throw new Error('Duplicate team performer');
    list.forEach((reserve, index) => {
      if (!Object.hasOwn(PERFORMERS, reserve.performer) || !Object.hasOwn(PRESETS, reserve.style)) throw new Error('Invalid reserve');
      const prepared = createThrowDuel(seed, reserve.items, reserve.style, reserve.relic ?? null, null, reserve.layout,
        { player: reserve.book ?? PERFORMERS[reserve.performer].book },
        { performers: { player: reserve.performer }, presence: { player: reserve.presence }, playerUpgrades: reserve.upgrades, stanEncore: reserve.encore });
      const fighter = prepared.fighters[0];
      fighter.cycle = (index + 1) * 1000000;
      fighter.pile = deck(seed, side, fighter.cycle, fighter.book);
      fighter.hand = Array.from({ length: 5 }, () => fighter.pile.pop()!);
      if (index === 0) { state.reserves[side] = fighter; state.reserveStyles[side] = reserve.style; }
      else { state.reserveQueues[side].push(fighter); state.reserveStyleQueues[side].push(reserve.style); }
      state.teamOrder[side].push(reserve.performer);
    });
  }
  return state;
}
/**
 * The qualification lesson owns a fully scripted first deck on both seats.
 * The remaining 47 cards are also stable; no RNG draw is inserted into the ordinary game stream.
 */
export function applyQualifierOpening(state: ThrowDuel): ThrowDuel {
  if (state.tick !== 0 || state.status !== 'playing' || state.fighters.some((fighter) => fighter.throws > 0)) return state;
  const next = structuredClone(state);
  const opening: [Suit, number][][] = [
    [[0, 4], [0, 7], [1, 5], [3, 9], [0, 11]],
    [[3, 4], [3, 8], [3, 12], [1, 6], [2, 7]],
  ];
  for (const side of [0, 1] as const) {
    const fighter = next.fighters[side];
    const all = [...fighter.hand, ...fighter.pile].sort((a, b) => a.suit - b.suit || a.rank - b.rank);
    const chosen = opening[side].map(([suit, rank]) => all.find((card) => card.suit === suit && card.rank === rank)!);
    const remaining = all.filter((card) => !chosen.some((selected) => selected.uid === card.uid));
    fighter.hand = chosen;
    fighter.pile = remaining.reverse();
    // Match the initial draw events to the visible hand so effects and QA never refer to the discarded random opener.
    let index = 0;
    for (const event of next.events) if (event.side === side && event.type === 'draw') {
      const card = chosen[index++];
      if (card) { event.cardUid = card.uid; event.value = card.rank; }
    }
  }
  return next;
}
type PreviewContext = Partial<ThrowFighter> & {
  tick?: number;
  phaseTick?: number;
  target?: Partial<ThrowFighter>;
};
type Raw = { name: string; kind: EffectKind; value: number };
/** Cards of a suit, counting resonant variants (共鸣) as several. */
const count = (cards: PlayingCard[], suit: Suit) =>
  cards.reduce((sum, card) => sum + (card.suit === suit ? suitWeight(card) : 0), 0);
const PAIRISH = [1, 2, 6];
/** The whole item rulebook. Mechanical text in throw-loadout.ts mirrors this. */
function itemEffects(
  id: ItemId,
  cards: PlayingCard[],
  kind: number,
  context: PreviewContext,
  pureSuit: number | null,
  comboSize: number,
): Raw[] {
  const single = cards.length === 1;
  switch (id) {
    case 'quick':
      return single ? [{ name: '轻巧飞掷', kind: 'damage', value: itemValue(id, 'damage', QUICK_BONUS, context.upgrades) }] : [];
    case 'tempo':
      return pureSuit !== null &&
        context.lastSuit != null &&
        context.lastSuit !== pureSuit
        ? [{ name: '换调共鸣', kind: 'damage', value: itemValue(id, 'damage', 2, context.upgrades) }]
        : [];
    case 'needle':
      return single ? [{ name: '穿幕一线', kind: 'pierce', value: itemValue(id, 'pierce', 30, context.upgrades) }] : [];
    case 'stride':
      return [{ name: '抖擞抖毒', kind: 'cleanse', value: itemValue(id, 'cleanse', 3, context.upgrades) }];
    case 'draw':
      return ((context.throws ?? 0) + 1) % itemValue(id, 'every', 4, context.upgrades) === 0
        ? [{ name: '催信接力', kind: 'draw', value: 1 }]
        : [];
    case 'sequence':
      return kind === 4 || kind === 8
        ? [{ name: '织序连击', kind: 'damage', value: itemValue(id, `d${comboSize}`, Math.floor(36 * comboSize / 5), context.upgrades) }]
        : [];
    case 'suit':
      return kind === 5 || kind === 8
        ? [{ name: '四色辉光', kind: 'damage', value: itemValue(id, `d${comboSize}`, Math.floor(30 * comboSize / 5), context.upgrades) }]
        : [];
    case 'focus':
      return cards.length >= 5 && kind >= 4
        ? [{ name: '星河贯注', kind: 'damage', value: itemValue(id, 'damage', 26, context.upgrades) }]
        : [];
    case 'pair':
      return PAIRISH.includes(kind)
        ? [{ name: '双响共鸣', kind: 'damage', value: itemValue(id, 'damage', 10, context.upgrades) }]
        : [];
    case 'umbrella':
      return PAIRISH.includes(kind)
        ? [{ name: '补丁护心', kind: 'shield', value: itemValue(id, 'shield', UMBRELLA_SHIELD, context.upgrades) }]
        : [];
    case 'ward': {
      const spades = count(cards, 0);
      return spades
        ? [{ name: '守灯结界', kind: 'shield', value: spades * itemValue(id, 'shield', WARD_PER_SPADE, context.upgrades) }]
        : [];
    }
    case 'shieldbash':
      return cards.length >= 2 && (context.shield ?? 0) > 0
        ? [
            {
              name: '护心重映',
              kind: 'damage',
              value: Math.floor((context.shield ?? 0) * itemValue(id, 'rate', 40, context.upgrades) / 100),
            },
          ]
        : [];
    case 'cinder': {
      const diamonds = count(cards, 3);
      return diamonds
        ? [{ name: '余烬燎原', kind: 'burn', value: diamonds * itemValue(id, 'burn', 3, context.upgrades) }]
        : [];
    }
    case 'ash':
      return (context.target?.burn ?? 0) >= 8
        ? [{ name: '焰纹燃爆', kind: 'damage', value: itemValue(id, 'damage', 12, context.upgrades) }]
        : [];
    case 'poison': {
      const clubs = count(cards, 2);
      return clubs
        ? [{ name: '青苔侵蚀', kind: 'poison', value: clubs * itemValue(id, 'poison', 3, context.upgrades) }]
        : [];
    }
    case 'slow':
      return count(cards, 2) >= 2
        ? [{ name: '止雨留息', kind: 'slow', value: itemValue(id, 'ms', 1200, context.upgrades) }]
        : [];
    case 'mend': {
      const hearts = count(cards, 1);
      return hearts
        ? [{ name: '灯火回暖', kind: 'heal', value: hearts * itemValue(id, 'heal', MEND_PER_HEART, context.upgrades) }]
        : [];
    }
    case 'wash':
      return count(cards, 1)
        ? [{ name: '清露净化', kind: 'cleanse', value: itemValue(id, 'cleanse', 4, context.upgrades) }]
        : [];
    case 'drain':
      return [{ name: '回甘汲取', kind: 'leech', value: itemValue(id, 'rate', DRAIN_RATE, context.upgrades) }];
    case 'growth':
      return pureSuit !== null && cards.length >= GROWTH_MIN_CARDS && context.lastSuit === pureSuit
        ? [{ name: '续曲生长', kind: 'growth', value: itemValue(id, 'growth', 3, context.upgrades) }]
        : [];
    default:
      return [];
  }
}
const AMPLIFIED: EffectKind[] = ['damage', 'burn', 'poison', 'shield', 'heal'];
/** Shield and healing engines (v8: 30 / 14 / 9 / 25%). */
export const UMBRELLA_SHIELD = 26;
export const WARD_PER_SPADE = 12;
export const MEND_PER_HEART = 9;
export const DRAIN_RATE = 25;
/** 飞牌修缮箱's bonus per single card (v8: 8). */
export const QUICK_BONUS = 8;
/** v9: a single card is trivially "pure suit"; the music box needs a real flush-run. */
export const GROWTH_MIN_CARDS = 2;
/**
 * v9 splash tax: shield and healing items work at half strength unless the
 * trunk carries at least SPLASH_MIN_ITEMS items of that family.
 */
export const SPLASH_FAMILIES: readonly Family[] = ['shield', 'heal'];
export const SPLASH_MIN_ITEMS = 3;
const SPLASH_KINDS: EffectKind[] = ['shield', 'heal', 'leech'];
export function splashed(items: readonly ItemId[], id: ItemId) {
  const family = itemDefinition(id).family;
  return SPLASH_MIN_ITEMS > 0 && SPLASH_FAMILIES.includes(family) &&
    items.filter((other) => itemDefinition(other).family === family).length < SPLASH_MIN_ITEMS;
}
/** v9 costumes: specialisation pays. Utility items never count as a family. */
export const SEQUIN_RATE = 25;
export const TAILCOAT_RATE = 20;
export function trunkFamilies(items: readonly ItemId[]) {
  return new Set(items.map((id) => itemDefinition(id).family).filter((family) => family !== 'utility'));
}
export function costumeRate(items: readonly ItemId[], upgrades?: ItemUpgrades) {
  const families = trunkFamilies(items).size;
  if (items.includes('sequin') && families === 1) return { id: 'sequin' as const, rate: itemValue('sequin', 'rate', SEQUIN_RATE, upgrades) };
  if (items.includes('tailcoat') && families === 2) return { id: 'tailcoat' as const, rate: itemValue('tailcoat', 'rate', TAILCOAT_RATE, upgrades) };
  return null;
}
export function previewThrow(
  cards: PlayingCard[],
  items: readonly ItemId[],
  context: PreviewContext = {},
) {
  const poker = scorePoker(cards),
    effects: TriggerEffect[] = [];
  const layout = context.layout ?? packThrowItems(items),
    neighbors = (id: ItemId) => adjacentThrowItems(layout, id);
  const pureSuit =
    cards.length && cards.every((card) => card.suit === cards[0].suit)
      ? cards[0].suit
      : null;
  const links = new Map<ItemId, number>();
  const costume = costumeRate(items, context.upgrades);
  if (cards.length)
    for (const id of items)
      for (const raw of itemEffects(id, cards, poker.kind, context, pureSuit, poker.comboIds.length)) {
        const upgraded = raw.value;
        let amount = SPLASH_KINDS.includes(raw.kind) && splashed(items, id) ? Math.floor(upgraded / 2) : upgraded;
        const base = amount;
        if (AMPLIFIED.includes(raw.kind))
          for (const neighbor of neighbors(id)) {
            let rate = 0;
            if (neighbor.id === 'bellows' && raw.kind === 'burn') rate = itemValue(neighbor.id, 'rate', 50, context.upgrades);
            if (neighbor.id === 'venom' && raw.kind === 'poison') rate = itemValue(neighbor.id, 'rate', 50, context.upgrades);
            if (neighbor.id === 'compass' && neighbors('compass').length === 2)
              rate = itemValue(neighbor.id, 'rate', 25, context.upgrades);
            const gain = Math.floor((base * rate) / 100);
            if (gain) {
              amount += gain;
              links.set(neighbor.id, (links.get(neighbor.id) ?? 0) + gain);
            }
          }
        if (costume && AMPLIFIED.includes(raw.kind) && itemDefinition(id).family !== 'utility') {
          const gain = Math.floor((base * costume.rate) / 100);
          if (gain) {
            amount += gain;
            links.set(costume.id, (links.get(costume.id) ?? 0) + gain);
          }
        }
        if (id === 'thorns') continue;
        effects.push({ source: `item:${id}`, name: raw.name, value: amount, kind: raw.kind });
      }
  // Card variants: enchantments on the thrown cards themselves.
  if (cards.length)
    for (const raw of enchantEffects(
      cards,
      {
        cards,
        kind: poker.kind,
        hp: context.hp ?? context.maxHp ?? MAX_HP,
        maxHp: context.maxHp ?? MAX_HP,
        shield: context.shield ?? 0,
        poison: context.poison ?? 0,
        burn: context.burn ?? 0,
        hand: context.hand?.length ?? cards.length,
        throws: context.throws ?? 0,
        curtain: curtainDamage(context.phaseTick ?? context.tick ?? 0) > 0,
        target: {
          burn: context.target?.burn ?? 0,
          poison: context.target?.poison ?? 0,
          shield: context.target?.shield ?? 0,
          hand: context.target?.hand?.length ?? 0,
        },
      },
      poker.comboIds,
    ))
      effects.push({ source: raw.source, name: raw.name, value: raw.value, kind: raw.kind });
  for (const [id, gain] of links)
    effects.push({
      source: `item:${id}`,
      name: id === 'bellows' ? '鼓火相邻' : id === 'venom' ? '浸露相邻' : id === 'sequin' ? '亮片专精' : id === 'tailcoat' ? '燕尾双修' : '联灯双邻',
      value: gain,
      kind: 'link',
    });
  const total = (kind: EffectKind) =>
    effects
      .filter((effect) => effect.kind === kind)
      .reduce((sum, effect) => sum + effect.value, 0);
  const relic = (name: string, value: number, kind: EffectKind) =>
    effects.push({ source: `relic:${context.relic}`, name, value, kind });
  if (cards.length) {
    if (context.relic === 'ember' && total('burn')) relic('灶心添火', EMBER_BONUS, 'burn');
    if (context.relic === 'toxin' && TOXIN_BONUS && total('poison')) relic('浸露添毒', TOXIN_BONUS, 'poison');
    if (context.relic === 'echo' && context.echo)
      relic('余响回奏', context.echo, 'damage');
    if (context.relic === 'relay' && cards.length === 1 && context.singles)
      relic('接力加速', Math.min(RELAY_CAP, context.singles * RELAY_STEP), 'damage');
    if (context.relic === 'capacity' && (context.hand?.length ?? 0) >= CAPACITY_FULL_HAND)
      relic('满匣倾出', CAPACITY_BONUS, 'damage');
    // Eli's talent: a throw that empties the hand lands a little harder.
    if (context.performer === 'pip' && cards.length >= 2) effects.push({ source: 'talent:pip', name: '接住尾音', value: 4, kind: 'shield' });
    if (context.performer === 'holt' && PAIRISH.includes(poker.kind)) effects.push({ source: 'talent:holt', name: '整团的节拍', value: 4, kind: 'shield' });
    if (context.performer === 'edith' && cards.length === 1) effects.push({ source: 'talent:edith', name: '织布手', value: 4, kind: 'shield' });
    if (context.performer === 'oswald' && count(cards, 3)) effects.push({ source: 'talent:oswald', name: '炉膛余温', value: 1, kind: 'burn' });
    if (context.performer === 'eli' && context.hand && cards.length === context.hand.length)
      effects.push({ source: 'talent:eli', name: '压箱底', value: EMPTY_HAND_BONUS, kind: 'damage' });
    if (context.performer === 'molly' && count(cards, 1) > 0)
      effects.push({ source: 'talent:molly', name: '夜班照护', value: MOLLY_HEART_HEAL, kind: 'heal' });
    if (poker.kind >= 4)
      effects.push({ source: 'rule:wound', name: '压轴重创', value: WOUND_MS, kind: 'wound' });
    // Finale: a flourish of five or more cards snuffs your own flames and
    // leaves you fireproof for six seconds.
    if (cards.length >= 5 && (context.burn ?? 0) > 0)
      effects.push({ source: 'rule:finale', name: '压轴灭火', value: context.burn ?? 0, kind: 'cleanse' });
  }
  // Clamp growth to its real headroom so the preview never lies (shields are uncapped since v11).
  let growthLeft = Math.max(0, MAX_POWER - (context.power ?? 0));
  for (const effect of effects)
    if (effect.kind === 'growth') {
      effect.value = Math.min(effect.value, growthLeft);
      growthLeft -= effect.value;
    }
  const damageFrom = (prefix: string) =>
    effects
      .filter((effect) => effect.kind === 'damage' && effect.source.startsWith(prefix))
      .reduce((sum, effect) => sum + effect.value, 0);
  const itemBonus = damageFrom('item:'),
    relicBonus = damageFrom('relic:') + damageFrom('talent:'),
    cardBonus = damageFrom('card:');
  const cleanse = (name: string) =>
    effects.find((effect) => effect.kind === 'cleanse' && effect.name === name)?.value ?? 0;
  return {
    ...poker,
    itemBonus,
    relicBonus,
    cardBonus,
    damage:
      poker.damage +
      itemBonus +
      relicBonus +
      cardBonus +
      (cards.length ? (context.power ?? 0) : 0),
    heal: total('heal'),
    shield: total('shield'),
    burn: total('burn'),
    poison: total('poison'),
    slow: total('slow'),
    pierce: Math.min(100, total('pierce')),
    growth: total('growth'),
    draw: total('draw'),
    leech: total('leech') / 100,
    wound: poker.kind >= 4,
    cleansePoison: cleanse('抖擞抖毒') + cleanse('清露净化') + total('antidote'),
    cleanseBurn: cleanse('压轴灭火') + cleanse('清露净化') + total('douse'),
    currentSuit: pureSuit,
    effects,
  };
}
function launchMutable(state: ThrowDuel, side: Side, ids: string[]) {
  const fighter = state.fighters[side];
  if (
    state.status !== 'playing' ||
    state.intermission !== null ||
    state.tick < state.nextLaunch[side] ||
    !ids.length ||
    ids.length > handLimit(fighter.relic) ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !fighter.hand.some((card) => card.uid === id))
  )
    return false;
  const cards = fighter.hand.filter((card) => ids.includes(card.uid));
  if (side === 0 && !termsAllow(state.terms, cards)) return false;
  const score = previewThrow(cards, fighter.items, {
      ...fighter,
      tick: state.tick,
      phaseTick: duelRoundTick(state),
      target: state.fighters[side === 0 ? 1 : 0],
    });
  const actionId = state.nextId++;
  state.stats[side].actions.push({
    id: actionId, tick: state.tick, performer: fighter.performer, cards: structuredClone(cards),
    kind: score.kind, name: score.name, status: 'pending',
    effects: { direct: 0, burn: 0, poison: 0, shieldDamage: 0, shield: 0, heal: 0, burnApplied: 0, poisonApplied: 0, cleanse: 0, reflected: 0, draw: 0, growth: 0, slowMs: 0, woundMs: 0 },
  });
  fighter.hand = fighter.hand.filter((card) => !ids.includes(card.uid));
  state.shots.push({
    id: actionId,
    side,
    cards,
    comboIds: score.comboIds,
    kind: score.kind,
    damage: score.damage,
    name: score.name,
    effects: score.effects,
    burn: score.burn,
    poison: score.poison,
    slow: score.slow,
    pierce: score.pierce,
    leech: score.leech,
    startTick: state.tick,
    hitTick: state.tick + ticks(450),
    ...(fighter.boomerang && cards.length === 1 ? { boomerang: true } : {}),
  });
  if (fighter.boomerang && cards.length === 1) fighter.boomerang = false;
  setThrowLock(state, side, cards.length);
  addEvent(
    state,
    side,
    'launch',
    `${score.name} · ${cards.length} 张`,
    score.damage,
    { combo: score.kind, actionId },
  );
  fighter.throws++;
  const statistics = state.stats[side];
  statistics.throws++;
  statistics.cardsThrown += cards.length;
  statistics.kinds[score.kind]++;
  for (const card of cards) {
    const key = `${card.suit}-${card.rank}${card.ench ? `-${card.ench}` : ''}`;
    const entry = statistics.cards[key] ?? { suit: card.suit, rank: card.rank, ...(card.ench ? { ench: card.ench } : {}), count: 0 };
    entry.count++;
    statistics.cards[key] = entry;
  }
  fighter.singles = cards.length === 1 ? fighter.singles + 1 : 0;
  fighter.echo = 0;
  for (const card of cards) fighter.tally.suits[card.suit]++;
  fighter.tally.kinds[score.kind]++;
  // One activation per source and throw, even when a single item emits several effect components.
  for (const source of new Set(score.effects.filter((effect) => effect.kind !== 'wound').map((effect) => effect.source)))
    countTrigger(state, side, source);
  for (const effect of score.effects)
    if (effect.kind !== 'wound') effectEvent(state, side, effect, false);
  const effects = actionEffects(state, side, actionId)!;
  effects.cleanse += Math.min(fighter.poison, score.cleansePoison);
  setStatus(fighter, 'poison', fighter.poison - score.cleansePoison);
  // Coal ember: flames lit by an ember-carrier only half come out.
  const douse =
    state.fighters[side === 0 ? 1 : 0].relic === 'ember'
      ? Math.floor(score.cleanseBurn * EMBER_CLEANSE_SHARE)
      : score.cleanseBurn;
  if (douse < score.cleanseBurn && fighter.burn > 0)
    effectEvent(state, side === 0 ? 1 : 0, { source: 'relic:ember', name: '灶心余温', value: Math.min(fighter.burn, score.cleanseBurn) - Math.min(fighter.burn, douse), kind: 'burn' });
  effects.cleanse += Math.min(fighter.burn, douse);
  setStatus(fighter, 'burn', fighter.burn - douse);
  if (cards.length >= 5) fighter.fireproofUntil = state.tick + ticks(FIREPROOF_MS);
  for (const effect of score.effects)
    if (effect.kind === 'heal' && effect.value > 0)
      healFighter(state, side, effect.value, effect.name, effect.source, false, actionId);
  fighter.shield += score.shield;
  statistics.shieldGenerated += score.shield;
  effects.shield += score.shield;
  const powerBefore = fighter.power;
  fighter.power = Math.min(MAX_POWER, fighter.power + score.growth);
  effects.growth += fighter.power - powerBefore;
  fighter.lastSuit = score.currentSuit;
  const drawnBefore = fighter.drawn;
  for (let i = 0; i < score.draw; i++) draw(state, side);
  effects.draw += fighter.drawn - drawnBefore;
  if (fighter.hp === 0) finish(state);
  return true;
}
/** Atomic insertion; no drag interaction is assigned to this rule command. */
export function reorderThrow(
  state: ThrowDuel,
  side: Side,
  uid: string,
  targetIndex: number,
): ThrowDuel {
  const fighter = state.fighters[side],
    from = fighter.hand.findIndex((card) => card.uid === uid);
  if (
    state.status !== 'playing' ||
    Boolean(state.intermission) ||
    state.tick < fighter.nextReorder ||
    from < 0 ||
    !Number.isInteger(targetIndex) ||
    targetIndex < 0 ||
    targetIndex >= fighter.hand.length ||
    targetIndex === from
  )
    return state;
  const next = structuredClone(state),
    hand = next.fighters[side].hand,
    [card] = hand.splice(from, 1);
  hand.splice(targetIndex, 0, card);
  next.fighters[side].nextReorder = state.tick + ticks(REORDER_MS);
  effectEvent(next, side, {
    source: 'rule:reorder',
    name: '整理手牌',
    value: REORDER_MS / 1000,
    kind: 'reorder',
  });
  return next;
}
export function arrangeThrow(
  state: ThrowDuel,
  side: Side,
  mode: 'rank' | 'suit' | 'gather',
  selected: string[] = [],
): ThrowDuel {
  const fighter = state.fighters[side];
  if (
    state.status !== 'playing' ||
    Boolean(state.intermission) ||
    state.tick < fighter.nextReorder ||
    !['rank', 'suit', 'gather'].includes(mode)
  )
    return state;
  if (
    mode === 'gather' &&
    (!selected.length ||
      new Set(selected).size !== selected.length ||
      selected.some((id) => !fighter.hand.some((card) => card.uid === id)))
  )
    return state;
  let hand = [...fighter.hand];
  if (mode === 'rank') hand.sort((a, b) => a.rank - b.rank || a.suit - b.suit);
  if (mode === 'suit') hand.sort((a, b) => a.suit - b.suit || a.rank - b.rank);
  if (mode === 'gather') {
    const first = hand.findIndex((card) => selected.includes(card.uid)),
      chosen = hand.filter((card) => selected.includes(card.uid)),
      others = hand.filter((card) => !selected.includes(card.uid));
    hand = [...others.slice(0, first), ...chosen, ...others.slice(first)];
  }
  if (hand.every((card, index) => card.uid === fighter.hand[index].uid))
    return state;
  const next = structuredClone(state);
  next.fighters[side].hand = hand;
  next.fighters[side].nextReorder = state.tick + ticks(REORDER_MS);
  effectEvent(next, side, {
    source: 'rule:reorder',
    name: '整理手牌',
    value: REORDER_MS / 1000,
    kind: 'reorder',
  });
  return next;
}
export function launchThrow(
  state: ThrowDuel,
  side: Side,
  ids: string[],
): ThrowDuel {
  const next = structuredClone(state);
  return launchMutable(next, side, ids) ? next : state;
}
/* ───────────── v10 sleights (ADR-0057) ───────────── */
/** Whether this side's performer may use their sleight right now. */
export function sleightReady(state: ThrowDuel, side: Side) {
  const fighter = state.fighters[side],
    target = state.fighters[side === 0 ? 1 : 0];
  if (state.status !== 'playing' || state.intermission || !fighter.performer || state.tick < fighter.nextSleight) return false;
  switch (fighterSleight(fighter).id) {
    case 'quick-draw':
      return fighter.hand.length < handLimit(fighter.relic);
    case 'peek':
      return !fighter.peeking;
    case 'boomerang':
      return !fighter.boomerang;
    case 'stoke':
      return target.burn >= STOKE_MIN_BURN;
    case 'encore': return !fighter.encoreUsed && fighter.hand.length > 0;
    case 'switch':
      return fighter.hand.length > 0 && fighter.pile.length > 0;
    case 'remedy':
      return fighter.hp < fighter.maxHp || fighter.poison > 0;
  }
}
/** Stan's switch always trades away the lowest card (leftmost on ties). */
const lowestCard = (hand: PlayingCard[]) =>
  hand.reduce((low, card) => (card.rank < low.rank ? card : low), hand[0]);
function sleightMutable(state: ThrowDuel, side: Side) {
  if (!sleightReady(state, side)) return false;
  const fighter = state.fighters[side],
    targetSide: Side = side === 0 ? 1 : 0,
    target = state.fighters[targetSide],
    sleight = fighterSleight(fighter),
    source = `sleight:${sleight.id}`;
  fighter.nextSleight = state.tick + ticks(sleight.cooldownMs);
  state.stats[side].sleightsUsed++;
  if (sleight.id === 'quick-draw') {
    const before = fighter.hand.length;
    for (let index = 0; index < QUICK_DRAW_COUNT; index++) draw(state, side);
    effectEvent(state, side, { source, name: sleight.name, value: fighter.hand.length - before, kind: 'sleight' });
  } else if (sleight.id === 'peek') {
    fighter.peeking = true;
    effectEvent(state, side, { source, name: sleight.name, value: Math.min(DEAL_SIZE, fighter.pile.length), kind: 'sleight' });
  } else if (sleight.id === 'boomerang') {
    fighter.boomerang = true;
    effectEvent(state, side, { source, name: sleight.name, value: 0, kind: 'sleight' });
  } else if (sleight.id === 'encore') {
    const amount = fighter.hand.length;
    fighter.pile.unshift(...fighter.hand); fighter.hand = [];
    for (let i = 0; i < amount; i++) draw(state, side);
    fighter.encoreUsed = true;
    effectEvent(state, side, { source, name: sleight.name, value: amount, kind: 'sleight' });
  } else if (sleight.id === 'switch') {
    const out = lowestCard(fighter.hand),
      incoming = fighter.pile.pop()!;
    fighter.hand[fighter.hand.indexOf(out)] = incoming;
    fighter.pile.unshift(out);
    effectEvent(state, side, { source, name: sleight.name, value: 0, kind: 'sleight' });
  } else if (sleight.id === 'remedy') {
    healFighter(state, side, MOLLY_REMEDY, sleight.name, source);
    effectEvent(state, side, { source, name: sleight.name, value: MOLLY_REMEDY, kind: 'sleight' });
  } else {
    // Stoke: half the target's flames burn all at once; a raised shield still takes it first.
    const amount = Math.floor(target.burn * STOKE_SHARE);
    const { health, blocked } = loseHealth(target, amount);
    setStatus(target, 'burn', target.burn - amount);
    effectEvent(state, side, { source, name: sleight.name, value: amount, kind: 'sleight' });
    addEvent(state, side, 'dot', sleight.name, health + blocked, { kind: 'burn', hpDamage: health, shieldDamage: blocked });
    if (target.hp === 0) finish(state);
  }
  return true;
}
/** Use the sleight; an unavailable sleight returns the same state untouched. */
export function useSleight(state: ThrowDuel, side: Side): ThrowDuel {
  const next = structuredClone(state);
  return sleightMutable(next, side) ? next : state;
}
export function useSleightInPlace(state: ThrowDuel, side: Side) {
  return sleightMutable(state, side);
}
/** The face-up next deal while Eli's false shuffle is active (draw order). */
export function peekedCards(fighter: ThrowFighter): PlayingCard[] {
  return fighter.peeking ? fighter.pile.slice(-DEAL_SIZE).reverse() : [];
}
/** Bury the face-up cards at the bottom of the pile; only while peeking. */
export function buryPeek(state: ThrowDuel, side: Side): ThrowDuel {
  if (state.status !== 'playing' || state.intermission || !state.fighters[side].peeking) return state;
  const next = structuredClone(state),
    fighter = next.fighters[side],
    top = fighter.pile.splice(Math.max(0, fighter.pile.length - DEAL_SIZE));
  fighter.pile.unshift(...top);
  fighter.peeking = false;
  effectEvent(next, side, { source: 'sleight:peek', name: '埋牌', value: top.length, kind: 'sleight' });
  return next;
}
/** Built-in sleight policy for computer-controlled performers (also the sim proxy). */
export function aiWantsSleight(state: ThrowDuel, side: Side) {
  const fighter = state.fighters[side];
  if (!sleightReady(state, side)) return false;
  switch (fighterSleight(fighter).id) {
    case 'quick-draw':
      return handLimit(fighter.relic) - fighter.hand.length >= QUICK_DRAW_COUNT;
    case 'boomerang':
      return true;
    case 'stoke':
      return state.fighters[side === 0 ? 1 : 0].burn >= STOKE_AI_BURN;
    case 'encore': return fighter.hand.length >= 5;
    case 'switch':
      return lowestCard(fighter.hand).rank <= SWITCH_AI_RANK;
    case 'remedy':
      return fighter.maxHp - fighter.hp >= MOLLY_REMEDY || fighter.poison >= 4;
    default:
      return false;
  }
}
/** Value the AI assigns to a candidate batch; also used by the hint system. */
export function batchValue(
  score: ReturnType<typeof previewThrow>,
  length: number,
  style: Style,
) {
  const goal =
    style === 'combo'
      ? score.kind >= 4
      : style === 'guard'
        ? PAIRISH.includes(score.kind) || score.shield >= 12
        : style === 'quick'
          ? length === 1
          : false;
  return (
    (score.damage +
      score.burn * 6 +
      score.poison * 9 +
      score.shield * 1.2 +
      score.heal * 1.1 +
      score.growth * 10 +
      score.slow * 0.006 +
      (score.wound ? 14 : 0) +
      (goal ? 20 : 0)) /
    Math.pow(length, style === 'quick' ? 1.2 : 0.65)
  );
}
/** AI can single-select or box one continuous range; never pick scattered IDs. */
export function recommendCards(
  hand: PlayingCard[],
  items: readonly ItemId[],
  style: Style,
  context: PreviewContext = {},
): PlayingCard[] {
  if (!hand.length) return [];
  let best = [hand[0]],
    bestValue = -1;
  for (let start = 0; start < hand.length; start++)
    // Reed's first lesson explicitly demonstrates the same single-card kit.
    for (let length = 1; length <= (style === 'lesson' ? 1 : hand.length - start); length++) {
      const candidate = hand.slice(start, start + length);
      const value = batchValue(previewThrow(candidate, items, context), length, style);
      if (value > bestValue) {
        bestValue = value;
        best = candidate;
      }
    }
  return best;
}
/**
 * Any AI tidies its hand when a sorted order offers a
 * better contiguous batch, paying the same cooldown a player would.
 */
export function aiArrange(state: ThrowDuel, side: Side, playerStyle: Style = 'combo') {
  const fighter = state.fighters[side];
  if (state.intermission || state.tick < fighter.nextReorder || fighter.hand.length < 3)
    return;
  const style = side === 1 ? state.ai.style : playerStyle;
  const context = { ...fighter, target: state.fighters[side === 0 ? 1 : 0], tick: state.tick, phaseTick: duelRoundTick(state) };
  const best = (hand: PlayingCard[]) => {
    const cards = recommendCards(hand, fighter.items, style, context);
    return batchValue(previewThrow(cards, fighter.items, context), cards.length, style);
  };
  const current = best(fighter.hand);
  let pick: 'rank' | 'suit' | null = null,
    pickValue = current * 1.05;
  for (const mode of ['rank', 'suit'] as const) {
    const sorted = [...fighter.hand].sort((a, b) =>
      mode === 'rank' ? a.rank - b.rank || a.suit - b.suit : a.suit - b.suit || a.rank - b.rank,
    );
    const value = best(sorted);
    if (value > pickValue) {
      pick = mode;
      pickValue = value;
    }
  }
  if (!pick) return;
  const arranged = arrangeThrow(state, side, pick);
  if (arranged === state) return;
  state.fighters[side].hand = arranged.fighters[side].hand;
  state.fighters[side].nextReorder = arranged.fighters[side].nextReorder;
  effectEvent(state, side, { source: 'rule:reorder', name: '整理手牌', value: REORDER_MS / 1000, kind: 'reorder' });
}
/** Whether a build is willing to release the recommended batch now. */
export function aiReady(style: Style, cards: PlayingCard[], fighter: ThrowFighter) {
  const full = fighter.hand.length >= handLimit(fighter.relic);
  const kind = scorePoker(cards).kind;
  if (style === 'combo')
    return (kind >= 4 && cards.length >= 5) ||
      (fighter.hand.length >= handLimit(fighter.relic) - 2 && kind >= 3) || full;
  return true;
}
function loseHealth(
  fighter: ThrowFighter,
  amount: number,
  pierce = 0,
  /** Shield spent per point a single card is stopped; 0 means no shred. */
  shred = 0,
) {
  const bypass = Math.floor((amount * pierce) / 100),
    rest = amount - bypass;
  // Shred: a single card spends SHRED (Juno: JUNO_SHRED) points of shield for
  // every point it is stopped, and bypasses reflection (see bastion).
  const blocked = shred
    ? Math.min(rest, Math.floor(fighter.shield / shred))
    : Math.min(fighter.shield, rest);
  const shieldLost = shred ? Math.min(fighter.shield, Math.ceil(blocked * shred)) : blocked;
  fighter.shield -= shieldLost;
  const health = Math.min(fighter.hp, rest - blocked + bypass);
  fighter.hp -= health;
  return { health, blocked, shieldLost };
}
function finish(state: ThrowDuel) {
  const [player, enemy] = state.fighters;
  const end = (winner: Side | 'draw', reason: EndReason) => {
    state.status = 'ended';
    state.winner = winner;
    state.endReason = reason;
    for (const shot of state.shots) {
      const action = state.stats[shot.side].actions.find((entry) => entry.id === shot.id);
      if (action) action.status = 'cancelled';
    }
    state.shots = [];
    return true;
  };
  const exhausted = [player.hp === 0 && !state.reserves[0], enemy.hp === 0 && !state.reserves[1]];
  if (exhausted[0] || exhausted[1]) {
    // A simultaneous final KO can leave the winning team with a fresh reserve.
    // Show that real survivor in the result, without announcing a nonexistent next bout.
    for (const side of [0, 1] as const) if (state.fighters[side].hp === 0 && state.reserves[side]) {
      state.fighters[side] = state.reserves[side]!;
      state.reserves[side] = state.reserveQueues[side].shift() ?? null;
      state.activeSeats[side]++;
      if (side === 1) state.ai.style = state.reserveStyles[side]!;
      state.reserveStyles[side] = state.reserveStyleQueues[side].shift() ?? null;
      effectEvent(state, side, { source: 'rule:substitute', name: `${PERFORMERS[state.fighters[side].performer!].name} 接棒`, value: 1, kind: 'sleight' });
    }
    return end(exhausted[0] && exhausted[1] ? 'draw' : exhausted[0] ? 1 : 0, 'knockout');
  }
  const oldSpeed = throwLockMsPerCard(duelRoundTick(state));
  let switched = false;
  const sides: Side[] = [];
  for (const side of [0, 1] as const) {
    const reserve = state.reserves[side];
    if (state.fighters[side].hp > 0 || !reserve) continue;
    state.fighters[side] = reserve;
    state.reserves[side] = state.reserveQueues[side].shift() ?? null;
    state.activeSeats[side]++;
    state.nextLaunch[side] = state.tick;
    state.throwLockDuration[side] = 0;
    effectEvent(state, side, { source: 'rule:substitute', name: `${PERFORMERS[reserve.performer!].name} 接棒`, value: 1, kind: 'sleight' });
    if (side === 1) state.ai.style = state.reserveStyles[side]!;
    state.reserveStyles[side] = state.reserveStyleQueues[side].shift() ?? null;
    switched = true;
    sides.push(side);
  }
  if (switched) {
    // A card aimed at a departed performer never retargets the replacement.
    for (const shot of state.shots) {
      const action = state.stats[shot.side].actions.find((entry) => entry.id === shot.id);
      if (action) action.status = 'cancelled';
    }
    state.shots = [];
    state.autoPlayer.intent = [];
    state.autoPlayer.thinkTick = state.tick + ticks(600);
    state.ai.intent = [];
    state.ai.thinkTick = state.tick + ticks(2400);
    state.ai.releaseTick = state.tick;
    for (const side of [0, 1] as const) if (state.nextLaunch[side] > state.tick) {
      state.nextLaunch[side] = state.tick + Math.ceil((state.nextLaunch[side] - state.tick) / (oldSpeed / THROW_LOCK_MS_PER_CARD));
      state.throwLockDuration[side] = Math.ceil(state.throwLockDuration[side] / (oldSpeed / THROW_LOCK_MS_PER_CARD));
    }
    state.intermission = { startTick: state.tick, endTick: state.tick + ticks(INTERMISSION_MS), sides };
    effectEvent(state, 0, { source: 'rule:intermission', name: '中场休息', value: INTERMISSION_MS / 1000, kind: 'sleight' });
    return true;
  }
  if (player.hp === 0 || enemy.hp === 0)
    return end(player.hp === enemy.hp ? 'draw' : player.hp > enemy.hp ? 0 : 1, 'knockout');
  // House terms (challenge duels only): breaking them is a loss, decided before the clock.
  const terms = state.terms;
  if (terms?.hpFloor !== undefined && player.hp < terms.hpFloor) return end(1, 'floor');
  if (terms?.deadlineMs !== undefined && state.tick >= ticks(terms.deadlineMs)) return end(1, 'deadline');
  if (duelRoundTick(state) >= ticks(120000)) {
    // A healthy reserve still belongs to the team at the safety time limit.
    const playerRemaining = player.hp + (state.reserves[0]?.hp ?? 0) + state.reserveQueues[0].reduce((sum, f) => sum + f.hp, 0),
      enemyRemaining = enemy.hp + (state.reserves[1]?.hp ?? 0) + state.reserveQueues[1].reduce((sum, f) => sum + f.hp, 0);
    return end(playerRemaining === enemyRemaining ? 'draw' : playerRemaining > enemyRemaining ? 0 : 1, 'time');
  }
  return false;
}
/** Advance one tick in place. Simulation tools may call this on their own copy. */
export function stepThrowDuelInPlace(next: ThrowDuel) {
  if (next.status !== 'playing') return;
  next.tick++;
  if (next.intermission) {
    // Freeze combat deadlines as the deterministic announcement clock advances.
    for (const side of [0, 1] as const) {
      const fighter = next.fighters[side];
      for (const key of ['slowUntil', 'woundUntil', 'fireproofUntil', 'nextReorder', 'nextSleight'] as const)
        if (fighter[key] > next.tick - 1) fighter[key]++;
      if (next.nextLaunch[side] > next.tick - 1) next.nextLaunch[side]++;
    }
    if (next.ai.thinkTick > next.tick - 1) next.ai.thinkTick++;
    if (next.tick >= next.intermission.endTick) {
      next.intermission = null;
      next.roundStartTick = next.tick;
      next.round++;
    }
    return;
  }
  const phaseTick = duelRoundTick(next);
  if (battlePhase(phaseTick) !== battlePhase(phaseTick - 1)) {
    const ratio = throwLockMsPerCard(phaseTick) / throwLockMsPerCard(phaseTick - 1);
    for (const side of [0, 1] as const) if (next.nextLaunch[side] > next.tick) {
      next.nextLaunch[side] = next.tick + Math.ceil((next.nextLaunch[side] - next.tick) * ratio);
      next.throwLockDuration[side] = Math.ceil(next.throwLockDuration[side] * ratio);
    }
  }
  const hits = next.shots.filter((shot) => shot.hitTick <= next.tick);
  next.shots = next.shots.filter((shot) => shot.hitTick > next.tick);
  const heals: { side: Side; amount: number; name: string; source: string; actionId?: number }[] = [];
  for (const shot of hits) {
    const action = next.stats[shot.side].actions.find((entry) => entry.id === shot.id);
    if (action) { action.status = 'resolved'; action.hitTick = next.tick; }
    const targetSide: Side = shot.side === 0 ? 1 : 0,
      target = next.fighters[targetSide],
      attacker = next.fighters[shot.side],
      single = shot.cards.length === 1,
      // Fan parry: a hand of seven or more, fanned behind the sequence fan, turns single cards aside.
      parried =
        single &&
        target.items.includes('sequence') &&
        target.hand.length >= FAN_PARRY_HAND,
      result = loseHealth(
        target,
        parried ? Math.ceil(shot.damage / 2) : shot.damage,
        shot.pierce,
        single ? (attacker.performer === 'juno' ? JUNO_SHRED : SHRED) : 0,
      );
    if (parried)
      effectEvent(next, targetSide, {
        source: 'item:sequence',
        name: '扇面格挡',
        value: Math.floor(shot.damage / 2),
        kind: 'shield',
      });
    attacker.hits++;
    next.stats[shot.side].hits++;
    const landed = result.health + result.blocked;
    addEvent(next, shot.side, 'hit', shot.name, result.health + result.shieldLost, {
      kind: 'damage',
      combo: shot.kind,
      hpDamage: result.health,
      shieldDamage: result.shieldLost,
      actionId: shot.id,
    });
    // Juno's boomerang: the single card flies back if there is room for it.
    if (shot.boomerang && attacker.hand.length < handLimit(attacker.relic)) {
      attacker.hand.push(shot.cards[0]);
      effectEvent(next, shot.side, { source: 'sleight:boomerang', name: '回旋飞牌', value: 1, kind: 'sleight' });
    }
    // Smother on contact: flames that land on a raised shield catch only by half.
    const kindled =
      next.tick < target.fireproofUntil
        ? 0
        : target.shield > 0 || result.blocked > 0
          ? Math.floor(shot.burn / 2)
          : shot.burn;
    if (action) {
      action.effects.burnApplied += Math.min(60 - target.burn, kindled);
      action.effects.poisonApplied += Math.min(40 - target.poison, shot.poison);
    }
    setStatus(target, 'burn', Math.min(60, target.burn + kindled), shot.id);
    setStatus(target, 'poison', Math.min(40, target.poison + shot.poison), shot.id);
    if (shot.slow) {
      const previous = Math.max(next.tick, target.slowUntil);
      target.slowUntil = Math.max(target.slowUntil, next.tick + ticks(shot.slow));
      if (action) action.effects.slowMs += (target.slowUntil - previous) * TICK_MS;
    }
    if (shot.kind >= 4 && landed > 0) {
      const previous = Math.max(next.tick, target.woundUntil);
      target.woundUntil = Math.max(target.woundUntil, next.tick + ticks(WOUND_MS));
      if (action) action.effects.woundMs += (target.woundUntil - previous) * TICK_MS;
      effectEvent(next, shot.side, {
        source: 'rule:wound',
        name: '压轴重创',
        value: WOUND_MS,
        kind: 'wound',
      });
    }
    if (target.relic === 'heart' && landed > 0 && shot.cards.length === 1)
      heals.push({ side: targetSide, amount: heartPatch(target.items), name: '红心补缝', source: 'relic:heart' });
    if (shot.leech && result.health)
      heals.push({
        side: shot.side,
        amount: Math.floor(result.health * shot.leech),
        name: '回甘汲取',
        source: 'item:drain',
        actionId: shot.id,
      });
    if (landed > 0) {
      let reflected = 0;
      if (target.items.includes('thorns') && shot.cards.length >= 3) {
        const strong = adjacentThrowItems(target.layout, 'thorns').some(
          (item) => itemDefinition(item.id).family === 'shield',
        );
        reflected += itemValue('thorns', strong ? 'strong' : 'weak', strong ? 22 : 15, target.upgrades);
        effectEvent(next, targetSide, {
          source: 'item:thorns',
          name: strong ? '护灯回声' : '针盒回嘴',
          value: itemValue('thorns', strong ? 'strong' : 'weak', strong ? 22 : 15, target.upgrades),
          kind: 'damage',
        });
      }
      if (target.relic === 'bastion' && result.blocked && shot.cards.length > 1) {
        const amount = Math.floor(
          result.blocked * (shot.cards.length >= 3 ? BASTION_BATCH_REFLECT : BASTION_REFLECT),
        );
        reflected += amount;
        if (amount)
          effectEvent(next, targetSide, {
            source: 'relic:bastion',
            name: '折光反弹',
            value: amount,
            kind: 'damage',
          });
      }
      if (reflected) {
        const response = loseHealth(attacker, reflected);
        if (action) action.effects.reflected += response.health;
        addEvent(next, targetSide, 'hit', '反击', response.health + response.blocked, {
          kind: 'damage',
          source: 'rule:reflection',
          hpDamage: response.health,
          shieldDamage: response.blocked,
        });
      }
      if (target.relic === 'echo' && target.hp > 0 && target.hp * 2 < target.maxHp) {
        const gain = Math.min(ECHO_GAIN, ECHO_CAP - target.echo);
        target.echo += gain;
        if (gain)
          effectEvent(next, targetSide, {
            source: 'relic:echo',
            name: '余响蓄存',
            value: gain,
            kind: 'charge',
          });
      }
    }
  }
  for (const request of heals)
    if (next.fighters[request.side].hp > 0)
      // Leech already activated when its card was launched; defensive relics activate on impact.
      healFighter(next, request.side, request.amount, request.name, request.source, request.source.startsWith('relic:'), request.actionId);
  if (phaseTick % ticks(1000) === 0)
    for (const side of [0, 1] as const) {
      const fighter = next.fighters[side],
        source: Side = side === 0 ? 1 : 0;
      if (fighter.burn) {
        // Smother: behind a shield, flames only scorch a third of their stacks
        // from the shield, never the body, and burn out faster.
        const soaked = fighter.shield ? Math.min(fighter.shield, Math.ceil(fighter.burn / 3)) : 0;
        fighter.shield -= soaked;
        const health = soaked ? 0 : Math.min(fighter.hp, Math.max(0, fighter.burn - (fighter.performer === 'rosie' ? ROSIE_BURN_RESIST : 0)));
        fighter.hp -= health;
        creditStatus(next, side, 'burn', health, soaked);
        setStatus(fighter, 'burn', fighter.burn - 1 - (soaked ? SMOTHER_EXTRA_DECAY : 0));
        addEvent(next, source, 'dot', soaked ? '闷火' : '灼烧', health + soaked, {
          kind: 'burn',
          hpDamage: health,
          shieldDamage: soaked,
        });
      }
      if (fighter.poison) {
        // Fester: hoarded cards feed the poison, one extra point per five held.
        const damage = Math.min(fighter.hp, fighter.poison + Math.floor(fighter.hand.length / FESTER_HAND));
        fighter.hp -= damage;
        creditStatus(next, side, 'poison', damage, 0);
        // Poison outlasts burn but still ebbs: one stack every two seconds
        // (every TOXIN_EBB_S seconds for poison laid by a toxin-spoon carrier).
        const ebb = next.fighters[source].relic === 'toxin' ? TOXIN_EBB_S : POISON_EBB_S;
        if ((phaseTick / ticks(1000)) % ebb === 0) setStatus(fighter, 'poison', fighter.poison - 1);
        addEvent(next, source, 'dot', '剧毒', damage, {
          kind: 'poison',
          hpDamage: damage,
          shieldDamage: 0,
        });
      }
    }
  // Curtain call: both sides at once, after statuses, so a simultaneous
  // knockout is a draw rather than a seat advantage.
  const curtain = curtainDamage(phaseTick);
  if (curtain && phaseTick % ticks(CURTAIN_TICK_MS) === 0)
    for (const side of [0, 1] as const) {
      const fighter = next.fighters[side];
      if (!fighter.hp) continue;
      const amount = curtainFor(fighter.maxHp, curtain);
      const { health, blocked } = loseHealth(fighter, amount);
      addEvent(next, side === 0 ? 1 : 0, 'dot', '落幕', amount, {
        kind: 'curtain',
        hpDamage: health,
        shieldDamage: blocked,
      });
    }
  if (finish(next)) return;
  for (const side of [0, 1] as const) {
    const fighter = next.fighters[side];
    if (
      next.tick >= fighter.slowUntil &&
      fighter.hand.length < handLimit(fighter.relic) &&
      ++fighter.drawClock >= drawInterval(fighter.items, phaseTick)
    ) {
      fighter.drawClock = 0;
      // A round only fills free slots; draw() stops at the hand limit.
      for (let i = 0; i < DEAL_SIZE; i++) draw(next, side);
      fighter.peeking = false;
    }
  }
  // Stan's talent: the first time he drops below half, he gets off the bus and draws.
  for (const side of [0, 1] as const) {
    const fighter = next.fighters[side];
    if (fighter.performer === 'stan' && !fighter.talentUsed && fighter.hp > 0 && fighter.hp * 2 < fighter.maxHp) {
      fighter.talentUsed = true;
      for (let i = 0; i < ALIGHT_DRAW; i++) draw(next, side);
      effectEvent(next, side, { source: 'talent:stan', name: '中途下车', value: ALIGHT_DRAW, kind: 'sleight' });
    }
  }
  stepAutoPlayer(next);
  if (aiWantsSleight(next, 1)) sleightMutable(next, 1);
  const ai = next.ai,
    enemy = next.fighters[1];
  if (ai.intent.length && next.tick >= ai.releaseTick && next.tick >= next.nextLaunch[1]) {
    launchMutable(next, 1, ai.intent);
    ai.intent = [];
    ai.thinkTick = next.tick + ticks(aiThinkMs(ai.style));
  } else if (!ai.intent.length && next.tick >= ai.thinkTick && enemy.hand.length) {
    aiArrange(next, 1);
    const cards = recommendCards(enemy.hand, enemy.items, ai.style, {
      ...enemy,
      target: next.fighters[0],
      tick: next.tick,
      phaseTick,
    });
    if (aiReady(ai.style, cards, enemy)) {
      ai.intent = cards.map((card) => card.uid);
      ai.releaseTick = next.tick + ticks(1000);
    } else ai.thinkTick = next.tick + ticks(450);
  }
}
export function stepThrowDuel(state: ThrowDuel): ThrowDuel {
  if (state.status !== 'playing') return state;
  const next = structuredClone(state);
  stepThrowDuelInPlace(next);
  return next;
}
/** In-place launch for simulation tools working on their own copy. */
export const launchThrowInPlace = launchMutable;

export function fighterSleight(fighter: Pick<ThrowFighter, 'performer' | 'encore'>) {
  return fighter.performer === 'stan' && fighter.encore ? { id: 'encore' as const, name: '重新来过', text: '每次上场限一次：整手牌放到牌堆底，重新抽取同样张数。', cooldownMs: 0 } : PERFORMERS[fighter.performer ?? 'eli'].sleight;
}
export function setAutoPlay(state: ThrowDuel, enabled: boolean): ThrowDuel {
  if (state.status !== 'playing' || state.autoPlayer.enabled === enabled) return state;
  const next = structuredClone(state);
  next.autoPlayer = { enabled, intent: [], releaseTick: next.tick, thinkTick: next.tick + ticks(400) };
  return next;
}
/** Only visible hand and public opponent state enter valuation. Saturate unusable healing and status. */
function autoPlan(state: ThrowDuel, hand: PlayingCard[] = state.fighters[0].hand) {
  const f = state.fighters[0], target = state.fighters[1];
  let best: PlayingCard[] = [], value = -Infinity;
  for (let start = 0; start < hand.length; start++) for (let n = 1; n <= hand.length - start; n++) {
    const cards = hand.slice(start, start + n);
    if (!termsAllow(state.terms, cards)) continue;
    const p = previewThrow(cards, f.items, { ...f, target, tick: state.tick, phaseTick: duelRoundTick(state) });
    const damage = Math.max(0, p.damage - (n === 1 && target.items.includes('sequence') && target.hand.length >= FAN_PARRY_HAND ? Math.floor(p.damage / 2) : 0));
    const bypass = Math.floor(damage * p.pierce / 100);
    const shred = n === 1 ? f.performer === 'juno' ? JUNO_SHRED : SHRED : 1;
    const blocked = Math.min(Math.floor(target.shield / shred), damage - bypass);
    const health = Math.min(target.hp, damage - blocked);
    const healingRate = f.burn || f.woundUntil > state.tick ? .6 : 1;
    const heal = Math.min(f.maxHp - f.hp, Math.floor(p.heal * healingRate) + Math.floor(Math.floor(health * p.leech) * healingRate));
    const kindled = state.tick < target.fireproofUntil ? 0 : target.shield || blocked ? Math.floor(p.burn / 2) : p.burn;
    const reflection = n > 1 && target.relic === 'bastion' ? Math.floor(blocked * (n >= 3 ? BASTION_BATCH_REFLECT : BASTION_REFLECT)) : 0;
    const strongThorns = adjacentThrowItems(target.layout, 'thorns').some(({ id }) => itemDefinition(id).family === 'shield');
    const thorns = n >= 3 && target.items.includes('thorns') ? itemValue('thorns', strongThorns ? 'strong' : 'weak', strongThorns ? 22 : 15, target.upgrades) : 0;
    const safety = f.hp < f.maxHp * .35 ? 2 : 1;
    const healingUrgency = f.hp < f.maxHp * .35 ? 5 : f.hp < f.maxHp * .65 ? 2 : 1;
    const useful = health * 1.5 + blocked * .9 + heal * healingUrgency + Math.min(p.shield, Math.max(0, f.maxHp - f.shield)) * .55
      + Math.min(kindled, Math.max(0, 28 - target.burn)) * 3
      + Math.min(p.poison, Math.max(0, 24 - target.poison)) * (target.items.includes('mend') ? 2 : 4)
      + Math.min(p.cleansePoison, f.poison) * 4 + Math.min(p.cleanseBurn, f.burn) * 3 + p.growth * 5 + p.draw * 7 + p.slow * .004
      - (reflection + thorns) * safety + (health >= target.hp ? 10000 : 0);
    const rate = useful / (0.55 + n * throwLockMsPerCard(duelRoundTick(state)) / 1000);
    if (rate > value) { value = rate; best = cards; }
  }
  return { cards: best, value };
}
export function autoPlayCards(state: ThrowDuel): PlayingCard[] { return autoPlan(state).cards; }
/** Evaluate the same legal rank/suit sorts as the player, with the real 20-second arranging cooldown. */
function autoArrange(state: ThrowDuel) {
  const f = state.fighters[0];
  if (state.tick < f.nextReorder || f.hand.length < 3) return;
  let value = autoPlan(state).value * 1.05, mode: 'rank' | 'suit' | null = null;
  for (const candidate of ['rank', 'suit'] as const) {
    const hand = [...f.hand].sort((a, b) => candidate === 'rank' ? a.rank - b.rank || a.suit - b.suit : a.suit - b.suit || a.rank - b.rank);
    const next = autoPlan(state, hand).value;
    if (next > value) { value = next; mode = candidate; }
  }
  if (mode) {
    const arranged = arrangeThrow(state, 0, mode);
    if (arranged !== state) { f.hand = arranged.fighters[0].hand; f.nextReorder = arranged.fighters[0].nextReorder;
      effectEvent(state, 0, { source: 'rule:reorder', name: '整理手牌', value: REORDER_MS / 1000, kind: 'reorder' }); }
  }
}
function stepAutoPlayer(state: ThrowDuel) {
  const auto = state.autoPlayer;
  if (!auto.enabled || state.status !== 'playing' || state.intermission) return;
  if (auto.intent.length && state.tick >= auto.releaseTick && state.tick >= state.nextLaunch[0]) {
    launchMutable(state, 0, auto.intent); auto.intent = []; auto.thinkTick = state.tick + ticks(400);
  } else if (!auto.intent.length && state.tick >= auto.thinkTick) {
    if (aiWantsSleight(state, 0)) sleightMutable(state, 0);
    if (state.status !== 'playing' || state.intermission) return;
    autoArrange(state);
    auto.intent = autoPlayCards(state).map(({ uid }) => uid);
    auto.releaseTick = state.tick + ticks(600); auto.thinkTick = state.tick + ticks(600);
  }
}
