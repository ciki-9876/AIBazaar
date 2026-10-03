/** Local procedural sound, started only by the player's entry gesture. */
export class OpeningAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private music: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  start() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.24;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 12;
        limiter.ratio.value = 5;
        this.master.connect(limiter).connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch {
      /* Visual cues remain available without audio. */
    }
  }
  pause(value: boolean) {
    if (!this.context) return;
    if (value) void this.context.suspend().catch(() => {});
    else void this.context.resume().catch(() => {});
  }
  mute(value: boolean) {
    this.muted = value;
    if (this.master) this.master.gain.value = value ? 0 : 0.24;
  }
  private tone(
    from: number,
    to: number,
    seconds: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ) {
    const c = this.context;
    if (!c || !this.master || this.muted || c.state !== 'running') return;
    const t = c.currentTime + delay,
      o = c.createOscillator(),
      gain = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + seconds);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    o.connect(gain).connect(this.master);
    o.start(t);
    o.stop(t + seconds + 0.02);
    o.onended = () => {
      o.disconnect();
      gain.disconnect();
    };
  }
  private lastSkill = new Map<string, number>();
  skill(kind: string) {
    const c = this.context;
    if (!c) return;
    if (c.currentTime - (this.lastSkill.get(kind) ?? -99) < 0.055) return;
    this.lastSkill.set(kind, c.currentTime);
    if (kind === 'phone-beam') {
      this.tone(1550, 460, 0.16, 'sine', 0.18);
      this.tone(2300, 740, 0.12, 'triangle', 0.05);
    } else if (kind === 'torch-beam')
      this.tone(900, 160, 0.27, 'triangle', 0.18);
    else if (kind === 'laser') {
      this.tone(2300, 180, 0.38, 'sawtooth', 0.12);
      this.tone(120, 65, 0.25, 'sine', 0.24);
    } else if (kind === 'arc') {
      this.tone(2400, 110, 0.09, 'square', 0.09);
      this.tone(1700, 300, 0.13, 'sawtooth', 0.06, 0.07);
    } else if (kind === 'shot') this.tone(170, 45, 0.08, 'square', 0.2);
    else if (kind === 'blade') {
      this.tone(700, 90, 0.25, 'sawtooth', 0.1);
      this.tone(440, 200, 0.16, 'triangle', 0.08);
    }
  }
  upgrade() {
    this.tone(40, 160, 2.4, 'sine', 0.5);
    [130.81, 196, 261.63, 392, 523.25, 783.99].forEach((f, i) =>
      this.tone(f, f * 1.005, 1.8, 'triangle', 0.12, 0.4 + i * 0.55),
    );
    [261.63, 329.63, 392, 523.25].forEach((f) =>
      this.tone(f, f, 2.4, 'sine', 0.13, 3.8),
    );
  }
  growl() {
    const c = this.context;
    if (!c || !this.master || this.muted) return;
    const now = c.currentTime;
    const noise = c.createBuffer(1, c.sampleRate * 3, c.sampleRate),
      samples = noise.getChannelData(0);
    let seed = 9361;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = seed / 2147483648 - 1;
    }
    const source = c.createBufferSource();
    source.buffer = noise;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(430, now);
    filter.frequency.exponentialRampToValueAtTime(95, now + 2.5);
    filter.Q.value = 2.5;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.65, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.9);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + 3);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    for (let i = 0; i < 3; i++) {
      const oscillator = c.createOscillator(),
        volume = c.createGain();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(68 + i * 11, now);
      oscillator.frequency.exponentialRampToValueAtTime(31 + i * 8, now + 2.1);
      volume.gain.setValueAtTime(0, now);
      volume.gain.linearRampToValueAtTime(0.085, now + 0.24 + i * 0.15);
      volume.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
      oscillator.connect(volume).connect(this.master);
      oscillator.start();
      oscillator.stop(now + 2.5);
      oscillator.onended = () => {
        oscillator.disconnect();
        volume.disconnect();
      };
    }
  }
  thunder() {
    const c = this.context;
    if (!c || !this.master) return;
    const b = c.createBuffer(1, c.sampleRate * 4, c.sampleRate),
      a = b.getChannelData(0);
    let seed = 911;
    for (let i = 0; i < a.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const t = i / c.sampleRate;
      a[i] =
        (seed / 2147483648 - 1) *
        Math.exp(-t * 1.05) *
        (1 + 0.25 * Math.sin(t * 19));
    }
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = b;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(6500, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(150, c.currentTime + 3.5);
    gain.gain.value = 1.8;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  voice() {
    const c = this.context;
    if (!c || !this.master) return;
    for (let i = 0; i < 5; i++) {
      const o = c.createOscillator(),
        g = c.createGain(),
        t = c.currentTime + i * 0.14;
      o.type = 'triangle';
      o.frequency.value = [392, 523, 440, 659, 523][i];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.13);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    }
  }
  warmMusic() {
    const c = this.context;
    if (!c || !this.master || this.music) return;
    // Original looping music: mellow C–Am–F–G arpeggios, generated once.
    const seconds = 24,
      b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate),
      a = b.getChannelData(0);
    const chords = [
      [261.63, 329.63, 392],
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 293.66],
    ];
    for (let n = 0; n < 32; n++) {
      const at = n * 0.75,
        f = chords[Math.floor(n / 8)][n % 3];
      for (let j = 0; j < c.sampleRate * 2.8; j++) {
        const t = j / c.sampleRate,
          index = Math.floor(at * c.sampleRate) + j;
        if (index >= a.length) break;
        const env = Math.min(1, t / 0.025) * Math.exp(-t * 1.6);
        a[index] +=
          (Math.sin(t * f * Math.PI * 2) +
            0.22 * Math.sin(t * f * Math.PI * 4)) *
          env *
          0.095;
      }
    }
    const source = c.createBufferSource(),
      gain = c.createGain();
    source.buffer = b;
    source.loop = true;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.7, c.currentTime + 3.5);
    source.connect(gain).connect(this.master);
    source.start();
    this.music = source;
    this.musicGain = gain;
  }
  stopMusic() {
    if (!this.context || !this.music || !this.musicGain) return;
    const source = this.music,
      gain = this.musicGain,
      t = this.context.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.5);
    source.stop(t + 1.6);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    this.music = null;
    this.musicGain = null;
  }
  close() {
    this.music = null;
    this.musicGain = null;
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.master = null;
  }
}
