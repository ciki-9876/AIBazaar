import type { Style } from '../cards/throw-duel';

export const ADVENTURE_VERSION = 'magician-adventure-v1';
export const WALK_TICK_MS = 20;
const WALK_DISTANCE = 5;
export type MapId = 'street' | 'workshop' | 'theatre';
export type CharacterId = 'eli' | 'reed' | 'mia' | 'felix' | 'narrator';
export type BattleKind = 'practice' | 'qualifier';
export type ChoiceId = 'close' | 'practice' | 'qualifier';
export type DialogueId =
  | 'opening'
  | 'mentor-first'
  | 'mentor-after'
  | 'practice-win'
  | 'practice-loss'
  | 'practice-draw'
  | 'rival-locked'
  | 'rival-first'
  | 'rival-again'
  | 'rival-win'
  | 'rival-loss'
  | 'rival-draw'
  | 'mia-first'
  | 'mia-after'
  | 'bus-locked'
  | 'departure';
export type AdventureState = {
  version: typeof ADVENTURE_VERSION;
  seed: number;
  tick: number;
  map: MapId;
  player: { x: number; facing: -1 | 1; walkTicks: number };
  mode: 'explore' | 'dialogue' | 'battle' | 'complete';
  dialogue: { id: DialogueId; step: number } | null;
  battle: {
    id: number;
    kind: BattleKind;
    seed: number;
    enemyStyle: Style;
    returnMap: MapId;
    returnX: number;
  } | null;
  nextBattleId: number;
  flags: {
    trained: boolean;
    invitation: boolean;
    ticket: boolean;
    miaMet: boolean;
    departed: boolean;
  };
};
export type Hotspot = {
  id: string;
  x: number;
  label: string;
  kind: 'door' | 'npc' | 'bus';
  character?: CharacterId;
  target?: MapId;
  spawn?: number;
};
type MapDefinition = {
  name: string;
  subtitle: string;
  image: string;
  width: number;
  height: number;
  floor: number;
  cameraY: number;
  hotspots: readonly Hotspot[];
};
export const MAPS: Record<MapId, MapDefinition> = {
  street: {
    name: '格雷维克',
    subtitle: '旧剧院街 · 黄昏',
    image: 'graywick-street',
    width: 1920,
    height: 1080,
    floor: 875,
    cameraY: 250,
    hotspots: [
      {
        id: 'workshop-door',
        x: 485,
        label: '里德的工作室',
        kind: 'door',
        target: 'workshop',
        spawn: 210,
      },
      { id: 'mia', x: 825, label: '米娅', kind: 'npc', character: 'mia' },
      {
        id: 'theatre-door',
        x: 1340,
        label: '抒情剧院',
        kind: 'door',
        target: 'theatre',
        spawn: 250,
      },
      { id: 'bus', x: 1785, label: '城际巴士', kind: 'bus' },
    ],
  },
  workshop: {
    name: '里德的工作室',
    subtitle: '旧道具，也能变出新的戏法',
    image: 'reed-workshop',
    width: 1280,
    height: 720,
    floor: 604,
    cameraY: 0,
    hotspots: [
      {
        id: 'workshop-exit',
        x: 140,
        label: '返回街道',
        kind: 'door',
        target: 'street',
        spawn: 540,
      },
      {
        id: 'reed',
        x: 900,
        label: '文森特·里德',
        kind: 'npc',
        character: 'reed',
      },
    ],
  },
  theatre: {
    name: '抒情剧院',
    subtitle: '第一束属于你的聚光灯',
    image: 'lyric-theatre',
    width: 1440,
    height: 810,
    floor: 638,
    cameraY: 64,
    hotspots: [
      {
        id: 'theatre-exit',
        x: 150,
        label: '返回街道',
        kind: 'door',
        target: 'street',
        spawn: 1395,
      },
      {
        id: 'felix',
        x: 1030,
        label: '菲利克斯·克罗',
        kind: 'npc',
        character: 'felix',
      },
    ],
  },
};
export const CHARACTERS: Record<
  CharacterId,
  { name: string; role: string; frame: number | null }
