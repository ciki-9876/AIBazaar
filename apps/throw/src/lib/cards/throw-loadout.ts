/** Deterministic ten-cell loadout. Empty gaps deliberately break adjacency. */
export const BAG_CELLS = 10;
export type Family =
  | 'damage'
  | 'burn'
  | 'poison'
  | 'shield'
  | 'heal'
  | 'utility';
/**
 * Mechanical text is the rule, verbatim; `quip` is flavour only. Each suit
 * feeds one condition: ♠ shield, ♥ healing, ♣ poison, ♦ burn.
 */
export const ITEMS = [
  // ── Tempo: single cards, thrown early and often ──
  {
    id: 'quick',
    name: '飞牌修缮箱',
    tag: '快甩',
    size: 1,
    family: 'damage',
    text: '单张出牌：直伤 +8。',
    quip: '修好的牌飞得更快。修不好的，飞得更有个性。',
  },
  {
    id: 'tempo',
    name: '换调风铃',
    tag: '换色',
    size: 1,
    family: 'damage',
    text: '本次花色与上次不同：直伤 +2。',
    quip: '风一换向，它就叮当作响，像个总想插话的远房亲戚。',
  },
  {
    id: 'needle',
    name: '穿幕细针',
    tag: '穿透',
    size: 1,
    family: 'damage',
    text: '单张出牌：本次直伤 30% 无视护盾。',
    quip: '幕布再厚，也挡不住一根有决心的针。',
  },
  {
    id: 'stride',
    name: '抖擞披风',
    tag: '解毒',
    size: 1,
    family: 'utility',
    text: '每次出手：净化自身 3 层剧毒。',
    quip: '一直动来动去，毒都追不上。母亲说这叫“坐不住”。',
  },
  {
    id: 'draw',
    name: '催信闹钟',
    tag: '接牌',
    size: 1,
    family: 'utility',
    text: '每出手 4 次：额外抽 1 张。',
    quip: '它不叫醒你，它叫醒你的牌。',
  },
  // ── Combo: sort, wait, then the big reveal ──
  {
    id: 'sequence',
    name: '织序风扇',
    tag: '顺子',
    size: 3,
    family: 'damage',
    text: '顺子或同花顺：3／4／5 张组合直伤 +21／28／36。手牌 ≥7 张时，被单张牌命中直伤减半（扇面格挡）。',
    quip: '扇面一展，连观众都知道该排队。',
  },
  {
    id: 'suit',
    name: '四色灯笼',
    tag: '同花',
    size: 2,
    family: 'damage',
    text: '同花或同花顺：3／4／5 张组合直伤 +18／24／30。',
    quip: '一种颜色到底，像一位只穿灰西装的银行家。',
  },
  {
    id: 'focus',
    name: '星光放映机',
    tag: '蓄爆',
    size: 3,
    family: 'damage',
    text: '出牌 ≥5 张且为顺子及以上：直伤 +26。',
    quip: '放映前请关掉手机，以及你的怀疑。',
  },
  {
    id: 'pair',
    name: '双响茶壶',
    tag: '对子',
    size: 2,
    family: 'damage',
    text: '对子、两对或葫芦：直伤 +10。',
    quip: '它总是同时响两声：一声给你，一声给隔壁太太。',
  },
  {
    id: 'compass',
    name: '联灯接线盒',
    tag: '双邻增幅',
    size: 1,
    family: 'utility',
    text: '两侧均有相邻道具：它们的直伤、灼烧、剧毒、护盾和治疗 +25%。',
    quip: '没人知道它接着哪儿。最好也别问。',
  },
  // ── Guard: spades and pairs build a wall ──
  {
    id: 'umbrella',
    name: '补丁旧伞',
    tag: '护盾',
    size: 2,
    family: 'shield',
    text: '对子、两对或葫芦：护盾 +30。',
    quip: '补丁比伞布多。英国天气面前，它从未缺席。',
  },
  {
    id: 'ward',
    name: '守灯小毯',
    tag: '黑桃',
    size: 2,
    family: 'shield',
    text: '每张♠：护盾 +14。',
    quip: '又暖又厚，还能挡飞来的扑克牌。祖母的手艺。',
  },
  {
    id: 'thorns',
    name: '回声针盒',
    tag: '反击',
    size: 1,
    family: 'shield',
    text: '被 ≥3 张牌的出手命中：反击 15；相邻护盾道具时反击 22。',
    quip: '一张两张它懒得理。一大把砸过来，它一定回嘴。',
  },
  {
    id: 'shieldbash',
    name: '护心放映机',
    tag: '盾击',
    size: 3,
    family: 'shield',
    text: '出牌 ≥2 张：附加当前护盾 40% 的直伤，不消耗护盾。',
    quip: '把你的护盾投到对手脸上。礼貌地。',
  },
  // ── Burn: diamonds stoke the fire ──
  {
    id: 'cinder',
    name: '余烬小炉',
    tag: '灼烧',
    size: 2,
    family: 'burn',
    text: '每张♦：灼烧 +3。',
    quip: '能烧水泡茶，也能烧别的。主要是别的。',
  },
  {
    id: 'bellows',
    name: '鼓火风扇',
    tag: '相邻·火',
    size: 1,
    family: 'utility',
    text: '相邻道具施加的灼烧 +50%。',
    quip: '本来只想吹凉一点。结果你懂的。',
  },
  {
    id: 'ash',
    name: '焰纹放映机',
    tag: '燃爆',
    size: 2,
    family: 'burn',
    text: '对手灼烧 ≥8 时出牌：直伤 +12。',
    quip: '专放火灾片，观众总是被现场效果打动。',
  },
  // ── Poison: clubs, patience, and a slow tide ──
  {
    id: 'poison',
    name: '青苔药匣',
    tag: '剧毒',
    size: 2,
    family: 'poison',
    text: '每张♣：剧毒 +3。',
    quip: '标签写着“偶尔服用”。没写给谁服用。',
  },
  {
    id: 'venom',
    name: '浸露线盒',
    tag: '相邻·毒',
    size: 1,
    family: 'utility',
    text: '相邻道具施加的剧毒 +50%。',
    quip: '线是绿的。原本不是。',
  },
  {
    id: 'slow',
    name: '止雨座钟',
    tag: '迟缓',
    size: 2,
    family: 'poison',
    text: '含 ≥2 张♣：命中施加 1.2 秒迟缓（暂停对手抽牌）。',
    quip: '它让时间慢下来，就像周日下午的邮局。',
  },
  // ── Mend: hearts and big batches keep you standing ──
  {
    id: 'mend',
    name: '回暖小灯',
    tag: '治疗',
    size: 2,
    family: 'heal',
    text: '每张♥：治疗 9。',
    quip: '一盏灯，一杯茶，一切都会好起来的。大概。',
  },
  {
    id: 'wash',
    name: '清露药包',
    tag: '净化',
    size: 1,
    family: 'heal',
    text: '出牌含♥：净化自身灼烧与剧毒各 4 层，满生命也有效。',
    quip: '薄荷味。医生说是安慰剂，但安慰得很到位。',
  },
  {
    id: 'drain',
    name: '回甘茶壶',
    tag: '吸血',
    size: 2,
    family: 'heal',
    text: '本批直伤造成的生命损失，25% 转为治疗。',
    quip: '别人的苦，是你的甜。这话在茶馆里说比较安全。',
  },
  {
    id: 'growth',
    name: '续曲八音盒',
    tag: '成长',
    size: 2,
    family: 'damage',
    text: '连续两次均为同一纯花色：力量 +3（之后每批直伤 +力量，上限 30）。',
    quip: '同一首曲子听第三遍，它就开始自信了。',
  },
] as const satisfies readonly {
  id: string;
  name: string;
  tag: string;
  size: 1 | 2 | 3;
  family: Family;
  text: string;
  quip: string;
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
export function packThrowItems(items: readonly ItemId[]): ItemPlacement[] {
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
    id: 'capacity',
    name: '双层旧邮匣',
    text: '手牌容量 +2，最多 12 张。',
    quip: '夹层里还有 1952 年的账单。不急，慢慢付。',
  },
  {
    id: 'relay',
    name: '接力闹钟',
    text: '每出手 3 次：额外抽 1 张。',
    quip: '它从不迟到，这让周围的人很有压力。',
  },
  {
    id: 'echo',
    name: '余响八音盒',
    text: '被直伤命中：余响 +3，上限 12；下次出手消耗余响，附加等量直伤。',
    quip: '你打我一下，它就记一笔。记性好得令人不安。',
  },
  {
    id: 'heart',
    name: '红心补缝毯',
    text: '被单张牌命中：治疗 4。',
    quip: '小伤口它全包了。大伤口，建议另请高明。',
  },
  {
    id: 'ember',
    name: '灶心煤球',
    text: '施加灼烧时，额外 +2。',
    quip: '整个冬天都没熄过。房东为此写过三封信。',
  },
  {
    id: 'toxin',
    name: '浸露药匙',
    text: '施加剧毒时，额外 +2。',
    quip: '一勺见效。见什么效，看运气。',
  },
  {
    id: 'bastion',
    name: '折光铜镜',
    text: '护盾吸收直伤时，反射吸收量的 35%。',
    quip: '你在镜子里看到的，是你自己的拳头。',
  },
] as const;
export type RelicId = (typeof RELICS)[number]['id'];
/** Six competitive builds plus the gentle lesson build used by Reed's first practice. */
export type Style =
  | 'quick'
  | 'combo'
  | 'guard'
  | 'burn'
  | 'poison'
  | 'mend'
  | 'lesson';
