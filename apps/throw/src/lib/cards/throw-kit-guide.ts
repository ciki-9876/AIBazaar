import { itemDefinition, type ItemId, type ItemPlacement, type RelicId, type Style } from './throw-loadout.ts';

export type KitLabels = { play: string; effect: string };
/** Classification describes the actual trigger and primary output, not the colour family. */
export const ITEM_LABELS: Record<ItemId, KitLabels> = {
  quick: { play: '单张', effect: '直伤' },
  tempo: { play: '换色', effect: '直伤' },
  needle: { play: '单张', effect: '穿透' },
  stride: { play: '出手', effect: '净化' },
  draw: { play: '连甩', effect: '抽牌' },
  sequence: { play: '顺子', effect: '直伤' },
  suit: { play: '同花', effect: '直伤' },
  focus: { play: '大组合', effect: '直伤' },
  pair: { play: '对子', effect: '直伤' },
  compass: { play: '双邻', effect: '增幅' },
  umbrella: { play: '对子', effect: '护盾' },
  ward: { play: '黑桃', effect: '护盾' },
  thorns: { play: '受击', effect: '反击' },
  shieldbash: { play: '多张', effect: '直伤' },
  cinder: { play: '方块', effect: '灼烧' },
  bellows: { play: '相邻', effect: '增幅' },
  ash: { play: '火势', effect: '直伤' },
  poison: { play: '梅花', effect: '剧毒' },
  venom: { play: '相邻', effect: '增幅' },
  slow: { play: '梅花', effect: '迟缓' },
  mend: { play: '红心', effect: '治疗' },
  wash: { play: '红心', effect: '净化' },
  drain: { play: '命中', effect: '吸血' },
  growth: { play: '续色', effect: '力量' },
  sequin: { play: '专精', effect: '增幅' },
  tailcoat: { play: '双修', effect: '增幅' },
};
export const RELIC_LABELS: Record<RelicId, KitLabels> = {
  capacity: { play: '囤牌', effect: '扩容' },
  relay: { play: '单张', effect: '直伤' },
  echo: { play: '受击', effect: '直伤' },
  heart: { play: '受击', effect: '治疗' },
  ember: { play: '点火', effect: '灼烧' },
  toxin: { play: '下毒', effect: '剧毒' },
  bastion: { play: '挡牌', effect: '反弹' },
};

export type KitReference = { kind: 'item'; id: ItemId } | { kind: 'relic'; id: RelicId };
export type KitFilterSelection = { play: readonly string[]; effect: readonly string[] };
export const EMPTY_KIT_FILTERS: KitFilterSelection = { play: [], effect: [] };

/** Primary labels stay compact on a tile. Facets retain every real secondary output.
 * Do not infer effects from colour/family, or tag a cleanser as applying poison/fire.
 * New multi-effect content can supply any number of facets in this table.
 */
const ITEM_SECONDARY_EFFECTS: Partial<Record<ItemId, readonly string[]>> = {
  sequence: ['格挡'],
  mend: ['净化'],
  drain: ['治疗', '净化'],
};
const RELIC_SECONDARY_EFFECTS: Partial<Record<RelicId, readonly string[]>> = {
  heart: ['净化', '护盾'],
};
export function kitFilterTags(kind: KitReference['kind'], id: ItemId | RelicId): KitFilterSelection {
  const labels = kind === 'item' ? ITEM_LABELS[id as ItemId] : RELIC_LABELS[id as RelicId];
  const extra = kind === 'item' ? ITEM_SECONDARY_EFFECTS[id as ItemId] : RELIC_SECONDARY_EFFECTS[id as RelicId];
  return { play: [labels.play], effect: [labels.effect, ...(extra ?? [])] };
}
/** All selected tags must be present, including multiple tags in one category. */
export function matchesKitTags(tags: KitFilterSelection, filters: KitFilterSelection): boolean {
  return filters.play.every((tag) => tags.play.includes(tag)) &&
    filters.effect.every((tag) => tags.effect.includes(tag));
}
export function matchesKitFilters(kind: KitReference['kind'], id: ItemId | RelicId, filters: KitFilterSelection): boolean {
  return matchesKitTags(kitFilterTags(kind, id), filters);
}
export function toggleKitFilter(filters: KitFilterSelection, category: keyof KitFilterSelection, tag: string): KitFilterSelection {
  const current = filters[category];
  return { ...filters, [category]: current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag] };
}
/** Only offer a next tag if adding it preserves a nonempty intersection. */
export function availableKitFilterTags(catalog: readonly KitReference[], filters: KitFilterSelection): KitFilterSelection {
  const matching = catalog.filter(({ kind, id }) => matchesKitFilters(kind, id, filters));
  return {
    play: [...new Set(matching.flatMap(({ kind, id }) => kitFilterTags(kind, id).play))],
    effect: [...new Set(matching.flatMap(({ kind, id }) => kitFilterTags(kind, id).effect))],
  };
}

