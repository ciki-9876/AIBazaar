import type { DuelEvent } from '../../../lib/cards/throw-duel';
import { sitePath } from '../../../lib/site-path';
import { deservesCheer } from './throw-audience';

/** Audible at one point, bounded at huge overkill. The input is settled damage, not a preview. */
export const damageLoudness = (amount: number) =>
  0.32 + 0.48 * Math.sqrt(Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0) / 100));

/** Browser-only sound adapter. No audio clock or state enters the simulation. */
export class ThrowSound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private audienceLoad: Promise<void> | null = null;
  private audienceBuffers = new Map<'cheer' | 'applause' | 'intermission', AudioBuffer>();
  private audienceSources = new Set<AudioBufferSourceNode>();
  private effectSources = new Set<AudioScheduledSourceNode>();
  private audienceGeneration = 0;
  private murmurs: AudioBuffer[] = [];
  private murmurCursor = 0;
  private nextCheerAt = 0;
  private readonly maxVoices = 40;
  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.24 : 0;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -19;
      compressor.knee.value = 15;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.18;
      this.master.connect(compressor);
      compressor.connect(this.context.destination);
      const buffer = this.context.createBuffer(
        1,
        this.context.sampleRate * 0.4,
        this.context.sampleRate,
      );
      const samples = buffer.getChannelData(0);
      let seed = 127;
      for (let i = 0; i < samples.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        samples[i] = seed / 0x80000000 - 1;
      }
      this.noise = buffer;
      const context = this.context;
      this.audienceLoad = Promise.all([
        ...(['cheer', 'applause', 'intermission'] as const).map(async (kind) => {
        try {
          const extension = kind === 'cheer' ? 'ogg' : 'wav';
          const response = await fetch(sitePath(kind === 'intermission' ? '/audio/throw/intermission-announcement.wav' : `/audio/throw/audience-${kind}.${extension}`));
          if (!response.ok) return;
          const decoded = await context.decodeAudioData(await response.arrayBuffer());
          this.audienceBuffers.set(kind, decoded);
        } catch {
          // A failed optional recording does not prevent the duel's normal sound effects.
        }
        }),
        ...[1, 2, 3].map(async (index) => {
          try {
            const response = await fetch(sitePath(`/audio/throw/audience-murmur-${index}.wav`));
            if (response.ok) this.murmurs[index - 1] = await context.decodeAudioData(await response.arrayBuffer());
          } catch { /* Spoken crowd reactions are optional if an asset cannot load. */ }
        }),
      ]).then(() => {});
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) this.stopAudience();
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        value ? 0.24 : 0,
        this.context.currentTime,
        0.025,
      );
  }
  private audience(kind: 'cheer' | 'applause' | 'intermission', amount = 60) {
    const generation = this.audienceGeneration;
    void this.audienceLoad?.then(() => {
      const buffer = this.audienceBuffers.get(kind);
      if (!buffer || !this.context || !this.master || !this.enabled ||
          this.context.state !== 'running' || generation !== this.audienceGeneration) return;
      if (kind === 'cheer' && this.context.currentTime < this.nextCheerAt) return;
      if (kind === 'cheer') this.nextCheerAt = this.context.currentTime + 2;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = kind === 'cheer' ? damageLoudness(amount) * 1.7 : 1.2;
      source.connect(gain);
      gain.connect(this.master);
      this.audienceSources.add(source);
      source.onended = () => { this.audienceSources.delete(source); source.disconnect(); gain.disconnect(); };
      source.start();
      if (kind === 'cheer') {
        const spoken = this.murmurs[this.murmurCursor++ % 3];
        if (!spoken) return;
        const voice = this.context.createBufferSource();
        const voiceGain = this.context.createGain();
        const band = this.context.createBiquadFilter();
        voice.buffer = spoken;
        voice.playbackRate.value = [1, .96, 1.04][(this.murmurCursor - 1) % 3];
        band.type = 'lowpass'; band.frequency.value = 3400;
        voiceGain.gain.value = damageLoudness(amount) * .65;
        voice.connect(band); band.connect(voiceGain); voiceGain.connect(this.master);
        this.audienceSources.add(voice);
        voice.onended = () => { this.audienceSources.delete(voice); voice.disconnect(); band.disconnect(); voiceGain.disconnect(); };
        voice.start(this.context.currentTime + .16);
      }
    });
  }
  private stopAudience() {
    this.audienceGeneration++;
    for (const source of this.audienceSources) source.stop();
    this.audienceSources.clear();
    for (const source of this.effectSources) source.stop();
    this.effectSources.clear();
  }
  private track(source: AudioScheduledSourceNode) {
    // A multi-effect volley cannot accumulate an unbounded WebAudio graph.
    if (this.effectSources.size >= this.maxVoices) {
      const oldest = this.effectSources.values().next().value;
      if (oldest) { oldest.stop(); this.effectSources.delete(oldest); }
    }
    this.effectSources.add(source);
  }
  private tone(
    frequency: number,
    duration: number,
    volume = 0.3,
    delay = 0,
    end = frequency,
    type: OscillatorType = 'sine',
  ) {
    if (!this.context || !this.master || !this.enabled) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, end),
      now + duration,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    this.track(oscillator);
    oscillator.onended = () => { this.effectSources.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
  private rustle(
    duration: number,
    frequency: number,
    volume: number,
    delay = 0,
    endFrequency = frequency,
  ) {
    if (!this.context || !this.master || !this.noise || !this.enabled) return;
    const now = this.context.currentTime + delay;
    const source = this.context.createBufferSource(),
      filter = this.context.createBiquadFilter(),
      gain = this.context.createGain();
    source.buffer = this.noise;
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(frequency, now);
    filter.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    this.track(source);
    source.onended = () => { this.effectSources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(now);
    source.stop(now + duration);
  }
  tap() {
    this.rustle(0.045, 2600, 0.18);
    this.tone(510, 0.05, 0.08, 0, 390);
  }
  start() {
    this.stopAudience();
    this.nextCheerAt = 0;
    this.murmurCursor = 0;
    for (let i = 0; i < 5; i++)
      this.rustle(0.09, 1900 + i * 240, 0.3, i * 0.045);
    this.tone(330, 0.22, 0.14, 0.1, 660);
  }
  event(event: DuelEvent, targetMaxHp?: number) {
    if (event.source === 'rule:intermission') {
      this.stopAudience();
      [392, 523, 659].forEach((note, index) => this.tone(note, 0.35, 0.18, index * 0.13));
      this.audience('intermission');
      return;
    }
    if (event.type === 'draw') {
      this.rustle(0.1, 2200, 0.23, 0, 1400);
      this.tone(700, 0.065, 0.06);
    }
    if (event.type === 'launch') {
      this.rustle(0.24, 950, 0.65, 0, 5500);
      this.tone(180, 0.14, 0.18, 0, 520);
      if ((event.combo ?? 0) > 0) {
        this.tone(440, 0.14, 0.12, 0.025);
        this.tone(660, 0.19, 0.1, 0.065);
        const power = (event.combo ?? 0) >= 4;
        this.tone(power ? 82 : 130, 0.3, power ? 0.4 : 0.2, 0, 45, 'triangle');
        if (power)
          [440, 554, 659, 880, 1320].forEach((note, index) =>
            this.tone(note, 0.25, 0.14, index * 0.035, note * 1.5),
          );
      }
    }
    if (event.type === 'hit') {
      const actual = (event.hpDamage ?? 0) + (event.shieldDamage ?? 0);
      const bigHit = deservesCheer(event, targetMaxHp);
      if (actual > 0 && !bigHit) {
        const volume = damageLoudness(actual);
        // A fast paper crack + tight low body; no long, soft downward chime.
        this.rustle(0.048, 3900, volume * 1.5, 0, 1250);
        this.tone(190, 0.13, volume * 0.7, 0, 46, 'triangle');
        this.tone(2100, 0.035, volume * 0.15, 0.006, 720, 'square');
      }
      if (bigHit) this.audience('cheer', actual);
    }
    if (event.type === 'dot') {
      const actual = (event.hpDamage ?? 0) + (event.shieldDamage ?? 0);
      if (actual <= 0) return;
      const volume = damageLoudness(actual);
      if (event.kind === 'burn') {
        this.rustle(0.18, 1700, volume * 0.7, 0, 4900);
        this.rustle(0.035, 3300, volume * 0.5, 0.055, 1100);
        this.tone(145, 0.12, volume * 0.2, 0, 62, 'triangle');
      } else if (event.kind === 'poison') {
        this.tone(480, 0.15, volume * 0.46, 0, 110);
        this.tone(310, 0.16, volume * 0.3, 0.07, 135);
        this.rustle(0.12, 640, volume * 0.16, 0.04, 300);
      }
    }
    if (event.type === 'heal' && event.value > 0) {
      const volume = damageLoudness(event.value);
      [523, 659, 784].forEach((note, index) => this.tone(note, 0.28, volume * 0.23, index * 0.045));
    }
    if (event.type === 'effect') {
      if (event.kind === 'burn') {
        // Stack application is quiet; the distinct scorch cue belongs to each real tick.
        if (event.value > 0) this.rustle(0.1, 1300, 0.075, 0, 2300);
        return;
      }
      if (event.kind === 'poison') {
        if (event.value > 0) this.tone(260, 0.1, 0.065, 0, 330);
        return;
      }
      if (event.kind === 'shield') {
        // Fan parry is damage prevention, not a fresh shield application.
        if (event.value <= 0 || event.source === 'item:sequence') return;
        const volume = damageLoudness(event.value);
        this.tone(392, 0.2, volume * 0.34, 0, 430, 'triangle');
        this.tone(1176, 0.32, volume * 0.14, 0.012);
        this.rustle(0.07, 2700, volume * 0.2);
        return;
      }
      if (event.kind === 'heal' || event.kind === 'leech') return;
      if (event.kind === 'growth') {
        [523, 659, 784].forEach((note, index) =>
          this.tone(note, 0.22, 0.12, index * 0.05),
        );
        return;
      }
      if (event.kind === 'slow') {
        this.rustle(0.3, 3400, 0.16, 0, 300);
        this.tone(980, 0.3, 0.15, 0, 240);
        return;
      }
      const quiet = event.source === 'item:draw';
      this.tone(quiet ? 990 : 780, 0.12, quiet ? 0.035 : 0.11, 0, 1170);
      if (event.source === 'rule:reorder') {
        this.rustle(0.2, 2100, 0.3);
        this.tone(330, 0.2, 0.16, 0.06, 550);
      }
    }
  }
  finish(won: boolean) {
    if (won) this.audience('applause');
    const notes = won ? [392, 494, 587, 784] : [392, 330, 262];
    notes.forEach((note, index) => this.tone(note, 0.45, 0.2, index * 0.13));
  }
  dispose() {
    this.stopAudience();
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
  }
}
