import { randomStream } from '../../packages/core/random.ts';
import { scorePoker, type PlayingCard, type Suit } from './throw-poker.ts';
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
} from './throw-loadout.ts';
export { ITEMS, RELICS, PRESETS, BAG_CELLS };
export type { ItemId, RelicId, Style, ItemPlacement };
export const TICK_MS = 50,
  HAND_LIMIT = 10,
  MAX_HP = 320,
  MAX_SHIELD = 160,
  MAX_POWER = 30;
/**
 * v4 makes the four conditions counter one another by rule, not by numbers:
 * healing cleanses poison, poison ignores shields, shields smother burn, and
 * burn halves healing. Direct-damage builds add shred (single cards) and
 * wounds (straights and better). Deck streams are unchanged from v3.
 */
export const RULES_VERSION = 'throw-duel-v5';
/**
 * v5 curtain call (落幕): from one minute in, the theatre starts closing on
 * both magicians. Every second each side takes damage that rises by
 * CURTAIN_RAMP per second (1, 2, 3 …). It is ordinary damage, so shields
 * absorb it and healing outlasts it: surviving is itself a way to win.
 */
export const CURTAIN_MS = 60000;
export const CURTAIN_RAMP = 1;
/** Curtain damage dealt at the given tick (0 before the curtain falls). */
export const curtainDamage = (tick: number) =>
  tick < ticks(CURTAIN_MS) ? 0 : (Math.floor((tick - ticks(CURTAIN_MS)) / ticks(1000)) + 1) * CURTAIN_RAMP;
export const SCORCH_PER_THROW = 2;
export const SCORCH_THRESHOLD = 3;
export const SMOTHER_EXTRA_DECAY = 2;
export const WOUND_MS = 5000;
export const SHRED = 1.1;
export const FIREPROOF_MS = 6000;
export const FAN_PARRY_HAND = 7;
export const handLimit = (relic: RelicId | null) =>
  relic === 'capacity' ? 12 : HAND_LIMIT;
const ticks = (ms: number) => ms / TICK_MS;
/** Always three seconds for every build. */
export const drawInterval = (_items: readonly ItemId[]) => ticks(3000);
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
  | 'douse';
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
};
export type ThrowFighter = {
  hp: number;
  shield: number;
  burn: number;
  poison: number;
  power: number;
  slowUntil: number;
  woundUntil: number;
  fireproofUntil: number;
  lastSuit: number | null;
  layout: ItemPlacement[];
  hand: PlayingCard[];
  items: ItemId[];
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
};
export type ThrowDuel = {
  rules: typeof RULES_VERSION;
  seed: number;
  tick: number;
  fighters: [ThrowFighter, ThrowFighter];
  shots: Shot[];
  events: DuelEvent[];
  nextId: number;
  nextLaunch: [number, number];
  ai: {
    style: Style;
    thinkTick: number;
    intent: string[];
    releaseTick: number;
  };
  status: 'playing' | 'ended';
  winner: Side | 'draw' | null;
};

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
const addEvent = (
  state: ThrowDuel,
  side: Side,
  type: DuelEvent['type'],
  text: string,
  value: number,
  extra: Partial<
    Pick<
      DuelEvent,
      'source' | 'cardUid' | 'kind' | 'combo' | 'hpDamage' | 'shieldDamage'
    >
  > = {},
) => {
  state.events.push({
    id: state.nextId++,
    tick: state.tick,
    side,
    type,
    text,
    value,
    ...extra,
  });
  if (state.events.length > 240) state.events.shift();
};
const effectEvent = (state: ThrowDuel, side: Side, effect: TriggerEffect) =>
  addEvent(state, side, 'effect', effect.name, effect.value, {
    source: effect.source,
    kind: effect.kind,
  });