export const PRESETS: Record<
  Style,
  {
    name: string;
    hint: string;
    beats: Style[];
    items: ItemId[];
    relic: RelicId | null;
  }
> = {
  quick: {
    name: '快甩接力',
    hint: '单张连甩：单张牌额外削盾，边跑边抖掉毒。',
    beats: ['guard', 'poison'],
    items: ['quick', 'compass', 'tempo', 'needle', 'stride', 'draw'],
    relic: 'relay',
  },
  combo: {
    name: '星光蓄爆',
    hint: '理好牌，攒顺子同花，一击重创；扇面在手，单张飞牌伤不了你。',
    beats: ['mend', 'quick'],
    items: ['sequence', 'suit', 'focus', 'pair'],
    relic: null,
  },
  guard: {
    name: '护灯反击',
    hint: '黑桃和对子垒墙；墙能闷熄灼烧，大招会被反弹。',
    beats: ['burn', 'combo'],
    items: ['umbrella', 'ward', 'thorns', 'shieldbash', 'pair'],
    relic: 'bastion',
  },
  burn: {
    name: '余烬燃爆',
    hint: '方块点火。烧着的人治疗减半，越出手越烫手。',
    beats: ['mend', 'quick'],
    items: ['cinder', 'bellows', 'ash', 'pair', 'draw'],
    relic: 'ember',
  },
  poison: {
    name: '青苔侵蚀',
    hint: '梅花下毒，无视护盾；手里攒牌越多，毒发越狠。',
    beats: ['guard', 'combo'],
    items: ['poison', 'venom', 'slow', 'pair', 'draw'],
    relic: 'toxin',
  },
  mend: {
    name: '回甘续航',
    hint: '红心回血，治疗顺带解毒，单张小伤自补。',
    beats: ['poison'],
    items: ['mend', 'wash', 'drain', 'pair', 'draw'],
    relic: 'heart',
  },
  lesson: {
    name: '里德的老把式',
    hint: '一位退休魔术师的慢节奏示范。',
    beats: [],
    items: ['quick', 'needle'],
    relic: null,
  },
};
/** Builds shown to players in the practice room, in the order of the counter wheel. */
export const COMPETITIVE_STYLES = ['quick', 'guard', 'burn', 'mend', 'poison', 'combo'] as const;
