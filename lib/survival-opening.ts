import { countKind } from './survival-stacks.ts';
import {
  createGuidance,
  guidePaused,
  advanceGuidance,
  showGuide,
  type Guidance,
} from './survival-guidance.ts';
import { payAscent } from './survival-ascent.ts';
import { pavilionRoom } from './survival-pavilion.ts';
import { putInBag } from './survival-cargo.ts';
import {
  createAfterlight,
  stepAfterlightHome,
  stepAfterlightField,
  maintenanceRoom,
  departureIdentities,
  afterlightLine,
  type Afterlight,
} from './survival-afterlight.ts';
import {
  createSurvival,
  stepSurvival,
  survivalAction,
  ITEMS,
  ELEVATOR,
  ROOM,
  distance,
  recordPickup,
  type SurvivalState,
  type SurvivalInput,
  type Point,
  type Cache,
  type SurvivalAction,
} from './survival-room.ts';
import { insideLift } from './survival-lift.ts';
import {
  walkable,
  revealFog,
  visionRange,
  type RoomWorld,
} from './survival-world.ts';

export type OpeningStage =
  | 'waiting'
  | 'eyes'
  | 'where'
  | 'phone'
  | 'put-away'
  | 'door-thought'
  | 'door'
  | 'departing'
  | 'find-light'
  | 'equip-light'
  | 'find-box'
  | 'rustle'
  | 'sound-thought'
  | 'edge'
  | 'reveal'
  | 'fight'
  | 'aftermath'
  | 'return'
  | 'returning'
  | 'home'
  | 'second-departing'
  | 'expedition'
  | 'collapse';
export type OpeningState = {
  version: 6;
  lastRobotLine?: string;
  dialogueAuto?: boolean;
  guidance: Guidance;
  afterlight: Afterlight;
  homecoming: { scene: HomecomingScene; tick: number; fedUid: string | null };
  lift: {
    repaired: boolean;
    trips: number;
    choosingFloor: boolean;
    highestFloor: number;
  };
  stage: OpeningStage;
  beat: number;
  room: SurvivalState;
  exclaimed: boolean;
  attackAt: number;
  spawned: boolean;
  dropped: string[];
};
export type HomecomingScene =
  | 'rest'
  | 'look-right'
  | 'look-left'
  | 'flicker'
  | 'blackout'
  | 'approach'
  | 'scare'
  | 'plead'
  | 'welcome'
  | 'logo'
  | 'ai-thought'
  | 'warning'
  | 'silence'
  | 'threat'
  | 'ellipsis'
  | 'settlement'
  | 'request'
  | 'mouth'
  | 'feed'
  | 'upgrade'
  | 'thanks'
  | 'lights'
  | 'complete';
export const HOME_TIMELINE: Partial<
  Record<HomecomingScene, [number, HomecomingScene]>
> = {
  rest: [150, 'look-right'],
  'look-right': [75, 'look-left'],
  'look-left': [60, 'flicker'],
  flicker: [150, 'blackout'],
  blackout: [45, 'approach'],
  approach: [75, 'scare'],
  scare: [45, 'plead'],
  plead: [165, 'welcome'],
  welcome: [75, 'logo'],
  logo: [270, 'ai-thought'],
  'ai-thought': [120, 'warning'],
  warning: [135, 'silence'],
  silence: [60, 'threat'],
  threat: [90, 'ellipsis'],
  ellipsis: [75, 'settlement'],
  settlement: [210, 'request'],
  request: [105, 'mouth'],
  upgrade: [105, 'thanks'],
  thanks: [135, 'lights'],
  lights: [90, 'complete'],
};
export const ROBOT_LINES: Partial<Record<HomecomingScene, string>> = {
  logo: '你好，幸运儿，刚刚是我们品牌的LOGO，如有让你感到困扰……设计师全责。',
  warning: '接下来请按我说的做，不然你会……',
  threat: '死在这里',
  request: '你把能源核心给我',
  mouth: '你把能源核心给我',
  feed: '把能源核心（电容）拖进来。',
  upgrade: '嗯……味道不错。',
  thanks: '感谢投喂，我现在可以为你开灯了！',
  complete: '欢迎回家，幸运儿。',
};
export const openingLootReady = (s: OpeningState) =>
  s.afterlight.phase === 'recover-opening'
    ? [...s.room.bag, ...s.room.safe].some((i) => i.kind === 'energy-core')
    : s.spawned &&
      s.dropped.length === 3 &&
      s.room.caches
        .filter(
          (c) => c.item.kind === 'lift-material' || c.id === 'opening-box',
        )
        .every((c) => c.opened);