> = {
  eli: { name: '伊莱·维尔', role: '尚未登场的魔术师', frame: null },
  reed: { name: '文森特·里德', role: '退休魔术师 · 道具修复师', frame: 0 },
  mia: { name: '米娅·芬奇', role: '剧院机械师', frame: 1 },
  felix: { name: '菲利克斯·克罗', role: '巡演魔术师', frame: 2 },
  narrator: {
    name: '格雷维克 · 黄昏',
    role: '第一幕 / 让他们记住你的名字',
    frame: null,
  },
};
export type DialogueLine = { speaker: CharacterId; text: string };
type Dialogue = {
  lines: readonly DialogueLine[];
  choices?: readonly { id: ChoiceId; label: string }[];
};
const practiceChoices = [
  { id: 'practice', label: '开始练习对决' },
  { id: 'close', label: '先去看看' },
] as const;
const duelChoices = [
  { id: 'qualifier', label: '接受挑战' },
  { id: 'close', label: '稍后再来' },
] as const;
export const DIALOGUES: Record<DialogueId, Dialogue> = {
  opening: {
    lines: [
      {
        speaker: 'narrator',
        text: '格雷维克，曾经的魔术之乡。如今，巡回赛的巴士只在这里停五分钟。你在这条街练了十一年，名字从未出现在节目单上。',
      },
      {
        speaker: 'felix',
        text: '你也要参加世界巡回赛？这个镇最后一项成功的魔术，大概就是把观众全变没了。',
      },
      {
        speaker: 'eli',
        text: '那就从让你记住我的名字开始。里德先生还在等我——今晚，我要拿到自己的第一张参赛证。',
      },
    ],
  },
  'mentor-first': {
    lines: [
      {
        speaker: 'reed',
        text: '外头那句话，我听见了。别替旧海报争辩。让你自己的名字挂上去。',
      },
      {
        speaker: 'reed',
        text: '在决斗里，每三秒凝成一张牌。单张能甩；连在一起的对子、顺子和同花，能把法术放大。你的出手，才是魔术发生的那一刻。',
      },
      {
        speaker: 'reed',
        text: '点牌只选一张；按住鼠标框起一段牌，空格甩出去。先在巡演箱里摆好道具，再和我练一场。',
      },
    ],
    choices: practiceChoices,
  },
  'mentor-after': {
    lines: [
      {
        speaker: 'reed',
        text: '手法你已经会了。现在要学的是：何时等下一张，何时让对手来不及等。还想练一场吗？',
      },
    ],
    choices: practiceChoices,
  },
  'practice-win': {
    lines: [
      {
        speaker: 'reed',
        text: '漂亮。你没有等一手完美的牌，而是找到了这一手牌最好的时刻。',
      },
      {
        speaker: 'reed',
        text: '给你。布里奇波特公开赛的邀请函。要坐上明天的巴士，先去抒情剧院，拿到本地资格。',
      },
      { speaker: 'eli', text: '下一次，我想让您在全国转播里看见这一招。' },
    ],
  },
  'practice-loss': {
    lines: [
      {
        speaker: 'reed',
        text: '这一场是我赢了。你已学会凝牌与出手，接下来，把道具和自己的节奏配起来。',
      },
      {
        speaker: 'reed',
        text: '布里奇波特公开赛的邀请函，拿着。抒情剧院还有一张本地资格。你可以先练，也可以去挑战。',
      },
    ],
  },
  'practice-draw': {
    lines: [
      {
        speaker: 'reed',
        text: '平局。基本手法已经过关；正式舞台上，还要学会把机会变成胜势。',
      },
      {
        speaker: 'reed',
        text: '这是公开赛的邀请函。去抒情剧院，赢下出发的资格吧。',
      },
    ],
  },
  'rival-locked': {
    lines: [
      {
        speaker: 'felix',
        text: '连第一场练习都没打完，就要上台？去里德的工作室。我等你学会出手。',
      },
    ],
  },
  'rival-first': {
    lines: [
      { speaker: 'felix', text: '还没放弃？很好，正好缺一位暖场的。' },
      { speaker: 'eli', text: '暖场就免了。我来赢参赛证。' },
      {
        speaker: 'felix',
        text: '我用的是灼烧构筑。你要是能赢，资格归你——连同你那张节目单。',
      },
    ],
    choices: duelChoices,
  },
  'rival-again': {
    lines: [
      {
        speaker: 'felix',
        text: '伊莱·维尔。我记住了。再来一场？这次只为分个高下。',
      },
    ],
    choices: duelChoices,
  },
  'rival-win': {
    lines: [
      { speaker: 'felix', text: '……你赢了。伊莱·维尔，对吧？参赛证是你的。' },
      { speaker: 'eli', text: '对。下次报幕，别念错了。' },
      {
        speaker: 'narrator',
        text: '第一张写着你名字的节目单，贴在了剧院门口。它很小，但从今天起，你不再是“格雷维克来的那个孩子”。',
      },
    ],
  },
  'rival-loss': {
    lines: [
      {
        speaker: 'felix',
        text: '这一场，资格还归我。等你想好怎么应付灼烧，再来。',
      },
      { speaker: 'eli', text: '我会回来。下一次，换你等我的出手。' },
    ],
  },
  'rival-draw': {
    lines: [
      {
        speaker: 'felix',
        text: '平局。资格还没分出归属，改好你的巡演箱再来。',
      },
    ],
  },
  'mia-first': {
    lines: [
      {
        speaker: 'mia',
        text: '我修过那家伙的聚光灯。他把箱子塞满火焰道具，每次甩牌都想把舞台点着。',
      },
      {
        speaker: 'mia',
        text: '别照搬他的路数。净化、护盾，或者比他更快地赢——旧道具摆得对，也能演出新花样。',
      },
    ],
  },
  'mia-after': {
    lines: [
      {
        speaker: 'mia',
        text: '我把明天的巴士时刻写在你的邀请函背面了。去吧。等你上电视，我就说，你的第一盏追光是我打的。',
      },
    ],
  },
  'bus-locked': {
    lines: [
      {
        speaker: 'narrator',
        text: '车票还夹在公开赛邀请函里。先完成里德的练习，再去抒情剧院赢下本地参赛资格。',
      },
    ],
  },
  departure: {
    lines: [
      { speaker: 'mia', text: '布里奇波特的舞台可不会等你。巡演箱扣好了？' },
      {
        speaker: 'eli',
        text: '扣好了。等我带世界冠军的奖杯回来，你帮我把这家剧院重新开起来。',
      },
      {
        speaker: 'narrator',
        text: '巴士离开旧剧院街。下一站，布里奇波特。世界还不知道你的名字——但第一位对手已经知道了。',
      },
    ],
  },
};

