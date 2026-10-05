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
    text: '单张出牌：直伤 +4。',
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
    text: '出牌≥5张：抽1张；位于最右端时抽2张。',
  },
  {
    id: 'mend',
    name: '回暖小灯',
    tag: '治疗',
    tile: 0,
    size: 2,
    family: 'heal',
    text: '出牌≥5张：治疗8；相邻护盾道具时治疗12。',
  },
  {
    id: 'cinder',
    name: '余烬小炉',
    tag: '灼烧',
    tile: 2,
    size: 2,
    family: 'burn',
    text: '出牌：灼烧3；含≥2张红牌时灼烧5。',
  },
  {
    id: 'bellows',
    name: '鼓火风扇',
    tag: '相邻·火',
    tile: 8,
    size: 1,
    family: 'utility',
    text: '相邻道具施加的灼烧 +50%。',
  },
  {
    id: 'ash',
    name: '焰纹放映机',
    tag: '燃爆',
    tile: 1,
    size: 2,
    family: 'burn',
    text: '对子及以上，且对手灼烧≥6：直伤 +24。',
  },
  {
    id: 'poison',
    name: '青苔药匣',
    tag: '剧毒',
    tile: 3,
    size: 2,
    family: 'poison',
    text: '每张梅花施加3剧毒。',
  },
  {
    id: 'venom',
    name: '浸露线盒',
    tag: '相邻·毒',
    tile: 5,
    size: 1,
    family: 'utility',
    text: '相邻道具施加的剧毒 +50%。',
  },
  {
    id: 'umbrella',
    name: '补丁旧伞',
    tag: '护盾',
    tile: 4,
    size: 2,
    family: 'shield',
    text: '对子、两对或葫芦：护盾 +18。',
  },
  {
    id: 'thorns',
    name: '回声针盒',
    tag: '反击',
    tile: 5,
    size: 1,
    family: 'shield',
    text: '被直伤命中：反击4；相邻护盾道具时反击10。',
  },
  {
    id: 'shieldbash',
    name: '护心放映机',
    tag: '盾击',
    tile: 1,
    size: 3,
    family: 'shield',
    text: '出牌≥2张：附加当前护盾40%的直伤，不消耗护盾。',
  },
  {
    id: 'drain',
    name: '回甘茶壶',
    tag: '吸血',
    tile: 2,
    size: 2,
    family: 'heal',
    text: '本批直伤造成的生命损失，25%转为治疗。',
  },
  {
    id: 'wash',
    name: '清露药包',
    tag: '净化',
    tile: 3,
    size: 1,
    family: 'heal',
    text: '出牌含红心：治疗4，净化灼烧与剧毒各4。',
  },
  {
    id: 'growth',
    name: '续曲八音盒',
    tag: '成长',
    tile: 6,
    size: 2,
    family: 'damage',
    text: '连续两次均为同一纯花色：力量 +4。',
  },
  {
    id: 'tempo',
    name: '换调风铃',
    tag: '换色',
    tile: 6,
    size: 1,
    family: 'damage',
    text: '连续两次均为纯花色，且花色不同：直伤 +8。',
  },
  {
    id: 'focus',
    name: '星光放映机',
    tag: '蓄爆',
    tile: 1,
    size: 3,
    family: 'damage',
    text: '出牌≥5张且为顺子及以上：直伤 +20。',
  },
  {
    id: 'slow',
    name: '止雨座钟',
    tag: '迟缓',
    tile: 7,
    size: 2,
    family: 'utility',
    text: '含≥2张黑牌：命中施加1.5秒迟缓。',
  },
  {
    id: 'compass',
    name: '联灯接线盒',
    tag: '双邻增幅',
    tile: 10,
    size: 1,
    family: 'utility',
    text: '两侧均有相邻道具：它们的直伤、灼烧、剧毒、护盾、治疗和成长 +25%。',
  },
  {
    id: 'ward',
    name: '守灯小毯',
    tag: '稳守',
    tile: 9,
    size: 2,
    family: 'shield',
    text: '出牌：护盾 +6；位于最左端时 +10。',
  },
  {
    id: 'needle',
    name: '穿幕细针',
    tag: '穿透',
    tile: 5,
    size: 1,
    family: 'damage',
    text: '含≥2张黑牌：本批直伤35%穿透护盾。',
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
    text: '按点数、花色排序或收拢选牌；整理冷却3秒。',
  },
  {
    id: 'capacity',
    name: '双层旧邮匣',
    tile: 10,
    text: '手牌容量 +2，最多12张。',
  },
  {
    id: 'relay',
    name: '接力闹钟',
    tile: 7,
    text: '每出牌3次，额外抽1张。',
  },
  {
    id: 'echo',
    name: '余响八音盒',
    tile: 6,
    text: '被直伤命中：余响 +3，上限12；下次出牌消耗余响，附加等量直伤。',
  },
  {
    id: 'heart',
    name: '红心补缝毯',
    tile: 9,
    text: '抽到红心：治疗3。',
  },
  {
    id: 'ember',
    name: '灶心煤球',
    tile: 2,
    text: '施加灼烧时，额外 +2。',
  },
  {
    id: 'toxin',
    name: '浸露药匙',
    tile: 3,
    text: '施加剧毒时，额外 +2。',
  },
  {
    id: 'bastion',
    name: '折光铜镜',
    tile: 1,
    text: '反射护盾吸收直伤量的35%。',
  },
  {
    id: 'seed',
    name: '来年小种子',
    tile: 11,
    text: '出牌≥3张累计3次：力量 +4。',
  },
  {
    id: 'frost',
    name: '止雨怀表',
    tile: 7,
    text: '触发迟缓时获得12护盾，冷却6秒。',
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
    hint: '单张、换色增伤，三次出牌补牌。',
    items: ['quick', 'compass', 'tempo', 'draw'],
    relic: 'relay',
  },
  pair: {
    name: '双响对子',
    hint: '对子增伤与护盾，相邻增幅。',
    items: ['pair', 'umbrella', 'compass', 'mend', 'draw'],
    relic: 'order',
  },
  sequence: {
    name: '星光蓄爆',
    hint: '容量增加，顺子与同花爆发。',
    items: ['sequence', 'suit', 'focus', 'draw'],
    relic: 'capacity',
  },
  burn: {
    name: '余烬燃爆',
    hint: '灼烧叠层，配对子增伤。',
    items: ['cinder', 'bellows', 'ash', 'ward', 'draw'],
    relic: 'ember',
  },
  poison: {
    name: '青苔侵蚀',
    hint: '梅花叠毒，迟缓延长伤害窗口。',
    items: ['poison', 'venom', 'slow', 'wash', 'ward'],
    relic: 'toxin',
  },
  guard: {
    name: '护灯反击',
    hint: '积盾、反击、盾击。',
    items: ['umbrella', 'thorns', 'shieldbash', 'mend'],
    relic: 'bastion',
  },
  drain: {
    name: '回甘续航',
    hint: '吸血续航，红心治疗与净化。',
    items: ['drain', 'mend', 'wash', 'tempo', 'quick'],
    relic: 'heart',
  },
  growth: {
    name: '续曲成长',
    hint: '同色成长，换色增伤。',
    items: ['growth', 'compass', 'tempo', 'ward', 'draw'],
    relic: 'seed',
  },
  control: {
    name: '止雨穿幕',
    hint: '黑牌迟缓与穿盾，组合爆发。',
    items: ['slow', 'needle', 'tempo', 'focus', 'draw'],
    relic: 'frost',
  },
};
