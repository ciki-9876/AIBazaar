export type RhythmSongId = 'home-lights' | 'rain-eaves';
export type RhythmSong = {
  id: RhythmSongId;
  name: string;
  bpm: number;
  beatTicks: number;
  beatsPerBar: 4;
  bars: number;
  color: string;
  ability: 'homecoming' | 'shelter';
  abilityName: string;
  text: string;
  audio: string;
};

// Tempos are authored on the 25ms rules grid, not inferred from audio playback.
export const RHYTHM_SONGS: readonly RhythmSong[] = [
  {
    id: 'home-lights',
    name: '归途的小灯',
    bpm: 120,
    beatTicks: 20,
    beatsPerBar: 4,
    bars: 32,
    color: '#f4cf7d',
    ability: 'homecoming',
    abilityName: '回甘合奏',
    text: '每小节第一拍，治疗物品额外治疗6；实际恢复生命后，使下一次攻击增加4直伤。增伤只保留一份。',
    audio: '/art-assets/wandeng/music/home-lights.wav',
  },
  {
    id: 'rain-eaves',
    name: '雨檐小调',
    bpm: 100,
    beatTicks: 24,
    beatsPerBar: 4,
    bars: 32,
    color: '#a8d1cf',
    ability: 'shelter',
    abilityName: '檐下守候',
    text: '每小节第一拍，物品发动时获得一次20%减伤；与物品减伤取较高值，不叠加。',
    audio: '/art-assets/wandeng/music/rain-eaves.wav',
  },
];
export const rhythmSong = (id: unknown) =>
  RHYTHM_SONGS.find((s) => s.id === id);
export const songLoopSeconds = (song: RhythmSong) =>
  (song.bars * song.beatsPerBar * 60) / song.bpm;
