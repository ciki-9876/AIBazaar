'use client';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import { ObjectGlyph } from '../../stage/glyphs';
import { Figure, type RigAction, type RigId } from '../../stage/rig';
import { CardFace } from '../../stage/card-art';
import {
  HAND_NAMES,
  MULTIPLIERS,
  rankText,
  SUITS,
  type PlayingCard,
} from '../../../lib/cards/throw-poker';
import {
  createThrowDuel,
  drawInterval,
  handLimit,
  ITEMS,
  launchThrow,
  MAX_HP,
  PRESETS,
  previewThrow,
  RELICS,
  arrangeThrow,
  stepThrowDuel,
  TICK_MS,
  CURTAIN_MS,
  curtainDamage,
  battlePhase,
  termsAllow,
  type DuelTerms,
  type ItemId,
  type RelicId,
  type Style,
  type ThrowDuel,
  type ThrowFighter,
  type TriggerEffect,
} from '../../../lib/cards/throw-duel';
import { clickThrowSelection } from '../../../lib/cards/throw-selection';
import { enchantOf, RARITY_NAMES, type DeckBook } from '../../../lib/cards/throw-enchant';
import { bookCounts, DeckCase } from './throw-deckcase';
import {
  captureTableGeometry,
  FlightLayer,
  makeVisualShot,
  type TableGeometry,
  type VisualShot,
} from './throw-motion';
import { ThrowSound } from './throw-sound';
import { throwAdvice } from './throw-advice';
import { deservesCheer } from './throw-audience';
import { PhaseLights, VictoryConfetti } from './throw-celebration';
import ThrowWorkbench from './throw-workbench';
import {
  packThrowItems,
  type ItemPlacement,
} from '../../../lib/cards/throw-loadout';
import { ThrowSpectacle } from './throw-motion';
import { CoachCard, useCoach } from './throw-coach';
import type { CoachScript } from '../../../lib/adventure/magician-world';
import { COMPETITIVE_STYLES } from '../../../lib/cards/throw-loadout';

type Session = { duel: ThrowDuel; selected: string[]; flights: VisualShot[] };
type Action =
  | { type: 'tick'; count: number; geometry: TableGeometry }
  | { type: 'click'; uid: string }
  | { type: 'box'; ids: string[] }
  | { type: 'clear' }
  | { type: 'launch'; geometry: TableGeometry }
  | { type: 'arrange'; mode: 'rank' | 'suit' | 'gather' }
  | { type: 'start'; duel: ThrowDuel };
function reducer(state: Session, action: Action): Session {
  if (action.type === 'start')
    return { duel: action.duel, selected: [], flights: [] };
  if (action.type === 'clear') return { ...state, selected: [] };
  if (action.type === 'click')
    return {
      ...state,
      selected: clickThrowSelection(state.selected, action.uid),
    };
  if (action.type === 'box')
    return {
      ...state,
      selected: action.ids.filter((id) =>
        state.duel.fighters[0].hand.some((card) => card.uid === id),
      ),
    };
  if (action.type === 'arrange')
    return {
      ...state,
      duel: arrangeThrow(state.duel, 0, action.mode, state.selected),
    };
  let duel = state.duel;
  if (action.type === 'launch') duel = launchThrow(duel, 0, state.selected);
  else
    for (let index = 0; index < action.count; index++)
      duel = stepThrowDuel(duel);
  if (duel === state.duel) return state;
  const flights =
    duel.status === 'ended'
      ? []
      : duel.shots.map(
          (shot) =>
            state.flights.find((flight) => flight.shot.id === shot.id) ??
            makeVisualShot(shot, action.geometry),
        );
  return {
    duel,
    flights,
    selected: action.type === 'launch' ? [] : state.selected,
  };
}
function PokerCard({
  card,
  selected = false,
  enemy = false,
  onClick,
}: {
  card: PlayingCard;
  selected?: boolean;
  enemy?: boolean;
  onClick?: () => void;
}) {
  const variant = enemy ? undefined : enchantOf(card.ench);
  return (
    <button
      type="button"
      className={`tp-card ${card.suit % 2 ? 'tp-red' : ''} ${selected ? 'tp-selected' : ''}`}
      data-card-id={card.uid}
      aria-label={`${SUITS[card.suit]}${rankText(card.rank)}${variant ? ` · ${variant.name}` : ''}`}
      title={variant ? `${RARITY_NAMES[variant.rarity]} · ${variant.name}：${variant.text}` : undefined}
      aria-pressed={selected}
      disabled={enemy}
      onClick={onClick}
    >
      <CardFace card={card} compact={enemy} />
    </button>
  );
}
const effectText = (effect: TriggerEffect) =>
  effect.kind === 'heal' && effect.value === 0
    ? '满生命'
    : effect.kind === 'slow' || effect.kind === 'wound'
      ? `${effect.value / 1000}s`
      : effect.kind === 'pierce' || effect.kind === 'leech'
        ? `${effect.value}%`
        : effect.kind === 'draw'
          ? `+${effect.value}张`
          : `+${effect.value}`;
