import { PERFORMERS, isPerformer, type PerformerId } from '../cards/throw-performer.ts';
import { ITEMS, PRESETS, RELICS, type ItemId, type RelicId, type Style } from '../cards/throw-loadout.ts';
import { ENCHANTS, validDeckBook, type DeckBook } from '../cards/throw-enchant.ts';
import { MAX_HP, type DuelTerms } from '../cards/throw-duel.ts';
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
  type IntelRecord,
  type IntelSource,
  type MealTier,
  type Slot,
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
  BOND_IDS,
  INTEL_PRICES,
  isFinalist,
  LODGINGS,
  RECRUITS,
  RUMOURS,
  SHOP,
  SHOWS,
  GROUP,
} from './bridgeport.ts';

export * from './adventure-types.ts';
export { STARTER_ITEMS, MENTOR_GIFT, MIA_GIFT, POST_QUALIFIER_ITEMS } from './graywick.ts';
export { SHOP, SHOWS, GOSSIP, GROUP, isFinalist, morningDone, showsWon, RECRUITS, BOND_IDS, LODGINGS, INTEL_PRICES, RUMOURS } from './bridgeport.ts';
export type { Lodging } from './bridgeport.ts';

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
    troupe: ['eli'],
    affinity: {},
    bonds: [],
    clock: { day: 0, slot: 0 },
    stage: { eli: 0 },
    fame: START_FAME,
    mood: { eli: MOOD_DEFAULT },
    lodging: null,
    meals: 'home',
    arrears: 0,
    away: {},
    week: [],
    keepsakes: [],
    intel: {},
    notice: null,
  };
  if (act === 1) return state;
  // Starting at act two (chapter select, tests): act one is taken as played and won.
  for (const flag of ['trained', 'invitation', 'ticket', 'miaMet', 'coachedQualifier', 'departed'] as const)
    state.flags[flag] = true;
  state.won = ['practice', 'qualifier'];
  state.stage = { eli: battleStage('qualifier', true) };
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
    // v6: the week starts on arrival (a Thursday morning), sleeping on Stan's bus.
    clock: { day: 0, slot: 0 },
    lodging: LODGINGS[0].id,
    meals: 'home',
    arrears: 0,
    week: [],
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
export const AFFINITY_MAX = 100;
const addAffinity = (state: AdventureState, who: CharacterId, amount: number): AdventureState => ({
  ...state,
  affinity: { ...state.affinity, [who]: Math.min(AFFINITY_MAX, (state.affinity[who] ?? 0) + amount) },
});
function grant(state: AdventureState, reward: Reward | undefined): AdventureState {
  if (!reward) return state;
  let next = state;
  for (const [who, amount] of Object.entries(reward.affinity ?? {}))
    next = addAffinity(next, who as CharacterId, amount ?? 0);
  state = next;
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

/* ───────────────── v6 life: clock, presence, lodging, meals, mood (ADR-0059) ───────────────── */
/** 底子 starts here; each stage level adds PRESENCE_PER_LEVEL. */
export const BASE_PRESENCE = 280;
export const PRESENCE_PER_LEVEL = 5;
/** 名气 the hero already has at home: 280 + 40 = the classic 320. */
export const START_FAME = 40;
export const STAGE_MAX_LEVEL = 20;
/** Stage experience needed to reach a level: 0, 5, 15, 30, 50 … (5 × n(n−1)/2). */
export const stageThreshold = (level: number) => (5 * level * (level - 1)) / 2;
export function stageLevel(xp: number) {
  let level = 1;
  while (level < STAGE_MAX_LEVEL && xp >= stageThreshold(level + 1)) level++;
  return level;
}
/** Mood: the lowest refuses the stage; the rest add a presence percentage. */
export const MOODS = [
  { name: '罢演', presence: 0 },
  { name: '低落', presence: -8 },
  { name: '平常', presence: 0 },
  { name: '愉快', presence: 4 },
  { name: '兴奋', presence: 8 },
] as const;
export const MOOD_DEFAULT = 2;
export const MOOD_MAX = 4;
/** Eli never refuses his own show: his mood bottoms out at 低落. */
export const ELI_MOOD_FLOOR = 1;
export const MEALS: Record<MealTier, { name: string; perHead: number; mood: number; note: string }> = {
  plain: { name: '清汤寡水', perHead: 0, mood: -1, note: '面包、黄油，以及很多很多茶。' },
  home: { name: '家常', perHead: 1, mood: 0, note: '牧羊人派、豌豆，周日有烤肉。' },
  feast: { name: '丰盛', perHead: 3, mood: 1, note: '加上布丁和饭后的波特酒。' },
};
export const SLOT_NAMES = ['上午', '下午', '晚上'] as const;
export const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;
/** Bridgeport's first day is a Thursday. */
const FIRST_WEEKDAY = 3;
export const weekday = (day: number) => (FIRST_WEEKDAY + day) % 7;
export const weekNumber = (day: number) => Math.floor((FIRST_WEEKDAY + day) / 7) + 1;
export const BUSK_REPEAT_FEE = 3;
export const TEA_AFFINITY = 3;
export const REHEARSAL_STAGE = 2;
export const AWAY_DAYS = 7;
/** Stage experience for a finished duel: being on stage counts; a first win counts more. */
export function battleStage(kind: BattleId, firstWin: boolean) {
  if (kind === 'practice') return 0;
  const definition = BATTLES[kind];
  return 1 + (firstWin ? (definition.boss ? 5 : kind.startsWith('show-') ? 1 : 2) : 0);
}
export const lifeActive = (state: AdventureState) => state.act >= 2;
export const lodgingOf = (state: AdventureState) => LODGINGS.find((entry) => entry.id === state.lodging) ?? null;
export type MemberStatus = 'ready' | 'refuses' | 'away' | 'lodged';
/** Can this member take the stage? Eli always can. */
export function memberStatus(state: AdventureState, id: PerformerId): MemberStatus {
  if (id === 'eli') return 'ready';
  if (state.away[id] !== undefined) return 'away';
  const lodging = lodgingOf(state);
  if (lodging) {
    const housed = state.troupe.filter((member) => member !== 'eli' && state.away[member] === undefined);
    if (housed.indexOf(id) >= lodging.beds) return 'lodged';
  }
  return (state.mood[id] ?? MOOD_DEFAULT) === 0 ? 'refuses' : 'ready';
}
/** 气场 = (底子 + 名气) × (1 + lodging % + mood %), rounded. */
export function presenceBreakdown(state: AdventureState, id: PerformerId) {
  const level = stageLevel(state.stage[id] ?? 0);
  const base = BASE_PRESENCE + PRESENCE_PER_LEVEL * (level - 1);
  const lodging = lifeActive(state) ? (lodgingOf(state)?.presence ?? 0) : 0;
  const mood = lifeActive(state) ? MOODS[state.mood[id] ?? MOOD_DEFAULT].presence : 0;
  const total = Math.round(((base + state.fame) * (100 + lodging + mood)) / 100);
  return { level, base, fame: state.fame, lodging, mood, total };
}
export const presenceOf = (state: AdventureState, id: PerformerId) => presenceBreakdown(state, id).total;
const setMood = (state: AdventureState, id: PerformerId, value: number): AdventureState => ({
  ...state,
  mood: { ...state.mood, [id]: Math.max(id === 'eli' ? ELI_MOOD_FLOOR : 0, Math.min(MOOD_MAX, value)) },
});
/** A new member arrives with their own experience, never more than three levels behind Eli. */
function joinTroupe(state: AdventureState, id: PerformerId): AdventureState {
  if (id === 'eli' || state.troupe.includes(id)) return state;
  const floor = stageThreshold(Math.max(1, stageLevel(state.stage.eli ?? 0) - 3));
  return {
    ...state,
    troupe: [...state.troupe, id],
    stage: { ...state.stage, [id]: Math.max(RECRUITS[id].stage, floor) },
    mood: { ...state.mood, [id]: MOOD_DEFAULT },
  };
}
/** Time moves only for things that take a slot: a duel, a rehearsal, a pint of gossip. */
function advanceSlot(state: AdventureState): AdventureState {
  if (!lifeActive(state)) return state;
  if (state.clock.slot < 2) return { ...state, clock: { day: state.clock.day, slot: (state.clock.slot + 1) as Slot } };
  let next: AdventureState = { ...state, clock: { day: state.clock.day + 1, slot: 0 } };
  // Settle first: whoever comes home this morning ate at their mother's all week.
  if (weekday(next.clock.day) === 0) next = settleWeek(next);
  return welcomeBack(next);
}
/** Members who went home for a week come back cheerful, with a jar of jam. */
function welcomeBack(state: AdventureState): AdventureState {
  let next = state;
  for (const [id, day] of Object.entries(state.away) as [PerformerId, number][]) {
    if (day > state.clock.day) continue;
    const { [id]: _gone, ...away } = next.away;
    next = {
      ...next,
      away,
      mood: { ...next.mood, [id]: MOOD_DEFAULT },
      keepsakes: next.keepsakes.includes(`jam-${id}`) ? next.keepsakes : [...next.keepsakes, `jam-${id}`],
      notice: [...(next.notice ?? []), `${PERFORMERS[id].name}回来了，带着一罐家里做的果酱。`],
    };
  }
  return next;
}
/**
 * Sunday night: rent, supper and wages come out of the fee, in that order, and
 * everyone's mood settles. Nothing is ever lost: arrears only get less
 * comfortable, and the bus is always free.
 */
export function settleWeek(state: AdventureState): AdventureState {
  const lodging = lodgingOf(state);
  const members = state.troupe.filter((id) => id !== 'eli' && state.away[id] === undefined);
  const lines: string[] = [`${WEEKDAYS[6]}晚上 · 第 ${weekNumber(state.clock.day - 1)} 周结账`];
  let fee = state.fee;
  let arrears = state.arrears;
  let lodgingId = state.lodging;
  if (lodging && lodging.price > 0) {
    if (fee >= lodging.price) {
      fee -= lodging.price;
      arrears = 0;
      lines.push(`房租（${lodging.name}）：${lodging.price}`);
    } else {
      arrears++;
      lines.push(`房租没交上（欠 ${arrears} 周）。`);
    }
  }
  let gloom = 0;
  if (arrears === 1) lines.push('门缝里塞进来一封措辞客气、字迹用力的信。可以帮房东干活抵一周，也可以补交。');
  if (arrears === 2) {
    gloom = 1;
    lines.push('排练室锁上了。早餐只有半根香肠。全员心情 −1。');
  }
  if (arrears >= 3) {
    arrears = 0;
    lodgingId = LODGINGS[0].id;
    lines.push(`欠租三周，搬回了${LODGINGS[0].name}。斯坦很高兴：「我早就想把巴士改成宿舍了。」`);
  }
  const heads = 1 + members.length;
  let meal: MealTier = state.meals;
  while (meal !== 'plain' && fee < MEALS[meal].perHead * heads) meal = meal === 'feast' ? 'home' : 'plain';
  fee -= MEALS[meal].perHead * heads;
  lines.push(
    meal === state.meals
      ? `伙食（${MEALS[meal].name}，${heads} 人）：${MEALS[meal].perHead * heads}`
      : `钱不够，伙食从「${MEALS[state.meals].name}」降成了「${MEALS[meal].name}」。`,
  );
  const unpaid = new Set<PerformerId>();
  for (const id of members) {
    const wage = RECRUITS[id as Exclude<PerformerId, 'eli'>].wage;
    if (fee >= wage) fee -= wage;
    else unpaid.add(id);
  }
  if (members.length) lines.push(unpaid.size ? `欠了薪水：${[...unpaid].map((id) => PERFORMERS[id].name).join('、')}。` : '薪水都发了。');
  let next: AdventureState = { ...state, fee, arrears, lodging: lodgingId, meals: state.meals, week: [] };
  for (const id of next.troupe) {
    if (next.away[id] !== undefined) continue;
    const before = next.mood[id] ?? MOOD_DEFAULT;
    const change = MEALS[meal].mood - (unpaid.has(id) ? 1 : 0) - gloom;
    if (id !== 'eli' && before === 0 && change < 0) {
      next = { ...next, away: { ...next.away, [id]: next.clock.day + AWAY_DAYS } };
      lines.push(`${PERFORMERS[id].name}寄了张明信片回家：「回家吃几顿。」下周回来。`);
      continue;
    }
    next = setMood(next, id, before + change);
  }
  const corrections = state.week.filter((mark) => mark.startsWith('debunk:'));
  for (const mark of corrections) {
    const rumour = Object.values(RUMOURS)
      .flatMap((list) => list ?? [])
      .find((entry) => entry.id === mark.slice(7));
    if (rumour?.source === 'paper') lines.push(`《集市日报》更正启事：本报此前报道「${rumour.text.replace(/^《集市日报》[^：]*：/, '')}」有误，特此更正。`);
  }
  return { ...next, notice: [...(state.notice ?? []), ...lines] };
}
const canAct = (state: AdventureState) => state.mode === 'explore' && lifeActive(state);
/** Let a slot pass (a walk by the river, a nap). */
export function passTime(state: AdventureState): AdventureState {
  return canAct(state) ? advanceSlot(state) : state;
}
/** Move in: the first week is paid up front. Leaving for the bus is free and clears arrears. */
export function rentLodging(state: AdventureState, id: string): AdventureState {
  const lodging = LODGINGS.find((entry) => entry.id === id);
  if (!canAct(state) || !lodging || state.lodging === id) return state;
  if (lodging.price === 0) return { ...state, lodging: id, arrears: 0 };
  if (state.arrears > 0 || state.fee < lodging.price) return state;
  return { ...state, lodging: id, fee: state.fee - lodging.price };
}
export function payArrears(state: AdventureState): AdventureState {
  const owed = (lodgingOf(state)?.price ?? 0) * state.arrears;
  if (!canAct(state) || state.arrears === 0 || state.fee < owed) return state;
  return { ...state, fee: state.fee - owed, arrears: 0 };
}
/** A morning of sweeping the yard pays off one week of rent. */
export function helpLandlady(state: AdventureState): AdventureState {
  if (!canAct(state) || state.arrears === 0) return state;
  return advanceSlot({ ...state, arrears: state.arrears - 1 });
}
export function setMeals(state: AdventureState, tier: MealTier): AdventureState {
  return canAct(state) && Object.hasOwn(MEALS, tier) ? { ...state, meals: tier } : state;
}
/** Afternoon tea with a member: mood +1 and a little affinity, once a week each. */
export function haveTea(state: AdventureState, id: PerformerId): AdventureState {
  const mark = `tea:${id}`;
  if (!canAct(state) || state.clock.slot !== 1 || id === 'eli' || !state.troupe.includes(id) || state.away[id] !== undefined || state.week.includes(mark))
    return state;
  const next = setMood(addAffinity({ ...state, week: [...state.week, mark] }, id, TEA_AFFINITY), id, (state.mood[id] ?? MOOD_DEFAULT) + 1);
  return advanceSlot(next);
}
/** A morning's rehearsal in a lodging with room for it. */
export function rehearse(state: AdventureState, id: PerformerId): AdventureState {
  const lodging = lodgingOf(state);
  if (!canAct(state) || state.clock.slot !== 0 || !lodging?.rehearsal || state.arrears >= 2 || !state.troupe.includes(id) || memberStatus(state, id) !== 'ready')
    return state;
  return advanceSlot({ ...state, stage: { ...state.stage, [id]: (state.stage[id] ?? 0) + REHEARSAL_STAGE } });
}
export function clearNotice(state: AdventureState): AdventureState {
  return state.notice ? { ...state, notice: null } : state;
}

/* ───────────────────────── v6 intel (ADR-0059) ───────────────────────── */
export type FogLevel = 'open' | 'street' | 'formal';
export function fogOf(kind: BattleId): FogLevel {
  const definition = BATTLES[kind];
  if (definition.act < 2 || kind === 'practice') return 'open';
  return definition.formal ? 'formal' : 'street';
}
/** The opponent's real kit for a battle. */
export function battleKit(kind: BattleId) {
  const definition = BATTLES[kind];
  return {
    items: definition.items ?? [...PRESETS[definition.style].items],
    relic: definition.relic !== undefined ? definition.relic : PRESETS[definition.style].relic,
  };
}
/** Every unit of intel a battle has. */
export function intelUnits(kind: BattleId): string[] {
  const definition = BATTLES[kind];
  return [
    'style',
    'relic',
    ...battleKit(kind).items.map((id) => `item:${id}`),
    ...(definition.performer ? ['performer'] : []),
    ...(definition.book && Object.keys(definition.book).length ? ['book'] : []),
  ];
}
const itemSize = (id: ItemId) => ITEMS.find((item) => item.id === id)?.size ?? 1;
const emptyIntel = (): IntelRecord => ({ seen: [], heard: [], debunked: [], sources: [] });
/** What the hero can see of an opponent before the duel. */
export function intelView(state: AdventureState, kind: BattleId) {
  const fog = fogOf(kind);
  const record = state.intel[kind] ?? emptyIntel();
  const units = intelUnits(kind);
  const visible =
    fog === 'open'
      ? units
      : units.filter(
          (unit) =>
            record.seen.includes(unit) ||
            (fog === 'street' && (unit === 'style' || (unit.startsWith('item:') && itemSize(unit.slice(5) as ItemId) >= 2))),
        );
  const rumours = (RUMOURS[kind] ?? [])
    .filter((rumour) => record.heard.includes(rumour.id))
    .map((rumour) => ({
      ...rumour,
      status: record.debunked.includes(rumour.id) ? ('false' as const) : rumour.truth && visible.includes(rumour.unit.startsWith('relic:') ? 'relic' : rumour.unit) ? ('true' as const) : ('heard' as const),
    }));
  return { fog, units, visible, rumours, sources: record.sources };
}
/** Which battles can be scouted right now: formal ones on the current bill, not yet won. */
export function scoutable(state: AdventureState): BattleId[] {
  if (!lifeActive(state)) return [];
  const bill: BattleId[] = [];
  if (state.flags.metDoris) bill.push('ada', 'bea');
  if (state.flags.mainHall) bill.push(...GROUP);
  if (isFinalist(state)) bill.push('juno');
  return bill.filter((id) => !state.won.includes(id) && BATTLES[id].formal);
}
export const INTEL_SLOTS: Record<IntelSource, Slot | null> = { paper: 0, pub: 2, watch: 2, backstage: null };
export const INTEL_NAMES: Record<IntelSource, string> = { paper: '看报', pub: '酒馆打听', watch: '观摩比赛', backstage: '后台打点' };
/** Spend a slot (and some fee) learning about a formal opponent. Atomic. */
export function gatherIntel(state: AdventureState, kind: BattleId, source: IntelSource): AdventureState {
  const slot = INTEL_SLOTS[source];
  const record = state.intel[kind] ?? emptyIntel();
  const price = INTEL_PRICES[source];
  const desk = state.mode === 'explore' || (state.mode === 'panel' && state.panel === 'dossier');
  if (
    !desk ||
    !lifeActive(state) ||
    !scoutable(state).includes(kind) ||
    record.sources.includes(source) ||
    (slot !== null && state.clock.slot !== slot) ||
    (source === 'backstage' && !state.flags.mainHall) ||
    state.fee < price
  )
    return state;
  const add = (list: string[], extra: string[]) => [...list, ...extra.filter((entry) => !list.includes(entry))];
  let seen = record.seen;
  let heard = record.heard;
  const rumours = (RUMOURS[kind] ?? []).filter((rumour) => rumour.source === source).map((rumour) => rumour.id);
  if (source === 'paper') {
    seen = add(seen, ['style']);
    heard = add(heard, rumours);
  } else if (source === 'pub') heard = add(heard, rumours);
  else if (source === 'watch') {
    const items = battleKit(kind)
      .items.map((id, index) => ({ id, index }))
      .filter(({ id }) => !seen.includes(`item:${id}`))
      .sort((a, b) => itemSize(b.id) - itemSize(a.id) || a.index - b.index)
      .slice(0, 3)
      .map(({ id }) => `item:${id}`);
    seen = add(seen, ['style', ...(BATTLES[kind].performer ? ['performer'] : []), ...items]);
  } else seen = add(seen, ['relic']);
  return advanceSlot({
    ...state,
    fee: state.fee - price,
    intel: { ...state.intel, [kind]: { ...record, seen, heard, sources: [...record.sources, source] } },
  });
}
/** After a duel the hero has seen everything; rumours are checked against it. */
function checkIntel(state: AdventureState, kind: BattleId): AdventureState {
  if (fogOf(kind) === 'open') return state;
  const record = state.intel[kind] ?? emptyIntel();
  const wrong = (RUMOURS[kind] ?? []).filter((rumour) => record.heard.includes(rumour.id) && !rumour.truth && !record.debunked.includes(rumour.id));
  const right = (RUMOURS[kind] ?? []).filter((rumour) => record.heard.includes(rumour.id) && rumour.truth);
  const lines = [
    ...right.map((rumour) => `情报核对 · 属实：${rumour.text}`),
    ...wrong.map((rumour) => `情报核对 · 情报有误：${rumour.text}`),
  ];
  return {
    ...state,
    intel: {
      ...state.intel,
      [kind]: { ...record, seen: intelUnits(kind), debunked: [...record.debunked, ...wrong.map((rumour) => rumour.id)] },
    },
    flags: wrong.length ? { ...state.flags, falseIntelSeen: true } : state.flags,
    week: [...state.week, ...wrong.map((rumour) => `debunk:${rumour.id}`)],
    notice: lines.length ? [...(state.notice ?? []), ...lines] : state.notice,
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
export function hotspotInReach(state: AdventureState, spot: Hotspot): boolean {
  return state.mode === 'explore' && Math.abs(spot.x - state.player.x) <= reach(spot);
}
export function nearbyHotspot(state: AdventureState): Hotspot | null {
  if (state.mode !== 'explore') return null;
  return (
    visibleHotspots(state)
      .filter((spot) => hotspotInReach(state, spot))
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
  if (effect.affinity && !next.bonds.includes(effect.affinity.id))
    next = { ...addAffinity(next, effect.affinity.who, effect.affinity.amount), bonds: [...next.bonds, effect.affinity.id] };
  if (effect.recruit && !next.troupe.includes(effect.recruit)) next = joinTroupe(next, effect.recruit);
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
    const flags = action.flag ? { ...heard.flags, [action.flag]: true } : heard.flags;
    return openDialogue({ ...heard, fee: heard.fee - action.price, flags }, action.nextDialogue);
  }
  if (action.type === 'goto') return openDialogue(heard, action.nextDialogue);
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
  enemyPerformer?: PerformerId;
  terms?: DuelTerms;
  available: { items: ItemId[]; relics: RelicId[] };
  variants: OwnedVariant[];
  forced?: { items: ItemId[]; relic: RelicId | null };
  tip?: string;
  rule?: string;
  /** v5: troupe members who may take this stage (street shows); otherwise Eli alone. */
  performers: PerformerId[];
  /** v5: each member's own deck book (Eli plays the hero's collection). */
  books: Partial<Record<PerformerId, DeckBook>>;
  /** v6 presence cap (气场上限) of each member who may take the stage. */
  presence: Partial<Record<PerformerId, number>>;
  enemyPresence: number;
  /** v6 what the hero knows of the opponent (fog for formal performances and street shows). */
  intel: ReturnType<typeof intelView>;
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
    ...(definition.performer ? { enemyPerformer: definition.performer } : {}),
    ...(definition.terms ? { terms: structuredClone(definition.terms) } : {}),
    available,
    variants: [...state.owned.variants],
    ...(only ? { forced: { items: [...only.items], relic: only.relic } } : {}),
    ...(definition.tip ? { tip: definition.tip } : {}),
    ...(show ? { rule: show.rule } : {}),
    performers: stagePerformers(state, Boolean(show && !only)),
    books: Object.fromEntries(state.troupe.filter((id) => id !== 'eli').map((id) => [id, memberBook(state, id)])),
    presence: Object.fromEntries(state.troupe.map((id) => [id, presenceOf(state, id)])),
    enemyPresence: definition.presence ?? MAX_HP,
    intel: intelView(state, state.battle.kind),
  };
}
/** Street shows let any willing, housed member perform; everything else is Eli's. */
function stagePerformers(state: AdventureState, troupeShow: boolean): PerformerId[] {
  return troupeShow ? state.troupe.filter((id) => memberStatus(state, id) === 'ready') : ['eli'];
}
/**
 * A member's own deck. Eli plays the hero's collection instead. Variants the
 * hero owns have left their old owner (Juno handed over her ♠J): exclusive.
 */
export function memberBook(state: AdventureState, id: PerformerId): DeckBook {
  if (id === 'eli') return {};
  const book: Record<string, string> = { ...PERFORMERS[id].book };
  for (const entry of state.owned.variants) {
    const [key, enchant] = entry.split(':');
    if (book[key] === enchant) delete book[key];
  }
  return book;
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
  report?: { suits: number[]; kinds: number[]; performer?: PerformerId },
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
  // v6: who was on stage gains experience; a first win brings fame; time moves on.
  const show = SHOWS.some((entry) => `show-${entry.id}` === battle.kind) && !definition.kit?.only;
  const performer =
    report?.performer && stagePerformers(state, show).includes(report.performer) ? report.performer : 'eli';
  next = {
    ...next,
    stage: { ...next.stage, [performer]: (next.stage[performer] ?? 0) + battleStage(battle.kind, winner === 0 && !before) },
    fame: next.fame + (winner === 0 && !before ? (definition.fame ?? 0) : 0),
  };
  if (lifeActive(next) && winner === 0) {
    if (!next.week.includes(`win:${performer}`))
      next = setMood({ ...next, week: [...next.week, `win:${performer}`] }, performer, (next.mood[performer] ?? MOOD_DEFAULT) + 1);
    if (battle.kind.startsWith('show-') && before && !next.week.includes(`busk:${battle.kind}`))
      next = { ...next, fee: next.fee + BUSK_REPEAT_FEE, week: [...next.week, `busk:${battle.kind}`] };
  }
  next = checkIntel(next, battle.kind);
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
  return openDialogue(advanceSlot(next), dialogue);
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
  return JSON.stringify({ ...extra, product: SAVE_PRODUCT, version: ADVENTURE_VERSION, state });
}
const isInt = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const has = (table: object, key: unknown): key is string => typeof key === 'string' && Object.hasOwn(table, key);
const LEGACY_ADVENTURE_VERSION = 'magician-adventure-v3';
const V4_ADVENTURE_VERSION = 'magician-adventure-v4';
const V5_ADVENTURE_VERSION = 'magician-adventure-v5';
/** Supported saves walk forward one version at a time: v3 → v4 → v5 → v6. */
function migrateAdventure(envelope: Record<string, unknown>): Record<string, unknown> | null {
  if (envelope.version === ADVENTURE_VERSION) return envelope;
  const v4 = envelope.version === LEGACY_ADVENTURE_VERSION ? migrateV3(envelope) : envelope;
  const v5 = v4 && v4.version === V4_ADVENTURE_VERSION ? migrateV4(v4) : v4;
  return v5 ? migrateV5(v5) : null;
}
/** v4 → v5: the troupe starts as Eli alone; nobody knows anybody yet. */
function migrateV4(envelope: Record<string, unknown>): Record<string, unknown> | null {
  if (envelope.version !== V4_ADVENTURE_VERSION || !isRecord(envelope.state) || envelope.state.version !== V4_ADVENTURE_VERSION)
    return null;
  return {
    ...envelope,
    version: V5_ADVENTURE_VERSION,
    state: { ...envelope.state, version: V5_ADVENTURE_VERSION, troupe: ['eli'], affinity: {}, bonds: [] },
  };
}
/**
 * v5 → v6: experience and fame are counted from the battles already won; the
 * week starts now, on Stan's bus, everyone in ordinary spirits; nothing is
 * known yet about anybody's kit beyond what was fought.
 */
function migrateV5(envelope: Record<string, unknown>): Record<string, unknown> | null {
  if (envelope.version !== V5_ADVENTURE_VERSION || !isRecord(envelope.state) || envelope.state.version !== V5_ADVENTURE_VERSION)
    return null;
  const old = envelope.state;
  const won = Array.isArray(old.won) ? old.won.filter((id): id is BattleId => has(BATTLES, id)) : [];
  const troupe = Array.isArray(old.troupe) ? old.troupe.filter((id): id is PerformerId => isPerformer(id)) : ['eli'];
  const eli = won.reduce((sum, id) => sum + battleStage(id, true), 0);
  const floor = stageThreshold(Math.max(1, stageLevel(eli) - 3));
  const stage = Object.fromEntries(
    troupe.map((id) => [id, id === 'eli' ? eli : Math.max(RECRUITS[id as Exclude<PerformerId, 'eli'>].stage, floor)]),
  );
  const flags = isRecord(old.flags) ? { ...old.flags, falseIntelSeen: false, doddCorrection: false } : old.flags;
  return {
    ...envelope,
    version: ADVENTURE_VERSION,
    state: {
      ...old,
      version: ADVENTURE_VERSION,
      flags,
      clock: { day: 0, slot: 0 },
      stage,
      fame: START_FAME + won.reduce((sum, id) => sum + (BATTLES[id].fame ?? 0), 0),
      mood: Object.fromEntries(troupe.map((id) => [id, MOOD_DEFAULT])),
      lodging: old.act === 2 ? LODGINGS[0].id : null,
      meals: 'home',
      arrears: 0,
      away: {},
      week: [],
      keepsakes: [],
      intel: Object.fromEntries(won.filter((id) => fogOf(id) !== 'open').map((id) => [id, { ...emptyIntel(), seen: intelUnits(id) }])),
      notice: null,
    },
  };
}
/** v3's implicit gifts become owned items; retired sorting relic is safely removed. */
function migrateV3(envelope: Record<string, unknown>): Record<string, unknown> | null {
  if (envelope.version !== LEGACY_ADVENTURE_VERSION || !isRecord(envelope.state)
    || envelope.state.version !== LEGACY_ADVENTURE_VERSION) return null;
  const old = envelope.state;
  if (!isRecord(old.owned) || !Array.isArray(old.owned.items) || !Array.isArray(old.owned.relics) || !isRecord(old.flags)) return null;
  const earned = ['pair', 'draw', ...(old.flags.trained === true ? ['mend', 'wash'] : []),
    ...(old.flags.miaMet === true ? ['umbrella', 'thorns'] : [])];
  const loadout = isRecord(envelope.loadout) && envelope.loadout.relic === 'order'
    ? { ...envelope.loadout, relic: null } : envelope.loadout;
  return {
    ...envelope,
    version: V4_ADVENTURE_VERSION,
    state: { ...old, version: V4_ADVENTURE_VERSION, owned: { ...old.owned,
      items: unique([...old.owned.items, ...earned]), relics: old.owned.relics.filter((id) => id !== 'order') } },
    ...(loadout !== undefined ? { loadout } : {}),
  };
}
function validDossier(entry: unknown): boolean {
  if (!isRecord(entry) || !isInt(entry.duels) || !isInt(entry.wins) || !isInt(entry.losses)
    || (entry.wins as number) + (entry.losses as number) > (entry.duels as number)) return false;
  const counts = (list: unknown, length: number) => Array.isArray(list)
    && list.length === length && list.every((value) => isInt(value));
  return counts(entry.suits, 4) && counts(entry.kinds, 9);
}
const KEEPSAKES = new Set(['jam-juno', 'jam-rosie', 'jam-stan']);
const strings = (value: unknown, ok: (entry: string) => boolean) =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string' && ok(entry)) && new Set(value).size === value.length;
/** v6 fields: every member has experience and mood; lodging belongs to the act; intel names real units and rumours. */
function validLife(s: AdventureState): boolean {
  if (!isRecord(s.clock) || !isInt(s.clock.day, 0, 100000) || ![0, 1, 2].includes(s.clock.slot)) return false;
  if (!isInt(s.fame, 0, 100000) || !isInt(s.arrears, 0, 2) || !Object.hasOwn(MEALS, s.meals)) return false;
  const members = (table: unknown, ok: (value: unknown, id: PerformerId) => boolean, every = true) =>
    isRecord(table) &&
    Object.entries(table).every(([id, value]) => isPerformer(id) && s.troupe.includes(id) && ok(value, id)) &&
    (!every || s.troupe.every((id) => Object.hasOwn(table, id)));
  if (!members(s.stage, (value) => isInt(value, 0, 100000))) return false;
  if (!members(s.mood, (value, id) => isInt(value, id === 'eli' ? ELI_MOOD_FLOOR : 0, MOOD_MAX))) return false;
  if (!members(s.away, (value, id) => id !== 'eli' && isInt(value, 0, 100000), false)) return false;
  if (s.act >= 2 ? !LODGINGS.some((entry) => entry.id === s.lodging) : s.lodging !== null) return false;
  if (!strings(s.week, (mark) => /^(tea|win|busk|debunk):[\w-]+$/.test(mark)) || !strings(s.keepsakes, (id) => KEEPSAKES.has(id))) return false;
  const rumourIds = (kind: BattleId) => (RUMOURS[kind] ?? []).map((rumour) => rumour.id);
  if (
    !isRecord(s.intel) ||
    !Object.entries(s.intel).every(
      ([kind, record]) =>
        has(BATTLES, kind) &&
        isRecord(record) &&
        strings(record.seen, (unit) => intelUnits(kind as BattleId).includes(unit)) &&
        strings(record.heard, (id) => rumourIds(kind as BattleId).includes(id)) &&
        strings(record.debunked, (id) => (record.heard as string[]).includes(id)) &&
        strings(record.sources, (id) => Object.hasOwn(INTEL_PRICES, id)),
    )
  )
    return false;
  return s.notice === null || (Array.isArray(s.notice) && s.notice.length <= 40 && s.notice.every((line) => typeof line === 'string' && line.length <= 400));
}
/**
 * Restores a save, or returns null for anything from another product, another
 * rules version, or a shape this version cannot vouch for. A battle in
 * progress is not resumable: the hero is put back where the duel began.
 */
export function restoreAdventure(json: string): { state: AdventureState; envelope: Record<string, unknown> } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.product !== SAVE_PRODUCT) return null;
  const envelope = migrateAdventure(parsed);
  if (!envelope) return null;
  const s = envelope.state as AdventureState;
  if (!isRecord(s) || s.version !== ADVENTURE_VERSION || !isInt(s.seed, 0, 0xffffffff) || !isInt(s.tick)) return null;
  if (![1, 2].includes(s.act) || !has(MAPS, s.map) || MAPS[s.map].act !== s.act) return null;
  if (!isRecord(s.player) || !isInt(s.player.x, 48, MAPS[s.map].width - 48) || ![-1, 1].includes(s.player.facing) || !isInt(s.player.walkTicks))
    return null;
  if (!['explore', 'dialogue', 'battle', 'panel', 'complete'].includes(s.mode)) return null;
  if (s.mode === 'dialogue' && !(isRecord(s.dialogue) && has(DIALOGUES, s.dialogue.id) && isInt(s.dialogue.step, 0, DIALOGUES[s.dialogue.id].lines.length - 1)))
    return null;
  if (s.mode !== 'dialogue' && s.dialogue !== null) return null;
  if (s.mode === 'panel' && !['shop', 'shows', 'dossier'].includes(s.panel as string)) return null;
  if (s.mode !== 'panel' && s.panel !== null) return null;
  if (s.mode === 'battle' && !(isRecord(s.battle) && has(BATTLES, s.battle.kind)
    && BATTLES[s.battle.kind].act === s.act && has(MAPS, s.battle.returnMap) && MAPS[s.battle.returnMap].act === s.act
    && isInt(s.battle.returnX, 48, MAPS[s.battle.returnMap].width - 48)
    && isInt(s.battle.id, 1) && s.battle.id < s.nextBattleId && isInt(s.battle.seed, 0, 0xffffffff)
    && has(PRESETS, s.battle.enemyStyle) && [null, 'lesson', 'qualifier'].includes(s.battle.coach))) return null;
  if (s.mode !== 'battle' && s.battle !== null) return null;
  if (!isInt(s.nextBattleId, 1) || !isInt(s.fee)) return null;
  if (!isRecord(s.flags) || FLAGS.some((flag) => typeof s.flags[flag] !== 'boolean') || Object.keys(s.flags).length !== FLAGS.length)
    return null;
  const items = new Set(ITEMS.map((item) => item.id)),
    relics = new Set(RELICS.map((relic) => relic.id)),
    enchants = new Set(ENCHANTS.map((entry) => entry.id));
  if (
    !isRecord(s.owned) ||
    !Array.isArray(s.owned.items) ||
    !s.owned.items.every((id) => items.has(id)) ||
    !Array.isArray(s.owned.relics) ||
    !s.owned.relics.every((id) => relics.has(id)) ||
    !Array.isArray(s.owned.variants) ||
    !s.owned.variants.every((entry) => {
      if (typeof entry !== 'string' || entry.split(':').length !== 2) return false;
      const [key, id] = entry.split(':');
      return enchants.has(id) && validDeckBook({ [key]: id });
    })
  )
    return null;
  if (!Array.isArray(s.won) || !s.won.every((id) => has(BATTLES, id))) return null;
  if (!Array.isArray(s.found) || !s.found.every((id) => (HOBBS_THINGS as readonly string[]).includes(id))) return null;
  if (!isRecord(s.dossier) || !Object.entries(s.dossier).every(([id, entry]) => has(CHARACTERS, id) && validDossier(entry))) return null;
  if (!Array.isArray(s.troupe) || s.troupe[0] !== 'eli' || !s.troupe.every((id) => isPerformer(id))
    || new Set(s.troupe).size !== s.troupe.length) return null;
  if (!isRecord(s.affinity) || !Object.entries(s.affinity).every(([id, value]) => has(CHARACTERS, id) && isInt(value, 0, AFFINITY_MAX)))
    return null;
  if (!Array.isArray(s.bonds) || !s.bonds.every((id) => (BOND_IDS as readonly string[]).includes(id))
    || new Set(s.bonds).size !== s.bonds.length) return null;
  if (!validLife(s)) return null;
  let state: AdventureState = structuredClone(s);
  if (state.mode === 'battle') state = abandonAdventureBattle(state);
  return { state, envelope };
}
