import type { ItemId, RelicId, Style } from '../cards/throw-loadout';
import type { DeckBook } from '../cards/throw-enchant';
import type { DuelTerms } from '../cards/throw-duel';

/**
 * Shared shapes for the walkable story. Content modules (one per act) only
 * describe data; the engine in magician-world.ts applies it. Everything here
 * is deterministic: no clocks, no fresh randomness.
 */
export const ADVENTURE_VERSION = 'magician-adventure-v4';
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
  | { type: 'pay'; price: number; flag: FlagId; nextDialogue: string; poor: string };
export type Choice = { id: string; label: string; action: ChoiceAction };
export type DialogueEffect = {
  set?: readonly FlagId[];
  /** Paid only once: skipped when `once` is already set (and then sets it). */
  reward?: Reward;
  once?: FlagId;
  /** Pick up one of Hobbs's lost things. */
  find?: string;
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
