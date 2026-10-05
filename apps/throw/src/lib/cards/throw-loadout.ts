/** Deterministic ten-cell loadout. Empty gaps deliberately break adjacency. */
export const BAG_CELLS = 10;
export type Family =
  | 'damage'
  | 'burn'
  | 'poison'
  | 'shield'
  | 'heal'
  | 'utility';
export const ITEMS = [
  {
    id: 'quick',
    name: '飞牌修缮箱',
    tag: '快甩',
    tile: 10,
    size: 1,
    family: 'damage',
    text: '只甩一张时，直伤 +4。',
  },
  {
    id: 'pair',
    name: '双响茶壶',
    tag: '对子',
    tile: 2,
    size: 2,
    family: 'damage',
    text: '对子、两对或葫芦：直伤 +10。',
  },
  {
    id: 'sequence',
    name: '织序风扇',
    tag: '顺子',
    tile: 8,
    size: 3,
    family: 'damage',
    text: '顺子或同花顺：直伤 +24。',
  },
  {
    id: 'suit',
    name: '四色灯笼',
    tag: '同花',
    tile: 11,
    size: 2,
    family: 'damage',
    text: '同花或同花顺：直伤 +20。',
  },
  {
    id: 'draw',
    name: '催信闹钟',
    tag: '接牌',
    tile: 7,
    size: 1,
    family: 'utility',
    text: '甩出至少5张：立即抽1张。放在行囊最右端，再抽1张。自动抽牌始终为3秒。',
  },
  {
    id: 'mend',
    name: '回暖小灯',
    tag: '治疗',
    tile: 0,
    size: 2,
    family: 'heal',
    text: '甩出至少5张：回复8生命；贴邻护盾物品时，额外回复4。',
  },
  {
    id: 'cinder',
    name: '余烬小炉',
    tag: '灼烧',
    tile: 2,
    size: 2,
    family: 'burn',
    text: '每次甩牌施加3灼烧；含至少2张红色牌时，增加到5。',
  },
  {
    id: 'bellows',
    name: '鼓火风扇',
    tag: '相邻·火',
    tile: 8,
    size: 1,
    family: 'utility',
    text: '左右贴邻的物品，施加灼烧量 +50%。隔着空格不生效。',
  },
  {
    id: 'ash',
    name: '焰纹放映机',
    tag: '燃爆',
    tile: 1,
    size: 2,
    family: 'burn',
    text: '出对子或更高牌型，且对手已有至少6灼烧时：直伤 +24。',
  },
  {
    id: 'poison',
    name: '青苔药匣',
    tag: '剧毒',
    tile: 3,
    size: 2,
    family: 'poison',
    text: '甩出的每张梅花施加3剧毒。剧毒每秒绕过护盾扣血，直到净化。',
  },
  {
    id: 'venom',
    name: '浸露线盒',
    tag: '相邻·毒',
    tile: 5,
    size: 1,
    family: 'utility',
    text: '左右贴邻的物品，施加剧毒量 +50%。',
  },
  {
    id: 'umbrella',
    name: '补丁旧伞',
    tag: '护盾',
    tile: 4,
    size: 2,
    family: 'shield',
    text: '对子、两对或葫芦：获得18护盾，最多160。',
  },
  {
    id: 'thorns',
    name: '回声针盒',
    tag: '反击',
    tile: 5,
    size: 1,
    family: 'shield',
    text: '被直伤命中时反击4伤害；贴邻护盾物品时反击10。反击不会连锁反击。',
  },
  {
    id: 'shieldbash',
    name: '护心放映机',
    tag: '盾击',
    tile: 1,
    size: 3,
    family: 'shield',
    text: '甩出至少2张：直伤额外增加当前护盾的40%；护盾不消耗。',
  },
  {
    id: 'drain',
    name: '回甘茶壶',
    tag: '吸血',
    tile: 2,
    size: 2,
    family: 'heal',
    text: '本次直伤实际扣掉对方生命的25%转为治疗；打在护盾上不吸血。',
  },
  {
    id: 'wash',
    name: '清露药包',
    tag: '净化',
    tile: 3,
    size: 1,
    family: 'heal',
    text: '甩出含红心的牌：回复4生命，移除自身各4层灼烧与剧毒。',
  },
  {
    id: 'growth',
    name: '续曲八音盒',
    tag: '成长',
    tile: 6,
    size: 2,
    family: 'damage',
    text: '连续两次甩牌都是同一种纯花色：永久力量 +4；力量提升后续每批直伤。',
  },
  {
    id: 'tempo',
    name: '换调风铃',
    tag: '换色',
    tile: 6,
    size: 1,
    family: 'damage',
    text: '本次与上次均为纯花色且花色不同：直伤 +8。',
  },
  {
    id: 'focus',
    name: '星光放映机',
    tag: '蓄爆',
    tile: 1,
    size: 3,
    family: 'damage',
    text: '一次至少5张，且是顺子、同花或更高牌型：直伤 +20。',
  },
  {
    id: 'slow',
    name: '止雨座钟',
    tag: '迟缓',
    tile: 7,
    size: 2,
    family: 'utility',
    text: '甩出至少2张黑色牌：命中后暂停对方自动抽牌1.5秒；重复只刷新，不叠时长。',
  },
  {
    id: 'compass',
    name: '联灯接线盒',
    tag: '双邻增幅',
    tile: 10,
    size: 1,
    family: 'utility',
    text: '左右都贴邻物品时，两个邻居甩牌触发的直伤、灼烧、剧毒、护盾、治疗与成长数值 +25%，取整。',
  },
  {
    id: 'ward',
    name: '守灯小毯',
    tag: '稳守',
    tile: 9,
    size: 2,
    family: 'shield',
    text: '每次甩牌获得6护盾；放在行囊最左端时获得10。',
  },
  {
    id: 'needle',
    name: '穿幕细针',
    tag: '穿透',
    tile: 5,
    size: 1,
    family: 'damage',
    text: '甩出至少2张黑色牌：本批直伤的35%绕过护盾。',
  },
] as const satisfies readonly {
  id: string;
  name: string;
  tag: string;
  tile: number;
  size: 1 | 2 | 3;
  family: Family;
  text: string;
}[];
export type ItemId = (typeof ITEMS)[number]['id'];
export type ItemPlacement = { id: ItemId; start: number };
export const itemDefinition = (id: ItemId) =>
  ITEMS.find((item) => item.id === id)!;
