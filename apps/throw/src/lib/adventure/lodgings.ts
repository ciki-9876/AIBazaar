import { MILLBROOK_LODGINGS } from './millbrook.ts';
import { PERFORMER_IDS, PERFORMERS } from '../cards/throw-performer.ts';
import type { AdventureState, CharacterId, Dialogue, Hotspot, MapDefinition, MapId } from './adventure-types.ts';
import { LODGINGS, type Lodging } from './bridgeport.ts';
import { WESTPORT_LODGINGS } from './westport.ts';

export const GRAYWICK_LODGINGS: readonly Lodging[] = [
  { id: 'gw-bus', name: '格雷维克巴士站', price: 0, beds: 2, presence: 0, rehearsal: false, note: '里德说坐垫里藏着上个世纪的硬币。' },
  { id: 'gw-workshop', name: '里德工坊阁楼', price: 4, beds: 3, presence: 2, rehearsal: false, recovery: 1, note: '茶歇多恢复一档心情；楼下总有热茶。' },
  { id: 'gw-theatre', name: '抒情剧院后台', price: 9, beds: 5, presence: 5, rehearsal: true, recovery: 1, rehearsalBonus: 1, note: '排练额外 1 台龄，茶歇恢复 1 档。别在幕布上晾衣服。' },
];
export const BRIDGEPORT_LODGINGS: readonly Lodging[] = LODGINGS.map((entry, i) => ({ ...entry, recovery: i > 0 ? 1 : 0, rehearsalBonus: i > 1 ? i - 1 : 0 }));
export const lodgingsFor = (state: AdventureState) => state.act === 1 ? GRAYWICK_LODGINGS : state.act === 2 ? BRIDGEPORT_LODGINGS : state.act === 3 ? WESTPORT_LODGINGS : MILLBROOK_LODGINGS;
export const ALL_LODGINGS = [...GRAYWICK_LODGINGS, ...BRIDGEPORT_LODGINGS, ...WESTPORT_LODGINGS, ...MILLBROOK_LODGINGS];
const rooms = (act: 1 | 2 | 3 | 4, name: string, bus = false): MapDefinition => ({
  act, name, subtitle: bus ? '旅途中的家 · 每个人都能找到自己的座位' : '住处、排练、伙食与晚归的伙伴', image: bus ? 'bus-interior' : `troupe-home-${act}`,
  width: bus ? 1280 : 1440, height: bus ? 720 : 810, floor: bus ? 604 : 638, cameraY: bus ? 0 : 64,
  hotspots: [
    { id: 'home-exit', x: 130, label: '出门', kind: 'door' },
    { id: 'troupe-desk', x: 300, label: '团务桌 · 伙伴与排练', kind: 'board', functions: ['troupe'], when: (s) => s.viewedLodging === s.lodging },
    { id: 'house-butler', x: bus ? 1140 : 1280, label: '管家 · 租住登记', kind: 'npc', character: 'butler' },
    ...(bus ? [{ id: 'travel-desk', x: 390, label: '驾驶席 · 城际路线', kind: 'board' as const }] : []),
    ...PERFORMER_IDS.filter((id) => !['eli', 'holt', 'edith', 'oswald'].includes(id)).map((id, index) => ({ id: `member-${id}`, x: 470 + index * 170, label: PERFORMERS[id].name, kind: 'npc' as const, character: id as CharacterId, when: (s: AdventureState) => s.viewedLodging === s.lodging && s.troupe.includes(id) && !s.away[id] })),
  ],
});
export const HOME_MAPS = { 'graywick-home': rooms(1, '格雷维克剧团住处'), 'bridgeport-home': rooms(2, '布里奇波特剧团住处'), 'westport-home': rooms(3, '港口剧团住处'), 'millbrook-home': rooms(4, '北方剧团住处'), 'bus-interior': rooms(3, '斯坦的巡演巴士', true) } satisfies Partial<Record<MapId, MapDefinition>>;
export const HOME_DIALOGUES: Record<string, Dialogue> = {
  'tour-route': { lines: [{ speaker: 'stan', text: '走过的路都能再走。我们只去已经到过的城市；行李和伙伴一起走，新城市先从巴士泊位住起。' }], choices: [
    { id: 'graywick', label: '返回格雷维克', action: { type: 'travel', act: 1 } },
    { id: 'bridgeport', label: '前往布里奇波特', action: { type: 'travel', act: 2 } },
    { id: 'westport', label: '前往韦斯特港', action: { type: 'travel', act: 3 } },
    { id: 'millbrook', label: '前往米尔布鲁克', action: { type: 'travel', act: 4 } },
    { id: 'close', label: '先留在这里', action: { type: 'close' } },
  ] },
  'troupe-locked': { lines: [{ speaker: 'narrator', text: '这是魔术师招募告示板，但是是空的。' }] },
  'member-juno': { lines: [{ speaker: 'juno', text: '我在练接力登台。以前下台意味着没人再看我，现在意味着轮到伙伴。这个区别不错。' }] },
  'member-rosie': { lines: [{ speaker: 'rosie', text: '锅在这儿，我就在这儿。伙食账记清楚，排练前别把茶倒进炉子。' }] },
  'member-stan': { lines: [{ speaker: 'stan', text: '这把椅子是驾驶位，那把是休息位。看着一样，是因为我昨天把它们换过了。' }] },
  'member-pip': { lines: [{ speaker: 'pip', text: '我在练第三声部。一个人吹得响，三个人才能把曲子吹完。' }] },
  'member-molly': { lines: [{ speaker: 'molly', text: '我给每个人录了一段开场曲。你听到自己的那段，就知道有人在等你上台。' }] },
};

