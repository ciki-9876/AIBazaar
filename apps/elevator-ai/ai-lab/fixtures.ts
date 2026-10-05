import {
  createSurvival,
  ITEMS,
  ELEVATOR,
  type SurvivalState,
  type ItemKind,
  type Cache,
} from '../src/lib/survival-room.ts';
import { revealFog, visionRange } from '../src/lib/survival-world.ts';
import {
  AI_SCHEMA,
  type ActorContext,
} from '../src/lib/survival-ai/observation.ts';
import { createDecisionRequest } from '../src/lib/survival-ai/decisions.ts';
import {
  validateDataset,
  type Example,
  type Partition,
} from '../src/lib/survival-ai/dataset.ts';

export function emptyLabState(seed: number): SurvivalState {
  const state = createSurvival(seed);
  state.world = {
    version: 4,
    seed,
    theme: 'maintenance',
    sight: 12,
    modules: [],
    obstacles: [],
    gates: [],
  };
  state.status = 'running';
  state.floor = 2;
  state.tick = 60;
  state.leftLift = true;
  state.player = {
    ...state.player,
    x: 48.5,
    z: 70.5,
    hp: 85,
    food: 85,
    water: 85,
    energy: 100,
  };
  state.equipment = [
    { item: { ...ITEMS.phone, uid: 'lab-phone' }, slot: 0 },
    { item: { ...ITEMS.flashlight, uid: 'lab-flashlight' }, slot: 1 },
  ];
  state.bag = [];
  state.safe = [];
  state.lost = [];
  state.caches = [];
  state.enemies = [];
  state.spawns = [];
  state.path = [];
  state.effects = [];
  state.searching = null;
  state.searchTicks = 0;
  state.cooldowns = {};
  state.extraction = 0;
  state.nextWave = 100000;
  return refreshSight(state);
}
export function refreshSight(state: SurvivalState) {
  state.fog = revealFog(
    state.player,
    { explored: [], visible: [] },
    state.world,
    visionRange(state),
  );
  return state;
}
const give = (s: SurvivalState, kind: ItemKind) =>
  s.bag.push({ ...ITEMS[kind], uid: 'lab-' + kind, slot: s.bag.length });
