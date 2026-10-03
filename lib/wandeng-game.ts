import { cardDef } from './cards/catalog.ts';
import { simulateArenaDuel, validateArenaBoard } from './arena-engine.ts';
import type { Duel, FighterCard } from './cards/combat.ts';
import { ARENA_CARDS, AMPLIFIERS } from './arena-catalog.ts';
import { cardIllustration } from './arena-card-face.ts';
import { decodeSave, encodeSave } from '../packages/core/save-envelope.ts';

export const WANDENG_SAVE_KEY = 'f9-wandeng-run-v1';
export const CARD_RULES_VERSION = 'f9-arena/1';
export function serializeWandeng(state: WandengState): string {
  return encodeSave('cards', CARD_RULES_VERSION, state);
}
export const SOULS: Record<
  string,
  { name: string; tile: number; story: string; rule: string }
> = {
  ...Object.fromEntries(
    ARENA_CARDS.map((c) => [
      c.id,
      {
        name: c.name,
        tile: cardIllustration(c.id),
        story: '旧物的痕迹里，还藏着一段等待被听见的故事。',
        rule: c.text,
      },
    ]),
  ),
  'arena-03': {
    name: '星轨放映机',
    tile: 1,
    story: '它还记得散场后，最后一个人的掌声。',
    rule: '慢速重击同路敌人。独占一整条路线。',
  },
  'arena-17': {
    name: '草叶药匣',
    tile: 3,
    story: '木匣里留着晒过太阳的草叶香。',
    rule: '直击并施加侵蚀，逐渐削弱同路屏障。',
  },
  'arena-21': {
    name: '旧缝纫盒',
    tile: 5,
    story: '有些针脚歪歪扭扭，却一直没有松开。',
    rule: '周期修复本路屏障；屏障破裂后无法重建。',
  },
  'arena-31': {
    name: '黄铜座钟',
    tile: 7,
    story: '它等的那个人，总是晚五分钟回家。',
    rule: '为同路紧邻的第一件伙伴推进冷却。',
  },
  'arena-13': {
    name: '暖炉茶壶',
    tile: 2,
    story: '壶底还留着一圈，给晚归人留的温度。',
    rule: '直击同路；目标已灼烧时，伤害提高。',
  },
  'arena-12': {
    name: '引火夜灯',
    tile: 11,
    story: '小小的火光，一直等着谁来借。',
    rule: '同路紧邻伙伴直击时，追加灼烧。',
  },
  'arena-28': {
    name: '蓝木音乐盒',
    tile: 6,
    story: '这一次，你愿意听完这一首吗？',
    rule: '恢复生命，并清除己方一条路线的部分灼烧。',
  },
  'arena-33': {
    name: '停摆闹钟',
    tile: 7,
    story: '不用赶路的时候，它也想慢慢走。',
    rule: '周期迟滞敌方同路一件器具。',
  },
  'arena-26': {
    name: '补丁旧伞',
    tile: 4,
    story: '伞面有三种颜色，来自三个下雨天。',
    rule: '本路屏障实际承伤后储能，下次发动反击。',
  },
  'arena-43': {
    name: '书桌小灯',
    tile: 0,
    story: '灯下那张没画完的画，它替人留着。',
    rule: '敌方同列有器具时，额外伤害其屏障。',
  },
  'arena-37': {
    name: '旧信匣',
    tile: 10,
    story: '那些没有寄出的信，也有人替它们记得。',
    rule: '为同路紧邻的弹药器具补充弹药。',
  },
  'arena-01': {
    name: '蓝叶小风扇',
    tile: 8,
    story: '风经过的时候，它总想再转一圈。',
    rule: '快速直击，六次弹药耗尽后需要装填。',
  },
};
export const CHAPTERS = [
  {
    name: '拾灯旧街',
    subtitle: '从一声轻轻的呼唤开始',
    boss: '桥头收货人',
    quote: '“你若赢了，这些旧物中有一件跟你走。”',
    fee: 8,
  },
  {
    name: '雨声寄售巷',
    subtitle: '价签后面，还有没说完的故事',
    boss: '寄售代理人',
    quote: '“修复的手艺不错。让我看看它们的本事。”',
    fee: 12,
  },
  {
    name: '万灯桥',
    subtitle: '带着一路的相遇，走向那封信',
    boss: '周掌柜',
    quote: '“当年的小徒弟，也有自己的坚持了。”',
    fee: 16,
  },
];
export type Soul = {
  uid: string;
  id: string;
  level: number;
  at: number | null;
  origin: string;
};
export type Phase =
  | 'comic'
  | 'lesson'
  | 'letter'
  | 'departure'
  | 'journey'
  | 'event'
  | 'battle'
  | 'result'
  | 'ending';
