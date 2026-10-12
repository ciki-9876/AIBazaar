import type { AdventureState, BattleDefinition, BattleId, CharacterId, Choice, Dialogue, MapDefinition, MapId, Objective, Rumour, ShopOffer } from './adventure-types.ts';
import type { Lodging } from './bridgeport.ts';
import { PERFORMERS } from '../cards/throw-performer.ts';

/** Chapter three: public evidence, counter-intelligence, and a clean best-of-three final. */
export const WESTPORT_CAST = {
  nora: { name: '诺拉·哈特', role: '职业联赛选手 · 只相信证据' },
  theo: { name: '西奥·格兰特', role: '港口公报记者 · 暂时不相信奇迹' },
  molly: { name: '午夜莫莉', role: '《慢慢来》主持人 · 红心疗愈师' },
  brannigan: { name: '船长布兰尼根', role: '九十岁的水下逃脱师 · 游泳不错' },
  kit: { name: '基特', role: '地铁卖艺人联盟 · 帽子里的硬币由他数' },
  vale: { name: '维尔', role: '港口联赛选手 · 风琴从不离手' },
} satisfies Partial<Record<CharacterId, { name: string; role: string }>>;
const interior = (name: string, subtitle: string, image: string, width = 1800, height = 810): Omit<MapDefinition, 'hotspots'> => ({ act: 3, name, subtitle, image, width, height, floor: height === 720 ? 604 : 638, cameraY: height === 720 ? 0 : 64 });
export const WESTPORT_MAPS = {
  westport: { act: 3, name: '韦斯特港', subtitle: '夏 · 报纸比海风先到', image: 'westport', width: 2560, height: 1080, floor: 875, cameraY: 250, hotspots: [
    { id: 'wp-bus', x: 170, label: '城际巴士站', kind: 'bus' },
    { id: 'theo', x: 410, label: '西奥·格兰特', kind: 'npc', character: 'theo' },
    { id: 'league-door', x: 620, label: '职业联赛大厅', kind: 'door', target: 'league', spawn: 130 },
    { id: 'radio-door', x: 1040, label: '午夜广播塔', kind: 'door', target: 'radio', spawn: 130 },
    { id: 'subway-door', x: 1380, label: '地铁卖艺人联盟', kind: 'door', target: 'subway', spawn: 130 },
    { id: 'westshop-door', x: 1750, label: '海风修缮工坊', kind: 'door', target: 'westshop', spawn: 130 },
    { id: 'wp-pub-door', x: 2040, label: '盐风酒馆', kind: 'door', target: 'wp-pub', spawn: 130 },
    { id: 'docks-door', x: 2340, label: '旧栈桥', kind: 'door', target: 'docks', spawn: 130 },
  ] },
  league: { ...interior('职业联赛大厅', '研究别人，也被别人研究', 'westport-league'), hotspots: [
    { id: 'league-exit', x: 130, label: '返回港口街', kind: 'door', target: 'westport', spawn: 620 },
    { id: 'league-bill', x: 420, label: '联赛公报与战术档案', kind: 'board' },
    { id: 'vale', x: 760, label: '维尔', kind: 'npc', character: 'vale' },
    { id: 'nora', x: 1320, label: '诺拉·哈特', kind: 'npc', character: 'nora' },
  ] },
  radio: { ...interior('午夜广播塔', '《慢慢来》正在直播', 'westport-radio', 1440), hotspots: [
    { id: 'radio-exit', x: 130, label: '返回港口街', kind: 'door', target: 'westport', spawn: 1040 },
    { id: 'radio-theo', x: 580, label: '直播采访 · 西奥', kind: 'npc', character: 'theo' },
    { id: 'molly', x: 1050, label: '午夜莫莉', kind: 'npc', character: 'molly' },
  ] },
  docks: { ...interior('旧栈桥', '海风没有买票，也没有离场', 'westport-docks'), hotspots: [
    { id: 'docks-exit', x: 130, label: '返回港口街', kind: 'door', target: 'westport', spawn: 2340 },
    { id: 'felix', x: 620, label: '菲利克斯·克罗', kind: 'npc', character: 'felix' },
    { id: 'brannigan', x: 1150, label: '船长布兰尼根', kind: 'npc', character: 'brannigan' },
    { id: 'coast-board', x: 1550, label: '海边七日档期', kind: 'board' },
  ] },
  subway: { ...interior('地铁卖艺人联盟', '下一班列车：等你演完', 'westport-subway'), hotspots: [
    { id: 'subway-exit', x: 130, label: '返回港口街', kind: 'door', target: 'westport', spawn: 1380 },
    { id: 'kit', x: 740, label: '基特 · 双人团体赛', kind: 'npc', character: 'kit' },
    { id: 'subway-vale', x: 1120, label: '维尔 · 午后排练', kind: 'npc', character: 'vale' },
  ] },
  westshop: { ...interior('海风修缮工坊', '修好道具，也修好夸张的报价', 'westport-workshop', 1280, 720), hotspots: [
    { id: 'westshop-exit', x: 130, label: '返回港口街', kind: 'door', target: 'westport', spawn: 1750 },
    { id: 'mia', x: 850, label: '米娅 · 改装工作台', kind: 'npc', character: 'mia' },
    { id: 'westshop-shelf', x: 480, label: '港口道具柜', kind: 'board' },
  ] },
  'wp-pub': { ...interior('盐风酒馆', '港口消息与招募告示', 'westport-pub', 1440), hotspots: [
    { id: 'wp-pub-exit', x: 130, label: '返回港口街', kind: 'door', target: 'westport', spawn: 2040 },
    { id: 'wp-recruits', x: 420, label: '招募告示板', kind: 'board' },
    { id: 'wp-stan', x: 810, label: '司机斯坦', kind: 'npc', character: 'stan' },
    { id: 'pub-molly', x: 1120, label: '午夜莫莉', kind: 'npc', character: 'molly' },
    { id: 'pub-rosie', x: 1260, label: '罗茜 · 港口客座厨师', kind: 'npc', character: 'rosie', when: (s) => !s.troupe.includes('rosie') },
  ] },
} satisfies Partial<Record<MapId, MapDefinition>>;

