import type { ItemId, RelicId, Style } from '../cards/throw-loadout';

export const ADVENTURE_VERSION = 'magician-adventure-v2';
export const WALK_TICK_MS = 20;
const WALK_DISTANCE = 5;
export type MapId = 'street' | 'workshop' | 'theatre';
export type CharacterId = 'eli' | 'reed' | 'mia' | 'felix' | 'narrator';
export type BattleKind = 'practice' | 'qualifier';
/** Guided duel scripts; presentation-only coaching layered over real rules. */
export type CoachScript = 'lesson' | 'qualifier';
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
  | 'mia-early'
  | 'mia-first'
  | 'mia-reminder'
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
    coach: CoachScript | null;
    returnMap: MapId;
    returnX: number;
  } | null;
  nextBattleId: number;
  flags: {
    trained: boolean;
    invitation: boolean;
    ticket: boolean;
    miaMet: boolean;
    coachedQualifier: boolean;
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
    subtitle: '茶永远是热的，道具永远是坏的',
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
    subtitle: '聚光灯已就位，观众暂缺',
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
  eli: { name: '伊莱·维尔', role: '尚未登上节目单的魔术师', frame: null },
  reed: { name: '文森特·里德', role: '退休魔术师 · 道具修复 · 茶叶鉴赏', frame: 0 },
  mia: { name: '米娅·芬奇', role: '剧院机械师 · 什么都修得好', frame: 1 },
  felix: { name: '菲利克斯·克罗', role: '巡演魔术师（自称）', frame: 2 },
  narrator: {
    name: '格雷维克 · 黄昏',
    role: '第一幕 · 让他们记住你的名字',
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
  { id: 'close', label: '我先四处看看' },
] as const;
const duelChoices = [
  { id: 'qualifier', label: '接受挑战' },
  { id: 'close', label: '容我再想想' },
] as const;
/**
 * Chapter one script. Tone: dry, polite, quietly ruthless. Anything a player
 * must learn is said plainly at least once; the jokes go around it.
 */
export const DIALOGUES: Record<DialogueId, Dialogue> = {
  opening: {
    lines: [
      {
        speaker: 'narrator',
        text: '格雷维克，曾经的魔术之乡。如今镇上最神奇的事，是巡回赛巴士居然还肯在这儿停五分钟——司机说，主要是为了上厕所。',
      },
      {
        speaker: 'narrator',
        text: '你在这条街上练了十一年牌。节目单上从没印过你的名字。印过最多的一行字是“因雨取消”。',
      },
      {
        speaker: 'felix',
        text: '哎呀，这不是小伊莱吗？听说你也想参加巡回赛。真勇敢。我是认真的——非常、非常勇敢。',
      },
      {
        speaker: 'eli',
        text: '谢谢，菲利克斯。你也很勇敢——戴着那顶帽子出门。',
      },
      {
        speaker: 'eli',
        text: '（小声）里德先生在等我。今晚，我要拿到第一张参赛证。',
      },
    ],
  },
  'mentor-first': {
    lines: [
      {
        speaker: 'reed',
        text: '啊，伊莱。外面那位戴烟囱的先生又在演讲了？别理他。他的嘴比手快，这在魔术里叫“缺点”。',
      },
      {
        speaker: 'reed',
        text: '规矩很简单：每三秒，你手里会多一张牌；手满十张就不再来——跟我的茶杯一个道理。',
      },
      {
        speaker: 'reed',
        text: '单张能甩；凑成对子、顺子、同花，甩得更狠。真正的手艺是挑时机。犹豫太久，观众会去买爆米花。',
      },
      {
        speaker: 'reed',
        text: '来，跟我过两招。我老了，出手慢——你就当在跟一只特别有礼貌的乌龟比赛。',
      },
    ],
    choices: practiceChoices,
  },
  'mentor-after': {
    lines: [
      {
        speaker: 'reed',
        text: '又来了？很好。年轻人肯主动挨揍，是这一行还有救的唯一证据。再练一场？这回我不让着你。',
      },
    ],
    choices: practiceChoices,
  },
  'practice-win': {
    lines: [
      { speaker: 'reed', text: '……你赢了。说实话，这让我的茶都凉了。' },
      {
        speaker: 'reed',
        text: '拿着：布里奇波特公开赛的邀请函。它在我抽屉里躺了二十年，就等一个值得的人——以及抽屉终于修好。',
      },
      {
        speaker: 'reed',
        text: '再送你两件旧物：回暖小灯，出红心能回血；清露药包，出红心顺手洗掉身上的火和毒。别问药包为什么认得红心，魔术就是这样。',
      },
      {
        speaker: 'reed',
        text: '去剧院之前，先找米娅聊聊。那姑娘修过菲利克斯的灯，知道他每一个坏习惯——灯的，和人的。',
      },
      { speaker: 'eli', text: '谢谢您。下次我要让您在全国转播里看到这一招。' },
      { speaker: 'reed', text: '那我得先买台电视。' },
    ],
  },
  'practice-loss': {
    lines: [
      {
        speaker: 'reed',
        text: '嗯。看来乌龟赢了。别难过——你输得非常有风度，这在格雷维克可是稀缺品质。',
      },
      {
        speaker: 'reed',
        text: '凝牌和出手你已经会了，剩下的是节奏。邀请函拿去，还有回暖小灯和清露药包：一个回血，一个解火解毒。',
      },
      {
        speaker: 'reed',
        text: '然后去找米娅。菲利克斯的弱点，她比菲利克斯本人还清楚。',
      },
    ],
  },
  'practice-draw': {
    lines: [
      {
        speaker: 'reed',
        text: '平局。最英国的结局：谁都没赢，谁都觉得自己赢了。',
      },
      {
        speaker: 'reed',
        text: '邀请函给你，再加回暖小灯和清露药包。然后去找米娅——她知道菲利克斯的路数。',
      },
    ],
  },
  'rival-locked': {
    lines: [
      {
        speaker: 'felix',
        text: '没有邀请函就想上台？亲爱的，这是资格赛，不是社区才艺表演。去找你的老师傅吧，听说他还在用上个世纪的牌。',
      },
    ],
  },
  'rival-first': {
    lines: [
      { speaker: 'felix', text: '哦，你真的来了。我还以为你会被自己的勇气吓跑。' },
      {
        speaker: 'eli',
        text: '我来拿参赛证。顺便教你输的时候怎么鞠躬。',
      },
      {
        speaker: 'felix',
        text: '可爱。善意提醒：我的牌会着火，保险公司为此拒绝过我四次。赢了，参赛证就归你。',
      },
    ],
    choices: duelChoices,
  },
  'rival-again': {
    lines: [
      {
        speaker: 'felix',
        text: '又是你。伊莱……维尔，对吧？我已经开始记得你的名字了，这让我很不舒服。再来一场？',
      },
    ],
    choices: duelChoices,
  },
  'rival-win': {
    lines: [
      { speaker: 'felix', text: '……不可能。我的火从来没被一把破伞挡住过。' },
      { speaker: 'eli', text: '那把伞补过十七次。它很有经验。' },
      {
        speaker: 'felix',
        text: '参赛证是你的。下次报幕，我会把你的名字念对——念得非常不情愿。',
      },
      {
        speaker: 'narrator',
        text: '剧院门口贴出了第一张印着你名字的节目单。字很小，位置很偏，旁边就是“禁止吸烟”。但它在那儿。',
      },
    ],
  },
  'rival-loss': {
    lines: [
      {
        speaker: 'felix',
        text: '别难过，输给我不丢人。很多人都输给过我，大多数还排了队。',
      },
      { speaker: 'eli', text: '我会回来的。下次带更多的伞。' },
      {
        speaker: 'narrator',
        text: '小提示：灼烧怕护盾。把补丁旧伞和守灯小毯放进巡演箱，多出对子和黑桃。还没见过米娅的话，她就在街上。',
      },
    ],
  },
  'rival-draw': {
    lines: [
      {
        speaker: 'felix',
        text: '平局？我从不平局。今天就算我让着你。下次可没这么客气。',
      },
    ],
  },
  'mia-early': {
    lines: [
      {
        speaker: 'mia',
        text: '你要去挑战菲利克斯？先去里德那儿学会出牌吧。我修东西很在行，但修不了“上台三秒就被烧成炭”。',
      },
    ],
  },
  'mia-first': {
    lines: [
      {
        speaker: 'mia',
        text: '你就是要挑战菲利克斯的那位？勇气可嘉。我上次见这么勇的，是只想跟公交车比谁快的鸽子。',
      },
      {
        speaker: 'mia',
        text: '说正事。我修过他的聚光灯，他的巡演箱里全是火：出方块就点火；着火的人治疗打六折，每次出手还烫手。',
      },
      {
        speaker: 'mia',
        text: '火怕什么？怕盾。只要护盾还在，火落在盾上只剩一半，烧也只烧盾不烧人，还灭得更快。',
      },
      {
        speaker: 'mia',
        text: '拿着：补丁旧伞、守灯小毯、回声针盒。出对子、出黑桃都能竖盾。记得在开打前把它们摆进巡演箱。',
      },
      { speaker: 'eli', text: '我该怎么谢你？' },
      {
        speaker: 'mia',
        text: '等你上了电视，告诉全世界你的第一盏追光是我打的。还有，伞记得还我——开玩笑的。大概。',
      },
    ],
  },
  'mia-reminder': {
    lines: [
      {
        speaker: 'mia',
        text: '记住三件事：火怕盾；盾在开打前就得摆进巡演箱；以及别盯着菲利克斯的帽子看，会被催眠。',
      },
    ],
  },
  'mia-after': {
    lines: [
      {
        speaker: 'mia',
        text: '听说菲利克斯的火被一把旧伞闷灭了？我要把这句话裱起来，挂在后台。',
      },
      {
        speaker: 'mia',
        text: '巴士时刻我写在你邀请函背面了。快去吧，司机说上厕所只要五分钟，我们都知道那是谎言。',
      },
    ],
  },
  'bus-locked': {
    lines: [
      {
        speaker: 'narrator',
        text: '司机看了看你，又看了看你空空的参赛证夹：“小伙子，这车只载选手。还有我。”',
      },
    ],
  },
  departure: {
    lines: [
      {
        speaker: 'mia',
        text: '巡演箱扣好了？牙刷带了？伞——好吧，伞你留着，就当是投资。',
      },
      {
        speaker: 'eli',
        text: '等我捧着世界冠军的奖杯回来，你帮我把抒情剧院重新开起来。',
      },
      { speaker: 'mia', text: '成交。不过先说好，得先修屋顶。' },
      {
        speaker: 'narrator',
        text: '巴士驶离旧剧院街。下一站，布里奇波特。世界还不知道你的名字——不过至少，司机现在知道了。',
      },
    ],
  },
};

/** What the travelling trunk holds at each point of chapter one. */
export const STARTER_ITEMS = ['pair', 'quick', 'draw'] as const satisfies readonly ItemId[];
export const MENTOR_GIFT = ['mend', 'wash'] as const satisfies readonly ItemId[];
export const MIA_GIFT = ['umbrella', 'ward', 'thorns'] as const satisfies readonly ItemId[];
export function unlockedKit(state: AdventureState): {
  items: ItemId[];
  relics: RelicId[];
} {
  return {
    items: [
      ...STARTER_ITEMS,
      ...(state.flags.trained ? MENTOR_GIFT : []),
      ...(state.flags.miaMet ? MIA_GIFT : []),
    ],
    relics: ['order', ...(state.flags.miaMet ? (['bastion'] as const) : [])],
  };
}

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
      coachedQualifier: false,
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
    return openDialogue(
      state,
      state.flags.ticket
        ? 'mia-after'
        : state.flags.miaMet
          ? 'mia-reminder'
          : state.flags.trained
            ? 'mia-first'
            : 'mia-early',
    );
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
      enemyStyle:
        choice === 'practice' ? (state.flags.trained ? 'quick' : 'lesson') : 'burn',
      coach:
        choice === 'practice'
          ? state.flags.trained
            ? null
            : 'lesson'
          : state.flags.ticket || state.flags.coachedQualifier
            ? null
            : 'qualifier',
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
  const coachedQualifier = state.flags.coachedQualifier || battle.kind === 'qualifier';
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
      flags: { ...state.flags, trained, ticket, coachedQualifier },
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
      detail: '老魔术师说要教你点东西。他还说会备茶。',
      target: 'workshop-door',
    };
  if (!state.flags.miaMet)
    return {
      title: '找米娅聊聊',
      detail: '她修过菲利克斯的灯，知道他怕什么。',
      target: 'mia',
    };
  if (!state.flags.ticket)
    return {
      title: '赢下第一张参赛证',
      detail: '抒情剧院，菲利克斯在等你。大概还在照镜子。',
      target: 'theatre-door',
    };
  return {
    title: '乘巴士，去更大的舞台',
    detail: '旧剧院街尽头的车站。司机应该回来了。',
    target: 'bus',
  };
}
