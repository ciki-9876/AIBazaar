import type {
  AdventureState,
  BattleDefinition,
  BattleId,
  CharacterId,
  Choice,
  Dialogue,
  MapDefinition,
  Objective,
  ShopOffer,
  ShowDefinition,
} from './adventure-types';
import { PERFORMERS } from '../cards/throw-performer.ts';

/**
 * Act two · Bridgeport: 没人替你买票，就让他们自己来.
 * A market town with a bridge, a pub, a junk shop and a theatre that only
 * opens on Thursdays. Content only; magician-world.ts runs it.
 *
 * Route: arrive → register with Doris → beat the Pryce sisters in the
 * morning slot → win three street shows → main hall → four group duels →
 * final against Juno Bell → bus to Westport. Side lines: Hobbs's lost things,
 * the sisters' bet, and Stan's search for a decent lavatory.
 */
export const BRIDGEPORT_MAPS = {
  bridgeport: {
    act: 2,
    name: '布里奇波特',
    subtitle: '集市街 · 周四上午 · 毛毛雨',
    image: 'bridgeport-street',
    width: 2560,
    height: 1080,
    floor: 875,
    cameraY: 250,
    hotspots: [
      { id: 'bp-bus', x: 170, label: '城际巴士站', kind: 'bus' },
      { id: 'stan', x: 400, label: '司机斯坦', kind: 'npc', character: 'stan' },
      { id: 'dodd', x: 650, label: '报刊亭', kind: 'npc', character: 'dodd' },
      {
        id: 'bridge-crate',
        x: 880,
        label: '桥头的旧木箱',
        kind: 'pickup',
        when: (s) => s.flags.hobbsAsked && !s.found.includes('pestle'),
      },
      { id: 'goose-door', x: 1130, label: '醉鹅旅店', kind: 'door', target: 'goose', spawn: 170 },
      { id: 'busk-stage', x: 1430, label: '集市街头演出', kind: 'board' },
      { id: 'juno', x: 1620, label: '朱诺·贝尔', kind: 'npc', character: 'juno', when: (s) => !isFinalist(s) },
      { id: 'curios-door', x: 1880, label: '霍布斯旧货铺', kind: 'door', target: 'curios', spawn: 170 },
      { id: 'thursday-door', x: 2290, label: '周四剧院', kind: 'door', target: 'thursday', spawn: 190 },
    ],
  },
  goose: {
    act: 2,
    name: '醉鹅旅店',
    subtitle: '酒馆兼旅店兼镇上的消息集散地',
    image: 'drunken-goose',
    width: 1440,
    height: 810,
    floor: 638,
    cameraY: 64,
    hotspots: [
      { id: 'goose-exit', x: 130, label: '返回集市街', kind: 'door', target: 'bridgeport', spawn: 1130 },
      { id: 'pettigrew', x: 500, label: '佩蒂格鲁先生', kind: 'npc', character: 'pettigrew' },
      { id: 'ada', x: 860, label: '艾达·普赖斯', kind: 'npc', character: 'ada', when: (s) => morningDone(s) },
      { id: 'bea', x: 1000, label: '比阿·普赖斯', kind: 'npc', character: 'bea', when: (s) => morningDone(s) },
      {
        id: 'goose-cellar',
        x: 1290,
        label: '地窖口',
        kind: 'pickup',
        when: (s) => s.flags.hobbsAsked && !s.found.includes('scale'),
      },
    ],
  },
  curios: {
    act: 2,
    name: '霍布斯旧货铺',
    subtitle: '旧货不退 · 新货没有',
    image: 'hobbs-curios',
    width: 1280,
    height: 720,
    floor: 604,
    cameraY: 0,
    hotspots: [
      { id: 'curios-exit', x: 130, label: '返回集市街', kind: 'door', target: 'bridgeport', spawn: 1880 },
      { id: 'hobbs', x: 830, label: '老霍布斯', kind: 'npc', character: 'hobbs' },
    ],
  },
  thursday: {
    act: 2,
    name: '周四剧院',
    subtitle: '每周只开一天，今天正好是那一天',
    image: 'thursday-theatre',
    width: 1800,
    height: 810,
    floor: 638,
    cameraY: 64,
    hotspots: [
      { id: 'thursday-exit', x: 140, label: '返回集市街', kind: 'door', target: 'bridgeport', spawn: 2290 },
      { id: 'doris', x: 430, label: '售票处 · 多丽丝', kind: 'npc', character: 'doris' },
      { id: 'ada', x: 820, label: '艾达·普赖斯', kind: 'npc', character: 'ada', when: (s) => !morningDone(s) },
      { id: 'bea', x: 980, label: '比阿·普赖斯', kind: 'npc', character: 'bea', when: (s) => !morningDone(s) },
      { id: 'agnes', x: 760, label: '艾格尼丝·莫斯', kind: 'npc', character: 'agnes', when: (s) => s.flags.mainHall },
      { id: 'rosie', x: 930, label: '罗茜·费恩', kind: 'npc', character: 'rosie', when: (s) => s.flags.mainHall },
      { id: 'basil', x: 1100, label: '巴兹尔·怀特', kind: 'npc', character: 'basil', when: (s) => s.flags.mainHall },
      { id: 'pike', x: 1270, label: '派克警长', kind: 'npc', character: 'pike', when: (s) => s.flags.mainHall },
      { id: 'juno', x: 1500, label: '朱诺·贝尔', kind: 'npc', character: 'juno', when: (s) => isFinalist(s) },
      {
        id: 'wings-trunk',
        x: 1700,
        label: '侧幕的旧皮箱',
        kind: 'pickup',
        when: (s) => s.flags.hobbsAsked && !s.found.includes('jar'),
      },
    ],
  },
} satisfies Record<string, MapDefinition>;

export const BRIDGEPORT_CAST = {
  juno: { name: '朱诺·贝尔', role: '布里奇波特的台柱 · 街头魔术师' },
  hobbs: { name: '老霍布斯', role: '旧货铺老板 · 退休的毒手' },
  ada: { name: '艾达·普赖斯', role: '普赖斯姐妹 · 姐姐 · 砌墙专家' },
  bea: { name: '比阿·普赖斯', role: '普赖斯姐妹 · 妹妹 · 泡茶专家' },
  stan: { name: '司机斯坦', role: '城际巴士司机 · 厕所鉴赏家' },
  dodd: { name: '多德太太', role: '报刊亭老板 · 消息比报纸快' },
  doris: { name: '多丽丝', role: '周四剧院售票员 · 掌管座位与命运' },
  pettigrew: { name: '佩蒂格鲁先生', role: '经纪人 · 名片比牌多' },
  agnes: { name: '艾格尼丝·莫斯', role: '园艺协会会长 · 青苔派' },
  rosie: { name: '罗茜·费恩', role: '醉鹅的厨子 · 火爆脾气' },
  basil: { name: '巴兹尔·怀特', role: '退休数学老师 · 蓄爆派' },
  pike: { name: '派克警长', role: '镇上唯一的警察 · 护盾派' },
} satisfies Partial<Record<CharacterId, { name: string; role: string }>>;