function Host({
  fighter,
  duel,
  side,
  name,
  character,
}: {
  fighter: ThrowFighter;
  duel: ThrowDuel;
  side: 0 | 1;
  name?: string;
  character: RigId;
}) {
  const relic = RELICS.find((entry) => entry.id === fighter.relic);
  const badges = [
    ...fighter.items.map((id) => {
      const item = ITEMS.find((entry) => entry.id === id)!;
      return {
        source: `item:${id}`,
        id: item.id,
        family: item.family,
        name: item.name,
        text: item.text,
      } as const;
    }),
    ...(relic
      ? [
          {
            source: `relic:${relic.id}`,
            id: relic.id,
            family: 'relic',
            name: relic.name,
            text: relic.text,
          } as const,
        ]
      : []),
  ];
  const hit = duel.events
    .filter((event) => event.type === 'hit' && event.side !== side)
    .at(-1);
  const launch = duel.events
    .filter((event) => event.type === 'launch' && event.side === side)
    .at(-1);
  const action: RigAction =
    hit && (!launch || hit.id > launch.id)
      ? { kind: 'hit', id: hit.id }
      : launch
        ? { kind: 'throw', id: launch.id }
        : null;
  const procs = duel.events
    .filter(
      (event) =>
        event.type === 'effect' &&
        event.side === side &&
        duel.tick - event.tick < 18,
    )
    .slice(-4);
  return (
    <section className={`tp-host tp-host-${side}`}>
      <div
        className={`tp-host-art ${hit && duel.tick - hit.tick < 7 ? 'tp-struck' : ''}`}
        data-host={side}
        data-shield={fighter.shield > 0}
        data-burning={fighter.burn > 0}
        data-poisoned={fighter.poison > 0}
        aria-label={`${name ?? (side === 0 ? '伊莱·维尔' : '菲利克斯·克罗')}，对决角色`}
      >
        <span className="tp-host-light" aria-hidden="true" />
        <Figure
          character={character}
          height={236}
          facing={side === 0 ? 1 : -1}
          stance="duel"
          action={action}
        />
      </div>
      <div className="tp-host-kit">
        {badges.map((badge) => {
          const event = duel.events
            .filter(
              (entry) =>
                entry.type === 'effect' &&
                entry.side === side &&
                entry.source === badge.source,
            )
            .at(-1);
          return (
            <span
              key={`${badge.source}/${event?.id ?? 0}`}
              title={`${badge.name}：${badge.text}`}
              className={`${badge.family === 'relic' ? 'tp-relic-badge' : ''} ${event && duel.tick - event.tick < 14 ? 'tp-badge-proc' : ''}`}
              data-effect-source={badge.source}
            >
              <ObjectGlyph id={badge.id} family={badge.family} />
            </span>
          );
        })}
      </div>
      <div className="tp-proc-row">
        {procs.map((event) => (
          <span
            className={`tp-proc tp-proc-${event.kind ?? 'damage'}`}
            key={event.id}
          >
            {event.text}
            <b>
              {event.source === 'rule:reorder'
                ? '20s'
                : event.value > 0
                  ? event.kind === 'slow' || event.kind === 'wound'
                    ? `${event.value / 1000}s`
                    : event.kind === 'pierce' || event.kind === 'leech'
                      ? `${event.value}%`
                      : `+${event.value}`
                  : '满生命'}
            </b>
          </span>
        ))}
      </div>
    </section>
  );
}

