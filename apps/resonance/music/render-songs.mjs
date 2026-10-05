// Original score and deterministic PCM renderer. No external recordings or libraries.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RHYTHM_SONGS,
  songLoopSeconds,
} from '../src/lib/cards/rhythm-songs.ts';

const SR = 32000;
const destination = fileURLToPath(
  new URL('../../../public/art-assets/wandeng/music/', import.meta.url),
);
fs.mkdirSync(destination, { recursive: true });
const melody = [
  [76, 79, 81, 79, 76, 74, 72, 74],
  [76, 81, 83, 84, 83, 81, 79, 76],
  [77, 81, 84, 81, 79, 77, 76, 74],
  [74, 79, 83, 81, 79, 76, 74, 71],
  [72, 76, 79, 84, 83, 79, 76, 74],
  [71, 76, 79, 83, 81, 79, 76, 74],
  [74, 77, 81, 79, 77, 74, 72, 69],
  [71, 74, 79, 81, 79, 74, 71, 67],
];
const harmony = [
  [48, 52, 55, 59],
  [45, 48, 52, 55],
  [41, 45, 48, 52],
  [43, 48, 50, 55],
  [48, 52, 55, 59],
  [40, 43, 47, 52],
  [38, 41, 45, 48],
  [43, 47, 50, 53],
];
const score = {
  title: '归途的小灯',
  composer: 'Codex · 原创程序编曲',
  meter: '4/4',
  key: 'C major',
  bars: 32,
  sections: [
    'A：街灯主题（1—8小节）',
    'A′：木键回答（9—16）',
    'B：雨檐间奏（17—24）',
    'A″：归途合奏（25—32）',
  ],
  melody,
  harmony,
  instruments: [
    '钟琴／音乐盒主旋律',
    '柔和电钢琴和弦',
    '木键分解和弦',
    '圆润低音',
    '轻鼓与沙锤',
  ],
  variants: RHYTHM_SONGS.map((s) => ({
    id: s.id,
    bpm: s.bpm,
    seconds: songLoopSeconds(s),
  })),
};
fs.writeFileSync(
  path.join(destination, 'score.json'),
  JSON.stringify(score, null, 2),
);

