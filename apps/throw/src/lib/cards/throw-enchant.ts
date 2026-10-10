/**
 * Card variants (变种). Every one of the 52 cards can be collected in several
 * variants. A deck still holds exactly one copy of each card; the deck book
 * says which variant sits in each slot. Missing entries are plain white cards.
 *
 * Rarity: common (white) / rare (generic enchantments) / epic (stronger
 * generic enchantments) / legendary (one bespoke enchantment per card).
 *
 * This module has no runtime imports so the poker scorer can read card traits
 * without a cycle. Mechanical `text` mirrors `effect` exactly.
 */
import type { PlayingCard, Suit } from './throw-poker.ts';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type EnchantKind =
  | 'damage'
  | 'shield'
  | 'heal'
  | 'burn'
  | 'poison'
  | 'draw'
  | 'pierce'
  | 'slow'
  | 'leech'
  | 'antidote'
  | 'douse';
export type EnchantRaw = { name: string; kind: EnchantKind; value: number };
export type EnchantContext = {
  card: PlayingCard;
  cards: PlayingCard[];
  /** Poker kind of the whole throw (0 high card … 8 straight flush). */
  kind: number;
  /** This card belongs to the scoring combination (pair or better). */
  inCombo: boolean;
  hp: number;
  maxHp: number;
  shield: number;
  /** Your own poison and burn stacks before the throw. */
  poison: number;
  burn: number;
  /** Cards in hand before the throw. */
  hand: number;
  throws: number;
  curtain: boolean;
  target: { burn: number; poison: number; shield: number; hand: number };
};
export type Enchant = {
  id: string;
  rarity: Exclude<Rarity, 'common'>;
  name: string;
  text: string;
  quip: string;
  /** Legendary only: the one card it belongs to. */
  card?: { suit: Suit; rank: number };
  /** Point multiplier for damage (rank × points). */
  points?: number;
  /** Flat points added after the multiplier. */
  plus?: number;
  /** Counts as any suit when forming a flush. */
  wild?: boolean;
  /** Counts as this many cards of its suit for per-suit item effects. */
  weight?: number;
  effect?: (context: EnchantContext) => EnchantRaw[];
};
export type DeckBook = Readonly<Record<string, string>>;

/*
 * ADR-0058: no per-rarity cap. What limits a deck is what you have collected
 * (each owned variant is one copy) and that each card slot holds one variant.
 */
export const RARITY_NAMES: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传奇',
};
export const cardKey = (suit: number, rank: number) => `${suit}-${rank}`;

const one = (name: string, kind: EnchantKind, value: number): EnchantRaw[] =>
  value > 0 ? [{ name, kind, value }] : [];
const single = (c: EnchantContext) => c.cards.length === 1;
const low = (c: EnchantContext) => c.hp * 2 < c.maxHp;
/**
 * v6: rare craft enchantments are banded by rank. Small cards (2–8) carry the
 * full effect, court cards and high pips only a token one, so where a variant
 * sits in the deck book matters and the same craft on ♠3 and ♠K differs.
 */
export const SMALL_RANK = 8;
const banded = (c: EnchantContext, small: number, big: number) => (c.card.rank <= SMALL_RANK ? small : big);

