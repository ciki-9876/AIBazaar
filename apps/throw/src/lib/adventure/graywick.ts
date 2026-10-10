import type { ItemId, RelicId } from '../cards/throw-loadout';
import type {
  AdventureState,
  BattleDefinition,
  CharacterId,
  Choice,
  Dialogue,
  MapDefinition,
  Objective,
} from './adventure-types';

/** Act one · Graywick. Content only; magician-world.ts runs it. */
export const GRAYWICK_MAPS = {
  street: {
    act: 1,
    name: '格雷维克',
    subtitle: '旧剧院街 · 黄昏',
    image: 'graywick-street',
    width: 1920,
    height: 1080,
    floor: 875,
    cameraY: 250,
    hotspots: [
      { id: 'workshop-door', x: 485, label: '里德的工作室', kind: 'door', target: 'workshop', spawn: 210 },
      { id: 'mia', x: 825, label: '米娅', kind: 'npc', character: 'mia' },
      { id: 'theatre-door', x: 1340, label: '抒情剧院', kind: 'door', target: 'theatre', spawn: 250 },
      { id: 'bus', x: 1785, label: '城际巴士', kind: 'bus' },
    ],
  },
  workshop: {
    act: 1,
    name: '里德的工作室',
    subtitle: '茶永远是热的，道具永远是坏的',
    image: 'reed-workshop',
    width: 1280,
    height: 720,
    floor: 604,
    cameraY: 0,
    hotspots: [
      { id: 'workshop-exit', x: 140, label: '返回街道', kind: 'door', target: 'street', spawn: 540 },
      { id: 'reed', x: 900, label: '文森特·里德', kind: 'npc', character: 'reed' },
    ],
  },
  theatre: {
    act: 1,
    name: '抒情剧院',
    subtitle: '聚光灯已就位，观众暂缺',
    image: 'lyric-theatre',
    width: 1440,
    height: 810,
    floor: 638,
    cameraY: 64,
    hotspots: [
      { id: 'theatre-exit', x: 150, label: '返回街道', kind: 'door', target: 'street', spawn: 1395 },
      { id: 'felix', x: 1030, label: '菲利克斯·克罗', kind: 'npc', character: 'felix' },
    ],
  },
} satisfies Record<string, MapDefinition>;

export const GRAYWICK_CAST = {
  eli: { name: '伊莱·维尔', role: '尚未登上节目单的魔术师' },
  reed: { name: '文森特·里德', role: '退休魔术师 · 道具修复 · 茶叶鉴赏' },
  mia: { name: '米娅·芬奇', role: '剧院机械师 · 什么都修得好' },
  felix: { name: '菲利克斯·克罗', role: '巡演魔术师（自称）' },
} satisfies Partial<Record<CharacterId, { name: string; role: string }>>;

const practiceChoices: readonly Choice[] = [
  { id: 'practice', label: '开始练习对决', action: { type: 'battle', battle: 'practice' } },
  { id: 'close', label: '我先四处看看', action: { type: 'close' } },
];
const duelChoices: readonly Choice[] = [
  { id: 'qualifier', label: '接受挑战', action: { type: 'battle', battle: 'qualifier' } },
  { id: 'close', label: '容我再想想', action: { type: 'close' } },
];
/**
 * Chapter one script. Tone: dry, polite, quietly ruthless. Anything a player
 * must learn is said plainly at least once; the jokes go around it.
 */
