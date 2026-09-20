import { act } from './demo-engine.ts';
export function claimReward(s) {
  while (s.loot)
    s = act(act(s, { type: 'reveal-loot' }), { type: 'claim-loot' });
  return s;
}
