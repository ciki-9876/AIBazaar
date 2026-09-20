export type CardDef = {
  hitType?: 'instant' | 'projectile';
  id: string;
  name: string;
  size: number;
  cd: number;
  power: number;
  kind: string;
  effect: string;
  master: string;
  energyCost: number;
  energyGain: number;
};
