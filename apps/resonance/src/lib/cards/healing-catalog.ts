export type HeartDemonKind =
  | 'whisper'
  | 'thorn'
  | 'burden'
  | 'echo'
  | 'clock'
  | 'night';
export type DemonSkill = {
  id: string;
  name: string;
  text: string;
  cooldown: number;
  first: number;
  power?: number;
  burn?: number;
  poison?: number;
  heal?: number;
  guard?: number;
};
export type HeartDemon = {
  id: HeartDemonKind;
  name: string;
  subtitle: string;
  health: number;
  attack: number;
  color: string;
  skills: DemonSkill[];
};

// All timings are simulation ticks (40 ticks per second), independent of songs.
export const HEART_DEMONS: HeartDemon[] = [
  {
    id: 'whisper',
    name: '怯声团',
    subtitle: '把每一句话吞回肚子里',
    health: 120,
    attack: 12,
    color: '#9eabc6',
    skills: [
      {
        id: 'murmur',
        name: '窃窃私语',
        text: '对治愈师造成攻击力等量直伤。',
        first: 100,
        cooldown: 120,
        power: 100,
      },
    ],
  },
  {
    id: 'thorn',
    name: '苛责刺',
    subtitle: '「还不够好」长出了尖刺',
    health: 145,
    attack: 14,
    color: '#9aa583',
    skills: [
      {
        id: 'prick',
        name: '扎心的话',
        text: '造成攻击力等量直伤。',
        first: 120,
        cooldown: 140,
        power: 100,
      },
      {
        id: 'doubt',
        name: '反复怀疑',
        text: '施加3层毒；每秒承伤，3秒衰减1层。',
        first: 220,
        cooldown: 280,
        poison: 3,
      },
    ],
  },
  {
    id: 'burden',
    name: '负重壳',
    subtitle: '背着所有人的期待',
    health: 240,
    attack: 24,
    color: '#b9a184',
    skills: [
      {
        id: 'weight',
        name: '沉重落步',
        text: '造成攻击力125%的直伤。',
        first: 160,
        cooldown: 180,
        power: 125,
      },
      {
        id: 'shell',
        name: '硬撑',
        text: '下一次承伤结算减免35%；不叠加。',
        first: 80,
        cooldown: 320,
        guard: 35,
      },
    ],
  },
  {
    id: 'echo',
    name: '旧日回声',
    subtitle: '让过去一遍遍重来',
    health: 130,
    attack: 10,
    color: '#c19ba6',
    skills: [
      {
        id: 'echo-hit',
        name: '回响',
        text: '造成攻击力等量直伤。',
        first: 140,
        cooldown: 160,
        power: 100,
      },
      {
        id: 'cling',
        name: '留在昨天',
        text: '为生命比例最低的存活心魔恢复18生命。',
        first: 200,
        cooldown: 240,
        heal: 18,
      },
    ],
  },
  {
    id: 'clock',
    name: '催促钟',
    subtitle: '一秒也不允许自己停下',
    health: 170,
    attack: 13,
    color: '#d4b66f',
    skills: [
      {
        id: 'hurry',
        name: '快一点',
        text: '造成攻击力等量直伤。',
        first: 60,
        cooldown: 80,
        power: 100,
      },
      {
        id: 'overheat',
        name: '停不下来的焦灼',
        text: '施加4层灼烧；每秒承伤并衰减1层。',
        first: 180,
        cooldown: 240,
        burn: 4,
      },
    ],
  },
  {
    id: 'night',
    name: '无声长夜',
    subtitle: '「没有人需要听见你」',
    health: 330,
    attack: 28,
    color: '#8e91b0',
    skills: [
      {
        id: 'silence',
        name: '沉默的浪',
        text: '造成攻击力等量直伤。',
        first: 140,
        cooldown: 160,
        power: 100,
      },
      {
        id: 'undertow',
        name: '夜潮',
        text: '造成攻击力150%的直伤，附加3层灼烧。',
        first: 300,
        cooldown: 360,
        power: 150,
        burn: 3,
      },
    ],
  },
];
export const heartDemon = (id: string) =>
  HEART_DEMONS.find((demon) => demon.id === id);

