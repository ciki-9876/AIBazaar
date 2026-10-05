import {
  heartDemon,
  HEALING_CHAPTERS,
  type HeartDemonKind,
} from './healing-catalog.ts';
import { rhythmDefinition } from './rhythm-catalog.ts';
import { rhythmSong, type RhythmSongId } from './rhythm-songs.ts';
import {
  cloneRhythmFighter,
  defaultSongRhythmInput,
  initialRhythmFrame,
  rhythmIntent,
  validateRhythmInput,
  RHYTHM_SONG_VERSION,
  type RhythmCard,
  type RhythmFighter,
  type RhythmAction,
  type RhythmCardScore,
} from './rhythm.ts';

export const HEALING_VERSION = 'rhythm-healing-v3' as const;
export type DemonUnit = {
  uid: string;
  id: HeartDemonKind;
  health: number;
  attack: number;
};
export type HealingInput = {
  rulesVersion: typeof HEALING_VERSION;
  seed: number;
  maxTicks: number;
  health: number;
  song: RhythmSongId;
  player: RhythmCard[];
  enemies: DemonUnit[];
  priority: string;
};
export type DemonAction = {
  tick: number;
  uid: string;
  skill: string;
  label: string;
  target: string;
  damage: number;
  burn: number;
  poison: number;
  heal: number;
  guard: number;
};
export type DemonState = {
  uid: string;
  hp: number;
  burn: number;
  poison: number;
  guard: number;
  next: Record<string, number>;
  lastAction: DemonAction | null;
  feedback: RhythmFighter['feedback'];
};
export type HealingAction = RhythmAction & { target: string };
export type HealingFrame = {
  tick: number;
  player: RhythmFighter;
  enemies: DemonState[];
  target: string | null;
};
export type HealingResult = {
  input: HealingInput;
  frames: HealingFrame[];
  actions: HealingAction[];
  enemyActions: DemonAction[];
  scores: RhythmCardScore[];
  winner: 'player' | 'enemies' | 'draw';
  timedOut: boolean;
};
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).every((k) => allowed.includes(k));
const int = (v: unknown, low: number, high: number) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= low && v <= high;

