import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson } from './serialization.ts';
import { encodeSave, decodeSave } from './save-envelope.ts';

test('canonical saves ignore object insertion order and preserve arrays, text and undefined JSON semantics', () => {
  const a = { z: [{ b: 2, a: 1 }, undefined], text: 'e\u0301', optional: undefined };
  const b = { text: 'e\u0301', z: [{ a: 1, b: 2 }, null] };
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.deepEqual(JSON.parse(canonicalJson(a)).z, [{ a: 1, b: 2 }, null]);
  assert.notEqual(canonicalJson({ array: [1, 2] }), canonicalJson({ array: [2, 1] }));
  assert.throws(() => canonicalJson({ bad: NaN }));
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => canonicalJson(cycle));
});
test('save headers and payloads are checked; partial envelopes cannot bypass validation as legacy data', () => {
  const payload = { version: 1, coins: 10 };
  const encoded = encodeSave('cards', 'test/1', payload);
  assert.equal(encoded, encodeSave('cards', 'test/1', { coins: 10, version: 1 }));
  assert.deepEqual(decodeSave(encoded, 'cards', 'test/1'), payload);
  assert.throws(() => decodeSave(encoded, 'elevator', 'test/1'), /其他产品/);
  assert.throws(() => decodeSave(encoded, 'cards', 'test/2'), /规则版本/);
  const corrupt = JSON.parse(encoded); corrupt.payload.coins++;
  assert.throws(() => decodeSave(JSON.stringify(corrupt), 'cards', 'test/1'), /校验失败/);
  corrupt.schemaVersion = 99;
  assert.throws(() => decodeSave(JSON.stringify(corrupt), 'cards', 'test/1'), /信封版本/);
  assert.throws(() => decodeSave('{"product":"cards","version":1}', 'cards', 'test/1'), /信封版本/);
  assert.deepEqual(decodeSave(JSON.stringify(payload), 'cards', 'test/1'), payload);
});
