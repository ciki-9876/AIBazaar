import { RHYTHM_PRESETS, rhythmDefinition } from './rhythm-catalog.ts';
import { rhythmSong, type RhythmSongId } from './rhythm-songs.ts';

export const RHYTHM_VERSION = 'rhythm-scan-v1' as const;
export const RHYTHM_SONG_VERSION = 'rhythm-song-v2' as const;
export const RHYTHM_TICK_MS = 25;
export const RHYTHM_SLOTS = 9;
export type RhythmSide = 0 | 1;
export type RhythmCard = { uid: string; id: string; at: number };
type RhythmBaseInput = {
  seed: number;
  maxTicks: number;
  sweepTicks: number;
  triggerTicks: number;
  health: number;
  player: RhythmCard[];
  enemy: RhythmCard[];
};
export type RhythmInput = RhythmBaseInput &
  (
    | { rulesVersion: typeof RHYTHM_VERSION; songs?: never }
    | {
        rulesVersion: typeof RHYTHM_SONG_VERSION;
        songs: [RhythmSongId, RhythmSongId];
      }
  );
export type RhythmAction = {
  tick: number;
  side: RhythmSide;
  uid: string;
  reason: 'entry' | 'cooldown';
  damage: number;
  burn: number;
  poison: number;
  heal: number;
  label: string;
  supports: string[];
  songAccent?: { damage: number; heal: number; guard: number };
};
export type RhythmFighter = {
  hp: number;
  burn: number;
  poison: number;
  guard: number;
  boost: { value: number; uses: number; source: string };
  energy: Record<string, number>;
  stages: Record<string, number>;
  seen: string[];
  loop: number;
  nextTrigger: number;
  lastAction: RhythmAction | null;
  songBoost?: number;
  feedback: {
    tick: number;
    damage: number;
    heal: number;
    burn: number;
    poison: number;
  } | null;
};
export type RhythmFrame = {
  tick: number;
  fighters: [RhythmFighter, RhythmFighter];
};
export type RhythmCardScore = {
  uid: string;
  side: RhythmSide;
  triggers: number;
  entries: number;
  damage: number;
  heal: number;
  support: number;
};
export type RhythmResult = {
  input: RhythmInput;
  frames: RhythmFrame[];
  actions: RhythmAction[];
  scores: RhythmCardScore[];
  winner: RhythmSide | 'draw';
  timedOut: boolean;
};

const int = (n: unknown, min: number, max: number) =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

