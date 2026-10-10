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
  battleSetup,
  buyOffer,
  CHARACTERS,
  chooseDialogue,
  clearNotice,
  closePanel,
  gatherIntel,
  haveTea,
  helpLandlady,
  passTime,
  payArrears,
  SLOT_NAMES,
  WEEKDAYS,
  weekday,
  weekNumber,
  rehearse,
  rentLodging,
  setMeals,
  createAdventure,
  DIALOGUES,
  finishAdventureBattle,
  hotspotInReach,
  interactAdventure,
  keepExploring,
  MAPS,
  narratorFor,
  nearbyHotspot,
  restoreAdventure,
  SAVE_KEY,
  serializeAdventure,
  startShow,
  STARTER_ITEMS,
  travelOn,
  visibleHotspots,
  walkAdventure,
  WALK_TICK_MS,
  type AdventureState,
  type BattleId,
  type CharacterId,
  type IntelSource,
  type ShowId,
} from '../../lib/adventure/magician-world';
import type { PerformerId } from '../../lib/cards/throw-performer';
import ThrowTable, {
  type PreparedThrowLoadout,
} from '../wandeng/throw/throw-table';
import { packThrowItems, PRESETS, RELICS, validThrowLayout, type ItemId, type RelicId } from '../../lib/cards/throw-loadout';
import { validDeckBook } from '../../lib/cards/throw-enchant';
import { clockLabel, DossierPanel, Fee, ShopPanel, ShowsPanel, TroupePanel, type LifeAction } from './adventure-panels';
import { DialogueText } from './dialogue-text';

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
import { Figure, type RigId } from '../stage/rig';
import { StageScene } from '../stage/stage-scene';
import { SuitMark } from '../stage/card-art';

type Action =
  | { type: 'walk'; direction: -1 | 0 | 1; ticks: number }
  | { type: 'interact'; id?: string }
  | { type: 'advance' }
  | { type: 'choice'; id: string }
  | { type: 'result'; id: number; winner: 0 | 1 | 'draw'; report?: { suits: number[]; kinds: number[]; performer?: PerformerId } }
  | { type: 'abandon' }
  | { type: 'explore' }
  | { type: 'travel' }
  | { type: 'panel-close' }
  | { type: 'buy'; id: string }
  | { type: 'show'; id: ShowId }
  | { type: 'load'; state: AdventureState }
  | { type: 'restart'; act?: 1 | 2 }
  | { type: 'life'; action: LifeAction }
  | { type: 'rest' }
  | { type: 'scout'; battle: BattleId; source: IntelSource }
  | { type: 'notice-close' };
