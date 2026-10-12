'use client';

import { useEffect } from 'react';

export type MusicCity = 'graywick' | 'bridgeport' | 'westport' | 'millbrook';
type CityScore = {
  title: string;
  bpm: number;
  beats: number;
  chords: readonly (readonly number[])[];
  melody: readonly (readonly number[])[];
  instrument: 'reed' | 'piano' | 'brass';
};

/** Original 16-bar scores. MIDI notes; 0 is an intentional melodic rest.
 * These are authored motifs, harmonies and arrangements, not extracts from recordings.
 */
export const CITY_SCORES: Record<MusicCity, CityScore> = {
  millbrook: {
    title: '米尔布鲁克 · 第三声部', bpm: 82, beats: 3, instrument: 'brass',
    chords: [[46,50,53],[43,46,50],[48,51,55],[41,45,48],[46,50,53],[50,53,57],[51,55,58],[41,45,48],[43,46,50],[48,51,55],[46,50,53],[53,57,60],[51,55,58],[41,45,48],[46,50,53],[41,45,48]],
    melody: [[65,0,62,58,62,65],[67,0,62,0,58,0],[63,67,72,0,70,67],[65,0,60,57,0,0],[70,0,65,62,65,0],[69,0,65,62,0,0],[67,70,75,0,74,70],[69,67,65,60,0,0],[70,0,67,62,58,0],[72,70,67,63,0,0],[65,0,70,74,72,70],[72,0,69,65,0,0],[75,74,70,67,0,0],[69,67,65,60,57,0],[62,65,70,0,0,0],[0,0,65,60,57,0]],
  },
  graywick: {
    title: '格雷维克 · 第一盏聚光灯', bpm: 92, beats: 3, instrument: 'reed',
    chords: [[48, 52, 55], [45, 48, 52], [50, 53, 57], [43, 47, 50], [48, 52, 55], [52, 55, 59], [53, 57, 60], [43, 47, 53],
      [45, 48, 52], [52, 56, 59], [53, 57, 60], [50, 53, 57], [48, 52, 55], [43, 47, 53], [48, 52, 55], [43, 47, 50]],
    melody: [[67, 0, 64, 67, 72, 0], [71, 69, 64, 0, 0, 0], [65, 69, 74, 0, 72, 69], [71, 0, 67, 0, 0, 0],
      [64, 67, 72, 76, 74, 72], [71, 0, 67, 64, 0, 0], [69, 72, 77, 76, 74, 72], [71, 69, 67, 0, 0, 0],
      [72, 0, 69, 64, 69, 0], [71, 68, 64, 0, 0, 0], [69, 72, 77, 0, 76, 72], [74, 72, 69, 65, 0, 0],
      [67, 72, 76, 0, 74, 72], [71, 69, 67, 62, 0, 0], [64, 67, 72, 0, 0, 0], [0, 0, 67, 0, 71, 0]],
  },
  bridgeport: {
    title: '布里奇波特 · 雨账与旧钢琴', bpm: 76, beats: 4, instrument: 'piano',
    chords: [[45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [41, 45, 48, 52], [47, 50, 53, 57], [40, 44, 47, 50], [45, 48, 52, 55],
      [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [41, 45, 48, 52], [47, 50, 53, 57], [40, 44, 47, 50], [45, 48, 52, 55], [40, 44, 47, 50]],
    melody: [[0, 64, 67, 0, 69, 0, 67, 64], [65, 0, 62, 0, 0, 60, 62, 65], [67, 0, 65, 62, 59, 0, 0, 0], [64, 0, 62, 60, 59, 0, 0, 0],
      [60, 0, 64, 0, 69, 67, 64, 0], [65, 0, 62, 0, 59, 57, 0, 0], [56, 59, 62, 0, 64, 62, 59, 0], [60, 0, 57, 0, 0, 0, 0, 0],
      [69, 0, 72, 69, 65, 0, 62, 0], [67, 0, 71, 67, 65, 0, 62, 0], [64, 67, 71, 0, 72, 0, 67, 64], [65, 0, 64, 60, 57, 0, 0, 0],
      [62, 65, 69, 0, 65, 62, 59, 0], [64, 0, 62, 59, 56, 0, 0, 0], [57, 60, 64, 0, 69, 0, 0, 0], [0, 0, 64, 62, 59, 0, 56, 0]],
  },
  westport: {
    title: '西港 · 潮汐上的节目单', bpm: 106, beats: 4, instrument: 'brass',
    chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52], [50, 53, 57], [53, 57, 60], [48, 52, 55], [45, 49, 52],
      [46, 50, 53], [48, 52, 55], [50, 53, 57], [43, 46, 50], [46, 50, 53], [45, 49, 52], [50, 53, 57], [45, 49, 52]],
    melody: [[69, 0, 69, 72, 74, 0, 72, 69], [70, 0, 65, 0, 62, 65, 70, 0], [67, 0, 70, 0, 74, 72, 70, 67], [69, 0, 73, 0, 76, 0, 73, 0],
      [74, 0, 77, 74, 72, 69, 0, 0], [72, 0, 69, 0, 65, 69, 72, 0], [67, 0, 72, 0, 76, 74, 72, 67], [69, 0, 73, 76, 0, 0, 0, 0],
      [74, 77, 74, 0, 70, 0, 65, 0], [72, 76, 72, 0, 67, 0, 64, 0], [69, 72, 74, 0, 77, 0, 74, 72], [70, 0, 67, 0, 62, 0, 0, 0],
      [65, 70, 74, 0, 77, 74, 70, 0], [76, 73, 69, 0, 64, 0, 0, 0], [65, 69, 74, 0, 0, 0, 0, 0], [0, 0, 64, 0, 69, 0, 73, 0]],
  },
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
let audioGestureSeen = false;

class CityMusic {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextAt = 0;
  private step = 0;
  private disposed = false;
  private sources = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer | null = null;
  constructor(private score: CityScore, private volume: number) {}

  async unlock() {
    if (this.disposed || document.hidden) return;
    if (!this.context) {
      const ctx = new AudioContext();
      this.context = ctx;
      const master = ctx.createGain(), compressor = ctx.createDynamicsCompressor();
      master.gain.value = Math.max(0, Math.min(.22, this.volume));
      compressor.threshold.value = -22;
      compressor.knee.value = 12;
      compressor.ratio.value = 3;
      compressor.attack.value = .015;
      compressor.release.value = .3;
      master.connect(compressor);
      compressor.connect(ctx.destination);
      this.master = master;
      this.noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .25), ctx.sampleRate);
      const samples = this.noise.getChannelData(0);
      let seed = 4157;
      for (let i = 0; i < samples.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        samples[i] = seed / 0x80000000 - 1;
      }
    }
    try { await this.context.resume(); } catch { return; }
    if (this.disposed || this.context.state !== 'running') return;
    if (!this.timer) {
      this.nextAt = this.context.currentTime + .08;
      this.schedule();
      this.timer = setInterval(() => this.schedule(), 80);
    }
  }
  visibility() {
    if (document.hidden) {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.stopNotes();
      void this.context?.suspend().catch(() => {});
    } else if (this.context) void this.unlock();
  }
  private stopNotes() {
    for (const source of this.sources) { try { source.stop(); } catch { /* already ended */ } }
    this.sources.clear();
  }
  private note(midi: number, at: number, duration: number, strength: number, type: OscillatorType = 'triangle', attack = .015) {
    const ctx = this.context, master = this.master;
    if (!ctx || !master || !midi || this.sources.size >= 72) return;
    const source = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    source.type = type;
    source.frequency.value = hz(midi);
    filter.type = 'lowpass';
    filter.frequency.value = this.score.instrument === 'brass' ? 2200 : 1500;
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(strength, at + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, strength * .48), at + duration * .32);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(gain); gain.connect(master);
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); gain.disconnect(); filter.disconnect(); };
    source.start(at); source.stop(at + duration + .02);
  }
  private brush(at: number, strong: boolean) {
    const ctx = this.context, master = this.master;
    if (!ctx || !master || !this.noise || this.sources.size >= 72) return;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noise;
    filter.type = 'highpass'; filter.frequency.value = strong ? 1700 : 3800;
    gain.gain.setValueAtTime(strong ? .035 : .014, at);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .12);
    source.connect(filter); filter.connect(gain); gain.connect(master);
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(at); source.stop(at + .15);
  }
  private schedule() {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.disposed || document.hidden) return;
    if (this.nextAt < ctx.currentTime) this.nextAt = ctx.currentTime + .02;
    const score = this.score, beat = 60 / score.bpm, half = beat / 2;
    while (this.nextAt < ctx.currentTime + .22) {
      const local = this.step % (score.beats * 2);
      const bar = Math.floor(this.step / (score.beats * 2)) % 16;
      const phrase = Math.floor(this.step / (score.beats * 2 * 16)) % 2;
      const chord = score.chords[bar];
      const at = this.nextAt + (score.instrument === 'piano' && local % 2 ? half * .13 : 0);
      const lead = score.melody[bar][local];
      if (lead) {
        this.note(lead, at, beat * .72, .1, score.instrument === 'brass' ? 'sawtooth' : 'triangle');
        if (score.instrument === 'reed') this.note(lead - 12, at, beat * .68, .028, 'sine');
        if (phrase === 1 && local === 0) this.note(lead + 12, at, beat * .55, .022, 'sine');
      }
      if (local === 0) {
        this.note(chord[0] - 12, at, beat * 1.5, .16, 'sine');
        chord.slice(1).forEach((n, index) => this.note(n + 12, at + index * .012, beat * (score.beats - .3), .025, 'sine', .045));
      }
      if (local % 2 === 0 && local > 0) {
        if (score.beats === 3) chord.forEach((n, index) => this.note(n + 12, at + index * .01, beat * .48, .033));
        else if (local === 4) this.note(chord[0] - 5, at, beat * .85, .105, 'sine');
        else chord.slice(1).forEach((n) => this.note(n + 12, at, beat * .48, .033));
      }
      if (score.instrument === 'brass' || score.instrument === 'piano') this.brush(at, local === 2 || local === 6);
      // A quiet answering countermelody leaves the primary motif room to breathe.
      if (phrase === 1 && local % 2 && !lead) this.note(chord[(local + bar) % chord.length] + 12, at, half * .85, .04);
      this.step++;
      this.nextAt += half;
    }
  }
  dispose() {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stopNotes();
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
  }
}

/** One soundtrack for the active city. No audio starts before a real browser gesture.
 * Battles/hidden pages stop the score; city changes and StrictMode unmounts dispose it.
 */
export function useCityMusic({ city, enabled, muted = false, volume = .16 }: {
  city: MusicCity | null;
  enabled: boolean;
  muted?: boolean;
  volume?: number;
}) {
  useEffect(() => {
    if (!city || !enabled || muted) return;
    const music = new CityMusic(CITY_SCORES[city], volume);
    const unlock = () => { audioGestureSeen = true; void music.unlock(); };
    const visibility = () => music.visibility();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    if (audioGestureSeen) void music.unlock();
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      music.dispose();
    };
  }, [city, enabled, muted, volume]);
}