export function validateHealingInput(v: unknown): HealingInput {
  if (
    !object(v) ||
    !keys(v, [
      'rulesVersion',
      'seed',
      'maxTicks',
      'health',
      'song',
      'player',
      'enemies',
      'priority',
    ]) ||
    v.rulesVersion !== HEALING_VERSION
  )
    throw new Error('不是受支持的心魔战斗版本。');
  const song = rhythmSong(v.song);
  if (
    !song ||
    !int(v.seed, 0, 0xffffffff) ||
    !int(v.maxTicks, 1, 4800) ||
    !int(v.health, 1, 2000)
  )
    throw new Error('歌曲或战斗参数无效。');
  // Reuse the same card validation/identity/placement contract as song duels.
  const deck = validateRhythmInput({
    rulesVersion: RHYTHM_SONG_VERSION,
    seed: v.seed,
    maxTicks: v.maxTicks,
    health: v.health,
    player: v.player,
    enemy: [],
    songs: [v.song, v.song],
    triggerTicks: song.beatTicks,
    sweepTicks: song.beatTicks * 18,
  }).player;
  if (
    !Array.isArray(v.enemies) ||
    v.enemies.length < 1 ||
    v.enemies.length > 4 ||
    typeof v.priority !== 'string'
  )
    throw new Error('需要一至四只心魔与有效的优先目标。');
  const identities = new Set(deck.map((c) => c.uid));
  const enemies = v.enemies.map((e): DemonUnit => {
    if (
      !object(e) ||
      !keys(e, ['uid', 'id', 'health', 'attack']) ||
      typeof e.uid !== 'string' ||
      !/^[a-zA-Z0-9:_-]{1,80}$/.test(e.uid) ||
      typeof e.id !== 'string' ||
      !heartDemon(e.id) ||
      identities.has(e.uid) ||
      !int(e.health, 1, 3000) ||
      !int(e.attack, 0, 200)
    )
      throw new Error('心魔身份或属性无效。');
    identities.add(e.uid);
    return {
      uid: e.uid,
      id: e.id as HeartDemonKind,
      health: e.health as number,
      attack: e.attack as number,
    };
  });
  if (!enemies.some((e) => e.uid === v.priority))
    throw new Error('优先目标不在敌群中。');
  return {
    rulesVersion: HEALING_VERSION,
    seed: v.seed as number,
    maxTicks: v.maxTicks as number,
    health: v.health as number,
    song: song.id,
    player: deck,
    enemies,
    priority: v.priority,
  };
}
export function chapterHealingInput(index = 0): HealingInput {
  const chapter = HEALING_CHAPTERS[index];
  if (!chapter) throw new Error('未知旅途章节。');
  const old = defaultSongRhythmInput();
  const enemies = chapter.enemies.map((id, n) => {
    const d = heartDemon(id)!;
    return {
      uid: `${chapter.id}:${id}:${n}`,
      id,
      health: d.health,
      attack: d.attack,
    };
  });
  return validateHealingInput({
    rulesVersion: HEALING_VERSION,
    seed: 4303 + index,
    maxTicks: 3600,
    health: 300,
    song: 'home-lights',
    player: old.player,
    enemies,
    priority: enemies[0].uid,
  });
}
export function initialHealingFrame(input: HealingInput): HealingFrame {
  const base = defaultSongRhythmInput();
  return {
    tick: -1,
    player: initialRhythmFrame({ ...base, health: input.health }).fighters[0],
    enemies: input.enemies.map((unit) => ({
      uid: unit.uid,
      hp: unit.health,
      burn: 0,
      poison: 0,
      guard: 0,
      next: Object.fromEntries(
        heartDemon(unit.id)!.skills.map((s) => [s.id, s.first]),
      ),
      lastAction: null,
      feedback: null,
    })),
    target: input.priority,
  };
}
export function healingTarget(
  enemies: DemonState[],
  priority: string,
): DemonState | undefined {
  return (
    enemies.find((e) => e.uid === priority && e.hp > 0) ??
    enemies.find((e) => e.hp > 0)
  );
}
export function simulateHealing(raw: HealingInput): HealingResult {
  const input = validateHealingInput(raw),
    song = rhythmSong(input.song)!;
  const frames = [initialHealingFrame(input)],
    actions: HealingAction[] = [],
    enemyActions: DemonAction[] = [];
  const scores: RhythmCardScore[] = input.player.map((c) => ({
    uid: c.uid,
    side: 0,
    triggers: 0,
    entries: 0,
    damage: 0,
    heal: 0,
    support: 0,
  }));
  const score = (uid: string) => scores.find((s) => s.uid === uid)!;
  let winner: HealingResult['winner'] = 'draw',
    timedOut = true;
  for (let tick = 0; tick <= input.maxTicks; tick++) {
    const prev = frames[frames.length - 1],
      self = cloneRhythmFighter(prev.player);
    const enemies = prev.enemies.map((e) => ({ ...e, next: { ...e.next } }));
    const target = healingTarget(prev.enemies, input.priority)!;
    const targetIndex = prev.enemies.indexOf(target),
      targetUnit = input.enemies[targetIndex];
    const intent = rhythmIntent(
      self,
      input.player,
      tick,
      { song, triggerTicks: song.beatTicks, sweepTicks: song.beatTicks * 18 },
      target.hp,
      targetUnit.health,
      0,
      score,
    );
    const casts: DemonAction[] = [];
    const enemyHeals = enemies.map(() => 0);
    // Build every action from the same living snapshot; simultaneous lethals are possible.
    for (let i = 0; i < enemies.length; i++) {
      if (prev.enemies[i].hp <= 0) continue;
      const unit = input.enemies[i],
        d = heartDemon(unit.id)!;
      for (const skill of d.skills) {
        if (tick < enemies[i].next[skill.id]) continue;
        enemies[i].next[skill.id] = tick + skill.cooldown;
        let destination = 'player';
        if (skill.heal) {
          const living = prev.enemies
            .map((e, n) => ({ e, n }))
            .filter(({ e }) => e.hp > 0);
          living.sort(
            (a, b) =>
              a.e.hp * input.enemies[b.n].health -
                b.e.hp * input.enemies[a.n].health || a.n - b.n,
          );
          const ally = living[0];
          destination = ally.e.uid;
          enemyHeals[ally.n] += skill.heal;
        }
        if (skill.guard) {
          enemies[i].guard = Math.max(enemies[i].guard, skill.guard);
          destination = unit.uid;
        }
        const action: DemonAction = {
          tick,
          uid: unit.uid,
          skill: skill.id,
          label: skill.name,
          target: destination,
          damage: Math.round((unit.attack * (skill.power ?? 0)) / 100),
          burn: skill.burn ?? 0,
          poison: skill.poison ?? 0,
          heal: skill.heal ?? 0,
          guard: skill.guard ?? 0,
        };
        casts.push(action);
        enemies[i].lastAction = action;
      }
    }
    const beat = tick > 0 && tick % 40 === 0;
    const factor = (100 - self.guard) / 100;
    const direct = casts.reduce(
      (sum, c) => sum + Math.round(c.damage * factor),
      0,
    );
    const playerBurn = beat
      ? Math.round(Math.max(0, prev.player.burn - intent.cleanseBurn) * factor)
      : 0;
    const playerPoison = beat
      ? Math.round(
          Math.max(0, prev.player.poison - intent.cleansePoison) * factor,
        )
      : 0;
    const playerHurt = direct + playerBurn + playerPoison;
    if (playerHurt > 0) self.guard = 0;
    const hurts = enemies.map((e, n) => {
      if (prev.enemies[n].hp <= 0)
        return { direct: 0, burn: 0, poison: 0, total: 0 };
      const reduction = (100 - e.guard) / 100;
      const damage =
        n === targetIndex ? Math.round(intent.damage * reduction) : 0;
      const burn = beat ? Math.round(prev.enemies[n].burn * reduction) : 0;
      const poison = beat ? Math.round(prev.enemies[n].poison * reduction) : 0;
      if (damage + burn + poison > 0) e.guard = 0;
      return { direct: damage, burn, poison, total: damage + burn + poison };
    });
    const requestedHeal =
      intent.heal +
      (intent.drain
        ? Math.floor(Math.min(target.hp, hurts[targetIndex].direct) / 2)
        : 0);
    const actualHeal = Math.min(
      requestedHeal,
      input.health - prev.player.hp + playerHurt,
    );
    self.hp = Math.max(
      0,
      Math.min(input.health, prev.player.hp - playerHurt + requestedHeal),
    );
    const actualHurt = Math.min(playerHurt, prev.player.hp + actualHeal);
    if (actualHeal > 0 && intent.action?.songAccent?.heal) self.songBoost = 4;
    self.burn = Math.min(
      30,
      Math.max(0, prev.player.burn - intent.cleanseBurn - (beat ? 1 : 0)) +
        casts.reduce((sum, c) => sum + c.burn, 0),
    );
    self.poison = Math.min(
      20,
      Math.max(
        0,
        prev.player.poison -
          intent.cleansePoison -
          (beat && tick % 120 === 0 ? 1 : 0),
      ) + casts.reduce((sum, c) => sum + c.poison, 0),
    );
    if (actualHurt > 0 || actualHeal > 0)
      self.feedback = {
        tick,
        damage: actualHurt,
        heal: actualHeal,
        burn: playerBurn,
        poison: playerPoison,
      };
    if (actualHurt > 0)
      for (const c of input.player)
        if (rhythmDefinition(c.id)!.kind === 'furnace')
          self.energy[c.uid] = Math.min(40, (self.energy[c.uid] ?? 0) + 4);
    for (let n = 0; n < enemies.length; n++) {
      const e = enemies[n],
        before = prev.enemies[n],
        hurt = hurts[n];
      if (before.hp <= 0) continue;
      const heal = Math.min(
        enemyHeals[n],
        input.enemies[n].health - before.hp + hurt.total,
      );
      e.hp = Math.max(
        0,
        Math.min(
          input.enemies[n].health,
          before.hp - hurt.total + enemyHeals[n],
        ),
      );
      e.burn = Math.min(
        30,
        Math.max(0, before.burn - (beat ? 1 : 0)) +
          (n === targetIndex ? intent.burn : 0),
      );
      e.poison = Math.min(
        20,
        Math.max(0, before.poison - (beat && tick % 120 === 0 ? 1 : 0)) +
          (n === targetIndex ? intent.poison : 0),
      );
      if (hurt.total > 0 || heal > 0)
        e.feedback = {
          tick,
          damage: Math.min(hurt.total, before.hp + heal),
          heal,
          burn: hurt.burn,
          poison: hurt.poison,
        };
      if (e.hp === 0) {
        e.burn = 0;
        e.poison = 0;
        e.guard = 0;
      }
    }
    if (intent.action) {
      const action = { ...intent.action, heal: actualHeal, target: target.uid };
      self.lastAction = action;
      actions.push(action);
      score(action.uid).heal += actualHeal;
      score(action.uid).damage += Math.min(
        target.hp,
        hurts[targetIndex].direct,
      );
    }
    enemyActions.push(...casts);
    frames.push({
      tick,
      player: self,
      enemies,
      target: healingTarget(enemies, input.priority)?.uid ?? null,
    });
    const allGone = enemies.every((e) => e.hp <= 0);
    if (self.hp <= 0 || allGone) {
      winner =
        self.hp <= 0 && allGone ? 'draw' : allGone ? 'player' : 'enemies';
      timedOut = false;
      break;
    }
  }
  return { input, frames, actions, enemyActions, scores, winner, timedOut };
}
export function serializeHealingReplay(input: HealingInput): string {
  return JSON.stringify(
    {
      product: 'wandeng-resonance',
      kind: 'healing-replay',
      schemaVersion: 1,
      input: validateHealingInput(input),
    },
    null,
    2,
  );
}
export function parseHealingReplay(text: string): HealingInput {
  if (text.length > 256000) throw new Error('回放文件过大。');
  const v: unknown = JSON.parse(text);
  if (
    !object(v) ||
    !keys(v, ['product', 'kind', 'schemaVersion', 'input']) ||
    v.product !== 'wandeng-resonance' ||
    v.kind !== 'healing-replay' ||
    v.schemaVersion !== 1
  )
    throw new Error('文件不是心魔战斗回放；旧对决请使用历史试演入口。');
  return validateHealingInput(v.input);
}
