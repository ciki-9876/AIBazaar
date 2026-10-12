'use client';

import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import Link from 'next/link';
import { sitePath } from '../../lib/site-path';
import {
  abandonAdventureBattle,
  ACTS,
  advanceDialogue,
  adventureObjective,
  adventureSideObjectives,
  adventureGains,
  backpackUnlocked,
  troupeUnlocked,
  upgradeItem,
  acknowledgeBackpack,
  battleSetup,
  buyOffer,
  CHARACTERS,
  chooseDialogue,
  clearNotice,
  closePanel,
  gatherIntel,
  haveTea,
  hireRecruit,
  helpLandlady,
  passTime,
  payArrears,
  SLOT_NAMES,
  WEEKDAYS,
  weekday,
  weekNumber,
  rehearse,
  setMeals,
  createAdventure,
  DIALOGUES,
  finishAdventureBattle,
  hotspotInReach,
  interactAdventure,
  keepExploring,
  viewedLodgingOf,
  MAPS,
  narratorFor,
  nearbyHotspot,
  restoreAdventure,
  repeatAdventureBattle,
  SAVE_KEY,
  serializeAdventure,
  startShow,
  STARTER_ITEMS,
  unlockedKit,
  travelOn,
  visibleHotspots,
  walkAdventure,
  WALK_TICK_MS,
  type AdventureState,
  type BattleId,
  type CharacterId,
  type IntelSource,
  type ShowId,
  type Reward,
  type ActId,
} from '../../lib/adventure/magician-world';
import type { UpgradeTier } from '../../lib/cards/throw-upgrades';
import type { PerformerId } from '../../lib/cards/throw-performer';
import ThrowTable, {
  type PreparedThrowLoadout,
} from '../wandeng/throw/throw-table';
import { PRESETS, packThrowItems, validThrowLayout, type ItemId, type RelicId } from '../../lib/cards/throw-loadout';
import { validPreparedThrowLoadout } from '../../lib/cards/throw-team';
import { clockLabel, DossierPanel, Fee, ShopPanel, ShowsPanel, TroupePanel, type LifeAction } from './adventure-panels';
import { DialogueText } from './dialogue-text';
import { BackpackIntro, BackpackPanel, QuestScroll, RecruitBoard, RewardReveal } from './adventure-overlays';
import { WorkshopPanel } from './workshop-panel';
import { useCityMusic, CITY_SCORES } from '../stage/city-music';
import { EdgeRouteMarkers, LocationFunctionIcon, LOCATION_FUNCTION_NAMES, type RouteMarker } from './location-markers';

const STARTER_LOADOUT: PreparedThrowLoadout = {
  style: 'quick',
  layout: packThrowItems(STARTER_ITEMS),
  relic: null,
};
/** Arriving in Bridgeport without a remembered trunk: Graywick's full kit, packed sensibly. */
const BRIDGEPORT_LOADOUT: PreparedThrowLoadout = {
  style: 'guard',
  // v9: three shield items, so the splash tax never halves the default trunk.
  layout: packThrowItems(['pair', 'umbrella', 'ward', 'thorns', 'quick', 'wash', 'draw']),
  relic: 'bastion',
};
const MILLBROOK_LOADOUT: PreparedThrowLoadout = { style: 'quick', layout: packThrowItems(PRESETS.quick.items), relic: PRESETS.quick.relic };
import { Figure, type RigId } from '../stage/rig';
import { StageScene } from '../stage/stage-scene';
import { SuitMark } from '../stage/card-art';

type Action =
  | { type: 'walk'; direction: -1 | 0 | 1; ticks: number }
  | { type: 'interact'; id?: string }
  | { type: 'advance' }
  | { type: 'choice'; id: string }
  | { type: 'result'; id: number; winner: 0 | 1 | 'draw'; report?: { suits: number[]; kinds: number[]; performer?: PerformerId; playerSuits?: number[]; playerKinds?: number[] } }
  | { type: 'abandon' }
  | { type: 'explore' }
  | { type: 'travel' }
  | { type: 'panel-close' }
  | { type: 'buy'; id: string }
  | { type: 'show'; id: ShowId }
  | { type: 'load'; state: AdventureState }
  | { type: 'restart'; act?: ActId }
  | { type: 'upgrade'; id: ItemId; tier: UpgradeTier }
  | { type: 'life'; action: LifeAction }
  | { type: 'rest' }
  | { type: 'scout'; battle: BattleId; source: IntelSource }
  | { type: 'notice-close' }
  | { type: 'hire'; id: PerformerId }
  | { type: 'backpack-guided' }
  | { type: 'rematch'; previous: NonNullable<AdventureState['battle']> };
