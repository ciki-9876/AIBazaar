import type { ItemId, RelicId, Style } from '../cards/throw-loadout';
import type { DeckBook } from '../cards/throw-enchant';
import type { DuelTerms } from '../cards/throw-duel';
import type { PerformerId } from '../cards/throw-performer';

/**
 * Shared shapes for the walkable story. Content modules (one per act) only
 * describe data; the engine in magician-world.ts applies it. Everything here
 * is deterministic: no clocks, no fresh randomness.
 */
export const ADVENTURE_VERSION = 'magician-adventure-v6';
export type ActId = 1 | 2;
export type MapId =
  | 'street'
  | 'workshop'
  | 'theatre'
  | 'bridgeport'
  | 'goose'
  | 'curios'
  | 'thursday';
export type CharacterId =
  | 'eli'
  | 'reed'
  | 'mia'
  | 'felix'
  | 'narrator'
  | 'juno'
  | 'hobbs'
  | 'ada'
  | 'bea'
  | 'stan'
  | 'dodd'
  | 'doris'
  | 'pettigrew'
  | 'agnes'
  | 'rosie'
  | 'basil'
  | 'pike';
/** Story flags. Act one keeps its original names. */
export const FLAGS = [
  'trained',
  'invitation',
  'ticket',
  'miaMet',
  'coachedQualifier',
  'departed',
  // Act two
  'arrived',
  'metDoris',
  'metPettigrew',
  'metJuno',
  'metDodd',
  'buskIntro',
  'shopIntro',
  'mainHall',
  'champion',
  'hobbsAsked',
  'hobbsReady',
  'stanAsked',
  'stanPaper',
  'stanKey',
  'stanDone',
  'sistersOffered',
  'leftBridgeport',
  // v6 intel (ADR-0059): the hero has been caught out by a false rumour once.
  'falseIntelSeen',
  'doddCorrection',
] as const;
export type FlagId = (typeof FLAGS)[number];
export type PanelId = 'shop' | 'shows' | 'dossier';
export type ShowId = 'double' | 'single' | 'tea' | 'quick' | 'borrowed' | 'noshield';
export type BattleId =
  | 'practice'
  | 'qualifier'
  | 'ada'
  | 'bea'
  | 'agnes'
  | 'rosie'
  | 'basil'
  | 'pike'
  | 'juno'
  | 'hobbs'
  | 'sisters'
  | `show-${ShowId}`;
/** A variant the hero owns: `${suit}-${rank}:${enchantId}`. */
export type OwnedVariant = string;
export type Reward = {
  fee?: number;
  items?: ItemId[];
  relics?: RelicId[];
  variants?: OwnedVariant[];
  /** v5: affinity gained with these people (first win only, like everything here). */
  affinity?: Partial<Record<CharacterId, number>>;
};
/** v6 time of day (ADR-0059 weekly schedule): morning, afternoon, evening. */
export type Slot = 0 | 1 | 2;
export type MealTier = 'plain' | 'home' | 'feast';
/** v6 intel on one battle: confirmed units, rumours heard, sources used. */
export type IntelRecord = {
  /** Confirmed units: 'style', 'relic', 'performer', 'book', `item:${ItemId}`. */
  seen: string[];
  /** Rumour ids heard about this battle. */
  heard: string[];
  /** Rumour ids proven false after the duel. */
  debunked: string[];
  /** Intel sources already used on this battle. */
  sources: IntelSource[];
};
export type IntelSource = 'paper' | 'pub' | 'watch' | 'backstage';
/** A rumour about a battle. Its truth is fixed in content, so intel stays deterministic. */
export type Rumour = {
  id: string;
  source: 'paper' | 'pub';
  /** The unit it is about: 'relic' or `item:${ItemId}`. */
  unit: string;
  text: string;
  /** Whether the claim is true; false rumours are debunked after the duel. */
  truth: boolean;
};
export type DossierEntry = {
  duels: number;
  wins: number;
  losses: number;
  /** Cards of each suit the opponent threw at you. */
  suits: [number, number, number, number];
  /** Throws per poker kind (0 high card … 8 straight flush). */
  kinds: number[];
};
export type AdventureState = {
  version: typeof ADVENTURE_VERSION;
  seed: number;
  tick: number;
  act: ActId;
  map: MapId;
  player: { x: number; facing: -1 | 1; walkTicks: number };
  mode: 'explore' | 'dialogue' | 'battle' | 'panel' | 'complete';
  dialogue: { id: string; step: number } | null;
  panel: PanelId | null;
  battle: {
    id: number;
    kind: BattleId;
    seed: number;
    enemyStyle: Style;
    coach: CoachScript | null;
    returnMap: MapId;
    returnX: number;
  } | null;
  nextBattleId: number;
  flags: Record<FlagId, boolean>;
  /** 演出费: earned on stage, spent at Hobbs's. */
  fee: number;
  owned: { items: ItemId[]; relics: RelicId[]; variants: OwnedVariant[] };
  /** Battles whose first-win reward has been paid. */
  won: BattleId[];
  /** Hobbs's lost things the hero has picked up. */
  found: string[];
  dossier: Partial<Record<CharacterId, DossierEntry>>;
  /** v5 troupe (ADR-0057): who tours with the hero. Eli is always first. */
  troupe: PerformerId[];
  /** v5: how well the hero knows people, 0–100. */
  affinity: Partial<Record<CharacterId, number>>;
  /** v5: one-time affinity moments already spent (a stew is only a first stew once). */
  bonds: string[];
  /** v6 clock (act two on): days since arrival and the time of day. */
  clock: { day: number; slot: Slot };
  /** v6 stage experience (台龄 points) per troupe member. */
  stage: Partial<Record<PerformerId, number>>;
  /** v6 名气: the troupe's fame, added to every member's presence. */
  fame: number;
  /** v6 mood per troupe member: 0 罢演 … 4 兴奋. */
  mood: Partial<Record<PerformerId, number>>;
  /** v6 lodging in the current town (null in act one). */
  lodging: string | null;
  meals: MealTier;
  /** v6 weeks of unpaid rent. */
  arrears: number;
  /** v6 members gone home for a few square meals, and the day they come back. */
  away: Partial<Record<PerformerId, number>>;
  /** v6 once-a-week moments already used this week (tea, wins, busking). */
  week: string[];
  /** v6 collectibles (keepsakes): no rules, just memories. */
  keepsakes: string[];
  /** v6 what the hero knows about each battle. */
  intel: Partial<Record<BattleId, IntelRecord>>;
  /** v6 a message to show once (the Sunday ledger, a correction). */
  notice: string[] | null;
};
/** Guided duel scripts; presentation-only coaching layered over real rules. */
export type CoachScript = 'lesson' | 'qualifier';
export type Hotspot = {
  id: string;
  x: number;
  label: string;
  kind: 'door' | 'npc' | 'bus' | 'pickup' | 'board';
  character?: CharacterId;
  target?: MapId;
  spawn?: number;
  /** Shown only while this holds (e.g. people who move as the story goes on). */
  when?: (state: AdventureState) => boolean;
};
export type MapDefinition = {
  act: ActId;
  name: string;
  subtitle: string;
  image: string;
  width: number;
  height: number;
  floor: number;
  cameraY: number;
  hotspots: readonly Hotspot[];
};
export type DialogueLine = { speaker: CharacterId; text: string };
export type ChoiceAction =
  | { type: 'close' }
  | { type: 'battle'; battle: BattleId }
  | { type: 'panel'; panel: PanelId }
  /** Pay `price` and set `flag`, then continue with `nextDialogue`; without the money, `poor`. */
  | { type: 'pay'; price: number; flag?: FlagId; nextDialogue: string; poor: string }
  /** v5: carry on with another dialogue (its effect applies when it closes). */
  | { type: 'goto'; nextDialogue: string };