export const WESTPORT_LODGINGS: readonly Lodging[] = [
  { id: 'wp-bus', name: '港口巴士泊位', price: 0, beds: 2, presence: 0, rehearsal: false, note: '车窗朝海。海鸥负责叫早，不收工资。', recovery: 0, rehearsalBonus: 0 },
  { id: 'wp-friend', name: '旧灯塔看守屋', price: 5, beds: 3, presence: 2, rehearsal: false, note: '朱诺的朋友借出的第一处根据地；首次借住期间免租，搬走后不再免费。', recovery: 0, rehearsalBonus: 0 },
  { id: 'wp-netloft', name: '盐风晒网阁', price: 8, beds: 4, presence: 3, rehearsal: false, note: '茶歇额外恢复 1 档心情。晾网间隙，也能晾一晾坏情绪。', recovery: 1, rehearsalBonus: 0 },
  { id: 'wp-warehouse', name: '六码头排练仓', price: 18, beds: 6, presence: 6, rehearsal: true, note: '隔音的旧货仓；每次排练额外获得 1 点台龄。', recovery: 1, rehearsalBonus: 1 },
  { id: 'wp-radio-suite', name: '广播塔驻演公寓', price: 30, beds: 8, presence: 10, rehearsal: true, note: '广播室开放给剧团；排练额外 2 点台龄，茶歇恢复 2 档心情。', recovery: 2, rehearsalBonus: 2 },
];
const fight = (battle: BattleId, label = '开始对决'): Choice => ({ id: battle, label, action: { type: 'battle', battle } });
const close = (label = '我再准备一下'): Choice => ({ id: 'close', label, action: { type: 'close' } });
const go = (id: string, label: string): Choice => ({ id, label, action: { type: 'goto', nextDialogue: id } });
const panel = (id: 'shop' | 'dossier' | 'workshop'): Choice => ({ id, label: { shop: '看看港口货架', dossier: '查看战术档案', workshop: '改装道具' }[id], action: { type: 'panel', panel: id } });
export const WESTPORT_DIALOGUES: Record<string, Dialogue> = {
  'wp-arrival': { lines: [
    { speaker: 'narrator', text: '韦斯特港，夏。高架桥载着列车，列车载着报纸，报纸载着你的脸。标题是：“乡村奇迹还能维持多久？”' },
    { speaker: 'juno', text: '打败了我，还要被叫奇迹？他们应该给我付版权费。我们的剧团从这里正式开张：住处、排练、伙伴和工钱，一样都不能只写在纸上。' },
    { speaker: 'stan', text: '行李我先送去旧灯塔看守屋。朱诺的朋友把钥匙留给管家了；这回不用睡在轮子上。' },
    { speaker: 'eli', text: '先跟朱诺去拿钥匙。我们的第一处根据地，总得自己开门。' },
  ], effect: { set: ['westArrived', 'troupeGuided'] } },
  'wp-register': { lines: [
    { speaker: 'nora', text: '诺拉·哈特。我看了你四场公开对局。作为研究材料，有点单薄；作为一个开始，还不坏。' },
    { speaker: 'eli', text: '我该谢谢你，还是收阅读费？' },
    { speaker: 'nora', text: '先打常规赛。维尔在左边。职业选手会研究你常用的套路，你也可以看联赛公报、打听和观摩。研究是允许的，偷看箱子不是。' },
  ], effect: { set: ['westRegistered'] } },
  'wp-entry': { lines: [{ speaker: 'vale', text: '欢迎职业联赛。我的风琴给红心留了位置，你最好给自己的对策也留一格。' }], choices: [fight('wp-entry'), panel('dossier'), close()] },
  'wp-entry-win': { lines: [{ speaker: 'vale', text: '你赢了。下一轮他们会带着你的公开档案来。别让同一个箱子替你回答所有问题。' }, { speaker: 'narrator', text: '联赛首轮：获得 20 演出费与回暖小灯。' }] },
  'wp-counter': { lines: [{ speaker: 'vale', text: '这回我研究过你的上一场。要继续用那一招，还是给我的笔记留个空白？' }], choices: [fight('wp-counter', '出战侦察局'), panel('dossier'), close()] },
  'wp-counter-win': { lines: [{ speaker: 'vale', text: '我的准备太具体了……奇怪，经纪人给我的那张配置，连你箱子的划痕都写上了。去栈桥问问那个戴高帽的暖场演员。' }, { speaker: 'narrator', text: '获得 24 演出费。线索指向菲利克斯。' }] },
  'wp-loss': { lines: [{ speaker: 'narrator', text: '这一场没拿下。对手实际使用的配置已记进档案，演出费和物品不会丢失。调整箱子，随时再来。' }] },
  'wp-felix-before': { lines: [{ speaker: 'felix', text: '别看我。我在研究海鸥。它们甩东西非常不讲礼貌。' }] },
  'wp-leak': { lines: [
    { speaker: 'eli', text: '别人拿着我的箱子清单，清单上的墨水跟你的报幕稿一样。' },
    { speaker: 'felix', text: '我被降成暖场了。房租不肯跟着降。经纪人只买一个箱子的消息……我没想到你会认得墨水。' },
    { speaker: 'eli', text: '你卖出去的，也包括我们以前打过的那场。现在我来决定这份消息怎么收尾。' },
  ], choices: [go('wp-expose', '向联赛揭发泄密'), go('wp-false-case', '让他传出一个假箱子'), close('让我考虑一下')], effect: { set: ['leakFound'] } },
  'wp-expose': { lines: [{ speaker: 'theo', text: '证据我收下。新闻不是凭讨厌一个人写的。联赛会取消那位经纪人的后台资格。' }], effect: { set: ['felixExposed'] } },
  'wp-false-case': { lines: [{ speaker: 'eli', text: '再卖一次。这次卖我让你看的箱子。然后把事情告诉诺拉。' }, { speaker: 'felix', text: '我这辈子第一次因为诚实地撒谎而感到不安。' }], effect: { set: ['felixForgiven'] } },
  'wp-statement': { lines: [{ speaker: 'nora', text: '经纪人被我辞掉了。我公开自己的战术笔记，是希望别人研究我，不是让我有理由偷看别人。那些配置，我拒绝使用。' }, { speaker: 'eli', text: '那就靠自己的判断。' }, { speaker: 'nora', text: '广播塔有赛前采访。说完，再来打三局两胜。第一局我出黑桃护盾；这条笔记是真话，后面的局要自己看。' }], effect: { set: ['noraStatement'] } },
  'wp-interview-locked': { lines: [{ speaker: 'theo', text: '直播提纲还没写完。先把联赛和泄密的事办妥，我们再谈运气。' }] },
  'wp-interview': { lines: [{ speaker: 'theo', text: '运气还能持续多久？这是编辑给我的问题。我个人觉得他该换一张纸了。下一场你准备怎么打？' }], choices: [go('wp-broadcast-honest', '让他们看完比赛再决定标题'), go('wp-broadcast-bluff', '宣布自己将坚持蓄牌的大招'), close('采访稍后再开始') ] },
  'wp-broadcast-honest': { lines: [{ speaker: 'eli', text: '你可以看完比赛，再决定标题。' }, { speaker: 'theo', text: '行。我把那一栏先空着。' }], effect: { set: ['broadcastDone'] } },
  'wp-broadcast-bluff': { lines: [{ speaker: 'eli', text: '我会一直攒牌，等一个最大的牌型。你们可以写在头条上。' }, { speaker: 'theo', text: '我会准确引用。至于你是否真的这么打，那是下一篇报道的事。' }], effect: { set: ['broadcastDone', 'broadcastBluff'] } },
  'wp-nora-start': { lines: [{ speaker: 'nora', text: '三局两胜。第一局是我的黑桃护盾；每局结束可以重新布阵，前一局的气场不带到下一局。你赢两局，职业赛名额就是你的。' }], choices: [fight('wp-nora-1', '开始系列赛第一局'), panel('dossier'), close()], effect: { resetSeries: true } },
  'wp-nora-round': { lines: [{ speaker: 'nora', text: '这一局记下了。下一局换箱子；你可以先去准备，也可以读读刚才的档案。' }] },
  'wp-nora-lost': { lines: [{ speaker: 'nora', text: '这一轮系列赛我先赢两局。你不是没有机会，只是还在用第一局回答第三局。重新准备，我等你。' }] },
  'wp-nora-win': { lines: [{ speaker: 'nora', text: '这次我输给了你的判断，不是没见过的招。我的笔记给你；下次换你写批注。' }, { speaker: 'theo', text: '更正启事：“本报此前称伊莱·维尔为乡村奇迹，有误。他不是奇迹。他是一位职业选手。”' }, { speaker: 'narrator', text: '获得职业巡演证、60 演出费、织序风扇与星光放映机。下一站：米尔布鲁克。支线和海边档期仍可继续完成。' }] },
  'wp-nora-after': { lines: [{ speaker: 'nora', text: '别忘了给我寄你的新笔记。只寄公开的那部分。' }] },
  'wp-brannigan-first': { lines: [{ speaker: 'brannigan', text: '你问那位溺水的魔术师？多年前他钻进水箱，再没上来——至少没从同一边上来。去找西奥，报纸最会记欠账。' }], effect: { set: ['branniganAsked'] } },
  'wp-brannigan-clue': { lines: [{ speaker: 'theo', text: '1926 年的报道写着水下逃脱师欠了四镑六便士。第二天，一艘拖船多了一名会把硬币从耳后拿出来的水手。船长就是布兰尼根。' }], effect: { set: ['branniganClue'] } },
  'wp-brannigan-fight': { lines: [{ speaker: 'brannigan', text: '不是溺水，是躲债。后来我买下了那艘船，债主却搬走了。来，在栈桥上把那场戏演完。水箱免了，我关节怕潮。' }], choices: [fight('wp-brannigan', '演完水下逃脱的最后一幕'), close()] },
  'wp-brannigan-win': { lines: [{ speaker: 'brannigan', text: '掌声比当年小了一点，但我听见了。锅炉里的火给你；这回我从正门离场。' }, { speaker: 'narrator', text: '获得 25 演出费、余烬煤球与余烬小炉。《港口公报》：溺水魔术师现身还钱，金额四镑六便士。' }] },
  'wp-brannigan-after': { lines: [{ speaker: 'brannigan', text: '人不能一辈子靠憋气。尤其九十岁以后。' }] },
  'wp-molly-first': { lines: [{ speaker: 'molly', text: '欢迎《慢慢来》。今晚听众点三首歌，每首是一场对决：红心、雨伞、午夜的苔藓。打完，我们再谈把电台搬上你的巴士。' }], choices: [fight('wp-molly-1', '点歌第一场 · 红心'), close()], effect: { set: ['mollyMet'] } },
  'wp-molly-round': { lines: [{ speaker: 'molly', text: '这首播完了。听众选了下一首，换一下箱子再来吧。' }] },
  'wp-molly-win': { lines: [{ speaker: 'molly', text: '三首都唱完了。大家说你肯听别人把话说完，我觉得这比一个好标题更有用。等你有空，我想聊聊随团的事。' }, { speaker: 'narrator', text: '获得 20 演出费、回暖小灯与清露药包。莫莉对你的好感已足够邀请。' }] },
  'wp-molly-invite': { lines: [{ speaker: 'molly', text: '电台有录音带，路上有新的听众。你愿意给剧团留一个慢慢来的位置吗？' }], choices: [go('wp-molly-join', '邀请午夜莫莉加入'), close('下次聊')] },
  'wp-molly-join': { lines: [{ speaker: 'molly', text: '那我带上麦克风。每周五镑；难过的时候，点歌免费。' }], effect: { recruit: 'molly', set: ['mollyJoined'] } },
  'wp-molly-member': { lines: [{ speaker: 'molly', text: '我把今天的歌排好了。下一首留给刚回来的伙伴。' }] },
  'wp-relay': { lines: [{ speaker: 'kit', text: '地铁的规矩：两人一队。一个退场，另一个接上。中间有五秒报幕，灯光重新从开场开始；台上留下的人保留气场和手牌。直到一边两人都退场才分胜负。你的伙伴可不是替你拎箱子的。' }], choices: [fight('wp-relay', '参加双人团体赛'), close()] },
  'wp-relay-needs-partner': { lines: [{ speaker: 'kit', text: '双人赛要有两个人。去剧团住处看看，先让一位愿意上场的伙伴准备好；离家和罢演中的伙伴不能出赛。' }] },
  'wp-relay-win': { lines: [{ speaker: 'kit', text: '你们会把舞台交给彼此。联盟欢迎这样的剧团。帽子里的硬币我数过：三十镑，没算纽扣。' }, { speaker: 'narrator', text: '获得 30 演出费、联灯接线盒与接力闹钟。' }] },
  'wp-workshop': { lines: [{ speaker: 'mia', text: '我带着工具追来了。银级改装十二镑，金级二十八镑；金级先得做银级，再消耗一件同款材料，金级件数不设上限。先看清每件道具的实际变化，再付钱。' }], choices: [panel('workshop'), panel('shop'), close()] },
  'wp-felix-lamp': { lines: [{ speaker: 'felix', text: '你还肯来。聚光灯坏了，我正在靠帽子反光。' }, { speaker: 'eli', text: '米娅教过我怎么接这根线。站远一点，先把欠下的报幕念对。' }, { speaker: 'felix', text: '伊莱·维尔。今晚的主角。……我会记住的。' }], effect: { set: ['felixLamp'], once: 'felixLamp', reward: { fee: 8 } } },
  'wp-felix-after': { lines: [{ speaker: 'felix', text: '今晚的报幕稿没有墨水渍。也没有卖给任何人。' }] },
  'wp-theo': { lines: [{ speaker: 'theo', text: '新闻写已经发生的事。联赛公报、酒馆传闻、观摩记录，别把这三样当成同一回事。' }], choices: [panel('dossier'), close('合上报纸')] },
  'wp-coast': { lines: [{ speaker: 'brannigan', text: '码头连演七场，每一场换一位熟人、一种规矩。没有过期日期：下雨能停，人累也能停。演完七场，海边档期就是你们剧团的履历。' }], effect: { set: ['coastBooked'] } },
  'wp-coast-finished': { lines: [{ speaker: 'narrator', text: '七场节目单都盖了章。舞台拆下来，海还在。剧团留在这里的，是七次不同的掌声。' }], effect: { set: ['coastComplete'] } },
  'wp-bus-locked': { lines: [{ speaker: 'stan', text: '诺拉那场系列赛还没结束。巴士里随时可以歇脚，下一站要等你自己拿到节目单。' }] },
  'wp-departure': { lines: [{ speaker: 'theo', text: '这一回标题我写好了：“一个剧团驶向北方。”没有奇迹，也没有但是。' }, { speaker: 'nora', text: '米尔布鲁克看重的是整支剧团。把你的伙伴带好，我们大剧院再见。' }, { speaker: 'stan', text: '所有人上车。海鸥不算，我们已经超员过一次了。' }], effect: { set: ['westDeparted'], complete: true } },
};