function life(state: AdventureState, action: LifeAction): AdventureState {
  switch (action.kind) {
    case 'tea':
      return haveTea(state, action.id);
    case 'rehearse':
      return rehearse(state, action.id);
    case 'meals':
      return setMeals(state, action.tier);
    case 'pay':
      return payArrears(state);
    case 'help':
      return helpLandlady(state);
  }
}
function reducer(state: AdventureState, action: Action): AdventureState {
  switch (action.type) {
    case 'walk':
      return walkAdventure(state, action.direction, action.ticks);
    case 'interact':
      return interactAdventure(state, action.id);
    case 'advance':
      return advanceDialogue(state);
    case 'choice':
      return chooseDialogue(state, action.id);
    case 'result':
      return finishAdventureBattle(state, action.id, action.winner, action.report);
    case 'abandon':
      return abandonAdventureBattle(state);
    case 'explore':
      return keepExploring(state);
    case 'travel':
      return travelOn(state);
    case 'panel-close':
      return closePanel(state);
    case 'buy':
      return buyOffer(state, action.id);
    case 'show':
      return startShow(state, action.id);
    case 'load':
      return action.state;
    case 'restart':
      return createAdventure(state.seed, action.act ?? 1);
    case 'upgrade':
      return upgradeItem(state, action.id, action.tier);
    case 'life':
      return life(state, action.action);
    case 'rest':
      return passTime(state);
    case 'scout':
      return gatherIntel(state, action.battle, action.source);
    case 'notice-close':
      return clearNotice(state);
    case 'hire':
      return hireRecruit(state, action.id);
    case 'backpack-guided':
      return acknowledgeBackpack(state);
    case 'rematch':
      return repeatAdventureBattle(state, action.previous);
  }
}
const route = [
  ['01', '格雷维克', '第一张参赛证'],
  ['02', '布里奇波特', '小镇公开赛'],
  ['03', '韦斯特港', '城市职业赛'],
  ['04', '米尔布鲁克', '剧团联赛'],
  ['05', '奥罗拉', '都会大师赛'],
  ['06', '世界大剧院', '世界冠军赛'],
] as const;
/** Who to show beside the objective: the person the objective points at. */
function objectivePortrait(state: AdventureState, target: string): RigId {
  for (const map of Object.values(MAPS)) {
    const spot = map.hotspots.find((entry) => entry.id === target && entry.character);
    if (spot?.character) return spot.character as RigId;
  }
  if (state.act === 1) return !state.flags.trained ? 'reed' : !state.flags.ticket ? 'felix' : 'eli';
  return target.startsWith('thursday') ? 'doris' : target === 'busk-stage' ? 'juno' : target === 'bp-bus' ? 'stan' : 'eli';
}
/** Fit a remembered trunk to what this duel allows: unknown items and relics drop out. */
function fitLoadout(
  loadout: PreparedThrowLoadout,
  available: { items: ItemId[]; relics: RelicId[] },
  forced?: { items: ItemId[]; relic: RelicId | null },
): PreparedThrowLoadout {
  if (forced) return { style: 'poison', layout: packThrowItems(forced.items), relic: forced.relic, book: loadout.book };
  const layout = loadout.layout.filter((entry) => available.items.includes(entry.id));
  return {
    ...loadout,
    layout: validThrowLayout(layout) ? layout : packThrowItems(layout.map((entry) => entry.id)),
    relic: loadout.relic && available.relics.includes(loadout.relic) ? loadout.relic : (available.relics[0] ?? null),
  };
}

const MapIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="rg-icon">
    <path d="M2 5l5-2 6 2 5-2v12l-5 2-6-2-5 2z M7 3v12 M13 5v12" />
  </svg>
);
const CardsIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="rg-icon">
    <rect x="3" y="4" width="9" height="13" rx="1.5" transform="rotate(-10 7 10)" />
    <rect x="8" y="3" width="9" height="13" rx="1.5" transform="rotate(8 12 9)" />
  </svg>
);