const GENERIC: Enchant[] = [
  // ——— Rare: small, honest, everywhere ———
  { id: 'silver', rarity: 'rare', name: '描银', plus: 4, text: '点数 +4。', quip: '银边描得很细，细到收税员都没注意。' },
  { id: 'edge', rarity: 'rare', name: '磨边', text: '甩出时：直伤 +4；点数 9 及以上只有 +1。', quip: '边磨得能切黄瓜三明治。', effect: (c) => one('磨边', 'damage', banded(c, 4, 1)) },
  { id: 'lining', rarity: 'rare', name: '衬里', text: '甩出时：护盾 +4；点数 9 及以上只有 +1。', quip: '夹层里缝了法兰绒。冬天很受欢迎。', effect: (c) => one('衬里', 'shield', banded(c, 4, 1)) },
  { id: 'mint', rarity: 'rare', name: '薄荷', text: '甩出时：治疗 5；点数 9 及以上只有 2。', quip: '闻一下就精神了。闻两下也是。', effect: (c) => one('薄荷', 'heal', banded(c, 5, 2)) },
  { id: 'seal', rarity: 'rare', name: '火漆', text: '甩出时：灼烧 +2；点数 9 及以上只有 +1。', quip: '封口用的。只是封得有点太热情。', effect: (c) => one('火漆', 'burn', banded(c, 2, 1)) },
  { id: 'moss', rarity: 'rare', name: '苔痕', text: '甩出时：剧毒 +2；点数 9 及以上只有 +1。', quip: '在潮湿的抽屉里放了一个冬天。', effect: (c) => one('苔痕', 'poison', banded(c, 2, 1)) },
  // ——— Epic: stronger, rule-bending ———
  { id: 'gold', rarity: 'epic', name: '镀金', points: 2, text: '点数 ×2。', quip: '真金。至少镀的那一层是。' },
  { id: 'wild', rarity: 'epic', name: '百搭', wild: true, text: '凑同花时可当任意花色。', quip: '它说自己哪种花色都行，听起来像个政客。' },
  { id: 'resonant', rarity: 'epic', name: '共鸣', weight: 2, text: '道具按「每张某花色」结算时，算作 2 张。', quip: '一张牌，两声回响。邻居已经投诉过了。' },
  { id: 'chain', rarity: 'epic', name: '连环', text: '甩出时：抽 1 张。', quip: '它走的时候总会顺手带一位朋友进来。', effect: () => one('连环', 'draw', 1) },
  { id: 'pierce', rarity: 'epic', name: '透甲', text: '甩出时：直伤 +4；单张甩出时，本次 50% 直伤无视护盾。', quip: '护盾只是建议，它一向不太听建议。', effect: (c) => [...one('透甲', 'damage', 4), ...(single(c) ? one('透甲', 'pierce', 50) : [])] },
  { id: 'encore', rarity: 'epic', name: '谢幕', text: '甩出时：护盾 +4，治疗 3；落幕期间 ×3。', quip: '专为最后一鞠躬准备的。', effect: (c) => [...one('谢幕', 'shield', c.curtain ? 12 : 4), ...one('谢幕', 'heal', c.curtain ? 9 : 3)] },
];

type LegendSpec = Omit<Enchant, 'id' | 'rarity' | 'card'>;
const SUIT_LETTER = ['S', 'H', 'C', 'D'] as const;
const RANK_LETTER: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const legendId = (suit: number, rank: number) => `L${SUIT_LETTER[suit]}${RANK_LETTER[rank] ?? rank}`;