export function validateRhythmInput(value: unknown): RhythmInput {
  if (
    !object(value) ||
    !keys(value, [
      'rulesVersion',
      'seed',
      'maxTicks',
      'sweepTicks',
      'triggerTicks',
      'health',
      'player',
      'enemy',
      ...(object(value) && value.rulesVersion === RHYTHM_SONG_VERSION
        ? ['songs']
        : []),
    ]) ||
    (value.rulesVersion !== RHYTHM_VERSION &&
      value.rulesVersion !== RHYTHM_SONG_VERSION)
  )
    throw new Error('不是受支持的共鸣对决规则版本。');
  if (
    !int(value.seed, 0, 0xffffffff) ||
    !int(value.maxTicks, 1, 4800) ||
    !int(value.sweepTicks, 36, 1440) ||
    !int(value.triggerTicks, 8, 240) ||
    !int(value.health, 1, 2000)
  )
    throw new Error('对决参数超出支持范围。');
  let songs: [RhythmSongId, RhythmSongId] | undefined;
  if (value.rulesVersion === RHYTHM_SONG_VERSION) {
    if (
      !Array.isArray(value.songs) ||
      value.songs.length !== 2 ||
      value.songs.some((id) => !rhythmSong(id))
    )
      throw new Error('双方都需要装备一首受支持的歌曲。');
    songs = [...value.songs] as [RhythmSongId, RhythmSongId];
    const playerSong = rhythmSong(songs[0])!;
    if (
      value.triggerTicks !== playerSong.beatTicks ||
      value.sweepTicks !== playerSong.beatTicks * 18
    )
      throw new Error('歌曲节拍与扫描参数不一致。');
  }
  const identities = new Set<string>();
  const formation = (raw: unknown): RhythmCard[] => {
    if (!Array.isArray(raw) || raw.length > 9)
      throw new Error('每方最多上阵九件物品。');
    const cells = new Set<number>(),
      copies = new Map<string, number>();
    return raw
      .map((item: unknown) => {
        if (
          !object(item) ||
          !keys(item, ['uid', 'id', 'at']) ||
          typeof item.id !== 'string' ||
          typeof item.uid !== 'string' ||
          !/^[a-zA-Z0-9:_-]{1,80}$/.test(item.uid) ||
          !int(item.at, 0, 8)
        )
          throw new Error('物品身份或摆放位置无效。');
        const def = rhythmDefinition(item.id);
        if (
          !def ||
          (item.at as number) + def.size > 9 ||
          identities.has(item.uid)
        )
          throw new Error('物品未知、身份重复或超出桌面。');
        identities.add(item.uid);
        copies.set(item.id, (copies.get(item.id) ?? 0) + 1);
        if (copies.get(item.id)! > 2) throw new Error('同名物品最多上阵两件。');
        for (
          let slot = item.at as number;
          slot < (item.at as number) + def.size;
          slot++
        ) {
          if (cells.has(slot))
            throw new Error('这里已经有物品，请先移开或交换顺序。');
          cells.add(slot);
        }
        return { uid: item.uid, id: item.id, at: item.at as number };
      })
      .sort((a, b) => a.at - b.at);
  };
  const base: RhythmBaseInput = {
    seed: value.seed as number,
    maxTicks: value.maxTicks as number,
    sweepTicks: value.sweepTicks as number,
    triggerTicks: value.triggerTicks as number,
    health: value.health as number,
    player: formation(value.player),
    enemy: formation(value.enemy),
  };
  return songs
    ? { rulesVersion: RHYTHM_SONG_VERSION, ...base, songs }
    : { rulesVersion: RHYTHM_VERSION, ...base };
}

export function rhythmTiming(input: RhythmInput, side: RhythmSide) {
  const song =
    input.rulesVersion === RHYTHM_SONG_VERSION
      ? rhythmSong(input.songs[side])!
      : undefined;
  return {
    song,
    triggerTicks: song?.beatTicks ?? input.triggerTicks,
    sweepTicks: song ? song.beatTicks * 18 : input.sweepTicks,
  };
}
export function equipRhythmSong(
  input: RhythmInput,
  side: RhythmSide,
  id: RhythmSongId,
): RhythmInput {
  const songs: [RhythmSongId, RhythmSongId] =
    input.rulesVersion === RHYTHM_SONG_VERSION
      ? [...input.songs]
      : ['home-lights', 'rain-eaves'];
  songs[side] = id;
  const first = rhythmSong(songs[0]);
  if (!first || !rhythmSong(id)) throw new Error('未知歌曲。');
  return validateRhythmInput({
    ...input,
    rulesVersion: RHYTHM_SONG_VERSION,
    songs,
    triggerTicks: first.beatTicks,
    sweepTicks: first.beatTicks * 18,
  });
}
export const defaultSongRhythmInput = () =>
  equipRhythmSong(defaultRhythmInput(), 0, 'home-lights');

export function rhythmPreset(index: number, side: RhythmSide): RhythmCard[] {
  const preset = RHYTHM_PRESETS[index];
  if (!preset) throw new Error('未知阵容。');
  let at = 0;
  return preset.ids.map((id, i) => {
    const card = { uid: `${side}:${id}:${i}`, id, at };
    at += rhythmDefinition(id)!.size;
    return card;
  });
}
export function defaultRhythmInput(): RhythmInput {
  return {
    rulesVersion: RHYTHM_VERSION,
    seed: 4303,
    maxTicks: 3600,
    sweepTicks: 360,
    triggerTicks: 40,
    health: 300,
    player: rhythmPreset(0, 0),
    enemy: rhythmPreset(1, 1),
  };
}
export function rhythmPosition(tick: number, sweepTicks: number) {
  return ((Math.max(0, tick) % sweepTicks) / sweepTicks) * RHYTHM_SLOTS;
}
export function rhythmCardAt(cards: RhythmCard[], slot: number) {
  return cards.find(
    (card) =>
      card.at <= slot && card.at + rhythmDefinition(card.id)!.size > slot,
  );
}