export function openingSettlement(s: OpeningState) {
  const owned = [
    ...s.room.bag,
    ...s.room.safe,
    ...s.room.equipment.map((e) => e.item),
  ];
  return (['flashlight', 'lift-material', 'energy-core'] as const).map(
    (kind) => ({
      kind,
      name: ITEMS[kind].name,
      count: countKind(owned, kind),
    }),
  );
}
export const LIGHT_POINT = { x: ELEVATOR.x - 1.8, z: ELEVATOR.z - 6.5 };
export const BOX_POINT = { x: ELEVATOR.x + 2.8, z: ELEVATOR.z - 12.5 };
export const OPENING_BOUNDS = { minX: 30.5, maxX: 66.5, minZ: 46, maxZ: 78 };
const ambushCue = (stage: OpeningStage) =>
  ['rustle', 'sound-thought', 'edge'].includes(stage);
export const openingThought = (s: OpeningState) => {
  if (s.stage === 'where') return '这……在哪儿，我在做梦？';
  if (s.stage === 'door-thought') return '赶紧打开电梯门。';
  if (s.stage === 'sound-thought') return '什么声音！';
  if (s.stage === 'fight' && s.exclaimed && s.room.tick - s.attackAt < 165)
    return '怎么回事？手机和电筒能自动攻击？\n我果然是在做梦%……&';
  if (s.stage === 'aftermath') return '太危险了，还是先回电梯等梦醒吧。';
  if (s.stage === 'home') {
    if (s.afterlight.phase === 'recover-opening')
      return '安泊把我拖回来了……\n背包还在原地，得回去找。';
    if (s.homecoming.scene === 'complete') {
      if (s.afterlight.phase === 'quiet' && s.afterlight.tick > 65)
        return '灯真的亮了……这触感也太真实了。';
      if (s.afterlight.phase === 'question' && s.afterlight.tick < 90)
        return '那我怎么出去？';
    }
    const thoughts: Partial<Record<HomecomingScene, string>> = {
      rest: '呼……这梦太刺激了……让我先在电梯里缓缓。',
      blackout: '啥情况？',
      approach: '啥情况？',
      scare: '我￥%……&！',
      plead: '别这样搞我……我听说在梦里吓死会永远醒不过来。',
      'ai-thought': '这是什么玩意儿？人工智能？',
      ellipsis: '……',
    };
    return thoughts[s.homecoming.scene] || '';
  }
  if (s.stage === 'expedition' && s.room.tick < s.afterlight.hintUntil)
    return s.afterlight.hint;
  if (s.stage === 'expedition' && s.beat < 180)
    return '门外变了……\n记住回去的路，别走得太远。';
  return '';
};