export type HealingScene = { speaker: string; text: string };
export type HealingChapter = {
  id: string;
  place: string;
  title: string;
  person: string;
  promise: string;
  before: HealingScene[];
  after: HealingScene[];
  enemies: HeartDemonKind[];
};
export const HEALING_OPENING: HealingScene[] = [
  {
    speaker: '序 · 听见微小的声音',
    text: '小时候的阿弦，总把想说的话留在心里。母亲离开后，窗边那只音乐盒也停了。他以为自己再也唱不出完整的一首歌。',
  },
  {
    speaker: '许师傅',
    text: '那天，我没有修好你的悲伤。我只是坐下来，陪你听了半首曲子。后半首，是你自己慢慢哼出来的。',
  },
  {
    speaker: '阿弦',
    text: '后来，我成了您的学徒。茶壶、灯、旧伞……每件随行的器具都记着一段声音。我想把这些声音带给还困在心景里的人。',
  },
  {
    speaker: '许师傅 · 心景练习',
    text: '心魔是被困住的情绪长出的影子。它们各有脾气，会自己出招。你不用跟着它们慌张：把器具排好，让歌带着共鸣线走。每圈第一次扫到的器具一定会响。',
  },
];
export const HEALING_DEPARTURE: HealingScene[] = [
  {
    speaker: '来自沿途的信',
    text: '「万灯城的听风会快到了，可沿路有几个人已经很久没有出门。若你愿意，请来听听他们没能说完的话。——驿站员，小禾」',
  },
  {
    speaker: '阿弦',
    text: '我把音乐盒放进背包。师傅给我添满茶，又把一张空白乐谱塞进侧袋。「别急着替别人写结尾。」我点点头，推开了门。',
  },
];
export const HEALING_CHAPTERS: HealingChapter[] = [
  {
    id: 'first-note',
    place: '许师傅的后院',
    title: '第一声，不必完美',
    person: '许师傅',
    promise: '先跟着一首歌，听懂一次心魔的行动。',
    enemies: ['whisper'],
    before: [
      {
        speaker: '许师傅',
        text: '这是练习用的怯声团。它每三秒说一次泄气的话。看它的行动条，再看你自己的生命。选好歌，我们就开始。',
      },
    ],
    after: [
      {
        speaker: '阿弦',
        text: '原来，我不必每一下都做得完美。只要让这一首继续。',
      },
      {
        speaker: '许师傅',
        text: '记住这个感觉。到了旅途中，先听人说话，再进入他的心景。',
      },
    ],
  },
  {
    id: 'rain-stop',
    place: '雨停驿站',
    title: '没唱完的小合唱',
    person: '小禾与学童芽芽',
    promise: '陪芽芽把第一句唱给一个愿意听的人。',
    enemies: ['whisper', 'thorn'],
    before: [
      {
        speaker: '芽芽',
        text: '上次唱跑调了，大家笑了。我不想再上台……可我还想和朋友一起唱。',
      },
      {
        speaker: '阿弦',
        text: '今天先不去舞台。你愿意在这里，只唱给小禾听吗？我替你把那些吵闹的声音安静下来。',
      },
    ],
    after: [
      { speaker: '芽芽', text: '我还是有一点怕。你们明天还会听吗？' },
      { speaker: '小禾', text: '会。今天只唱一句，明天也可以只唱一句。' },
      { speaker: '阿弦', text: '她唱得很小声。驿站门外，雨恰好停了。' },
    ],
  },
  {
    id: 'mill',
    place: '纸风磨坊',
    title: '把肩上的风放下来',
    person: '修理工牧舟',
    promise: '让一直替别人撑伞的人，也能休息一晚。',
    enemies: ['burden', 'clock'],
    before: [
      {
        speaker: '牧舟',
        text: '屋顶没修完，妹妹的药还没送，磨坊也不能停……我不累，只是最近总听见钟响。',
      },
      {
        speaker: '阿弦',
        text: '你真的已经做了很多。我们先把今晚交给街坊，好吗？不是所有事情都必须由你一个人完成。',
      },
    ],
    after: [
      { speaker: '牧舟', text: '我睡着的时候，磨坊竟然也没有塌。' },
      { speaker: '街坊们', text: '明天还是一起修。你负责教，我们负责搭把手。' },
      {
        speaker: '阿弦',
        text: '牧舟把旧伞交给我。伞柄上刻着一句新话：轮到你歇一歇。',
      },
    ],
  },
  {
    id: 'lighthouse',
    place: '晚灯海岬',
    title: '留一盏灯，也留一扇门',
    person: '守灯人南婆婆',
    promise: '陪南婆婆为思念找到一个能继续生活的位置。',
    enemies: ['echo', 'burden', 'whisper'],
    before: [
      {
        speaker: '南婆婆',
        text: '他走后，灯塔每天还亮着。我怕哪天忘了他的声音，就连灯都不敢离开。',
      },
      {
        speaker: '阿弦',
        text: '我们可以把那首曲子记下来。记得一个人，不一定要一直待在最后见到他的地方。',
      },
    ],
    after: [
      { speaker: '南婆婆', text: '我想去集市买两颗桃子。他喜欢的，我也喜欢。' },
      {
        speaker: '阿弦',
        text: '她仍然会想他。只是今晚的灯亮起时，她也给自己煮了一碗热汤。',
      },
    ],
  },
  {
    id: 'atelier',
    place: '晴窗工坊',
    title: '有裂纹的，也可以发光',
    person: '器具匠青石',
    promise: '让一件没做到完美的礼物，第一次离开工坊。',
    enemies: ['thorn', 'clock', 'echo'],
    before: [
      {
        speaker: '青石',
        text: '这只灯还差一点。只要再改一点，我就能把它送给女儿了。她说了好多次没关系，可我不能让她失望。',
      },
      {
        speaker: '阿弦',
        text: '也许她等的，是你和灯一起回来。要不要先问问她喜欢哪一道光？',
      },
    ],
    after: [
      {
        speaker: '青石的女儿',
        text: '这个裂口照出来像一条小河。我最喜欢这里。',
      },
      { speaker: '青石', text: '那……今天就不修它了。我们去河边走走。' },
    ],
  },
  {
    id: 'homecoming',
    place: '万灯城 · 听风广场',
    title: '轮到你，也被听见',
    person: '阿弦与沿途的朋友',
    promise: '完成一首不必独自演奏的归途之歌。',
    enemies: ['night', 'echo', 'clock'],
    before: [
      {
        speaker: '阿弦',
        text: '到了广场，我却怎么也唱不出第一句。那个熟悉的声音又来了：你能帮助别人，为什么连自己都照顾不好？',
      },
      {
        speaker: '许师傅',
        text: '会照顾人，不代表你不会难过。今天不用站在所有人的前面。我们陪你一起。',
      },
      {
        speaker: '小禾',
        text: '芽芽来唱第一句。牧舟替你撑伞。南婆婆带了热汤。你的歌里，早就有我们了。',
      },
    ],
    after: [
      {
        speaker: '阿弦',
        text: '我没有变成再也不会害怕的人。只是这次，我知道可以向谁开口。',
      },
      { speaker: '沿途的朋友', text: '下一次风吹起来，我们也会在。' },
      {
        speaker: '尾声 · 万灯亮起',
        text: '空白乐谱写满了几段不同的旋律。阿弦合上音乐盒，给新的来信回了一句话：我会来，但请先为自己倒一杯热茶。',
      },
    ],
  },
];
