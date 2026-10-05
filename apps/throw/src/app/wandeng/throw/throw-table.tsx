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
import { Art } from '../wandeng-cards';
import { sitePath } from '../../../lib/site-path';
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
  type RelicId,
  type Style,
  type ThrowDuel,
  type ThrowFighter,
  type TriggerEffect,
} from '../../../lib/cards/throw-duel';
import { clickThrowSelection } from '../../../lib/cards/throw-selection';
import {
  captureTableGeometry,
  FlightLayer,
  makeVisualShot,
  PokerFace,
  type TableGeometry,
  type VisualShot,
} from './throw-motion';
import { ThrowSound } from './throw-sound';
import ThrowWorkbench from './throw-workbench';
import {
  packThrowItems,
  type ItemPlacement,
} from '../../../lib/cards/throw-loadout';
import { ThrowSpectacle } from './throw-motion';

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
  return (
    <button
      type="button"
      className={`tp-card ${card.suit % 2 ? 'tp-red' : ''} ${selected ? 'tp-selected' : ''}`}
      data-card-id={card.uid}
      aria-label={`${SUITS[card.suit]}${rankText(card.rank)}`}
      aria-pressed={selected}
      disabled={enemy}
      onClick={onClick}
    >
      <PokerFace card={card} />
    </button>
  );
}
const effectText = (effect: TriggerEffect) =>
  effect.kind === 'heal' && effect.value === 0
    ? '满生命'
    : effect.kind === 'slow'
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
}: {
  fighter: ThrowFighter;
  duel: ThrowDuel;
  side: 0 | 1;
}) {
  const relic = RELICS.find((entry) => entry.id === fighter.relic);
  const badges = [
    ...fighter.items.map((id) => {
      const item = ITEMS.find((entry) => entry.id === id)!;
      return {
        source: `item:${id}`,
        name: item.name,
        tile: item.tile,
        text: item.text,
      };
    }),
    ...(relic
      ? [
          {
            source: `relic:${relic.id}`,
            name: relic.name,
            tile: relic.tile,
            text: relic.text,
          },
        ]
      : []),
  ];
  const hit = duel.events
    .filter((event) => event.type === 'hit' && event.side !== side)
    .at(-1);
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
      <div className="tp-host-life">
        <span>{side === 0 ? '你的心灯' : '师傅的心灯'}</span>
        <div>
          <strong>{fighter.hp}</strong>
          <small>/{MAX_HP}</small>
        </div>
        <div className="tp-hp-track">
          <span style={{ width: `${(fighter.hp / MAX_HP) * 100}%` }} />
        </div>
        <div className="tp-host-status">
          {fighter.shield > 0 && (
            <span className="tp-stat-shield" title="护盾挡直伤与灼烧">
              ◇ {fighter.shield}
            </span>
          )}
          {fighter.burn > 0 && (
            <span className="tp-stat-burn" title="灼烧每秒扣当前层数并减1">
              火 {fighter.burn}
            </span>
          )}
          {fighter.poison > 0 && (
            <span className="tp-stat-poison" title="剧毒每秒绕盾扣血，直到净化">
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
              缓{' '}
              {(((fighter.slowUntil - duel.tick) * TICK_MS) / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
      <div
        className={`tp-host-art ${hit && duel.tick - hit.tick < 7 ? 'tp-struck' : ''}`}
        data-host={side}
        data-shield={fighter.shield > 0}
        data-burning={fighter.burn > 0}
        data-poisoned={fighter.poison > 0}
        key={hit?.id ?? `host${side}`}
      >
        <Art tile={side === 0 ? 11 : 0} />
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
              className={`${badge.source.startsWith('relic:') ? 'tp-relic-badge' : ''} ${event && duel.tick - event.tick < 14 ? 'tp-badge-proc' : ''}`}
              data-effect-source={badge.source}
            >
              <Art tile={badge.tile} />
            </span>
          );
        })}
        <small>{relic ? relic.name : '未携遗物'}</small>
      </div>
      <div className="tp-proc-row">
        {procs.map((event) => (
          <span
            className={`tp-proc tp-proc-${event.kind ?? 'damage'}`}
            key={event.id}
          >
            {event.text}
            <b>
              {event.source === 'relic:order'
                ? '3s'
                : event.value > 0
                  ? event.kind === 'slow'
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
const styles = Object.keys(PRESETS) as Style[];
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
export default function ThrowTable() {
  const [phase, setPhase] = useState<'prepare' | 'battle'>('prepare');
  const [style, setStyle] = useState<Style>('pair');
  const [layout, setLayout] = useState<ItemPlacement[]>(() =>
    packThrowItems(PRESETS.pair.items),
  );
  const equipped = layout.map((entry) => entry.id);
  const [relic, setRelic] = useState<RelicId | null>('order');
  const [enemyStyle, setEnemyStyle] = useState<Style>('pair');
  const [seed, setSeed] = useState('1024');
  const [paused, setPaused] = useState(false);
  const [rules, setRules] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const sound = useRef<ThrowSound | null>(null);
  const soundCursor = useRef(0);
  const resultSound = useRef(false);
  const [session, dispatch] = useReducer(reducer, undefined, () => ({
    duel: createThrowDuel(1024, [...PRESETS.pair.items]),
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
  const launchReady =
    phase === 'battle' &&
    !paused &&
    !rules &&
    duel.status === 'playing' &&
    picked.length > 0 &&
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
    if (phase !== 'battle' || paused || rules || duel.status !== 'playing')
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
  }, [phase, paused, rules, duel.status]);
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
    const next = createThrowDuel(
      value,
      equipped,
      enemyStyle,
      relic,
      PRESETS[enemyStyle].relic,
      layout,
    );
    soundCursor.current = next.nextId - 1;
    resultSound.current = false;
    oldPositions.current.clear();
    const audio = unlockSound();
    audio.start();
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
  const lastHits = duel.events.filter(
    (event) =>
      (event.type === 'hit' || event.type === 'dot') &&
      event.value > 0 &&
      duel.tick - event.tick < 16,
  );
  const drawRemaining = (fighter: ThrowFighter) =>
    (
      ((Math.max(0, drawInterval(fighter.items) - fighter.drawClock) +
        Math.max(0, fighter.slowUntil - duel.tick)) *
        TICK_MS) /
      1000
    ).toFixed(1);
  return (
    <main
      className="tp-root"
      data-paused={paused || rules}
      data-audio-active={audioReady && soundEnabled}
    >
      <header className="tp-header">
        <a href={sitePath('/wandeng')} className="tp-back">
          ← 万灯城
        </a>
        <div>
          <span className="tp-eyebrow">旧木桌上的新把戏</span>
          <h1>
            甩牌对决<span>THROW & GLOW</span>
          </h1>
        </div>
        <div className="tp-header-actions">
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
          <div className="tp-intro">
            <span className="tp-eyebrow">今晚，在师傅的旧木桌上</span>
            <h2>
              把一手好牌，
              <br />
              甩成一道光。
            </h2>
            <p>
              每3秒一张记忆灵符，出手由你决定。
              <br />
              点一张，或框起一整段牌。
              <br />
              摆好同行旧物，让记忆奏出自己的赢法。
            </p>
            <div className="tp-mini-hand">
              {[2, 2, 5, 6, 7].map((rank, index) => (
                <PokerCard
                  key={index}
                  card={{
                    uid: `intro${index}`,
                    rank,
                    suit: (index % 4) as 0 | 1 | 2 | 3,
                  }}
                  enemy
                />
              ))}
            </div>
            <Art tile={0} className="tp-intro-art" />
          </div>
          <div className="tp-loadout">
            <ThrowWorkbench
              layout={layout}
              relic={relic}
              style={style}
              onLayout={setLayout}
              onRelic={setRelic}
              onStyle={setStyle}
              tap={() => unlockSound().tap()}
            />
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
                牌序种子
                <input
                  aria-label="牌序种子"
                  value={seed}
                  onChange={(event) => setSeed(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </label>
            </div>
            <button
              className="tp-primary tp-start"
              onClick={start}
              disabled={!/^\d+$/.test(seed) || Number(seed) > 0xffffffff}
            >
              坐下，开始甩牌<span>→</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="tp-battle">
          <div className="tp-opponent">
            <div className="tp-hand-caption">
              <span>
                师傅的手牌{' '}
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
            <div className="tp-table-rim" />
            <div className="tp-table-mark">
              万灯小院<span>一局牌，一点光</span>
            </div>
            <Host fighter={enemy} duel={duel} side={1} />
            <Host fighter={player} duel={duel} side={0} />
            <ThrowSpectacle duel={duel} />
            <div className="tp-clock">
              <span>{((duel.tick * TICK_MS) / 1000).toFixed(1)}s / 120s</span>
              <button
                onClick={() => setPaused((old) => !old)}
                disabled={duel.status === 'ended'}
              >
                {paused ? '继续' : '暂停'}
              </button>
            </div>
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
              <div className="tp-pause-label">暂停 · 慢慢看牌</div>
            )}
            {duel.status === 'ended' && (
              <div className="tp-result">
                <span className="tp-eyebrow">这局旧木桌上的较量</span>
                <h2>
                  {duel.winner === 0
                    ? '漂亮，甩得好！'
                    : duel.winner === 'draw'
                      ? '不分高下'
                      : '师傅略胜一筹'}
                </h2>
                <p>
                  你命中 {player.hits} 次 ·{' '}
                  {((duel.tick * TICK_MS) / 1000).toFixed(1)}秒
                </p>
                <div>
                  <button onClick={start}>同牌序再试</button>
                  <button
                    className="tp-primary"
                    onClick={() => setPhase('prepare')}
                  >
                    调整装备
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="tp-player-zone">
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
                  {player.relic === 'order'
                    ? orderCooldown > 0
                      ? `理牌冷却 ${orderCooldown.toFixed(1)}s`
                      : '理牌可用'
                    : player.relic === 'relay'
                      ? `接力 ${player.throws % 3}/3`
                      : player.relic === 'echo'
                        ? `余响 ${player.echo}/12`
                        : player.relic === 'capacity'
                          ? '夹层 +2'
                          : player.relic === 'heart'
                            ? '红心恢复 +3'
                            : ''}
                </span>
                {player.relic === 'order' && (
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
                )}
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
                    : '点选一张，或拖框多选'}
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
                    : player.relic === 'order'
                      ? '拖动始终框选；整理使用上方理线盒按钮。'
                      : '每次框选重新选择一组牌，点击其他牌切换为单选。'}
                </p>
              </div>
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
              种子 {duel.seed} ·{' '}
              {duel.status === 'ended'
                ? '对局结束'
                : paused
                  ? '已暂停'
                  : '自动抽牌'}{' '}
              · 点选 / 框选
            </span>
            <span>
              遗物：
              {RELICS.find((entry) => entry.id === player.relic)?.name ?? '无'}
            </span>
          </footer>
          <FlightLayer flights={flights} paused={paused || rules} />
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
            <span className="tp-eyebrow">记忆灵符 · 甩牌试验 V3</span>
            <h2>选一张，或圈起一段默契。</h2>
            <p>
              双方 {MAX_HP} 生命，开局各 5 张。每3秒自动抽1张，默认容量
              10；双层旧邮匣可增至
              12。满手暂停抽牌计时。点选只选一张；框选才能多选，每次框选替换上一组选择，不支持追加点选。
            </p>
            <p>
              选好后按钮／空格发射，实体牌从自己的手牌位置飞到对方心灯，0.45
              秒命中。J=11，Q=12，K=13，A=14；A 可以接 2–5。
            </p>
            <div className="tp-rank-table">
              {HAND_NAMES.map((name, index) => (
                <div key={name}>
                  <span>{name}</span>
                  <b>×{MULTIPLIERS[index] / 100}</b>
                </div>
              ))}
            </div>
            <p>
              最多一组最强五牌组合享受加成，其余按点数。两张 2 的基础伤害为
              6；道具、余响可进一步加强。道具预触发标记显示在选牌上方，实际触发会点亮道具并显示效果名称。
            </p>
            <p>
              十格行囊中摆放1–3格旧物，只能装1件遗物。边缘贴合才算相邻，空格切断联动。三息理线盒用按钮排序或收拢，成功后冷却3秒；任何位置拖动始终框选。电脑也只能单张或连续框选。暂停冻结战斗与冷却。对手公开手牌，提前
              1 秒预告；最长 120 秒，超时比较生命。
            </p>
            <p>
              护盾挡直伤和灼烧，不挡剧毒。灼烧每秒造成当前层数伤害后减1；剧毒每秒扣血且不衰减，红心净化可清除。护盾上限160，灼烧60，剧毒40，力量40。迟缓暂停抽牌，反击不连锁；吸血只认实际生命损失。
            </p>
            <p>
              旧物将记忆折成灵符：你甩出记忆，行囊中的伙伴赋予它温度。对决只作用于灵魂投影，旧物实体仍然完好。可关闭声音；离开标签时战斗暂停。
            </p>
            <button className="tp-primary" onClick={() => setRules(false)}>
              知道了
            </button>
          </dialog>
        </div>
      )}
    </main>
  );
}