export const GROUP: readonly BattleId[] = ['agnes', 'rosie', 'basil', 'pike'];
export const morningDone = (s: AdventureState) => s.won.includes('ada') && s.won.includes('bea');
export const showsWon = (s: AdventureState) => s.won.filter((id) => id.startsWith('show-')).length;
export const isFinalist = (s: AdventureState) => GROUP.every((id) => s.won.includes(id));
export const HOBBS_THINGS = ['pestle', 'scale', 'jar'] as const;

/* ───────────────────────────── Street shows ───────────────────────────── */
export const SHOWS: readonly ShowDefinition[] = [
  { id: 'double', title: '两张起甩', rule: '每次至少甩 2 张牌。', blurb: '集市的观众说单张看着太寒酸。他们是认真的。' },
  { id: 'single', title: '一张就够', rule: '每次只能甩 1 张牌。', blurb: '街头魔术的老规矩：手里一张，眼里全场。' },
  { id: 'tea', title: '别让茶凉', rule: '生命跌破 160 即告失败。', blurb: '比阿在台下泡好了茶。你倒下之前，茶必须还是热的。' },
  { id: 'quick', title: '速战速决', rule: '64 秒内获胜，否则失败。', blurb: '斯坦说巴士 64 秒后开。巴士其实不开，但他说得很坚定。落幕会帮你一把。' },
  { id: 'borrowed', title: '借来的箱子', rule: '只能用佩蒂格鲁借你的青苔巡演箱。', blurb: '「公司标准配置。」佩蒂格鲁说。「你会爱上它的。」' },
  { id: 'noshield', title: '无盾之夜', rule: '巡演箱里不许带护盾类道具。', blurb: '罗茜说盾牌挡住了她看你的视线。她要看清楚你被烤熟。' },
];

/* ───────────────────────────── Battles ───────────────────────────── */
export const BRIDGEPORT_BATTLES = {
  ada: {
    act: 2,
    title: '周四剧院 · 早场 · 艾达',
    opponent: 'ada',
    style: 'guard',
    items: ['umbrella', 'ward', 'thorns', 'pair', 'draw'],
    relic: 'bastion',
    reward: { fee: 10 },
    win: 'ada-win',
    loss: 'ada-loss',
    tip: '多德太太的消息：艾达只出对子和黑桃竖盾。单张削盾——飞牌修缮箱配单张，比砸大牌划算。',
  },
  bea: {
    act: 2,
    title: '周四剧院 · 早场 · 比阿',
    opponent: 'bea',
    style: 'mend',
    items: ['mend', 'wash', 'drain', 'pair', 'quick'],
    relic: 'heart',
    reward: { fee: 10 },
    win: 'bea-win',
    loss: 'bea-loss',
    tip: '比阿出红心回血。着火时治疗只剩六成——如果你有方块和火，现在是好时候；没有的话，稳稳出对子。',
  },
  agnes: {
    act: 2,
    title: '公开赛小组赛 · 艾格尼丝',
    opponent: 'agnes',
    style: 'poison',
    items: ['poison', 'venom', 'slow', 'pair', 'draw', 'quick'],
    relic: 'toxin',
    reward: { fee: 15 },
    win: 'agnes-win',
    loss: 'agnes-loss',
    tip: '剧毒无视护盾，手牌越多毒发越重。别攒牌；回暖小灯和清露药包能边回血边解毒。',
  },
  rosie: {
    act: 2,
    title: '公开赛小组赛 · 罗茜',
    opponent: 'rosie',
    style: 'burn',
    items: ['cinder', 'bellows', 'ash', 'pair', 'draw', 'quick'],
    relic: 'ember',
    book: { ...PERFORMERS.rosie.book },
    performer: 'rosie',
    reward: { fee: 15 },
    win: 'rosie-win',
    loss: 'rosie-loss',
    tip: '火怕盾：补丁旧伞、守灯小毯竖起来，火就只烧盾、熄得更快。一次出 5 张还能吹灭自己身上的火。',
  },
  basil: {
    act: 2,
    title: '公开赛小组赛 · 巴兹尔',
    opponent: 'basil',
    style: 'combo',
    reward: { fee: 15 },
    win: 'basil-win',
    loss: 'basil-loss',
    tip: '巴兹尔攒满手牌才出顺子和同花。他攒牌时你就打；剧毒的「毒发」专吃攒牌的人；回声针盒会反击他的大牌。',
  },
  pike: {
    act: 2,
    title: '公开赛小组赛 · 派克警长',
    opponent: 'pike',
    style: 'guard',
    items: ['umbrella', 'ward', 'thorns', 'pair', 'draw', 'quick'],
    relic: 'bastion',
    reward: { fee: 15 },
    win: 'pike-win',
    loss: 'pike-loss',
    tip: '警长的盾很厚，铜镜反射大牌。单张削盾且不被反射；剧毒直接穿过护盾。',
  },
  juno: {
    act: 2,
    title: '布里奇波特公开赛 · 决赛',
    opponent: 'juno',
    style: 'quick',
    items: ['quick', 'compass', 'tempo', 'needle', 'stride', 'draw', 'pair'],
    relic: 'relay',
    book: { ...PERFORMERS.juno.book },
    performer: 'juno',
    reward: { fee: 40, items: ['stride', 'tempo', 'needle'], relics: ['relay'], variants: ['0-11:LSJ'] },
    winFlags: ['champion'],
    win: 'juno-win',
    loss: 'juno-loss',
    draw: 'juno-draw',
    tip: '朱诺单张连发、专削护盾，抖擞披风让她不怕毒。她怕两样：火（烫手专罚出手快的人），和攒满的大牌型（扇面格挡挡单张）。',
  },
  hobbs: {
    act: 2,
    title: '霍布斯旧货铺 · 年轻时的配方',
    opponent: 'hobbs',
    style: 'poison',
    items: ['poison', 'venom', 'slow', 'stride', 'pair', 'draw'],
    relic: 'toxin',
    book: { '2-14': 'LCA', '2-8': 'moss', '2-5': 'moss' },
    reward: { fee: 20, items: ['poison', 'venom'], variants: ['2-10:LC10'] },
    win: 'hobbs-win',
    loss: 'hobbs-loss',
    tip: '霍布斯是老派毒手，还带了解毒披风。治疗会顺手净化剧毒：多出红心，别攒牌。',
  },
  sisters: {
    act: 2,
    title: '醉鹅 · 姐妹的赌约',
    opponent: 'ada',
    style: 'mend',
    items: ['pair', 'umbrella', 'ward', 'mend', 'wash', 'quick'],
    relic: 'bastion',
    reward: { fee: 25, variants: ['1-3:LH3'] },
    win: 'sisters-win',
    loss: 'sisters-loss',
    tip: '姐姐砌盾，妹妹回血，两人合用一只箱子。剧毒穿盾、火克回血——挑一样，别两头都想要。',
  },
  'show-double': {
    act: 2,
    title: '街头演出 · 两张起甩',
    opponent: 'bea',
    style: 'mend',
    items: ['mend', 'pair'],
    relic: null,
    terms: { minCards: 2 },
    reward: { fee: 10, variants: ['1-8:mint'] },
    win: 'show-win-double',
    loss: 'show-loss',
  },
  'show-single': {
    act: 2,
    title: '街头演出 · 一张就够',
    opponent: 'ada',
    style: 'guard',
    items: ['ward', 'pair'],
    relic: null,
    terms: { maxCards: 1 },
    reward: { fee: 10, variants: ['0-7:lining'] },
    win: 'show-win-single',
    loss: 'show-loss',
  },
  'show-tea': {
    act: 2,
    title: '街头演出 · 别让茶凉',
    opponent: 'basil',
    style: 'combo',
    items: ['sequence', 'pair'],
    relic: null,
    terms: { hpFloor: 160 },
    reward: { fee: 12, variants: ['3-6:seal'] },
    win: 'show-win-tea',
    loss: 'show-loss',
  },
  'show-quick': {
    act: 2,
    title: '街头演出 · 速战速决',
    opponent: 'stan',
    style: 'lesson',
    items: [],
    relic: null,
    terms: { deadlineMs: 64000 },
    reward: { fee: 12, variants: ['0-14:silver'] },
    win: 'show-win-quick',
    loss: 'show-loss',
  },
  'show-borrowed': {
    act: 2,
    title: '街头演出 · 借来的箱子',
    opponent: 'pettigrew',
    style: 'guard',
    items: ['umbrella', 'ward', 'pair'],
    relic: null,
    kit: { only: { items: ['poison', 'venom', 'slow', 'pair', 'draw'], relic: 'toxin' } },
    reward: { fee: 12, variants: ['2-6:moss'] },
    win: 'show-win-borrowed',
    loss: 'show-loss',
  },
  'show-noshield': {
    act: 2,
    title: '街头演出 · 无盾之夜',
    opponent: 'rosie',
    style: 'burn',
    items: ['cinder', 'ash', 'pair'],
    relic: null,
    kit: { banFamilies: ['shield'] },
    reward: { fee: 15, variants: ['1-6:edge'] },
    win: 'show-win-noshield',
    loss: 'show-loss',
  },
} satisfies Record<string, BattleDefinition>;

