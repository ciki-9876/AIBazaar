import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceReplay, flightProgress } from './playback.ts';
test('projectiles move within a combat snapshot and reach impact exactly', () => {
  let clock = 1;
  const samples = [];
  for (let n = 0; n < 10; n++) {
    clock = advanceReplay(clock, 1000 / 60, 1, 8);
    samples.push(flightProgress(clock, 1, 2));
  }
  assert.equal(new Set(samples).size, 10);
  assert.ok(samples.every((x, i) => i === 0 || x > samples[i - 1]));
  assert.equal(flightProgress(0, 1, 2), 0);
  assert.equal(flightProgress(2, 1, 2), 1);
});
test('continuous playback respects speed, frame stalls, and the replay end', () => {
  assert.equal(advanceReplay(2, 50, 2, 8), 2.1);
  assert.equal(advanceReplay(2, 50, 0.5, 8), 2.025);
  assert.equal(advanceReplay(2, 60000, 1, 8), 2.1);
  assert.equal(advanceReplay(7.99, 50, 2, 8), 8);
  assert.equal(advanceReplay(2, 0, 2, 8), 2);
});