export type KitRecommendations = {
  items: Partial<Record<ItemId, string>>;
  relics: Partial<Record<RelicId, string>>;
};
/** Only call with a style supported by the visible tutorial or collected intel.
 * Unknown style returns no hints; this helper must never inspect hidden enemy gear.
 */
export function counterKitRecommendations(knownStyle: Style | null | undefined): KitRecommendations {
  switch (knownStyle) {
    case 'quick': return { items: {
      sequence: '对抗单张快甩：手牌至少 7 张时，扇面格挡使单张直伤减半。',
    }, relics: {} };
    case 'guard': return { items: {
      quick: '对抗护盾：单张命中会额外削盾，飞牌修缮箱增强单张直伤。',
      needle: '对抗护盾：单张直伤的 30% 可以穿透护盾。',
      poison: '对抗护盾：剧毒绕过护盾，直接消耗气场。',
    }, relics: { toxin: '对抗护盾：增强可以绕盾的剧毒。', relay: '对抗护盾：单张连甩叠加直伤，并持续削盾。' } };
    case 'burn': return { items: {
      ward: '对抗灼烧：黑桃生成护盾；有盾时新火减半，烧伤只消耗盾。',
      umbrella: '对抗灼烧：对子生成护盾；有盾时新火减半，烧伤只消耗盾。',
      wash: '对抗灼烧：出红心可直接净化身上的灼烧。',
    }, relics: {} };
    case 'mend': return { items: {
      cinder: '对抗治疗：点燃对手，使其治疗降至六成。',
      sequence: '对抗治疗：顺子命中的压轴重创使对手短时间内治疗降至六成。',
      focus: '对抗治疗：顺子及以上的大组合触发压轴重创，压低对手治疗。',
    }, relics: { ember: '对抗治疗：点火额外加 2 层、对方净火减半，维持焦灼减疗。' } };
    case 'poison': return { items: {
      stride: '对抗剧毒：每次出手净化 3 层剧毒。',
      wash: '对抗剧毒：出红心净化身上的剧毒。',
      mend: '对抗剧毒：每次治疗也会净化剧毒，满气场仍可净化。',
      drain: '对抗剧毒：命中吸血产生治疗，同时净化剧毒。',
    }, relics: { heart: '对抗剧毒：受击触发红心补缝，治疗同时净化剧毒。' } };
    case 'combo': return { items: {
      thorns: '对抗大组合：受到至少 3 张牌命中时发动反击。',
      ward: '对抗大组合：黑桃积累护盾，吸收集中爆发。',
      umbrella: '对抗大组合：对子积累护盾，吸收集中爆发。',
      poison: '对抗囤牌：剧毒绕盾，且对手每攒 5 张手牌会增加毒伤。',
    }, relics: { bastion: '对抗大组合：护盾挡下多张出手时，折光铜镜可以反弹。', toxin: '对抗囤牌：增强剧毒，利用对手攒牌时的毒发。' } };
    default: return { items: {}, relics: {} };
  }
}

/** Only explicit revealed facts enter this function; a single visible engine is
 * enough to offer its mechanical counter without revealing the whole strategy.
 */
export function revealedKitRecommendations({ style, items = [], relic }: {
  style?: Style | null;
  items?: readonly ItemId[];
  relic?: RelicId | null;
}): KitRecommendations {
  const inferred: Partial<Record<ItemId, Style>> = {
    quick: 'quick', needle: 'quick',
    sequence: 'combo', suit: 'combo', focus: 'combo',
    ward: 'guard', umbrella: 'guard', shieldbash: 'guard',
    cinder: 'burn', poison: 'poison', mend: 'mend', drain: 'mend',
  };
  const relicStyles: Partial<Record<RelicId, Style>> = {
    relay: 'quick', bastion: 'guard', ember: 'burn', toxin: 'poison', heart: 'mend',
  };
  const styles = new Set<Style>(style ? [style] : []);
  for (const id of items) if (inferred[id]) styles.add(inferred[id]!);
  if (relic && relicStyles[relic]) styles.add(relicStyles[relic]!);
  const result: KitRecommendations = { items: {}, relics: {} };
  for (const known of styles) {
    const recommendation = counterKitRecommendations(known);
    for (const [id, reason] of Object.entries(recommendation.items)) result.items[id as ItemId] ??= reason;
    for (const [id, reason] of Object.entries(recommendation.relics)) result.relics[id as RelicId] ??= reason;
  }
  return result;
}

