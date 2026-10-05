import type { DuelEvent } from '../../../lib/cards/throw-duel';

/** Browser-only sound adapter. No audio clock or state enters the simulation. */
export class ThrowSound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.24 : 0;
      this.master.connect(this.context.destination);
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
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        value ? 0.24 : 0,
        this.context.currentTime,
        0.025,
      );
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
    source.start(now);
    source.stop(now + duration);
  }
  tap() {
    this.rustle(0.045, 2600, 0.18);
    this.tone(510, 0.05, 0.08, 0, 390);
  }
  start() {
    for (let i = 0; i < 5; i++)
      this.rustle(0.09, 1900 + i * 240, 0.3, i * 0.045);
    this.tone(330, 0.22, 0.14, 0.1, 660);
  }
  event(event: DuelEvent) {
    if (event.type === 'draw') {
      this.rustle(0.1, 2200, 0.23, 0, 1400);
      this.tone(700, 0.065, 0.06);
    }
    if (event.type === 'launch') {
      this.rustle(0.24, 950, 0.65, 0, 5500);
      this.tone(180, 0.14, 0.18, 0, 520);
      if (!event.text.startsWith('散牌')) {
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
      this.tone(event.value >= 60 ? 98 : 150, 0.22, 0.65, 0, 42, 'triangle');
      this.rustle(0.13, 950, 0.5, 0, 350);
      this.tone(960, 0.11, 0.12, 0.025, 440);
    }
    if (event.type === 'heal' && event.value > 0) {
      this.tone(660, 0.25, 0.17);
      this.tone(880, 0.32, 0.12, 0.06);
    }
    if (event.type === 'effect') {
      if (event.kind === 'burn') {
        this.rustle(0.32, 700, 0.2, 0, 3200);
        this.tone(130, 0.23, 0.18, 0, 52, 'sawtooth');
        return;
      }
      if (event.kind === 'poison') {
        this.tone(190, 0.18, 0.17, 0, 340);
        this.tone(290, 0.22, 0.12, 0.07, 140);
        return;
      }
      if (event.kind === 'shield') {
        this.tone(740, 0.22, 0.17, 0, 920, 'triangle');
        this.tone(1110, 0.25, 0.09, 0.02);
        return;
      }
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
      if (event.source === 'relic:order') {
        this.rustle(0.2, 2100, 0.3);
        this.tone(330, 0.2, 0.16, 0.06, 550);
      }
    }
  }
  finish(won: boolean) {
    const notes = won ? [392, 494, 587, 784] : [392, 330, 262];
    notes.forEach((note, index) => this.tone(note, 0.45, 0.2, index * 0.13));
  }
  dispose() {
    void this.context?.close().catch(() => {});
  }
}
