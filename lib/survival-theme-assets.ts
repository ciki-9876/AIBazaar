import { GARDEN_ASSET_PACK } from './survival-pavilion.ts';
import type { RoomWorld } from './survival-world.ts';

/** Geometry providers are registered alongside the environment, never randomised at spawn time. */
export const THEME_CREATURE_PACKS = {
  pavilion: GARDEN_ASSET_PACK,
  wasteland: {
    id: 'wasteland-1',
    creatureRenderer: 'shard-vermin-1',
    creatures: {
      crawler: '棘虫',
      runner: '裂壳',
      brute: '骨甲虫',
      boss: '荒原母巢',
    },
  },
  maintenance: {
    id: 'maintenance-1',
    creatureRenderer: 'rust-vermin-1',
    creatures: {
      crawler: '锈蚀虫',
      runner: '悬壳',
      brute: '重甲蚀虫',
      boss: '维保寄生体',
    },
  },
  dunes: {
    id: 'dunes-1',
    creatureRenderer: 'sand-vermin-1',
    creatures: {
      crawler: '沙棘虫',
      runner: '风蚀壳',
      brute: '岩甲虫',
      boss: '沙岩巢主',
    },
  },
} as const;
export const creaturePack = (theme?: RoomWorld['theme']) =>
  THEME_CREATURE_PACKS[theme || 'wasteland'];