export const itemEnd = (placement: ItemPlacement) =>
  placement.start + itemDefinition(placement.id).size;
export function validThrowLayout(layout: ItemPlacement[]) {
  const occupied = new Set<number>(),
    names = new Set<string>();
  for (const placement of layout) {
    if (
      !ITEMS.some((item) => item.id === placement.id) ||
      names.has(placement.id) ||
      !Number.isInteger(placement.start) ||
      placement.start < 0 ||
      itemEnd(placement) > BAG_CELLS
    )
      return false;
    names.add(placement.id);
    for (let cell = placement.start; cell < itemEnd(placement); cell++) {
      if (occupied.has(cell)) return false;
      occupied.add(cell);
    }
  }
  return true;
}
export function packThrowItems(items: ItemId[]): ItemPlacement[] {
  let cursor = 0;
  const layout = items.map((id) => {
    if (!ITEMS.some((item) => item.id === id)) throw new Error('Invalid item');
    const placement = { id, start: cursor };
    cursor = itemEnd(placement);
    return placement;
  });
  if (!validThrowLayout(layout)) throw new Error('Invalid loadout');
  return layout;
}
/** Reject a full/overlapping destination without moving or consuming anything. */
export function placeThrowItem(
  layout: ItemPlacement[],
  id: ItemId,
  start?: number,
): ItemPlacement[] {
  if (!validThrowLayout(layout) || !ITEMS.some((item) => item.id === id))
    return layout;
  const others = layout.filter((item) => item.id !== id);
  for (const cell of start === undefined
    ? Array.from({ length: BAG_CELLS }, (_, i) => i)
    : [start]) {
    const next = [...others, { id, start: cell }].sort(
      (a, b) => a.start - b.start,
    );
    if (validThrowLayout(next)) return next;
  }
  return layout;
}
export const adjacentThrowItems = (layout: ItemPlacement[], id: ItemId) => {
  const source = layout.find((item) => item.id === id);
  return source
    ? layout.filter(
        (item) =>
          item.id !== id &&
          (itemEnd(item) === source.start || item.start === itemEnd(source)),
      )
    : [];
};
export const RELICS = [
  {
    id: 'order',
    name: '三息理线盒',
    tile: 5,
    text: '按钮按点数、花色排序，或收拢框选牌；成功整理冷却3秒。拖动始终用于框选。',
    story: '把散乱的记忆理齐，不夺走手里的选择。',
  },
  {
    id: 'capacity',
    name: '双层旧邮匣',
    tile: 10,
    text: '手牌容量 +2，最多12张。',
    story: '夹层还留着两封未寄出的信。',
  },
  {
    id: 'relay',
    name: '接力闹钟',
    tile: 7,
    text: '每第三次成功甩牌，立即额外抽1张；不重置普通抽牌。',
    story: '第三声钟响，总有伙伴赶来。',
  },
  {
    id: 'echo',
    name: '余响八音盒',
    tile: 6,
    text: '每次被直伤命中积攒3余响，最多12；下次出手增加等量直伤后清空。',
    story: '碰撞留下的声音，会在下一段旋律中回应。',
  },
  {
    id: 'heart',
    name: '红心补缝毯',
    tile: 9,
    text: '每抽到一张红心牌回复3生命。',
    story: '一针一线的小红心，还记得替人挡风。',
  },
  {
    id: 'ember',
    name: '灶心煤球',
    tile: 2,
    text: '本次能施加灼烧时，额外施加2层。',
    story: '旧炉子舍不得最后一点暖。',
  },
  {
    id: 'toxin',
    name: '浸露药匙',
    tile: 3,
    text: '本次能施加剧毒时，额外施加2层。',
    story: '旧药匣里的绿露，也能洗掉冰冷的价签。',
  },
  {
    id: 'bastion',
    name: '折光铜镜',
    tile: 1,
    text: '护盾吸收直伤后，反射吸收量的35%；不会触发再次反射。',
    story: '把护住伙伴的光，还给来袭的锋芒。',
  },
  {
    id: 'seed',
    name: '来年小种子',
    tile: 11,
    text: '每第三次甩出至少3张牌，永久力量 +4，上限40。',
    story: '照顾过的日子，会长成明年的新芽。',
  },
  {
    id: 'frost',
    name: '止雨怀表',
    tile: 7,
    text: '触发迟缓时获得12护盾，冷却6秒。',
    story: '为忙碌的小院，留一息安静。',
  },
] as const;
export type RelicId = (typeof RELICS)[number]['id'];
export type Style =
  | 'quick'
  | 'pair'
  | 'sequence'
  | 'burn'
  | 'poison'
  | 'guard'
  | 'drain'
  | 'growth'
  | 'control';