export type EventKind = 'find' | 'repair' | 'work' | 'shop' | 'duel';
export type Offer = {
  id: string;
  kind: EventKind;
  title: string;
  description: string;
  label: string;
  tile: number;
};
export type Battle = {
  id: string;
  kind: 'lesson' | 'duel' | 'boss';
  duel: Duel;
};
export type BattleReceipt = {
  winner: number;
  duration: number;
  hp: number[];
  paid: number;
  borrowed: number;
  gain: number;
  received: string | null;
};
export type WandengState = {
  version: 1;
  seed: number;
  phase: Phase;
  chapter: number;
  step: number;
  lessonStep: number;
  coins: number;
  debt: number;
  inventory: Soul[];
  amplifiers: Array<string | null>;
  history: Battle[];
  /** Legacy in-progress offers stay unchanged when a v1 bookmark is migrated. */
  pendingItems?: string[];
  serial: number;
  attempt: number;
  selectedEvent: EventKind | null;
  battle: Battle | null;
  receipt: BattleReceipt | null;
  settled: string[];
  journal: string[];
  delivered: boolean;
};
export type WandengAction =
  | {
      type:
        | 'comic-done'
        | 'lesson-next'
        | 'read-letter'
        | 'depart'
        | 'auto-place'
        | 'start-lesson'
        | 'start-boss'
        | 'resolve-battle'
        | 'continue'
        | 'deliver'
        | 'cancel-event';
    }
  | { type: 'place'; uid: string; at: number | null }
  | { type: 'amplifier'; lane: number; id: string | null }
  | { type: 'repair'; uid: string }
  | { type: 'choose-event'; id: string }
  | { type: 'event-choice'; choice: number; uid?: string };

