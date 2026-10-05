import { createSeasonOpening, type OpeningState } from './survival-opening.ts';
import { pavilionRoom } from './survival-pavilion.ts';
import { ITEMS, ELEVATOR } from './survival-room.ts';
import {
  createSeasonRoom,
  materializeSeasonGolden,
} from './survival-season-world.ts';
import {
  createSeason,
  ascendSeason,
  tickSeason,
  startSeason,
  pickupSeasonGolden,
  redeemSeasonGolden,
  reserveRescue,
  syncSeasonActor,
} from './survival-season.ts';

export const SEASON_GM_STAGES = [
  ['tutorial', '第三层通关', '第三层已通关，确认结算后领取唯一首票。'],
  ['entry', '首票与四层', '持有首票，选择4F进入真实准备房间。'],
  ['gathering', '四层自由活动', '全季12名选手在场，无战斗和消耗，等待广播。'],
  [
    'broadcast',
    '四层规则广播',
    '六段广播，仍可自由走动；进度随暂停和存档保留。',
  ],
  ['boarding', '广播结束开门', '回自己的电梯，再确认进入5F。'],
  ['private', '五层有限物资', '普通通行证和资源只发一次；同层重进保留状态。'],
  ['home', '正赛电梯与仓库', '精神力70，有限补给在仓库，可以锁定救援或休息。'],
  ['upgrade', '正赛分次升级', '有限脑浆和零件在仓库，逐次投喂后升级跨度。'],
  ['golden', '十层金票争夺', '11张真金票，手动拾取；拿多张后必须扔下。'],
  ['multi', '多张金票撤离', '两张金票已在背包，电梯门会阻拦。'],
  ['qualified', '十层合法晋级', '已带回一张金票；只可免费前往11F。'],
  ['waiting', '二十层等待名册', '真实到达20F，但10F仍未结算，暂不发行金票。'],
  ['rescue', '物资救援', '精力即将耗尽，已锁定真药食水；背包留在地上。'],
  ['death', '永久死亡', '没有救援储备，精力即将耗尽；全部随身物品落地。'],
  ['pvp', '据点显式攻击', '一名测试对手在近处；未选目标时保持中立。'],
  ['final', '百层终局金票', '一张终局金票。抵达不算赢，必须带回电梯。'],
].map(([id, title, description]) => ({
  id: `season:${id}`,
  title,
  description,
  group: '完整赛季（非 AI）',
}));

