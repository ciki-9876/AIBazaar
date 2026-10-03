import type { ItemKind } from './survival-room.ts';

export type ItemTrait =
  | 'usable'
  | 'equippable'
  | 'combat'
  | 'mechanism'
  | 'consumable'
  | 'material'
  | 'key'
  | 'adjacency'
  | 'valuable'
  | 'stackable';
export const TRAIT_LABELS: Record<ItemTrait, string> = {
  usable: '可使用',
  equippable: '可装备',
  combat: '战斗',
  mechanism: '机制',
  consumable: '消耗品',
  material: '升级材料',
  key: '关键物品',
  adjacency: '相邻',
  valuable: '贵重物',
  stackable: '可堆叠',
};
type Definition = {
  traits: readonly ItemTrait[];
  use?: {
    stat: 'hp' | 'food' | 'water';
    gain: number;
    automaticBelow?: number;
  };
  vision?: number;
  illumination?: number;
};
/** One source for interaction eligibility. Container position is never an item trait. */
export const ITEM_PROPERTIES: Record<ItemKind, Definition> = {
  phone: { traits: ['equippable', 'combat', 'key'] },
  flashlight: {
    traits: ['equippable', 'combat', 'mechanism'],
    vision: 2,
  },
  'energy-core': { traits: ['material', 'key', 'consumable'] },
  'lift-material': { traits: ['material', 'consumable', 'stackable'] },
  nail: { traits: ['equippable', 'combat'] },
  laser: { traits: ['equippable', 'combat'] },
  capacitor: { traits: ['equippable', 'combat', 'adjacency'] },
  coolant: { traits: ['equippable', 'combat', 'adjacency'] },
  scrap: { traits: ['material', 'consumable'] },
  coil: { traits: ['equippable', 'combat'] },
  blade: { traits: ['equippable', 'combat'] },
  water: {
    traits: ['usable', 'consumable'],
    use: { stat: 'water', gain: 45 },
  },
  food: {
    traits: ['usable', 'consumable'],
    use: { stat: 'food', gain: 45, automaticBelow: 35 },
  },
  bread: { traits: ['usable', 'consumable'], use: { stat: 'food', gain: 45 } },
  medicine: {
    traits: ['usable', 'consumable'],
    use: { stat: 'hp', gain: 45, automaticBelow: 45 },
  },
  core: { traits: ['valuable'] },
};
export const hasTrait = (kind: ItemKind, trait: ItemTrait) =>
  ITEM_PROPERTIES[kind].traits.includes(trait);
export const itemUseDescription = (kind: ItemKind) => {
  const use = ITEM_PROPERTIES[kind].use;
  return use
    ? `${use.stat === 'water' ? '饮水' : use.stat === 'food' ? '饱食' : '精神力'} +${use.gain}`
    : '';
};
export function equipmentMechanics(
  equipment: readonly { item: { kind: string } }[] = [],
) {
  // Duplicate flashlights do not stack passive radius; combat still uses each equipped item.
  return equipment.reduce(
    (result, { item }) => {
      const p = ITEM_PROPERTIES[item.kind as ItemKind];
      return {
        vision: Math.max(result.vision, p?.vision || 0),
        illumination: Math.max(result.illumination, p?.illumination || 0),
      };
    },
    { vision: 0, illumination: 0 },
  );
}