export const PRESETS: Record<
  Style,
  { name: string; hint: string; items: ItemId[]; relic: RelicId }
> = {
  quick: {
    name: '快甩接力',
    hint: '小批次出手、换色增伤与第三次补牌；联灯盒夹在两件输出之间。',
    items: ['quick', 'compass', 'tempo', 'draw'],
    relic: 'relay',
  },
  pair: {
    name: '双响对子',
    hint: '对子同时进攻与撑伞；双邻接线盒放大护盾和治疗。',
    items: ['pair', 'umbrella', 'compass', 'mend', 'draw'],
    relic: 'order',
  },
  sequence: {
    name: '星光蓄爆',
    hint: '多留两张，攒顺子或同花；三件爆发物品一起奏响。',
    items: ['sequence', 'suit', 'focus', 'draw'],
    relic: 'capacity',
  },
  burn: {
    name: '余烬燃爆',
    hint: '先叠灼烧，再用对子引爆；鼓火风扇必须贴着小炉。',
    items: ['cinder', 'bellows', 'ash', 'ward', 'draw'],
    relic: 'ember',
  },
  poison: {
    name: '青苔侵蚀',
    hint: '梅花叠毒绕盾；浸露线盒贴药匣，迟缓争取毒跳时间。',
    items: ['poison', 'venom', 'slow', 'wash', 'ward'],
    relic: 'toxin',
  },
  guard: {
    name: '护灯反击',
    hint: '伞与针盒贴邻，反击升级；存护盾再用放映机盾击。',
    items: ['umbrella', 'thorns', 'shieldbash', 'mend'],
    relic: 'bastion',
  },
  drain: {
    name: '回甘续航',
    hint: '优先打穿护盾再吸血；红心负责补缝和净化。',
    items: ['drain', 'mend', 'wash', 'tempo', 'quick'],
    relic: 'heart',
  },
  growth: {
    name: '续曲成长',
    hint: '同色小批次积攒力量；接线盒放大成长与换调。',
    items: ['growth', 'compass', 'tempo', 'ward', 'draw'],
    relic: 'seed',
  },
  control: {
    name: '止雨穿幕',
    hint: '两张黑牌同时迟缓与穿透，怀表护身，争取大组合。',
    items: ['slow', 'needle', 'tempo', 'focus', 'draw'],
    relic: 'frost',
  },
};