export type DialogueCue = {
  key: string;
  text: string;
  speaker: 'player' | 'robot';
};
export function dialogueCue(s: OpeningState): DialogueCue | null {
  const thought = openingThought(s);
  const robot =
    s.stage === 'home'
      ? s.homecoming.scene === 'complete'
        ? afterlightLine(s.afterlight)
        : ROBOT_LINES[s.homecoming.scene]
      : '';
  const text = thought || robot;
  return text
    ? {
        text,
        speaker: thought ? 'player' : 'robot',
        key: `${s.stage}:${s.homecoming.scene}:${s.afterlight.phase}:${s.lift.trips}:${text}`,
      }
    : null;
}
const STORY_END: Partial<Record<OpeningStage, number>> = {
  where: 108,
  'door-thought': 90,
  'sound-thought': 84,
  aftermath: 144,
};
const HOME_SPEECH_END: Partial<Record<Afterlight['phase'], number>> = {
  quiet: 90,
  home: 150,
  question: 180,
  rule: 150,
  'offer-food': 120,
};
/** Acknowledges speech, never commits an inventory, upgrade, or report action. */
export function advanceDialogue(s: OpeningState): OpeningState {
  if (guidePaused(s.guidance)) return s;
  if (STORY_END[s.stage])
    return stepOpening({ ...s, beat: STORY_END[s.stage]! });
  if (s.stage !== 'home') return s;
  if (s.homecoming.scene !== 'complete') {
    const end = HOME_TIMELINE[s.homecoming.scene];
    return end
      ? stepOpening({ ...s, homecoming: { ...s.homecoming, tick: end[0] } })
      : s;
  }
  const phase = s.afterlight.phase;
  // The player's question precedes the robot's reply within the same scene.
  if (phase === 'question' && s.afterlight.tick < 90)
    return { ...s, afterlight: { ...s.afterlight, tick: 90 } };
  const end = HOME_SPEECH_END[phase];
  return end
    ? stepOpening({ ...s, afterlight: { ...s.afterlight, tick: end } })
    : s;
}
/** Interactive playback holds narrative clocks only; field combat and needs still run. */
export function stepOpeningDialogue(
  s: OpeningState,
  input: SurvivalInput,
  auto: boolean,
  dismissed: string | null,
): OpeningState {
  const cue = dialogueCue(s);
  if (auto || !cue || cue.key === dismissed) return stepOpening(s, input);
  let held = s;
  if (STORY_END[s.stage])
    held = { ...held, beat: Math.min(s.beat, STORY_END[s.stage]! - 2) };
  if (s.stage === 'home') {
    const end = HOME_TIMELINE[s.homecoming.scene];
    if (end)
      held = {
        ...held,
        homecoming: {
          ...s.homecoming,
          tick: Math.min(s.homecoming.tick, end[0] - 2),
        },
      };
    if (s.homecoming.scene === 'complete') {
      const limit =
        s.afterlight.phase === 'question' && s.afterlight.tick < 90
          ? 90
          : HOME_SPEECH_END[s.afterlight.phase];
      if (limit)
        held = {
          ...held,
          afterlight: {
            ...s.afterlight,
            tick: Math.min(s.afterlight.tick, limit - 2),
          },
        };
    }
  }
  // Keep field utterances readable without stopping monsters or player movement.
  if (s.stage === 'fight' && s.exclaimed)
    held = { ...held, attackAt: s.attackAt + 1 };
  if (s.stage === 'expedition') {
    if (s.room.tick < s.afterlight.hintUntil)
      held = {
        ...held,
        afterlight: {
          ...held.afterlight,
          hintUntil: s.afterlight.hintUntil + 1,
        },
      };
    else if (s.beat < 180) held = { ...held, beat: Math.min(s.beat, 178) };
  }
  return stepOpening(held, input);
}
const cache = (
  id: string,
  point: Point,
  kind: keyof typeof ITEMS,
  container: Cache['container'] = 'loose',
): Cache => ({
  ...point,
  id,
  item: { ...ITEMS[kind], uid: id + '-item' },
  contents: [{ ...ITEMS[kind], uid: id + '-item' }],
  container,
  searched: false,
  opened: false,
  available: 0,
  ...(kind === 'lift-material' ? { pickup: 'touch' as const } : {}),
});
export function createOpening(): OpeningState {
  const room = createSurvival(92620);
  const world: RoomWorld = {
    version: 2,
    theme: 'wasteland',
    seed: 92620,
    sight: 8,
    bounds: { ...OPENING_BOUNDS },
    modules: [],
    gates: [],
    obstacles: [
      {
        x: BOX_POINT.x,
        z: BOX_POINT.z - 0.9,
        w: 1.4,
        d: 0.9,
        type: 'container',
      },
    ],
  };
  const box = cache('opening-box', BOX_POINT, 'energy-core', 'crate');
  box.available = Number.MAX_SAFE_INTEGER;
  return {
    version: 6,
    guidance: createGuidance(),
    afterlight: createAfterlight(),
    homecoming: { scene: 'rest', tick: 0, fedUid: null },
    lift: {
      repaired: false,
      trips: 0,
      choosingFloor: false,
      highestFloor: 1,
    },
    stage: 'waiting',
    beat: 0,
    exclaimed: false,
    attackAt: -1,
    spawned: false,
    dropped: [],
    room: {
      ...room,
      floor: 1,
      world,
      fog: revealFog(
        ELEVATOR,
        {
          explored: Array(ROOM.width * ROOM.depth).fill(0),
          visible: Array(ROOM.width * ROOM.depth).fill(0),
        },
        world,
      ),
      equipment: [{ slot: 0, item: { ...ITEMS.phone, uid: 'opening-phone' } }],
      caches: [cache('opening-light', LIGHT_POINT, 'flashlight'), box],
      enemies: [],
      spawns: [],
      nextWave: Number.MAX_SAFE_INTEGER,
      notice: '',
      noticeUntil: 0,
    },
  };
}
const change = (s: OpeningState, stage: OpeningStage): OpeningState => ({
  ...s,
  stage,
  beat: 0,
});
export type OpeningAction =
  | {
      type:
        | 'enter'
        | 'open-door'
        | 'close-floor'
        | 'equip-light'
        | 'return'
        | 'open-mouth'
        | 'close-mouth'
        | 'skip-safe'
        | 'defer-module'
        | 'finish-tutorial'
        | 'ack-guide'
        | 'confirm-report'
        | 'upgrade-lift';
    }
  | { type: 'choose-floor'; floor: number }
  | { type: 'feed-core'; uid: string }
  | { type: 'inventory'; action: SurvivalAction }
  | { type: 'move'; to: Point }
  | { type: 'edge-spawns'; points: Point[] };