export function editRhythmCard(
  input: RhythmInput,
  side: RhythmSide,
  card: RhythmCard | null,
  removeUid?: string,
): RhythmInput {
  const field = side === 0 ? 'player' : 'enemy';
  const items = input[field].filter(
    (item) => item.uid !== removeUid && item.uid !== card?.uid,
  );
  if (card) items.push(card);
  return validateRhythmInput({ ...input, [field]: items });
}
export function shiftRhythmCard(
  input: RhythmInput,
  side: RhythmSide,
  uid: string,
  direction: -1 | 1,
): RhythmInput {
  const field = side === 0 ? 'player' : 'enemy',
    items = input[field].map((c) => ({ ...c }));
  const moving = items.find((c) => c.uid === uid);
  if (!moving) throw new Error('未找到这件物品。');
  const size = rhythmDefinition(moving.id)!.size;
  const neighbor = items.find((c) =>
    direction < 0
      ? c.at + rhythmDefinition(c.id)!.size === moving.at
      : c.at === moving.at + size,
  );
  if (neighbor) {
    if (direction < 0) {
      const start = neighbor.at;
      neighbor.at = start + size;
      moving.at = start;
    } else {
      neighbor.at = moving.at;
      moving.at += rhythmDefinition(neighbor.id)!.size;
    }
  } else moving.at += direction;
  return validateRhythmInput({ ...input, [field]: items });
}

export function initialRhythmFrame(input: RhythmInput): RhythmFrame {
  const fighter = (): RhythmFighter => ({
    hp: input.health,
    burn: 0,
    poison: 0,
    guard: 0,
    boost: { value: 0, uses: 0, source: '' },
    energy: {},
    stages: {},
    seen: [],
    loop: -1,
    nextTrigger: 0,
    lastAction: null,
    ...(input.rulesVersion === RHYTHM_SONG_VERSION ? { songBoost: 0 } : {}),
    feedback: null,
  });
  return { tick: -1, fighters: [fighter(), fighter()] };
}
export const cloneRhythmFighter = (f: RhythmFighter): RhythmFighter => ({
  ...f,
  boost: { ...f.boost },
  energy: { ...f.energy },
  stages: { ...f.stages },
  seen: [...f.seen],
});
export type RhythmIntent = {
  action: RhythmAction | null;
  heal: number;
  damage: number;
  burn: number;
  poison: number;
  drain: boolean;
  cleanseBurn: number;
  cleansePoison: number;
};

