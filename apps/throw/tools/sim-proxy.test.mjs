import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPETITIVE_STYLES, PRESETS } from '../src/lib/cards/throw-loadout.ts';
import { LAZY_POLICIES, playDuel, seedAt } from './sim-proxy.mjs';

// ADR-0060: a rule must not reward a habit that needs no thought. Under v11's
// three-card flushes, "throw three of a suit" lifted the quick kit from 51% to
// 70% against the field (N=30); the balance AI never tried it.
/**
 * Known and tracked, not excused: the guard kit played as "throw any pair"
 * averages ~74% (N=30) while the balance proxy plays it at ~56%. This is the
 * three-shield core that ADR-0056 left open; it predates v12 (v11: 78%).
 * It may not get worse while it waits for its own decision.
 */
const KNOWN = { 'guard:groups': 0.8 };
test('no lazy habit carries a preset kit far past its balance-proxy result', () => {
  const N = 8;
  const average = (style, policy) => {
    let score = 0;
    for (const enemy of COMPETITIVE_STYLES)
      for (let i = 0; i < N; i++)
        score += playDuel({ style, items: PRESETS[style].items, relic: PRESETS[style].relic, policy }, { style: enemy }, seedAt(i)).score;
    return score / (N * COMPETITIVE_STYLES.length);
  };
  for (const style of COMPETITIVE_STYLES) {
    const proxy = average(style, null);
    for (const policy of Object.keys(LAZY_POLICIES)) {
      const lazy = average(style, policy);
      const label = `${style} by "${policy}": ${(lazy * 100).toFixed(0)}% (proxy ${(proxy * 100).toFixed(0)}%)`;
      assert.ok(lazy <= 0.8, label);
      if (KNOWN[`${style}:${policy}`] !== undefined) assert.ok(lazy <= KNOWN[`${style}:${policy}`], label);
      else assert.ok(lazy - proxy <= 0.2, label);
    }
  }
});
