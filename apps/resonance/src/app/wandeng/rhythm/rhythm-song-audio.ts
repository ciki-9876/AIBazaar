import {
  type RhythmSong,
  songLoopSeconds,
} from '../../../lib/cards/rhythm-songs.ts';
import { sitePath } from '../../../lib/site-path.ts';

// Audio time is only a presentation clock. It never enters the deterministic rules.
export class RhythmSongAudio {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private generation = 0;
  private anchor: { time: number; tick: number; speed: number } | null = null;
  private volume = 0.5;
  private createContext: () => AudioContext;
  constructor(createContext: () => AudioContext = () => new AudioContext()) {
    this.createContext = createContext;
  }

  async unlock() {
    if (!this.context) {
      this.context = this.createContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.context.destination);
    }
    if (this.context.state !== 'running') await this.context.resume();
  }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.gain && this.context)
      this.gain.gain.setTargetAtTime(
        this.volume,
        this.context.currentTime,
        0.015,
      );
  }
  currentTick() {
    if (!this.context || !this.anchor) return null;
    return (
      this.anchor.tick +
      Math.max(0, this.context.currentTime - this.anchor.time) *
        40 *
        this.anchor.speed
    );
  }
  async play(song: RhythmSong, tick: number, speed: number) {
    this.pause();
    const request = this.generation;
    await this.unlock();
    if (request !== this.generation) return false;
    let buffer = this.buffers.get(song.id);
    if (!buffer) {
      buffer = fetch(sitePath(song.audio))
        .then((response) => {
          if (!response.ok) throw new Error('乐曲未能加载，可以静音继续。');
          return response.arrayBuffer();
        })
        .then((data) => this.context!.decodeAudioData(data));
      this.buffers.set(song.id, buffer);
      buffer.catch(() => {
        if (this.buffers.get(song.id) === buffer) this.buffers.delete(song.id);
      });
    }
    const decoded = await buffer;
    if (request !== this.generation || !this.context || !this.gain)
      return false;
    const source = this.context.createBufferSource();
    source.buffer = decoded;
    source.loop = true;
    source.loopEnd = songLoopSeconds(song);
    source.playbackRate.value = speed;
    source.connect(this.gain);
    source.onended = () => source.disconnect();
    const time = this.context.currentTime + 0.04;
    this.anchor = { time, tick, speed };
    this.source = source;
    source.start(
      time,
      (((tick * 0.025) % songLoopSeconds(song)) + songLoopSeconds(song)) %
        songLoopSeconds(song),
    );
    return true;
  }
  pause() {
    this.generation++;
    this.source?.stop();
    this.source = null;
    this.anchor = null;
  }
  dispose() {
    this.pause();
    void this.context?.close();
    this.context = null;
    this.gain = null;
    this.buffers.clear();
  }
}
