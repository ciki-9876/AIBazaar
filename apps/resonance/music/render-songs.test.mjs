import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RHYTHM_SONGS,
  songLoopSeconds,
} from '../src/lib/cards/rhythm-songs.ts';

test('original rendered tracks have exact authored loop lengths, stereo PCM and audible unclipped signal', () => {
  for (const song of RHYTHM_SONGS) {
    const wav = fs.readFileSync(
      new URL(`../../../public${song.audio}`, import.meta.url),
    );
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(20), 1);
    assert.equal(wav.readUInt16LE(22), 2);
    assert.equal(wav.readUInt16LE(34), 16);
    const samples = wav.readUInt32LE(40) / 2;
    assert.equal(samples / 2 / wav.readUInt32LE(24), songLoopSeconds(song));
    let peak = 0,
      square = 0;
    for (let i = 44; i < wav.length; i += 2) {
      const value = wav.readInt16LE(i) / 32768;
      peak = Math.max(peak, Math.abs(value));
      square += value * value;
    }
    assert.ok(peak > 0.7 && peak < 0.9);
    assert.ok(Math.sqrt(square / samples) > 0.08);
  }
});