// Shared player scan/activation rules; the opponent can be a duelist or a monster.
export function rhythmIntent(
  self: RhythmFighter,
  deck: RhythmCard[],
  tick: number,
  timing: ReturnType<typeof rhythmTiming>,
  targetHp: number,
  targetHealth: number,
  side: RhythmSide,
  score: (uid: string) => RhythmCardScore,
): RhythmIntent {
  const loop = Math.floor(tick / timing.sweepTicks),
    slot = Math.floor(rhythmPosition(tick, timing.sweepTicks));
  if (self.loop !== loop) {
    self.loop = loop;
    self.seen = [];
  }
  const card = rhythmCardAt(deck, slot);
  const first = !!card && !self.seen.includes(card.uid),
    due = tick >= self.nextTrigger;
  const intent: RhythmIntent = {
    action: null,
    heal: 0,
    damage: 0,
    burn: 0,
    poison: 0,
    drain: false,
    cleanseBurn: 0,
    cleansePoison: 0,
  };
  if (!first && !due) return intent;
  self.nextTrigger = tick + timing.triggerTicks;
  if (!card) return intent;
  if (first) self.seen.push(card.uid);
  const def = rhythmDefinition(card.id)!,
    stats = def.stats;
  let label = '发动';
  intent.damage = stats.damage ?? 0;
  intent.heal = stats.heal ?? 0;
  intent.burn = stats.burn ?? 0;
  intent.poison = stats.poison ?? 0;
  const prepare = (value: number) => {
    self.boost = {
      value: Math.max(self.boost.value, value),
      uses: 2,
      source: self.boost.value > value ? self.boost.source : card.uid,
    };
  };
  if (def.kind === 'furnace') {
    const energy = self.energy[card.uid] ?? 0;
    prepare(4 + Math.floor(energy / 2));
    self.energy[card.uid] = 0;
    label = `暖意接力 +${self.boost.value}`;
  }
  if (def.kind === 'needle') intent.cleansePoison = 2;
  if (def.kind === 'music') intent.cleanseBurn = 3;
  if (def.kind === 'tea') intent.drain = true;
  if (def.kind === 'bell' || def.kind === 'umbrella')
    self.guard = Math.max(self.guard, stats.guard ?? 0);
  if (def.kind === 'projector') {
    const stage = self.stages[card.uid] ?? 0;
    self.stages[card.uid] = (stage + 1) % 3;
    intent.damage = stage === 2 ? 52 : 0;
    label = ['装片 · 1/3', '聚光 · 2/3', '星光投射'][stage];
  }
  const supports: string[] = [];
  const songAccent = timing.song ? { damage: 0, heal: 0, guard: 0 } : undefined;
  const downbeat = !!timing.song && tick % (timing.triggerTicks * 4) === 0;
  if (songAccent && downbeat) {
    if (
      timing.song!.ability === 'homecoming' &&
      (intent.heal > 0 || intent.drain)
    ) {
      intent.heal += 6;
      songAccent.heal = 6;
      label += ' · 回甘重拍';
    }
    if (timing.song!.ability === 'shelter') {
      self.guard = Math.max(self.guard, 20);
      songAccent.guard = 20;
      label += ' · 檐下重拍';
    }
  }
  if (intent.damage > 0) {
    if (self.songBoost && songAccent) {
      intent.damage += self.songBoost;
      songAccent.damage = self.songBoost;
      self.songBoost = 0;
      label += ' · 回甘应答';
    }
    if (self.boost.uses > 0) {
      intent.damage += self.boost.value;
      supports.push(self.boost.source);
      self.boost.uses--;
      if (self.boost.uses === 0) self.boost.value = 0;
    }
    for (const neighbor of deck) {
      if (
        neighbor.uid === card.uid ||
        rhythmDefinition(neighbor.id)!.kind !== 'match'
      )
        continue;
      if (
        neighbor.at + rhythmDefinition(neighbor.id)!.size === card.at ||
        card.at + def.size === neighbor.at
      ) {
        intent.burn++;
        supports.push(neighbor.uid);
      }
    }
  }
  // A mirror's own attack consumes the previously prepared boost first.
  if (def.kind === 'mirror')
    prepare(4 + Math.round((4 * targetHp) / targetHealth));
  intent.action = {
    tick,
    side: side as RhythmSide,
    uid: card.uid,
    reason: first ? 'entry' : 'cooldown',
    damage: intent.damage,
    burn: intent.burn,
    poison: intent.poison,
    heal: intent.heal,
    label,
    supports,
    ...(songAccent ? { songAccent } : {}),
  };
  score(card.uid).triggers++;
  if (first) score(card.uid).entries++;
  for (const uid of supports) score(uid).support++;
  return intent;
}

