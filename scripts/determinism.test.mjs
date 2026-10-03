import test from 'node:test';
import assert from 'node:assert/strict';
import { determinismViolations, checkDeterminism } from './determinism.mjs';
import { randomStream } from '../packages/core/random.ts';

test('determinism gate rejects direct, indexed and destructured ambient sources and new locale sorting', () => {
  for (const code of ['Math.random()', "const r = Math['random'];", 'Date.now()', 'new Date()', 'new globalThis.Date()', 'const ambient = Math; ambient.random();', 'globalThis.Math.random()', 'performance.now()', 'crypto.getRandomValues(buffer)', 'const {random: roll} = Math;', 'ids.sort((a,b)=>a.localeCompare(b));']) assert.ok(determinismViolations(code).length, code);
  assert.equal(determinismViolations('const next = Math.imul(seed, 1664525); const dt = tick / 30;').length, 0);
  assert.equal(determinismViolations('const entry = {createdAt: new Date().toISOString()};', 'lib/arena-archive.ts').length, 0);
  assert.ok(determinismViolations('const entry = {damage: new Date().getTime()};', 'lib/arena-archive.ts').length);
  assert.ok(checkDeterminism() > 30);
});
test('named RNG streams reproduce and extra loot draws never consume combat or world draws', () => {
  const expected = [randomStream(123, 'combat'), randomStream(123, 'world')].map((r) => Array.from({ length: 10 }, r));
  const loot = randomStream(123, 'loot');
  Array.from({ length: 1000 }, loot);
  const actual = [randomStream(123, 'combat'), randomStream(123, 'world')].map((r) => Array.from({ length: 10 }, r));
  assert.deepEqual(actual, expected);
  assert.notDeepEqual(expected[0], expected[1]);
});
