import { act } from './demo-engine.ts';
export function claimReward(s) {
  return s.loot
    ? act(act(s, { type: 'reveal-loot' }), { type: 'claim-loot' })
    : s;
}