export default function MagicianAdventure() {
  const [state, dispatch] = useReducer(reducer, 1024, createAdventure);
  const [mapOpen, setMapOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [troupeOpen, setTroupeOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const city = state.act === 1 ? 'graywick' : state.act === 2 ? 'bridgeport' : state.act === 3 ? 'westport' : 'millbrook';
  useCityMusic({ city, enabled: soundEnabled, muted: state.mode === 'battle', volume: .16 });
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [rewardQueue, setRewardQueue] = useState<Reward[]>([]);
  const [pendingRematch, setPendingRematch] = useState<AdventureState['battle']>(null);
  const previousRewardState = useRef(state);
  /** Read-only overlays (dossier, troupe) pause walking like any modal. */
  const overlayOpen = dossierOpen || troupeOpen || backpackOpen;
  const loaded = useRef(false);
  const [loadout, setLoadout] = useState<PreparedThrowLoadout | undefined>();
  const [motion, setMotion] = useState<-1 | 0 | 1>(0);
  const [viewport, setViewport] = useState({ width: 1280, height: 640 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const keys = useRef(new Set<string>());
  const touchDirection = useRef<-1 | 0 | 1>(0);
  const directionRef = useRef<-1 | 0 | 1>(0);
  const destinationRef = useRef<number | null>(null);
  const playerXRef = useRef(state.player.x);
  useLayoutEffect(() => {
    playerXRef.current = state.player.x;
  }, [state.player.x]);
  // Saves: restore once on mount, then keep the latest state (no clocks in the envelope).
  useEffect(() => {
    let cancelled = false;
    // Restore after mounting; the initial save effect cannot overwrite an unread save.
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        const restored = raw ? restoreAdventure(raw) : null;
        if (restored) {
          previousRewardState.current = restored.state;
          dispatch({ type: 'load', state: restored.state });
          const saved = restored.envelope.loadout as PreparedThrowLoadout | undefined;
          if (validPreparedThrowLoadout(saved)) setLoadout(saved);
        }
      } catch {
        // Storage may be unavailable (private mode); the story simply starts fresh.
      }
      loaded.current = true;
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(SAVE_KEY, serializeAdventure(state, loadout ? { loadout } : {}));
    } catch {
      // Ignore quota or privacy errors; progress then lasts for this visit only.
    }
  }, [state, loadout]);
  useEffect(() => {
    const before = previousRewardState.current;
    previousRewardState.current = state;
    if (!loaded.current || before.act !== state.act) return;
    const gains = adventureGains(before, state);
    if (gains) queueMicrotask(() => setRewardQueue((old) => [...old, gains]));
  }, [state]);
  const map = MAPS[state.map];
  const act = ACTS[state.act - 1];
  const spots = visibleHotspots(state);
  const objective = adventureObjective(state);
  const sideObjectives = adventureSideObjectives(state);
  const backpackReady = backpackUnlocked(state);
  const reward = rewardQueue[0];
  const backpackIntroOpen = backpackReady && !state.flags.backpackGuided && state.mode === 'explore' && !reward && !overlayOpen && !mapOpen;
  const objectiveActive = state.mode !== 'complete';
  const nearby = nearbyHotspot(state);
  const speaker = (id: CharacterId) => (id === 'narrator' ? narratorFor(state.act) : CHARACTERS[id]);
  const dialogue = state.dialogue ? DIALOGUES[state.dialogue.id] : null;
  const line =
    state.dialogue && dialogue ? dialogue.lines[state.dialogue.step] : null;
  // Only whoever is speaking shows a cameo: Eli keeps the left seat, the NPC the right.
  const npcSpeaker = line && line.speaker !== 'eli' && line.speaker !== 'narrator' ? line.speaker : null;
  const choices =
    dialogue && state.dialogue?.step === dialogue.lines.length - 1
      ? dialogue.choices
      : null;
  const inBattle = state.mode === 'battle';
  /** v6: the Sunday ledger and intel checks wait until the hero is back on the street. */
  const noticeOpen = Boolean(state.notice?.length) && state.mode === 'explore';
  const modalOpen =
    state.mode === 'dialogue' || state.mode === 'complete' || state.mode === 'panel' || mapOpen || overlayOpen || noticeOpen || Boolean(reward) || backpackIntroOpen;
  useEffect(() => {
    if (!pendingRematch || state.mode !== 'explore' || modalOpen) return;
    queueMicrotask(() => {
      dispatch({ type: 'rematch', previous: pendingRematch });
      setPendingRematch(null);
    });
  }, [pendingRematch, state.mode, modalOpen]);

  const refreshMotion = () => {
    destinationRef.current = null;
    const left = keys.current.has('ArrowLeft') || keys.current.has('KeyA');
    const right = keys.current.has('ArrowRight') || keys.current.has('KeyD');
    const direction =
      touchDirection.current || (left === right ? 0 : left ? -1 : 1);
    directionRef.current = direction;
    setMotion(direction);
  };
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const measure = () =>
      setViewport({
        width: element.clientWidth,
        height: element.clientHeight || 640,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [inBattle]);
  useEffect(() => {
    if (!modalOpen || !modalRef.current) return;
    const modal = modalRef.current;
    const previous = document.activeElement;
    const buttons = () => [
      ...modal.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    ];
    buttons()[0]?.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || modal.querySelector('dialog:modal')) return;
      const available = buttons();
      const first = available[0],
        last = available.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    modal.addEventListener('keydown', trap);
    return () => {
      modal.removeEventListener('keydown', trap);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, [modalOpen, state.dialogue?.id, state.dialogue?.step, mapOpen, state.panel, overlayOpen, reward, backpackIntroOpen]);
  useEffect(() => {
    const stop = () => {
      keys.current.clear();
      touchDirection.current = 0;
      directionRef.current = 0;
      destinationRef.current = null;
      setMotion(0);
    };
    stop();
    const down = (event: KeyboardEvent) => {
      if (reward || backpackIntroOpen) return;
      // Native child editors own their Escape, Tab and shortcut keys.
      if (event.target instanceof HTMLElement && event.target.closest('dialog:modal')) return;
      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      )
        return;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) {
        if (state.mode === 'explore' && !mapOpen && !overlayOpen && !noticeOpen) {
          event.preventDefault();
          keys.current.add(event.code);
          refreshMotion();
        }
        return;
      }
      if (event.repeat || state.mode === 'battle') return;
      if (event.code === 'KeyB' && state.mode === 'explore' && backpackReady && !mapOpen && !dossierOpen && !troupeOpen && !noticeOpen) {
        event.preventDefault();
        setBackpackOpen((old) => !old);
        return;
      }
      if (event.code === 'KeyM' && state.mode === 'explore' && !overlayOpen && !noticeOpen) {
        event.preventDefault();
        setMapOpen((old) => !old);
      }
      if (event.code === 'Escape') {
        setMapOpen(false);
        setDossierOpen(false);
        setTroupeOpen(false);
        setBackpackOpen(false);
        if (state.mode === 'panel') dispatch({ type: 'panel-close' });
        return;
      }
      if (mapOpen || overlayOpen || noticeOpen || state.mode === 'panel') return;
      // Leave focused buttons to their native Enter action, avoiding two dialogue advances.
      if (
        event.code === 'Enter' &&
        event.target instanceof HTMLElement &&
        event.target.closest('button')
      )
        return;
      if (event.code === 'KeyE' || event.code === 'Enter') {
        event.preventDefault();
        if (state.mode === 'dialogue') dispatch({ type: 'advance' });
        else if (state.mode === 'explore') dispatch({ type: 'interact' });
      }
    };
    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
      refreshMotion();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', stop);
      stop();
    };
  }, [state.mode, state.map, mapOpen, overlayOpen, noticeOpen, reward, backpackIntroOpen, backpackReady, dossierOpen, troupeOpen]);
  useEffect(() => {
    if (state.mode !== 'explore' || modalOpen) return;
    let frame = 0,
      last = performance.now(),
      accumulator = 0;
    const loop = (now: number) => {
      const destination = destinationRef.current;
      const distance =
        destination === null ? 0 : destination - playerXRef.current;
      if (destination !== null && Math.abs(distance) < 5) {
        destinationRef.current = null;
        directionRef.current = 0;
        setMotion(0);
      } else if (destination !== null)
        directionRef.current = distance < 0 ? -1 : 1;
      if (document.hidden || directionRef.current === 0) accumulator = 0;
      else {
        accumulator += Math.min(100, now - last);
        const ticks = Math.min(
          5,
          Math.floor(accumulator / WALK_TICK_MS),
          destination === null ? 5 : Math.floor(Math.abs(distance) / 5),
        );
        if (ticks) {
          accumulator -= ticks * WALK_TICK_MS;
          dispatch({ type: 'walk', direction: directionRef.current, ticks });
        }
      }
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.mode, state.map, modalOpen]);

  const hold = (event: PointerEvent<HTMLButtonElement>, direction: -1 | 1) => {
    if (state.mode !== 'explore' || modalOpen) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    touchDirection.current = direction;
    refreshMotion();
  };
  const release = () => {
    touchDirection.current = 0;
    refreshMotion();
  };
  const approach = (id: string, x: number) => {
    if (state.mode !== 'explore' || modalOpen) return;
    if (nearby?.id === id) {
      dispatch({ type: 'interact', id });
      return;
    }
    const spot = spots.find((candidate) => candidate.id === id);
    const targetX =
      spot?.kind === 'npc' ? x + (state.player.x < x ? -104 : 104) : x;
    destinationRef.current = Math.max(48, Math.min(map.width - 48, targetX));
    const direction = targetX < state.player.x ? -1 : 1;
    directionRef.current = direction;
    setMotion(direction);
  };
  const targetOnMap = objective.target;
  const routeMarkers: RouteMarker[] = spots.flatMap((spot) => [
    ...(objectiveActive && spot.id === targetOnMap ? [{id: `main:${spot.id}`, spotId: spot.id, x: spot.x, title: objective.title, side: false}] : []),
    ...(sideObjectives.some((side) => side.target === spot.id) ? [{id: `side:${spot.id}`, spotId: spot.id, x: spot.x,
      title: sideObjectives.filter((side) => side.target === spot.id).map((side) => side.title).join('、'), side: true}] : []),
  ]).sort((a, b) => Number(a.side) - Number(b.side));
  const setup = state.mode === 'battle' ? battleSetup(state) : null;
  if (state.mode === 'battle' && state.battle && setup) {
    const battle = state.battle;
    const opponent = setup.opponent as RigId;
    return (
      <div className="rg-duel">
        <ThrowTable
          key={battle.id}
          initialSoundEnabled={soundEnabled}
          onSoundChange={setSoundEnabled}
          challenge={{
            enemyStyle: battle.enemyStyle,
            seed: battle.seed,
            title: setup.title,
            enemyItems: setup.enemyItems,
            enemyRelic: setup.enemyRelic,
            enemyBook: setup.enemyBook,
            terms: setup.terms,
            rule: setup.rule,
            enemyPerformer: setup.enemyPerformer,
            presence: setup.presence,
            enemyPresence: setup.enemyPresence,
            intel: setup.intel,
            playerUpgrades: state.itemUpgrades,
            playerTeam: setup.playerTeam,
            enemyTeam: setup.enemyTeam,
            teamChoices: setup.teamChoices,
            enemyOrderKnown: setup.enemyOrderKnown,
            stanEncore: setup.stanEncore,
            playerReserve: setup.playerReserve,
            enemyReserve: setup.enemyReserve,
            enemyReserveCharacter: setup.enemyReserveCharacter as RigId | undefined,
          }}
          playerPerformer={setup.performers.length > 1 ? undefined : 'eli'}
          performerChoices={setup.performers.length > 1 ? setup.performers : undefined}
          memberBooks={setup.books}
          hostNames={['伊莱', CHARACTERS[setup.opponent].name]}
          initialLoadout={fitLoadout(loadout ?? (state.act >= 4 ? MILLBROOK_LOADOUT : state.act > 1 ? BRIDGEPORT_LOADOUT : STARTER_LOADOUT), setup.available, setup.forced)}
          hosts={['eli', opponent]}
          available={{ ...setup.available, ...(state.act > 1 ? { variants: setup.variants } : {}) }}
          coach={battle.coach}
          tutorialHints={state.act < 3 && !state.flags.westArrived}
          tip={state.act < 3 && !state.flags.westArrived && battle.kind !== 'qualifier' ? setup.tip : undefined}
          onReturn={(winner, nextLoadout, report) => {
            // A borrowed trunk goes back to its owner; keep your own.
            if (!setup.forced) setLoadout(nextLoadout);
            else if (loadout) setLoadout({ ...loadout, book: nextLoadout.book });
            dispatch(
              winner === null
                ? { type: 'abandon' }
                : { type: 'result', id: battle.id, winner, report },
            );
          }}
          onRetry={(winner, nextLoadout, report) => {
            if (winner === null) return;
            if (!setup.forced) setLoadout(nextLoadout);
            else if (loadout) setLoadout({ ...loadout, book: nextLoadout.book });
            setPendingRematch(battle);
            dispatch({ type: 'result', id: battle.id, winner, report });
          }}
        />
      </div>
    );
  }

  return (
    <main className="rg-root" data-sidequest={sideObjectives.length > 0}>
      <header className="rg-header">
        <div className="rg-wordmark">
          <svg viewBox="0 0 100 100" className="rg-brand-mark" aria-hidden="true">
            <SuitMark suit={0} size={64} x={50} y={52} color="currentColor" />
          </svg>
          <div>
            <h1>最后一张王牌</h1>
            <span lang="en">The Last Ace</span>
          </div>
        </div>
        <div className="rg-chapter">
          <span>{act.number}</span>
          <strong>{act.title}</strong>
        </div>
        <nav aria-label="游戏菜单">
          {state.act > 1 && <Fee value={state.fee} />}
          {state.act > 1 && (
            <span className="rg-clock" aria-live="polite" aria-label={clockLabel(state)}>
              <span className="rg-clock-week">第 {weekNumber(state.clock.day)} 周 · </span>
              {WEEKDAYS[weekday(state.clock.day)]} · {SLOT_NAMES[state.clock.slot]}
              <button
                onClick={() => dispatch({ type: 'rest' })}
                disabled={state.mode !== 'explore' || noticeOpen}
                title="让一个时段过去：散散步，喝杯茶，什么也不干"
              >
                歇一会
              </button>
            </span>
          )}
          {state.act > 1 && (
            <button onClick={() => setDossierOpen(true)} disabled={state.mode !== 'explore' || !(state.flags.metDodd || state.flags.westRegistered)}>
              档案
            </button>
          )}
          {troupeUnlocked(state) && (
            <button onClick={() => setTroupeOpen(true)} disabled={state.mode !== 'explore'}>
              剧团 <small>{state.troupe.length}</small>
            </button>
          )}
          {backpackReady && <button onClick={() => setBackpackOpen(true)} disabled={modalOpen}>
            <CardsIcon /> 背包 <kbd>B</kbd>
          </button>}
          <button className="rg-audio-toggle" aria-pressed={soundEnabled} title={CITY_SCORES[city].title} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? '♫ 声音开' : '♫ 声音关'}</button>
          <button
            onClick={() => setMapOpen(true)}
            disabled={state.mode !== 'explore'}
          >
            <MapIcon /> 地图 <kbd>M</kbd>
          </button>
          <Link href={sitePath('/wandeng/throw')}>
            <CardsIcon /> 练习场
          </Link>
        </nav>
      </header>

      <div
        className="rg-viewport"
        ref={viewportRef}
        data-art-style="limelight"
        aria-label={`${map.name}，伊莱所在位置 ${Math.round(state.player.x)}`}
      >
        <div
          key={state.map}
          className="rg-world"
          ref={worldRef}
          style={{ width: map.width, height: map.height }}
        >
          <StageScene
            mapId={state.map}
            lodgingId={state.viewedLodging ?? undefined}
            playerX={state.player.x}
            facing={state.player.facing}
            walking={
              motion !== 0 &&
              state.mode === 'explore' &&
              !mapOpen &&
              (motion < 0
                ? state.player.x > 48
                : state.player.x < map.width - 48)
            }
            viewport={viewport}
            worldRef={worldRef}
            spotlight={state.act > 1 || state.flags.ticket ? 1 : state.flags.trained ? 0.45 : 0.12}
            hotspots={spots}
          />
          {spots.map((spot) => (
            <div
              key={spot.id}
              className={`rg-hotspot rg-hotspot-${spot.kind} ${nearby?.id === spot.id ? 'is-near' : ''}`}
              style={{ left: spot.x, top: map.floor }}
            >
              <button
                className="rg-hotspot-hitarea"
                onClick={() => approach(spot.id, spot.x)}
                disabled={state.mode !== 'explore' || mapOpen}
                aria-label={`步行至${spot.label}`}
                tabIndex={-1}
              />
              {hotspotInReach(state, spot) && !mapOpen && <button
                className={`rg-hotspot-label ${sideObjectives.some((side) => side.target === spot.id) ? 'rg-side-target' : ''}`}
                onClick={() => dispatch({ type: 'interact', id: spot.id })}
                aria-label={`${spot.kind === 'door' ? '进入' : spot.kind === 'pickup' ? '查看' : '交互'}${spot.label}`}
              >
                <span>{spot.label}</span>
                <kbd>E</kbd>
              </button>}
              <div className="rg-hotspot-icons" aria-label={`${spot.label}标识`}>
                {(spot.functions ?? []).map((kind) => <button key={kind} className="rg-function-marker"
                  title={LOCATION_FUNCTION_NAMES[kind]} aria-label={`功能：${LOCATION_FUNCTION_NAMES[kind]} · ${spot.label}`}
                  onClick={() => approach(spot.id, spot.x)} disabled={modalOpen}>
                  <LocationFunctionIcon kind={kind} />
                </button>)}
                {spot.id === targetOnMap && objectiveActive && <button className="rg-quest-marker" aria-label={`当前任务：${objective.title}`} title={objective.title}
                  onClick={() => approach(spot.id, spot.x)} disabled={state.mode !== 'explore' || mapOpen}>
                  <QuestScroll />
                </button>}
              {sideObjectives.some((side) => side.target === spot.id) && <button
                className="rg-quest-marker rg-side-marker"
                aria-label={`支线任务：${sideObjectives.filter((side) => side.target === spot.id).map((side) => side.title).join('、')}`} title={sideObjectives.filter((side) => side.target === spot.id).map((side) => side.title).join('、')} onClick={() => approach(spot.id, spot.x)} disabled={modalOpen}>
                <QuestScroll />
              </button>}
              </div>
              {spot.id === targetOnMap && objectiveActive && <i className="rg-waypoint" />}
            </div>
          ))}
        </div>
        {state.mode === 'explore' && !modalOpen && <EdgeRouteMarkers markers={routeMarkers} worldWidth={map.width}
          viewportRef={viewportRef} worldRef={worldRef} onApproach={approach} />}
        <div className="rg-location">
          <i />
          <div>
            <strong>{state.map.endsWith('-home') ? viewedLodgingOf(state)?.name ?? map.name : map.name}</strong>
            <span>{map.subtitle}</span>
          </div>
        </div>
        {state.mode === 'explore' && (
          <div className="rg-objectives"><div className="rg-objective">
            <div className="rg-objective-portrait">
              <Figure crop="head" character={objectivePortrait(state, objective.target)} height={84} />
            </div>
            <div>
              <small className="rg-objective-category">主线</small><strong>{objective.title}</strong>
              <span>{objective.detail}</span>
            </div>
          </div>{sideObjectives.length > 0 && <details className="rg-side-journal" open={sideObjectives.length < 3}>
            <summary><QuestScroll /> 支线节目单 <b>{sideObjectives.length}</b><span>展开查看</span></summary>
            {sideObjectives.map((side) => <div key={side.title} className="rg-objective rg-side-objective">
            <QuestScroll /><div><small className="rg-objective-category">支线</small><strong>{side.title}</strong><span>{side.detail}</span></div>
          </div>)}</details>}</div>
        )}
        {state.mode === 'explore' && !mapOpen && !state.flags.trained && (
          <output className="rg-coach">
            {state.player.walkTicks === 0 ? (
              <>
                <span>
                  <kbd>A</kbd>
                  <kbd>D</kbd> 或 <kbd>←</kbd>
                  <kbd>→</kbd> 行走；也可以直接点人物、建筑或任务图标。
                </span>
                <small>别着急，格雷维克没什么好赶的。</small>
              </>
            ) : state.map === 'street' ? (
              <>
                <span>
                  <DialogueText text="走到发光的门前，按" /> <kbd>E</kbd> 进去。
                </span>
                <small><DialogueText text="里德的工作室：橱窗里有兔子的那家。" /></small>
              </>
            ) : (
              <>
                <span>
                  <DialogueText text="靠近里德，按" /> <kbd>E</kbd> 打招呼。
                </span>
                <small>他假装在修东西，其实在等你。</small>
              </>
            )}
          </output>
        )}
        {state.act === 2 && state.mode === 'explore' && !mapOpen && !state.flags.metDoris && (
          <output className="rg-coach">
            <span>
              <DialogueText text="右上角是演出费：赢比赛、街头演出都会进账，在霍布斯旧货铺花掉。" />
            </span>
            <small>进度会自动保存在这台设备上。</small>
          </output>
        )}
        {state.flags.ticket && state.mode === 'explore' && (
          <div className="rg-pass">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <SuitMark suit={state.flags.champion ? 1 : 0} size={70} x={50} y={50} color="currentColor" />
            </svg>
            {state.flags.millChampion ? '米尔布鲁克剧团联赛冠军' : state.flags.noraChampion ? '韦斯特港职业联赛冠军' : state.flags.champion
              ? '布里奇波特公开赛冠军'
              : state.act > 1 && state.won.includes('ada') && state.won.includes('bea')
                ? '布里奇波特公开赛资格'
                : '格雷维克参赛证'}
          </div>
        )}
        {state.mode === 'explore' && !mapOpen && nearby && (
          <button
            className="rg-interact-prompt"
            onClick={() => dispatch({ type: 'interact' })}
          >
            <kbd>E</kbd>
            {nearby.kind === 'door'
              ? '进入'
              : nearby.kind === 'npc'
                ? '交谈'
                : nearby.kind === 'pickup'
                  ? '查看'
                  : nearby.kind === 'board'
                    ? '看看'
                    : '启程'}{' '}
            · {nearby.label}
          </button>
        )}

        {line && state.dialogue && dialogue && !reward && (
          <dialog
            ref={modalRef}
            open
            className={`rg-dialogue ${state.dialogue.id === 'opening' || state.dialogue.id === 'bp-arrival' || state.dialogue.id === 'wp-arrival' ? 'rg-opening' : ''}`}
            aria-modal="true"
            aria-label={speaker(line.speaker).name}
          >
            {line.speaker === 'eli' ? (
              <div className="rg-dialogue-portrait rg-dialogue-player is-speaking" data-speaker="eli" aria-label="伊莱，玩家">
                <Figure crop="bust" character="eli" height={188} />
              </div>
            ) : <div className="rg-dialogue-seat rg-dialogue-player" aria-hidden="true" />}
            <div className="rg-dialogue-content">
              <div className="rg-speaker">
                <strong>{speaker(line.speaker).name}</strong>
                <span>{speaker(line.speaker).role}</span>
              </div>
              <p key={`${state.dialogue.id}-${state.dialogue.step}`}>
                <DialogueText text={line.text} />
              </p>
              <div className="rg-dialogue-footer">
                <span>
                  {state.dialogue.step + 1} / {dialogue.lines.length}
                </span>
                <div>
                  {choices ? (
                    choices.map((choice) => (
                      <button
                        key={choice.id}
                        className={
                          choice.id === 'close' ? 'rg-secondary' : 'rg-primary'
                        }
                        onClick={() =>
                          dispatch({ type: 'choice', id: choice.id })
                        }
                      >
                        <DialogueText text={choice.label} /> <span>→</span>
                      </button>
                    ))
                  ) : (
                    <button
                      className="rg-primary"
                      onClick={() => dispatch({ type: 'advance' })}
                    >
                      {state.dialogue.step === dialogue.lines.length - 1
                        ? state.dialogue.id === 'opening'
                          ? '走进格雷维克'
                          : state.dialogue.id === 'bp-arrival'
                            ? '走进布里奇波特'
                            : state.dialogue.id === 'departure' || state.dialogue.id === 'bp-departure'
                              ? '启程'
                              : '继续旅程'
                        : '继续'}{' '}
                      <kbd>↵</kbd>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {npcSpeaker ? (
              <div key={npcSpeaker} className="rg-dialogue-portrait rg-dialogue-npc is-speaking"
                data-speaker={npcSpeaker} aria-label={`${CHARACTERS[npcSpeaker].name}，对话对象`}>
                <Figure crop="bust" character={npcSpeaker as RigId} height={188} facing={-1} />
              </div>
            ) : <div className="rg-dialogue-seat rg-dialogue-npc" aria-hidden="true" />}
          </dialog>
        )}

        {mapOpen && (
          <dialog
            ref={modalRef}
            open
            className="rg-map-modal"
            aria-modal="true"
            aria-label="巡回赛地图"
          >
            <div className="rg-map-heading">
              <div>
                <h2>从这条街，到世界舞台。</h2>
                <span>巡回赛路线</span>
              </div>
              <button aria-label="关闭地图" onClick={() => setMapOpen(false)}>
                ×
              </button>
            </div>
            <div className="rg-district-map">
              <div className="rg-map-streetline" />
              {MAPS[act.start].hotspots
                .filter((spot) => spot.kind !== 'pickup')
                .map((spot) => (
                  <div key={spot.id} style={{ left: `${(spot.x / MAPS[act.start].width) * 100}%` }}>
                    <span>{spot.kind === 'door' ? '▥' : spot.kind === 'bus' ? '▰' : spot.kind === 'board' ? '★' : '♦'}</span>
                    <strong>{spot.label}</strong>
                  </div>
                ))}
              <i
                className="rg-map-you"
                style={{
                  left: `${((state.map === act.start ? state.player.x : (MAPS[act.start].hotspots.find((spot) => spot.target === state.map)?.x ?? 0)) / MAPS[act.start].width) * 100}%`,
                }}
              >
                你
              </i>
            </div>
            <div className="rg-tour-route">
              {route.map(([number, name, event], index) => (
                <div key={number} className={index === state.act - 1 ? 'is-current' : index < state.act - 1 ? 'is-done' : ''}>
                  <span>{number}</span>
                  <strong>{name}</strong>
                  <small>{event}</small>
                  {index >= ACTS.length && <em>尚未开放 · 司机说快了</em>}
                  {index < ACTS.length && index !== state.act - 1 && (
                    <button
                      className="rg-chapter-jump"
                      onClick={() => {
                        setMapOpen(false);
                        setLoadout(undefined);
                        dispatch({ type: 'restart', act: (index + 1) as ActId });
                      }}
                    >
                      从这一幕重新开始
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="rg-map-bottom">
              <span>{objective.title}</span>
              <button className="rg-primary" onClick={() => setMapOpen(false)}>
                返回街区 <kbd>Esc</kbd>
              </button>
            </div>
          </dialog>
        )}

        {state.mode === 'panel' && state.panel === 'shop' && (
          <ShopPanel state={state} modalRef={modalRef} onBuy={(id) => dispatch({ type: 'buy', id })} onClose={() => dispatch({ type: 'panel-close' })} />
        )}
        {state.mode === 'panel' && state.panel === 'shows' && (
          <ShowsPanel state={state} modalRef={modalRef} onStart={(id) => dispatch({ type: 'show', id })} onClose={() => dispatch({ type: 'panel-close' })} />
        )}
        {state.mode === 'panel' && state.panel === 'recruits' && <RecruitBoard state={state} modalRef={modalRef}
          onHire={() => dispatch({ type: 'hire', id: 'stan' })} onClose={() => dispatch({ type: 'panel-close' })} />}
        {state.mode === 'panel' && state.panel === 'workshop' && <WorkshopPanel state={state} modalRef={modalRef}
          onUpgrade={(id, tier) => dispatch({ type: 'upgrade', id, tier })} onClose={() => dispatch({ type: 'panel-close' })} />}
        {backpackOpen && <BackpackPanel state={state} modalRef={modalRef} onClose={() => setBackpackOpen(false)}
          loadout={fitLoadout(loadout ?? (state.act >= 4 ? MILLBROOK_LOADOUT : state.act > 1 ? BRIDGEPORT_LOADOUT : STARTER_LOADOUT), unlockedKit(state))} onChange={setLoadout} />}
        {(troupeOpen || (state.mode === 'panel' && state.panel === 'troupe')) && (
          <TroupePanel
            state={state}
            modalRef={modalRef}
            onClose={() => { setTroupeOpen(false); if (state.mode === 'panel') dispatch({ type: 'panel-close' }); }}
            onLife={state.act > 1 ? (action) => dispatch({ type: 'life', action }) : undefined}
          />
        )}
        {((state.mode === 'panel' && state.panel === 'dossier') || dossierOpen) && (
          <DossierPanel
            state={state}
            modalRef={modalRef}
            onClose={() => {
              setDossierOpen(false);
              dispatch({ type: 'panel-close' });
            }}
            onScout={state.act > 1 ? (battle, source) => dispatch({ type: 'scout', battle, source }) : undefined}
          />
        )}
        {noticeOpen && !overlayOpen && !mapOpen && !reward && !backpackIntroOpen && (
          <dialog ref={modalRef} open className="rg-map-modal rg-panel rg-notice" aria-modal="true" aria-label="消息">
            <ul>
              {state.notice!.map((line, index) => (
                <li key={index} className={line.includes('情报有误') ? 'is-false' : line.includes('结账') ? 'is-heading' : ''}>
                  <DialogueText text={line} />
                </li>
              ))}
            </ul>
            <button className="rg-primary" onClick={() => dispatch({ type: 'notice-close' })} autoFocus>
              知道了
            </button>
          </dialog>
        )}

        {state.mode === 'complete' && (
          <dialog
            ref={modalRef}
            open
            className="rg-complete"
            aria-modal="true"
            aria-label={`${act.number}完成`}
          >
            <svg viewBox="0 0 100 100" className="rg-complete-suit" aria-hidden="true">
              <SuitMark suit={state.act === 1 ? 0 : 1} size={70} x={50} y={50} color="currentColor" />
            </svg>
            <span className="rg-eyebrow">{act.number} 完</span>
            {state.act === 1 ? (
              <>
                <h2>
                  第一张节目单，
                  <br />
                  写着你的名字。
                </h2>
                <p>伊莱·维尔 · 格雷维克资格赛优胜</p>
                <div className="rg-ticket-art">
                  <b>BRIDGEPORT</b>
                  <span>下一站 · 布里奇波特公开赛</span>
                  <i>♠ ♦ ♣ ♥</i>
                </div>
                <small>巴士已经在门口了。司机说他“顺便”想去布里奇波特看看那里的厕所。</small>
              </>
            ) : state.act === 2 ? (
              <>
                <h2>
                  这一次，
                  <br />
                  观众自己买了票。
                </h2>
                <p>伊莱·维尔 · 布里奇波特公开赛冠军 · 演出费 {state.fee}</p>
                <div className="rg-ticket-art">
                  <b>WESTPORT</b>
                  <span>下一站 · 韦斯特港职业赛</span>
                  <i>♠ ♦ ♣ ♥</i>
                </div>
                <small>朱诺已经上车。下一站有人读过你的档案——也有人等着改写它。</small>
              </>
            ) : state.act === 3 ? (
              <>
                <h2>这一次，<br />他们记住了你的判断。</h2>
                <p>伊莱·维尔 · 韦斯特港职业赛冠军</p>
                <div className="rg-ticket-art"><b>MILLBROOK</b><span>下一站 · 米尔布鲁克剧团联赛</span><i>♠ ♦ ♣ ♥</i></div>
                <small>第三幕完成。你可以继续探索港口、完成支线、照顾伙伴与整理巡演箱。下一站米尔布鲁克，伙伴将有各自的一幕。</small>
              </>
            ) : <><h2>这一次，<br />节目单写了所有人的名字。</h2><p>米尔布鲁克 · 剧团联赛冠军</p><div className="rg-ticket-art"><b>AURORA</b><span>世界赛外卡邀请 · 霍尔特的指挥棒</span><i>♠ ♦ ♣ ♥</i></div><small>第四幕完成。可继续铜管乐队、篝火之夜与午夜钟声，或坐巴士回访旧城。奥罗拉是下一幕，尚未开放。</small></>}
            <div>
              <button className={state.act < 4 ? 'rg-secondary' : 'rg-primary'} onClick={() => dispatch({ type: 'explore' })}>
                {state.act === 3 ? '留在港口' : '留在小镇'}
              </button>
              {state.act < 4 && (
                <button className="rg-primary" onClick={() => dispatch({ type: 'travel' })}>
                  前往{state.act === 1 ? '布里奇波特' : state.act === 2 ? '韦斯特港' : '米尔布鲁克'} <span>→</span>
                </button>
              )}
            </div>
          </dialog>
        )}
        {backpackIntroOpen && <BackpackIntro modalRef={modalRef} onLater={() => dispatch({ type: 'backpack-guided' })}
          onOpen={() => { dispatch({ type: 'backpack-guided' }); setBackpackOpen(true); }} />}
        {reward && <RewardReveal reward={reward} modalRef={modalRef} onClose={() => setRewardQueue((old) => old.slice(1))} />}
      </div>

      <footer className="rg-footer">
        <div className="rg-controls">
          <span>
            <kbd>A</kbd>
            <kbd>D</kbd> / <kbd>←</kbd>
            <kbd>→</kbd> 行走
          </span>
          <span>
            <kbd>E</kbd> 交互
          </span>
          <span>
            <kbd>M</kbd> 地图
          </span>
        </div>
        <div className="rg-touch-controls">
          <button
            aria-label="向左行走"
            disabled={state.mode !== 'explore' || mapOpen}
            onPointerDown={(event) => hold(event, -1)}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
          >
            ←
          </button>
          <button
            aria-label="向右行走"
            disabled={state.mode !== 'explore' || mapOpen}
            onPointerDown={(event) => hold(event, 1)}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
          >
            →
          </button>
        </div>
        <span className="rg-footer-caption">点击地点，也可步行前往。</span>
      </footer>
    </main>
  );
}
