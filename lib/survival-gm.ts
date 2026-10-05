import { showGuide } from './survival-guidance.ts';
import { SEASON_GM_STAGES, createSeasonRehearsal } from './survival-season-rehearsal.ts';
import {
  createOpening,
  openingAction,
  stepOpening,
  type OpeningState,
} from './survival-opening.ts';
import { createHomecomingRehearsal } from './survival-rehearsal.ts';
import { ELEVATOR, ITEMS } from './survival-room.ts';
import { revealFog, visionRange } from './survival-world.ts';
import { MAINTENANCE_POINTS } from './survival-afterlight.ts';
import { createRaceRoom } from './survival-race-session.ts';
import {
  createRace,
  acknowledgeRace,
  ascendRace,
  racePlayer,
  tickRace,
} from './survival-race.ts';

const opening = [
  ['waiting', '进入游戏', '开始画面，尚未睁眼。'],
  ['eyes', '睁眼', '从黑暗中苏醒，恢复视野。'],
  ['where', '陌生电梯', '第一次观察电梯与内心独白。'],
  ['phone', '拿出手机', '查看手机，发现没有信号。'],
  ['put-away', '收起手机', '收回手机的第一人称动画。'],
  ['door-thought', '寻找出口', '提示自己打开电梯门。'],
  ['door', '第一次开门', '右侧按键出现 E 提示，直接开门。'],
  ['departing', '进入荒原', '第一人称过渡到俯视角。'],
  ['find-light', '寻找电筒', '有迷雾的荒原，走近电筒拾取。'],
  ['equip-light', '装备电筒', '电筒已在背包中，等待装备。'],
  ['find-box', '翻找箱子', '电筒已装备，靠近箱子获取能源核心。'],
  ['rustle', '怪声响起', '翻找完成，远处传来怪声。'],
  ['sound-thought', '什么声音', '受惊独白，怪物即将出现。'],
  ['edge', '三只怪物出现', '从画面边缘生成三只非人类怪物。'],
  ['reveal', '装备栏出现', '装备栏入场，自动攻击即将开始。'],
  ['fight', '首次自动战斗', '手机与电筒自动攻击三只怪物。'],
  ['aftermath', '拾取材料', '怪物死亡，走近材料即可拾取。'],
  ['return', '返回电梯', '搜齐材料，沿来路返回电梯。'],
  ['returning', '首次返程运镜', '带着核心和材料进入电梯。'],
  [
    'collapse',
    '倒下与救援',
    '角色倒下、画面渐黑；安泊将你拖回电梯，背包留在原地。',
  ],
] as const;
const home = [
  ['rest', '喘口气', '返回电梯，短暂休息。'],
  ['look-right', '看向按键', '视线转向右侧操作面板。'],
  ['look-left', '看向屏幕', '转头发现左侧广告屏。'],
  ['flicker', '灯光闪烁', '电梯灯开始异常闪烁。'],
  ['blackout', '突然断电', '电梯陷入黑暗。'],
  ['approach', '黑暗异响', '不明声音逐渐靠近。'],
  ['scare', '恶魔惊吓', '像素恶魔标志突然出现。'],
  ['plead', '玩家惊叫', '受惊后的内心独白。'],
  ['welcome', '机器人登场', '恶魔标志转为机器人。'],
  ['logo', '品牌解释', '机器人解释刚才的恶魔标志。'],
  ['ai-thought', '怀疑人工智能', '玩家质疑机器人的身份。'],
  ['warning', '机器人警告', '机器人要求玩家听从指示。'],
  ['silence', '警告停顿', '威胁前的短暂沉默。'],
  ['threat', '死亡威胁', '机器人说出死亡警告。'],
  ['ellipsis', '玩家沉默', '玩家无言以对。'],
  ['settlement', '首次物资结算', '展示真实带回的电筒、核心与材料。'],
  ['request', '索要核心', '机器人要求投喂能源核心。'],
  ['mouth', '黑孔打开', '点击黑孔，进入升级系统。'],
  ['feed', '投喂核心', '背包内有核心，拖入或选中后投喂。'],
  ['upgrade', '供能升级', '核心已消耗，观察升级进度。'],
  ['thanks', '投喂成功', '机器人致谢，准备打开照明。'],
  ['lights', '顶灯亮起', '观察顶灯及电梯内部照明。'],
] as const;
const after = [
  [
    'recover-opening',
    '荒原失神返程',
    '精神力耗尽后回到电梯；重新外出，找回留在原地的背包。',
  ],
  ['quiet', '开灯后的安静', '短暂停留，重新感受电梯空间。'],
  ['home', '这里是家', '机器人介绍电梯作为归处。'],
  ['question', '询问出口', '玩家追问离开这里的方法。'],
  ['safe', '安全容器', '将物品保护起来，也可明确跳过。'],
  ['rule', '失败规则', '解释普通背包、装备与安全容器的区别。'],
  ['offer-food', '你饿了吧', '机器人准备送出面包。'],
  ['serve-food', '黑孔吐面包', '观察面包从屏幕黑孔飞出，进入背包。'],
  ['eat-food', '吃掉面包', '面包已在背包；选中面包并点击吃掉。'],
  ['depart', '寻找饮水', '饥渴状态已解锁，按 E 选择二层。'],
  ['report', '第二次归途结算', '查看真正带回或已使用的物品。'],
  ['equip-module', '返程装备教学', '打开行囊，拖动增幅模块并紧贴武器。'],
  ['upgrade-goal', '寻找升级物资', '收集 30 脑浆经验和两份机械零件。'],
  ['ascend', '第三层已接通', '电梯已升级，按 E 选择第三层。'],
] as const;
const field = [
  ['floor', '选择二层', '楼层选择面板已打开，选择二层开门。'],
  ['second-departing', '第二次出门', '二层门开启，镜头过渡至俯视角。'],
  ['expedition', '维保廊入口', '进入二层，开始寻找饮水。'],
  ['map', '探索与小地图', '已经离开门口，小地图记录探索区域。'],
  ['wave', '第一波怪物', '怪物预警出现，练习走位。'],
  [
    'module',
    '取得增幅模块',
    '柜中取得净水瓶和增幅模块，模块留在背包，任务变为返回。',
  ],
  ['linked', '两侧连接成功', '模块夹在两把武器之间，两侧增伤生效。'],
  ['traces', '发现人类痕迹', '查看空箱和脚印的剧情提示。'],
  ['returning', '第二次返程', '携带维保廊物资返回电梯。'],
] as const;
export const GM_STAGES = [
  ...SEASON_GM_STAGES,
  ...[
    [
      'warehouse',
      '仓库与销毁',
      '一级电梯的4×6仓库；练习存取、拖拽、交换与销毁确认。',
    ],
    [
      'feeding',
      '分次投喂',
      '升级进度已有15脑浆经验、1零件；材料在行囊与仓库中，可逐件投入黑孔。',
    ],
  ].map(([id, title, description]) => ({
    id: `storage:${id}`,
    group: '电梯仓库与投喂',
    title,
    description,
  })),
  ...[
    ['briefing', '节目揭晓', '第三层首次返程后，安泊宣布百层竞速规则。'],
    [
      'terminal',
      '赛事与电梯主页',
      '已登记参赛，持有4张通行证；可查赛事、升级和选层。',
    ],
    ['passes', '通行终端', '第三层登记箱附近；按住E签发，移动或受伤中断。'],
    ['review', '十层审查', '驻守者已击败，带着4张通行证回到电梯。'],
    ['promotion', '晋级演出', '提交资格后余票转经验，下一赛段开放。'],
    ['eliminated', '资格注销', '审查时限到期的淘汰结果，不等同于普通死亡。'],
    ['victory', '百层优胜', '真实规则支付最后一层通行费，触发100层胜利。'],
  ].map(([id, title, description]) => ({
    id: `race:${id}`,
    group: '百层竞速与通行证',
    title,
    description,
  })),
  ...[
    ['spirit', '首次精神力下降', '强引导暂停：精神力与失败损失。'],
    ['needs', '探索消耗饥渴', '持续十秒的机器人弱提示，不暂停战斗。'],
    ['low', '饥渴低于五十', '强引导与五十刻度；确认后体验减速和扭曲。'],
    ['ascent', '单向上升确认', '进入第三层前，确认低楼层永久关闭。'],
    ['aid', '唯一一次备用补给', '在电梯内首次饥渴告急，安泊提供面包和瓶装水。'],
    [
      'floor3',
      '听雨庭 · 中国风样板',
      '第三层入口。穿过月门探索雨夜庭院，低楼层已经永久关闭。',
    ],
    [
      'garden-court',
      '听雨庭 · 庭院中央',
      '美术检查点：从月门内侧观察主殿与荷池，保留真实迷雾和战斗。',
    ],
  ].map(([id, title, description]) => ({
    id: `guide:${id}`,
    group: '生存与上升',
    title,
    description,
  })),
  ...opening.map(([id, title, description]) => ({
    id: `opening:${id}`,
    group: '初醒与荒原',
    title,
    description,
  })),
  ...home.map(([id, title, description]) => ({
    id: `home:${id}`,
    group: '电梯苏醒',
    title,
    description,
  })),
  ...after.map(([id, title, description]) => ({
    id: `after:${id}`,
    group: '安泊与生活',
    title,
    description,
  })),
  ...field.map(([id, title, description]) => ({
    id: `field:${id}`,
    group: '二层探索',
    title,
    description,
  })),
];
let checkpoints: Map<string, OpeningState> | undefined;
/** Deterministic GM fixtures assembled through the same actions as play. */
function buildCheckpoints() {
  const points = new Map<string, OpeningState>();
  const save = (id: string, s: OpeningState) => {
    if (!points.has(id)) points.set(id, structuredClone(s));
  };
  const observe = (s: OpeningState) => {
    save(`opening:${s.stage}`, s);
    if (s.guidance.active) save(`guide:${s.guidance.active.id}`, s);
    if (s.stage === 'home') {
      save(`home:${s.homecoming.scene}`, s);
      if (s.homecoming.scene === 'complete')
        save(`after:${s.afterlight.phase}`, s);
    }
    if (s.stage === 'second-departing' || s.stage === 'expedition')
      save(`field:${s.stage}`, s);
    if (s.stage === 'expedition') {
      if (s.afterlight.mapSeen) save('field:map', s);
      if (s.room.wave) save('field:wave', s);
      if (s.afterlight.moduleSeen) save('field:module', s);
      if (s.afterlight.linked) save('field:linked', s);
      if (s.afterlight.tracesSeen) save('field:traces', s);
    }
    if (s.stage === 'returning' && s.lift.trips) save('field:returning', s);
  };
  const until = (state: OpeningState, done: (s: OpeningState) => boolean) => {
    let s = state;
    observe(s);
    for (let i = 0; i < 6000 && !done(s); i++) {
      if (s.guidance.active) s = openingAction(s, { type: 'ack-guide' });
      s = stepOpening(s);
      observe(s);
    }
    if (!done(s))
      throw new Error(
        `GM checkpoint blocked: ${s.stage}/${s.afterlight.phase}`,
      );
    return s;
  };
  observe(createOpening());
  let s = createHomecomingRehearsal(observe);
  let rescue = openingAction(structuredClone(points.get('guide:spirit')!), {
    type: 'ack-guide',
  });
  rescue.room.player.hp = 0.01;
  rescue.room.player.hurtUntil = 0;
  rescue.room.enemies = [
    {
      ...rescue.room.enemies[0],
      x: rescue.room.player.x + 0.5,
      z: rescue.room.player.z,
      nextAttack: 0,
    },
  ];
  rescue = until(stepOpening(rescue), (s) => s.stage === 'home');
  save('after:recover-opening', rescue);
  s = until(s, (s) => s.homecoming.scene === 'mouth');
  s = openingAction(s, { type: 'open-mouth' });
  observe(s);
  s = openingAction(s, { type: 'feed-core', uid: 'opening-box-item' });
  s = until(s, (s) => s.afterlight.phase === 'safe');
  s = openingAction(s, { type: 'skip-safe' });
  s = until(s, (s) => s.afterlight.phase === 'eat-food');
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'consume', uid: 'anbo-welcome-bread' },
  });
  observe(s);
  s = openingAction(s, { type: 'open-door' });
  save('field:floor', s);
  s = openingAction(s, { type: 'choose-floor', floor: 2 });
  s = until(s, (s) => s.stage === 'expedition');
  // Debugging a later combat lesson starts healthy, without changing normal play.
  s = { ...s, room: { ...s.room, player: { ...s.room.player, hp: 100 } } };
  s = openingAction(s, { type: 'move', to: MAINTENANCE_POINTS.cabinet });
  s = until(s, (s) => !!s.room.caches.find((c) => c.id === 'cabinet')?.opened);
  s = until(s, (s) => s.room.wave > 0);
  s = openingAction(s, { type: 'move', to: MAINTENANCE_POINTS.traces });
  s = until(s, (s) => s.afterlight.tracesSeen);
  s = openingAction(s, { type: 'move', to: ELEVATOR });
  s = until(s, (s) => s.stage === 'home');
  while (s.guidance.active) s = openingAction(s, { type: 'ack-guide' });
  s = openingAction(s, { type: 'confirm-report' });
  observe(s);
  for (const [kind, slot] of [
    ['flashlight', 6],
    ['capacitor', 5],
    ['phone', 4],
  ] as const) {
    const item =
      s.room.equipment.find((e) => e.item.kind === kind)?.item ||
      s.room.bag.find((i) => i.kind === kind);
    if (!item) throw new Error(`GM missing ${kind}`);
    s = openingAction(s, {
      type: 'inventory',
      action: { type: 'equip', uid: item.uid, slot },
    });
  }
  s = stepOpening(s);
  observe(s);
  save('field:linked', s);
  // Continue the same seeded floor to earn the actual upgrade materials.
  s = openingAction(openingAction(s, { type: 'open-door' }), {
    type: 'choose-floor',
    floor: 2,
  });
  s = until(s, (s) => s.stage === 'expedition');
  s = { ...s, room: { ...s.room, player: { ...s.room.player, hp: 100 } } };
  for (const point of [MAINTENANCE_POINTS.loose, MAINTENANCE_POINTS.deep]) {
    s = openingAction(s, { type: 'move', to: point });
    s = until(
      s,
      (s) =>
        s.room.caches.find((c) => c.x === point.x && c.z === point.z)!.searched,
    );
  }
  s = openingAction(s, { type: 'move', to: ELEVATOR });
  s = until(s, (s) => s.stage === 'home');
  while (s.guidance.active) s = openingAction(s, { type: 'ack-guide' });
  s = openingAction(s, { type: 'confirm-report' });
  s = openingAction(s, { type: 'upgrade-lift' });
  observe(s);
  if (s.room.liftLevel !== 2)
    throw new Error(
      JSON.stringify({
        bag: s.room.bag.map((i) => i.kind),
        phase: s.afterlight.phase,
        taught: s.afterlight.equipmentTaught,
        failed: s.afterlight.failedReturn,
        remaining: s.room.caches.map((c) => [
          c.id,
          c.contents.map((i) => i.kind),
        ]),
      }),
    );
  s = openingAction(openingAction(s, { type: 'open-door' }), {
    type: 'choose-floor',
    floor: 3,
  });
  observe(s);
  s = openingAction(s, { type: 'ack-guide' });
  s = until(s, (s) => s.stage === 'expedition');
  save('guide:floor3', s);
  const court = structuredClone(s);
  court.room.player = {
    ...court.room.player,
    x: 48.5,
    z: 57.5,
    hp: 100,
    water: 75,
    food: 85,
  };
  court.room.path = [];
  court.room.fog = revealFog(
    court.room.player,
    court.room.fog,
    court.room.world,
    visionRange(court.room),
  );
  save('guide:garden-court', court);
  const low = structuredClone(points.get('field:expedition')!);
  low.room.player.food = 32;
  low.room.player.water = 22;
  low.guidance = showGuide(low.guidance, 'low');
  points.set('guide:low', low);
  const needs = structuredClone(points.get('field:map')!);
  needs.guidance = showGuide(needs.guidance, 'needs');
  save('guide:needs', needs);
  const aid = structuredClone(points.get('after:depart')!);
  aid.room.player.food = 48;
  aid.guidance.active = null;
  observe(stepOpening(aid));
  until(points.get('opening:aftermath')!, (s) => s.stage === 'return');
  // Authored deterministic debug states; pending competitors never receive fabricated progress.
  const raceHome = structuredClone(points.get('guide:floor3')!);
  raceHome.stage = 'home';
  raceHome.room.status = 'extracted';
  raceHome.room.player = {
    ...raceHome.room.player,
    ...ELEVATOR,
    hp: 100,
    food: 90,
    water: 80,
  };
  raceHome.room.path = [];
  raceHome.guidance.active = null;
  raceHome.homecoming.scene = 'complete';
  raceHome.afterlight.phase = 'report';
  let contest = openingAction(raceHome, { type: 'confirm-report' });
  save('race:briefing', contest);
  contest = openingAction(contest, { type: 'ack-race' });
  const fieldRace = structuredClone(contest);
  fieldRace.stage = 'expedition';
  fieldRace.room.status = 'running';
  fieldRace.room.leftLift = true;
  const source = fieldRace.race!.sources[0];
  fieldRace.room.player = {
    ...fieldRace.room.player,
    x: source.x,
    z: source.z + 1,
  };
  fieldRace.room.fog = revealFog(
    fieldRace.room.player,
    fieldRace.room.fog,
    fieldRace.room.world,
    visionRange(fieldRace.room),
  );
  save('race:passes', fieldRace);
  racePlayer(contest.race!).passes = [0, 1, 2, 3].map((i) => ({
    id: `gm-ticket-${i}`,
    segment: 1,
    source: 'gm',
  }));
  save('race:terminal', contest);
  const review = structuredClone(contest);
  review.room = {
    ...createRaceRoom(10),
    status: 'extracted',
    equipment: review.room.equipment,
    bag: review.room.bag,
    safe: review.room.safe,
    liftLevel: 2,
  };
  review.room.enemies = [];
  review.lift.highestFloor = 10;
  review.race = acknowledgeRace(createRace(review.room.seed, 10));
  racePlayer(review.race).passes = structuredClone(
    racePlayer(contest.race!).passes,
  );
  review.race.scene = 'review';
  save('race:review', review);
  save('race:promotion', openingAction(review, { type: 'submit-review' }));
  const eliminated = structuredClone(contest);
  eliminated.race = tickRace({
    ...eliminated.race!,
    tick: racePlayer(eliminated.race!).deadline - 1,
  });
  save('race:eliminated', eliminated);
  const victory = structuredClone(contest);
  victory.room = {
    ...createRaceRoom(100),
    status: 'extracted',
    equipment: contest.room.equipment,
    bag: contest.room.bag,
    safe: contest.room.safe,
    liftLevel: 5,
  };
  victory.lift.highestFloor = 100;
  victory.race = acknowledgeRace(createRace(victory.room.seed, 99));
  racePlayer(victory.race).qualified = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  racePlayer(victory.race).passes = [
    { id: 'gm-finish-pass', segment: 10, source: 'gm' },
  ];
  victory.race = ascendRace(victory.race, 'player', 100, 5);
  save('race:victory', victory);
  const storage = structuredClone(points.get('after:upgrade-goal')!);
  storage.room.warehouse = [
    { ...ITEMS.water, uid: 'gm-storage-water', slot: 0 },
  ];
  storage.room.bag = [
    {
      ...ITEMS['lift-material'],
      uid: 'gm-storage-brain',
      quality: 'normal',
      stack: ['gm-storage-brain-2', 'gm-storage-brain-3'],
      slot: 0,
    },
    { ...ITEMS.scrap, uid: 'gm-storage-part', slot: 1 },
    { ...ITEMS.scrap, uid: 'gm-storage-part-2', slot: 2 },
  ];
  save('storage:warehouse', storage);
  const feeding = structuredClone(storage);
  feeding.room.liftExperience = 15;
  feeding.room.liftParts = 1;
  feeding.room.warehouse = [
    ...(feeding.room.warehouse || []),
    {
      ...ITEMS['lift-material'],
      uid: 'gm-feed-brain',
      quality: 'normal',
      slot: 1,
    },
  ];
  save('storage:feeding', feeding);
  for (const stage of GM_STAGES)
    if (!stage.id.startsWith('season:') && !points.has(stage.id)) throw new Error(`Missing GM stage ${stage.id}`);
  return points;
}
export function createGMCheckpoint(id: string): OpeningState {
  if (id.startsWith('season:') && SEASON_GM_STAGES.some(s=>s.id===id)) return createSeasonRehearsal(id.slice(7));
  if (!GM_STAGES.some((s) => s.id === id))
    throw new Error('Unknown tutorial checkpoint');
  checkpoints ??= buildCheckpoints();
  return structuredClone(checkpoints.get(id)!);
}
