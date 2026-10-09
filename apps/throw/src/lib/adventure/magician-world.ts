import { ITEMS, RELICS, type ItemId, type RelicId, type Style } from '../cards/throw-loadout.ts';
import { ENCHANTS, validDeckBook, type DeckBook } from '../cards/throw-enchant.ts';
import type { DuelTerms } from '../cards/throw-duel';
import {
  ADVENTURE_VERSION,
  FLAGS,
  type AdventureState,
  type BattleDefinition,
  type BattleId,
  type CharacterId,
  type Choice,
  type Dialogue,
  type DossierEntry,
  type FlagId,
  type Hotspot,
  type MapDefinition,
  type MapId,
  type Objective,
  type OwnedVariant,
  type PanelId,
  type Reward,
  type ShowId,
} from './adventure-types.ts';
import {
  GRAYWICK_BATTLES,
  GRAYWICK_CAST,
  GRAYWICK_DIALOGUES,
  GRAYWICK_MAPS,
  graywickKit,
  graywickObjective,
  graywickTalk,
} from './graywick.ts';
import {
  BRIDGEPORT_BATTLES,
  BRIDGEPORT_CAST,
  BRIDGEPORT_DIALOGUES,
  BRIDGEPORT_MAPS,
  bridgeportObjective,
  bridgeportTalk,
  HOBBS_THINGS,
  SHOP,
  SHOWS,
} from './bridgeport.ts';

export * from './adventure-types.ts';
export { STARTER_ITEMS, MENTOR_GIFT, MIA_GIFT } from './graywick.ts';
export { SHOP, SHOWS, GOSSIP, GROUP, isFinalist, morningDone, showsWon } from './bridgeport.ts';

export const WALK_TICK_MS = 20;
const WALK_DISTANCE = 5;

export const MAPS: Record<MapId, MapDefinition> = { ...GRAYWICK_MAPS, ...BRIDGEPORT_MAPS };
export const CHARACTERS: Record<CharacterId, { name: string; role: string }> = {
  ...GRAYWICK_CAST,
  ...BRIDGEPORT_CAST,
  narrator: { name: '旁白', role: '' },
};
/** The narrator's caption follows the act. */
export const narratorFor = (act: number) =>
  act === 2
    ? { name: '布里奇波特 · 周四', role: '第二幕 · 没人替你买票' }
    : { name: '格雷维克 · 黄昏', role: '第一幕 · 让他们记住你的名字' };
export const DIALOGUES: Record<string, Dialogue> = { ...GRAYWICK_DIALOGUES, ...BRIDGEPORT_DIALOGUES };
export const BATTLES: Record<BattleId, BattleDefinition> = {
  ...GRAYWICK_BATTLES,
  ...BRIDGEPORT_BATTLES,
} as Record<BattleId, BattleDefinition>;
export const ACTS = [
  { act: 1, number: '第一幕', title: '让他们记住你的名字', town: '格雷维克', start: 'street' as MapId },
  { act: 2, number: '第二幕', title: '没人替你买票', town: '布里奇波特', start: 'bridgeport' as MapId },
] as const;
const ARRIVAL_X = 260;

const freshFlags = () => Object.fromEntries(FLAGS.map((flag) => [flag, false])) as Record<FlagId, boolean>;
export function createAdventure(seed: number, act: 1 | 2 = 1): AdventureState {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError('Adventure seed must be an unsigned 32-bit integer');
  const state: AdventureState = {
    version: ADVENTURE_VERSION,
    seed,
    tick: 0,
    act: 1,
    map: 'street',
    player: { x: 220, facing: 1, walkTicks: 0 },
    mode: 'dialogue',
    dialogue: { id: 'opening', step: 0 },
    panel: null,
    battle: null,
    nextBattleId: 1,
    flags: freshFlags(),
    fee: 0,
    owned: { items: [], relics: [], variants: [] },
    won: [],
    found: [],
    dossier: {},
  };
  if (act === 1) return state;
  // Starting at act two (chapter select, tests): act one is taken as played and won.
  for (const flag of ['trained', 'invitation', 'ticket', 'miaMet', 'coachedQualifier', 'departed'] as const)
    state.flags[flag] = true;
  state.won = ['practice', 'qualifier'];
  return beginActTwo(state);
}
function beginActTwo(state: AdventureState): AdventureState {
  return {
    ...state,
    act: 2,
    map: 'bridgeport',
    player: { x: ARRIVAL_X, facing: 1, walkTicks: 0 },
    mode: 'dialogue',
    dialogue: { id: 'bp-arrival', step: 0 },
    panel: null,
    battle: null,
  };
}
/** From the act-complete card: board the bus to the next town. */
export function travelOn(state: AdventureState): AdventureState {
  if (state.mode !== 'complete') return state;
  if (state.act === 1 && state.flags.departed) return beginActTwo(state);
  return state;
}
export function keepExploring(state: AdventureState): AdventureState {
  return state.mode === 'complete' ? { ...state, mode: 'explore' } : state;
}