export type Choice = { id: string; label: string; action: ChoiceAction };
export type DialogueEffect = {
  set?: readonly FlagId[];
  /** Paid only once: skipped when `once` is already set (and then sets it). */
  reward?: Reward;
  once?: FlagId;
  /** Pick up one of Hobbs's lost things. */
  find?: string;
  /** v5: a one-time affinity moment; `id` makes it count only once. */
  affinity?: { who: CharacterId; amount: number; id: string };
  /** v5: this performer joins the troupe. */
  recruit?: PerformerId;
  complete?: boolean;
};
export type Dialogue = {
  lines: readonly DialogueLine[];
  choices?: readonly Choice[];
  effect?: DialogueEffect;
};
export type BattleDefinition = {
  act: ActId;
  title: string;
  opponent: CharacterId;
  style: Style;
  /** Replace the preset kit; omitted means the full preset. */
  items?: ItemId[];
  relic?: RelicId | null;
  book?: DeckBook;
  /** v10: the opponent takes the stage as this performer (talent + sleight). */
  performer?: PerformerId;
  terms?: DuelTerms;
  /** Restricts the hero's trunk for this duel. */
  kit?: { only?: { items: ItemId[]; relic: RelicId | null }; banFamilies?: string[] };
  reward?: Reward;
  win: string;
  loss: string;
  draw?: string;
  /** Flags set on a win (every time; idempotent). */
  winFlags?: FlagId[];
  /** Flags set whatever the result, once the duel is acknowledged. */
  afterFlags?: FlagId[];
  /** Hint shown above the workbench. */
  tip?: string;
  /** v6 the opponent's presence cap; omitted uses the act's default. */
  presence?: number;
  /** v6 fame on the first win. */
  fame?: number;
  /** v6 a town's final opponent (more stage experience). */
  boss?: boolean;
  /** v6 a formal performance: the opponent's kit is hidden until scouted. Street shows are half hidden. */
  formal?: boolean;
};
export type Objective = { title: string; detail: string; target: string };
export type ShowDefinition = {
  id: ShowId;
  title: string;
  rule: string;
  blurb: string;
};
export type ShopOffer = {
  id: string;
  kind: 'item' | 'relic' | 'variant';
  /** ItemId, RelicId or OwnedVariant. */
  ref: string;
  price: number;
  /** Stocked only once this holds. */
  stocked?: (state: AdventureState) => boolean;
  note: string;
};