export function simulateRhythm(raw: RhythmInput): RhythmResult {
  const input = validateRhythmInput(raw),
    decks = [input.player, input.enemy];
  const frames: RhythmFrame[] = [initialRhythmFrame(input)],
    actions: RhythmAction[] = [];
  const scores = decks.flatMap((deck, side) =>
    deck.map(
      (card): RhythmCardScore => ({
        uid: card.uid,
        side: side as RhythmSide,
        triggers: 0,
        entries: 0,
        damage: 0,
        heal: 0,
        support: 0,
      }),
    ),
  );
  const score = (uid: string) => scores.find((s) => s.uid === uid)!;
  let winner: RhythmSide | 'draw' = 'draw',
    timedOut = true;
  for (let tick = 0; tick <= input.maxTicks; tick++) {
    const previous = frames[frames.length - 1].fighters;
    const next: [RhythmFighter, RhythmFighter] = [
      cloneRhythmFighter(previous[0]),
      cloneRhythmFighter(previous[1]),
    ];
    const beat = tick > 0 && tick % 40 === 0;
    const intents = next.map((self, side): RhythmIntent => {
      return rhythmIntent(
        self,
        decks[side],
        tick,
        rhythmTiming(input, side as RhythmSide),
        previous[1 - side].hp,
        input.health,
        side as RhythmSide,
        score,
      );
    });
    const incoming = next.map((self, side) => {
      const attack = intents[1 - side];
      const factor = 100 - self.guard;
      const damage = Math.round((attack.damage * factor) / 100);
      const burn = beat
        ? Math.round(
            (Math.max(0, previous[side].burn - intents[side].cleanseBurn) *
              factor) /
              100,
          )
        : 0;
      const poison = beat
        ? Math.round(
            (Math.max(0, previous[side].poison - intents[side].cleansePoison) *
              factor) /
              100,
          )
        : 0;
      if (damage + burn + poison > 0) self.guard = 0;
      return { damage, burn, poison, total: damage + burn + poison };
    });
    const requestedHeal = intents.map(
      (intent, side) =>
        intent.heal +
        (intent.drain
          ? Math.floor(
              Math.min(previous[1 - side].hp, incoming[1 - side].damage) / 2,
            )
          : 0),
    );
    for (const side of [0, 1] as const) {
      const self = next[side],
        intent = intents[side],
        hurt = incoming[side];
      self.hp = Math.max(
        0,
        Math.min(
          input.health,
          previous[side].hp - hurt.total + requestedHeal[side],
        ),
      );
      const actualHeal = Math.min(
        requestedHeal[side],
        Math.max(0, input.health - previous[side].hp + hurt.total),
      );
      const actualHurt = Math.min(hurt.total, previous[side].hp + actualHeal);
      if (actualHeal > 0 && intent.action?.songAccent?.heal) self.songBoost = 4;
      self.burn = Math.min(
        30,
        Math.max(0, previous[side].burn - intent.cleanseBurn - (beat ? 1 : 0)) +
          intents[1 - side].burn,
      );
      self.poison = Math.min(
        20,
        Math.max(
          0,
          previous[side].poison -
            intent.cleansePoison -
            (beat && tick % 120 === 0 ? 1 : 0),
        ) + intents[1 - side].poison,
      );
      if (hurt.total > 0 || actualHeal > 0)
        self.feedback = {
          tick,
          damage: actualHurt,
          heal: actualHeal,
          burn: hurt.burn,
          poison: hurt.poison,
        };
      if (actualHurt > 0)
        for (const card of decks[side])
          if (rhythmDefinition(card.id)!.kind === 'furnace')
            self.energy[card.uid] = Math.min(
              40,
              (self.energy[card.uid] ?? 0) + 4,
            );
      if (intent.action) {
        intent.action.heal = actualHeal;
        self.lastAction = intent.action;
        actions.push(intent.action);
        score(intent.action.uid).heal += actualHeal;
        score(intent.action.uid).damage += Math.min(
          previous[1 - side].hp,
          incoming[1 - side].damage,
        );
      }
    }
    frames.push({ tick, fighters: next });
    if (next[0].hp <= 0 || next[1].hp <= 0) {
      winner =
        next[0].hp <= 0 && next[1].hp <= 0 ? 'draw' : next[0].hp > 0 ? 0 : 1;
      timedOut = false;
      break;
    }
  }
  return { input, frames, actions, scores, winner, timedOut };
}

export function serializeRhythmReplay(input: RhythmInput): string {
  return JSON.stringify(
    {
      product:
        input.rulesVersion === RHYTHM_SONG_VERSION
          ? 'wandeng-resonance'
          : 'wandeng-cards',
      kind: 'rhythm-replay',
      schemaVersion: 1,
      input: validateRhythmInput(input),
    },
    null,
    2,
  );
}
export function parseRhythmReplay(text: string): RhythmInput {
  if (text.length > 256000) throw new Error('回放文件过大。');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('回放不是有效的JSON文件。');
  }
  if (
    !object(value) ||
    !keys(value, ['product', 'kind', 'schemaVersion', 'input']) ||
    (value.product !== 'wandeng-cards' &&
      value.product !== 'wandeng-resonance') ||
    value.kind !== 'rhythm-replay' ||
    value.schemaVersion !== 1
  )
    throw new Error('文件不是受支持的共鸣回放。');
  const input = validateRhythmInput(value.input);
  if (
    (value.product === 'wandeng-cards') !==
    (input.rulesVersion === RHYTHM_VERSION)
  )
    throw new Error('回放产品与规则版本不一致。');
  return input;
}