function FighterLife({
  fighter,
  duel,
  side,
  name,
}: {
  fighter: ThrowFighter;
  duel: ThrowDuel;
  side: 0 | 1;
  name?: string;
}) {
  return (
    <section
      className={`tp-host-life tp-life-${side}`}
      aria-label={`${name ?? (side === 0 ? '伊莱·维尔' : '菲利克斯·克罗')}生命`}
    >
      <div className="tp-life-title">
        <span>{name ?? (side === 0 ? '伊莱·维尔' : '菲利克斯·克罗')}</span>
        <strong>
          {fighter.hp}
          <small> / {MAX_HP}</small>
        </strong>
      </div>
      <div className="tp-hp-track">
        <span style={{ width: `${(fighter.hp / MAX_HP) * 100}%` }} />
      </div>
      <div className="tp-host-status">
        {fighter.shield > 0 && (
          <span className="tp-stat-shield" title="护盾挡直伤，也把灼烧闷成小火；剧毒照样穿过去">
            ◇ {fighter.shield}
          </span>
        )}
        {fighter.burn > 0 && (
          <span className="tp-stat-burn" title="灼烧每秒扣当前层数的生命并减 1 层；有盾时改为烧盾、熄得更快">
            火 {fighter.burn}
          </span>
        )}
        {fighter.poison > 0 && (
          <span className="tp-stat-poison" title="剧毒每秒绕过护盾扣血，手牌越多毒发越重；每 2 秒退 1 层，治疗可净化">
            毒 {fighter.poison}
          </span>
        )}
        {fighter.power > 0 && (
          <span className="tp-stat-growth" title="每批直伤额外增加的力量">
            力 {fighter.power}
          </span>
        )}
        {fighter.slowUntil > duel.tick && (
          <span className="tp-stat-slow">
            缓 {(((fighter.slowUntil - duel.tick) * TICK_MS) / 1000).toFixed(1)}
            s
          </span>
        )}
      </div>
    </section>
  );
}
const styles = COMPETITIVE_STYLES as readonly Style[];
const RESULT_QUIPS = {
  win: ['掌声稀稀拉拉，但每一下都是真心的。', '观众起立了。好吧，是有人去续茶。', '对手表示今天风向不对。'],
  loss: ['观众很有礼貌地假装没看见。', '输得体面，也是一门手艺。', '没关系，巡演箱可以重新摆。'],
  draw: ['双方都认为自己才是赢家。', '平局：英国人最擅长的结局。'],
} as const;
type Gesture = {
  x: number;
  y: number;
  moved: boolean;
  rects: {
    uid: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
  }[];
};
export type PreparedThrowLoadout = {
  style: Style;
  layout: ItemPlacement[];
  relic: RelicId | null;
  /** Variant chosen for each card slot; absent means plain white cards. */
  book?: DeckBook;
};
type ThrowTableProps = {
  challenge?: {
    enemyStyle: Style;
    seed: number;
    title: string;
    /** Story opponents may carry their own kit, relic and card variants. */
    enemyItems?: ItemId[];
    enemyRelic?: RelicId | null;
    enemyBook?: DeckBook;
    /** House rules for street shows; `rule` is their plain-language line. */
    terms?: DuelTerms;
    rule?: string;
  };
  initialLoadout?: PreparedThrowLoadout;
  hostNames?: readonly [string, string];
  hosts?: readonly [RigId, RigId];
  /** Items and relics the story has handed over so far; omitted means everything. */
  available?: {
    items: readonly ItemId[];
    relics: readonly RelicId[];
    /** Owned card variants (`${suit}-${rank}:${enchant}`); enables the deck case. */
    variants?: readonly string[];
  };
  coach?: CoachScript | null;
  /** Advice shown above the workbench; overrides the coach's default line. */
  tip?: string;
  onReturn?: (
    winner: ThrowDuel['winner'],
    loadout: PreparedThrowLoadout,
    /** What the opponent actually threw, for the dossier. */
    report?: { suits: number[]; kinds: number[] },
  ) => void;
};
export default function ThrowTable({
  challenge,
  initialLoadout,
  hostNames,
  hosts = ['eli', 'felix'],
  available,
  coach: coachScript = null,
  tip: tipOverride,
  onReturn,
}: ThrowTableProps = {}) {
  const [phase, setPhase] = useState<'prepare' | 'battle'>('prepare');
  const [style, setStyle] = useState<Style>(initialLoadout?.style ?? 'quick');
  const [layout, setLayout] = useState<ItemPlacement[]>(() =>
    initialLoadout
      ? initialLoadout.layout.map((entry) => ({ ...entry }))
      : packThrowItems(PRESETS.quick.items),
  );
  const equipped = layout.map((entry) => entry.id);
  const [relic, setRelic] = useState<RelicId | null>(
    initialLoadout ? initialLoadout.relic : PRESETS.quick.relic,
  );
  const [enemyStyle, setEnemyStyle] = useState<Style>(
    challenge?.enemyStyle ?? 'guard',
  );
  const [seed, setSeed] = useState(String(challenge?.seed ?? 1024));
  const [book, setBook] = useState<DeckBook>(() => ({ ...initialLoadout?.book }));
  const [deckOpen, setDeckOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rules, setRules] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const sound = useRef<ThrowSound | null>(null);
  const soundCursor = useRef(0);
  const resultSound = useRef(false);
  const [session, dispatch] = useReducer(reducer, undefined, () => ({
    duel: createThrowDuel(1024, [...PRESETS.quick.items]),
    selected: [],
    flights: [],
  }));
  const [box, setBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [tagAnchor, setTagAnchor] = useState(50);
  const handRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const oldPositions = useRef(new Map<string, { x: number; y: number }>());
  const { duel, selected, flights } = session;
  const [player, enemy] = duel.fighters;
  const capacity = handLimit(player.relic),
    enemyCapacity = handLimit(enemy.relic);
  const picked = player.hand.filter((card) => selected.includes(card.uid));
  const preview = previewThrow(picked, player.items, {
    ...player,
    tick: duel.tick,
    target: enemy,
  });
  const intentCards = enemy.hand.filter((card) =>
    duel.ai.intent.includes(card.uid),
  );
  const enemyPreview = previewThrow(intentCards, enemy.items, {
    ...enemy,
    tick: duel.tick,
    target: player,
  });
  const orderCooldown = Math.max(
    0,
    ((player.nextReorder - duel.tick) * TICK_MS) / 1000,
  );
  const coach = useCoach(coachScript, duel, picked, phase === 'battle' && duel.status === 'playing');
  const clockStopped = paused || rules || coach.holding;
  const termsOk = termsAllow(duel.terms, picked);
  const launchReady =
    phase === 'battle' &&
    !paused &&
    !rules &&
    duel.status === 'playing' &&
    picked.length > 0 &&
    termsOk &&
    duel.tick >= duel.nextLaunch[0];
  const orderKey = player.hand.map((card) => card.uid).join('|');
  const selectionKey = selected.join('|');
  const effectKey = preview.effects
    .map((effect) => `${effect.source}:${effect.value}`)
    .join('|');
  const unlockSound = useCallback(() => {
    const audio = sound.current ?? new ThrowSound();
    sound.current = audio;
    audio.setEnabled(soundEnabled);
    void audio
      .unlock()
      .then(setAudioReady)
      .catch(() => setSoundEnabled(false));
    return audio;
  }, [soundEnabled]);
  const fire = useCallback(() => {
    if (launchReady) {
      unlockSound();
      dispatch({ type: 'launch', geometry: captureTableGeometry() });
    }
  }, [launchReady, unlockSound]);
  useEffect(() => () => sound.current?.dispose(), []);
  useEffect(() => {
    if (phase !== 'battle') return;
    const fresh = duel.events.filter((event) => event.id > soundCursor.current);
    fresh.forEach((event) => sound.current?.event(event));
    soundCursor.current = duel.nextId - 1;
    if (duel.status === 'ended' && !resultSound.current) {
      resultSound.current = true;
      sound.current?.finish(duel.winner === 0);
    }
  }, [duel.events, duel.nextId, duel.status, duel.winner, phase]);
  useEffect(() => {
    if (phase !== 'battle' || clockStopped || duel.status !== 'playing')
      return;
    let frame = 0,
      last = performance.now(),
      accumulator = 0;
    const loop = (now: number) => {
      if (document.hidden) {
        last = now;
        accumulator = 0;
        frame = requestAnimationFrame(loop);
        return;
      }
      accumulator += Math.min(now - last, 100);
      last = now;
      const count = Math.floor(accumulator / TICK_MS);
      if (count) {
        accumulator -= count * TICK_MS;
        dispatch({ type: 'tick', count, geometry: captureTableGeometry() });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase, clockStopped, duel.status]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      )
        return;
      if (event.code === 'Space' && phase === 'battle' && !rules) {
        event.preventDefault();
        fire();
      }
      if (event.code === 'Escape') {
        setRules(false);
        dispatch({ type: 'clear' });
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [fire, phase, rules]);
  useLayoutEffect(() => {
    const hand = handRef.current;
    if (!hand) return;
    const nextPositions = new Map<string, { x: number; y: number }>();
    hand.querySelectorAll<HTMLElement>('[data-card-id]').forEach((node) => {
      const uid = node.dataset.cardId!,
        position = {
          x: node.parentElement!.offsetLeft,
          y: node.parentElement!.offsetTop,
        };
      const previous = oldPositions.current.get(uid),
        finalTransform = getComputedStyle(node).transform;
      if (previous && (previous.x !== position.x || previous.y !== position.y))
        node.animate(
          [
            {
              transform: `translate(${previous.x - position.x}px,${previous.y - position.y}px)`,
            },
            { transform: finalTransform },
          ],
          { duration: 260, easing: 'cubic-bezier(.2,.75,.25,1)' },
        );
      else if (!previous)
        node.animate(
          [
            { transform: 'translate(-20px,8px) scale(.85)', opacity: 0 },
            { transform: finalTransform, opacity: 1 },
          ],
          { duration: 240, easing: 'cubic-bezier(.2,.75,.25,1)' },
        );
      nextPositions.set(uid, position);
    });
    oldPositions.current = nextPositions;
  }, [orderKey, phase]);
  useLayoutEffect(() => {
    const hand = handRef.current;
    if (!hand) return;
    const measure = () => {
      const bounds = hand.getBoundingClientRect();
      const active = [
        ...hand.querySelectorAll<HTMLElement>('.tp-selected'),
      ].map((node) => node.getBoundingClientRect());
      if (active.length) {
        const center =
          (Math.min(...active.map((r) => r.left)) +
            Math.max(...active.map((r) => r.right))) /
          2;
        const tagWidth =
          hand.querySelector('.tp-preview-effects')?.getBoundingClientRect()
            .width ?? 0;
        const half = Math.min(bounds.width / 2, tagWidth / 2 + 3);
        const anchor = Math.max(
          half,
          Math.min(bounds.width - half, center - bounds.left),
        );
        setTagAnchor((anchor / bounds.width) * 100);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(hand);
    return () => observer.disconnect();
  }, [selectionKey, orderKey, effectKey, phase]);
  const start = () => {
    const value = Number(seed);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) return;
    // In the story, only variants the hero owns go into the deck.
    const owned = available?.variants ? new Set(available.variants) : null;
    const playerBook = owned
      ? Object.fromEntries(Object.entries(book).filter(([key, id]) => owned.has(`${key}:${id}`)))
      : book;
    const next = createThrowDuel(
      value,
      equipped,
      enemyStyle,
      relic,
      challenge?.enemyRelic !== undefined ? challenge.enemyRelic : PRESETS[enemyStyle].relic,
      layout,
      { player: playerBook, enemy: challenge?.enemyBook },
      { enemyItems: challenge?.enemyItems, terms: challenge?.terms },
    );
    soundCursor.current = next.nextId - 1;
    resultSound.current = false;
    oldPositions.current.clear();
    const audio = unlockSound();
    audio.start();
    coach.reset();
    dispatch({ type: 'start', duel: next });
    setPaused(false);
    setPhase('battle');
  };
  const select = (uid: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (duel.status !== 'playing') return;
    unlockSound().tap();
    dispatch({ type: 'click', uid });
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || duel.status !== 'playing') return;
    suppressClick.current = false;
    const rects = [
      ...handRef.current!.querySelectorAll<HTMLElement>('[data-card-id]'),
    ].map((node) => {
      const r = node.getBoundingClientRect();
      return {
        uid: node.dataset.cardId!,
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
      };
    });
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
      rects,
    };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current,
      hand = handRef.current;
    if (!current || !hand) return;
    if (
      !current.moved &&
      Math.abs(event.clientX - current.x) +
        Math.abs(event.clientY - current.y) <
        7
    )
      return;
    if (!current.moved) {
      hand.setPointerCapture(event.pointerId);
      current.moved = true;
      unlockSound().tap();
    }
    const area = hand.getBoundingClientRect();
    const left = Math.min(event.clientX, current.x),
      right = Math.max(event.clientX, current.x),
      top = Math.min(event.clientY, current.y),
      bottom = Math.max(event.clientY, current.y);
    setBox({
      x: left - area.left,
      y: top - area.top,
      width: right - left,
      height: bottom - top,
    });
    const ids = current.rects
      .filter(
        (rect) =>
          rect.right >= left &&
          rect.left <= right &&
          rect.bottom >= top &&
          rect.top <= bottom,
      )
      .map((rect) => rect.uid);
    dispatch({ type: 'box', ids });
  };
  const pointerEnd = () => {
    suppressClick.current = Boolean(gesture.current?.moved);
    gesture.current = null;
    setBox(null);
  };
  // Curtain call (presentation): countdown, live rate, and how far the drop has fallen.
  const curtainIn = Math.max(0, (CURTAIN_MS - duel.tick * TICK_MS) / 1000);
  const curtainNow = curtainDamage(duel.tick);
  const stagePhase = battlePhase(duel.tick);
  const advice = throwAdvice(player.items, duel.terms);
  const audienceMoment = duel.events.filter((event) => deservesCheer(event) && duel.tick - event.tick < 30).at(-1);
  const curtainFall = Math.min(1, Math.max(0, (duel.tick * TICK_MS - CURTAIN_MS) / 30000));
  const lastHits = duel.events.filter(
    (event) =>
      (event.type === 'hit' || event.type === 'dot') &&
      event.value > 0 &&
      duel.tick - event.tick < 16,
  );
  const drawRemaining = (fighter: ThrowFighter) =>
    (
      ((Math.max(0, drawInterval(fighter.items, duel.tick) - fighter.drawClock) +
        Math.max(0, fighter.slowUntil - duel.tick)) *
        TICK_MS) /
      1000
    ).toFixed(1);
  const returnToScene = () =>
    onReturn?.(
      duel.status === 'ended' ? duel.winner : null,
      {
        style,
        relic,
        layout: layout.map((entry) => ({ ...entry })),
        book: { ...book },
      },
      duel.status === 'ended' ? { suits: [...enemy.tally.suits], kinds: [...enemy.tally.kinds] } : undefined,
    );
  return (
    <main
      className="tp-root"
      data-paused={clockStopped}
      data-coach-target={coach.step?.target ?? undefined}
      data-audio-active={audioReady && soundEnabled}
    >
      <header className="tp-header">
        <h1>{challenge?.title ?? '甩牌对决'}</h1>
        <div className="tp-header-actions">
          {onReturn && <button onClick={returnToScene}>返回场景</button>}
          <button
            aria-pressed={soundEnabled}
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              const audio = sound.current ?? new ThrowSound();
              sound.current = audio;
              audio.setEnabled(next);
              if (next)
                void audio
                  .unlock()
                  .then((ready) => {
                    setAudioReady(ready);
                    audio.tap();
                  })
                  .catch(() => setSoundEnabled(false));
            }}
          >
            {soundEnabled ? '♫ 声音开' : '♫ 声音关'}
          </button>
          <button onClick={() => setRules(true)}>玩法说明</button>
          {phase === 'battle' && (
            <button onClick={() => setPhase('prepare')}>整备</button>
          )}
        </div>
      </header>
      {phase === 'prepare' ? (
        <section className="tp-preparation">
          <div className="tp-loadout">
            <ThrowWorkbench
              layout={layout}
              relic={relic}
              style={style}
              onLayout={setLayout}
              onRelic={setRelic}
              onStyle={setStyle}
              available={available}
              tip={
                tipOverride ??
                (coachScript === 'qualifier'
                  ? '米娅的建议：菲利克斯打火。把守灯小毯放进巡演箱（拖进格子，或点道具自动放入），用单张黑桃攒护盾，守住再反击。'
                  : coachScript === 'lesson'
                    ? '第一课先练单张：飞牌修缮箱加直伤，穿幕细针帮你穿盾。直接点「开始对战」就好。'
                    : undefined)
              }
              tap={() => unlockSound().tap()}
            />
            <div className="tp-preparation-footer">
              {challenge ? (
                <div className="tp-start-options">
                  {hostNames?.[1]} · {PRESETS[enemyStyle].name}
                  {challenge.rule && <em className="tp-house-rule">规矩：{challenge.rule}</em>}
                </div>
              ) : (
                <div className="tp-start-options">
                  <label>
                    练习对手
                    <select
                      value={enemyStyle}
                      onChange={(event) =>
                        setEnemyStyle(event.target.value as Style)
                      }
                    >
                      {styles.map((value) => (
                        <option key={value} value={value}>
                          {PRESETS[value].name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    牌局编号
                    <input
                      aria-label="牌局编号"
                      value={seed}
                      onChange={(event) => setSeed(event.target.value)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </label>
                </div>
              )}
              {(!available || Boolean(available.variants?.length)) && (
                <button
                  className="tp-deckcase-open"
                  onClick={() => {
                    unlockSound().tap();
                    setDeckOpen(true);
                  }}
                >
                  牌匣
                  <small>
                    {(() => {
                      const counts = bookCounts(book);
                      const total = counts.rare + counts.epic + counts.legendary;
                      return total ? `${total} 张变种` : '全白牌';
                    })()}
                  </small>
                </button>
              )}
              {deckOpen && (
                <DeckCase
                  book={book}
                  owned={available?.variants}
                  onBook={setBook}
                  onClose={() => setDeckOpen(false)}
                  tap={() => unlockSound().tap()}
                />
              )}
              <button
                className="tp-primary tp-start"
                onClick={start}
                disabled={!/^\d+$/.test(seed) || Number(seed) > 0xffffffff}
              >
                开始对战<span>→</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="tp-battle" data-battle-phase={stagePhase}>
          <div className="tp-opponent">
            <div className="tp-hand-caption">
              <span>
                对手手牌{' '}
                <b>
                  {enemy.hand.length}/{enemyCapacity}
                </b>{' '}
                · {PRESETS[duel.ai.style].name}
              </span>
              <span className={intentCards.length ? 'tp-warning' : ''}>
                {intentCards.length
                  ? `${enemyPreview.name} · ${enemyPreview.damage}伤害 · ${Math.max(0, ((duel.ai.releaseTick - duel.tick) * TICK_MS) / 1000).toFixed(1)}秒后甩出`
                  : enemy.hand.length === enemyCapacity
                    ? '满手，等待出牌'
                    : `下张 ${drawRemaining(enemy)}秒`}
              </span>
            </div>
            <div className="tp-enemy-hand">
              <span className="tp-deck" data-deck="1">
                ◇
              </span>
              {enemy.hand.map((card) => (
                <PokerCard
                  key={card.uid}
                  card={card}
                  enemy
                  selected={duel.ai.intent.includes(card.uid)}
                />
              ))}
            </div>
          </div>
          <div className="tp-arena">
            <div
              className="tp-stage-wall"
              aria-hidden="true"
              style={{ '--fall': curtainFall } as CSSProperties}
            >
              <span className="tp-stage-fall" />
              <span className="tp-stage-arch" />
              <span className="tp-stage-curtain tp-stage-curtain-left" />
              <span className="tp-stage-curtain tp-stage-curtain-right" />
            </div>
            <div className="tp-stage-floor" aria-hidden="true" />
            <PhaseLights phase={stagePhase} />
            <div className="tp-fight-hud">
              <FighterLife
                fighter={player}
                duel={duel}
                side={0}
                name={hostNames?.[0]}
              />
              <div className="tp-clock">
                <strong>VS</strong>
                <span>{((duel.tick * TICK_MS) / 1000).toFixed(1)}s</span>
                {curtainNow > 0 ? (
                  <em className="tp-curtain-live" title="落幕：双方每秒受到递增伤害，护盾可挡，治疗可抵">
                    落幕 · 每秒 {curtainNow}
                  </em>
                ) : (
                  curtainIn <= 15 && (
                    <em className="tp-curtain-soon" title="落幕：双方每秒受到递增伤害，护盾可挡，治疗可抵">
                      {Math.ceil(curtainIn)} 秒后落幕
                    </em>
                  )
                )}
                <button
                  onClick={() => setPaused((old) => !old)}
                  disabled={duel.status === 'ended'}
                >
                  {paused ? '继续' : '暂停'}
                </button>
              </div>
              <FighterLife
                fighter={enemy}
                duel={duel}
                side={1}
                name={hostNames?.[1]}
              />
            </div>
            <Host
              fighter={enemy}
              duel={duel}
              side={1}
              name={hostNames?.[1]}
              character={hosts[1]}
            />
            <Host
              fighter={player}
              duel={duel}
              side={0}
              name={hostNames?.[0]}
              character={hosts[0]}
            />
            <ThrowSpectacle duel={duel} />
            {audienceMoment && (
              <output className="tp-audience-moment" key={audienceMoment.id} data-audience-cheer={audienceMoment.id} aria-live="polite">
                <span aria-hidden="true">✦</span> 好手！观众喝彩
              </output>
            )}
            {lastHits.map((event) => (
              <div
                className={`tp-impact tp-impact-${event.side === 0 ? 1 : 0} tp-impact-${event.kind ?? 'damage'} ${(event.combo ?? 0) >= 4 ? 'tp-impact-epic' : ''}`}
                key={event.id}
              >
                <b>
                  −{event.value}
                  <small>{event.text}</small>
                </b>
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            ))}
            {paused && duel.status === 'playing' && (
              <div className="tp-pause-label">已暂停</div>
            )}
            {duel.status === 'ended' && (
              <div className="tp-result">
                <h2>
                  {duel.winner === 0
                    ? '胜利'
                    : duel.winner === 'draw'
                      ? '平局'
                      : '失败'}
                </h2>
                <p className="tp-result-quip">
                  {
                    RESULT_QUIPS[duel.winner === 0 ? 'win' : duel.winner === 'draw' ? 'draw' : 'loss'][
                      duel.seed % RESULT_QUIPS[duel.winner === 0 ? 'win' : duel.winner === 'draw' ? 'draw' : 'loss'].length
                    ]
                  }
                </p>
                {duel.endReason === 'deadline' && <p className="tp-house-rule">时间到：没能在规定时间内获胜。</p>}
                {duel.endReason === 'floor' && <p className="tp-house-rule">生命跌破了规矩定的底线。</p>}
                <p>
                  命中 {player.hits} 次 · 用时 {((duel.tick * TICK_MS) / 1000).toFixed(1)} 秒
                </p>
                <div>
                  {onReturn && (
                    <button className="tp-primary" onClick={returnToScene}>
                      返回场景
                    </button>
                  )}
                  <button onClick={start}>原样再来一局</button>
                  <button
                    className="tp-primary"
                    onClick={() => setPhase('prepare')}
                  >
                    重新整理巡演箱
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="tp-player-zone">
            <div className="tp-play-advice" aria-label="当前道具出牌策略">
              <span>本箱打法</span>
              <strong>{advice.join(' · ')}</strong>
            </div>
            <div className="tp-hand-caption">
              <span>
                你的手牌{' '}
                <b>
                  {player.hand.length}/{capacity}
                </b>
                <span className="tp-draw-label">
                  {player.hand.length === capacity
                    ? '满手，抽牌暂停'
                    : `下张 ${drawRemaining(player)}秒`}
                </span>
              </span>
              <div className="tp-selection-actions">
                <span className="tp-order-status">
                  {orderCooldown > 0
                      ? `理牌冷却 ${orderCooldown.toFixed(1)}s`
                      : '理牌可用'}
                </span>
                <span className="tp-sort-actions">
                    {(['rank', 'suit', 'gather'] as const).map((mode) => (
                      <button
                        key={mode}
                        disabled={
                          orderCooldown > 0 ||
                          duel.status !== 'playing' ||
                          player.hand.length < 2 ||
                          (mode === 'gather' && selected.length < 2)
                        }
                        onClick={() => {
                          unlockSound().tap();
                          dispatch({ type: 'arrange', mode });
                        }}
                      >
                        {mode === 'rank'
                          ? '按点数'
                          : mode === 'suit'
                            ? '按花色'
                            : '收拢所选'}
                      </button>
                    ))}
                </span>
                <button onClick={() => dispatch({ type: 'clear' })}>
                  清空
                </button>
              </div>
            </div>
            <div
              className="tp-hand"
              ref={handRef}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerEnd}
              onPointerCancel={pointerEnd}
            >
              <div
                className="tp-preview-effects"
                style={{ left: `${tagAnchor}%` }}
                aria-label="选牌触发效果"
              >
                {picked.length > 0 &&
                  preview.effects.map((effect) => (
                    <span
                      key={effect.source + ':' + effect.kind}
                      data-preview-source={effect.source}
                      className={`tp-effect-tag tp-effect-${effect.kind}`}
                    >
                      {effect.name}
                      <b>{effectText(effect)}</b>
                    </span>
                  ))}
              </div>
              <div
                className="tp-hand-grid"
                style={
                  {
                    '--capacity': capacity,
                    '--mobile-columns': capacity === 12 ? 6 : 5,
                  } as CSSProperties
                }
              >
                {player.hand.map((card) => (
                  <div className="tp-hand-slot" key={card.uid}>
                    <PokerCard
                      card={card}
                      selected={selected.includes(card.uid)}
                      onClick={() => select(card.uid)}
                    />
                  </div>
                ))}
                {Array.from(
                  { length: capacity - player.hand.length },
                  (_, index) => (
                    <div className="tp-empty-card" key={`empty${index}`}>
                      <span>◇</span>
                    </div>
                  ),
                )}
                <span className="tp-deck-anchor" data-deck="0" />
              </div>
              {box && (
                <div
                  className="tp-select-box"
                  style={{
                    left: box.x,
                    top: box.y,
                    width: box.width,
                    height: box.height,
                  }}
                />
              )}
            </div>
            <div className="tp-launch-bar">
              <div className="tp-combo-preview">
                <span>
                  {picked.length
                    ? `${preview.name} · ${picked.length}张待甩`
                    : '单选 / 框选'}
                </span>
                <strong>
                  {picked.length ? preview.damage : '—'}
                  <small>预计伤害</small>
                </strong>
                <p>
                  {picked.length
                    ? [
                        `点数 ${preview.base} + 牌型 ${preview.bonus} + 道具 ${preview.itemBonus}`,
                        player.power ? `力量 +${player.power}` : '',
                        preview.relicBonus ? `余响 +${preview.relicBonus}` : '',
                        preview.burn ? `灼烧 +${preview.burn}` : '',
                        preview.poison ? `剧毒 +${preview.poison}` : '',
                        preview.shield ? `护盾 +${preview.shield}` : '',
                        preview.heal ? `恢复 +${preview.heal}` : '',
                        preview.growth ? `成长 +${preview.growth}` : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : ''}
                </p>
              </div>
              {duel.terms && (
                <p className={`tp-house-rule ${picked.length && !termsOk ? 'tp-warning' : ''}`}>
                  {picked.length && !termsOk ? '这手牌不合今天的规矩。' : '规矩：'}
                  {challenge?.rule}
                </p>
              )}
              <button
                className="tp-primary tp-fire"
                disabled={!launchReady}
                onClick={fire}
              >
                甩出去<kbd>SPACE</kbd>
              </button>
            </div>
          </div>
          <footer className="tp-battle-footer">
            <span>
              牌局 {duel.seed} ·{' '}
              {duel.status === 'ended'
                ? '对局结束'
                : paused
                  ? '已暂停'
                  : '自动抽牌'}{' '}
            </span>
            <span>
              遗物：
              {RELICS.find((entry) => entry.id === player.relic)?.name ?? '无'}
            </span>
          </footer>
          <FlightLayer flights={flights} paused={clockStopped} />
          {duel.status === 'ended' && duel.winner === 0 && <VictoryConfetti />}
          <CoachCard coach={coach} />
        </section>
      )}
      {rules && (
        <div className="tp-modal-backdrop">
          <dialog
            open
            className="tp-rules"
            aria-modal="true"
            aria-label="玩法说明"
          >
            <button
              className="tp-close"
              onClick={() => setRules(false)}
              aria-label="关闭说明"
            >
              ×
            </button>

            <h2>玩法规则</h2>
            <p>开局各 5 张牌，自动补牌；手牌上限 10 张，满了就不再抽——不会替你攒着。</p>
            <p>点击选一张，按住拖动可框选一段连续的牌；按空格或「甩出去」出手。电脑也守同样的规矩，它不会作弊，只是不会累。</p>
            <p>牌型基准倍率（顺子、同花、同花顺按 5 张展示）：</p>
            <div className="tp-rank-table">
              {HAND_NAMES.map((name, index) => (
                <div key={name}>
                  <span>{name}</span>
                  <b>×{MULTIPLIERS[index] / 100}</b>
                </div>
              ))}
            </div>
            <p>J=11、Q=12、K=13、A=14，A 也能接 2。顺子和同花从 3 张起成型；3／4 张组合的额外牌型加成按张数／5 缩放。最强的组合吃倍率，其余牌按点数算。所有人都能按点数、花色排序或收拢选牌，每次有效整理后冷却 20 秒。</p>
            <h3>四种花色，四种状态</h3>
            <p>♠ 护盾 · ♥ 治疗 · ♣ 剧毒 · ♦ 灼烧——具体由你巡演箱里的道具决定。</p>
            <ul className="tp-counter-rules">
              <li><b>治疗克剧毒</b>：每次治疗顺带净化一半数值的剧毒，满血也有效。</li>
              <li><b>剧毒克护盾</b>：剧毒无视护盾；对手手里每攒 5 张牌，毒发 +1。剧毒每 2 秒退 1 层。</li>
              <li><b>护盾克灼烧</b>：火落在盾上只点一半；有盾时，灼烧只烧盾、不伤血，熄得更快。</li>
              <li><b>灼烧克治疗</b>：着火时治疗只剩六成；灼烧 ≥3 层时每次出手烫手，扣 2 血。</li>
              <li><b>单张削盾</b>：单张牌被护盾挡下时多耗 10% 护盾，也不会被铜镜反射。</li>
              <li><b>压轴</b>：顺子及以上命中会造成重创（5 秒内治疗六成）；一次出 5 张以上会吹灭自身灼烧，6 秒内不被点燃。</li>
              <li><b>落幕</b>：第 60 秒起剧院开始关门，双方每秒受到 1、2、3……递增的伤害。护盾照挡，治疗照抵——活得久，本身就是一种赢法。</li>
            </ul>
            <p>道具占 1–3 格，相邻指边缘贴合，增幅向下取整；遗物只能带 1 件。万一撑到 120 秒还没分出胜负，比较剩余生命。对手出手前 1 秒会亮牌预告——这是他的礼貌，不是他的失误。</p>
            <button className="tp-primary" onClick={() => setRules(false)}>
              知道了
            </button>
          </dialog>
        </div>
      )}
    </main>
  );
}