/** One bespoke enchantment per card, keyed [suit][rank]. */
const LEGENDS: Record<number, Record<number, LegendSpec>> = {
  // ♠ 黑桃 · 守夜人：伞、门房、钟楼与雨夜
  0: {
    2: { name: '漏雨的伞', text: '单张甩出：护盾 +12。', quip: '只漏一点点。主要漏在你的鞋里。', effect: (c) => (single(c) ? one('漏雨的伞', 'shield', 12) : []) },
    3: { name: '门房的钥匙', text: '甩出时若你已有护盾：护盾 +10。', quip: '门房只给认识的人开门。认识的意思是“已经在门里”。', effect: (c) => (c.shield > 0 ? one('门房的钥匙', 'shield', 10) : []) },
    4: { name: '四方雨棚', text: '在对子及以上的牌型中：护盾 +12。', quip: '四根柱子，一块帆布，和一种不屈的精神。', effect: (c) => (c.inCombo ? one('四方雨棚', 'shield', 12) : []) },
    5: { name: '午夜巡更', text: '甩出时：护盾 +10；落幕期间改为 +24。', quip: '别人散场的时候，他刚开始上班。', effect: (c) => one('午夜巡更', 'shield', c.curtain ? 24 : 10) },
    6: { name: '铁皮信箱', weight: 2, text: '道具按「每张♠」结算时算作 2 张；甩出时护盾 +4。', quip: '塞进去的账单从来没出来过。', effect: () => one('铁皮信箱', 'shield', 4) },
    7: { name: '七级台阶', text: '在顺子及以上的牌型中：护盾 +24。', quip: '爬到第七级，你就会忘了为什么要爬。', effect: (c) => (c.kind >= 4 ? one('七级台阶', 'shield', 24) : []) },
    8: { name: '整点钟楼', text: '你的第 4、8、12……次出手含此牌：护盾 +20。', quip: '它从不迟到，也从不让你忘记这一点。', effect: (c) => ((c.throws + 1) % 4 === 0 ? one('整点报时', 'shield', 20) : []) },
    9: { name: '九号站台', text: '甩出时：命中迟缓对手 0.8 秒。', quip: '列车晚点，深表歉意。歉意也晚点了。', effect: () => one('九号站台', 'slow', 800) },
    10: { name: '十分体面', text: '甩出时若你气场低于一半：护盾 +26。', quip: '再狼狈，领带也得系正。', effect: (c) => (low(c) ? one('十分体面', 'shield', 26) : []) },
    11: { name: '伞兵杰克', text: '单张甩出：直伤 +8，穿透 30%。', quip: '他坚持说那把伞是降落伞。没人敢反驳。', effect: (c) => (single(c) ? [...one('伞兵杰克', 'damage', 8), ...one('伞兵杰克', 'pierce', 30)] : []) },
    12: { name: '黑伞夫人', text: '甩出时：护盾 +8；对手每有 4 层灼烧，再 +4。', quip: '她见过的火比你见过的雨还多。', effect: (c) => one('黑伞夫人', 'shield', 8 + Math.floor(c.target.burn / 4) * 4) },
    13: { name: '守门人', wild: true, text: '百搭（凑同花时可当任意花色）；甩出时：护盾 +8。', quip: '谁都放进来，只要你看起来像会擦鞋的人。', effect: () => one('守门人', 'shield', 8) },
    14: { name: '最后一把伞', text: '甩出时：护盾 +28；落幕期间改为 +48。', quip: '全城的伞都借出去了，只剩这一把。它知道自己的价值。', effect: (c) => one('最后一把伞', 'shield', c.curtain ? 48 : 28) },
  },
  // ♥ 红心 · 茶会：糖、点心与永远的四点钟
  1: {
    2: { name: '两块方糖', weight: 3, text: '道具按「每张♥」结算时算作 3 张。', quip: '医生建议一块。医生不在场。' },
    3: { name: '黄瓜三明治', text: '甩出时：治疗 6。', quip: '去了边的。我们又不是野蛮人。', effect: () => one('黄瓜三明治', 'heal', 6) },
    4: { name: '下午四点', text: '甩出时：净化自身 5 层剧毒和 5 层灼烧。', quip: '四点了。不管发生什么，先喝茶。', effect: () => [...one('下午四点', 'antidote', 5), ...one('下午四点', 'douse', 5)] },
    5: { name: '五分钟茶歇', text: '单张甩出：治疗 8，抽 1 张。', quip: '五分钟。英国标准时间里的五分钟，也就是二十分钟。', effect: (c) => (single(c) ? [...one('五分钟茶歇', 'heal', 8), ...one('五分钟茶歇', 'draw', 1)] : []) },
    6: { name: '六人茶桌', text: '在对子及以上的牌型中：治疗 12。', quip: '六把椅子，五位客人，一位永远在找糖罐。', effect: (c) => (c.inCombo ? one('六人茶桌', 'heal', 12) : []) },
    7: { name: '七分甜', text: '本次出手的直伤，15% 转为治疗。', quip: '甜得刚好。别人的苦，正好用来配茶。', effect: () => one('七分甜', 'leech', 15) },
    8: { name: '饼干罐', text: '甩出时：抽 2 张。', quip: '盖子很紧，但你总能找到办法。', effect: () => one('饼干罐', 'draw', 2) },
    9: { name: '九号病床', text: '甩出时若你气场低于一半：治疗 20。', quip: '护士长说你需要休息。你说你需要赢。', effect: (c) => (low(c) ? one('九号病床', 'heal', 20) : []) },
    10: { name: '十全茶壶', text: '在同花中：治疗 26。', quip: '壶嘴、壶盖、壶柄，一样不缺。罕见。', effect: (c) => (c.kind === 5 || c.kind === 8 ? one('十全茶壶', 'heal', 26) : []) },
    11: { name: '跑堂杰克', text: '甩出时：直伤 +6，治疗 6。', quip: '端茶的手很稳，出牌的手也是。', effect: () => [...one('跑堂杰克', 'damage', 6), ...one('跑堂杰克', 'heal', 6)] },
    12: { name: '红心女王', text: '甩出时：治疗 12；落幕期间改为 30。', quip: '散场了？她从不提前离席。', effect: (c) => one('红心女王', 'heal', c.curtain ? 30 : 12) },
    13: { name: '茶壶国王', wild: true, text: '百搭（凑同花时可当任意花色）；甩出时：治疗 8。', quip: '统治范围：一张茶桌。他对此很满意。', effect: () => one('茶壶国王', 'heal', 8) },
    14: { name: '最后一杯茶', text: '甩出时：治疗 18，净化自身全部剧毒。', quip: '最后一杯总是最好的一杯。因为下一杯要自己泡。', effect: (c) => [...one('最后一杯茶', 'heal', 18), ...one('最后一杯茶', 'antidote', c.poison)] },
  },
  // ♣ 梅花 · 园丁：苔藓、药瓶与不请自来的常春藤
  2: {
    2: { name: '两片苔藓', weight: 3, text: '道具按「每张♣」结算时算作 3 张。', quip: '慢慢长，长遍你家后院。还有你家前院。' },
    3: { name: '三叶草', text: '甩出时：剧毒 +3。', quip: '找了一下午四叶草，最后接受了现实。', effect: () => one('三叶草', 'poison', 3) },
    4: { name: '四月阵雨', text: '单张甩出：剧毒 +5。', quip: '下一阵停一阵，像极了你的手气。', effect: (c) => (single(c) ? one('四月阵雨', 'poison', 5) : []) },
    5: { name: '五点半关园', text: '甩出时：剧毒 +4；落幕期间改为 +9。', quip: '园丁锁门的时候，有些东西被留在了里面。', effect: (c) => one('五点半关园', 'poison', c.curtain ? 9 : 4) },
    6: { name: '六角药瓶', text: '在对子及以上的牌型中：剧毒 +6。', quip: '标签写着“摇匀”。没写摇匀以后会怎样。', effect: (c) => (c.inCombo ? one('六角药瓶', 'poison', 6) : []) },
    7: { name: '七月杂草', text: '甩出时若对手已中毒：剧毒 +5。', quip: '拔不完的。它们比你更有耐心。', effect: (c) => (c.target.poison > 0 ? one('七月杂草', 'poison', 5) : []) },
    8: { name: '常春藤', text: '甩出时：命中迟缓对手 1 秒。', quip: '先缠住脚，再缠住心情。', effect: () => one('常春藤', 'slow', 1000) },
    9: { name: '九号温室', text: '甩出时：对手每有 3 张手牌，剧毒 +1。', quip: '闷热、潮湿，非常适合不该长的东西。', effect: (c) => one('九号温室', 'poison', Math.floor(c.target.hand / 3)) },
    10: { name: '园艺剪', text: '甩出时：直伤 +对手剧毒层数的一半。', quip: '修剪是一门艺术。被修剪的那位不这么认为。', effect: (c) => one('园艺剪', 'damage', Math.floor(c.target.poison / 2)) },
    11: { name: '园丁杰克', text: '单张甩出：剧毒 +4，抽 1 张。', quip: '他说他只是来剪草的。草不信。', effect: (c) => (single(c) ? [...one('园丁杰克', 'poison', 4), ...one('园丁杰克', 'draw', 1)] : []) },
    12: { name: '苔藓夫人', text: '甩出时：剧毒 +5；对手有护盾时再 +5。', quip: '她对盾牌有一种私人恩怨。', effect: (c) => one('苔藓夫人', 'poison', c.target.shield > 0 ? 10 : 5) },
    13: { name: '温室之王', wild: true, text: '百搭（凑同花时可当任意花色）；甩出时：剧毒 +4。', quip: '他的王国是玻璃做的。他从不扔石头。', effect: () => one('温室之王', 'poison', 4) },
    14: { name: '最后一株苔', text: '甩出时：剧毒 +12。', quip: '花园都荒了，它还在。它一直都在。', effect: () => one('最后一株苔', 'poison', 12) },
  },
  // ♦ 方块 · 炉火：火柴、蜡烛与十一月的烟火
  3: {
    2: { name: '两根火柴', weight: 3, text: '道具按「每张♦」结算时算作 3 张。', quip: '一根划不着，另一根划着了太多东西。' },
    3: { name: '三支蜡烛', text: '甩出时：灼烧 +3。', quip: '停电时很浪漫，不停电时很危险。', effect: () => one('三支蜡烛', 'burn', 3) },
    4: { name: '四号炉灶', text: '单张甩出：灼烧 +5。', quip: '只有这一个灶眼好用。所以大家都抢它。', effect: (c) => (single(c) ? one('四号炉灶', 'burn', 5) : []) },
    5: { name: '十一月五日', text: '甩出时：灼烧 +4；落幕期间改为 +9。', quip: '记住，记住。具体记住什么，大家都有点含糊。', effect: (c) => one('十一月五日', 'burn', c.curtain ? 9 : 4) },
    6: { name: '六连烟花', text: '在顺子及以上的牌型中：灼烧 +10。', quip: '一发接一发。第六发通常会让邻居报警。', effect: (c) => (c.kind >= 4 ? one('六连烟花', 'burn', 10) : []) },
    7: { name: '七分熟', text: '甩出时若对手灼烧 ≥5：直伤 +10。', quip: '厨师说这是最好的火候。牛排没有发言权。', effect: (c) => (c.target.burn >= 5 ? one('七分熟', 'damage', 10) : []) },
    8: { name: '八音火炉', text: '甩出时：灼烧 +2，抽 1 张。', quip: '一边烧一边唱，唱得不好，但很暖。', effect: () => [...one('八音火炉', 'burn', 2), ...one('八音火炉', 'draw', 1)] },
    9: { name: '九响礼炮', text: '在对子及以上的牌型中：灼烧 +6。', quip: '原定二十一响。预算只够九响。', effect: (c) => (c.inCombo ? one('九响礼炮', 'burn', 6) : []) },
    10: { name: '十成火候', text: '甩出时若对手有护盾：本次出手 30% 直伤无视护盾。', quip: '火候到了，盾也只是一块铁板。', effect: (c) => (c.target.shield > 0 ? one('十成火候', 'pierce', 30) : []) },
    11: { name: '烧炭杰克', text: '单张甩出：灼烧 +4，直伤 +4。', quip: '脸上总有一道煤灰。他说这是风格。', effect: (c) => (single(c) ? [...one('烧炭杰克', 'burn', 4), ...one('烧炭杰克', 'damage', 4)] : []) },
    12: { name: '钻石夫人', text: '甩出时：灼烧 +4，熄灭自身 4 层灼烧。', quip: '她让别人冒汗，自己从不出汗。', effect: () => [...one('钻石夫人', 'burn', 4), ...one('钻石夫人', 'douse', 4)] },
    13: { name: '炉膛之王', wild: true, text: '百搭（凑同花时可当任意花色）；甩出时：灼烧 +4。', quip: '坐在炉火最旺的地方，还嫌冷。', effect: () => one('炉膛之王', 'burn', 4) },
    14: { name: '最后一块煤', text: '甩出时：灼烧 +12。', quip: '整个冬天就指望它了。它很清楚这一点。', effect: () => one('最后一块煤', 'burn', 12) },
  },
};