/* ───────────────────────── Kit and collection ───────────────────────── */
const unique = <T,>(list: T[]) => [...new Set(list)];
export function unlockedKit(state: AdventureState): { items: ItemId[]; relics: RelicId[] } {
  const base = graywickKit(state);
  return {
    items: unique([...base.items, ...state.owned.items]),
    relics: unique([...base.relics, ...state.owned.relics]),
  };
}
export const ownedVariants = (state: AdventureState) => state.owned.variants;
/** The deck book entries this hero is allowed to use: owned variants only. */
export function filterBook(state: AdventureState, book: DeckBook): DeckBook {
  const owned = new Set(state.owned.variants);
  const kept = Object.fromEntries(Object.entries(book).filter(([key, id]) => owned.has(`${key}:${id}`)));
  return validDeckBook(kept) ? kept : {};
}
function grant(state: AdventureState, reward: Reward | undefined): AdventureState {
  if (!reward) return state;
  return {
    ...state,
    fee: state.fee + (reward.fee ?? 0),
    owned: {
      items: unique([...state.owned.items, ...(reward.items ?? [])]),
      relics: unique([...state.owned.relics, ...(reward.relics ?? [])]),
      variants: unique([...state.owned.variants, ...(reward.variants ?? [])]),
    },
  };
}

/* ───────────────────────── Walking and meeting ───────────────────────── */
export function walkAdventure(state: AdventureState, direction: -1 | 0 | 1, ticks: number): AdventureState {
  if (
    state.mode !== 'explore' ||
    ![-1, 0, 1].includes(direction) ||
    !Number.isInteger(ticks) ||
    ticks < 1 ||
    ticks > 5 ||
    direction === 0
  )
    return state;
  const x = Math.max(48, Math.min(MAPS[state.map].width - 48, state.player.x + direction * WALK_DISTANCE * ticks));
  return {
    ...state,
    tick: state.tick + ticks,
    player: { x, facing: direction, walkTicks: state.player.walkTicks + (x !== state.player.x ? ticks : 0) },
  };
}
/** People and things on this map right now. */
export function visibleHotspots(state: AdventureState): Hotspot[] {
  return MAPS[state.map].hotspots.filter((spot) => !spot.when || spot.when(state));
}
const reach = (spot: Hotspot) => (spot.kind === 'npc' ? 130 : 95);
export function nearbyHotspot(state: AdventureState): Hotspot | null {
  if (state.mode !== 'explore') return null;
  return (
    visibleHotspots(state)
      .filter((spot) => Math.abs(spot.x - state.player.x) <= reach(spot))
      .sort(
        (a, b) =>
          Math.abs(a.x - state.player.x) - Math.abs(b.x - state.player.x) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )[0] ?? null
  );
}
function openDialogue(state: AdventureState, id: string): AdventureState {
  return { ...state, mode: 'dialogue', dialogue: { id, step: 0 }, panel: null };
}
function openPanel(state: AdventureState, panel: PanelId): AdventureState {
  return { ...state, mode: 'panel', panel, dialogue: null };
}
export function interactAdventure(state: AdventureState, id?: string): AdventureState {
  if (state.mode !== 'explore') return state;
  const spot = id ? visibleHotspots(state).find((entry) => entry.id === id) : nearbyHotspot(state);
  if (!spot || Math.abs(spot.x - state.player.x) > reach(spot)) return state;
  if (spot.target && spot.spawn !== undefined)
    return { ...state, map: spot.target, player: { ...state.player, x: spot.spawn, walkTicks: 0 } };
  const talk = MAPS[state.map].act === 1 ? graywickTalk(state, spot.id) : bridgeportTalk(state, spot.id);
  if (!talk) return state;
  if (talk.startsWith('panel:')) return openPanel(state, talk.slice(6) as PanelId);
  return openDialogue(state, talk);
}