export function createAdventure(seed: number): AdventureState {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError('Adventure seed must be an unsigned 32-bit integer');
  return {
    version: ADVENTURE_VERSION,
    seed,
    tick: 0,
    map: 'street',
    player: { x: 220, facing: 1, walkTicks: 0 },
    mode: 'dialogue',
    dialogue: { id: 'opening', step: 0 },
    battle: null,
    nextBattleId: 1,
    flags: {
      trained: false,
      invitation: false,
      ticket: false,
      miaMet: false,
      departed: false,
    },
  };
}

export function walkAdventure(
  state: AdventureState,
  direction: -1 | 0 | 1,
  ticks: number,
): AdventureState {
  if (
    state.mode !== 'explore' ||
    ![-1, 0, 1].includes(direction) ||
    !Number.isInteger(ticks) ||
    ticks < 1 ||
    ticks > 5 ||
    direction === 0
  )
    return state;
  const x = Math.max(
    48,
    Math.min(
      MAPS[state.map].width - 48,
      state.player.x + direction * WALK_DISTANCE * ticks,
    ),
  );
  return {
    ...state,
    tick: state.tick + ticks,
    player: {
      x,
      facing: direction,
      walkTicks: state.player.walkTicks + (x !== state.player.x ? ticks : 0),
    },
  };
}

export function nearbyHotspot(state: AdventureState): Hotspot | null {
  if (state.mode !== 'explore') return null;
  return (
    [...MAPS[state.map].hotspots]
      .filter(
        (spot) =>
          Math.abs(spot.x - state.player.x) <= (spot.kind === 'npc' ? 130 : 95),
      )
      .sort(
        (a, b) =>
          Math.abs(a.x - state.player.x) - Math.abs(b.x - state.player.x) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )[0] ?? null
  );
}
function openDialogue(state: AdventureState, id: DialogueId): AdventureState {
  return { ...state, mode: 'dialogue', dialogue: { id, step: 0 } };
}
export function interactAdventure(
  state: AdventureState,
  id?: string,
): AdventureState {
  if (state.mode !== 'explore') return state;
  const spot = id
    ? MAPS[state.map].hotspots.find((entry) => entry.id === id)
    : nearbyHotspot(state);
  if (
    !spot ||
    Math.abs(spot.x - state.player.x) > (spot.kind === 'npc' ? 130 : 95)
  )
    return state;
  if (spot.target && spot.spawn !== undefined)
    return {
      ...state,
      map: spot.target,
      player: { ...state.player, x: spot.spawn, walkTicks: 0 },
    };
  if (spot.id === 'reed')
    return openDialogue(
      state,
      state.flags.trained ? 'mentor-after' : 'mentor-first',
    );
  if (spot.id === 'mia')
    return openDialogue(state, state.flags.ticket ? 'mia-after' : 'mia-first');
  if (spot.id === 'felix')
    return openDialogue(
      state,
      !state.flags.invitation
        ? 'rival-locked'
        : state.flags.ticket
          ? 'rival-again'
          : 'rival-first',
    );
  if (spot.id === 'bus')
    return openDialogue(state, state.flags.ticket ? 'departure' : 'bus-locked');
  return state;
}

