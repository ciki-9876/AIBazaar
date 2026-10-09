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
  advanceDialogue,
  adventureObjective,
  CHARACTERS,
  chooseDialogue,
  createAdventure,
  DIALOGUES,
  finishAdventureBattle,
  interactAdventure,
  keepExploring,
  MAPS,
  nearbyHotspot,
  walkAdventure,
  WALK_TICK_MS,
  type AdventureState,
  type ChoiceId,
} from '../../lib/adventure/magician-world';
import ThrowTable, {
  type PreparedThrowLoadout,
} from '../wandeng/throw/throw-table';
import { Figure, type RigId } from '../stage/rig';
import { StageScene } from '../stage/stage-scene';
import { SuitMark } from '../stage/card-art';

type Action =
  | { type: 'walk'; direction: -1 | 0 | 1; ticks: number }
  | { type: 'interact'; id?: string }
  | { type: 'advance' }
  | { type: 'choice'; id: ChoiceId }
  | { type: 'result'; id: number; winner: 0 | 1 | 'draw' }
  | { type: 'abandon' }
  | { type: 'explore' }
  | { type: 'restart' };
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
      return finishAdventureBattle(state, action.id, action.winner);
    case 'abandon':
      return abandonAdventureBattle(state);
    case 'explore':
      return keepExploring(state);
    case 'restart':
      return createAdventure(state.seed);
  }
}
const route = [
  ['01', '格雷维克', '第一张参赛证'],
  ['02', '布里奇波特', '小镇公开赛'],
  ['03', '韦斯特港', '城市职业赛'],
  ['04', '奥罗拉', '都会大师赛'],
  ['05', '世界大剧院', '世界冠军赛'],
] as const;

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
  const map = MAPS[state.map];
  const objective = adventureObjective(state);
  const nearby = nearbyHotspot(state);
  const dialogue = state.dialogue ? DIALOGUES[state.dialogue.id] : null;
  const line =
    state.dialogue && dialogue ? dialogue.lines[state.dialogue.step] : null;
  const choices =
    dialogue && state.dialogue?.step === dialogue.lines.length - 1
      ? dialogue.choices
      : null;
  const inBattle = state.mode === 'battle';
  const modalOpen =
    state.mode === 'dialogue' || state.mode === 'complete' || mapOpen;

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
  }, [modalOpen, state.dialogue?.id, state.dialogue?.step, mapOpen]);
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
        return;
      }
      if (mapOpen) return;
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
  }, [state.mode, state.map, mapOpen]);
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
    const spot = map.hotspots.find((candidate) => candidate.id === id);
    const targetX =
      spot?.kind === 'npc' ? x + (state.player.x < x ? -104 : 104) : x;
    destinationRef.current = Math.max(48, Math.min(map.width - 48, targetX));
    const direction = targetX < state.player.x ? -1 : 1;
    directionRef.current = direction;
    setMotion(direction);
  };
  const targetOnMap =
    state.map === 'workshop' && !state.flags.trained
      ? 'reed'
      : state.map === 'theatre' && !state.flags.ticket
        ? 'felix'
        : objective.target;
  if (state.mode === 'battle' && state.battle) {
    const battle = state.battle;
    const opponent = battle.kind === 'practice' ? 'reed' : 'felix';
    return (
      <div className="rg-duel">
        <ThrowTable
          key={battle.id}
          challenge={{
            enemyStyle: battle.enemyStyle,
            seed: battle.seed,
            title:
              battle.kind === 'practice'
                ? '里德的练习对决'
                : '抒情剧院 · 资格挑战',
          }}
          hostNames={['伊莱', CHARACTERS[opponent].name]}
          initialLoadout={loadout}
          hosts={['eli', opponent]}
          onReturn={(winner, nextLoadout) => {
            setLoadout(nextLoadout);
            dispatch(
              winner === null
                ? { type: 'abandon' }
                : { type: 'result', id: battle.id, winner },
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
          <span>第一幕</span>
          <strong>让他们记住你的名字</strong>
        </div>
        <nav aria-label="游戏菜单">
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
            spotlight={state.flags.ticket ? 1 : state.flags.trained ? 0.45 : 0.12}
          />
          {map.hotspots.map((spot) => (
            <div
              key={spot.id}
              className={`rg-hotspot rg-hotspot-${spot.kind} ${nearby?.id === spot.id ? 'is-near' : ''}`}
              style={{ left: spot.x, top: map.floor }}
            >
              <button
                className="rg-hotspot-label"
                onClick={() => approach(spot.id, spot.x)}
                disabled={state.mode !== 'explore' || mapOpen}
                aria-label={`${nearby?.id !== spot.id ? '步行至' : spot.kind === 'door' ? '进入' : '交互'}${spot.label}`}
              >
                {spot.id === targetOnMap && <span className="rg-quest-diamond" />}
                <span>{spot.label}</span>
                {nearby?.id === spot.id && <kbd>E</kbd>}
              </button>
              {spot.id === targetOnMap && <i className="rg-waypoint" />}
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
              <Figure
                crop="head"
                character={
                  !state.flags.trained
                    ? 'reed'
                    : !state.flags.ticket
                      ? 'felix'
                      : 'eli'
                }
                height={84}
              />
            </div>
            <div>
              <strong>{objective.title}</strong>
              <span>{objective.detail}</span>
            </div>
          </div>
        )}
        {state.flags.ticket && state.mode === 'explore' && (
          <div className="rg-pass">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <SuitMark suit={0} size={70} x={50} y={50} color="currentColor" />
            </svg>
            格雷维克参赛证
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
                : '启程'}{' '}
            · {nearby.label}
          </button>
        )}

        {line && state.dialogue && dialogue && (
          <dialog
            ref={modalRef}
            open
            className={`rg-dialogue ${state.dialogue.id === 'opening' ? 'rg-opening' : ''}`}
            aria-modal="true"
            aria-label={CHARACTERS[line.speaker].name}
          >
            <div className="rg-dialogue-portrait" data-speaker={line.speaker}>
              {line.speaker !== 'narrator' ? (
                <Figure
                  key={line.speaker}
                  crop="bust"
                  character={line.speaker as RigId}
                  height={188}
                />
              ) : (
                <svg viewBox="0 0 100 100" className="rg-portrait-suit" aria-hidden="true">
                  <SuitMark suit={0} size={56} x={50} y={50} color="currentColor" />
                </svg>
              )}
            </div>
            <div className="rg-dialogue-content">
              <div className="rg-speaker">
                <strong>{CHARACTERS[line.speaker].name}</strong>
                <span>{CHARACTERS[line.speaker].role}</span>
              </div>
              <p key={`${state.dialogue.id}-${state.dialogue.step}`}>
                {line.text}
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
                        {choice.label} <span>→</span>
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
                          : state.dialogue.id === 'departure'
                            ? '启程'
                            : '继续旅程'
                        : '继续'}{' '}
                      <kbd>↵</kbd>
                    </button>
                  )}
                </div>
              </div>
            </div>
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
              {MAPS.street.hotspots.map((spot) => (
                <div
                  key={spot.id}
                  style={{ left: `${(spot.x / MAPS.street.width) * 100}%` }}
                >
                  <span>
                    {spot.kind === 'door'
                      ? '▥'
                      : spot.kind === 'bus'
                        ? '▰'
                        : '♦'}
                  </span>
                  <strong>{spot.label}</strong>
                </div>
              ))}
              <i
                className="rg-map-you"
                style={{
                  left: `${((state.map === 'street' ? state.player.x : state.map === 'workshop' ? 485 : 1340) / MAPS.street.width) * 100}%`,
                }}
              >
                你
              </i>
            </div>
            <div className="rg-tour-route">
              {route.map(([number, name, event], index) => (
                <div key={number} className={index === 0 ? 'is-current' : ''}>
                  <span>{number}</span>
                  <strong>{name}</strong>
                  <small>{event}</small>
                  {index > 0 && <em>后续章节</em>}
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

        {state.mode === 'complete' && (
          <dialog
            ref={modalRef}
            open
            className="rg-complete"
            aria-modal="true"
            aria-label="第一幕完成"
          >
            <svg viewBox="0 0 100 100" className="rg-complete-suit" aria-hidden="true">
              <SuitMark suit={0} size={70} x={50} y={50} color="currentColor" />
            </svg>
            <span className="rg-eyebrow">第一幕 完</span>
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
            <small>首个街区体验结束，后续城市章节尚未开放。</small>
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
              <button
                className="rg-primary"
                onClick={() => dispatch({ type: 'explore' })}
              >
                留在小镇
              </button>
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