const STARTERS: Array<[string, number | null]> = [
  ['arena-03', 0],
  ['arena-17', 3],
  ['arena-21', 4],
  ['arena-31', null],
];
export function createWandeng(seed = 260926): WandengState {
  return {
    version: 1,
    seed,
    phase: 'comic',
    chapter: 0,
    step: 0,
    lessonStep: 0,
    coins: 18,
    debt: 0,
    inventory: STARTERS.map(([id, at], i) => ({
      uid: `w-${seed}-${i}`,
      id,
      at,
      level: 0,
      origin: '师傅的修理铺',
    })),
    amplifiers: [null, null, null],
    history: [],
    serial: 4,
    attempt: 0,
    selectedEvent: null,
    battle: null,
    receipt: null,
    settled: [],
    journal: ['你听见了物品的声音。'],
    delivered: false,
  };
}
export function soulName(id: string) {
  return SOULS[id]?.name ?? cardDef(id).name;
}
export function fighter(s: Soul): FighterCard {
  return {
    uid: s.uid,
    id: s.id,
    level: s.level,
    quality: 0,
    rarity: cardDef(s.id).rarity ?? 0,
    at: s.at ?? 0,
  };
}
export function playerBoard(s: WandengState) {
  return s.inventory.filter((c) => c.at !== null).map(fighter);
}
function hash(value: string) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function addSoul(
  s: WandengState,
  id: string,
  origin: string,
  level = 0,
  uid?: string,
) {
  const card: Soul = {
    uid: uid ?? `w-${s.seed}-${s.serial++}`,
    id,
    level,
    at: null,
    origin,
  };
  if (s.inventory.some((existing) => existing.uid === card.uid))
    throw Error('物品身份重复，未完成本次转移。');
  s.inventory.push(card);
  return card;
}
function income(s: WandengState, amount: number) {
  const repaid = Math.min(s.debt, amount);
  s.debt -= repaid;
  s.coins += amount - repaid;
}
function log(s: WandengState, message: string) {
  s.journal = [...s.journal, message].slice(-30);
}
function autoPlace(s: WandengState) {
  const occupied = new Set<number>(),
    copies: Record<string, number> = {};
  for (const c of s.inventory) {
    c.at = null;
    const size = cardDef(c.id).size;
    if ((copies[c.id] ?? 0) >= 2) continue;
    for (let at = 0; at < 9; at++) {
      if (
        Math.floor(at / 3) !== Math.floor((at + size - 1) / 3) ||
        at + size > 9
      )
        continue;
      if (
        Array.from({ length: size }, (_, i) => at + i).some((p) =>
          occupied.has(p),
        )
      )
        continue;
      c.at = at;
      for (let n = 0; n < size; n++) occupied.add(at + n);
      copies[c.id] = (copies[c.id] ?? 0) + 1;
      break;
    }
  }
}
export function eventOffers(s: WandengState): Offer[] {
  const prefix = `${s.seed}-${s.chapter}-${s.step}`;
  const table: Record<EventKind, Omit<Offer, 'id' | 'kind'>> = {
    find: {
      title: ['窗边的微光', '雨棚下的旧箱', '桥边的回声'][s.chapter],
      description: '两件沉默的旧物，等着有人听见。选择一件同行。',
      label: '接引 · 获得物品',
      tile: 0,
    },
    repair: {
      title: '借一盏修理灯',
      description: '为一件同行物品修缮两级，让原本的功效更强。',
      label: '修缮 · 免费成长',
      tile: 5,
    },
    work: {
      title: '替街坊修点小东西',
      description: '把歪掉的伞骨扶正，收下 10 枚路费。',
      label: '帮工 · 路费 +10',
      tile: 4,
    },
    shop: {
      title: '旧物摊的约定',
      description: '付清寄售费用，接回一件物品。价格写在卡片上。',
      label: '交易 · 6 / 9 路费',
      tile: 10,
    },
    duel: {
      title: '同行的灵魂对决',
      description: '获胜接回一件物品并获得路费；战败付钱赎回伙伴。',
      label: '对决 · 风险 6 路费',
      tile: 7,
    },
  };
  const kinds: EventKind[] =
    s.step === 1 ? ['shop', 'repair', 'duel'] : ['find', 'repair', 'work'];
  return kinds.map((kind, i) => ({
    ...table[kind],
    kind,
    id: `${prefix}-${i}`,
  }));
}
export function eventItems(s: WandengState): string[] {
  if (s.pendingItems) return [...s.pendingItems];
  return itemsFromPool(
    s,
    ARENA_CARDS.map((c) => c.id),
  );
}
function legacyItems(s: WandengState): string[] {
  return itemsFromPool(s, [
    'arena-28',
    'arena-26',
    'arena-43',
    'arena-13',
    'arena-17',
    'arena-33',
    'arena-31',
    'arena-12',
  ]);
}
function itemsFromPool(s: WandengState, pool: string[]): string[] {
  const at =
    hash(`${s.seed}:${s.chapter}:${s.step}:${s.selectedEvent}`) % pool.length;
  return [pool[at], pool[(at + 3) % pool.length]];
}
function enterBattle(s: WandengState, kind: Battle['kind'], preview = false) {
  const board = playerBoard(s);
  validateArenaBoard(board);
  if (!preview && !board.length) throw Error('至少需要一件物品上阵。');
  const id = `${s.seed}:${kind}:${s.chapter}:${s.step}:${s.attempt++}`;
  const slots: Array<[string, number]> =
    kind === 'lesson'
      ? [
          ['arena-43', 3],
          ['arena-21', 6],
        ]
      : s.chapter === 0
        ? [
            ['arena-03', 0],
            ['arena-13', 3],
            ['arena-12', 5],
            ['arena-21', 6],
          ]
        : s.chapter === 1
          ? [
              ['arena-03', 0],
              ['arena-17', 3],
              ['arena-21', 4],
              ['arena-33', 5],
              ['arena-13', 6],
              ['arena-12', 8],
            ]
          : [
              ['arena-03', 0],
              ['arena-13', 3],
              ['arena-12', 5],
              ['arena-26', 6],
              ['arena-21', 8],
            ];
  const hp =
    kind === 'lesson'
      ? 80
      : kind === 'duel'
        ? 160 + s.chapter * 30
        : [190, 250, 315][s.chapter];
  const shield = kind === 'lesson' ? 20 : 50 + s.chapter * 15;
  s.battle = {
    id,
    kind,
    duel: {
      player: board,
      enemy: slots.map(([cardId, at], i) =>
        fighter({
          uid: `enemy-${id}-${i}`,
          id: cardId,
          at,
          level: kind === 'lesson' ? 0 : s.chapter,
          origin: '对手的物品',
        }),
      ),
      maxHp: [300 + s.chapter * 30, hp],
      barrierHp: [
        [90, 90, 90],
        [shield, shield, shield],
      ],
      weather: 0,
      weatherEnabled: false,
      layout: 0,
      name:
        kind === 'lesson'
          ? '许师傅的练习'
          : kind === 'duel'
            ? '路边的物灵者'
            : CHAPTERS[s.chapter].boss,
      kind: 'guardian',
      botId: null,
      arena: {
        version: 1,
        amplifiers: [
          [...s.amplifiers],
          kind === 'lesson'
            ? [null, null, null]
            : [
                ['amp-04', 'amp-05', 'amp-01'],
                ['amp-08', 'amp-06', 'amp-05'],
                ['amp-04', 'amp-05', 'amp-07'],
              ][s.chapter],
        ],
      },
    },
  };
  s.phase = 'battle';
  s.receipt = null;
}
/** Exact next battle input, without consuming an attempt or starting combat. */
export function previewWandengBattle(
  s: WandengState,
  kind: Battle['kind'],
): Battle {
  const copy = structuredClone(s);
  enterBattle(copy, kind, true);
  return copy.battle!;
}
function validateAmps(row: unknown) {
  if (
    !Array.isArray(row) ||
    row.length !== 3 ||
    row.some((id) => id !== null && !AMPLIFIERS.some((a) => a.id === id))
  )
    throw Error('每路只能装备一个有效增幅器。');
}
export function validateWandengBattle(b: Battle) {
  if (
    !b ||
    typeof b.id !== 'string' ||
    !b.id ||
    !['lesson', 'duel', 'boss'].includes(b.kind) ||
    !b.duel?.arena ||
    b.duel.arena.version !== 1
  )
    throw Error('对决记录无效。');
  const d = b.duel;
  if (
    !Array.isArray(d.arena!.amplifiers) ||
    d.arena!.amplifiers.length !== 2 ||
    !Array.isArray(d.maxHp) ||
    d.maxHp.length !== 2 ||
    d.maxHp.some((n) => !Number.isFinite(n) || n <= 0 || n > 100000) ||
    !Array.isArray(d.barrierHp) ||
    d.barrierHp.length !== 2 ||
    d.barrierHp.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== 3 ||
        row.some((n) => !Number.isFinite(n) || n < 0 || n > 100000),
    )
  )
    throw Error('对决数值无效。');
  d.arena!.amplifiers.forEach(validateAmps);
  validateArenaBoard(d.player);
  validateArenaBoard(d.enemy);
  const uids = [...d.player, ...d.enemy].map((c) => c.uid);
  if (new Set(uids).size !== uids.length) throw Error('双方物品身份重复。');
}
export function serializeWandengReplay(battle: Battle) {
  validateWandengBattle(battle);
  return encodeSave('cards', CARD_RULES_VERSION, { version: 1, battle });
}
export function parseWandengReplay(text: string): Battle {
  if (text.length > 100000) throw Error('回放文件过大。');
  const raw = decodeSave(text, 'cards', CARD_RULES_VERSION) as { version?: number; battle: Battle };
  if (raw?.version !== 1) throw Error('回放版本不支持。');
  validateWandengBattle(raw.battle);
  return raw.battle;
}
function finishEvent(s: WandengState) {
  s.step++;
  s.selectedEvent = null;
  delete s.pendingItems;
  s.phase = 'journey';
}
export function wandengReducer(
  previous: WandengState,
  action: WandengAction,
): WandengState {
  const s = structuredClone(previous);
  const requirePhase = (...phases: Phase[]) => {
    if (!phases.includes(s.phase)) throw Error('当前阶段不能执行这个操作。');
  };
  const requirePreparation = () => {
    if (
      !['lesson', 'journey'].includes(s.phase) &&
      !(s.phase === 'event' && s.selectedEvent === 'duel')
    )
      throw Error('只能在开战前调整阵容。');
  };
  switch (action.type) {
    case 'comic-done':
      requirePhase('comic');
      s.phase = 'lesson';
      break;
    case 'lesson-next':
      requirePhase('lesson');
      s.lessonStep = 1;
      break;
    case 'place': {
      requirePreparation();
      const c = s.inventory.find((x) => x.uid === action.uid);
      if (!c) throw Error('没有找到这件物品。');
      c.at = action.at;
      validateArenaBoard(playerBoard(s));
      break;
    }
    case 'auto-place':
      requirePreparation();
      autoPlace(s);
      break;
    case 'amplifier':
      requirePreparation();
      if (!Number.isInteger(action.lane) || action.lane < 0 || action.lane > 2)
        throw Error('请选择有效路线。');
      s.amplifiers[action.lane] = action.id;
      validateAmps(s.amplifiers);
      break;
    case 'repair': {
      requirePreparation();
      if (s.phase === 'lesson') throw Error('完成第一课后才能修缮物品。');
      const c = s.inventory.find((x) => x.uid === action.uid);
      if (!c || c.level >= 6) throw Error('这件物品已经修缮到本次旅途的上限。');
      if (s.coins < 6) throw Error('修缮需要 6 枚路费，可以先去帮工。');
      s.coins -= 6;
      c.level = Math.min(6, c.level + 2);
      log(s, `${soulName(c.id)}经过修缮，来到 ${c.level} 级。`);
      break;
    }
    case 'start-lesson':
      requirePhase('lesson');
      if (
        s.lessonStep !== 1 ||
        s.inventory.find((c) => c.id === 'arena-31')?.at !== 5
      )
        throw Error('先把黄铜座钟放到中路最右格。');
      enterBattle(s, 'lesson');
      break;
    case 'read-letter':
      requirePhase('letter');
      s.phase = 'departure';
      break;
    case 'depart':
      requirePhase('departure');
      s.phase = 'journey';
      log(s, '带着师傅的叮嘱，走进拾灯旧街。');
      break;
    case 'choose-event': {
      requirePhase('journey');
      if (s.step >= 3) throw Error('这一段旅途已经走完，前方是守关人。');
      const event = eventOffers(s).find((e) => e.id === action.id);
      if (!event) throw Error('事件已过期。');
      s.selectedEvent = event.kind;
      s.phase = 'event';
      break;
    }
    case 'cancel-event':
      requirePhase('event');
      s.phase = 'journey';
      s.selectedEvent = null;
      delete s.pendingItems;
      break;
    case 'event-choice': {
      requirePhase('event');
      if (action.choice !== 0 && action.choice !== 1)
        throw Error('请选择一个有效选项。');
      const kind = s.selectedEvent;
      if (kind === 'find' || kind === 'shop') {
        const price = kind === 'shop' ? [6, 9][action.choice] : 0;
        if (s.coins < price) throw Error('路费不足。可以返回选择其他事件。');
        const id = eventItems(s)[action.choice];
        s.coins -= price;
        addSoul(s, id, CHAPTERS[s.chapter].name);
        log(s, `你接回了${soulName(id)}。它会陪你走完这段旅途。`);
        finishEvent(s);
      } else if (kind === 'repair') {
        const c = s.inventory.find((x) => x.uid === action.uid);
        if (!c || c.level >= 6) throw Error('请选择尚未修缮到 6 级的物品。');
        c.level = Math.min(6, c.level + 2);
        log(s, `灯下，你为${soulName(c.id)}修补了灵魂。`);
        finishEvent(s);
      } else if (kind === 'work') {
        income(s, 10);
        log(s, '帮街坊修好了小东西，得到 10 枚路费，优先偿还赎回欠款。');
        finishEvent(s);
      } else if (kind === 'duel') enterBattle(s, 'duel');
      else throw Error('没有正在进行的事件。');
      break;
    }
    case 'start-boss':
      requirePhase('journey');
      if (s.step !== 3) throw Error('先完成这一段的三个事件。');
      enterBattle(s, 'boss');
      break;
    case 'resolve-battle': {
      requirePhase('battle');
      const b = s.battle;
      if (!b || s.settled.includes(b.id)) throw Error('这场对决已经结算。');
      const result = simulateArenaDuel(b.duel),
        receipt: BattleReceipt = {
          winner: result.winner,
          duration: result.duration,
          hp: result.frames.at(-1)!.hp,
          paid: 0,
          borrowed: 0,
          gain: 0,
          received: null,
        };
      if (b.kind !== 'lesson' && result.winner === 0) {
        receipt.gain = b.kind === 'boss' ? 10 : 6;
        income(s, receipt.gain);
        const c =
          b.duel.enemy[hash(`${s.seed}:${b.id}:drop`) % b.duel.enemy.length];
        addSoul(s, c.id, b.duel.name, c.level, c.uid);
        receipt.received = c.uid;
        log(s, `你赢下${b.duel.name}的对决，接回${soulName(c.id)}。`);
      } else if (b.kind !== 'lesson' && result.winner === 1) {
        const fee = b.kind === 'boss' ? CHAPTERS[s.chapter].fee : 6;
        receipt.paid = Math.min(s.coins, fee);
        receipt.borrowed = fee - receipt.paid;
        s.coins -= receipt.paid;
        s.debt += receipt.borrowed;
        log(
          s,
          `支付 ${fee} 枚赎回路费，同行物品全部保留${receipt.borrowed ? `，师傅垫付 ${receipt.borrowed} 枚` : ''}。`,
        );
      }
      s.settled.push(b.id);
      s.history = [...s.history, structuredClone(b)].slice(-30);
      s.receipt = receipt;
      s.phase = 'result';
      break;
    }
    case 'continue': {
      requirePhase('result');
      if (!s.battle || !s.receipt) throw Error('尚无战斗结果。');
      const { kind } = s.battle,
        won = s.receipt.winner === 0;
      if (kind === 'lesson') {
        if (won) {
          addSoul(s, 'arena-13', '师傅的临行礼');
          addSoul(s, 'arena-12', '师傅的临行礼');
          autoPlace(s);
          addSoul(s, 'arena-28', '你听完了它的第一首曲子');
          s.phase = 'letter';
        } else s.phase = 'lesson';
      } else if (kind === 'boss') {
        if (won && s.chapter === 2) s.phase = 'ending';
        else {
          if (won) {
            s.chapter++;
            s.step = 0;
          } else {
            s.step = 2;
            log(s, '先回街边整备一次，再挑战守关人。');
          }
          s.phase = 'journey';
        }
      } else finishEvent(s);
      s.selectedEvent = null;
      s.battle = null;
      s.receipt = null;
      break;
    }
    case 'deliver':
      requirePhase('ending');
      if (s.delivered) throw Error('这套物品已经送达。');
      s.delivered = true;
      log(s, `你把 ${s.inventory.length} 件照顾好的物品送到万灯归物所。`);
      break;
  }
  validateArenaBoard(playerBoard(s));
  return s;
}

