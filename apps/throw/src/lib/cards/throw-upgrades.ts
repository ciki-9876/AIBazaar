import { ITEMS, itemDefinition, type ItemId } from './throw-loadout.ts';
export type UpgradeTier = 'silver' | 'gold';
export type ItemUpgrades = Partial<Record<ItemId, UpgradeTier>>;
export const UPGRADE_PRICES: Record<UpgradeTier, number> = {
  silver: 12,
  gold: 28,
};
/** Each field names its real mechanism; trigger requirements never accidentally scale. */
export const ITEM_TUNING: Record<
  ItemId,
  Record<string, readonly [number, number, number]>
> = {
  quick: { damage: [8, 10, 16] },
  tempo: { damage: [2, 3, 5] },
  needle: { pierce: [30, 40, 60] },
  stride: { cleanse: [3, 4, 7] },
  draw: { every: [4, 3, 2] },
  sequence: { d3: [21, 26, 42], d4: [28, 35, 56], d5: [36, 45, 72] },
  suit: { d3: [18, 23, 36], d4: [24, 30, 48], d5: [30, 38, 60] },
  focus: { damage: [26, 33, 52] },
  pair: { damage: [10, 13, 20] },
  compass: { rate: [25, 32, 50] },
  umbrella: { shield: [26, 33, 52] },
  ward: { shield: [12, 15, 24] },
  thorns: { weak: [15, 19, 30], strong: [22, 28, 44] },
  shieldbash: { rate: [40, 50, 75] },
  cinder: { burn: [3, 4, 6] },
  bellows: { rate: [50, 65, 100] },
  ash: { damage: [12, 15, 24] },
  poison: { poison: [3, 4, 6] },
  venom: { rate: [50, 65, 100] },
  slow: { ms: [1200, 1600, 2400] },
  mend: { heal: [9, 12, 18] },
  wash: { cleanse: [4, 5, 8] },
  drain: { rate: [25, 32, 50] },
  growth: { growth: [3, 4, 6] },
  sequin: { rate: [25, 32, 50] },
  tailcoat: { rate: [20, 26, 40] },
};
export const UPGRADABLE_ITEMS: readonly ItemId[] = ITEMS.map(({ id }) => id);
export function validItemUpgrades(value: unknown): value is ItemUpgrades {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(value!).every(
      ([id, tier]) =>
        Object.hasOwn(ITEM_TUNING, id) &&
        (tier === 'silver' || tier === 'gold'),
    )
  );
}
export function canUpgradeItem(
  upgrades: ItemUpgrades,
  id: ItemId,
  tier: UpgradeTier,
): boolean {
  return (
    validItemUpgrades(upgrades) &&
    UPGRADABLE_ITEMS.includes(id) &&
    (tier === 'silver'
      ? upgrades[id] === undefined
      : tier === 'gold' && upgrades[id] === 'silver')
  );
}
export function itemValue(
  id: ItemId,
  key: string,
  base: number,
  upgrades?: ItemUpgrades,
): number {
  return (
    ITEM_TUNING[id][key]?.[
      upgrades?.[id] === 'gold' ? 2 : upgrades?.[id] === 'silver' ? 1 : 0
    ] ?? base
  );
}
/** Compatibility helper for callers scaling a single raw output. New rules tune at the source. */
export function applyItemUpgrade(
  id: ItemId,
  value: number,
  upgrades?: ItemUpgrades,
): number {
  const first = Object.entries(ITEM_TUNING[id])[0];
  return value <= 0 || !first
    ? value
    : Math.floor(
        (value * itemValue(id, first[0], first[1][0], upgrades)) / first[1][0],
      );
}
/** Replace only effect quantities, leaving thresholds, card counts and family requirements intact. */
export function upgradedItemText(id: ItemId, upgrades?: ItemUpgrades): string {
  let text: string = itemDefinition(id).text;
  const v = (key: string) =>
    itemValue(id, key, ITEM_TUNING[id][key][0], upgrades);
  switch (id) {
    case 'quick':
    case 'tempo':
    case 'focus':
    case 'pair':
    case 'ash':
      text = text.replace(/直伤 \+\d+/, `直伤 +${v('damage')}`);
      break;
    case 'needle':
      text = text.replace('30%', `${v('pierce')}%`);
      break;
    case 'stride':
      text = text.replace('3 层', `${v('cleanse')} 层`);
      break;
    case 'draw':
      text = text.replace('4 次', `${v('every')} 次`);
      break;
    case 'sequence':
      text = text.replace('21／28／36', `${v('d3')}／${v('d4')}／${v('d5')}`);
      break;
    case 'suit':
      text = text.replace('18／24／30', `${v('d3')}／${v('d4')}／${v('d5')}`);
      break;
    case 'umbrella':
    case 'ward':
      text = text.replace(/护盾 \+\d+/, `护盾 +${v('shield')}`);
      break;
    case 'thorns':
      text = text
        .replace('反击 15', `反击 ${v('weak')}`)
        .replace('反击 22', `反击 ${v('strong')}`);
      break;
    case 'shieldbash':
      text = text.replace('40%', `${v('rate')}%`);
      break;
    case 'cinder':
      text = text.replace('+3', `+${v('burn')}`);
      break;
    case 'poison':
      text = text.replace('+3', `+${v('poison')}`);
      break;
    case 'slow':
      text = text.replace('1.2 秒', `${v('ms') / 1000} 秒`);
      break;
    case 'mend':
      text = text.replace('治疗 9', `治疗 ${v('heal')}`);
      break;
    case 'wash':
      text = text.replace('各 4 层', `各 ${v('cleanse')} 层`);
      break;
    case 'growth':
      text = text.replace('力量 +3', `力量 +${v('growth')}`);
      break;
    default:
      text = text.replace(/(?:25|50|20)%/, `${v('rate')}%`);
  }
  return text;
}