/** Burning or wounded fighters receive 60% healing (rounded down). */
export const healingFactor = (fighter: ThrowFighter, tick: number) =>
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
) {
  const fighter = state.fighters[side];
  if (nominal <= 0) return 0;
  const cleansed = Math.min(fighter.poison, Math.ceil(nominal / 2));
  if (cleansed) {
    fighter.poison -= cleansed;
    addEvent(state, side, 'effect', '净化剧毒', cleansed, {
      source,
      kind: 'cleanse',
    });
  }
  const actual = Math.min(
    Math.floor(nominal * healingFactor(fighter, state.tick)),
    MAX_HP - fighter.hp,
  );
  fighter.hp += actual;
  if (actual > 0)
    addEvent(state, side, 'heal', text, actual, { source, kind: 'heal' });
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
): ThrowDuel {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Seed must be uint32');
  if (!PRESETS[aiStyle]) throw new Error('Invalid opponent');
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
  const make = (
    side: Side,
    bag: ItemPlacement[],
    equippedRelic: RelicId | null,
    book: DeckBook,
  ): ThrowFighter => ({
    hp: MAX_HP,
    shield: 0,
    burn: 0,
    poison: 0,
    power: 0,
    slowUntil: 0,
    woundUntil: 0,
    fireproofUntil: 0,
    lastSuit: null,
    layout: structuredClone(bag),
    hand: [],
    items: bag.map((entry) => entry.id),
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
  });
  const state: ThrowDuel = {
    rules: RULES_VERSION,
    seed,
    tick: 0,
    fighters: [
      make(0, layout, relic, playerBook),
      make(1, packThrowItems(PRESETS[aiStyle].items), enemyRelic, enemyBook),
    ],
    shots: [],
    events: [],
    nextId: 1,
    nextLaunch: [0, 0],
    ai: {
      style: aiStyle,
      thinkTick: ticks(2400),
      intent: [],
      releaseTick: 0,
    },
    status: 'playing',
    winner: null,
  };
  for (let i = 0; i < 5; i++) {
    draw(state, 0);
    draw(state, 1);
  }
  return state;
}
type PreviewContext = Partial<ThrowFighter> & {
  tick?: number;
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
): Raw[] {
  const single = cards.length === 1;
  switch (id) {
    case 'quick':
      return single ? [{ name: '轻巧飞掷', kind: 'damage', value: 4 }] : [];
    case 'tempo':
      return pureSuit !== null &&
        context.lastSuit != null &&
        context.lastSuit !== pureSuit
        ? [{ name: '换调共鸣', kind: 'damage', value: 2 }]
        : [];
    case 'needle':
      return single ? [{ name: '穿幕一线', kind: 'pierce', value: 30 }] : [];
    case 'stride':
      return [{ name: '抖擞抖毒', kind: 'cleanse', value: 3 }];
    case 'draw':
      return ((context.throws ?? 0) + 1) % 4 === 0
        ? [{ name: '催信接力', kind: 'draw', value: 1 }]
        : [];
    case 'sequence':
      return kind === 4 || kind === 8
        ? [{ name: '织序连击', kind: 'damage', value: 36 }]
        : [];
    case 'suit':
      return kind === 5 || kind === 8
        ? [{ name: '四色辉光', kind: 'damage', value: 30 }]
        : [];
    case 'focus':
      return cards.length >= 5 && kind >= 4
        ? [{ name: '星河贯注', kind: 'damage', value: 26 }]
        : [];
    case 'pair':
      return PAIRISH.includes(kind)
        ? [{ name: '双响共鸣', kind: 'damage', value: 10 }]
        : [];
    case 'umbrella':
      return PAIRISH.includes(kind)
        ? [{ name: '补丁护心', kind: 'shield', value: 30 }]
        : [];
    case 'ward': {
      const spades = count(cards, 0);
      return spades
        ? [{ name: '守灯结界', kind: 'shield', value: spades * 14 }]
        : [];
    }
    case 'shieldbash':
      return cards.length >= 2 && (context.shield ?? 0) > 0
        ? [
            {
              name: '护心重映',
              kind: 'damage',
              value: Math.floor((context.shield ?? 0) * 0.5),
            },
          ]
        : [];
    case 'cinder': {
      const diamonds = count(cards, 3);
      return diamonds
        ? [{ name: '余烬燎原', kind: 'burn', value: diamonds * 3 }]
        : [];
    }
    case 'ash':
      return (context.target?.burn ?? 0) >= 8
        ? [{ name: '焰纹燃爆', kind: 'damage', value: 12 }]
        : [];
    case 'poison': {
      const clubs = count(cards, 2);
      return clubs
        ? [{ name: '青苔侵蚀', kind: 'poison', value: clubs * 3 }]
        : [];
    }
    case 'slow':
      return count(cards, 2) >= 2
        ? [{ name: '止雨留息', kind: 'slow', value: 1200 }]
        : [];
    case 'mend': {
      const hearts = count(cards, 1);
      return hearts
        ? [{ name: '灯火回暖', kind: 'heal', value: hearts * 9 }]
        : [];
    }
    case 'wash':
      return count(cards, 1)
        ? [{ name: '清露净化', kind: 'cleanse', value: 4 }]
        : [];
    case 'drain':
      return [{ name: '回甘汲取', kind: 'leech', value: 25 }];
    case 'growth':
      return pureSuit !== null && context.lastSuit === pureSuit
        ? [{ name: '续曲生长', kind: 'growth', value: 3 }]
        : [];
    default:
      return [];
  }
}
const AMPLIFIED: EffectKind[] = ['damage', 'burn', 'poison', 'shield', 'heal'];
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
  if (cards.length)
    for (const id of items)
      for (const raw of itemEffects(id, cards, poker.kind, context, pureSuit)) {
        let amount = raw.value;
        if (AMPLIFIED.includes(raw.kind))
          for (const neighbor of neighbors(id)) {
            let rate = 0;
            if (neighbor.id === 'bellows' && raw.kind === 'burn') rate = 50;
            if (neighbor.id === 'venom' && raw.kind === 'poison') rate = 50;
            if (neighbor.id === 'compass' && neighbors('compass').length === 2)
              rate = 25;
            const gain = Math.floor((raw.value * rate) / 100);
            if (gain) {
              amount += gain;
              links.set(neighbor.id, (links.get(neighbor.id) ?? 0) + gain);
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
        hp: context.hp ?? MAX_HP,
        maxHp: MAX_HP,
        shield: context.shield ?? 0,
        poison: context.poison ?? 0,
        burn: context.burn ?? 0,
        hand: context.hand?.length ?? cards.length,
        throws: context.throws ?? 0,
        curtain: curtainDamage(context.tick ?? 0) > 0,
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
      name: id === 'bellows' ? '鼓火相邻' : id === 'venom' ? '浸露相邻' : '联灯双邻',
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
    if (context.relic === 'ember' && total('burn')) relic('灶心添火', 2, 'burn');
    if (context.relic === 'toxin' && total('poison')) relic('浸露添毒', 1, 'poison');
    if (context.relic === 'echo' && context.echo)
      relic('余响回奏', context.echo, 'damage');
    if (context.relic === 'relay' && ((context.throws ?? 0) + 1) % 3 === 0)
      relic('第三声接力', 1, 'draw');
    if (poker.kind >= 4)
      effects.push({ source: 'rule:wound', name: '压轴重创', value: WOUND_MS, kind: 'wound' });
    // Finale: a flourish of five or more cards snuffs your own flames and
    // leaves you fireproof for four seconds.
    if (cards.length >= 5 && (context.burn ?? 0) > 0)
      effects.push({ source: 'rule:finale', name: '压轴灭火', value: context.burn ?? 0, kind: 'cleanse' });
  }
  // Clamp shield and growth to their real headroom so the preview never lies.
  const shieldRoom = Math.max(0, MAX_SHIELD - (context.shield ?? 0));
  let shieldLeft = shieldRoom;
  for (const effect of effects)
    if (effect.kind === 'shield') {
      effect.value = Math.min(effect.value, shieldLeft);
      shieldLeft -= effect.value;
    }
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
    relicBonus = damageFrom('relic:'),
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
    state.tick < state.nextLaunch[side] ||
    !ids.length ||
    ids.length > handLimit(fighter.relic) ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !fighter.hand.some((card) => card.uid === id))
  )
    return false;
  const cards = fighter.hand.filter((card) => ids.includes(card.uid)),
    score = previewThrow(cards, fighter.items, {
      ...fighter,
      tick: state.tick,
      target: state.fighters[side === 0 ? 1 : 0],
    });
  fighter.hand = fighter.hand.filter((card) => !ids.includes(card.uid));
  state.shots.push({
    id: state.nextId++,
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
  });
  state.nextLaunch[side] = state.tick + ticks(450);
  addEvent(
    state,
    side,
    'launch',
    `${score.name} · ${cards.length} 张`,
    score.damage,
    { combo: score.kind },
  );
  // Scorch: handling cards while properly on fire (3+ stacks) costs life, whatever the shield says.
  if (fighter.burn >= SCORCH_THRESHOLD) {
    const loss = Math.min(fighter.hp, SCORCH_PER_THROW);
    fighter.hp -= loss;
    addEvent(state, side === 0 ? 1 : 0, 'dot', '烫手', loss, {
      kind: 'burn',
      hpDamage: loss,
      shieldDamage: 0,
    });
  }
  fighter.throws++;
  fighter.echo = 0;
  for (const effect of score.effects)
    if (effect.kind !== 'wound') effectEvent(state, side, effect);
  fighter.poison = Math.max(0, fighter.poison - score.cleansePoison);
  fighter.burn = Math.max(0, fighter.burn - score.cleanseBurn);
  if (cards.length >= 5) fighter.fireproofUntil = state.tick + ticks(FIREPROOF_MS);
  for (const effect of score.effects)
    if (effect.kind === 'heal' && effect.value > 0)
      healFighter(state, side, effect.value, effect.name, effect.source);
  fighter.shield = Math.min(MAX_SHIELD, fighter.shield + score.shield);
  fighter.power = Math.min(MAX_POWER, fighter.power + score.growth);
  fighter.lastSuit = score.currentSuit;
  for (let i = 0; i < score.draw; i++) draw(state, side);
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
    fighter.relic !== 'order' ||
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
  next.fighters[side].nextReorder = state.tick + ticks(3000);
  effectEvent(next, side, {
    source: 'relic:order',
    name: '三息理序',
    value: 3,
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
    fighter.relic !== 'order' ||
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
  next.fighters[side].nextReorder = state.tick + ticks(3000);
  effectEvent(next, side, {
    source: 'relic:order',
    name: '三息理序',
    value: 3,
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
    for (let length = 1; length <= hand.length - start; length++) {
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
 * An AI holding the sorting relic tidies its hand when a sorted order offers a
 * better contiguous batch, paying the same cooldown a player would.
 */
export function aiArrange(state: ThrowDuel, side: Side, playerStyle: Style = 'combo') {
  const fighter = state.fighters[side];
  if (fighter.relic !== 'order' || state.tick < fighter.nextReorder || fighter.hand.length < 3)
    return;
  const style = side === 1 ? state.ai.style : playerStyle;
  const context = { ...fighter, target: state.fighters[side === 0 ? 1 : 0], tick: state.tick };
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
  effectEvent(state, side, { source: 'relic:order', name: '三息理序', value: 3, kind: 'reorder' });
}
/** Whether a build is willing to release the recommended batch now. */
export function aiReady(style: Style, cards: PlayingCard[], fighter: ThrowFighter) {
  const full = fighter.hand.length >= handLimit(fighter.relic);
  const kind = scorePoker(cards).kind;
  if (style === 'combo')
    return kind >= 4 || (fighter.hand.length >= handLimit(fighter.relic) - 2 && kind >= 3) || full;
  return true;
}
function loseHealth(
  fighter: ThrowFighter,
  amount: number,
  pierce = 0,
  shred = false,
) {
  const bypass = Math.floor((amount * pierce) / 100),
    rest = amount - bypass;
  // Shred: a single card spends 1.1 points of shield for every point it is stopped,
  // and bypasses reflection (see bastion).
  const blocked = shred
    ? Math.min(rest, Math.floor(fighter.shield / SHRED))
    : Math.min(fighter.shield, rest);
  fighter.shield -= shred ? Math.min(fighter.shield, Math.ceil(blocked * SHRED)) : blocked;
  const health = Math.min(fighter.hp, rest - blocked + bypass);
  fighter.hp -= health;
  return { health, blocked };
}
function finish(state: ThrowDuel) {
  const [player, enemy] = state.fighters;
  if (player.hp === 0 || enemy.hp === 0 || state.tick >= ticks(120000)) {
    state.status = 'ended';
    state.winner =
      player.hp === enemy.hp ? 'draw' : player.hp > enemy.hp ? 0 : 1;
    state.shots = [];
    return true;
  }
  return false;
}
/** Advance one tick in place. Simulation tools may call this on their own copy. */
export function stepThrowDuelInPlace(next: ThrowDuel) {
  if (next.status !== 'playing') return;
  next.tick++;
  const hits = next.shots.filter((shot) => shot.hitTick <= next.tick);
  next.shots = next.shots.filter((shot) => shot.hitTick > next.tick);
  const heals: { side: Side; amount: number; name: string; source: string }[] = [];
  for (const shot of hits) {
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
        single,
      );
    if (parried)
      effectEvent(next, targetSide, {
        source: 'item:sequence',
        name: '扇面格挡',
        value: Math.floor(shot.damage / 2),
        kind: 'shield',
      });
    attacker.hits++;
    const landed = result.health + result.blocked;
    addEvent(next, shot.side, 'hit', shot.name, landed, {
      kind: 'damage',
      combo: shot.kind,
      hpDamage: result.health,
      shieldDamage: result.blocked,
    });
    // Smother on contact: flames that land on a raised shield catch only by half.
    const kindled =
      next.tick < target.fireproofUntil
        ? 0
        : target.shield > 0 || result.blocked > 0
          ? Math.floor(shot.burn / 2)
          : shot.burn;
    target.burn = Math.min(60, target.burn + kindled);
    target.poison = Math.min(40, target.poison + shot.poison);
    if (shot.slow)
      target.slowUntil = Math.max(target.slowUntil, next.tick + ticks(shot.slow));
    if (shot.kind >= 4 && landed > 0) {
      target.woundUntil = Math.max(target.woundUntil, next.tick + ticks(WOUND_MS));
      effectEvent(next, shot.side, {
        source: 'rule:wound',
        name: '压轴重创',
        value: WOUND_MS,
        kind: 'wound',
      });
    }
    if (shot.leech && result.health)
      heals.push({
        side: shot.side,
        amount: Math.floor(result.health * shot.leech),
        name: '回甘汲取',
        source: 'item:drain',
      });
    if (target.relic === 'heart' && landed > 0 && shot.cards.length === 1)
      heals.push({ side: targetSide, amount: 2, name: '红心补缝', source: 'relic:heart' });
    if (landed > 0) {
      let reflected = 0;
      if (target.items.includes('thorns') && shot.cards.length >= 3) {
        const strong = adjacentThrowItems(target.layout, 'thorns').some(
          (item) => itemDefinition(item.id).family === 'shield',
        );
        reflected += strong ? 22 : 15;
        effectEvent(next, targetSide, {
          source: 'item:thorns',
          name: strong ? '护灯回声' : '针盒回嘴',
          value: strong ? 22 : 15,
          kind: 'damage',
        });
      }
      if (target.relic === 'bastion' && result.blocked && shot.cards.length > 1) {
        const amount = Math.floor(result.blocked * 0.35);
        reflected += amount;
        if (amount)
          effectEvent(next, targetSide, {
            source: 'relic:bastion',
            name: '折光反射',
            value: amount,
            kind: 'damage',
          });
      }
      if (reflected) {
        const response = loseHealth(attacker, reflected);
        addEvent(next, targetSide, 'hit', '反击', response.health + response.blocked, {
          kind: 'damage',
          hpDamage: response.health,
          shieldDamage: response.blocked,
        });
      }
      if (target.relic === 'echo' && target.hp > 0) {
        const gain = Math.min(3, 12 - target.echo);
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
      healFighter(next, request.side, request.amount, request.name, request.source);
  if (next.tick % ticks(1000) === 0)
    for (const side of [0, 1] as const) {
      const fighter = next.fighters[side],
        source: Side = side === 0 ? 1 : 0;
      if (fighter.burn) {
        // Smother: behind a shield, flames only scorch a third of their stacks
        // from the shield, never the body, and burn out faster.
        const soaked = fighter.shield ? Math.min(fighter.shield, Math.ceil(fighter.burn / 3)) : 0;
        fighter.shield -= soaked;
        const health = soaked ? 0 : Math.min(fighter.hp, fighter.burn);
        fighter.hp -= health;
        fighter.burn = Math.max(
          0,
          fighter.burn - 1 - (soaked ? SMOTHER_EXTRA_DECAY : 0),
        );
        addEvent(next, source, 'dot', soaked ? '闷火' : '灼烧', health + soaked, {
          kind: 'burn',
          hpDamage: health,
          shieldDamage: soaked,
        });
      }
      if (fighter.poison) {
        // Fester: hoarded cards feed the poison, one extra point per five held.
        const damage = Math.min(
          fighter.hp,
          fighter.poison + Math.floor(fighter.hand.length / 5),
        );
        fighter.hp -= damage;
        // Poison outlasts burn but still ebbs: one stack every two seconds.
        if ((next.tick / ticks(1000)) % 2 === 0) fighter.poison--;
        addEvent(next, source, 'dot', '剧毒', damage, {
          kind: 'poison',
          hpDamage: damage,
          shieldDamage: 0,
        });
      }
    }
  // Curtain call: both sides at once, after statuses, so a simultaneous
  // knockout is a draw rather than a seat advantage.
  const curtain = curtainDamage(next.tick);
  if (curtain && next.tick % ticks(1000) === 0)
    for (const side of [0, 1] as const) {
      const fighter = next.fighters[side];
      if (!fighter.hp) continue;
      const { health, blocked } = loseHealth(fighter, curtain);
      addEvent(next, side === 0 ? 1 : 0, 'dot', '落幕', curtain, {
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
      ++fighter.drawClock >= drawInterval(fighter.items)
    ) {
      fighter.drawClock = 0;
      draw(next, side);
    }
  }
  const ai = next.ai,
    enemy = next.fighters[1];
  if (ai.intent.length && next.tick >= ai.releaseTick) {
    launchMutable(next, 1, ai.intent);
    ai.intent = [];
    ai.thinkTick = next.tick + ticks(aiThinkMs(ai.style));
  } else if (!ai.intent.length && next.tick >= ai.thinkTick && enemy.hand.length) {
    aiArrange(next, 1);
    const cards = recommendCards(enemy.hand, enemy.items, ai.style, {
      ...enemy,
      target: next.fighters[0],
      tick: next.tick,
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