export function labCache(
  id: string,
  x: number,
  z: number,
  container: Cache['container'] = 'crate',
): Cache {
  const items = ['water', 'scrap', 'bread'].map((kind, i) => ({
    ...ITEMS[kind as ItemKind],
    uid: id + '-' + i,
  }));
  return {
    id,
    x,
    z,
    container,
    contents: items,
    item: items[0],
    searched: false,
    opened: false,
    available: 0,
  };
}
export function labThreat(s: SurvivalState, id = 'threat') {
  s.enemies.push({
    id,
    kind: 'runner',
    x: s.player.x - 4,
    z: s.player.z,
    hp: 180,
    maxHp: 180,
    nextAttack: s.tick,
    awake: true,
    hitAt: -100,
    windup: 0,
    aim: null,
    pursuit: 'territorial',
    home: { x: s.player.x - 4, z: s.player.z },
    sight: 12,
  });
}
type Case = {
  id: string;
  partition: Partition;
  goal: ActorContext['goal'];
  keys: string[];
  rationale: string;
  setup: (state: SurvivalState) => void;
};
const cases: Case[] = [
  {
    id: 'train-thirst',
    partition: 'train',
    goal: 'survive',
    keys: ['use:water'],
    rationale: '饮水很低且眼前无威胁；主动补给有实际收益。',
    setup: (s) => {
      s.player.water = 18;
      give(s, 'water');
    },
  },
  {
    id: 'train-hunger',
    partition: 'train',
    goal: 'survive',
    keys: ['use:bread'],
    rationale: '饱食很低；包里已有面包，先补给。',
    setup: (s) => {
      s.player.food = 20;
      give(s, 'bread');
    },
  },
  {
    id: 'train-recovery',
    partition: 'train',
    goal: 'survive',
    keys: ['use:medicine'],
    rationale: '精神力不足，使用急救包而非无目的移动。',
    setup: (s) => {
      s.player.hp = 50;
      give(s, 'medicine');
    },
  },
  {
    id: 'train-escape',
    partition: 'train',
    goal: 'survive',
    keys: ['move:E', 'move:NE', 'move:SE'],
    rationale: '精神力低且西侧有威胁；多个向东拉开距离的行动可接受。',
    setup: (s) => {
      s.player.hp = 30;
      labThreat(s);
    },
  },
  {
    id: 'train-search',
    partition: 'train',
    goal: 'loot',
    keys: ['loot:nearby'],
    rationale: '安全、未满包且附近有容器；内容尚未知，允许开始翻找。',
    setup: (s) => {
      s.caches = [labCache('nearby', s.player.x + 1, s.player.z - 0.6)];
    },
  },
  {
    id: 'train-finish-search',
    partition: 'train',
    goal: 'loot',
    keys: ['loot:nearby', 'wait'],
    rationale: '安全且搜索接近完成；留在原地继续搜索。',
    setup: (s) => {
      s.caches = [labCache('nearby', s.player.x + 1, s.player.z - 0.6)];
      s.searching = 'nearby';
      s.searchTicks = 80;
    },
  },
  {
    id: 'train-exit',
    partition: 'train',
    goal: 'withdraw',
    keys: ['extract'],
    rationale: '已到门内且目标是撤离；开始实际撤离读条。',
    setup: (s) => {
      Object.assign(s.player, ELEVATOR);
    },
  },
  {
    id: 'train-idle',
    partition: 'train',
    goal: 'survive',
    keys: ['wait'],
    rationale: '实验的局部行动集没有探索目标或眼前威胁；暂时停留。',
    setup: () => {},
  },
  {
    id: 'calibration-medium-thirst',
    partition: 'calibration',
    goal: 'survive',
    keys: ['use:water'],
    rationale: '中等饮水缺口且有净水瓶；补给可接受。',
    setup: (s) => {
      s.player.water = 38;
      give(s, 'water');
    },
  },
  {
    id: 'calibration-locker',
    partition: 'calibration',
    goal: 'loot',
    keys: ['loot:nearby'],
    rationale: '安全的柜子搜索，和训练箱子的耗时不同。',
    setup: (s) => {
      s.caches = [
        labCache('nearby', s.player.x + 1, s.player.z - 0.6, 'locker'),
      ];
    },
  },
  {
    id: 'calibration-two-threats',
    partition: 'calibration',
    goal: 'survive',
    keys: ['move:E', 'move:NE', 'move:SE'],
    rationale: '两只西侧怪物；离开威胁方向。',
    setup: (s) => {
      s.player.hp = 30;
      labThreat(s, 'a');
      labThreat(s, 'b');
      s.enemies[1].z += 1;
    },
  },
  {
    id: 'test-thirst-threat',
    partition: 'test',
    goal: 'survive',
    keys: ['use:water', 'move:E', 'move:NE', 'move:SE'],
    rationale: '复合局面：低饮水与威胁同时存在；立即补给或先拉开距离均可接受。',
    setup: (s) => {
      s.player.water = 18;
      give(s, 'water');
      labThreat(s);
    },
  },
  {
    id: 'test-fullbag-exit',
    partition: 'test',
    goal: 'withdraw',
    keys: ['extract'],
    rationale: '满包并已抵达电梯；完成回收。',
    setup: (s) => {
      Object.assign(s.player, ELEVATOR);
      s.bag = Array.from({ length: 16 }, (_, i) => ({
        ...ITEMS.scrap,
        uid: 'full-' + i,
        slot: i,
      }));
    },
  },
  {
    id: 'test-dual-needs',
    partition: 'test',
    goal: 'survive',
    keys: ['use:water'],
    rationale: '饱食48、饮水12；两件补给都可用，先处理更紧迫的饮水。',
    setup: (s) => {
      s.player.food = 48;
      s.player.water = 12;
      give(s, 'water');
      give(s, 'bread');
    },
  },
  {
    id: 'test-dangerous-loot',
    partition: 'test',
    goal: 'survive',
    keys: ['move:E', 'move:NE', 'move:SE'],
    rationale: '精神力低、西侧怪物追近且有箱子诱惑；先脱离威胁。',
    setup: (s) => {
      s.player.hp = 28;
      labThreat(s);
      s.caches = [labCache('nearby', s.player.x - 1, s.player.z - 0.6)];
    },
  },
];
/** Authored synthetic fixtures, NOT human-reviewed training or gameplay performance evidence. */
export function smokeFixtures() {
  const fixtures: {
    example: Example;
    state: SurvivalState;
    context: ActorContext;
  }[] = [];
  cases.forEach((scenario, index) => {
    for (let variant = 0; variant < 4; variant++) {
      const seed = 1000 + index * 100 + variant;
      const state = emptyLabState(seed);
      scenario.setup(state);
      state.player.food = Math.min(100, state.player.food + variant);
      state.player.water = Math.min(100, state.player.water + variant);
      refreshSight(state);
      const context: ActorContext = {
        sessionId: scenario.id + '-' + variant,
        actorId: 'lab-competitor',
        goal: scenario.goal,
        riskTolerance: 0.3 + variant * 0.05,
      };
      const request = createDecisionRequest(state, context);
      const example: Example = {
        schema: AI_SCHEMA,
        id: scenario.id + '-' + variant,
        partition: scenario.partition,
        group: {
          seed,
          trajectory: scenario.id + '-trajectory-' + variant,
          template: scenario.id,
          relation: null,
        },
        request,
        acceptableKeys: scenario.keys,
        source: 'synthetic-smoke',
        rationale: scenario.rationale,
      };
      fixtures.push({ example, state, context });
    }
  });
  validateDataset(fixtures.map((fixture) => fixture.example));
  return fixtures;
}