/* ───────────────────────── Dialogue ───────────────────────── */
export function advanceDialogue(state: AdventureState): AdventureState {
  if (state.mode !== 'dialogue' || !state.dialogue) return state;
  const { id, step } = state.dialogue;
  const script = DIALOGUES[id];
  if (step < script.lines.length - 1) return { ...state, dialogue: { id, step: step + 1 } };
  if (script.choices) return state;
  return closeDialogue(state);
}
function applyEffect(state: AdventureState, script: Dialogue): AdventureState {
  const effect = script.effect;
  if (!effect) return state;
  let next = state;
  if (effect.reward && !(effect.once && state.flags[effect.once])) next = grant(next, effect.reward);
  const set = [...(effect.set ?? []), ...(effect.once ? [effect.once] : [])];
  if (set.length) next = { ...next, flags: { ...next.flags, ...Object.fromEntries(set.map((flag) => [flag, true])) } };
  if (effect.find && !next.found.includes(effect.find)) next = { ...next, found: [...next.found, effect.find] };
  return next;
}
function closeDialogue(state: AdventureState): AdventureState {
  const script = state.dialogue ? DIALOGUES[state.dialogue.id] : undefined;
  const next = script ? applyEffect(state, script) : state;
  return { ...next, mode: script?.effect?.complete ? 'complete' : 'explore', dialogue: null };
}
/** Choices only exist on a dialogue's last line. Unknown or early choices change nothing. */
export function chooseDialogue(state: AdventureState, choiceId: string): AdventureState {
  if (state.mode !== 'dialogue' || !state.dialogue) return state;
  const script = DIALOGUES[state.dialogue.id];
  const choice: Choice | undefined = script.choices?.find((entry) => entry.id === choiceId);
  if (state.dialogue.step !== script.lines.length - 1 || !choice) return state;
  const action = choice.action;
  if (action.type === 'close') return closeDialogue(state);
  // Every other choice also counts as having heard the conversation out.
  const heard = applyEffect(state, script);
  if (action.type === 'panel') return openPanel(heard, action.panel);
  if (action.type === 'pay') {
    if (heard.fee < action.price) return openDialogue(heard, action.poor);
    return openDialogue({ ...heard, fee: heard.fee - action.price, flags: { ...heard.flags, [action.flag]: true } }, action.then);
  }
  return startBattle(heard, action.battle);
}

/* ───────────────────────── Panels: shop, shows, dossier ───────────────────────── */
export function closePanel(state: AdventureState): AdventureState {
  return state.mode === 'panel' ? { ...state, mode: 'explore', panel: null } : state;
}
export const offerStocked = (state: AdventureState, offerId: string) => {
  const offer = SHOP.find((entry) => entry.id === offerId);
  return Boolean(offer && (!offer.stocked || offer.stocked(state)));
};
export function offerOwned(state: AdventureState, offerId: string) {
  const offer = SHOP.find((entry) => entry.id === offerId);
  if (!offer) return false;
  if (offer.kind === 'item') return unlockedKit(state).items.includes(offer.ref as ItemId);
  if (offer.kind === 'relic') return unlockedKit(state).relics.includes(offer.ref as RelicId);
  return state.owned.variants.includes(offer.ref);
}
/** Atomic: pays and hands over, or changes nothing. */
export function buyOffer(state: AdventureState, offerId: string): AdventureState {
  const offer = SHOP.find((entry) => entry.id === offerId);
  if (
    state.mode !== 'panel' ||
    state.panel !== 'shop' ||
    !offer ||
    !offerStocked(state, offerId) ||
    offerOwned(state, offerId) ||
    state.fee < offer.price
  )
    return state;
  const reward: Reward =
    offer.kind === 'item'
      ? { items: [offer.ref as ItemId] }
      : offer.kind === 'relic'
        ? { relics: [offer.ref as RelicId] }
        : { variants: [offer.ref] };
  return grant({ ...state, fee: state.fee - offer.price }, reward);
}
export function startShow(state: AdventureState, show: ShowId): AdventureState {
  if (state.mode !== 'panel' || state.panel !== 'shows' || !SHOWS.some((entry) => entry.id === show)) return state;
  return startBattle({ ...state, mode: 'explore', panel: null }, `show-${show}`);
}