for (const song of RHYTHM_SONGS) {
  const beat = 60 / song.bpm,
    N = Math.round(SR * songLoopSeconds(song));
  const left = new Float32Array(N),
    right = new Float32Array(N);
  let noiseState = 0x19a728;
  const noise = () => {
    noiseState ^= noiseState << 13;
    noiseState ^= noiseState >>> 17;
    noiseState ^= noiseState << 5;
    return (noiseState >>> 0) / 2147483648 - 1;
  };
  const add = (at, duration, sample, amplitude, pan = 0) => {
    const start = Math.round(at * SR),
      count = Math.ceil(duration * SR);
    const l = Math.sqrt((1 - pan) / 2) * amplitude,
      r = Math.sqrt((1 + pan) / 2) * amplitude;
    for (let i = 0; i < count; i++) {
      const t = i / SR,
        v =
          sample(t) *
          Math.min(1, t / 0.005) *
          Math.min(1, (duration - t) / 0.035);
      const index = (start + i) % N;
      left[index] += v * l;
      right[index] += v * r;
    }
  };
  const note = (midi, at, duration, instrument, amplitude, pan) => {
    const f = 440 * 2 ** ((midi - 69) / 12);
    add(
      at,
      duration,
      (t) => {
        const phase = 2 * Math.PI * f * t;
        if (instrument === 'bell')
          return (
            Math.sin(phase) * Math.exp(-3.6 * t) +
            0.24 * Math.sin(phase * 2) * Math.exp(-7 * t) +
            0.07 * Math.sin(phase * 4) * Math.exp(-12 * t)
          );
        if (instrument === 'keys')
          return (
            (Math.sin(phase) + 0.2 * Math.sin(phase * 2)) * Math.exp(-1.8 * t)
          );
        if (instrument === 'wood')
          return (
            (Math.sin(phase) + 0.2 * Math.sin(phase * 3)) * Math.exp(-8 * t)
          );
        return (
          (Math.sin(phase) + 0.12 * Math.sin(phase * 2)) * Math.exp(-2.5 * t)
        );
      },
      amplitude,
      pan,
    );
  };
  for (let bar = 0; bar < 32; bar++) {
    const section = Math.floor(bar / 8),
      h = harmony[bar % 8],
      m = melody[bar % 8],
      at = bar * 4 * beat;
    const mellow = song.id === 'rain-eaves',
      bridge = section === 2;
    for (const pitch of h)
      note(pitch + 12, at, beat * 3.8, 'keys', bridge ? 0.047 : 0.06, -0.28);
    for (let k = 0; k < 8; k++) {
      if (!bridge || k % 2 === 0)
        note(
          m[k] - (mellow ? 12 : 0),
          at + k * 0.5 * beat,
          beat * (bridge ? 1.3 : 0.82),
          'bell',
          bridge ? 0.115 : 0.17,
          0.25,
        );
      if (section === 1 || section === 3)
        note(
          h[k % 4] + 24,
          at + k * 0.5 * beat,
          beat * 0.7,
          'wood',
          0.06,
          -0.5,
        );
    }
    note(h[0] - 12, at, beat * 1.6, 'bass', 0.15, 0);
    note(h[0] - 5, at + 2 * beat, beat * 1.5, 'bass', 0.11, 0);
    for (let k = 0; k < 4; k++) {
      const when = at + k * beat;
      if (k % 2 === 0)
        add(
          when,
          0.25,
          (t) =>
            Math.sin(2 * Math.PI * (48 * t + 9 * (1 - Math.exp(-30 * t)))) *
            Math.exp(-17 * t),
          k === 0 ? 0.2 : 0.14,
          0,
        );
      if (k % 2 === 1 && !bridge)
        add(
          when,
          0.16,
          (t) =>
            (noise() * 0.75 + Math.sin(2 * Math.PI * 170 * t) * 0.25) *
            Math.exp(-27 * t),
          0.075,
          -0.12,
        );
      add(
        when,
        0.085,
        (t) => noise() * Math.exp(-60 * t),
        k === 0 ? 0.065 : 0.04,
        0.55,
      );
      if (section !== 2)
        add(
          when + 0.5 * beat,
          0.045,
          (t) => noise() * Math.exp(-100 * t),
          0.023,
          0.5,
        );
    }
  }
  // Circular echoes let the authored loop keep its tails without adding silent time.
  for (const delay of [0.75, 1.5]) {
    const offset = Math.round(beat * delay * SR),
      wet = delay === 0.75 ? 0.11 : 0.05;
    const l = new Float32Array(left),
      r = new Float32Array(right);
    for (let i = 0; i < N; i++) {
      const j = (i + offset) % N;
      left[j] += r[i] * wet;
      right[j] += l[i] * wet;
    }
  }
  let peak = 0,
    square = 0;
  for (let i = 0; i < N; i++)
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const gain = 0.82 / peak,
    output = Buffer.alloc(44 + N * 4);
  output.write('RIFF', 0);
  output.writeUInt32LE(output.length - 8, 4);
  output.write('WAVEfmt ', 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(2, 22);
  output.writeUInt32LE(SR, 24);
  output.writeUInt32LE(SR * 4, 28);
  output.writeUInt16LE(4, 32);
  output.writeUInt16LE(16, 34);
  output.write('data', 36);
  output.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    const l = left[i] * gain,
      r = right[i] * gain;
    square += l * l + r * r;
    output.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    output.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join(destination, `${song.id}.wav`), output);
  console.log(
    JSON.stringify({
      song: song.name,
      seconds: N / SR,
      peak: 0.82,
      rms: Math.sqrt(square / (N * 2)),
      bytes: output.length,
    }),
  );
}