export const WESTPORT_BATTLES: Partial<Record<BattleId, BattleDefinition>> = {
  'wp-entry': { act: 3, title: '职业联赛 · 首轮', opponent: 'vale', style: 'mend', presence: 360, formal: true, fame: 2, reward: { fee: 20, items: ['mend'] }, win: 'wp-entry-win', loss: 'wp-loss' },
  'wp-counter': { act: 3, title: '职业联赛 · 侦察局', opponent: 'vale', style: 'guard', presence: 385, formal: true, fame: 2, reward: { fee: 24 }, win: 'wp-counter-win', loss: 'wp-loss', tip: '对手根据你最近的公开出牌记录准备了箱子；改变构筑可以反过来利用他的准备。' },
  'wp-nora-1': { act: 3, title: '诺拉系列赛 · 第一局', opponent: 'nora', style: 'guard', presence: 407, formal: true, boss: true, win: 'wp-nora-round', loss: 'wp-nora-round', tip: '公开笔记：第一局黑桃护盾。这一条是真的。' },
  'wp-nora-2': { act: 3, title: '诺拉系列赛 · 第二局', opponent: 'nora', style: 'poison', presence: 407, formal: true, boss: true, win: 'wp-nora-round', loss: 'wp-nora-round', tip: '她换了箱子；上一局的结论不等于这一局的答案。' },
  'wp-nora-3': { act: 3, title: '诺拉系列赛 · 决胜局', opponent: 'nora', style: 'combo', presence: 407, formal: true, boss: true, win: 'wp-nora-round', loss: 'wp-nora-round', tip: '一比一。看清这一局的新配置，再决定自己的节奏。' },
  'wp-brannigan': { act: 3, title: '栈桥 · 没演完的戏', opponent: 'brannigan', style: 'burn', presence: 370, reward: { fee: 25, items: ['cinder'], relics: ['ember'] }, fame: 2, win: 'wp-brannigan-win', loss: 'wp-loss' },
  'wp-molly-1': { act: 3, title: '点歌 · 第一首红心', opponent: 'molly', performer: 'molly', style: 'mend', presence: 360, reward: { fee: 10, affinity: { molly: 20 } }, win: 'wp-molly-round', loss: 'wp-loss' },
  'wp-molly-2': { act: 3, title: '点歌 · 第二首雨伞', opponent: 'molly', performer: 'molly', style: 'guard', presence: 375, reward: { fee: 12, affinity: { molly: 20 } }, win: 'wp-molly-round', loss: 'wp-loss' },
  'wp-molly-3': { act: 3, title: '点歌 · 第三首午夜苔藓', opponent: 'molly', performer: 'molly', style: 'poison', presence: 390, reward: { fee: 20, items: ['mend', 'wash'], affinity: { molly: 20 } }, win: 'wp-molly-win', loss: 'wp-loss' },
  'wp-relay': { act: 3, title: '地铁联盟 · 双人团体赛', opponent: 'kit', style: 'quick', performer: 'juno', presence: 350, relay: true, reward: { fee: 30, items: ['compass'], relics: ['relay'] }, fame: 3, win: 'wp-relay-win', loss: 'wp-loss', tip: '伊莱首发，一名伙伴接力。对方是基特和维尔；存活者的气场、状态、手牌会留到下一棒。' },
};
const coastStyles = ['quick', 'guard', 'mend', 'poison', 'burn', 'combo', 'quick'] as const;
WESTPORT_BATTLES['wp-entry']!.book = { '1-4': 'mint', '1-7': 'mint' };
WESTPORT_BATTLES['wp-counter']!.book = { '0-5': 'edge', '2-7': 'edge' };
WESTPORT_BATTLES['wp-nora-1']!.book = { '0-3': 'lining', '0-5': 'lining', '0-7': 'lining' };
WESTPORT_BATTLES['wp-nora-2']!.book = { '2-3': 'moss', '2-5': 'moss', '2-7': 'moss' };
WESTPORT_BATTLES['wp-nora-3']!.book = { '0-7': 'silver', '1-8': 'silver', '3-9': 'silver' };
WESTPORT_BATTLES['wp-brannigan']!.book = { '3-4': 'seal', '3-6': 'seal' };
for (const id of ['wp-molly-1', 'wp-molly-2', 'wp-molly-3'] as const) WESTPORT_BATTLES[id]!.book = { ...PERFORMERS.molly.book };
for (let i = 1; i <= 7; i++) {
  const id = `wp-coast-${i}` as BattleId;
  WESTPORT_BATTLES[id] = { act: 3, title: `海边档期 · 第 ${i}/7 场`, opponent: i === 7 ? 'brannigan' : 'vale', style: coastStyles[i - 1], presence: 345 + i * 8, fame: 1, terms: i === 1 ? { minCards: 1, maxCards: 1 } : undefined, reward: { fee: 12 + i * 2, ...(i === 7 ? { relics: ['heart'] as const } : {}) }, win: `${id}-win`, loss: 'wp-loss' };
  WESTPORT_DIALOGUES[id] = { lines: [{ speaker: 'brannigan', text: `海边档期第 ${i} 场。${i === 1 ? '开场只甩单张，让码头工人先看清你的手。' : '今天换了一套箱子，别让昨日的掌声替你出牌。'}` }], choices: [fight(id, '开演'), close('改天开演')] };
  WESTPORT_DIALOGUES[`${id}-win`] = { lines: [{ speaker: 'narrator', text: `第 ${i} 场盖章，获得 ${12 + i * 2} 演出费。${i === 7 ? '七场全部完成，另获补缝旧毯。' : '下一场节目单已经准备好了。'}` }], ...(i === 7 ? { effect: { set: ['coastComplete'] as const } } : {}) };
}
export const WESTPORT_SHOP: readonly ShopOffer[] = [
  { id: 'wp-umbrella', kind: 'item', ref: 'umbrella', price: 14, note: '港口天晴也备伞。' },
  { id: 'wp-sequence', kind: 'item', ref: 'sequence', price: 26, note: '把你的判断排成一列。' },
  { id: 'wp-poison', kind: 'item', ref: 'poison', price: 20, note: '仓库里生长的耐心。' },
  { id: 'wp-cinder', kind: 'item', ref: 'cinder', price: 20, note: '船厂的余火。' },
  { id: 'wp-wash', kind: 'item', ref: 'wash', price: 18, note: '给海风一点甜味。' },
  { id: 'wp-relay', kind: 'relic', ref: 'relay', price: 32, note: '港口严格按铃开演。' },
  { id: 'wp-heart', kind: 'relic', ref: 'heart', price: 32, note: '主持人推荐的旧毯子。' },
  { id: 'wp-mint', kind: 'variant', ref: '1-12:mint', price: 16, note: '唱到最后一首也不会干嗓子。' },
];
export const WESTPORT_RUMOURS: Partial<Record<BattleId, readonly Rumour[]>> = Object.fromEntries(
  ['wp-entry', 'wp-counter', 'wp-nora-1', 'wp-nora-2', 'wp-nora-3'].map((kind) => [kind, [
    { id: `${kind}-paper`, source: 'paper', unit: 'style', truth: true, text: kind === 'wp-nora-1' ? '诺拉公开笔记：第一局用黑桃护盾。' : '联赛公报收录了本轮公开打法；只有亲眼看过的配置才算确认情报。' },
    { id: `${kind}-pub`, source: 'pub', unit: 'style', truth: true, text: '后台抄报员说：每局会重新报备打法；别把上一局的名单当成这一局的保证。' },
  ]]),
);
export const NORA_REWARD = { fee: 60, items: ['sequence', 'focus'] as const };
export function westportTalk(s: AdventureState, id: string): string | null {
  const f = s.flags, won = (key: BattleId) => s.won.includes(key);
  if (id === 'theo') return f.branniganAsked && !f.branniganClue ? 'wp-brannigan-clue' : 'wp-theo';
  if (id === 'league-bill') return 'panel:dossier';
  if (!f.westHomeGuided && ['nora', 'vale', 'subway-vale'].includes(id)) return 'wp-home-first';
  if (id === 'nora') {
    if (!f.westRegistered) return 'wp-register';
    if (!won('wp-counter')) return 'wp-register';
    if (!(f.felixExposed || f.felixForgiven)) return 'wp-register';
    if (!f.noraStatement) return 'wp-statement';
    if (!f.broadcastDone) return 'wp-interview-locked';
    if (f.noraChampion) return 'wp-nora-after';
    return s.noraSeries && s.noraSeries.wins < 2 && s.noraSeries.losses < 2 ? `wp-nora-next-${s.noraSeries.round}` : 'wp-nora-start';
  }
  if (id === 'vale' || id === 'subway-vale') return !f.westRegistered ? 'wp-register' : won('wp-entry') ? 'wp-counter' : 'wp-entry';
  if (id === 'felix') return !won('wp-counter') ? 'wp-felix-before' : !(f.felixExposed || f.felixForgiven) ? 'wp-leak' : f.felixForgiven && !f.felixLamp ? 'wp-felix-lamp' : 'wp-felix-after';
  if (id === 'radio-theo') return !f.noraStatement ? 'wp-interview-locked' : f.broadcastDone ? 'wp-theo' : 'wp-interview';
  if (id === 'molly' || id === 'pub-molly') {
    if (s.troupe.includes('molly')) return 'wp-molly-member';
    if (won('wp-molly-3')) return 'wp-molly-invite';
    return won('wp-molly-2') ? 'wp-molly-next-3' : won('wp-molly-1') ? 'wp-molly-next-2' : 'wp-molly-first';
  }
  if (id === 'brannigan') return won('wp-brannigan') ? 'wp-brannigan-after' : f.branniganClue ? 'wp-brannigan-fight' : 'wp-brannigan-first';
  if (id === 'kit') return 'wp-relay';
  if (id === 'mia') return 'wp-workshop';
  if (id === 'westshop-shelf') return 'panel:shop';
  if (id === 'wp-recruits') return 'panel:recruits';
  if (id === 'wp-stan') return s.troupe.includes('stan') ? 'stan-after' : 'tavern-board';
  if (id === 'coast-board') return !f.coastBooked ? 'wp-coast' : Array.from({ length: 7 }, (_, i) => `wp-coast-${i + 1}` as BattleId).find((kind) => !won(kind)) ?? 'wp-coast-finished';
  if (id === 'wp-bus') return f.noraChampion ? 'wp-departure' : 'wp-bus-locked';
  return null;
}
for (const round of [1, 2, 3]) WESTPORT_DIALOGUES[`wp-nora-next-${round}`] = { lines: [{ speaker: 'nora', text: `系列赛第 ${round} 局。让上一局变成经验，别变成习惯。` }], choices: [fight(`wp-nora-${round}` as BattleId, `开始第 ${round} 局`), panel('dossier'), close()] };
for (const round of [2, 3]) WESTPORT_DIALOGUES[`wp-molly-next-${round}`] = { lines: [{ speaker: 'molly', text: `听众点了第 ${round} 首。${round === 2 ? '这首有一把雨伞。' : '最后一首，留心午夜的毒雾。'}` }], choices: [fight(`wp-molly-${round}` as BattleId), close()] };
const route = (s: AdventureState, map: MapId, target: string) => s.map === map ? target : s.map === 'westport' ? `${map}-door` : `${s.map}-exit`;
export function westportObjective(s: AdventureState): Objective {
  const make = (title: string, detail: string, map: MapId, target: string): Objective => ({ title, detail, target: route(s, map, target) });
  if (!s.flags.westHomeGuided) return { title: '跟朱诺去剧团根据地', detail: '旧灯塔看守屋是朱诺朋友免费借用的。先找管家接钥匙，再去联赛报名。', target: s.map === 'westport-home' && s.viewedLodging === 'wp-friend' ? 'house-butler' : s.map.endsWith('-home') || s.map === 'bus-interior' ? 'home-exit' : s.map === 'westport' ? 'troupe-home' : `${s.map}-exit` };
  if (!s.flags.westRegistered) return make('到职业联赛报名', '诺拉把你的四场公开对局写进了笔记。', 'league', 'nora');
  if (!s.won.includes('wp-entry')) return make('联赛首轮', '维尔在联赛大厅等你。', 'league', 'vale');
  if (!s.won.includes('wp-counter')) return make('面对被研究的自己', '对手会按你的公开打法准备；看看档案再上台。', 'league', 'vale');
  if (!(s.flags.felixExposed || s.flags.felixForgiven)) return make('追查箱子情报的来源', '去旧栈桥，找菲利克斯核对那张清单。', 'docks', 'felix');
  if (!s.flags.noraStatement) return make('听诺拉的声明', '把经纪人偷买情报的事情告诉诺拉。', 'league', 'nora');
  if (!s.flags.broadcastDone) return make('广播塔赛前采访', '西奥等你的回答；也可以借直播放出假消息。', 'radio', 'radio-theo');
  if (!s.flags.noraChampion) return make('诺拉的三局两胜', s.noraSeries ? `当前 ${s.noraSeries.wins} 比 ${s.noraSeries.losses}；每局之间可以重新布阵。` : '第一局笔记已公开，后面的变化要靠判断。', 'league', 'nora');
  return make('第三幕落幕', '支线与海边七场仍可继续；准备好了就去巴士站。', 'westport', 'wp-bus');
}
export function westportSideObjectives(s: AdventureState): Objective[] {
  const entries: Objective[] = [];
  if (!s.won.includes('wp-brannigan')) entries.push({ title: '溺水的魔术师', detail: s.flags.branniganClue ? '在栈桥补完那场没演完的戏。' : '听船长讲一个没有结尾的故事。', target: route(s, s.flags.branniganAsked && !s.flags.branniganClue ? 'westport' : 'docks', s.flags.branniganAsked && !s.flags.branniganClue ? 'theo' : 'brannigan') });
  if (!s.flags.mollyJoined) entries.push({ title: '午夜点歌单', detail: '完成三首点歌，邀请莫莉加入剧团。', target: route(s, 'radio', 'molly') });
  if (!s.won.includes('wp-relay')) entries.push({ title: '地铁双人赛', detail: '和一位伙伴一起把舞台接下去。', target: route(s, 'subway', 'kit') });
  if (!s.flags.coastComplete) entries.push({ title: '海边七日档期', detail: `${s.won.filter((kind) => kind.startsWith('wp-coast-')).length}/7 场已盖章，可随时继续。`, target: route(s, 'docks', 'coast-board') });
  return entries;
}