/* ───────────────────────────── Hobbs's stock ───────────────────────────── */
const after = (id: BattleId) => (s: AdventureState) => s.won.includes(id);
export const SHOP: readonly ShopOffer[] = [
  { id: 'compass', kind: 'item', ref: 'compass', price: 25, note: '电线是 1952 年的。它不介意，你也别介意。' },
  { id: 'drain', kind: 'item', ref: 'drain', price: 25, note: '前主人说它能把别人的苦泡成甜的。前主人后来搬走了。' },
  { id: 'heart', kind: 'relic', ref: 'heart', price: 30, note: '补丁比毯子多。暖和程度不受影响。' },
  { id: 'echo', kind: 'relic', ref: 'echo', price: 35, note: '会记仇的八音盒。别在它面前说别人坏话。' },
  { id: 'capacity', kind: 'relic', ref: 'capacity', price: 40, note: '两层夹层，多装两张牌。第三层里是谁的假牙，我不想知道。' },
  { id: 'v-mint', kind: 'variant', ref: '1-7:mint', price: 12, note: '♥7 · 薄荷。闻着像牙膏，用着像魔术。' },
  { id: 'v-moss', kind: 'variant', ref: '2-5:moss', price: 12, note: '♣5 · 苔痕。在我地窖里放了一个冬天。' },
  { id: 'v-seal', kind: 'variant', ref: '3-5:seal', price: 12, note: '♦5 · 火漆。小心，它还热着。' },
  { id: 'v-lining', kind: 'variant', ref: '0-6:lining', price: 12, note: '♠6 · 衬里。法兰绒的，冬天抢手。' },
  { id: 'v-edge', kind: 'variant', ref: '0-4:edge', price: 12, note: '♠4 · 磨边。四个角都磨过了。' },
  { id: 'v-silver', kind: 'variant', ref: '1-14:silver', price: 15, note: '♥A · 描银。银边描得很细，细到我都没注意。' },
  { id: 'v-gold', kind: 'variant', ref: '2-12:gold', price: 35, note: '♣Q · 镀金。真金。至少镀的那层是。', stocked: (s) => s.flags.mainHall },
  { id: 'v-wild', kind: 'variant', ref: '3-11:wild', price: 35, note: '♦J · 百搭。它说哪种花色都行，像个政客。', stocked: (s) => s.flags.mainHall },
  { id: 'poison', kind: 'item', ref: 'poison', price: 20, note: '艾格尼丝的同款。她不知道我有。', stocked: after('agnes') },
  { id: 'venom', kind: 'item', ref: 'venom', price: 18, note: '线是绿的，原本不是。', stocked: after('agnes') },
  { id: 'slow', kind: 'item', ref: 'slow', price: 20, note: '让时间慢下来，像周日的邮局。', stocked: after('agnes') },
  { id: 'toxin', kind: 'relic', ref: 'toxin', price: 30, note: '一勺见效。见什么效，看运气。', stocked: after('agnes') },
  { id: 'cinder', kind: 'item', ref: 'cinder', price: 20, note: '罗茜换新炉子以后扔掉的。还能用，太能用了。', stocked: after('rosie') },
  { id: 'bellows', kind: 'item', ref: 'bellows', price: 18, note: '本来只想吹凉一点。', stocked: after('rosie') },
  { id: 'ash', kind: 'item', ref: 'ash', price: 22, note: '专放火灾片。', stocked: after('rosie') },
  { id: 'ember', kind: 'relic', ref: 'ember', price: 30, note: '整个冬天没熄过。房东写过三封信。', stocked: after('rosie') },
  { id: 'sequence', kind: 'item', ref: 'sequence', price: 28, note: '巴兹尔说它的扇面是黄金分割。我量过，不是。', stocked: after('basil') },
  { id: 'suit', kind: 'item', ref: 'suit', price: 24, note: '四种颜色，一种脾气。', stocked: after('basil') },
  { id: 'focus', kind: 'item', ref: 'focus', price: 26, note: '放映前请关掉怀疑。', stocked: after('basil') },
  { id: 'shieldbash', kind: 'item', ref: 'shieldbash', price: 26, note: '警长的旧装备。他说是“借给”我的。', stocked: after('pike') },
  // v9 costumes: a specialist's reward, stocked once two group opponents have shown you what a pure trunk can do.
  { id: 'sequin', kind: 'item', ref: 'sequin', price: 30, note: '只配一种颜色的人穿。穿上以后，你也只能是一种颜色。', stocked: (s) => GROUP.filter((id) => s.won.includes(id)).length >= 2 },
  { id: 'tailcoat', kind: 'item', ref: 'tailcoat', price: 35, note: '裁缝寄卖的。他说两种本事刚好，三种就开线了。', stocked: (s) => GROUP.filter((id) => s.won.includes(id)).length >= 2 },
];