export function openingAction(s: OpeningState, a: OpeningAction): OpeningState {
  if (a.type === 'ack-guide') {
    if (!s.guidance.active) return s;
    const ascent = s.guidance.active.id === 'ascent';
    const next = { ...s, guidance: { ...s.guidance, active: null } };
    return ascent
      ? openingAction(
          { ...next, lift: { ...next.lift, choosingFloor: true } },
          { type: 'choose-floor', floor: 3 },
        )
      : next;
  }
  if (guidePaused(s.guidance)) return s;
  if (
    a.type === 'open-door' &&
    s.stage === 'home' &&
    s.afterlight.phase === 'recover-opening'
  )
    return change(
      {
        ...s,
        room: survivalAction(
          { ...s.room, status: 'ready', departureTick: 0, leftLift: false },
          { type: 'start' },
        ),
      },
      'second-departing',
    );
  if (
    a.type === 'confirm-report' &&
    s.stage === 'home' &&
    s.afterlight.phase === 'report'
  ) {
    const needsModule =
      !s.afterlight.equipmentTaught &&
      [
        ...s.room.bag,
        ...s.room.safe,
        ...s.room.equipment.map((e) => e.item),
      ].some((i) => i.kind === 'capacitor');
    return {
      ...s,
      afterlight: {
        ...s.afterlight,
        phase: needsModule
          ? 'equip-module'
          : (s.room.liftLevel || 1) >= 2
            ? 'ascend'
            : 'upgrade-goal',
        tick: 0,
      },
    };
  }
  if (
    a.type === 'upgrade-lift' &&
    s.stage === 'home' &&
    s.homecoming.scene === 'complete' &&
    s.afterlight.equipmentTaught
  ) {
    const room = payAscent(s.room);
    return room
      ? {
          ...s,
          room,
          afterlight: { ...s.afterlight, phase: 'ascend', tick: 0 },
        }
      : s;
  }

  if (
    a.type === 'skip-safe' &&
    s.stage === 'home' &&
    s.afterlight.phase === 'safe'
  )
    return {
      ...s,
      afterlight: {
        ...s.afterlight,
        phase: 'rule',
        tick: 0,
        safeChoice: 'skipped',
      },
    };
  if (
    a.type === 'defer-module' &&
    s.stage === 'expedition' &&
    s.afterlight.moduleSeen
  )
    return { ...s, afterlight: { ...s.afterlight, moduleDeferred: true } };
  if (
    a.type === 'finish-tutorial' &&
    s.stage === 'home' &&
    s.afterlight.phase === 'branches'
  )
    return {
      ...s,
      afterlight: { ...s.afterlight, phase: 'complete', tick: 0 },
    };

  if (
    a.type === 'open-mouth' &&
    s.stage === 'home' &&
    s.homecoming.scene === 'mouth'
  )
    return { ...s, homecoming: { ...s.homecoming, scene: 'feed', tick: 0 } };
  if (
    a.type === 'close-mouth' &&
    s.stage === 'home' &&
    s.homecoming.scene === 'feed'
  )
    return { ...s, homecoming: { ...s.homecoming, scene: 'mouth', tick: 0 } };
  if (
    a.type === 'feed-core' &&
    s.stage === 'home' &&
    s.homecoming.scene === 'feed' &&
    !s.homecoming.fedUid
  ) {
    const item = s.room.bag.find(
      (i) => i.uid === a.uid && i.kind === 'energy-core',
    );
    if (!item) return s;
    return {
      ...s,
      lift: { ...s.lift, repaired: true },
      homecoming: { scene: 'upgrade', tick: 0, fedUid: item.uid },
      room: { ...s.room, bag: s.room.bag.filter((i) => i.uid !== item.uid) },
    };
  }
  if (
    a.type === 'inventory' &&
    (s.stage === 'expedition' ||
      (s.stage === 'home' && ['feed', 'complete'].includes(s.homecoming.scene)))
  ) {
    const allowed =
      s.homecoming.scene === 'feed' && s.stage === 'home'
        ? ['cargo-move', 'cargo-pack']
        : [
            'equip',
            'unequip',
            'protect',
            'unprotect',
            'cargo-move',
            'cargo-pack',
            'discard',
            'consume',
            'transfer',
          ];
    if (!allowed.includes(a.action.type)) return s;
    const room = survivalAction(s.room, a.action);
    if (room === s.room) return s;
    const consumedUid = a.action.type === 'consume' ? a.action.uid : null;
    const consumed = s.room.bag.find((i) => i.uid === consumedUid);
    const ate =
      a.action.type === 'consume' &&
      a.action.uid === 'anbo-welcome-bread' &&
      s.afterlight.breadGiven &&
      !room.bag.some((i) => i.uid === 'anbo-welcome-bread');
    return {
      ...s,
      room: ate ? { ...room, player: { ...room.player, water: 60 } } : room,
      afterlight: ate
        ? { ...s.afterlight, breadEaten: true, phase: 'depart', tick: 0 }
        : consumed && !s.afterlight.used.some((i) => i.uid === consumed.uid)
          ? { ...s.afterlight, used: [...s.afterlight.used, consumed] }
          : s.afterlight,
    };
  }
  if (a.type === 'close-floor')
    return s.lift.choosingFloor
      ? { ...s, lift: { ...s.lift, choosingFloor: false } }
      : s;
  if (
    s.stage === 'home' &&
    s.homecoming.scene === 'complete' &&
    a.type === 'open-door'
  ) {
    if (
      !s.afterlight.breadEaten ||
      !['depart', 'upgrade-goal', 'ascend', 'branches', 'complete'].includes(
        s.afterlight.phase,
      )
    )
      return s;
    return s.lift.choosingFloor
      ? s
      : { ...s, lift: { ...s.lift, choosingFloor: true } };
  }
  if (
    a.type === 'choose-floor' &&
    s.stage === 'home' &&
    s.homecoming.scene === 'complete'
  ) {
    if (
      ![2, 3].includes(a.floor) ||
      a.floor < s.lift.highestFloor ||
      (a.floor === 3 && (s.room.liftLevel || 1) < 2) ||
      !s.lift.choosingFloor ||
      !s.afterlight.breadEaten ||
      !['depart', 'upgrade-goal', 'ascend', 'branches', 'complete'].includes(
        s.afterlight.phase,
      )
    )
      return s;
    if (a.floor === 3 && !s.guidance.seen.includes('ascent'))
      return { ...s, guidance: showGuide(s.guidance, 'ascent') };
    const fresh =
      s.room.floor === a.floor
        ? s.room
        : a.floor === 3
          ? pavilionRoom()
          : maintenanceRoom();
    const room = {
      ...fresh,
      serial: Math.max(fresh.serial, s.room.serial),
      floor: a.floor,
      liftLevel: s.room.liftLevel || 1,
      liftLightOn: true,
      bag: s.room.bag,
      liftExperience: s.room.liftExperience || 0,
      safe: s.room.safe,
      equipment: s.room.equipment,
      status: 'ready' as const,
      departureTick: 0,
      extraction: 0,
      searching: null,
      path: [],
      leftLift: false,
      player: { ...s.room.player, ...ELEVATOR, hurtUntil: 0 },
      notice: '',
      noticeUntil: 0,
    };
    room.fog = revealFog(room.player, room.fog, room.world, visionRange(room));
    return change(
      {
        ...s,
        afterlight: {
          ...s.afterlight,
          phase: 'explore',
          tick: 0,
          departureOwned: departureIdentities(s.room),
          collected: [],
          used: [],
          failedReturn: false,
          hint: '',
          hintUntil: 0,
        },
        guidance: {
          ...s.guidance,
          startFood: room.player.food,
          startWater: room.player.water,
        },
        lift: {
          ...s.lift,
          trips: s.lift.trips + 1,
          choosingFloor: false,
          highestFloor: Math.max(s.lift.highestFloor, a.floor),
        },
        room: survivalAction(room, { type: 'start' }),
      },
      'second-departing',
    );
  }
  if (a.type === 'enter' && s.stage === 'waiting') return change(s, 'eyes');
  if (a.type === 'open-door' && s.stage === 'door')
    return change(
      { ...s, room: survivalAction(s.room, { type: 'start' }) },
      'departing',
    );
  if (
    a.type === 'move' &&
    s.room.status === 'running' &&
    !['equip-light', 'returning'].includes(s.stage) &&
    !ambushCue(s.stage)
  )
    return { ...s, room: survivalAction(s.room, a) };
  if (a.type === 'equip-light' && s.stage === 'equip-light') {
    const item = s.room.bag.find((i) => i.uid === 'opening-light-item');
    if (!item) return s;
    const room = survivalAction(s.room, {
      type: 'equip',
      uid: item.uid,
      slot: 1,
    });
    return room === s.room
      ? s
      : change(
          {
            ...s,
            room: {
              ...room,
              caches: room.caches.map((c) =>
                c.id === 'opening-box' ? { ...c, available: 0 } : c,
              ),
            },
          },
          'find-box',
        );
  }
  if (a.type === 'edge-spawns' && s.stage === 'edge' && !s.spawned) {
    if (
      a.points.length !== 3 ||
      a.points.some(
        (p) =>
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.z) ||
          !walkable(p, 0.4, s.room.world) ||
          distance(p, s.room.player) < 6,
      )
    )
      return s;
    return change(
      {
        ...s,
        spawned: true,
        room: {
          ...s.room,
          enemies: a.points.map((p, i) => ({
            x: Math.round(p.x * 1000) / 1000,
            z: Math.round(p.z * 1000) / 1000,
            id: `opening-creature-${i}`,
            kind: 'crawler',
            pursuit: 'ambush',
            sight: 24,
            hp: 65,
            maxHp: 65,
            awake: true,
            nextAttack: s.room.tick + 120,
            hitAt: -100,
            windup: 0,
            aim: null,
          })),
        },
      },
      'reveal',
    );
  }
  if (
    a.type === 'return' &&
    ['aftermath', 'return', 'expedition'].includes(s.stage) &&
    distance(s.room.player, ELEVATOR) < 3 &&
    (s.stage === 'expedition' || openingLootReady(s))
  ) {
    const room = survivalAction(s.room, { type: 'move', to: ELEVATOR });
    return change({ ...s, room }, 'returning');
  }
  return s;
}
function simulateOpening(
  state: OpeningState,
  input: SurvivalInput = {},
): OpeningState {
  if (
    state.stage === 'waiting' ||
    state.room.status === 'dead' ||
    guidePaused(state.guidance)
  )
    return state;
  let s = { ...state, beat: state.beat + 1 };
  if (s.stage === 'home' && s.afterlight.phase === 'recover-opening')
    return { ...s, room: { ...s.room, tick: s.room.tick + 1 } };
  if (s.stage === 'home') {
    const h = { ...s.homecoming, tick: s.homecoming.tick + 1 };
    const timed = HOME_TIMELINE[h.scene];
    if (timed && h.tick >= timed[0]) {
      h.scene = timed[1];
      h.tick = 0;
    }
    let afterlight =
      h.scene === 'complete'
        ? stepAfterlightHome(s.afterlight, s.room)
        : s.afterlight;
    let room = s.room;
    if (
      afterlight.phase === 'equip-module' &&
      room.equipment.some(
        (e) =>
          e.item.kind === 'capacitor' &&
          room.equipment.some(
            (w) =>
              [
                'phone',
                'flashlight',
                'nail',
                'coil',
                'blade',
                'laser',
              ].includes(w.item.kind) &&
              (w.slot + w.item.size === e.slot ||
                e.slot + e.item.size === w.slot),
          ),
      )
    ) {
      afterlight = {
        ...afterlight,
        equipmentTaught: true,
        phase: 'upgrade-goal',
        tick: 0,
      };
    }
    // The parcel is issued only once, and only after an atomic bag insertion.
    // A full bag leaves it waiting at the mouth; freeing a slot resumes delivery.
    if (
      h.scene === 'complete' &&
      afterlight.phase === 'serve-food' &&
      afterlight.tick >= 90 &&
      !afterlight.breadGiven
    ) {
      const bread = { ...ITEMS.bread, uid: 'anbo-welcome-bread' };
      const bag = putInBag(room.bag, bread);
      if (bag) {
        room = {
          ...room,
          bag,
          player: { ...room.player, food: Math.min(55, room.player.food) },
          effects: [...room.effects],
        };
        recordPickup(room, bread);
        afterlight = {
          ...afterlight,
          breadGiven: true,
          phase: 'eat-food',
          tick: 0,
        };
      }
    }
    return {
      ...s,
      homecoming: h,
      afterlight,
      room: {
        ...room,
        liftLevel: ['thanks', 'lights', 'complete'].includes(h.scene)
          ? Math.max(1, room.liftLevel || 0)
          : 0,
        liftLightOn: ['lights', 'complete'].includes(h.scene),
        tick: s.room.tick + 1,
        effects: room.effects.filter((e) => room.tick - e.tick < 72),
      },
    };
  }
  const durations: Partial<Record<OpeningStage, [number, OpeningStage]>> = {
    eyes: [84, 'where'],
    where: [108, 'phone'],
    phone: [150, 'put-away'],
    'put-away': [27, 'door-thought'],
    'door-thought': [90, 'door'],
    rustle: [36, 'sound-thought'],
    'sound-thought': [84, 'edge'],
    reveal: [30, 'fight'],
    aftermath: [144, 'return'],
  };
  const timed = durations[s.stage];
  if (timed && s.beat >= timed[0]) s = change(s, timed[1]);
  if (
    s.stage === 'departing' ||
    s.stage === 'second-departing' ||
    s.room.status === 'running'
  ) {
    if (s.stage === 'equip-light') return s;
    const prior = s.room;
    const search = [
      'find-light',
      'find-box',
      'aftermath',
      'return',
      'expedition',
    ].includes(s.stage);
    let room = stepSurvival(
      prior,
      s.stage === 'returning' || ambushCue(s.stage) ? {} : input,
      {
        waves:
          s.stage === 'expedition' && (s.room.floor === 3 || s.room.wave >= 2),
        needs: s.stage === 'expedition',
        combat:
          s.stage === 'fight' ||
          (s.afterlight.phase === 'recover-opening' && s.stage === 'return') ||
          s.stage === 'expedition' ||
          (s.stage === 'returning' && s.lift.trips > 0),
        search,
      },
    );
    if (
      s.stage === 'expedition' ||
      (s.stage === 'returning' && s.lift.trips > 0)
    ) {
      const result = stepAfterlightField(s.afterlight, prior, room);
      room = result.room;
      s = { ...s, afterlight: result.lesson };
    }
    s = { ...s, room };
    if (s.stage === 'departing' && room.status === 'running')
      s = change(s, 'find-light');
    if (s.stage === 'second-departing' && room.status === 'running')
      s = change(s, room.floor === 1 ? 'return' : 'expedition');
    if (
      s.stage === 'find-light' &&
      room.equipment.some((e) => e.item.uid === 'opening-light-item')
    ) {
      room = survivalAction(room, {
        type: 'unequip',
        uid: 'opening-light-item',
      });
      s = change({ ...s, room: { ...room, path: [] } }, 'equip-light');
    }
    if (
      s.stage === 'find-box' &&
      room.caches.find((c) => c.id === 'opening-box')?.opened
    )
      s = change({ ...s, room: { ...s.room, path: [] } }, 'rustle');
    if (s.stage === 'fight') {
      const newBeams = room.effects.filter(
        (e) => e.kind === 'phone-beam' || e.kind === 'torch-beam',
      );
      if (
        !s.exclaimed &&
        newBeams.some((e) => e.kind === 'phone-beam') &&
        newBeams.some((e) => e.kind === 'torch-beam')
      )
        s = { ...s, exclaimed: true, attackAt: room.tick };
      const killed = prior.enemies.filter(
        (e) =>
          !room.enemies.some((live) => live.id === e.id) &&
          !s.dropped.includes(e.id),
      );
      if (killed.length)
        s = {
          ...s,
          dropped: [...s.dropped, ...killed.map((e) => e.id)],
        };
      if (s.spawned && !s.room.enemies.length) s = change(s, 'aftermath');
    }
    if (
      ['aftermath', 'return', 'expedition'].includes(s.stage) &&
      insideLift(s.room.player, ELEVATOR) &&
      (s.stage === 'expedition' || openingLootReady(s))
    )
      s = change(s, 'returning');
    if (s.stage === 'returning') {
      if (insideLift(s.room.player, ELEVATOR) && !s.room.extraction)
        s = { ...s, room: survivalAction(s.room, { type: 'extract' }) };
      if (s.room.status === 'extracted')
        s = change(
          {
            ...s,
            afterlight: s.lift.repaired
              ? {
                  ...s.afterlight,
                  phase: 'report',
                  failedReturn: false,
                  tick: 0,
                  returnCount: s.afterlight.returnCount + 1,
                }
              : { ...s.afterlight, phase: 'dormant', failedReturn: false },
            homecoming: {
              ...s.homecoming,
              scene: s.lift.repaired ? 'complete' : 'rest',
              tick: 0,
            },
          },
          'home',
        );
    }
  }
  return s;
}