/* ───────────────────────── Battles ───────────────────────── */
function startBattle(state: AdventureState, kind: BattleId): AdventureState {
  const definition = BATTLES[kind];
  if (!definition) return state;
  if (kind === 'qualifier' && !state.flags.invitation) return state;
  const id = state.nextBattleId;
  const practiceAgain = kind === 'practice' && state.flags.trained;
  return {
    ...state,
    mode: 'battle',
    dialogue: null,
    panel: null,
    nextBattleId: id + 1,
    battle: {
      id,
      kind,
      seed: (state.seed + id * 7919) >>> 0,
      enemyStyle: practiceAgain ? 'quick' : definition.style,
      coach:
        kind === 'practice'
          ? practiceAgain
            ? null
            : 'lesson'
          : kind === 'qualifier' && !state.flags.ticket && !state.flags.coachedQualifier
            ? 'qualifier'
            : null,
      returnMap: state.map,
      returnX: state.player.x,
    },
  };
}
/** Everything the duel table needs for the current battle. */
export function battleSetup(state: AdventureState): {
  title: string;
  opponent: CharacterId;
  enemyStyle: Style;
  enemyItems?: ItemId[];
  enemyRelic?: RelicId | null;
  enemyBook?: DeckBook;
  terms?: DuelTerms;
  available: { items: ItemId[]; relics: RelicId[] };
  variants: OwnedVariant[];
  forced?: { items: ItemId[]; relic: RelicId | null };
  tip?: string;
  rule?: string;
} | null {
  if (!state.battle) return null;
  const definition = BATTLES[state.battle.kind];
  const kit = unlockedKit(state);
  const only = definition.kit?.only;
  const banned = definition.kit?.banFamilies ?? [];
  const available = only
    ? { items: [...only.items], relics: only.relic ? [only.relic] : [] }
    : {
        items: kit.items.filter((id) => !banned.includes(ITEMS.find((item) => item.id === id)!.family)),
        relics: kit.relics,
      };
  const practiceAgain = state.battle.kind === 'practice' && state.battle.enemyStyle === 'quick';
  const show = SHOWS.find((entry) => `show-${entry.id}` === state.battle!.kind);
  return {
    title: definition.title,
    opponent: definition.opponent,
    enemyStyle: state.battle.enemyStyle,
    ...(definition.items && !practiceAgain ? { enemyItems: [...definition.items] } : {}),
    ...(definition.relic !== undefined ? { enemyRelic: definition.relic } : {}),
    ...(definition.book ? { enemyBook: { ...definition.book } } : {}),
    ...(definition.terms ? { terms: structuredClone(definition.terms) } : {}),
    available,
    variants: [...state.owned.variants],
    ...(only ? { forced: { items: [...only.items], relic: only.relic } } : {}),
    ...(definition.tip ? { tip: definition.tip } : {}),
    ...(show ? { rule: show.rule } : {}),
  };
}
const validTally = (report: unknown): report is { suits: number[]; kinds: number[] } => {
  const r = report as { suits?: unknown; kinds?: unknown };
  const counts = (value: unknown, length: number) =>
    Array.isArray(value) && value.length === length && value.every((n) => Number.isInteger(n) && n >= 0 && n < 10000);
  return Boolean(r) && counts(r.suits, 4) && counts(r.kinds, 9);
};
/**
 * Only an acknowledged finished duel can grant progress. Abandoning is separate.
 * `report` is what the opponent actually threw, for the dossier.
 */
