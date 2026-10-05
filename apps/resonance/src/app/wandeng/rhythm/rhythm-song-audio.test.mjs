import test from 'node:test';
import assert from 'node:assert/strict';
import { RhythmSongAudio } from './rhythm-song-audio.ts';
import { RHYTHM_SONGS } from '../../../lib/cards/rhythm-songs.ts';

function context() {
  const sources = [],
    levels = [];
  return {
    state: 'running',
    currentTime: 10,
    destination: {},
    sources,
    levels,
    async resume() {
      this.state = 'running';
    },
    async close() {
      this.state = 'closed';
    },
    createGain() {
      return {
        gain: { value: 0, setTargetAtTime: (value) => levels.push(value) },
        connect() {},
      };
    },
    async decodeAudioData(data) {
      return { data };
    },
    createBufferSource() {
      const source = {
        playbackRate: { value: 1 },
        connect() {},
        disconnect() {},
        start(...args) {
          this.started = args;
        },
        stop() {
          this.stopped = true;
          this.onended?.();
        },
      };
      sources.push(source);
      return source;
    },
  };
}
const okay = { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.00001, `${a} != ${b}`);

test('audio uses only the selected player song, seeks modulo its loop, and shares playback speed with its clock', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    requests.push(url);
    return okay;
  });
  const ctx = context(),
    audio = new RhythmSongAudio(() => ctx);
  assert.equal(await audio.play(RHYTHM_SONGS[0], 2800, 2), true);
  assert.deepEqual(requests, ['/art-assets/wandeng/music/home-lights.wav']);
  assert.deepEqual(ctx.sources[0].started, [10.04, 6]);
  assert.equal(ctx.sources[0].loopEnd, 64);
  assert.equal(ctx.sources[0].playbackRate.value, 2);
  near(audio.currentTick(), 2800);
  ctx.currentTime = 10.54;
  near(audio.currentTick(), 2840);
  audio.pause();
  assert.equal(audio.currentTick(), null);
  assert.equal(ctx.sources[0].stopped, true);
  await audio.play(RHYTHM_SONGS[0], 40, 1);
  assert.equal(requests.length, 1);
  near(ctx.sources[1].started[1], 1);
  audio.setVolume(2);
  audio.setVolume(-1);
  assert.deepEqual(ctx.levels, [1, 0]);
  audio.dispose();
  assert.equal(ctx.state, 'closed');
});

test('pausing or changing the song during loading prevents an obsolete track from starting', async (t) => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  t.mock.method(globalThis, 'fetch', (url) =>
    url.includes('home-lights') ? pending : Promise.resolve(okay),
  );
  const ctx = context(),
    audio = new RhythmSongAudio(() => ctx);
  const old = audio.play(RHYTHM_SONGS[0], 0, 1);
  await Promise.resolve();
  audio.pause();
  assert.equal(await audio.play(RHYTHM_SONGS[1], 0, 1), true);
  release(okay);
  assert.equal(await old, false);
  assert.equal(ctx.sources.length, 1);
  assert.equal(ctx.sources[0].loopEnd, 76.8);
  audio.dispose();
});

test('failed audio fetch can be retried without poisoning the buffer cache', async (t) => {
  let count = 0;
  t.mock.method(globalThis, 'fetch', async () =>
    ++count === 1 ? { ok: false } : okay,
  );
  const ctx = context(),
    audio = new RhythmSongAudio(() => ctx);
  await assert.rejects(audio.play(RHYTHM_SONGS[0], 0, 1));
  assert.equal(await audio.play(RHYTHM_SONGS[0], 0, 1), true);
  assert.equal(count, 2);
  audio.dispose();
});