/** Guidance is part of the deterministic simulation: strong panels stop all ticks. */
export function stepOpening(
  state: OpeningState,
  input: SurvivalInput = {},
): OpeningState {
  if (guidePaused(state.guidance) && state.stage !== 'collapse') return state;
  if (state.stage === 'collapse' && state.beat < 144)
    return { ...state, beat: state.beat + 1 };
  let next = state.stage === 'collapse' ? state : simulateOpening(state, input);
  if (next.room.status === 'dead' && state.stage !== 'collapse')
    return {
      ...next,
      stage: 'collapse',
      beat: 0,
      guidance: { ...next.guidance, active: null },
    };
  next = advanceGuidance(state, next);
  if (next.room.status === 'dead') {
    // Bag is already atomically removed by the combat engine. Gear and safe survive.
    const room = {
      ...next.room,
      status: 'extracted' as const,
      player: {
        ...next.room.player,
        ...ELEVATOR,
        hp: 100,
        food: Math.max(60, next.room.player.food),
        water: Math.max(60, next.room.player.water),
        hurtUntil: 0,
      },
      path: [],
      searching: null,
      extraction: 0,
      effects: [],
      spawns: [],
      enemies: next.room.enemies.filter((e) => e.hp > 0),
    };
    next = {
      ...next,
      stage: 'home',
      beat: 0,
      room,
      homecoming: {
        ...next.homecoming,
        scene: next.lift.repaired ? 'complete' : 'rest',
        tick: 0,
      },
      lift: { ...next.lift, choosingFloor: false },
      afterlight: {
        ...next.afterlight,
        phase: next.lift.repaired ? 'report' : 'recover-opening',
        failedReturn: true,
        tick: 0,
        returnCount: next.afterlight.returnCount + 1,
      },
    };
  }
  const cue = dialogueCue(next);
  return cue?.speaker === 'robot' ? { ...next, lastRobotLine: cue.text } : next;
}
