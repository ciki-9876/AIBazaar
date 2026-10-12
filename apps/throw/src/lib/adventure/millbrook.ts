import type {
  AdventureState,
  BattleDefinition,
  BattleId,
  CharacterId,
  Choice,
  Dialogue,
  MapDefinition,
  MapId,
  Objective,
  Rumour,
  ShopOffer,
} from './adventure-types.ts';
import type { Lodging } from './bridgeport.ts';
import { PERFORMERS } from '../cards/throw-performer.ts';
import { PRESETS } from '../cards/throw-loadout.ts';
import type { DuelReserve } from '../cards/throw-duel.ts';

export const MILLBROOK_CAST = {
  holt: { name: '阿瑟·霍尔特', role: '纺锤剧团团长 · 不捧个人明星' },
  edith: { name: '伊迪丝·霍尔特', role: '联赛秘书与织布手 · 记得每一根线' },
  oswald: { name: '奥斯瓦尔德', role: '锅炉房场务 · 被收买的剪刀' },
  pip: { name: '小号手皮普', role: '铜管乐队 · 夜班守卫与第三声部' },
} satisfies Partial<Record<CharacterId, { name: string; role: string }>>;
const door = (
  id: string,
  x: number,
  target: MapId,
  label: string,
  functions: ('battle' | 'shop' | 'workshop' | 'recruit')[],
) => ({ id, x, target, label, functions, kind: 'door' as const, spawn: 130 });
const npc = (id: string, x: number, character: CharacterId, label: string) => ({
  id,
  x,
  character,
  label,
  kind: 'npc' as const,
});
const room = (
  name: string,
  image: string,
  x: number,
  hotspots: MapDefinition['hotspots'],
  width = 1600,
): MapDefinition => ({
  act: 4,
  name,
  subtitle: '米尔布鲁克 · 把下一幕交给伙伴',
  image,
  width,
  height: 810,
  floor: 638,
  cameraY: 64,
  hotspots: [
    {
      id: `${image}-exit`,
      x: 130,
      kind: 'door',
      label: '回到纺织街',
      target: 'millbrook',
      spawn: x,
    },
    ...hotspots,
  ],
});
export const MILLBROOK_MAPS = {
  millbrook: {
    act: 4,
    name: '米尔布鲁克',
    subtitle: '秋 · 烟囱、黄叶与第三声部',
    image: 'millbrook',
    width: 4000,
    height: 1080,
    floor: 875,
    cameraY: 250,
    hotspots: [
      {
        id: 'mb-bus',
        x: 170,
        kind: 'bus',
        label: '北方巡演巴士',
        functions: ['travel', 'troupe'],
      },
      door('mb-hall-door', 620, 'mb-hall', '纺锤联赛会堂', ['battle']),
      door('mb-pub-door', 1080, 'mb-pub', '梭子与茶酒馆', ['recruit']),
      door('mb-mill-door', 1550, 'mb-mill', '老纺织厂后台', ['battle']),
      door('mb-shop-door', 2000, 'mb-shop', '纺锤精工铺', ['shop', 'workshop']),
      door('mb-square-door', 2360, 'mb-square', '铜管广场', ['battle']),
    ],
  },
  'mb-hall': room('纺锤联赛会堂', 'mb-hall', 620, [
    npc('mb-edith', 520, 'edith', '伊迪丝 · 联赛登记'),
    npc('mb-holt', 1180, 'holt', '霍尔特 · 纺锤剧团'),
    {
      id: 'mb-roster',
      x: 850,
      kind: 'board',
      label: '公开阵容与出场顺序',
      functions: ['battle'],
    },
  ]),
  'mb-pub': room('梭子与茶酒馆', 'mb-pub', 1080, [
    npc('mb-stan', 770, 'stan', '斯坦 · 没开口的旧事'),
    npc('mb-dodd', 1200, 'dodd', '多德太太 · 镇志与旧报'),
    {
      id: 'mb-recruits',
      x: 420,
      kind: 'board',
      label: '魔术师招募告示板',
      functions: ['recruit'],
    },
  ]),
  'mb-mill': room('老纺织厂后台', 'mb-mill', 1550, [
    { id: 'mb-wire', x: 400, kind: 'pickup', label: '断掉的灯线' },
    { id: 'mb-ledger', x: 750, kind: 'pickup', label: '庄家的账本' },
    npc('mb-oswald', 1080, 'oswald', '奥斯瓦尔德 · 场务'),
    npc('mb-mia', 1390, 'mia', '米娅 · 修好追光'),
  ]),
  'mb-shop': room(
    '纺锤精工铺',
    'mb-shop',
    2000,
    [
      {
        id: 'mb-shelf',
        x: 500,
        kind: 'board',
        label: '道具与同款改装材料',
        functions: ['shop'],
      },
      npc('mb-shop-mia', 1050, 'mia', '米娅 · 精工工作台'),
    ],
    1280,
  ),
  'mb-square': room('铜管广场', 'mb-square', 2360, [
    npc('mb-pip', 580, 'pip', '皮普 · 铜管乐队'),
    {
      id: 'mb-bonfire',
      x: 1070,
      kind: 'board',
      label: '篝火之夜节目单',
      functions: ['battle'],
    },
    {
      id: 'mb-midnight',
      x: 1380,
      kind: 'board',
      label: '午夜钟声',
      functions: ['battle'],
    },
  ]),
} satisfies Partial<Record<MapId, MapDefinition>>;
export const MILLBROOK_LODGINGS: readonly Lodging[] = [
  {
    id: 'mb-bus',
    name: '米尔布鲁克巴士泊位',
    price: 0,
    beds: 3,
    presence: 0,
    rehearsal: false,
    note: '增添一张折叠床，三个人都能上场。',
  },
  {
    id: 'mb-loft',
    name: '霍尔特太太的茶室楼上',
    price: 6,
    beds: 4,
    presence: 3,
    rehearsal: false,
    recovery: 1,
    note: '茶歇额外恢复 1 档；门前的落叶每天有人扫。',
  },
  {
    id: 'mb-weavers',
    name: '织工合作社排练楼',
    price: 14,
    beds: 6,
    presence: 6,
    rehearsal: true,
    recovery: 1,
    rehearsalBonus: 1,
    note: '排练额外 1 台龄，茶歇额外 1 档。',
  },
  {
    id: 'mb-spindle',
    name: '纺锤剧院驻演楼',
    price: 26,
    beds: 8,
    presence: 10,
    rehearsal: true,
    recovery: 2,
    rehearsalBonus: 2,
    note: '排练额外 2 台龄，茶歇额外 2 档。',
  },
];
const close = (label = '先准备一下'): Choice => ({
  id: 'close',
  label,
  action: { type: 'close' },
});
const go = (id: string, label: string): Choice => ({
  id,
  label,
  action: { type: 'goto', nextDialogue: id },
});
const fight = (battle: BattleId, label: string): Choice => ({
  id: battle,
  label,
  action: { type: 'battle', battle },
});
const panel = (id: 'shop' | 'workshop' | 'dossier'): Choice => ({
  id,
  label: { shop: '看看货架', workshop: '改装道具', dossier: '查看公开档案' }[
    id
  ],
  action: { type: 'panel', panel: id },
});
export const MILLBROOK_BONDS = [
  'mb-stan-start',
  'mb-stan-past',
  'mb-stan-trust',
  'mb-pip-join',
] as const;
export const MILLBROOK_DIALOGUES: Record<string, Dialogue> = {
  'mb-arrival': {
    lines: [
      { speaker: 'stan', text: '米尔布鲁克。到了。……先别按喇叭。' },
      { speaker: 'juno', text: '卖报的叫你“小斯坦”。你欠他们钱？' },
      { speaker: 'stan', text: '不。欠他们四十年前一声晚安。' },
      {
        speaker: 'narrator',
        text: '这里没有个人赛，只有三人剧团联赛。会堂里有人等着问：你带来的，是两个拎箱子的，还是两个伙伴？',
      },
    ],
    effect: { set: ['millArrived'] },
  },
  'mb-register': {
    lines: [
      {
        speaker: 'edith',
        text: '三人一队，各有十格巡演箱、一件遗物和一副牌匣。共用收藏不能一物两配；选好阵容再排出场顺序。',
      },
      { speaker: 'holt', text: '你的个人冠军证我看过。现在请给我看一个剧团。' },
      { speaker: 'eli', text: '我会让每个人的名字都印在节目单上。' },
    ],
    effect: {
      set: ['millRegistered'],
      reward: { fee: 35, items: ['pair', 'ward', 'wash'], relics: ['heart'] },
      once: 'millRegistered',
    },
  },
  'mb-team-needed': {
    lines: [
      {
        speaker: 'edith',
        text: '三人赛还缺能登台的伙伴。先去梭子与茶酒馆找斯坦，或者完成铜管乐队的邀请；再确认有三张床、没有伙伴离家或罢演。巴士已增添第三张床。',
      },
    ],
  },
  'mb-stan-start': {
    lines: [
      {
        speaker: 'stan',
        text: '这次缺第三个人？我可以站一场。别把我的名字印得太大。',
      },
      { speaker: 'eli', text: '和我们的同样大。' },
    ],
    effect: {
      recruit: 'stan',
      affinity: { who: 'stan', amount: 20, id: 'mb-stan-start' },
    },
  },
  'mb-entry': {
    lines: [
      {
        speaker: 'edith',
        text: '常规赛第一场。三个人分别准备道具；首发可以不是团长，顺序由你们决定。有人退场，五秒报幕后下一位接棒，留下的人继续。',
      },
    ],
    choices: [fight('mb-entry', '三人联赛 · 第一轮'), close()],
  },
  'mb-entry-win': {
    lines: [
      {
        speaker: 'juno',
        text: '我知道你会把舞台交过来。下次不用回头确认三遍。',
      },
      {
        speaker: 'edith',
        text: '第一轮盖章。下一轮换对手，换顺序也可以。演出费三十镑，节目单写了三个名字。',
      },
    ],
  },
  'mb-regular': {
    lines: [
      {
        speaker: 'holt',
        text: '第二轮是织工队。别只算自己的胜率，也算下一棒会接到什么。',
      },
    ],
    choices: [fight('mb-regular', '三人联赛 · 第二轮'), close()],
  },
  'mb-regular-win': {
    lines: [
      {
        speaker: 'narrator',
        text: '第二轮盖章。后台忽然熄灯，一只巡演箱被换成了装满煤渣的木盒。',
      },
      {
        speaker: 'juno',
        text: '灯线的切口很新。别急着说是谁干的——先看看留下了什么。',
      },
      {
        speaker: 'holt',
        text: '谁把一场演出当成赌桌，我就把他从剧院请出去。先查清，再重赛。',
      },
    ],
    effect: { set: ['millSabotage'] },
  },
  'mb-wire': {
    lines: [
      {
        speaker: 'mia',
        text: '线是用锅炉房的剪刀剪的。切口上的油和舞台绳索不一样。我带回去接好，你去查调包的箱子。',
      },
    ],
    effect: { set: ['millWire'] },
  },
  'mb-ledger': {
    lines: [
      {
        speaker: 'eli',
        text: '“纺锤必胜，客队退赛。”下面是奥斯瓦尔德收到的五镑，还有一名庄家的签名。',
      },
      { speaker: 'juno', text: '能让所有人看懂的证据。拿给伊迪丝。' },
    ],
    effect: { set: ['millLedger'] },
  },
  'mb-before-evidence': {
    lines: [
      {
        speaker: 'edith',
        text: '断灯线和调包账本都要找到。猜中人不等于查清事情，后台就在老纺织厂。',
      },
    ],
  },
  'mb-expose': {
    lines: [
      {
        speaker: 'edith',
        text: '两份证据对得上。奥斯瓦尔德承认收了钱，庄家的执照已经扣下。',
      },
      {
        speaker: 'holt',
        text: '场务是我的人，损失由我赔。没有暗箱，也没有受害者让步：你们修好灯，公开重赛。',
      },
      { speaker: 'oswald', text: '我把剪刀留下。要是还让我干活，就只剪布。' },
    ],
    effect: { set: ['millExposed'], once: 'millExposed', reward: { fee: 25 } },
  },
  'mb-repair': {
    lines: [
      {
        speaker: 'mia',
        text: '线接好了，箱子拿回来了。我没给任何人的手法加一层秘密，只让大家看得清。',
      },
      { speaker: 'eli', text: '谢谢。下一次，我们一起检查后台。' },
    ],
    effect: { set: ['millRepaired'] },
  },
  'mb-repair-locked': {
    lines: [
      {
        speaker: 'mia',
        text: '先把证据交给会堂。修得好的灯，不该替没查清的事情遮羞。',
      },
    ],
  },
  'mb-rematch': {
    lines: [
      {
        speaker: 'holt',
        text: '公开重赛。气场重新恢复，道具重新登记；不用拿上一场的伤证明勇敢。',
      },
    ],
    choices: [fight('mb-rematch', '重赛 · 光亮的舞台'), close()],
  },
  'mb-rematch-win': {
    lines: [
      {
        speaker: 'holt',
        text: '现在的比分才算数。决赛之前去看看你的司机——这座镇记得他的另一种名字。',
      },
      {
        speaker: 'juno',
        text: '团长，这回你不用一个人负责所有人的情绪。但你得愿意听。',
      },
    ],
  },
  'mb-stan-past': {
    lines: [
      {
        speaker: 'dodd',
        text: '四十年前，少年斯坦在决赛把牌掉了一地。台下有人笑，他没再动。第二天，他去考了巴士驾照。',
      },
      {
        speaker: 'holt',
        text: '那一场我赢了。我一直知道那个孩子比我好——但我没能把这句话说给他听。',
      },
      { speaker: 'eli', text: '那就现在说。先让我找他。' },
    ],
    effect: {
      set: ['stanPast'],
      affinity: { who: 'stan', amount: 20, id: 'mb-stan-past' },
    },
  },
  'mb-stan-trust': {
    lines: [
      { speaker: 'stan', text: '你想让我再站在他对面？我还记得地板上的牌。' },
      {
        speaker: 'eli',
        text: '不是要你把四十年前赢回来。是这一次，掉了牌有人帮你捡。你可以决定上不上台。',
      },
      { speaker: 'stan', text: '……让我把那句晚安说完。' },
    ],
    choices: [
      go('mb-stan-return', '陪斯坦准备好，再去决赛'),
      close('先陪他坐一会'),
    ],
    effect: {
      set: ['stanBond'],
      affinity: { who: 'stan', amount: 20, id: 'mb-stan-trust' },
    },
  },
  'mb-stan-return': {
    lines: [
      {
        speaker: 'stan',
        text: '我练了个新手法：“重新来过”。一场只用一次，把整手牌放回底下，重新发同样张数。不是撤销过去，是继续下一幕。',
      },
    ],
    effect: { set: ['stanReturned'] },
  },
  'mb-stan-after': {
    lines: [
      {
        speaker: 'stan',
        text: '把我排在哪里都行。第三棒也好，首发也好。这一次，我会等伙伴下台。',
      },
    ],
  },
  'mb-roster': {
    lines: [
      {
        speaker: 'edith',
        text: '纺锤阵容公开：织布手伊迪丝、锅炉手奥斯瓦尔德、团长霍尔特。决赛的顺序也是这个顺序。把斯坦放到第三棒，是想让他面对老团长的一个办法；接力比赛谁先退场，仍要看实际发挥。',
      },
    ],
    effect: { set: ['millOrderKnown'] },
  },
  'mb-final': {
    lines: [
      {
        speaker: 'holt',
        text: '决赛。三个人的名字，三只箱子，一个剧团。斯坦，如果你来了，我会认真对待这场比赛。',
      },
      { speaker: 'stan', text: '我也会。请把那块地板扫干净，牌掉了容易找。' },
    ],
    choices: [
      fight('mb-final', '联赛决赛 · 对阵纺锤剧团'),
      panel('dossier'),
      close(),
    ],
  },
  'mb-final-rematch': {
    lines: [
      {
        speaker: 'holt',
        text: '冠军节目单已经收好。要复演就按正式三人赛来；掌声还能有，冠军奖品不会再发一次。',
      },
    ],
    choices: [fight('mb-final', '冠军复演 · 重新排阵'), close()],
  },
  'mb-final-win': {
    lines: [
      {
        speaker: 'holt',
        text: '四十年不是一张不可撕的票。指挥棒交给你——提醒下一位上场，而不是替他表演。',
      },
      {
        speaker: 'stan',
        text: '我把节目演完了。赢的是我们，不是四十年前那个孩子。',
      },
      {
        speaker: 'narrator',
        text: '米尔布鲁克剧团联赛冠军。获得外卡邀请、六十镑演出费与“霍尔特的指挥棒”。下一站奥罗拉，先把这一幕的名字收进节目单。',
      },
    ],
    effect: { keepsake: '霍尔特的指挥棒' },
  },
  'mb-loss': {
    lines: [
      {
        speaker: 'edith',
        text: '这一场没盖胜章。布阵、牌匣和出场顺序都可以重新调整，伙伴也需要休息；登记一直有效，重来不会再收费。',
      },
    ],
  },
  'mb-final-loss': {
    lines: [
      {
        speaker: 'holt',
        text: '比分我赢了。斯坦，这一次你没有走开。比赛可以重来，你完成的那一幕已经留下了。',
      },
      { speaker: 'stan', text: '明天再来。我还负责把所有人送到门口。' },
    ],
  },
  'mb-bookmaker': {
    lines: [
      {
        speaker: 'dodd',
        text: '庄家被罚去给社区扫落叶。他说秋天太长，我告诉他：你的账也一样。押比赛的人拿回了钱，不是赢了钱。',
      },
    ],
    effect: {
      set: ['millBookmaker'],
      once: 'millBookmaker',
      reward: { fee: 8 },
    },
  },
  'mb-pip': {
    lines: [
      {
        speaker: 'pip',
        text: '铜管乐队也报三人。拿两位伙伴来，咱们看看谁能接住最后一个尾音。赢了之后，你们若还缺一张椅子，我想坐坐。',
      },
    ],
    choices: [fight('mb-brass', '铜管乐队 · 三声部'), close()],
  },
  'mb-pip-win': {
    lines: [
      {
        speaker: 'pip',
        text: '你们知道什么时候不抢音。邀请留给团长来开口，我不会偷偷把小号搬上巴士。',
      },
    ],
  },
  'mb-pip-invite': {
    lines: [
      {
        speaker: 'pip',
        text: '夜班的钟声是我练小号，不是鬼。随团每周四镑，晚饭后我练得小声一点。',
      },
    ],
    choices: [go('mb-pip-join', '邀请皮普随团'), close()],
  },
  'mb-pip-join': {
    lines: [{ speaker: 'pip', text: '收到。第三声部有了位置。' }],
    effect: {
      recruit: 'pip',
      set: ['pipJoined'],
      affinity: { who: 'pip', amount: 30, id: 'mb-pip-join' },
    },
  },
  'mb-pip-member': {
    lines: [{ speaker: 'pip', text: '我把最响的音留到大家一起鞠躬的时候。' }],
  },
  'mb-bonfire': {
    lines: [
      {
        speaker: 'pip',
        text: '篝火之夜的特别演出。三人接力，不限制花色；火星会照亮舞台，护盾和净化仍然管用。十一月五日那张方块牌，藏在最后一声炮响里。',
      },
    ],
    choices: [fight('mb-bonfire', '篝火之夜 · 点亮节目单'), close()],
  },
  'mb-bonfire-win': {
    lines: [
      {
        speaker: 'narrator',
        text: '烟花不是给最强的人，是给留下来的人。获得方块五“十一月五日”与二十四镑。',
      },
    ],
    effect: { set: ['millBonfire'] },
  },
  'mb-night': {
    lines: [
      {
        speaker: 'pip',
        text: '午夜钟声不是鬼，是我拿钟当节拍器。今晚有三位守夜人一起演；白天也能补听，怪谈不催你熬夜。',
      },
    ],
    choices: [fight('mb-night', '午夜钟声 · 守夜人的排练'), close()],
  },
  'mb-night-win': {
    lines: [
      {
        speaker: 'narrator',
        text: '厂房的钟声最后落在一个小号音上。怪谈解开，二十镑进帽子，镇志留下了一行温暖的解释。',
      },
    ],
    effect: { set: ['millMidnight'] },
  },
  'mb-shop': {
    lines: [
      {
        speaker: 'mia',
        text: '银级校准十二镑，金级精制二十八镑再加一件同款材料。每件东西改自己的效果，说明里的数字就是改完的数字。材料可以买，已装进巡演箱的那件不会被吃掉。',
      },
    ],
    choices: [panel('workshop'), panel('shop'), close()],
  },
  'mb-oswald': {
    lines: [
      {
        speaker: 'oswald',
        text: '我收过那五镑。现在每天开场前检查灯、绳子和箱子——你可以亲自看。',
      },
    ],
  },
  'mb-departure': {
    lines: [
      {
        speaker: 'stan',
        text: '还是开车比较适合我。不过谢谢你。后台那个厕所，四十年前我躲在那里。今天我终于从正门出去了。',
      },
      { speaker: 'eli', text: '下一张节目单也写我们所有人的名字。' },
      {
        speaker: 'narrator',
        text: '第四幕完：一个剧团的团长。奥罗拉的邀请已经收到，商业都会是下一幕的故事；米尔布鲁克仍可回访。',
      },
    ],
    effect: { set: ['millDeparted'], complete: true },
  },
  'mb-bus-choice': {
    lines: [
      { speaker: 'stan', text: '要收好这张联赛节目单，还是进巴士看看大家？' },
    ],
    choices: [
      { id: 'enter-bus', label: '进入巡演巴士', action: { type: 'enter-bus' } },
      go('mb-departure', '收好节目单 · 第四幕落幕'),
      close('再逛一逛'),
    ],
  },
};
const books = {
  guard: {
    '0-2': 'lining',
    '0-4': 'lining',
    '0-6': 'lining',
    '0-8': 'lining',
    '0-10': 'lining',
    '1-3': 'edge',
    '2-7': 'edge',
    '3-9': 'edge',
    '0-12': 'gold',
    '0-13': 'gold',
    '0-14': 'LSA',
  },
  burn: {
    '3-2': 'seal',
    '3-3': 'seal',
    '3-4': 'seal',
    '3-6': 'seal',
    '3-7': 'seal',
    '3-8': 'seal',
    '3-9': 'seal',
    '3-10': 'seal',
    '3-12': 'gold',
    '3-13': 'gold',
    '3-5': 'LD5',
  },
  combo: {
    '0-7': 'silver',
    '1-8': 'silver',
    '2-9': 'silver',
    '3-10': 'silver',
    '0-4': 'edge',
    '1-5': 'edge',
    '2-6': 'edge',
    '3-7': 'edge',
    '0-12': 'gold',
    '1-13': 'gold',
    '0-11': 'LSJ',
  },
};
export const MILLBROOK_BATTLES: Partial<Record<BattleId, BattleDefinition>> = {
  'mb-entry': {
    act: 4,
    teamSize: 3,
    title: '剧团联赛 · 第一轮',
    opponent: 'edith',
    performer: 'edith',
    style: 'quick',
    presence: 285,
    reward: { fee: 30 },
    fame: 2,
    win: 'mb-entry-win',
    loss: 'mb-loss',
  },
  'mb-regular': {
    act: 4,
    teamSize: 3,
    title: '剧团联赛 · 织工队',
    opponent: 'oswald',
    performer: 'oswald',
    style: 'burn',
    presence: 340,
    reward: { fee: 35, items: ['cinder', 'stride'] },
    fame: 3,
    win: 'mb-regular-win',
    loss: 'mb-loss',
  },
  'mb-rematch': {
    act: 4,
    teamSize: 3,
    title: '公开重赛 · 光亮的舞台',
    opponent: 'edith',
    performer: 'edith',
    style: 'guard',
    presence: 350,
    book: books.guard,
    reward: { fee: 40, items: ['drain'] },
    fame: 3,
    win: 'mb-rematch-win',
    loss: 'mb-loss',
  },
  'mb-final': {
    act: 4,
    teamSize: 3,
    title: '联赛决赛 · 纺锤剧团',
    opponent: 'edith',
    performer: 'edith',
    style: 'guard',
    presence: 365,
    book: books.guard,
    formal: true,
    boss: true,
    reward: { fee: 60, relics: ['echo'], variants: ['0-8:lining', '1-9:mint'] },
    winFlags: ['millChampion'],
    fame: 5,
    win: 'mb-final-win',
    loss: 'mb-final-loss',
  },
  'mb-brass': {
    act: 4,
    teamSize: 3,
    title: '铜管乐队 · 三声部',
    opponent: 'pip',
    performer: 'pip',
    style: 'guard',
    presence: 330,
    book: { ...PERFORMERS.pip.book },
    reward: { fee: 25, items: ['compass'] },
    fame: 2,
    win: 'mb-pip-win',
    loss: 'mb-loss',
  },
  'mb-bonfire': {
    act: 4,
    teamSize: 3,
    title: '篝火之夜 · 烟花与煤火',
    opponent: 'oswald',
    performer: 'oswald',
    style: 'burn',
    presence: 350,
    book: books.burn,
    reward: { fee: 24, variants: ['3-5:LD5'] },
    fame: 2,
    win: 'mb-bonfire-win',
    loss: 'mb-loss',
  },
  'mb-night': {
    act: 4,
    teamSize: 3,
    title: '午夜钟声 · 三名守夜人',
    opponent: 'pip',
    performer: 'pip',
    style: 'mend',
    presence: 335,
    reward: { fee: 20, variants: ['1-8:mint'] },
    fame: 2,
    win: 'mb-night-win',
    loss: 'mb-loss',
  },
};
export function millbrookReserves(kind: BattleId): DuelReserve[] {
  const final = kind === 'mb-final';
  const first = MILLBROOK_BATTLES[kind]?.performer;
  const ids: ('edith' | 'oswald' | 'holt')[] =
    first === 'oswald'
      ? ['edith', 'holt']
      : first === 'pip'
        ? ['edith', 'holt']
        : ['oswald', 'holt'];
  return ids.map((performer): DuelReserve => {
    const style =
      performer === 'edith'
        ? 'guard'
        : performer === 'oswald'
          ? 'burn'
          : 'combo';
    return {
      performer,
      name: MILLBROOK_CAST[performer].name,
      style,
      items: [...PRESETS[style].items],
      relic: PRESETS[style].relic,
      presence: final
        ? performer === 'holt'
          ? 395
          : 375
        : kind === 'mb-entry'
          ? performer === 'holt'
            ? 310
            : 290
          : performer === 'holt'
            ? 350
            : 330,
      book: final
        ? books[style]
        : performer === 'edith'
          ? { '0-4': 'lining', '0-8': 'lining' }
          : performer === 'oswald'
            ? { '3-4': 'seal', '3-8': 'seal' }
            : { '0-7': 'silver', '1-8': 'silver' },
    };
  });
}
export const MILLBROOK_SHOP: readonly ShopOffer[] = [
  ...(
    [
      'quick',
      'tempo',
      'needle',
      'stride',
      'draw',
      'pair',
      'ward',
      'wash',
      'mend',
      'cinder',
      'bellows',
      'poison',
      'venom',
      'slow',
      'sequence',
      'suit',
      'focus',
      'umbrella',
      'thorns',
      'shieldbash',
      'drain',
      'growth',
      'compass',
      'ash',
      'sequin',
      'tailcoat',
    ] as const
  ).map((id) => ({
    id: `mb-${id}`,
    kind: 'item' as const,
    ref: id,
    price: ['sequence', 'focus', 'shieldbash'].includes(id)
      ? 28
      : ['sequin', 'tailcoat', 'growth'].includes(id)
        ? 24
        : 18,
    note: '原件与同款材料均有货；金级精制消耗材料，不消耗已装备原件。',
  })),
  {
    id: 'mb-capacity',
    kind: 'relic',
    ref: 'capacity',
    price: 35,
    note: '节目单更长，口袋也要更深。',
  },
  {
    id: 'mb-echo',
    kind: 'relic',
    ref: 'echo',
    price: 35,
    note: '已经冷过一次场，也能让余响回来。',
  },
  {
    id: 'mb-gold',
    kind: 'variant',
    ref: '2-12:gold',
    price: 35,
    note: '台上的金，不比织布手的针贵重。',
  },
];
export const MILLBROOK_RUMOURS: Partial<Record<BattleId, readonly Rumour[]>> = {
  'mb-final': [
    {
      id: 'mb-final-paper',
      source: 'paper',
      unit: 'style',
      truth: true,
      text: '决赛首发伊迪丝：黑桃护盾。纺锤三人箱子公开，接棒顺序可问秘书。',
    },
    {
      id: 'mb-final-pub',
      source: 'pub',
      unit: 'style',
      truth: true,
      text: '老团长收尾：伊迪丝 → 奥斯瓦尔德 → 霍尔特。比谁先上场更重要的是谁能把伙伴留到最后。',
    },
  ],
};
export function millbrookTalk(s: AdventureState, id: string): string | null {
  const f = s.flags,
    won = (key: BattleId) => s.won.includes(key);
  if (id === 'mb-stan')
    return !s.troupe.includes('stan')
      ? 'mb-stan-start'
      : !f.stanPast
        ? 'mb-stan-start'
        : !f.stanBond
          ? 'mb-stan-trust'
          : !f.stanReturned
            ? 'mb-stan-return'
            : 'mb-stan-after';
  if (id === 'mb-edith' || id === 'mb-holt') {
    if (!f.millRegistered) return 'mb-register';
    if (!won('mb-entry')) return 'mb-entry';
    if (!won('mb-regular')) return 'mb-regular';
    if (!f.millExposed)
      return f.millWire && f.millLedger ? 'mb-expose' : 'mb-before-evidence';
    if (!f.millRepaired) return 'mb-repair-locked';
    if (!won('mb-rematch')) return 'mb-rematch';
    if (!f.stanReturned) return 'mb-stan-past';
    return f.millChampion
      ? id === 'mb-holt'
        ? 'mb-final-rematch'
        : 'mb-roster'
      : 'mb-final';
  }
  if (id === 'mb-roster') return 'mb-roster';
  if (id === 'mb-wire' || id === 'mb-ledger')
    return f.millSabotage ? id : 'mb-oswald';
  if (id === 'mb-mia')
    return f.millExposed && !f.millRepaired ? 'mb-repair' : 'mb-repair-locked';
  if (id === 'mb-shop-mia') return 'mb-shop';
  if (id === 'mb-shelf') return 'panel:shop';
  if (id === 'mb-oswald') return 'mb-oswald';
  if (id === 'mb-dodd')
    return f.millExposed && !f.millBookmaker
      ? 'mb-bookmaker'
      : won('mb-rematch')
        ? 'mb-stan-past'
        : 'mb-roster';
  if (id === 'mb-pip')
    return s.troupe.includes('pip')
      ? 'mb-pip-member'
      : won('mb-brass')
        ? 'mb-pip-invite'
        : 'mb-pip';
  if (id === 'mb-bonfire') return 'mb-bonfire';
  if (id === 'mb-midnight') return 'mb-night';
  if (id === 'mb-recruits') return 'panel:recruits';
  return null;
}
const objective = (
  s: AdventureState,
  title: string,
  detail: string,
  map: MapId,
  target: string,
): Objective => ({
  title,
  detail,
  target:
    s.map === map
      ? target
      : s.map === 'millbrook'
        ? `${map}-door`
        : `${s.map}-exit`,
});
export function millbrookObjective(s: AdventureState): Objective {
  const f = s.flags;
  if (!f.millRegistered)
    return objective(
      s,
      '登记三人剧团联赛',
      '去纺锤会堂，听伊迪丝说明各自布阵与接力规矩。',
      'mb-hall',
      'mb-edith',
    );
  if (!s.troupe.includes('stan') && s.troupe.length < 3)
    return objective(
      s,
      '请斯坦加入节目单',
      '去梭子与茶酒馆，第三个人有自己的名字。',
      'mb-pub',
      'mb-stan',
    );
  if (!s.won.includes('mb-entry'))
    return objective(
      s,
      '三人常规赛 · 第一轮',
      '分别布阵、选择成员和顺序，所有人都能接棒。',
      'mb-hall',
      'mb-edith',
    );
  if (!s.won.includes('mb-regular'))
    return objective(
      s,
      '三人常规赛 · 第二轮',
      '继续联赛，准备接住伙伴留下的局面。',
      'mb-hall',
      'mb-holt',
    );
  if (!f.millWire)
    return objective(
      s,
      '被破坏的后台 · 断灯线',
      '去老纺织厂检查切口，先找证据。',
      'mb-mill',
      'mb-wire',
    );
  if (!f.millLedger)
    return objective(
      s,
      '被破坏的后台 · 庄家账本',
      '查清调包箱子里留下的付款记录。',
      'mb-mill',
      'mb-ledger',
    );
  if (!f.millExposed)
    return objective(
      s,
      '公开证据',
      '把两份证据交给伊迪丝，不靠猜测定罪。',
      'mb-hall',
      'mb-edith',
    );
  if (!f.millRepaired)
    return objective(
      s,
      '修好追光',
      '找后台的米娅恢复演出，霍尔特承担损失。',
      'mb-mill',
      'mb-mia',
    );
  if (!s.won.includes('mb-rematch'))
    return objective(
      s,
      '公开重赛',
      '回会堂打一场没有暗箱的比赛。',
      'mb-hall',
      'mb-holt',
    );
  if (!f.stanPast)
    return objective(
      s,
      '听完四十年前的故事',
      '去酒馆找多德太太，或与霍尔特聊聊。',
      'mb-pub',
      'mb-dodd',
    );
  if (!f.stanReturned)
    return objective(
      s,
      '陪斯坦重返舞台',
      '去酒馆告诉他：这一次，有人帮忙捡牌。',
      'mb-pub',
      'mb-stan',
    );
  if (!f.millChampion)
    return objective(
      s,
      '联赛决赛 · 纺锤剧团',
      '公开阵容、打听顺序，按真实三人队伍备战。',
      'mb-hall',
      'mb-holt',
    );
  return {
    title: '把所有名字收进节目单',
    detail: '回巴士完成第四幕；也可继续支线与剧团生活。',
    target: s.map === 'millbrook' ? 'mb-bus' : `${s.map}-exit`,
  };
}
export function millbrookSideObjectives(s: AdventureState): Objective[] {
  return [
    ...(!s.troupe.includes('pip')
      ? [
          objective(
            s,
            '铜管乐队的第三声部',
            '三声部演出首胜后，可邀请皮普随团。',
            'mb-square',
            'mb-pip',
          ),
        ]
      : []),
    ...(!s.flags.millBonfire
      ? [
          objective(
            s,
            '篝火之夜',
            '烟花节目单与方块五“十一月五日”。',
            'mb-square',
            'mb-bonfire',
          ),
        ]
      : []),
    ...(!s.flags.millMidnight
      ? [
          objective(
            s,
            '纺织厂午夜钟声',
            '去铜管广场听守夜人的答案。',
            'mb-square',
            'mb-midnight',
          ),
        ]
      : []),
    ...(s.flags.millExposed && !s.flags.millBookmaker
      ? [
          objective(
            s,
            '庄家的下场',
            '问问酒馆里的多德太太。',
            'mb-pub',
            'mb-dodd',
          ),
        ]
      : []),
  ];
}