export function advanceDialogue(state: AdventureState): AdventureState {
  if (state.mode !== 'dialogue' || !state.dialogue) return state;
  const { id, step } = state.dialogue;
  const script = DIALOGUES[id];
  if (step < script.lines.length - 1)
    return { ...state, dialogue: { id, step: step + 1 } };
  if (script.choices) return state;
  return closeDialogue(state);
}
function closeDialogue(state: AdventureState): AdventureState {
  const id = state.dialogue?.id;
  const receivedLetter =
    id === 'practice-win' || id === 'practice-loss' || id === 'practice-draw';
  return {
    ...state,
    mode: id === 'departure' ? 'complete' : 'explore',
    dialogue: null,
    flags: {
      ...state.flags,
      invitation: state.flags.invitation || receivedLetter,
      miaMet: state.flags.miaMet || id === 'mia-first',
      departed: state.flags.departed || id === 'departure',
    },
  };
}
export function chooseDialogue(
  state: AdventureState,
  choice: ChoiceId,
): AdventureState {
  if (state.mode !== 'dialogue' || !state.dialogue) return state;
  const script = DIALOGUES[state.dialogue.id];
  if (
    state.dialogue.step !== script.lines.length - 1 ||
    !script.choices?.some((entry) => entry.id === choice)
  )
    return state;
  if (choice === 'close') return closeDialogue(state);
  if (choice === 'qualifier' && !state.flags.invitation) return state;
  const id = state.nextBattleId;
  return {
    ...state,
    mode: 'battle',
    dialogue: null,
    nextBattleId: id + 1,
    battle: {
      id,
      kind: choice,
      seed: (state.seed + id * 7919) >>> 0,
      enemyStyle: choice === 'practice' ? 'quick' : 'burn',
      returnMap: state.map,
      returnX: state.player.x,
    },
  };
}

/** Only an acknowledged finished duel can grant progress. Abandoning is separate. */
export function finishAdventureBattle(
  state: AdventureState,
  battleId: number,
  winner: 0 | 1 | 'draw',
): AdventureState {
  if (
    state.mode !== 'battle' ||
    !state.battle ||
    state.battle.id !== battleId ||
    ![0, 1, 'draw'].includes(winner)
  )
    return state;
  const battle = state.battle;
  const trained = state.flags.trained || battle.kind === 'practice';
  const ticket =
    state.flags.ticket || (battle.kind === 'qualifier' && winner === 0);
  const id: DialogueId =
    battle.kind === 'practice'
      ? winner === 0
        ? 'practice-win'
        : winner === 1
          ? 'practice-loss'
          : 'practice-draw'
      : winner === 0
        ? 'rival-win'
        : winner === 1
          ? 'rival-loss'
          : 'rival-draw';
  return openDialogue(
    {
      ...state,
      map: battle.returnMap,
      player: { ...state.player, x: battle.returnX },
      battle: null,
      flags: { ...state.flags, trained, ticket },
    },
    id,
  );
}
export function abandonAdventureBattle(state: AdventureState): AdventureState {
  if (state.mode !== 'battle' || !state.battle) return state;
  return {
    ...state,
    mode: 'explore',
    map: state.battle.returnMap,
    player: { ...state.player, x: state.battle.returnX },
    battle: null,
  };
}
export function keepExploring(state: AdventureState): AdventureState {
  return state.mode === 'complete' ? { ...state, mode: 'explore' } : state;
}
export function adventureObjective(state: AdventureState): {
  title: string;
  detail: string;
  target: string;
} {
  if (!state.flags.trained)
    return {
      title: '去里德的工作室',
      detail: '向文森特学习凝牌对决',
      target: 'workshop-door',
    };
  if (!state.flags.ticket)
    return {
      title: '赢下第一张参赛证',
      detail: '在抒情剧院挑战菲利克斯',
      target: 'theatre-door',
    };
  return {
    title: '乘巴士，去更大的舞台',
    detail: '从旧剧院街启程',
    target: 'bus',
  };
}