/* ───────────────────────────── Dossier gossip ───────────────────────────── */
export const GOSSIP: Partial<Record<CharacterId, string>> = {
  felix: '出方块就点火。怕伞，非常怕。',
  ada: '姐姐。只出对子和黑桃，像在砌墙。单张能削她的盾。',
  bea: '妹妹。红心回血，慢悠悠的。火能让她的茶凉掉。',
  agnes: '梅花叠毒，毒穿过护盾。手牌越多毒发越重——别攒牌。',
  rosie: '方块点火，着火时你治疗打六折、出手烫手。带盾去。',
  basil: '攒满一手才出，顺子、同花一击重创。他攒牌的时候你就打。',
  pike: '盾厚，铜镜反射大牌。单张削盾且不被反射，剧毒直接穿盾。',
  juno: '快。单张接单张，专削护盾。她怕火，也怕攒好的大牌型。',
  hobbs: '退休前是毒手，配方比药房全，还会解毒。多带红心。',
  stan: '他从没赢过。也从没真正想赢。',
  pettigrew: '只用公司发的牌组。公司发什么，他就是什么。',
  reed: '会泡茶，会修灯，会让你。',
};

/* ───────────────────────────── Dialogue ───────────────────────────── */
const close = (label = '回头再说'): Choice => ({ id: 'close', label, action: { type: 'close' } });
const fight = (battle: BattleId, label = '接受挑战'): Choice => ({ id: battle, label, action: { type: 'battle', battle } });
const shop: Choice = { id: 'shop', label: '看看货', action: { type: 'panel', panel: 'shop' } };
const dossier: Choice = { id: 'dossier', label: '翻翻对手档案', action: { type: 'panel', panel: 'dossier' } };
const shows: Choice = { id: 'shows', label: '看看今天的演出单', action: { type: 'panel', panel: 'shows' } };
const paper: Choice = {
  id: 'paper',
  label: '买份报纸（2 演出费）',
  action: { type: 'pay', price: 2, flag: 'stanPaper', nextDialogue: 'dodd-paper', poor: 'dodd-poor' },
};

