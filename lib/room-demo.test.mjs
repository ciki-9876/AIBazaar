import test from 'node:test';
import assert from 'node:assert/strict';
import { newRoomDemo, roomAction } from './room-demo.ts';
test('room route preserves pickups and pays each reward once', () => {
  let s = newRoomDemo();
  const before = structuredClone(s);
  assert.equal(roomAction(s, { type: 'travel', room: 3 }), s);
  assert.deepEqual(s, before);
  s = roomAction(s, { type: 'travel', room: 1 });
  s = roomAction(s, { type: 'search' });
  assert.equal(roomAction(s, { type: 'search' }), s);
  s = roomAction(s, { type: 'travel', room: 2 });
  assert.equal(roomAction(s, { type: 'travel', room: 3 }), s);
  s = roomAction(s, { type: 'assist' });
  assert.equal(s.glue, 0);
  assert.equal(s.moves, 12);
  assert.equal(roomAction(s, { type: 'assist' }), s);
  s = roomAction(s, { type: 'turn', index: 0 });
  s = roomAction(s, { type: 'turn', index: 2 });
  s = roomAction(s, { type: 'repair' });
  assert.equal(s.scanner, 1);
  assert.equal(roomAction(s, { type: 'repair' }), s);
  s = roomAction(s, { type: 'identify' });
  assert.equal(s.pad, 'card');
  assert.equal(s.scanner, 0);
  assert.equal(roomAction(s, { type: 'identify' }), s);
  s = roomAction(s, { type: 'travel', room: 3 });
  s = roomAction(s, { type: 'victory' });
  assert.equal(roomAction(s, { type: 'victory' }), s);
  for (const room of [2, 1, 0]) s = roomAction(s, { type: 'travel', room });
  s = roomAction(s, { type: 'return' });
  assert.equal(s.returned, true);
  assert.equal(s.pad, 'card');
});
test('puzzle can be completed without tools; reset cannot refund a spent tool', () => {
  let s = roomAction(roomAction(newRoomDemo(), { type: 'travel', room: 1 }), {
    type: 'travel',
    room: 2,
  });
  assert.equal(roomAction(s, { type: 'turn', index: NaN }), s);
  for (const index of [0, 2]) s = roomAction(s, { type: 'turn', index });
  assert.equal(roomAction(s, { type: 'repair' }).repaired, true);
  const tool = { ...s, assisted: true, glue: 0 };
  assert.equal(roomAction(tool, { type: 'reset-pipes' }).glue, 0);
  assert.equal(
    roomAction({ ...s, moves: 0 }, { type: 'turn', index: 1 }).moves,
    0,
  );
});