const LEGENDARY: Enchant[] = Object.entries(LEGENDS).flatMap(([suit, ranks]) =>
  Object.entries(ranks).map(([rank, spec]) => ({
    ...spec,
    id: legendId(Number(suit), Number(rank)),
    rarity: 'legendary' as const,
    card: { suit: Number(suit) as Suit, rank: Number(rank) },
  })),
);
export const ENCHANTS: readonly Enchant[] = [...GENERIC, ...LEGENDARY];
const BY_ID = new Map(ENCHANTS.map((entry) => [entry.id, entry]));
export const enchantOf = (id: string | undefined) => (id ? BY_ID.get(id) : undefined);
export const legendaryFor = (suit: number, rank: number) => BY_ID.get(legendId(suit, rank))!;
export const GENERIC_ENCHANTS: readonly Enchant[] = GENERIC;

/** Every variant a card can take: common first, then rare, epic, its legendary. */
export const variantsFor = (suit: number, rank: number) => [
  null,
  ...GENERIC,
  legendaryFor(suit, rank),
];
export const cardRarity = (card: Pick<PlayingCard, 'ench'>): Rarity =>
  enchantOf(card.ench)?.rarity ?? 'common';
/** Damage points of a card: its rank, gilded (×) and then silvered (+). */
export const cardPoints = (card: PlayingCard) => {
  const enchant = enchantOf(card.ench);
  return card.rank * (enchant?.points ?? 1) + (enchant?.plus ?? 0);
};
export const isWild = (card: PlayingCard) => Boolean(enchantOf(card.ench)?.wild);
/** How many cards of its own suit this card counts as for per-suit items. */
export const suitWeight = (card: PlayingCard) => enchantOf(card.ench)?.weight ?? 1;