export const BRIDGEPORT_DIALOGUES: Record<string, Dialogue> = {
  'bp-arrival': {
    lines: [
      { speaker: 'narrator', text: '布里奇波特。一座桥，一个集市，一家只在周四营业的剧院。镇长说这里“非常有活力”，指的是周四。' },
      { speaker: 'stan', text: '到站。布里奇波特。我在这儿等你，等多久都行。主要是这儿的厕所……算了，你不会懂的。' },
      { speaker: 'narrator', text: '巡演箱的夹层里有一张米娅的字条，裹着 10 演出费：“应急用。应急的意思是饼干。”' },
      { speaker: 'narrator', text: '另有一张里德的明信片：“公开赛在周四剧院报名。售票员叫多丽丝。她没有幽默感，这一点请务必尊重。”' },
      { speaker: 'eli', text: '剧院在街的另一头。先去报名——顺便看看这镇上的人怎么甩牌。' },
    ],
    effect: { set: ['arrived'], reward: { fee: 10 }, once: 'arrived' },
  },
  'stan-first': {
    lines: [
      { speaker: 'stan', text: '小伙子，帮个忙。我开了二十年车，走遍全国的厕所。布里奇波特的，是我最后的遗憾。' },
      { speaker: 'stan', text: '我要的不多：一个安静的厕所，和一份好报纸。报纸报刊亭有。安静的厕所……听说剧院后台有一个，钥匙在售票员那儿。' },
      { speaker: 'eli', text: '你是说，你想让我去偷剧院厕所的钥匙。' },
      { speaker: 'stan', text: '“借”。我用词很讲究的。事成之后，我把私藏的好东西给你。' },
    ],
    effect: { set: ['stanAsked'] },
  },
  'stan-waiting': {
    lines: [
      { speaker: 'stan', text: '报纸和钥匙，一样都不能少。没有报纸的厕所，就是一个小房间。' },
    ],
  },
  'stan-done': {
    lines: [
      { speaker: 'eli', text: '报纸。钥匙。剧院后台，左手第二个门。' },
      { speaker: 'stan', text: '……这是我这辈子收到过最好的礼物。别告诉我老婆。' },
      { speaker: 'stan', text: '拿着，这是我在车上发现的一张牌，夹在座位缝里好几年了。红心 4，背面写着“下午四点”。我觉得它在提醒我什么。' },
      { speaker: 'narrator', text: '获得 15 演出费，以及传奇变种「♥4 · 下午四点」：甩出时净化自身 5 层剧毒和 5 层灼烧。可以在巡演箱的「牌匣」里装上。' },
    ],
    effect: { set: ['stanDone'], reward: { fee: 15, variants: ['1-4:LH4'] }, once: 'stanDone' },
  },
  'stan-after': {
    lines: [
      { speaker: 'stan', text: '我已经去过三次了。每次都像第一次。等你拿了冠军，我就开车送你去韦斯特港——如果我出得来的话。' },
    ],
  },
  'bp-bus-locked': {
    lines: [
      { speaker: 'stan', text: '公开赛还没打完就想走？巴士不跑，我还没上完……我是说，我还没准备好。' },
    ],
  },
  'bp-departure': {
    lines: [
      { speaker: 'juno', text: '伊莱·维尔。我在报纸上看到你名字了，拼对了。恭喜。' },
      { speaker: 'juno', text: '这个镇的观众不等人，可他们今天等你了。下次见面，我会准备新招。' },
      { speaker: 'eli', text: '那我也准备一个。不过我不告诉你是什么。' },
      { speaker: 'stan', text: '上车上车。下一站韦斯特港——地铁、高架桥、广播塔，以及全国排名第四的公共厕所。' },
      { speaker: 'narrator', text: '巴士驶过那座桥。车窗外，报刊亭的多德太太正把一张新海报贴上去：“伊莱·维尔，下周四，不在本镇。”' },
    ],
    effect: { set: ['leftBridgeport'], complete: true },
  },
  'dodd-first': {
    lines: [
      { speaker: 'dodd', text: '新面孔！格雷维克来的，对吧？鞋子上的泥我认得。别紧张，亲爱的，我卖报纸，也卖消息。消息比报纸快。' },
      { speaker: 'dodd', text: '镇上每个甩牌的，我都有一本账：爱出什么花色、什么牌型、带什么遗物。你跟谁打过，我就给谁记一笔。' },
      { speaker: 'dodd', text: '想看随时来翻。不收钱——但你要是赢了，得接受我的独家采访。' },
    ],
    choices: [dossier, close('下次再翻')],
    effect: { set: ['metDodd'] },
  },
  'dodd-again': {
    lines: [{ speaker: 'dodd', text: '今天的头条是天气。昨天也是。要看看你的对手们吗？' }],
    choices: [dossier, close('不用了，谢谢')],
  },
  'dodd-paper-offer': {
    lines: [
      { speaker: 'dodd', text: '买报纸？给斯坦的吧。那个人看报纸只看一个版面，但从不承认是哪个版面。' },
    ],
    choices: [paper, dossier, close('先不买')],
    effect: { set: ['metDodd'] },
  },
  'dodd-paper': {
    lines: [
      { speaker: 'dodd', text: '两块，谢谢。头版是天气，第三版是你——好吧，还不是你。再加把劲。' },
      { speaker: 'narrator', text: '获得一份《布里奇波特周报》。斯坦会喜欢的。' },
    ],
  },
  'dodd-poor': {
    lines: [{ speaker: 'dodd', text: '两块都没有？亲爱的，去集市演一场吧，观众会给你的。大部分会。' }],
  },
  'doris-first': {
    lines: [
      { speaker: 'doris', text: '报名？姓名。' },
      { speaker: 'eli', text: '伊莱·维尔。' },
      { speaker: 'doris', text: '格雷维克来的。没有名气，没有经纪人，没有预约。我给你排在早场：上午九点，观众三位，其中一位是来躲雨的。' },
      { speaker: 'doris', text: '早场对手是普赖斯姐妹，就在台上。赢两场，你就有公开赛资格。规定就是规定。' },
    ],
    effect: { set: ['metDoris'] },
  },
  'doris-morning': {
    lines: [{ speaker: 'doris', text: '早场两场，赢了才算。普赖斯姐妹在台上等你，她们的茶快凉了。' }],
  },
  'doris-shows': {
    lines: [
      { speaker: 'doris', text: '资格有了。可主厅的座位，要留给有观众的人。你的观众数目前是：三位，其中一位走了。' },
      { speaker: 'doris', text: '去集市演几场。等街上有人认得你了，我再考虑。规定就是规定——好吧，这条是我刚定的。' },
    ],
  },
  'doris-mainhall': {
    lines: [
      { speaker: 'doris', text: '……今天有四个人来问“那个格雷维克来的人几点上场”。四个。我在这儿卖了三十年票，从没被问过这种问题。' },
      { speaker: 'doris', text: '主厅。小组赛四场，四个对手都在台上。全赢了进决赛，对手是朱诺·贝尔。' },
      { speaker: 'narrator', text: '多丽丝把你的名字从早场名单上划掉，写进了主厅。她写得很慢，好像在确认自己没写错。' },
    ],
    effect: { set: ['mainHall'] },
  },
  'doris-group': {
    lines: [{ speaker: 'doris', text: '小组赛四场，你自己挑顺序。打完了来告诉我——不，不用告诉我，我会知道的。' }],
  },
  'doris-final': {
    lines: [{ speaker: 'doris', text: '决赛。朱诺在台上。座位全卖完了，包括我自己的。' }],
  },
  'doris-after': {
    lines: [{ speaker: 'doris', text: '冠军先生。下周四的票卖光了，可你不在镇上。规定就是规定，但这一条我有点遗憾。' }],
  },
  'doris-key': {
    lines: [
      { speaker: 'eli', text: '多丽丝，请问……后台的员工厕所，钥匙能借我一下吗？' },
      { speaker: 'doris', text: '是斯坦让你来的。' },
      { speaker: 'eli', text: '……是的。' },
      { speaker: 'doris', text: '他每年都派人来。你是第一个开口说“请问”的。拿去吧，用完放回钩子上。规定就是规定。' },
      { speaker: 'narrator', text: '获得剧院后台员工厕所钥匙。斯坦会热泪盈眶的。' },
    ],
    effect: { set: ['stanKey'] },
  },
  'sisters-wait': {
    lines: [{ speaker: 'ada', text: '报名了吗？没报名不打。妹妹，把茶收起来，这位还没登记。' }],
  },
  'ada-first': {
    lines: [
      { speaker: 'ada', text: '早场？我们姐妹打早场打了十一年。观众三位，有一位每次都睡着。' },
      { speaker: 'ada', text: '我砌墙，妹妹泡茶。你先过我这一关。我出对子、出黑桃，盾会越来越厚——像这个镇的口音。' },
    ],
    choices: [fight('ada'), close('等我准备一下')],
  },
  'ada-again': {
    lines: [{ speaker: 'ada', text: '我的墙你已经拆过了。去找妹妹吧，她泡了茶，别让她白泡。' }],
  },
  'ada-win': {
    lines: [
      { speaker: 'ada', text: '……拆得挺干净。我那面墙砌了十一年。' },
      { speaker: 'eli', text: '单张削盾。我刚学会的。' },
      { speaker: 'ada', text: '学得真快。年轻人学东西快，忘得也快。希望你别忘了是谁教的——是我的墙。' },
    ],
  },
  'ada-loss': {
    lines: [
      { speaker: 'ada', text: '墙还在。你还年轻，墙不急。' },
      { speaker: 'narrator', text: '小提示：单张牌打在护盾上会多削 10% 盾，而且不会被反射。多德太太的档案里有艾达的路数。' },
    ],
  },
  'bea-first': {
    lines: [
      { speaker: 'bea', text: '你好呀。喝茶吗？不喝也没关系，我先喝了。' },
      { speaker: 'bea', text: '我出红心，回血。打得慢，赢得也慢。姐姐说这叫“消耗战”，我叫它“下午茶”。' },
    ],
    choices: [fight('bea'), close('先去别处转转')],
  },
  'bea-again': {
    lines: [{ speaker: 'bea', text: '茶续上了。可你已经赢过我了呀，再来就不礼貌了。' }],
  },
  'bea-win': {
    lines: [
      { speaker: 'bea', text: '哎呀。我的茶都凉了。' },
      { speaker: 'bea', text: '我和姐姐晚上在醉鹅。来坐坐吧——姐姐有个提议，她不好意思自己说。' },
    ],
  },
  'bea-loss': {
    lines: [
      { speaker: 'bea', text: '再来一杯？你看起来需要。' },
      { speaker: 'narrator', text: '小提示：着火时治疗只剩六成；顺子以上命中会重创，让对手 5 秒内治疗打折。' },
    ],
  },
  'sisters-bet': {
    lines: [
      { speaker: 'ada', text: '坐。妹妹，你说。' },
      { speaker: 'bea', text: '姐姐想打个赌。我们俩合用一只箱子：她砌墙，我泡茶。你赢了，我们把家传的一张牌给你。' },
      { speaker: 'ada', text: '你输了，你请全店喝一轮。全店。包括罗茜。罗茜喝得很多。' },
    ],
    choices: [fight('sisters', '赌了'), close('今晚先不赌')],
    effect: { set: ['sistersOffered'] },
  },
  'sisters-bet-again': {
    lines: [{ speaker: 'ada', text: '赌约还算数。妹妹的茶续了第四壶，罗茜已经在看酒单了。' }],
    choices: [fight('sisters', '赌了'), close('改天')],
  },
  'sisters-win': {
    lines: [
      { speaker: 'ada', text: '……愿赌服输。妹妹，把牌给他。' },
      { speaker: 'bea', text: '红心 3，黄瓜三明治。甩出时回血。是奶奶的，她说只给“会好好吃三明治的人”。' },
      { speaker: 'narrator', text: '获得 25 演出费，以及传奇变种「♥3 · 黄瓜三明治」。' },
    ],
  },
  'sisters-loss': {
    lines: [
      { speaker: 'ada', text: '罗茜！这位先生请全店。' },
      { speaker: 'narrator', text: '你请了全店一轮。好在是赊账——醉鹅的账本上，你的名字是第一次出现在别人后面。' },
    ],
  },
  'sisters-after': {
    lines: [{ speaker: 'bea', text: '奶奶的牌还好吗？记得甩的时候别太用力，三明治会散。' }],
  },
  'pettigrew-first': {
    lines: [
      { speaker: 'pettigrew', text: '啊，格雷维克的小伙子！佩蒂格鲁，经纪人。名片拿好——拿两张，一张备用。' },
      { speaker: 'pettigrew', text: '我看了你的情况：没名气，没观众，没合同。我能给你一份工作：给朱诺·贝尔当助演，每天递牌，稳定收入。' },
      { speaker: 'eli', text: '谢谢。我是来比赛的，不是来递牌的。' },
      { speaker: 'pettigrew', text: '哈！有骨气。骨气不能当饭吃，但我欣赏。等你想通了，我就在这儿——我一直在这儿，醉鹅的啤酒是全镇最便宜的。' },
    ],
    effect: { set: ['metPettigrew'] },
  },
  'pettigrew-again': {
    lines: [{ speaker: 'pettigrew', text: '想通了吗？助演的位子还给你留着。好吧，其实没人要。' }],
  },
  'pettigrew-late': {
    lines: [
      { speaker: 'pettigrew', text: '冠军先生！我一直说你有潜力。是的，“一直”。名片再拿一张？' },
      { speaker: 'eli', text: '我已经有六张了。' },
    ],
  },
  'juno-market-first': {
    lines: [
      { speaker: 'narrator', text: '集市中央，一个穿短夹克的姑娘正把牌一张一张甩进人群头顶的铁皮罐里。每一张都中。' },
      { speaker: 'juno', text: '格雷维克来的？我听多丽丝说了。别误会，我不讨厌乡下人，我本身就是。' },
      { speaker: 'juno', text: '给你个忠告：这里的观众不等人。你的大招还没攒好，他们就去买炸鱼了。' },
      { speaker: 'eli', text: '那我就让他们等。' },
      { speaker: 'juno', text: '……行。决赛见。如果你走得到的话。' },
    ],
    effect: { set: ['metJuno'] },
  },
  'juno-market-again': {
    lines: [{ speaker: 'juno', text: '还在集市转悠？演一场吧，让我看看你的单张。' }],
  },
  'juno-final': {
    lines: [
      { speaker: 'juno', text: '决赛。主厅坐满了——有一半是来看我的，另一半是来看我赢你的。' },
      { speaker: 'eli', text: '那今天他们会看到不一样的东西。' },
      { speaker: 'juno', text: '说得好听。手上见。' },
    ],
    choices: [fight('juno', '开始决赛'), close('再准备一下')],
  },
  'juno-win': {
    lines: [
      { speaker: 'juno', text: '……我输了。说实话，你的大招攒得比我想的快。' },
      { speaker: 'juno', text: '拿着，我的牌盒。抖擞披风、换调风铃、穿幕细针，还有接力闹钟——别弄丢了，那是我的全部家当。还有这张黑桃 J，伞兵杰克。' },
      { speaker: 'eli', text: '你把全部家当给我？' },
      { speaker: 'juno', text: '我会准备新招的。你也得准备。下次我不会输。' },
      { speaker: 'narrator', text: '布里奇波特公开赛冠军。获得 40 演出费、朱诺的牌盒，以及传奇变种「♠J · 伞兵杰克」。斯坦已经在按喇叭了。' },
    ],
  },
  'juno-loss': {
    lines: [
      { speaker: 'juno', text: '观众不等人。可是我等你——明天还是周四，多丽丝说的。' },
      { speaker: 'narrator', text: '小提示：朱诺怕火（灼烧 3 层以上，每次出手都烫手）和攒好的大牌型（织序风扇挡单张）。霍布斯的铺子里有余烬小炉和织序风扇。' },
    ],
  },
  'juno-draw': {
    lines: [{ speaker: 'juno', text: '平局？多丽丝说规定里没有平局。我们再来一次。' }],
  },
  'juno-after': {
    lines: [{ speaker: 'juno', text: '还不走？斯坦已经把喇叭按坏了。' }],
  },
  'busk-intro': {
    lines: [
      { speaker: 'narrator', text: '集市广场的木台子，挂着一块写满粉笔字的黑板：今日街头演出。' },
      { speaker: 'narrator', text: '每场演出都有一条附加规矩，比如只用红牌、每次只甩一张。守住规矩赢下来，观众会往帽子里扔演出费，有时还有一张好牌。' },
      { speaker: 'narrator', text: '多丽丝说过：主厅要留给“有观众的人”。赢下三场，镇上就会有人认得你。' },
    ],
    choices: [shows, close('先逛逛')],
    effect: { set: ['buskIntro'] },
  },
  'rematch-win': {
    lines: [{ speaker: 'narrator', text: '又赢了一次。观众鼓掌，但帽子里没多什么——这一场的赏钱上次已经领过了。' }],
  },
  'rematch-loss': {
    lines: [{ speaker: 'narrator', text: '这一场输了。不要紧，上次的胜利还算数，账本上不会划掉。' }],
  },
  'show-loss': {
    lines: [
      { speaker: 'narrator', text: '帽子里只有一颗纽扣和一张公交车票。观众很有礼貌地假装没看见。' },
      { speaker: 'narrator', text: '规矩没守住，或者输了。黑板上的演出可以随时再来一次。' },
    ],
  },
  'show-win-double': {
    lines: [
      { speaker: 'narrator', text: '两张、三张、一整把，牌在雨里成双成对地飞。有位老先生说这是他见过最喜庆的魔术，比他的婚礼还喜庆。' },
      { speaker: 'narrator', text: '获得 10 演出费，以及「♥8 · 薄荷」。' },
    ],
  },
  'show-win-single': {
    lines: [
      { speaker: 'narrator', text: '一张，一张，又一张。艾达的墙一块一块地被削掉，观众开始跟着数数。' },
      { speaker: 'narrator', text: '获得 10 演出费，以及「♠7 · 衬里」。' },
    ],
  },
  'show-win-tea': {
    lines: [
      { speaker: 'bea', text: '茶还是热的！你赢了，而且没让我白泡。' },
      { speaker: 'narrator', text: '获得 12 演出费，以及「♦6 · 火漆」。' },
    ],
  },
  'show-win-quick': {
    lines: [
      { speaker: 'stan', text: '一分钟出头。我上个厕所都要更久。' },
      { speaker: 'narrator', text: '获得 12 演出费，以及「♠A · 描银」。' },
    ],
  },
  'show-win-borrowed': {
    lines: [
      { speaker: 'pettigrew', text: '看见没有？公司标准配置！签了合同，你每天都能用它。' },
      { speaker: 'eli', text: '箱子还你。我用自己的。' },
      { speaker: 'narrator', text: '获得 12 演出费，以及「♣6 · 苔痕」。' },
    ],
  },
  'show-win-noshield': {
    lines: [
      { speaker: 'rosie', text: '没带盾还赢了我？今晚醉鹅的炸鱼给你多一块。就一块，别得寸进尺。' },
      { speaker: 'narrator', text: '获得 15 演出费，以及「♥6 · 磨边」。' },
    ],
  },
  'hobbs-first': {
    lines: [
      { speaker: 'hobbs', text: '买东西就买，看就别摸。摸了就得买。旧货不退。' },
      { speaker: 'eli', text: '我是来比赛的魔术师。听说您这儿有道具。' },
      { speaker: 'hobbs', text: '有。全镇甩牌的都把旧东西卖给我。谁输了，谁的东西就到我这儿来——你赢了谁，我这儿就有谁的货。' },
      { speaker: 'hobbs', text: '还有件事。我年轻时的家伙什儿丢了三件：一根杵，一杆秤，一只药罐。桥头、醉鹅地窖、剧院侧幕，大概在那几个地方。找回来，我教你点老派的东西。' },
    ],
    choices: [shop, close('先告辞')],
    effect: { set: ['hobbsAsked', 'shopIntro'] },
  },
  'hobbs-shop': {
    lines: [{ speaker: 'hobbs', text: '看货还是找东西？杵、秤、药罐，一件都别少。' }],
    choices: [shop, close('改天再来')],
  },
  'hobbs-return': {
    lines: [
      { speaker: 'hobbs', text: '……都找回来了。杵上的缺口，是我三十年前砸核桃崩的。' },
      { speaker: 'hobbs', text: '我说过教你点老派的东西。老派的教法只有一种：跟我打一场。我用年轻时的配方。' },
    ],
    choices: [fight('hobbs', '请赐教'), shop, close('我先准备')],
    effect: { set: ['hobbsReady'] },
  },
  'hobbs-challenge': {
    lines: [{ speaker: 'hobbs', text: '配方还热着。打不打？' }],
    choices: [fight('hobbs', '请赐教'), shop, close('改天')],
  },
  'hobbs-win': {
    lines: [
      { speaker: 'hobbs', text: '哼。毒是老的，人是新的。' },
      { speaker: 'hobbs', text: '药匣和线盒送你。还有这张梅花 10，园艺剪——修剪别人的毒，比种自己的毒更难。' },
      { speaker: 'narrator', text: '获得 20 演出费、青苔药匣、浸露线盒，以及传奇变种「♣10 · 园艺剪」。' },
    ],
  },
  'hobbs-loss': {
    lines: [
      { speaker: 'hobbs', text: '回去喝点热的。毒这东西，红心能解。' },
      { speaker: 'narrator', text: '小提示：每次治疗都会净化一半数值的剧毒；别攒牌，毒发按手牌数加重。' },
    ],
  },
  'hobbs-after': {
    lines: [{ speaker: 'hobbs', text: '看货？看就别摸。' }],
    choices: [shop, close('改天')],
  },
  'found-pestle': {
    lines: [{ speaker: 'narrator', text: '旧木箱里，一根黄铜杵压在一堆湿报纸下面。杵上有个缺口。是霍布斯的。' }],
    effect: { find: 'pestle' },
  },
  'found-scale': {
    lines: [{ speaker: 'narrator', text: '地窖口挂着一杆小铜秤，秤盘里装着几颗干豌豆。罗茜大概一直拿它称炸鱼的面粉。' }],
    effect: { find: 'scale' },
  },
  'found-jar': {
    lines: [{ speaker: 'narrator', text: '侧幕的旧皮箱里有一只贴着骷髅标签的药罐，里面是……薄荷糖。霍布斯显然有一段复杂的人生。' }],
    effect: { find: 'jar' },
  },
};
const groupLines: Record<string, { first: string[]; again: string; win: string[]; loss: string[] }> = {
  agnes: {
    first: [
      '园艺协会会长，艾格尼丝·莫斯。你踩过我们协会的草坪。没关系，青苔会记住你的。',
      '我出梅花。毒不急，慢慢长，长遍你家后院——还有你家前院。',
    ],
    again: '青苔还在长。要再来一回吗？',
    win: ['……你拔得很干净。协会会给你发一张感谢卡。手写的。字很小。', '获得 15 演出费。霍布斯的铺子里现在有青苔药匣了。'],
    loss: ['回去晒晒太阳吧，亲爱的。青苔最怕这个。', '小提示：治疗会净化剧毒；别攒牌，毒发按手牌数加重。'],
  },
  rosie: {
    first: [
      '醉鹅的厨子，罗茜。我的炸鱼全镇第一，我的火，全镇也第一。',
      '方块点火，烧到你出手都烫手。你最好带把伞——带十把。',
    ],
    again: '炉子又热了。来？',
    win: ['……你把我的火闷了。我得回去重新生炉子，今晚的炸鱼要晚一点了。', '获得 15 演出费。霍布斯的铺子里现在有余烬小炉了。'],
    loss: ['熟了。七分熟。', '小提示：火怕盾。有盾时灼烧只烧盾、熄得更快；一次出 5 张能吹灭身上的火。'],
  },
  basil: {
    first: [
      '巴兹尔·怀特，退休数学老师。我算过，你赢我的概率是百分之三十七点五。',
      '我攒满一手牌，再出顺子或同花。耐心是数学的一部分。另一部分是正确。',
    ],
    again: '我重新算过了。百分之三十八。要验证一下吗？',
    win: ['……我的模型里漏了一个变量：你。', '获得 15 演出费。霍布斯的铺子里现在有织序风扇了。'],
    loss: ['正如我所计算的。不过误差范围很大，别灰心。', '小提示：他攒牌时你就打；剧毒的毒发专吃手牌多的人。'],
  },
  pike: {
    first: [
      '下午好，先生。派克警长，镇上唯一的警察。今天我休假，所以只是一个普通的、盾很厚的市民。',
      '我砌盾，盾会反击。请勿向执法人员投掷大型牌型——铜镜会还给你的。',
    ],
    again: '下午好，先生。还要打吗？我的盾还在。',
    win: ['……按照规定，我得给自己开一张罚单：防守不力。', '获得 15 演出费。霍布斯的铺子里现在有护心放映机了。'],
    loss: ['请出示您的……哦，我们不是在执勤。祝您下午愉快。', '小提示：单张削盾且不被铜镜反射；剧毒直接穿过护盾。'],
  },
};
for (const [id, text] of Object.entries(groupLines)) {
  const speaker = id as CharacterId;
  BRIDGEPORT_DIALOGUES[`${id}-first`] = {
    lines: text.first.map((line) => ({ speaker, text: line })),
    choices: [fight(id as BattleId), close('等我准备一下')],
  };
  BRIDGEPORT_DIALOGUES[`${id}-again`] = {
    lines: [{ speaker, text: text.again }],
    choices: [fight(id as BattleId), close('改天')],
  };
  BRIDGEPORT_DIALOGUES[`${id}-win`] = {
    lines: [{ speaker, text: text.win[0] }, { speaker: 'narrator', text: text.win[1] }],
  };
  BRIDGEPORT_DIALOGUES[`${id}-loss`] = {
    lines: [{ speaker, text: text.loss[0] }, { speaker: 'narrator', text: text.loss[1] }],
  };
  BRIDGEPORT_DIALOGUES[`${id}-after`] = {
    lines: [{ speaker, text: text.again.replace(/[？?]$/, '。') }],
    choices: [fight(id as BattleId, '友谊赛（不计奖励）'), close('不了')],
  };
}