/** Explicit GM fixtures, never called by the production simulation. */
export function createSeasonRehearsal(id: string): OpeningState {
  let s = createSeasonOpening();
  s = {
    ...s,
    stage: 'home',
    guidance: { ...s.guidance, active: null, seen: [] },
    homecoming: { ...s.homecoming, scene: 'complete' },
    lift: { repaired: true, trips: 2, choosingFloor: false, highestFloor: 3 },
    afterlight: {
      ...s.afterlight,
      phase: 'report',
      breadGiven: true,
      breadEaten: true,
      equipmentTaught: true,
    },
    room: {
      ...pavilionRoom(),
      status: 'extracted',
      bossDefeated: true,
      player: { ...s.room.player, ...ELEVATOR },
      bag: [],
      equipment: s.room.equipment,
      warehouse: [],
      liftLevel: 2,
      liftLightOn: true,
    },
  };
  if (id === 'tutorial') return s;
  let season = createSeason(s.room.seed, id === 'final' ? 1 : 12);
  s = { ...s, season, afterlight: { ...s.afterlight, phase: 'complete' } };
  if (id === 'entry') return s;
  season = ascendSeason(season, 'player', 4, 2);
  for (let i = 1; i < season.actors.length; i++)
    season.actors[i] = {
      ...season.actors[i],
      position: { x: 33.5 + (i % 6) * 5.5, z: 56.5 + Math.floor(i / 6) * 11 },
      inLift: false,
    };
  const room = createSeasonRoom(season.seed, 4);
  s = {
    ...s,
    season,
    room: {
      ...room,
      equipment: s.room.equipment,
      status: 'running',
      leftLift: true,
      player: { ...room.player, x: 48.5, z: 73.1 },
    },
    stage: 'expedition',
    lift: { ...s.lift, highestFloor: 4 },
  };
  if (id === 'gathering') return s;
  for (let i = 0; i < 600; i++) season = tickSeason(season);
  if (id === 'broadcast') return { ...s, season };
  for (let i = 0; i < 1980; i++) season = tickSeason(season);
  if (id === 'boarding') return { ...s, season };
  season = syncSeasonActor(season, 'player', {
    position: ELEVATOR,
    inLift: true,
    hp: 100,
    food: 100,
    water: 100,
  });
  season = startSeason(season);
  let live = createSeasonRoom(season.seed, 5);
  live = {
    ...live,
    equipment: s.room.equipment,
    status: 'running',
    leftLift: true,
    player: { ...live.player, x: 44.5, z: 68.5 },
  };
  s = {
    ...s,
    season,
    room: live,
    stage: 'expedition',
    lift: { ...s.lift, highestFloor: 5 },
  };
  // Enter through the real adapter in tests; here only explicit snapshots are authored.
  season = {
    ...season,
    sources: [
      {
        x: 44.5,
        z: 68.5,
        id: `ordinary:${season.seed}:player:5:0`,
        actor: 'player',
        floor: 5,
        amount: 1,
        title: '登记箱',
        duration: 90,
        taken: false,
      },
      {
        x: 54.5,
        z: 58.5,
        id: `ordinary:${season.seed}:player:5:1`,
        actor: 'player',
        floor: 5,
        amount: 2,
        title: '封存票匣',
        duration: 90,
        taken: false,
      },
      {
        x: 40.5,
        z: 54.5,
        id: `ordinary:${season.seed}:player:5:2`,
        actor: 'player',
        floor: 5,
        amount: 2,
        title: '封存票匣',
        duration: 90,
        taken: false,
      },
    ],
  };
  s = { ...s, season };
  const supplies = [
    'medicine',
    'food',
    'water',
    'medicine',
    'food',
    'water',
  ].map((kind, i) => ({
    ...ITEMS[kind as keyof typeof ITEMS],
    uid: `gm-season-stock:${i}`,
    slot: i,
  }));
  if (['home', 'upgrade', 'rescue', 'death'].includes(id)) {
    live = {
      ...live,
      status: 'extracted',
      player: {
        ...live.player,
        ...ELEVATOR,
        hp: id === 'home' || id === 'upgrade' ? 70 : 0.02,
        food: id === 'home' || id === 'upgrade' ? 60 : 0,
        water: id === 'home' || id === 'upgrade' ? 60 : 0,
      },
      warehouse: id === 'death' ? [] : supplies,
      bag: [{ ...ITEMS.scrap, uid: 'gm-season-bag', slot: 0 }],
      safe: [{ ...ITEMS.water, uid: 'gm-season-safe' }],
    };
    if (id === 'upgrade')
      live = {
        ...live,
        warehouse: [
          {
            ...ITEMS['lift-material'],
            uid: 'gm-upgrade-brain',
            quality: 'fine',
            slot: 0,
            stack: ['gm-upgrade-surplus'],
          },
          { ...ITEMS.scrap, uid: 'gm-upgrade-part:1', slot: 1 },
          { ...ITEMS.scrap, uid: 'gm-upgrade-part:2', slot: 2 },
        ],
      };
    if (id === 'rescue') live = reserveRescue(live, true);
    return {
      ...s,
      season: syncSeasonActor(season, 'player', {
        position: ELEVATOR,
        inLift: true,
        hp: live.player.hp,
        food: live.player.food,
        water: live.player.water,
      }),
      room: live,
      stage: 'home',
    };
  }
  if (id === 'private') return s;
  const tickets = Array.from({ length: 10 }, (_, i) => ({
    id: `gm-pass:${i}`,
    source: 'GM 测试票',
  }));
  season = {
    ...season,
    actors: season.actors.map((a) =>
      a.id === 'player' ? { ...a, passes: tickets } : a,
    ),
  };
  season = ascendSeason(season, 'player', 8, 2);
  season = ascendSeason(season, 'player', 10, 2);
  live = {
    ...createSeasonRoom(season.seed, 10),
    equipment: s.room.equipment,
    status: 'running',
    leftLift: true,
    enemies: [],
    spawns: [],
  };
  ({ room: live, season } = materializeSeasonGolden(live, season));
  const g = season.golden.find((g) => g.floor === 10)!;
  live = { ...live, player: { ...live.player, ...g.position } };
  season = syncSeasonActor(season, 'player', {
    position: g.position,
    inLift: false,
    hp: 100,
    food: 100,
    water: 100,
  });
  s = { ...s, room: live, season, lift: { ...s.lift, highestFloor: 10 } };
  if (id === 'golden') return s;
  const claim = (n: number) => {
    for (const g of season.golden.filter((g) => g.floor === 10).slice(0, n)) {
      season = syncSeasonActor(season, 'player', {
        position: g.position,
        inLift: false,
        hp: 100,
        food: 100,
        water: 100,
      });
      season = pickupSeasonGolden(season, 'player', [g.id]);
      live = {
        ...live,
        bag: [...live.bag, { ...ITEMS.golden, uid: g.id }],
        caches: live.caches.map((c) =>
          c.contents.some((i) => i.uid === g.id)
            ? { ...c, contents: [], opened: true }
            : c,
        ),
      };
    }
  };
  if (id === 'multi') {
    claim(2);
    live = { ...live, player: { ...live.player, x: 48.5, z: 73.1 } };
    return {
      ...s,
      season: syncSeasonActor(season, 'player', {
        position: live.player,
        inLift: false,
        hp: 100,
        food: 100,
        water: 100,
      }),
      room: live,
    };
  }
  if (id === 'pvp') {
    season = {
      ...season,
      actors: season.actors.map((a) =>
        a.id === 'contestant-1'
          ? {
              ...a,
              floor: 10,
              position: { x: live.player.x + 2, z: live.player.z },
              inLift: false,
            }
          : a,
      ),
    };
    return { ...s, season, room: { ...live, nextWave: 1e9 } };
  }
  if (id === 'final') {
    for (let floor = 10; floor < 100; floor += 10) {
      const g = season.golden.find((g) => g.floor === floor)!;
      season = syncSeasonActor(season, 'player', {
        position: g.position,
        inLift: false,
        hp: 100,
        food: 100,
        water: 100,
      });
      season = pickupSeasonGolden(season, 'player', [g.id]);
      season = syncSeasonActor(season, 'player', {
        position: ELEVATOR,
        inLift: true,
        hp: 100,
        food: 100,
        water: 100,
      });
      season = redeemSeasonGolden(season, 'player');
      season = ascendSeason(season, 'player', floor + 1, 2);
      for (let f = floor + 2; f <= floor + 10; f++) {
        season = {
          ...season,
          actors: season.actors.map((a) => ({
            ...a,
            passes: [{ id: `gm-final:${f}`, source: 'GM' }],
          })),
        };
        season = ascendSeason(season, 'player', f, 2);
      }
    }
    live = {
      ...createSeasonRoom(season.seed, 100),
      status: 'running',
      leftLift: true,
      equipment: s.room.equipment,
      enemies: [],
      spawns: [],
      nextWave: 1e9,
    };
    ({ room: live, season } = materializeSeasonGolden(live, season));
    const final = season.golden.find((g) => g.floor === 100)!;
    live = { ...live, player: { ...live.player, ...final.position } };
    return {
      ...s,
      season: syncSeasonActor(season, 'player', {
        position: final.position,
        inLift: false,
        hp: 100,
        food: 100,
        water: 100,
      }),
      room: live,
      lift: { ...s.lift, highestFloor: 100 },
    };
  }
  claim(1);
  season = syncSeasonActor(season, 'player', {
    position: ELEVATOR,
    inLift: true,
    hp: 100,
    food: 100,
    water: 100,
  });
  season = redeemSeasonGolden(season, 'player');
  live = {
    ...live,
    status: 'extracted',
    bag: [],
    player: { ...live.player, ...ELEVATOR },
  };
  if (id === 'qualified') return { ...s, season, room: live, stage: 'home' };
  season = ascendSeason(season, 'player', 11, 2);
  for (let f = 12; f <= 20; f++) {
    season = {
      ...season,
      actors: season.actors.map((a) =>
        a.id === 'player'
          ? { ...a, passes: [{ id: `gm-wait:${f}`, source: 'GM' }] }
          : a,
      ),
    };
    season = ascendSeason(season, 'player', f, 2);
  }
  live = {
    ...createSeasonRoom(season.seed, 20),
    status: 'running',
    leftLift: true,
    equipment: s.room.equipment,
    player: { ...live.player, x: 48.5, z: 73.1 },
  };
  return {
    ...s,
    season: syncSeasonActor(season, 'player', {
      position: live.player,
      inLift: false,
      hp: 100,
      food: 100,
      water: 100,
    }),
    room: live,
    lift: { ...s.lift, highestFloor: 20 },
  };
}