/** A deck book is valid when each entry is a real variant that fits its card. */
export function validDeckBook(book: DeckBook) {
  for (const [key, id] of Object.entries(book)) {
    const match = /^([0-3])-(\d+)$/.exec(key);
    if (!match) return false;
    const suit = Number(match[1]),
      rank = Number(match[2]);
    if (rank < 2 || rank > 14) return false;
    const enchant = BY_ID.get(id);
    if (!enchant) return false;
    if (enchant.card && (enchant.card.suit !== suit || enchant.card.rank !== rank)) return false;
  }
  return true;
}

/** Effects every enchanted card in a throw adds, in card order. */
export function enchantEffects(
  cards: PlayingCard[],
  base: Omit<EnchantContext, 'card' | 'inCombo'>,
  comboIds: readonly string[],
): (EnchantRaw & { source: string })[] {
  const out: (EnchantRaw & { source: string })[] = [];
  for (const card of cards) {
    const enchant = enchantOf(card.ench);
    if (!enchant?.effect) continue;
    const context: EnchantContext = {
      ...base,
      card,
      inCombo: base.kind >= 1 && comboIds.includes(card.uid),
    };
    for (const raw of enchant.effect(context)) out.push({ ...raw, source: `card:${card.uid}` });
  }
  return out;
}
