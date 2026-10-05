import { randomStream } from '../../packages/core/random.ts';
import { scorePoker, type PlayingCard, type Suit } from './throw-poker.ts';
import {
  ITEMS,
  RELICS,
  PRESETS,
  BAG_CELLS,
  itemDefinition,
  itemEnd,
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
  MAX_POWER = 40;
export const RULES_VERSION = 'throw-duel-v3';
export const handLimit = (relic: RelicId | null) =>
  relic === 'capacity' ? 12 : HAND_LIMIT;
const ticks = (ms: number) => ms / TICK_MS;
/** Always three seconds, including the former faster-clock item. */
export const drawInterval = (_items: ItemId[]) => ticks(3000);
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
  | 'leech';
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
  nextRelic: number;
  lastSuit: number | null;
  cultivatedThrows: number;
  layout: ItemPlacement[];
  hand: PlayingCard[];
  items: ItemId[];
  drawClock: number;
  drawn: number;
  pile: PlayingCard[];
  cycle: number;
  relic: RelicId | null;
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
function deck(seed: number, side: Side, cycle: number): PlayingCard[] {
  const rng = randomStream(seed, `throw-duel/${side}/deck/${cycle}`),
    cards: PlayingCard[] = [];
  for (let suit = 0; suit < 4; suit++)
    for (let rank = 2; rank <= 14; rank++)
      cards.push({
        uid: `${side}:${cycle}:${suit}:${rank}`,
        suit: suit as Suit,
        rank,
      });
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
function healFighter(
  state: ThrowDuel,
  side: Side,
  amount: number,
  text: string,
  source?: string,
) {
  const fighter = state.fighters[side],
    actual = Math.min(amount, MAX_HP - fighter.hp);
  fighter.hp += actual;
  if (actual > 0)
    addEvent(state, side, 'heal', text, actual, { source, kind: 'heal' });
  return actual;
}
function draw(state: ThrowDuel, side: Side) {
  const fighter = state.fighters[side];
  if (fighter.hand.length >= handLimit(fighter.relic)) return;
  if (!fighter.pile.length)
    fighter.pile = deck(state.seed, side, ++fighter.cycle);
  const card = fighter.pile.pop()!;
  fighter.hand.push(card);
  fighter.drawn++;
  addEvent(state, side, 'draw', '记忆灵符', card.rank, { cardUid: card.uid });
  if (fighter.relic === 'heart' && card.suit === 1) {
    const value = healFighter(state, side, 3, '红心补缝', 'relic:heart');
    if (value)
      effectEvent(state, side, {
        source: 'relic:heart',
        name: '红心补缝',
        kind: 'heal',
        value,
      });
  }
}
export function createThrowDuel(
  seed: number,
  playerItems: ItemId[],
  aiStyle: Style = 'pair',
  relic: RelicId | null = null,
  enemyRelic: RelicId | null = PRESETS[aiStyle]?.relic ?? null,
  playerLayout?: ItemPlacement[],
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
  const make = (
    side: Side,
    bag: ItemPlacement[],
    equippedRelic: RelicId | null,
  ): ThrowFighter => ({
    hp: MAX_HP,
    shield: 0,
    burn: 0,
    poison: 0,
    power: 0,
    slowUntil: 0,
    nextRelic: 0,
    lastSuit: null,
    cultivatedThrows: 0,
    layout: structuredClone(bag),
    hand: [],
    items: bag.map((entry) => entry.id),
    drawClock: 0,
    drawn: 0,
    pile: deck(seed, side, 0),
    cycle: 0,
    relic: equippedRelic,
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
      make(0, layout, relic),
      make(1, packThrowItems(PRESETS[aiStyle].items), enemyRelic),
    ],
    shots: [],
    events: [],
    nextId: 1,
    nextLaunch: [0, 0],
    ai: { style: aiStyle, thinkTick: ticks(2400), intent: [], releaseTick: 0 },
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
export function previewThrow(
  cards: PlayingCard[],
  items: ItemId[],
  context: PreviewContext = {},
) {
  const poker = scorePoker(cards),
    effects: TriggerEffect[] = [];
  const layout = context.layout ?? packThrowItems(items),
    neighbors = (id: ItemId) => adjacentThrowItems(layout, id),
    has = (id: ItemId) => items.includes(id),
    position = (id: ItemId) => layout.find((entry) => entry.id === id);
  const shieldNeighbor = (id: ItemId) =>
    neighbors(id).some((entry) => itemDefinition(entry.id).family === 'shield');
  const currentSuit =
    cards.length && cards.every((card) => card.suit === cards[0].suit)
      ? cards[0].suit
      : null;
  const same = currentSuit !== null && context.lastSuit === currentSuit,
    changed =
      currentSuit !== null &&
      context.lastSuit != null &&
      context.lastSuit !== currentSuit;
  const add = (
    id: ItemId,
    name: string,
    raw: number,
    kind: EffectKind = 'damage',
  ) => {
    let amount = raw;
    const boosts: { id: ItemId; gain: number }[] = [];
    if (['damage', 'burn', 'poison', 'heal', 'shield', 'growth'].includes(kind))
      for (const neighbor of neighbors(id)) {
        let rate = 0;
        if (neighbor.id === 'bellows' && kind === 'burn') rate = 50;
        if (neighbor.id === 'venom' && kind === 'poison') rate = 50;
        if (neighbor.id === 'compass' && neighbors('compass').length === 2)
          rate = 25;
        const gain = Math.floor((raw * rate) / 100);
        amount += gain;
        if (gain) boosts.push({ id: neighbor.id, gain });
      }
    const already = effects
      .filter((effect) => effect.kind === kind)
      .reduce((sum, effect) => sum + effect.value, 0);
    if (kind === 'heal')
      amount = Math.min(
        amount,
        Math.max(0, MAX_HP - (context.hp ?? 0) - already),
      );
    if (kind === 'shield')
      amount = Math.min(
        amount,
        Math.max(0, MAX_SHIELD - (context.shield ?? 0) - already),
      );
    if (kind === 'growth')
      amount = Math.min(
        amount,
        Math.max(0, MAX_POWER - (context.power ?? 0) - already),
      );
    let availableBoost = Math.max(0, amount - raw);
    for (const boost of boosts) {
      const gain = Math.min(availableBoost, boost.gain);
      availableBoost -= gain;
      if (!gain) continue;
      const source = `item:${boost.id}`,
        existing = effects.find(
          (effect) => effect.source === source && effect.kind === 'link',
        );
      if (existing) existing.value += gain;
      else
        effects.push({
          source,
          name:
            boost.id === 'bellows'
              ? '鼓火相邻'
              : boost.id === 'venom'
                ? '浸露相邻'
                : '联灯双邻',
          value: gain,
          kind: 'link',
        });
    }
    effects.push({ source: `item:${id}`, name, value: amount, kind });
  };
  if (cards.length) {
    if (cards.length === 1 && has('quick')) add('quick', '轻巧飞掷', 4);
    if ([1, 2, 6].includes(poker.kind) && has('pair'))
      add('pair', '双响共鸣', 10);
    if ([4, 8].includes(poker.kind) && has('sequence'))
      add('sequence', '织序连击', 24);
    if ([5, 8].includes(poker.kind) && has('suit')) add('suit', '四色辉光', 20);
    if (cards.length >= 5 && poker.kind >= 4 && has('focus'))
      add('focus', '星河贯注', 20);
    if (cards.length >= 5 && has('mend'))
      add('mend', '灯火回暖', 8 + (shieldNeighbor('mend') ? 4 : 0), 'heal');
    if (cards.length >= 5 && has('draw'))
      add(
        'draw',
        '催信接力',
        itemEnd(position('draw')!) === BAG_CELLS ? 2 : 1,
        'draw',
      );
    if (has('cinder'))
      add(
        'cinder',
        '余烬燎原',
        cards.filter((card) => card.suit % 2 === 1).length >= 2 ? 5 : 3,
        'burn',
      );
    if (has('ash') && poker.kind >= 1 && (context.target?.burn ?? 0) >= 6)
      add('ash', '焰纹燃爆', 24);
    const clubs = cards.filter((card) => card.suit === 2).length;
    if (has('poison') && clubs) add('poison', '青苔侵蚀', clubs * 3, 'poison');
    if (has('umbrella') && [1, 2, 6].includes(poker.kind))
      add('umbrella', '补丁护心', 18, 'shield');
    if (has('ward'))
      add('ward', '守灯结界', position('ward')?.start === 0 ? 10 : 6, 'shield');
    if (has('shieldbash') && cards.length >= 2)
      add('shieldbash', '护心重映', Math.floor((context.shield ?? 0) * 0.4));
    if (has('wash') && cards.some((card) => card.suit === 1)) {
      add('wash', '清露回暖', 4, 'heal');
      add(
        'wash',
        '清露净化',
        Math.min(4, context.burn ?? 0) + Math.min(4, context.poison ?? 0),
        'cleanse',
      );
    }
    if (has('growth') && same) add('growth', '续曲生长', 4, 'growth');
    if (has('tempo') && changed) add('tempo', '换调共鸣', 8);
    const blacks = cards.filter((card) => card.suit % 2 === 0).length;
    if (has('slow') && blacks >= 2) add('slow', '止雨留息', 1500, 'slow');
    if (has('needle') && blacks >= 2) add('needle', '穿幕一线', 35, 'pierce');
    if (has('drain')) add('drain', '回甘汲取', 25, 'leech');
  }
  const total = (kind: EffectKind) =>
    effects
      .filter((effect) => effect.kind === kind)
      .reduce((sum, effect) => sum + effect.value, 0);
  const relic = (name: string, value: number, kind: EffectKind) =>
    effects.push({ source: `relic:${context.relic}`, name, value, kind });
  if (cards.length) {
    if (context.relic === 'ember' && total('burn'))
      relic('灶心添火', 2, 'burn');
    if (context.relic === 'toxin' && total('poison'))
      relic('浸露添毒', 2, 'poison');
    if (context.relic === 'echo' && context.echo)
      relic('余响回奏', context.echo, 'damage');
    if (context.relic === 'relay' && ((context.throws ?? 0) + 1) % 3 === 0)
      relic('第三声接力', 1, 'draw');
    if (
      context.relic === 'seed' &&
      cards.length >= 3 &&
      ((context.cultivatedThrows ?? 0) + 1) % 3 === 0
    )
      relic(
        '来年发芽',
        Math.max(
          0,
          Math.min(4, MAX_POWER - (context.power ?? 0) - total('growth')),
        ),
        'growth',
      );
    if (
      context.relic === 'frost' &&
      total('slow') &&
      (context.tick ?? 0) >= (context.nextRelic ?? 0)
    )
      relic(
        '止雨护灯',
        Math.max(
          0,
          Math.min(12, MAX_SHIELD - (context.shield ?? 0) - total('shield')),
        ),
        'shield',
      );
  }
  const itemBonus = effects
      .filter(
        (effect) =>
          effect.kind === 'damage' && effect.source.startsWith('item:'),
      )
      .reduce((sum, effect) => sum + effect.value, 0),
    relicBonus = effects
      .filter(
        (effect) =>
          effect.kind === 'damage' && effect.source.startsWith('relic:'),
      )
      .reduce((sum, effect) => sum + effect.value, 0);
  return {
    ...poker,
    itemBonus,
    relicBonus,
    damage:
      poker.damage +
      itemBonus +
      relicBonus +
      (cards.length ? (context.power ?? 0) : 0),
    heal: total('heal'),
    shield: total('shield'),
    burn: total('burn'),
    poison: total('poison'),
    slow: total('slow'),
    pierce: total('pierce'),
    growth: total('growth'),
    draw: total('draw'),
    leech: total('leech') / 100,
    currentSuit,
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
  fighter.throws++;
  if (cards.length >= 3) fighter.cultivatedThrows++;
  fighter.echo = 0;
  for (const effect of score.effects) effectEvent(state, side, effect);
  for (const effect of score.effects)
    if (effect.kind === 'heal' && effect.value > 0)
      healFighter(state, side, effect.value, effect.name, effect.source);
  fighter.shield = Math.min(MAX_SHIELD, fighter.shield + score.shield);
  fighter.power = Math.min(MAX_POWER, fighter.power + score.growth);
  if (
    score.effects.some(
      (effect) => effect.source === 'item:wash' && effect.kind === 'cleanse',
    )
  ) {
    fighter.burn = Math.max(0, fighter.burn - 4);
    fighter.poison = Math.max(0, fighter.poison - 4);
  }
  if (score.effects.some((effect) => effect.source === 'relic:frost'))
    fighter.nextRelic = state.tick + ticks(6000);
  fighter.lastSuit = score.currentSuit;
  for (let i = 0; i < score.draw; i++) draw(state, side);
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
/** AI can single-select or box one continuous range; never pick scattered IDs. */
export function recommendCards(
  hand: PlayingCard[],
  items: ItemId[],
  style: Style,
  context: PreviewContext = {},
): PlayingCard[] {
  if (!hand.length) return [];
  if (style === 'quick')
    return [hand.reduce((best, card) => (card.rank > best.rank ? card : best))];
  let best = [hand[0]],
    bestValue = -1;
  for (let start = 0; start < hand.length; start++)
    for (let length = 1; length <= hand.length - start; length++) {
      const candidate = hand.slice(start, start + length),
        score = previewThrow(candidate, items, context);
      const goal =
        style === 'sequence'
          ? score.kind >= 4
          : style === 'pair' || style === 'guard'
            ? [1, 2, 6].includes(score.kind)
            : true;
      const value =
        (score.damage +
          score.burn * 6 +
          score.poison * 9 +
          score.shield * 0.6 +
          score.heal * 0.8 +
          score.growth * 12 +
          score.slow * 0.008 +
          (goal ? 20 : 0)) /
        Math.pow(length, 0.65);
      if (value > bestValue) {
        bestValue = value;
        best = candidate;
      }
    }
  return best;
}
function loseHealth(fighter: ThrowFighter, amount: number, pierce = 0) {
  const bypass = Math.floor((amount * pierce) / 100),
    blocked = Math.min(fighter.shield, amount - bypass);
  fighter.shield -= blocked;
  const health = Math.min(fighter.hp, amount - blocked);
  fighter.hp -= health;
  return { health, blocked };
}
function finish(state: ThrowDuel) {
  const [player, enemy] = state.fighters;
  if (player.hp === 0 || enemy.hp === 0 || state.tick >= ticks(120000)) {
    state.status = 'ended';
    state.winner =
      player.hp === enemy.hp ? 'draw' : player.hp > enemy.hp ? 0 : 1;
    return true;
  }
  return false;
}
export function stepThrowDuel(state: ThrowDuel): ThrowDuel {
  if (state.status !== 'playing') return state;
  const next = structuredClone(state);
  next.tick++;
  const hits = next.shots.filter((shot) => shot.hitTick <= next.tick);
  next.shots = next.shots.filter((shot) => shot.hitTick > next.tick);
  const heals: { side: Side; amount: number }[] = [];
  for (const shot of hits) {
    const targetSide: Side = shot.side === 0 ? 1 : 0,
      target = next.fighters[targetSide],
      attacker = next.fighters[shot.side],
      result = loseHealth(target, shot.damage, shot.pierce);
    attacker.hits++;
    addEvent(
      next,
      shot.side,
      'hit',
      shot.name,
      result.health + result.blocked,
      {
        kind: 'damage',
        combo: shot.kind,
        hpDamage: result.health,
        shieldDamage: result.blocked,
      },
    );
    target.burn = Math.min(60, target.burn + shot.burn);
    target.poison = Math.min(40, target.poison + shot.poison);
    if (shot.slow)
      target.slowUntil = Math.max(
        target.slowUntil,
        next.tick + ticks(shot.slow),
      );
    if (shot.leech && result.health)
      heals.push({
        side: shot.side,
        amount: Math.floor(result.health * shot.leech),
      });
    if (result.health + result.blocked > 0) {
      let reflected = 0;
      if (target.items.includes('thorns')) {
        const strong = adjacentThrowItems(target.layout, 'thorns').some(
          (item) => itemDefinition(item.id).family === 'shield',
        );
        reflected += strong ? 10 : 4;
        effectEvent(next, targetSide, {
          source: 'item:thorns',
          name: strong ? '护灯回声' : '针盒反击',
          value: strong ? 10 : 4,
          kind: 'damage',
        });
      }
      if (target.relic === 'bastion' && result.blocked) {
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
        addEvent(
          next,
          targetSide,
          'hit',
          '反击',
          response.health + response.blocked,
          {
            kind: 'damage',
            hpDamage: response.health,
            shieldDamage: response.blocked,
          },
        );
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
    if (next.fighters[request.side].hp > 0) {
      const actual = healFighter(
        next,
        request.side,
        request.amount,
        '回甘汲取',
        'item:drain',
      );
      if (actual)
        effectEvent(next, request.side, {
          source: 'item:drain',
          name: '回甘汲取',
          value: actual,
          kind: 'heal',
        });
    }
  if (next.tick % ticks(1000) === 0)
    for (const side of [0, 1] as const) {
      const fighter = next.fighters[side],
        source: Side = side === 0 ? 1 : 0;
      if (fighter.burn) {
        const damage = loseHealth(fighter, fighter.burn);
        fighter.burn--;
        addEvent(next, source, 'dot', '灼烧', damage.health + damage.blocked, {
          kind: 'burn',
          hpDamage: damage.health,
          shieldDamage: damage.blocked,
        });
      }
      if (fighter.poison) {
        const damage = loseHealth(fighter, fighter.poison, 100);
        addEvent(next, source, 'dot', '剧毒', damage.health, {
          kind: 'poison',
          hpDamage: damage.health,
          shieldDamage: 0,
        });
      }
    }
  if (finish(next)) return next;
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
    ai.thinkTick =
      next.tick +
      ticks(
        ai.style === 'quick' ? 2400 : ai.style === 'sequence' ? 4000 : 2800,
      );
  } else if (
    !ai.intent.length &&
    next.tick >= ai.thinkTick &&
    enemy.hand.length
  ) {
    const cards = recommendCards(enemy.hand, enemy.items, ai.style, {
        ...enemy,
        target: next.fighters[0],
        tick: next.tick,
      }),
      score = scorePoker(cards);
    const ready =
      ai.style === 'sequence'
        ? score.kind >= 4 || enemy.hand.length === handLimit(enemy.relic)
        : ai.style === 'pair' || ai.style === 'guard'
          ? score.kind >= 1 || enemy.hand.length === handLimit(enemy.relic)
          : true;
    if (ready) {
      ai.intent = cards.map((card) => card.uid);
      ai.releaseTick = next.tick + ticks(1000);
    } else ai.thinkTick = next.tick + ticks(450);
  }
  return next;
}