/** One real street entrance for every property. IDs stay stable across visits and saves. */
export const LODGING_ENTRANCES: Readonly<Record<1 | 2 | 3 | 4, readonly Hotspot[]>> = {
  1: [
    { id: 'troupe-home', x: 2130, label: '里德工坊阁楼', kind: 'door', target: 'graywick-home', spawn: 130, lodgingId: 'gw-workshop', functions: ['troupe'] },
    { id: 'home-gw-theatre', x: 2490, label: '抒情剧院后台', kind: 'door', target: 'graywick-home', spawn: 130, lodgingId: 'gw-theatre', functions: ['troupe'] },
  ],
  2: [
    { id: 'troupe-home', x: 2740, label: '醉鹅楼上的阁楼', kind: 'door', target: 'bridgeport-home', spawn: 130, lodgingId: 'attic', functions: ['troupe'] },
    { id: 'home-boarding', x: 3100, label: '霍普太太的寄宿房', kind: 'door', target: 'bridgeport-home', spawn: 130, lodgingId: 'boarding', functions: ['troupe'] },
    { id: 'home-suite', x: 3460, label: '剧院楼上的套间', kind: 'door', target: 'bridgeport-home', spawn: 130, lodgingId: 'suite', functions: ['troupe'] },
  ],
  4: [
    { id: 'troupe-home', x: 2740, label: '霍尔特太太的茶室楼上', kind: 'door', target: 'millbrook-home', spawn: 130, lodgingId: 'mb-loft', functions: ['troupe'] },
    { id: 'home-mb-weavers', x: 3100, label: '织工合作社排练楼', kind: 'door', target: 'millbrook-home', spawn: 130, lodgingId: 'mb-weavers', functions: ['troupe'] },
    { id: 'home-mb-spindle', x: 3460, label: '纺锤剧院驻演楼', kind: 'door', target: 'millbrook-home', spawn: 130, lodgingId: 'mb-spindle', functions: ['troupe'] },
  ],
  3: [
    { id: 'troupe-home', x: 2740, label: '旧灯塔看守屋', kind: 'door', target: 'westport-home', spawn: 130, lodgingId: 'wp-friend', functions: ['troupe'] },
    { id: 'home-wp-netloft', x: 3100, label: '盐风晒网阁', kind: 'door', target: 'westport-home', spawn: 130, lodgingId: 'wp-netloft', functions: ['troupe'] },
    { id: 'home-wp-warehouse', x: 3460, label: '六码头排练仓', kind: 'door', target: 'westport-home', spawn: 130, lodgingId: 'wp-warehouse', functions: ['troupe'] },
    { id: 'home-wp-radio-suite', x: 3820, label: '广播塔驻演公寓', kind: 'door', target: 'westport-home', spawn: 130, lodgingId: 'wp-radio-suite', functions: ['troupe'] },
  ],
};
export const lodgingEntrancesFor = (state: AdventureState) => LODGING_ENTRANCES[state.act];
export const viewedLodgingOf = (state: AdventureState) => lodgingsFor(state).find((entry) => entry.id === state.viewedLodging) ?? null;
for (const lodging of ALL_LODGINGS) {
  const price = lodging.price ? `先付一周 £${lodging.price}，以后每周日晚付 £${lodging.price}` : '免费';
  HOME_DIALOGUES[`rent-${lodging.id}`] = {
    lines: [
      { speaker: 'butler', text: `欢迎来看${lodging.name}。${price}。可住 ${lodging.beds} 位伙伴，全员气场加成 ${lodging.presence}%。` },
      { speaker: 'butler', text: `${lodging.note} 确认租用后，原根据地自动退租；之前已付的租金不退。` },
    ],
    choices: [
      { id: 'rent', label: lodging.price ? `确认租用 · 支付 £${lodging.price}` : '确认住进巴士', action: { type: 'rent-lodging', lodging: lodging.id } },
      { id: 'close', label: '先看看，不租', action: { type: 'close' } },
    ],
  };
}
Object.assign(HOME_DIALOGUES, {
  'wp-bus-choice': { lines: [{ speaker: 'stan', text: '巴士门开着。要进来歇脚、安排路线，还是把这一幕的节目单收好？' }], choices: [
    { id: 'enter-bus', label: '进入巡演巴士', action: { type: 'enter-bus' } },
    { id: 'wp-departure', label: '收好节目单 · 第三幕落幕', action: { type: 'goto', nextDialogue: 'wp-departure' } },
    { id: 'close', label: '先留在港口', action: { type: 'close' } },
  ] },
  'rent-current': { lines: [{ speaker: 'butler', text: '这里已经是你们的根据地。钥匙不用再领一次；伙伴和行李都在，团务桌也替你擦好了。' }] },
  'rent-poor': { lines: [{ speaker: 'butler', text: '租金还差一些。先去演出，房子可以慢慢看；原来的根据地和行李都没动。' }] },
  'rent-owing': { lines: [{ speaker: 'butler', text: '旧住处的欠租还没结清。先在剧团账本里结账，咱们再签新约；这次没有扣钱。' }] },
  'rent-done': { lines: [{ speaker: 'butler', text: '钥匙交给你，旧租约已经退掉。伙伴会把行李搬过来。愿这里的灯，每晚都等到你们回来。' }] },
  'wp-home-welcome': {
    lines: [
      { speaker: 'juno', text: '到了。旧灯塔看守屋，我朋友阿尔弗雷德的地方。他答应免费借给我们住，先把剧团安顿下来。' },
      { speaker: 'butler', text: '阿尔弗雷德先生留了钥匙。你们住在这里就免租；搬走后，这份借住人情便用完了，再来按每周五镑。' },
      { speaker: 'juno', text: '以后看中了其他住处，进去找管家，谈妥再交租。新家确认后，旧家就退租。现在先接钥匙，再去联赛报名。' },
    ], choices: [
      { id: 'rent', label: '接过钥匙 · 免费借住', action: { type: 'rent-lodging', lodging: 'wp-friend' } },
      { id: 'close', label: '稍后回来拿钥匙', action: { type: 'close' } },
    ],
  },
  'wp-home-first': { lines: [{ speaker: 'nora', text: '先跟朱诺把住处安顿好。旧灯塔看守屋在港口街的尽头；钥匙拿到了，再来报名也不迟。' }] },
});