const LINKS: readonly [ItemId, ItemId, string][] = [
  ['quick', 'needle', '同一张牌同时获得直伤与穿透。'],
  ['quick', 'tempo', '轮换花色甩单张时，两件道具同时增加直伤。'],
  ['needle', 'tempo', '轮换花色甩单张时，换调直伤也获得穿透。'],
  ['quick', 'draw', '连续单甩更快累计四次出手，触发额外抽牌。'],
  ['needle', 'draw', '连续单甩更快累计四次出手，触发额外抽牌。'],
  ['quick', 'stride', '每次单甩同时造成伤害并净化剧毒。'],
  ['needle', 'stride', '每次单甩同时穿透并净化剧毒。'],
  ['sequence', 'suit', '同花顺能同时触发顺子与同花的直伤。'],
  ['sequence', 'focus', '五张顺子或同花顺能同时触发两件道具。'],
  ['suit', 'focus', '五张同花或同花顺能同时触发两件道具。'],
  ['pair', 'umbrella', '对子、两对或葫芦同时产生直伤和护盾。'],
  ['ward', 'shieldbash', '黑桃产出的护盾可在下一次多张出手时转为直伤。'],
  ['umbrella', 'shieldbash', '对子产生护盾，并让之后的多张出手附加盾击。'],
  ['ward', 'thorns', '两件相邻时，回声针盒的反击从 15 提升至 22。'],
  ['umbrella', 'thorns', '两件相邻时，回声针盒的反击从 15 提升至 22。'],
  ['shieldbash', 'thorns', '两件相邻时，回声针盒的反击从 15 提升至 22。'],
  ['cinder', 'ash', '余烬小炉点火，灼烧达到 8 层后开启焰纹燃爆。'],
  ['cinder', 'bellows', '两件相邻时，小炉施加的灼烧增加 50%。'],
  ['poison', 'venom', '两件相邻时，药匣施加的剧毒增加 50%。'],
  ['poison', 'slow', '至少两张梅花同时下毒并暂停对手抽牌。'],
  ['mend', 'wash', '同一次红心出手同时治疗与净化。凑满三件治疗家族道具可解除治疗减半。'],
  ['mend', 'drain', '红心治疗与命中吸血共同续航。还需第三件治疗家族道具解除治疗减半。'],
  ['wash', 'drain', '净化压制续航的灼烧，同时用直伤吸血。还需第三件治疗家族道具解除治疗减半。'],
  ['growth', 'suit', '连续甩同一花色的三张以上同花，同时成长并增加直伤。'],
  ['growth', 'cinder', '连续甩至少两张方块，同时叠加力量与灼烧。'],
  ['growth', 'poison', '连续甩至少两张梅花，同时叠加力量与剧毒。'],
  ['growth', 'ward', '连续甩至少两张黑桃，同时叠加力量与护盾。'],
  ['growth', 'mend', '连续甩至少两张红心，同时叠加力量与治疗。'],
];
const AMPLIFIABLE: readonly ItemId[] = ['quick', 'tempo', 'sequence', 'suit', 'focus', 'pair', 'umbrella', 'ward', 'shieldbash', 'cinder', 'ash', 'poison', 'mend'];

/** Explanations are potential combinations, never a claim that their conditions are already active. */
export function kitCompatibility(a: ItemId, b: ItemId, layout: readonly ItemPlacement[] = []): string | null {
  if (a === b) return null;
  const link = LINKS.find(([left, right]) => (left === a && right === b) || (left === b && right === a));
  if (link) return link[2];
  const other = a === 'compass' ? b : b === 'compass' ? a : null;
  if (other && AMPLIFIABLE.includes(other))
    return '接线盒两侧都摆上道具时，可让相邻这件道具的产出增加 25%。';
  const costume = [a, b].find((id) => id === 'sequin' || id === 'tailcoat');
  if (costume) {
    const engine = costume === a ? b : a;
    if (!AMPLIFIABLE.includes(engine)) return null;
    const families = new Set([...layout.map((item) => item.id), a, b].map((id) => itemDefinition(id).family).filter((family) => family !== 'utility'));
    if (costume === 'sequin' && families.size === 1) return '当前布阵保持单一家族时，亮片马甲使该家族产出增加 25%。';
    if (costume === 'tailcoat' && families.size === 2) return '当前布阵恰好两家族时，定制燕尾服使这两家族产出增加 20%。';
  }
  return null;
}