export const GRAYWICK_DIALOGUES: Record<string, Dialogue> = {
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
        text: '规矩很简单：每六秒发一轮牌，一轮两张；手满十张就不再来——跟我的茶杯一个道理。',
      },
      {
        speaker: 'reed',
        text: '先练单张：飞牌修缮箱加伤，穿幕细针穿盾。顺子、同花从三张起算；能凑出来时再甩一把。',
      },
      {
        speaker: 'reed',
        text: '想整理手牌，随时按点数或花色排；整理后要等二十秒才能再排。挑好时机——观众还在等你的下一手。',
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
        text: '再送你换调风铃和清露药包：单张轮换花色能加伤；出牌带上红心，药包就替你洗掉身上的火和毒。先把一张牌甩稳，再谈一整把。',
      },
      {
        speaker: 'reed',
        text: '去剧院之前，先找米娅聊聊。那姑娘修过菲利克斯的灯，知道他每一个坏习惯——灯的，和人的。',
      },
      { speaker: 'eli', text: '谢谢您。下次我要让您在全国转播里看到这一招。' },
      { speaker: 'reed', text: '那我得先买台电视。' },
    ],
    effect: { set: ['invitation'] },
  },
  'practice-loss': {
    lines: [
      {
        speaker: 'reed',
        text: '嗯。看来乌龟赢了。别难过——你输得非常有风度，这在格雷维克可是稀缺品质。',
      },
      {
        speaker: 'reed',
        text: '邀请函拿去，还有换调风铃和清露药包：轮换花色加伤，甩红心就能洗掉身上的火。单张的节奏练稳，大招才有地方落脚。',
      },
      {
        speaker: 'reed',
        text: '然后去找米娅。菲利克斯的弱点，她比菲利克斯本人还清楚。',
      },
    ],
    effect: { set: ['invitation'] },
  },
  'practice-draw': {
    lines: [
      {
        speaker: 'reed',
        text: '平局。最英国的结局：谁都没赢，谁都觉得自己赢了。',
      },
      {
        speaker: 'reed',
        text: '邀请函给你，再加换调风铃和清露药包——甩红心能灭身上的火。继续练单张连甩，然后去找米娅——她知道菲利克斯的路数。',
      },
    ],
    effect: { set: ['invitation'] },
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
      { speaker: 'felix', text: '……不可能。我的火从来没被一条旧毯子挡住过。' },
      { speaker: 'eli', text: '米娅修过的东西，很少听你的话。' },
      {
        speaker: 'felix',
        text: '参赛证是你的。下次报幕，我会把你的名字念对——念得非常不情愿。',
      },
      {
        speaker: 'narrator',
        text: '剧院门口贴出了第一张印着你名字的节目单。字很小，位置很偏，旁边就是“禁止吸烟”。但它在那儿。',
      },
      {
        speaker: 'narrator',
        text: '巡演箱开放新道具：双响茶壶、补丁旧伞、回暖小灯、抖擞披风、回声针盒、催信闹钟。护盾和治疗道具要凑满三件才全力发挥，不足三件效果减半。下一站，再试对子与花色构筑。',
      },
    ],
  },
  'rival-loss': {
    lines: [
      {
        speaker: 'felix',
        text: '别难过，输给我不丢人。很多人都输给过我，大多数还排了队。',
      },
      { speaker: 'eli', text: '我会回来的。下次把盾竖得更稳。' },
      {
        speaker: 'narrator',
        text: '小提示：火怕盾。身上有护盾时，新火只点着一半，火只烧盾不烧血，还灭得更快。把守灯小毯放进巡演箱，用单张黑桃竖盾，再轮换花色连甩。还没见过米娅的话，她就在街上。',
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
        text: '火怕盾——这条记牢。只要你身上有护盾：新点的火只着一半；烧起来只烧盾、不烧血，我们管这叫闷火；而且每秒多灭两层。',
      },
      {
        speaker: 'mia',
        text: '拿着守灯小毯和折光铜镜。每甩一张黑桃，小毯就给你竖一层护盾——眼下只有它一件，盾薄了点，等你凑齐三件护盾道具才算全力；盾挡下对手两张以上的出手时，铜镜还会反射一部分回去。开打前把它们装进巡演箱。',
      },
      { speaker: 'eli', text: '我该怎么谢你？' },
      {
        speaker: 'mia',
        text: '等你上了电视，告诉全世界你的第一盏追光是我打的。还有，毯子记得还我——开玩笑的。大概。',
      },
    ],
    effect: { set: ['miaMet'] },
  },
  'mia-reminder': {
    lines: [
      {
        speaker: 'mia',
        text: '记住三件事：火怕盾——有盾时火只烧盾、不烧血；盾在开打前就得摆进巡演箱；以及别盯着菲利克斯的帽子看，会被催眠。',
      },
    ],
  },
  'mia-after': {
    lines: [
      {
        speaker: 'mia',
        text: '听说菲利克斯的火被一条旧毯子闷灭了？我要把这句话裱起来，挂在后台。',
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
    effect: { set: ['departed'], complete: true },
  },
};

export const GRAYWICK_BATTLES = {
  practice: {
    act: 1,
    title: '里德的练习对决',
    opponent: 'reed',
    style: 'lesson',
    win: 'practice-win',
    loss: 'practice-loss',
    draw: 'practice-draw',
    afterFlags: ['trained'],
  },
  qualifier: {
    act: 1,
    title: '抒情剧院 · 资格挑战',
    opponent: 'felix',
    style: 'burn',
    win: 'rival-win',
    loss: 'rival-loss',
    draw: 'rival-draw',
    winFlags: ['ticket'],
    afterFlags: ['coachedQualifier'],
    tip: '米娅的建议：菲利克斯打火，火怕盾。有盾时新火减半、只烧盾不烧血。把守灯小毯和折光铜镜装好，用单张黑桃竖盾，再轮换花色连甩。',
  },
} satisfies Record<string, BattleDefinition>;

/** What the travelling trunk holds at each point of chapter one. */
export const STARTER_ITEMS = ['quick', 'needle'] as const satisfies readonly ItemId[];
export const MENTOR_GIFT = ['tempo', 'wash'] as const satisfies readonly ItemId[];
export const MIA_GIFT = ['ward'] as const satisfies readonly ItemId[];
export const POST_QUALIFIER_ITEMS = ['pair', 'umbrella', 'mend', 'stride', 'thorns', 'draw'] as const satisfies readonly ItemId[];
export function graywickKit(state: AdventureState): { items: ItemId[]; relics: RelicId[] } {
  return {
    items: [
      ...STARTER_ITEMS,
      ...(state.flags.trained ? MENTOR_GIFT : []),
      ...(state.flags.miaMet ? MIA_GIFT : []),
      ...(state.flags.ticket ? POST_QUALIFIER_ITEMS : []),
    ],
    relics: state.flags.miaMet ? ['bastion'] : [],
  };
}

export function graywickTalk(state: AdventureState, id: string): string | null {
  const f = state.flags;
  if (id === 'reed') return f.trained ? 'mentor-after' : 'mentor-first';
  if (id === 'mia')
    return f.ticket ? 'mia-after' : f.miaMet ? 'mia-reminder' : f.trained ? 'mia-first' : 'mia-early';
  if (id === 'felix') return !f.invitation ? 'rival-locked' : f.ticket ? 'rival-again' : 'rival-first';
  if (id === 'bus') return f.ticket ? 'departure' : 'bus-locked';
  return null;
}

export function graywickObjective(state: AdventureState): Objective {
  if (!state.flags.trained)
    return { title: '去里德的工作室', detail: '老魔术师说要教你点东西。他还说会备茶。', target: state.map === 'workshop' ? 'reed' : state.map === 'street' ? 'workshop-door' : 'theatre-exit' };
  if (!state.flags.miaMet)
    return { title: '找米娅聊聊', detail: '她修过菲利克斯的灯，知道他怕什么。', target: state.map === 'street' ? 'mia' : `${state.map}-exit` };
  if (!state.flags.ticket)
    return { title: '赢下第一张参赛证', detail: '抒情剧院，菲利克斯在等你。大概还在照镜子。', target: state.map === 'theatre' ? 'felix' : state.map === 'street' ? 'theatre-door' : 'workshop-exit' };
  return { title: '乘巴士，去更大的舞台', detail: '旧剧院街尽头的车站。司机应该回来了。', target: state.map === 'street' ? 'bus' : `${state.map}-exit` };
}