export function parseWandeng(raw: string): WandengState {
  const s = decodeSave(raw, 'cards', CARD_RULES_VERSION) as WandengState;
  const integer = (n: unknown, max = 1e6) =>
    typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
  if (
    !s ||
    s.version !== 1 ||
    !integer(s.seed, 0xffffffff) ||
    ![
      'comic',
      'lesson',
      'letter',
      'departure',
      'journey',
      'event',
      'battle',
      'result',
      'ending',
    ].includes(s.phase) ||
    !integer(s.chapter, 2) ||
    !integer(s.step, 3) ||
    !integer(s.lessonStep, 1) ||
    !integer(s.coins) ||
    !integer(s.debt) ||
    !integer(s.serial) ||
    !integer(s.attempt) ||
    typeof s.delivered !== 'boolean'
  )
    throw Error('归物旅途存档格式无效。');
  // Add presentation-era fields without changing an already frozen duel.
  if (s.amplifiers === undefined) {
    if (s.phase === 'event' && ['find', 'shop'].includes(s.selectedEvent ?? ''))
      s.pendingItems = legacyItems(s);
    s.amplifiers = [
      ...(s.battle?.duel.arena?.amplifiers[0] ?? [null, null, null]),
    ];
  }
  if (s.history === undefined)
    s.history =
      s.phase === 'result' && s.battle ? [structuredClone(s.battle)] : [];
  validateAmps(s.amplifiers);
  if (
    s.pendingItems &&
    (!Array.isArray(s.pendingItems) ||
      s.pendingItems.length !== 2 ||
      s.pendingItems.some((id) => !SOULS[id]) ||
      s.phase !== 'event' ||
      !['find', 'shop'].includes(s.selectedEvent ?? ''))
  )
    throw Error('待选物品记录无效。');
  if (
    !Array.isArray(s.inventory) ||
    s.inventory.length > 100 ||
    !s.inventory.length ||
    s.inventory.some(
      (c) =>
        !c ||
        typeof c.uid !== 'string' ||
        !c.uid ||
        !SOULS[c.id] ||
        !integer(c.level, 6) ||
        (c.at !== null && !integer(c.at, 8)) ||
        typeof c.origin !== 'string',
    ) ||
    new Set(s.inventory.map((c) => c.uid)).size !== s.inventory.length
  )
    throw Error('物品存档无效。');
  if (
    !Array.isArray(s.settled) ||
    s.settled.some((x) => typeof x !== 'string') ||
    new Set(s.settled).size !== s.settled.length ||
    !Array.isArray(s.journal) ||
    s.journal.some((x) => typeof x !== 'string') ||
    (s.selectedEvent !== null &&
      !['find', 'repair', 'work', 'shop', 'duel'].includes(s.selectedEvent))
  )
    throw Error('旅途记录无效。');
  if (
    !Array.isArray(s.history) ||
    s.history.length > 30 ||
    new Set(s.history.map((b) => b.id)).size !== s.history.length
  )
    throw Error('回放记录无效。');
  for (const b of s.history) {
    validateWandengBattle(b);
    if (!s.settled.includes(b.id)) throw Error('回放尚未结算。');
  }
  validateArenaBoard(playerBoard(s));
  if (s.phase === 'event' && !s.selectedEvent) throw Error('事件存档不完整。');
  if (s.phase === 'battle' || s.phase === 'result') {
    if (
      !s.battle ||
      typeof s.battle.id !== 'string' ||
      !['lesson', 'duel', 'boss'].includes(s.battle.kind)
    )
      throw Error('对决存档不完整。');
    validateWandengBattle(s.battle);
    if (JSON.stringify(playerBoard(s)) !== JSON.stringify(s.battle.duel.player))
      throw Error('对决阵容与物品记录不一致。');
    if (
      JSON.stringify(s.amplifiers) !==
      JSON.stringify(s.battle.duel.arena!.amplifiers[0])
    )
      throw Error('对决增幅器与整备记录不一致。');
    simulateArenaDuel(s.battle.duel);
    if (s.phase === 'battle' && s.settled.includes(s.battle.id))
      throw Error('已结算的对决不能重复领取结果。');
    if (
      s.phase === 'result' &&
      (!s.receipt ||
        ![-1, 0, 1].includes(s.receipt.winner) ||
        !s.settled.includes(s.battle.id) ||
        ![s.receipt.paid, s.receipt.borrowed, s.receipt.gain].every((n) =>
          integer(n),
        ) ||
        !Number.isFinite(s.receipt.duration) ||
        !Array.isArray(s.receipt.hp) ||
        s.receipt.hp.length !== 2 ||
        s.receipt.hp.some((n) => !Number.isFinite(n)) ||
        (s.receipt.received !== null &&
          !s.inventory.some((c) => c.uid === s.receipt!.received)))
    )
      throw Error('结算存档不完整。');
  }
  if (s.delivered && s.phase !== 'ending') throw Error('送达阶段无效。');
  return s;
}