export function finishAdventureBattle(
  state: AdventureState,
  battleId: number,
  winner: 0 | 1 | 'draw',
  report?: { suits: number[]; kinds: number[] },
): AdventureState {
  if (state.mode !== 'battle' || !state.battle || state.battle.id !== battleId || ![0, 1, 'draw'].includes(winner))
    return state;
  const battle = state.battle;
  const definition = BATTLES[battle.kind];
  const before = state.won.includes(battle.kind);
  let next: AdventureState = {
    ...state,
    map: battle.returnMap,
    player: { ...state.player, x: battle.returnX },
    battle: null,
    flags: {
      ...state.flags,
      ...Object.fromEntries((definition.afterFlags ?? []).map((flag) => [flag, true])),
      ...(winner === 0 ? Object.fromEntries((definition.winFlags ?? []).map((flag) => [flag, true])) : {}),
    },
  };
  if (winner === 0 && !before) next = grant({ ...next, won: [...next.won, battle.kind] }, definition.reward);
  // Dossier: what this opponent showed you (Reed's lessons are not filed).
  const opponent = definition.opponent;
  if (opponent !== 'reed') {
    const old: DossierEntry = next.dossier[opponent] ?? {
      duels: 0,
      wins: 0,
      losses: 0,
      suits: [0, 0, 0, 0],
      kinds: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    const tally = validTally(report) ? report : { suits: [0, 0, 0, 0], kinds: [0, 0, 0, 0, 0, 0, 0, 0, 0] };
    next = {
      ...next,
      dossier: {
        ...next.dossier,
        [opponent]: {
          duels: old.duels + 1,
          wins: old.wins + (winner === 0 ? 1 : 0),
          losses: old.losses + (winner === 1 ? 1 : 0),
          suits: old.suits.map((n, i) => n + tally.suits[i]) as DossierEntry['suits'],
          kinds: old.kinds.map((n, i) => n + tally.kinds[i]),
        },
      },
    };
  }
  const rematch = definition.act === 2 && before;
  const dialogue =
    winner === 0
      ? rematch
        ? 'rematch-win'
        : definition.win
      : winner === 1
        ? rematch
          ? 'rematch-loss'
          : definition.loss
        : (definition.draw ?? (rematch ? 'rematch-loss' : definition.loss));
  return openDialogue(next, dialogue);
}
export function abandonAdventureBattle(state: AdventureState): AdventureState {
  if (state.mode !== 'battle' || !state.battle) return state;
  return {
    ...state,
    mode: 'explore',
    map: state.battle.returnMap,
    player: { ...state.player, x: state.battle.returnX },
    battle: null,
  };
}

export function adventureObjective(state: AdventureState): Objective {
  return state.act === 1 ? graywickObjective(state) : bridgeportObjective(state);
}

/* ───────────────────────── Saves ───────────────────────── */
export const SAVE_KEY = 'aibazaar.throw.adventure';
export const SAVE_PRODUCT = 'throw-adventure';
/** A save envelope; the adapter adds no clock or randomness. */
export function serializeAdventure(state: AdventureState, extra: Record<string, unknown> = {}) {
  return JSON.stringify({ product: SAVE_PRODUCT, version: ADVENTURE_VERSION, state, ...extra });
}
const isInt = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
/**
 * Restores a save, or returns null for anything from another product, another
 * rules version, or a shape this version cannot vouch for. A battle in
 * progress is not resumable: the hero is put back where the duel began.
 */
export function restoreAdventure(json: string): { state: AdventureState; envelope: Record<string, unknown> } | null {
  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(json);
  } catch {
    return null;
  }
  if (!envelope || envelope.product !== SAVE_PRODUCT || envelope.version !== ADVENTURE_VERSION) return null;
  const s = envelope.state as AdventureState;
  if (!s || s.version !== ADVENTURE_VERSION || !isInt(s.seed, 0, 0xffffffff) || !isInt(s.tick)) return null;
  if (![1, 2].includes(s.act) || !(s.map in MAPS) || MAPS[s.map].act !== s.act) return null;
  if (!s.player || !isInt(s.player.x, 0, MAPS[s.map].width) || ![-1, 1].includes(s.player.facing) || !isInt(s.player.walkTicks))
    return null;
  if (!['explore', 'dialogue', 'battle', 'panel', 'complete'].includes(s.mode)) return null;
  if (s.mode === 'dialogue' && !(s.dialogue && s.dialogue.id in DIALOGUES && isInt(s.dialogue.step, 0, DIALOGUES[s.dialogue.id].lines.length - 1)))
    return null;
  if (s.mode === 'panel' && !['shop', 'shows', 'dossier'].includes(s.panel as string)) return null;
  if (s.mode === 'battle' && !(s.battle && s.battle.kind in BATTLES && s.battle.returnMap in MAPS)) return null;
  if (!isInt(s.nextBattleId, 1) || !isInt(s.fee)) return null;
  if (!s.flags || FLAGS.some((flag) => typeof s.flags[flag] !== 'boolean') || Object.keys(s.flags).length !== FLAGS.length)
    return null;
  const items = new Set(ITEMS.map((item) => item.id)),
    relics = new Set(RELICS.map((relic) => relic.id)),
    enchants = new Set(ENCHANTS.map((entry) => entry.id));
  if (
    !s.owned ||
    !Array.isArray(s.owned.items) ||
    !s.owned.items.every((id) => items.has(id)) ||
    !Array.isArray(s.owned.relics) ||
    !s.owned.relics.every((id) => relics.has(id)) ||
    !Array.isArray(s.owned.variants) ||
    !s.owned.variants.every((entry) => {
      const [key, id] = String(entry).split(':');
      return enchants.has(id) && validDeckBook({ [key]: id });
    })
  )
    return null;
  if (!Array.isArray(s.won) || !s.won.every((id) => id in BATTLES)) return null;
  if (!Array.isArray(s.found) || !s.found.every((id) => (HOBBS_THINGS as readonly string[]).includes(id))) return null;
  if (!s.dossier || typeof s.dossier !== 'object' || !Object.keys(s.dossier).every((id) => id in CHARACTERS)) return null;
  let state: AdventureState = structuredClone(s);
  if (state.mode === 'battle') state = abandonAdventureBattle(state);
  return { state, envelope };
}