/** Which conversation a person (or thing) starts right now. */
export function bridgeportTalk(state: AdventureState, id: string): string | null {
  const f = state.flags,
    won = (battle: BattleId) => state.won.includes(battle);
  switch (id) {
    case 'stan':
      if (!f.stanAsked) return 'stan-first';
      if (f.stanDone) return 'stan-after';
      return f.stanPaper && f.stanKey ? 'stan-done' : 'stan-waiting';
    case 'bp-bus':
      return f.champion ? 'bp-departure' : 'bp-bus-locked';
    case 'dodd':
      if (f.stanAsked && !f.stanPaper) return 'dodd-paper-offer';
      return f.metDodd ? 'dodd-again' : 'dodd-first';
    case 'juno':
      if (state.map === 'thursday') return f.champion ? 'juno-after' : 'juno-final';
      return f.metJuno ? 'juno-market-again' : 'juno-market-first';
    case 'busk-stage':
      return f.buskIntro ? 'panel:shows' : 'busk-intro';
    case 'pettigrew':
      if (!f.metPettigrew) return 'pettigrew-first';
      return f.champion ? 'pettigrew-late' : 'pettigrew-again';
    case 'ada':
    case 'bea':
      if (state.map === 'goose') {
        if (won('sisters')) return 'sisters-after';
        return f.sistersOffered ? 'sisters-bet-again' : 'sisters-bet';
      }
      if (!f.metDoris) return 'sisters-wait';
      return won(id) ? `${id}-again` : `${id}-first`;
    case 'doris':
      if (!f.metDoris) return 'doris-first';
      if (f.stanAsked && !f.stanKey) return 'doris-key';
      if (!morningDone(state)) return 'doris-morning';
      if (!f.mainHall) return showsWon(state) >= 3 ? 'doris-mainhall' : 'doris-shows';
      if (!isFinalist(state)) return 'doris-group';
      return f.champion ? 'doris-after' : 'doris-final';
    case 'agnes':
    case 'rosie':
    case 'basil':
    case 'pike':
      if (won(id)) return `${id}-after`;
      return state.dossier[id] ? `${id}-again` : `${id}-first`;
    case 'hobbs':
      if (!f.hobbsAsked) return 'hobbs-first';
      if (won('hobbs')) return 'hobbs-after';
      if (f.hobbsReady) return 'hobbs-challenge';
      return HOBBS_THINGS.every((thing) => state.found.includes(thing)) ? 'hobbs-return' : 'hobbs-shop';
    case 'bridge-crate':
      return 'found-pestle';
    case 'goose-cellar':
      return 'found-scale';
    case 'wings-trunk':
      return 'found-jar';
  }
  return null;
}

