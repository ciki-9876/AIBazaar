import type { CardDef } from './card-types.ts';
export type HeroId = 'breaker' | 'mender' | 'archivist';
export type HeroMechanic = {
  opening?: [number, number];
  exposed?: number;
  barrierBonus?: number;
  growth?: number;
  intactBonus?: number;
  corrosionBonus?: number;
  smallAllyBonus?: number;
  seekCorrosion?: boolean;
  heal?: number;
  repair?: number;
  firstCharge?: number;
  allCharge?: boolean;
  buffer?: number;
  recoil?: boolean;
  allRepair?: boolean;
};
export type HeroCard = CardDef & {
  hero: HeroId;
  rarity: number;
  role: string;
  mechanic: HeroMechanic;
};
// Hero-specific cards were retired with catalog version 2.
export const HERO_CARDS: HeroCard[] = [];
