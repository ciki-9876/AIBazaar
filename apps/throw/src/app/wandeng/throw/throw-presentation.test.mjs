import test from 'node:test';
import assert from 'node:assert/strict';
import { throwAdvice } from './throw-advice.ts';
import { deservesCheer } from './throw-audience.ts';

test('strategy advice follows a custom trunk and honours its show terms', () => {
  assert.deepEqual(throwAdvice(['quick', 'needle']), ['单张连甩']);
  assert.deepEqual(throwAdvice(['pair', 'ward']), ['出对子', '多出黑桃 ♠']);
  assert.deepEqual(throwAdvice(['sequence', 'suit']), ['凑三张起顺子', '凑三张起同花']);
  assert.deepEqual(throwAdvice(['focus']), ['攒五张组合爆发']);
  assert.ok(!throwAdvice(['focus'], {maxCards: 3}).includes('攒五张组合爆发'));
  const restricted = throwAdvice(['quick', 'pair', 'ward', 'mend'], { maxCards: 1, suits: [1] });
  assert.deepEqual(restricted, ['单张连甩', '多出红心 ♥']);
  assert.ok(!throwAdvice(['quick'], { minCards: 2 }).includes('单张连甩'));
});

test('audience cheers use actual player life damage, a strict threshold, and never DOT or blocked damage', () => {
  const hit = {type:'hit', side:0, hpDamage:65, shieldDamage:0, value:65};
  assert.equal(deservesCheer(hit), true);
  assert.equal(deservesCheer({...hit,hpDamage:64}), false);
  assert.equal(deservesCheer({...hit,hpDamage:0,shieldDamage:100,value:100}), false);
  assert.equal(deservesCheer({...hit,side:1}), false);
  assert.equal(deservesCheer({...hit,type:'dot'}), false);
});