export function bridgeportObjective(state: AdventureState): Objective {
  const f = state.flags;
  if (!f.metDoris)
    return { title: '去周四剧院报名', detail: '海报上写着：公开赛，周四。今天就是周四。巧了。', target: state.map === 'thursday' ? 'doris' : state.map === 'bridgeport' ? 'thursday-door' : `${state.map}-exit` };
  if (!morningDone(state)) {
    const left = ['ada', 'bea'].filter((id) => !state.won.includes(id as BattleId)).length;
    return {
      title: `赢下早场（还剩 ${left} 场）`,
      detail: '普赖斯姐妹在周四剧院的台上。观众三位，一位在打瞌睡。',
      target: state.map === 'thursday' ? (state.won.includes('ada') ? 'bea' : 'ada') : state.map === 'bridgeport' ? 'thursday-door' : `${state.map}-exit`,
    };
  }
  if (!f.mainHall) {
    const count = showsWon(state);
    if (count < 3)
      return {
        title: `集市街头演出（${count}/3）`,
        detail: '让镇上有人认得你。多丽丝只把主厅留给“有观众的人”。',
        target: state.map === 'bridgeport' ? 'busk-stage' : `${state.map}-exit`,
      };
    return {
      title: '回剧院找多丽丝',
      detail: '镇上开始有人问你几点上场了。她应该会改主意。',
      target: state.map === 'thursday' ? 'doris' : state.map === 'bridgeport' ? 'thursday-door' : `${state.map}-exit`,
    };
  }
  if (!isFinalist(state)) {
    const left = GROUP.filter((id) => !state.won.includes(id));
    return {
      title: `公开赛小组赛（${4 - left.length}/4）`,
      detail: '四个对手都在周四剧院的主厅。顺序你挑。多德太太的档案能帮上忙。',
      target: state.map === 'thursday' ? left[0] : state.map === 'bridgeport' ? 'thursday-door' : `${state.map}-exit`,
    };
  }
  if (!f.champion)
    return {
      title: '决赛：朱诺·贝尔',
      detail: '主厅坐满了。一半来看她，一半来看她赢你。',
      target: state.map === 'thursday' ? 'juno' : state.map === 'bridgeport' ? 'thursday-door' : `${state.map}-exit`,
    };
  return {
    title: '乘巴士去韦斯特港',
    detail: '斯坦在车站。他说这次真的要开了。',
    target: state.map === 'bridgeport' ? 'bp-bus' : `${state.map}-exit`,
  };
}