function life(state: AdventureState, action: LifeAction): AdventureState {
  switch (action.kind) {
    case 'tea':
      return haveTea(state, action.id);
    case 'rehearse':
      return rehearse(state, action.id);
    case 'rent':
      return rentLodging(state, action.id);
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
    case 'life':
      return life(state, action.action);
    case 'rest':
      return passTime(state);
    case 'scout':
      return gatherIntel(state, action.battle, action.source);
    case 'notice-close':
      return clearNotice(state);
  }
}
const route = [
  ['01', '格雷维克', '第一张参赛证'],
  ['02', '布里奇波特', '小镇公开赛'],
  ['03', '韦斯特港', '城市职业赛'],
  ['04', '奥罗拉', '都会大师赛'],
  ['05', '世界大剧院', '世界冠军赛'],
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
  /** Read-only overlays (dossier, troupe) pause walking like any modal. */
  const overlayOpen = dossierOpen || troupeOpen;
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
          dispatch({ type: 'load', state: restored.state });
          const saved = restored.envelope.loadout as PreparedThrowLoadout | undefined;
          if (saved && typeof saved === 'object' && Object.hasOwn(PRESETS, saved.style)
            && Array.isArray(saved.layout) && saved.layout.every((entry) => entry && typeof entry === 'object')
            && validThrowLayout(saved.layout) && (saved.relic === null || RELICS.some((entry) => entry.id === saved.relic))
            && (saved.book === undefined || validDeckBook(saved.book))) setLoadout(saved);
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
  const map = MAPS[state.map];
  const act = ACTS[state.act - 1];
  const spots = visibleHotspots(state);
  const objective = adventureObjective(state);
  const objectiveActive = state.act === 1 ? !state.flags.departed : !state.flags.leftBridgeport;
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
    state.mode === 'dialogue' || state.mode === 'complete' || state.mode === 'panel' || mapOpen || overlayOpen || noticeOpen;

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
      if (event.key !== 'Tab') return;
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
  }, [modalOpen, state.dialogue?.id, state.dialogue?.step, mapOpen, state.panel, overlayOpen]);
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
      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      )
        return;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) {
        if (state.mode === 'explore' && !mapOpen) {
          event.preventDefault();
          keys.current.add(event.code);
          refreshMotion();
        }
        return;
      }
      if (event.repeat || state.mode === 'battle') return;
      if (event.code === 'KeyM' && state.mode === 'explore') {
        event.preventDefault();
        setMapOpen((old) => !old);
      }
      if (event.code === 'Escape') {
        setMapOpen(false);
        setDossierOpen(false);
        setTroupeOpen(false);
        if (state.mode === 'panel') dispatch({ type: 'panel-close' });
        return;
      }
      if (mapOpen || overlayOpen || state.mode === 'panel') return;
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
  }, [state.mode, state.map, mapOpen, overlayOpen]);
  useEffect(() => {
    if (state.mode !== 'explore' || mapOpen) return;
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
  }, [state.mode, state.map, mapOpen]);

  const hold = (event: PointerEvent<HTMLButtonElement>, direction: -1 | 1) => {
    if (state.mode !== 'explore' || mapOpen) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    touchDirection.current = direction;
    refreshMotion();
  };
  const release = () => {
    touchDirection.current = 0;
    refreshMotion();
  };
  const approach = (id: string, x: number) => {
    if (state.mode !== 'explore' || mapOpen) return;
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
  const setup = state.mode === 'battle' ? battleSetup(state) : null;
  if (state.mode === 'battle' && state.battle && setup) {
    const battle = state.battle;
    const opponent = setup.opponent as RigId;
    return (
      <div className="rg-duel">
        <ThrowTable
          key={battle.id}
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
          }}
          playerPerformer={setup.performers.length > 1 ? undefined : 'eli'}
          performerChoices={setup.performers.length > 1 ? setup.performers : undefined}
          memberBooks={setup.books}
          hostNames={['伊莱', CHARACTERS[setup.opponent].name]}
          initialLoadout={fitLoadout(loadout ?? (state.act > 1 ? BRIDGEPORT_LOADOUT : STARTER_LOADOUT), setup.available, setup.forced)}
          hosts={['eli', opponent]}
          available={{ ...setup.available, ...(state.act > 1 ? { variants: setup.variants } : {}) }}
          coach={battle.coach}
          // v6: a formal opponent's gossip names their kit; it waits until their style is scouted.
          tip={setup.tip && battle.kind !== 'qualifier' && (setup.intel.fog === 'open' || setup.intel.visible.includes('style')) ? setup.tip : undefined}
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
        />
      </div>
    );
  }

  return (
    <main className="rg-root">
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
            <button onClick={() => setDossierOpen(true)} disabled={state.mode !== 'explore' || !state.flags.metDodd}>
              档案
            </button>
          )}
          {state.act > 1 && (
            <button onClick={() => setTroupeOpen(true)} disabled={state.mode !== 'explore'}>
              剧团 <small>{state.troupe.length}</small>
            </button>
          )}
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
                className="rg-hotspot-label"
                onClick={() => dispatch({ type: 'interact', id: spot.id })}
                aria-label={`${spot.kind === 'door' ? '进入' : spot.kind === 'pickup' ? '查看' : '交互'}${spot.label}`}
              >
                <span>{spot.label}</span>
                <kbd>E</kbd>
              </button>}
              {spot.id === targetOnMap && objectiveActive && state.mode !== 'complete' && <>
                <button className="rg-quest-marker" aria-label={`当前任务：${objective.title}`} title={objective.title}
                  onClick={() => approach(spot.id, spot.x)} disabled={state.mode !== 'explore' || mapOpen}>
                  <svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 2L30 10V29L16 38L2 29V10Z" /><path d="M16 10V23M16 28V29" /></svg>
                </button>
                <i className="rg-waypoint" />
              </>}
            </div>
          ))}
        </div>
        <div className="rg-location">
          <i />
          <div>
            <strong>{map.name}</strong>
            <span>{map.subtitle}</span>
          </div>
        </div>
        {state.mode === 'explore' && (
          <div className="rg-objective">
            <div className="rg-objective-portrait">
              <Figure crop="head" character={objectivePortrait(state, objective.target)} height={84} />
            </div>
            <div>
              <strong>{objective.title}</strong>
              <span>{objective.detail}</span>
            </div>
          </div>
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
                  走到发光的门前，按 <kbd>E</kbd> 进去。
                </span>
                <small>里德的工作室：橱窗里有兔子的那家。</small>
              </>
            ) : (
              <>
                <span>
                  靠近里德，按 <kbd>E</kbd> 打招呼。
                </span>
                <small>他假装在修东西，其实在等你。</small>
              </>
            )}
          </output>
        )}
        {state.act === 2 && state.mode === 'explore' && !mapOpen && !state.flags.metDoris && (
          <output className="rg-coach">
            <span>
              右上角是<b>演出费</b>：赢比赛、街头演出都会进账，在霍布斯旧货铺花掉。
            </span>
            <small>进度会自动保存在这台设备上。</small>
          </output>
        )}
        {state.flags.ticket && state.mode === 'explore' && (
          <div className="rg-pass">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <SuitMark suit={state.flags.champion ? 1 : 0} size={70} x={50} y={50} color="currentColor" />
            </svg>
            {state.flags.champion
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

        {line && state.dialogue && dialogue && (
          <dialog
            ref={modalRef}
            open
            className={`rg-dialogue ${state.dialogue.id === 'opening' || state.dialogue.id === 'bp-arrival' ? 'rg-opening' : ''}`}
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
                <Figure crop="bust" character={npcSpeaker as RigId} height={188} />
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
                        dispatch({ type: 'restart', act: (index + 1) as 1 | 2 });
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
        {troupeOpen && (
          <TroupePanel
            state={state}
            modalRef={modalRef}
            onClose={() => setTroupeOpen(false)}
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
        {noticeOpen && !overlayOpen && !mapOpen && (
          <dialog ref={modalRef} open className="rg-map-modal rg-panel rg-notice" aria-modal="true" aria-label="消息">
            <ul>
              {state.notice!.map((line, index) => (
                <li key={index} className={line.includes('情报有误') ? 'is-false' : line.includes('结账') ? 'is-heading' : ''}>
                  {line}
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
            ) : (
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
                <small>第二幕到此为止。第三幕正在排练——韦斯特港的海鸥还在跟导演谈片酬。</small>
              </>
            )}
            <div>
              <button
                className="rg-secondary"
                onClick={() => {
                  setLoadout(undefined);
                  dispatch({ type: 'restart' });
                }}
              >
                重新启幕
              </button>
              <button className={state.act === 1 ? 'rg-secondary' : 'rg-primary'} onClick={() => dispatch({ type: 'explore' })}>
                留在小镇
              </button>
              {state.act === 1 && (
                <button className="rg-primary" onClick={() => dispatch({ type: 'travel' })}>
                  前往布里奇波特 <span>→</span>
                </button>
              )}
            </div>
          </dialog>
        )}
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
