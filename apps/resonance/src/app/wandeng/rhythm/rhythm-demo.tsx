'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { PixelIcon } from '../wandeng-pixel-icons';
import {
  RHYTHM_SONGS,
  type RhythmSong,
  type RhythmSongId,
} from '../../../lib/cards/rhythm-songs';
import { RhythmSongAudio } from './rhythm-song-audio';
import { Numbers, Picture } from './rhythm-view';
import { sitePath } from '../../../lib/site-path';
import {
  RHYTHM_CARDS,
  RHYTHM_PRESETS,
  RHYTHM_RARITIES,
  rhythmDefinition,
  type RhythmDefinition,
} from '../../../lib/cards/rhythm-catalog';
import {
  RHYTHM_TICK_MS,
  defaultSongRhythmInput,
  equipRhythmSong,
  rhythmTiming,
  editRhythmCard,
  initialRhythmFrame,
  parseRhythmReplay,
  rhythmCardAt,
  rhythmPosition,
  rhythmPreset,
  serializeRhythmReplay,
  shiftRhythmCard,
  simulateRhythm,
  type RhythmFighter,
  type RhythmAction,
  type RhythmSide,
} from '../../../lib/cards/rhythm';

// The simulation settles instantly; presentation lets the cast reach its core first.
const IMPACT_TICKS = 12;
const FEEDBACK_TICKS = 36;
type Point = { x: number; y: number };
type BattleGeometry = {
  width: number;
  height: number;
  cards: Record<string, Point>;
  cores: Record<number, Point>;
};

type Selection = { id: string; uid?: string; side?: RhythmSide };
const seconds = (ticks: number) => ((ticks * RHYTHM_TICK_MS) / 1000).toFixed(2);

function Lantern({ enemy = false }: { enemy?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 64"
      className="wr-lantern"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path
        fill={enemy ? '#747b70' : '#9a744a'}
        d="M20 0h8v4h4v4h4v4h8v4H4v-4h8V8h4V4h4zM8 18h32v36h4v8H4v-8h4z"
      />
      <path fill="#4a5647" d="M12 18h24v32H12z" />
      <path fill={enemy ? '#a8c9ab' : '#e9ba65'} d="M16 20h16v28H16z" />
      <path fill="#fff0bc" d="M20 24h8v18h-8zM16 54h16v4H16z" />
      <path fill="#4a5647" d="M4 12h40v4H4zM4 58h40v4H4z" />
    </svg>
  );
}
function Host({
  fighter,
  side,
  health,
  tick,
  before,
  song,
  beatTick,
}: {
  fighter: RhythmFighter;
  side: RhythmSide;
  health: number;
  tick: number;
  before: RhythmFighter;
  song?: RhythmSong;
  beatTick: number;
}) {
  const feedback = fighter.feedback,
    age = feedback ? Math.max(0, tick - feedback.tick) : FEEDBACK_TICKS,
    fresh = !!feedback && age < FEEDBACK_TICKS,
    hurt = fresh && feedback.damage > 0,
    healed = fresh && feedback.heal > 0,
    heavy = hurt && feedback.damage >= 35,
    low = fighter.hp > 0 && fighter.hp / health <= 0.25,
    progress = Math.min(1, age / FEEDBACK_TICKS),
    chip = Math.max(fighter.hp, before.hp),
    gain = Math.min(fighter.hp, before.hp),
    impulse = Math.max(0, 1 - age / 10),
    shake = hurt ? Math.sin(age * 1.6) * impulse * (heavy ? 7 : 4) : 0;
  return (
    <section
      className={`wr-host wr-host-${side} ${hurt ? 'is-hurt' : ''} ${healed ? 'is-healed' : ''} ${heavy ? 'is-heavy-hit' : ''} ${low ? 'is-low' : ''} ${fighter.hp <= 0 ? 'is-extinguished' : ''}`}
      aria-label={`${side ? '对手' : '我方'}心灯`}
      style={
        {
          '--hit': hurt ? impulse : 0,
          '--heal': healed ? 1 - progress : 0,
          '--shake': `${shake}px`,
        } as CSSProperties
      }
    >
      <div className="wr-core" data-core={side}>
        <span className="wr-core-halo" />
        <Lantern enemy={side === 1} />
        {fresh && (
          <span
            className={`wr-core-impact ${healed && !hurt ? 'is-heal' : ''}`}
            style={{
              opacity: 1 - progress,
              transform: `scale(${0.75 + progress * 0.8})`,
            }}
          />
        )}
      </div>
      <div className="wr-host-vital">
        <div className="wr-host-title">
          <span title={song?.text}>
            {song
              ? `♪ ${song.name} · ${song.bpm} BPM`
              : side
                ? '长街来客 · 对手心灯'
                : '归物师 · 你的心灯'}
          </span>
          <span>
            {fighter.hp <= 0
              ? '灯火熄灭'
              : low
                ? '灯火微弱'
                : side
                  ? '对方'
                  : '我方'}
          </span>
        </div>
        <div className="wr-life-track" aria-hidden="true">
          <i
            className="wr-life-chip"
            style={{
              width: `${(chip / health) * 100}%`,
              opacity: hurt ? Math.max(0, 1 - progress) : 0,
            }}
          />
          <i
            className="wr-life-fill"
            style={{ width: `${(fighter.hp / health) * 100}%` }}
          />
          {healed && (
            <i
              className="wr-life-gain"
              style={{
                left: `${(gain / health) * 100}%`,
                width: `${((fighter.hp - gain) / health) * 100}%`,
                opacity: 1 - progress,
              }}
            />
          )}
          <div className="wr-life-value">
            <b className="wr-digits">{fighter.hp}</b>
            <small> / {health}</small>
          </div>
        </div>
        <progress
          className="wr-sr-only"
          aria-label={`${side ? '对手' : '你的'}生命`}
          value={fighter.hp}
          max={health}
        >
          {fighter.hp} / {health}
        </progress>
        <div className="wr-conditions" aria-label="当前状态">
          {song && (
            <span
              className="wr-song-beats"
              aria-label={`${side ? '对手' : '我方'}歌曲第${(Math.floor(Math.max(0, beatTick) / song.beatTicks) % 4) + 1}拍`}
            >
              {[0, 1, 2, 3].map((n) => (
                <i
                  key={n}
                  className={
                    Math.floor(Math.max(0, beatTick) / song.beatTicks) % 4 === n
                      ? 'is-beat'
                      : ''
                  }
                />
              ))}
              {fighter.songBoost ? <b>回甘＋{fighter.songBoost}</b> : null}
            </span>
          )}
          {fighter.burn > 0 && (
            <span title="灼烧：每秒按层数承伤，随后衰减1">
              <PixelIcon name="Flame" />
              {fighter.burn}
            </span>
          )}
          {fighter.poison > 0 && (
            <span title="毒：每秒按层数承伤，每3秒衰减1">
              <PixelIcon name="Skull" />
              {fighter.poison}
            </span>
          )}
          {fighter.guard > 0 && (
            <span title="下一次承伤减伤">
              <PixelIcon name="Shield" />
              {fighter.guard}%
            </span>
          )}
        </div>
      </div>
      {fresh && (
        <div
          className={`wr-float ${heavy ? 'is-heavy' : ''}`}
          aria-hidden="true"
          style={{
            opacity: Math.min(1, (1 - progress) * 4),
            transform: `translateY(${-8 - progress * 20}px) scale(${1 + impulse * 0.12})`,
          }}
        >
          {feedback.damage > 0 && (
            <b className="wr-digits wr-loss">
              <PixelIcon
                name={
                  feedback.poison > 0 &&
                  feedback.poison + feedback.burn === feedback.damage
                    ? 'Skull'
                    : feedback.burn > 0 &&
                        feedback.poison + feedback.burn === feedback.damage
                      ? 'Flame'
                      : 'Sword'
                }
              />
              −{feedback.damage}
            </b>
          )}
          {feedback.heal > 0 && (
            <b className="wr-digits wr-gain">
              <PixelIcon name="Heart" />＋{feedback.heal}
            </b>
          )}
        </div>
      )}
    </section>
  );
}

function BattleEffects({
  geometry,
  actions,
  tick,
  reduced,
  songs,
}: {
  geometry: BattleGeometry | null;
  actions: RhythmAction[];
  tick: number;
  reduced: boolean;
  songs: (RhythmSong | undefined)[];
}) {
  if (!geometry) return null;
  const recent = actions.filter(
    (a) => a.tick <= tick && tick - a.tick <= IMPACT_TICKS + 10,
  );
  return (
    <svg
      className="wr-battle-effects"
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      aria-hidden="true"
    >
      {recent.flatMap((action) => {
        const origin = geometry.cards[action.uid];
        if (!origin) return [];
        const age = tick - action.tick;
        const project = (
          kind: 'attack' | 'heal' | 'support',
          target: Point | undefined,
          color: string,
        ) => {
          if (!target) return null;
          const p = Math.min(1, age / IMPACT_TICKS),
            dx = target.x - origin.x,
            dy = target.y - origin.y;
          const point = (t: number) => ({
            x: origin.x + dx * t,
            y: origin.y + dy * t,
          });
          const head = point(p),
            tail = point(Math.max(0, p - 0.22));
          const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
          const impact = Math.max(0, (age - IMPACT_TICKS) / 10);
          return (
            <g
              key={`${action.side}:${action.tick}:${kind}`}
              className={`wr-cast wr-cast-${kind}`}
              style={{ color }}
              data-effect={kind}
              data-source={action.uid}
              data-target={kind === 'attack' ? 1 - action.side : action.side}
            >
              {age < IMPACT_TICKS && (
                <>
                  <circle
                    cx={origin.x}
                    cy={origin.y}
                    r={12 + p * 22}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity={(1 - p) * 0.8}
                  />
                  {!reduced && (
                    <>
                      <line
                        x1={tail.x}
                        y1={tail.y}
                        x2={head.x}
                        y2={head.y}
                        stroke="#1d2a23"
                        strokeWidth="14"
                        opacity="0.85"
                      />
                      <line
                        x1={tail.x}
                        y1={tail.y}
                        x2={head.x}
                        y2={head.y}
                        stroke="currentColor"
                        strokeWidth="8"
                      />
                      <line
                        x1={tail.x}
                        y1={tail.y}
                        x2={head.x}
                        y2={head.y}
                        stroke="#fffbe1"
                        strokeWidth="3"
                      />
                      <g
                        transform={`translate(${head.x} ${head.y}) rotate(${rotation})`}
                      >
                        <path
                          d="M14 0 L0 -7 L-12 0 L0 7 Z"
                          fill="#fff8d6"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        {kind === 'heal' && (
                          <path
                            d="M-3 -8H3V-3H8V3H3V8H-3V3H-8V-3H-3Z"
                            fill="#ddffa8"
                          />
                        )}
                      </g>
                    </>
                  )}
                </>
              )}
              {age >= IMPACT_TICKS && (
                <g
                  transform={`translate(${target.x} ${target.y})`}
                  opacity={1 - impact}
                >
                  <circle
                    r={12 + impact * 32}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={5 - impact * 3}
                  />
                  <path
                    d="M-22 0H22M0 -22V22M-14 -14L14 14M14 -14L-14 14"
                    stroke="#fff5d1"
                    strokeWidth="3"
                    transform={`scale(${0.7 + impact})`}
                  />
                </g>
              )}
            </g>
          );
        };
        const casts = [];
        if (songs[action.side]) {
          const p = Math.min(1, age / (IMPACT_TICKS + 10));
          const strong =
            action.tick % (songs[action.side]!.beatTicks * 4) === 0;
          casts.push(
            <g
              key={`${action.side}:${action.tick}:note`}
              className="wr-music-note"
              data-note-side={action.side}
              transform={`translate(${origin.x + (reduced ? 0 : p * 14)} ${origin.y - (reduced ? 12 : p * 55)}) scale(${strong ? 2.6 : 2})`}
              opacity={Math.min(1, (1 - p) * 3)}
              fill={songs[action.side]!.color}
              stroke="#26392d"
              strokeWidth="1.3"
              paintOrder="stroke"
              shapeRendering="crispEdges"
            >
              <path d="M0 2h5v-16h3v-2h8v7h-3v-3H8V7H6v2H0v-2h-2V4h2z" />
            </g>,
          );
        }
        if (action.damage || action.burn || action.poison)
          casts.push(
            project(
              'attack',
              geometry.cores[1 - action.side],
              action.burn
                ? '#ffb25e'
                : action.poison
                  ? '#7be3a2'
                  : action.side === 0
                    ? '#ffe59e'
                    : '#ff8879',
            ),
          );
        if (action.heal > 0)
          casts.push(project('heal', geometry.cores[action.side], '#baff85'));
        if (
          !action.damage &&
          !action.burn &&
          !action.poison &&
          !action.heal &&
          /接力/.test(action.label)
        )
          casts.push(
            project('support', geometry.cores[action.side], '#e6c179'),
          );
        return casts;
      })}
    </svg>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="wr-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={close} aria-label="关闭窗口">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

export default function RhythmDemo() {
  const [input, setInput] = useState(defaultSongRhythmInput);
  const [mode, setMode] = useState<'prep' | 'battle'>('prep');
  const [tick, setTick] = useState(0),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<Selection | null>(() => ({
    id: 'rhythm-furnace',
    uid: input.player[0]?.uid,
    side: 0,
  }));
  const [notice, setNotice] = useState(''),
    [replayOpen, setReplayOpen] = useState(false),
    [replayText, setReplayText] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transportRevision, setTransportRevision] = useState(0);
  const [audioState, setAudioState] = useState<
    'idle' | 'loading' | 'playing' | 'failed'
  >('idle');
  const displayedAudioState = running || listening ? audioState : 'idle';
  const [volume, setVolume] = useState(0.5);
  const [audio] = useState(() => new RhythmSongAudio());
  const [geometry, setGeometry] = useState<BattleGeometry | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const playhead = useRef(0),
    serial = useRef(100),
    resume = useRef(false);
  const result = useMemo(() => simulateRhythm(input), [input]);
  const endTick = result.frames[result.frames.length - 1].tick;
  const playbackEnd = endTick + IMPACT_TICKS;
  const frame =
    mode === 'prep'
      ? initialRhythmFrame(input)
      : result.frames[Math.min(result.frames.length - 1, Math.floor(tick) + 1)];
  const impactTick = tick - IMPACT_TICKS;
  const hostFrame =
    mode === 'prep' || impactTick < 0
      ? initialRhythmFrame(input)
      : result.frames[
          Math.min(result.frames.length - 1, Math.floor(impactTick) + 1)
        ];
  const finished = mode === 'battle' && tick >= playbackEnd;
  const timings = ([0, 1] as const).map((side) => rhythmTiming(input, side));
  const playerSong = timings[0].song;
  const loop = Math.floor(Math.max(0, frame.tick) / input.sweepTicks) + 1;
  const selectedDef = selected ? rhythmDefinition(selected.id) : undefined;

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const measure = () => {
      const bounds = table.getBoundingClientRect();
      const point = (el: Element) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left - bounds.left + r.width / 2,
          y: r.top - bounds.top + r.height / 2,
        };
      };
      const cards: Record<string, Point> = {},
        cores: Record<number, Point> = {};
      table.querySelectorAll<HTMLElement>('[data-card-uid]').forEach((el) => {
        cards[el.dataset.cardUid!] = point(
          el.querySelector('.wr-picture') ?? el,
        );
      });
      table.querySelectorAll<HTMLElement>('[data-core]').forEach((el) => {
        cores[Number(el.dataset.core)] = point(el);
      });
      const next = { width: bounds.width, height: bounds.height, cards, cores };
      setGeometry((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    table.querySelectorAll('.wr-host, .wr-ribbon').forEach((el) => {
      observer.observe(el);
    });
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [input.player, input.enemy, mode]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const request = requestAnimationFrame(() =>
      setReducedMotion(query.matches),
    );
    const changed = () => setReducedMotion(query.matches);
    query.addEventListener('change', changed);
    return () => {
      document.body.style.overflow = original;
      cancelAnimationFrame(request);
      query.removeEventListener('change', changed);
    };
  }, []);
  useEffect(() => {
    if (!running && !listening) {
      audio.pause();
      return;
    }
    let previous: number | null = null,
      request = 0,
      loadingRequest = 0,
      cancelled = false,
      musicClock = false;
    const advance = (timestamp: number) => {
      if (cancelled) return;
      const delta = previous === null ? 0 : timestamp - previous;
      previous = timestamp;
      const value = musicClock
        ? (audio.currentTick() ?? playhead.current)
        : playhead.current + (delta / RHYTHM_TICK_MS) * speed;
      playhead.current = listening ? value : Math.min(playbackEnd, value);
      setTick(playhead.current);
      if (!listening && playhead.current >= playbackEnd) setRunning(false);
      else request = requestAnimationFrame(advance);
    };
    if (playerSong) {
      loadingRequest = requestAnimationFrame(() => setAudioState('loading'));
      audio
        .play(
          playerSong,
          listening ? 0 : playhead.current,
          listening ? 1 : speed,
        )
        .then((ready) => {
          cancelAnimationFrame(loadingRequest);
          if (cancelled) return;
          if (!ready) {
            setAudioState('failed');
            request = requestAnimationFrame(advance);
            return;
          }
          musicClock = true;
          setAudioState('playing');
          request = requestAnimationFrame(advance);
        })
        .catch(() => {
          cancelAnimationFrame(loadingRequest);
          if (!cancelled) {
            setAudioState('failed');
            request = requestAnimationFrame(advance);
          }
        });
    } else request = requestAnimationFrame(advance);
    return () => {
      cancelled = true;
      cancelAnimationFrame(request);
      cancelAnimationFrame(loadingRequest);
      audio.pause();
    };
  }, [
    running,
    listening,
    speed,
    playbackEnd,
    playerSong,
    audio,
    transportRevision,
  ]);
  useEffect(() => {
    audio.setVolume(volume);
  }, [audio, volume]);
  useEffect(() => () => audio.dispose(), [audio]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        setRunning(false);
        setListening(false);
      }
    };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);

  function seek(value: number) {
    playhead.current = Math.max(0, Math.min(playbackEnd, value));
    setTick(playhead.current);
  }
  function start() {
    void audio.unlock().catch(() => {});
    setListening(false);
    setNotice('');
    setSelected(null);
    setMobileOpen(false);
    setMode('battle');
    seek(0);
    setTransportRevision((revision) => revision + 1);
    setRunning(true);
  }
  function inspect(selection: Selection) {
    if (mode === 'battle') {
      resume.current = running;
      setRunning(false);
    }
    setSelected(selection);
    setNotice('');
    if (mode === 'prep' && window.matchMedia('(max-width: 760px)').matches)
      setMobileOpen(true);
  }
  function closeInspection() {
    setSelected(null);
    if (resume.current && !finished) setRunning(true);
    resume.current = false;
  }
  function attempt(action: () => void) {
    try {
      action();
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '这一步没有完成。');
    }
  }
  function place(at: number) {
    if (!selected || selected.side === 1) return;
    attempt(() => {
      let counter = serial.current;
      while (
        [...input.player, ...input.enemy].some(
          (c) => c.uid === `p:placed:${counter}`,
        )
      )
        counter++;
      const uid = selected.uid ?? `p:placed:${counter}`;
      const next = editRhythmCard(
        input,
        0,
        { uid, id: selected.id, at },
        selected.uid,
      );
      setInput(next);
      serial.current = counter + 1;
      setSelected({ ...selected, uid, side: 0 });
    });
  }
  function shift(direction: -1 | 1) {
    if (selected?.uid && selected.side === 0)
      attempt(() =>
        setInput(shiftRhythmCard(input, 0, selected.uid!, direction)),
      );
  }
  function exportReplay() {
    const url = URL.createObjectURL(
      new Blob([serializeRhythmReplay(input)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wandeng-rhythm-replay.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function openReplay() {
    setListening(false);
    resume.current = running;
    setRunning(false);
    setReplayOpen(true);
    setNotice('');
  }
  function closeReplay() {
    setReplayOpen(false);
    if (resume.current && mode === 'battle' && !finished) setRunning(true);
    resume.current = false;
  }
  function loadReplay() {
    attempt(() => {
      const next = parseRhythmReplay(replayText);
      setInput(next);
      setReplayOpen(false);
      setSelected(null);
      setMode('battle');
      playhead.current = 0;
      setTick(0);
      setRunning(false);
      resume.current = false;
    });
  }

  function details(def: RhythmDefinition) {
    const fighter =
      selected?.side !== undefined ? frame.fighters[selected.side] : null;
    const state = selected?.uid ? fighter?.energy[selected.uid] : undefined;
    return (
      <>
        <div className="wr-detail-art" data-rarity={def.rarity}>
          <Picture def={def} />
          <Numbers def={def} />
        </div>
        <div className="wr-detail-copy">
          <span className="wr-eyebrow">
            {RHYTHM_RARITIES[def.rarity]} · {def.size}格 · {def.role}
          </span>
          <h2>{def.name}</h2>
          <p>{def.text}</p>
          <blockquote>“{def.story}”</blockquote>
          {state !== undefined && (
            <p>
              当前暖意：<b className="wr-digits">{state}</b>
            </p>
          )}
        </div>
      </>
    );
  }
  function board(side: RhythmSide) {
    const cards = side === 0 ? input.player : input.enemy,
      fighter = frame.fighters[side];
    const timing = timings[side];
    const position =
      mode === 'prep'
        ? 0
        : rhythmPosition(Math.min(tick, endTick), timing.sweepTicks);
    const current =
      mode === 'battle' ? rhythmCardAt(cards, Math.floor(position)) : undefined;
    const upcoming =
      mode === 'battle'
        ? result.actions.find((a) => a.side === side && a.tick > tick)
        : undefined;
    const nextName = upcoming
      ? rhythmDefinition(cards.find((c) => c.uid === upcoming.uid)!.id)!.name
      : '—';
    const wait = Math.max(0, fighter.nextTrigger - tick);
    return (
      <section
        className={`wr-formation wr-formation-${side}`}
        aria-label={side ? '对手九格卡牌区' : '你的九格卡牌区'}
      >
        <div className="wr-row-label">
          <span>
            <i />
            {side ? '对手 · ' : '你的 · '}
            {side ? '长街来客' : '旧物合奏'}
          </span>
          <span>
            {mode === 'battle' ? (
              <>
                下次：{nextName} <small>· 冷却 {seconds(wait)}s</small>
              </>
            ) : (
              '首扫即响 · 停留再奏'
            )}
          </span>
        </div>
        <div
          className="wr-ribbon"
          style={{ '--scan': position / 9 } as CSSProperties}
        >
          {Array.from({ length: 9 }, (_, at) => (
            <button
              key={`empty-${at}`}
              className="wr-empty"
              style={{ gridColumn: at + 1 }}
              tabIndex={mode === 'prep' && side === 0 ? 0 : -1}
              aria-label={`第${at + 1}格，放入所选物品`}
              disabled={mode === 'battle' || side === 1}
              onClick={() => place(at)}
              onDragOver={(e) => {
                if (mode === 'prep' && side === 0) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (side || mode !== 'prep') return;
                attempt(() => {
                  const uid = e.dataTransfer.getData(
                    'application/x-wandeng-rhythm',
                  );
                  const moving = input.player.find((c) => c.uid === uid);
                  if (moving)
                    setInput(editRhythmCard(input, 0, { ...moving, at }, uid));
                });
              }}
            >
              <span>{String(at + 1).padStart(2, '0')}</span>
              <span>＋</span>
            </button>
          ))}
          {cards.map((card) => {
            const def = rhythmDefinition(card.id)!,
              action = fighter.lastAction;
            const fired =
              mode === 'battle' &&
              action?.uid === card.uid &&
              tick - action.tick < 14;
            const supporting =
              mode === 'battle' &&
              action?.supports.includes(card.uid) &&
              tick - action.tick < 14;
            const count = Math.ceil(
              (def.size * timing.sweepTicks) / 9 / timing.triggerTicks,
            );
            return (
              <button
                key={card.uid}
                className={`wr-card ${fired ? 'is-fired' : ''} ${supporting ? 'is-supporting' : ''} ${current?.uid === card.uid ? 'is-current' : ''} ${selected?.uid === card.uid ? 'is-selected' : ''}`}
                style={{ gridColumn: `${card.at + 1} / span ${def.size}` }}
                data-rarity={def.rarity}
                data-size={def.size}
                data-card-uid={card.uid}
                aria-label={`${side ? '对手' : '你的'}${def.name}，${def.size}格，查看效果`}
                onClick={() => inspect({ id: card.id, uid: card.uid, side })}
                draggable={mode === 'prep' && side === 0}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/x-wandeng-rhythm',
                    card.uid,
                  );
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
                <header>
                  <strong>{def.name}</strong>
                  <span>
                    {RHYTHM_RARITIES[def.rarity]} <i>{'▪'.repeat(def.size)}</i>
                  </span>
                </header>
                <Picture def={def} />
                <Numbers def={def} />
                <footer>
                  {mode === 'prep'
                    ? `每圈约${count}次`
                    : def.kind === 'projector'
                      ? ['待装片', '已装片', '已聚光'][
                          fighter.stages[card.uid] ?? 0
                        ]
                      : def.kind === 'furnace'
                        ? `暖意 ${fighter.energy[card.uid] ?? 0}`
                        : fired
                          ? action!.reason === 'entry'
                            ? '首扫发动'
                            : '停留发动'
                          : current?.uid === card.uid
                            ? '共鸣停留中'
                            : '等待共鸣'}
                </footer>
                {fired && (
                  <span
                    className="wr-card-flare"
                    aria-hidden="true"
                    style={{
                      opacity: Math.max(0, 1 - (tick - action!.tick) / 14),
                    }}
                  />
                )}
              </button>
            );
          })}
          <div
            className={`wr-scan ${mode === 'prep' || finished ? 'is-resting' : ''}`}
            aria-hidden="true"
          >
            <span>✦</span>
          </div>
        </div>
        <div className="wr-slot-labels" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i}>{String(i + 1).padStart(2, '0')}</span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main
      className={`wd-root wr-root wr-${mode} ${playerSong ? 'wr-song-mode' : ''} ${mobileOpen ? 'wr-mobile-open' : ''}`}
    >
      <header className="wr-header">
        <a className="wr-brand" href={sitePath('/')}>
          <PixelIcon name="LampDesk" size={32} />
          <span>
            万灯城<small>许师傅的后院</small>
          </span>
        </a>
        <div className="wr-heading">
          <span className="wr-stamp">共鸣试演</span>
          <h1>听见旧物的合奏</h1>
        </div>
        <nav>
          <button onClick={openReplay}>回放手记</button>
          <button onClick={exportReplay}>导出回放</button>
        </nav>
      </header>
      <div className="wr-workspace">
        <section className="wr-stage">
          <div className="wr-toolbar">
            {playerSong && (
              <section
                className="wr-song-deck"
                aria-label="我方装备歌曲"
                data-audio-state={displayedAudioState}
                data-song-id={playerSong.id}
              >
                <div
                  className={`wr-record ${displayedAudioState === 'playing' ? 'is-spinning' : ''}`}
                  aria-hidden="true"
                  style={{ '--song-color': playerSong.color } as CSSProperties}
                >
                  <i>♪</i>
                </div>
                <div className="wr-song-caption">
                  <b>《{playerSong.name}》</b>
                  <span>
                    {playerSong.bpm} BPM · {playerSong.abilityName}
                  </span>
                </div>
                <button
                  className="wr-listen"
                  onClick={() => {
                    void audio.unlock().catch(() => {});
                    if (mode === 'prep') {
                      seek(0);
                      setListening(!listening);
                    } else setVolume(volume ? 0 : 0.5);
                  }}
                  aria-label={
                    mode === 'prep'
                      ? listening
                        ? '停止试听'
                        : '试听我方歌曲'
                      : volume
                        ? '静音歌曲'
                        : '开启歌曲声音'
                  }
                >
                  {mode === 'prep'
                    ? listening
                      ? '■'
                      : '▶ 试听'
                    : volume
                      ? '♪'
                      : '♪ ×'}
                </button>
                <label className="wr-volume">
                  音量
                  <input
                    aria-label="歌曲音量"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                  />
                </label>
                <output className="wr-audio-status">
                  {displayedAudioState === 'loading'
                    ? '乐曲准备中…'
                    : displayedAudioState === 'failed'
                      ? '乐曲未加载 · 静音演出'
                      : displayedAudioState === 'playing'
                        ? volume
                          ? '♪ 演奏中'
                          : '静音演出'
                        : '原创 · 钟琴与木键'}
                </output>
              </section>
            )}
            <div>
              <span className="wr-eyebrow">
                {mode === 'prep'
                  ? '先编排，再倾听'
                  : finished
                    ? '这一段合奏，落下了最后一个音'
                    : `第 ${loop} 圈 · 共鸣进行中`}
              </span>
              <strong>
                {mode === 'prep'
                  ? '把准备放在出手之前。'
                  : `${seconds(Math.min(tick, endTick))} / ${seconds(endTick)}s`}
              </strong>
            </div>
            <div className="wr-toolbar-actions">
              {mode === 'prep' && (
                <button
                  className="wr-mobile-options"
                  onClick={() => setMobileOpen(true)}
                >
                  调整
                </button>
              )}
              {mode === 'prep' ? (
                <button
                  className="wr-primary"
                  onClick={start}
                  disabled={input.player.length === 0}
                >
                  开始共鸣 <span>▶</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setRunning(false);
                      setMode('prep');
                      setSelected({
                        id: input.player[0]?.id ?? 'rhythm-lamp',
                        uid: input.player[0]?.uid,
                        side: 0,
                      });
                    }}
                  >
                    重新编排
                  </button>
                  <button onClick={start}>重播</button>
                  <button
                    className="wr-primary"
                    disabled={finished}
                    onClick={() => {
                      void audio.unlock().catch(() => {});
                      setRunning(!running);
                    }}
                  >
                    {running ? '暂停 Ⅱ' : '继续 ▶'}
                  </button>
                </>
              )}
            </div>
          </div>
          <div
            className={`wr-table ${running ? 'is-playing' : 'is-paused'}`}
            ref={tableRef}
          >
            <Host
              fighter={hostFrame.fighters[1]}
              before={
                result.frames[
                  Math.max(0, hostFrame.fighters[1].feedback?.tick ?? 0)
                ].fighters[1]
              }
              side={1}
              health={input.health}
              tick={impactTick}
              song={timings[1].song}
              beatTick={mode === 'prep' ? 0 : tick}
            />
            {board(1)}
            <div className="wr-center">
              <div className="wr-center-message">
                {finished ? (
                  <>
                    <span className="wr-stamp">
                      {result.timedOut
                        ? '试演结束'
                        : result.winner === 0
                          ? '你的合奏胜出'
                          : result.winner === 1
                            ? '来客略胜一筹'
                            : '同拍落幕'}
                    </span>
                    <strong>
                      {result.timedOut
                        ? '时间已到，双方仍有余音。'
                        : result.winner === 0
                          ? '这束光，被伙伴一起守住了。'
                          : result.winner === 1
                            ? '换一换顺序，再听一次。'
                            : '两盏心灯一起熄灭。'}
                    </strong>
                  </>
                ) : mode === 'prep' ? (
                  <>
                    <span className="wr-stamp">
                      共鸣线 · {seconds(input.triggerTicks)}s
                    </span>
                    <strong>每轮首次扫到，立即发动</strong>
                    <small>之后重置线的冷却 · 只发动当前物品</small>
                  </>
                ) : (
                  <>
                    <span className="wr-stamp">
                      {running ? '共鸣' : '静听'} ·{' '}
                      {seconds(input.triggerTicks)}s
                    </span>
                    <strong>
                      {frame.fighters[0].lastAction
                        ? rhythmDefinition(
                            input.player.find(
                              (c) =>
                                c.uid === frame.fighters[0].lastAction!.uid,
                            )!.id,
                          )!.name
                        : '等待第一声回应'}
                    </strong>
                    <small>
                      {frame.fighters[0].lastAction?.label ??
                        '扫过九格，编排一段合奏'}
                    </small>
                    {frame.fighters[0].boost.uses > 0 && (
                      <small className="wr-boost">
                        接下来{frame.fighters[0].boost.uses}次攻击 ＋
                        {frame.fighters[0].boost.value}
                      </small>
                    )}
                  </>
                )}
              </div>
            </div>
            {board(0)}
            <Host
              fighter={hostFrame.fighters[0]}
              before={
                result.frames[
                  Math.max(0, hostFrame.fighters[0].feedback?.tick ?? 0)
                ].fighters[0]
              }
              side={0}
              health={input.health}
              tick={impactTick}
              song={playerSong}
              beatTick={mode === 'prep' ? 0 : tick}
            />
            {mode === 'battle' && (
              <BattleEffects
                geometry={geometry}
                actions={result.actions}
                tick={tick}
                reduced={reducedMotion}
                songs={timings.map((t) => t.song)}
              />
            )}
          </div>
          {mode === 'prep' ? (
            <section className="wr-library" aria-label="可选物品">
              <div className="wr-library-label">
                <span>旧物架</span>
                <small>点选物品 → 点空格放入；点桌上的牌可调整顺序</small>
                <button
                  onClick={() => {
                    setInput({ ...input, player: [] });
                    setSelected({ id: 'rhythm-lamp' });
                  }}
                >
                  清空桌面
                </button>
              </div>
              <div className="wr-library-items">
                {RHYTHM_CARDS.map((def) => (
                  <button
                    key={def.id}
                    className={
                      selected?.id === def.id && !selected.uid
                        ? 'is-selected'
                        : ''
                    }
                    data-rarity={def.rarity}
                    onClick={() => inspect({ id: def.id })}
                    aria-label={`选择${def.name}`}
                  >
                    <Picture def={def} />
                    <span>
                      {def.name}
                      <small>
                        {def.size}格 · {def.role.split(' · ')[0]}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <footer className="wr-playback">
              <div className="wr-seek-row">
                <label htmlFor="wr-timeline">回看合奏</label>
                <input
                  id="wr-timeline"
                  type="range"
                  min={0}
                  max={playbackEnd}
                  step={1}
                  value={Math.floor(tick)}
                  onChange={(e) => {
                    setRunning(false);
                    seek(Number(e.target.value));
                  }}
                />
                <b>{seconds(Math.min(tick, endTick))}s</b>
              </div>
              <div className="wr-playback-actions">
                <span>点卡牌静听效果 · 支援并入当前动作</span>
                <button
                  onClick={() => {
                    setRunning(false);
                    const next = result.actions.find(
                      (a) => a.tick > impactTick,
                    );
                    seek(
                      next
                        ? Math.min(playbackEnd, next.tick + IMPACT_TICKS)
                        : playbackEnd,
                    );
                  }}
                >
                  下一次发动 →
                </button>
                <select
                  aria-label="播放速度"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                </select>
                <button
                  onClick={() => {
                    setRunning(false);
                    seek(playbackEnd);
                  }}
                >
                  看结果
                </button>
              </div>
              {finished && (
                <div className="wr-result-strip">
                  {result.scores
                    .filter((s) => s.side === 0)
                    .map((s) => (
                      <span key={s.uid}>
                        {
                          rhythmDefinition(
                            input.player.find((c) => c.uid === s.uid)!.id,
                          )!.name
                        }
                        <b>{s.triggers}次</b>
                        <small>
                          {s.damage
                            ? `直伤 ${s.damage}`
                            : s.heal
                              ? `治疗 ${s.heal}`
                              : `支援 ${s.support}`}
                        </small>
                      </span>
                    ))}
                </div>
              )}
            </footer>
          )}
        </section>
        {mode === 'prep' && (
          <aside className="wr-aside">
            <button
              className="wr-mobile-close"
              onClick={() => setMobileOpen(false)}
            >
              完成编排 ×
            </button>
            <section className="wr-settings">
              <span className="wr-eyebrow">先试一段，再慢慢调整</span>
              {([0, 1] as const).map((side) => (
                <label key={side}>
                  {side ? '对手装备歌曲' : '我方装备歌曲'}
                  <select
                    aria-label={side ? '对手装备歌曲' : '我方装备歌曲'}
                    value={timings[side].song?.id ?? ''}
                    onChange={(e) => {
                      setListening(false);
                      seek(0);
                      setInput(
                        equipRhythmSong(
                          input,
                          side,
                          e.target.value as RhythmSongId,
                        ),
                      );
                    }}
                  >
                    {!timings[side].song && (
                      <option value="" disabled>
                        旧版自由节奏
                      </option>
                    )}
                    {RHYTHM_SONGS.map((song) => (
                      <option key={song.id} value={song.id}>
                        {song.name} · {song.bpm} BPM
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {playerSong && (
                <div className="wr-song-ability">
                  <b>♪ {playerSong.abilityName}</b>
                  <p>{playerSong.text}</p>
                  <small>
                    每格2拍 · 我方{seconds(timings[0].sweepTicks)}s一圈／敌方
                    {seconds(timings[1].sweepTicks)}s一圈
                  </small>
                </div>
              )}
              <label>
                你的组合
                <select
                  aria-label="你的组合"
                  value={RHYTHM_PRESETS.findIndex(
                    (p) =>
                      p.ids.length === input.player.length &&
                      p.ids.every((id, i) => input.player[i]?.id === id),
                  )}
                  onChange={(e) => {
                    const index = Number(e.target.value);
                    const player = rhythmPreset(index, 0);
                    setInput({ ...input, player });
                    setSelected({
                      id: player[0].id,
                      uid: player[0].uid,
                      side: 0,
                    });
                    setNotice('');
                  }}
                >
                  <option value={-1} disabled>
                    自由编排
                  </option>
                  {RHYTHM_PRESETS.map((p, i) => (
                    <option key={p.name} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                公开对手
                <select
                  aria-label="公开对手"
                  value={RHYTHM_PRESETS.findIndex(
                    (p) =>
                      p.ids.length === input.enemy.length &&
                      p.ids.every((id, i) => input.enemy[i]?.id === id),
                  )}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      enemy: rhythmPreset(Number(e.target.value), 1),
                    })
                  }
                >
                  <option value={-1} disabled>
                    自定阵容
                  </option>
                  {RHYTHM_PRESETS.map((p, i) => (
                    <option key={p.name} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {!playerSong && (
                <div className="wr-timing">
                  <label>
                    扫完一圈
                    <select
                      aria-label="扫描一圈时长"
                      value={input.sweepTicks}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          sweepTicks: Number(e.target.value),
                        })
                      }
                    >
                      {![180, 270, 360, 540, 720].includes(
                        input.sweepTicks,
                      ) && (
                        <option value={input.sweepTicks}>
                          {seconds(input.sweepTicks)}s
                        </option>
                      )}
                      {[180, 270, 360, 540, 720].map((n) => (
                        <option key={n} value={n}>
                          {seconds(n)}s
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    触发冷却
                    <select
                      aria-label="节奏线触发冷却"
                      value={input.triggerTicks}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          triggerTicks: Number(e.target.value),
                        })
                      }
                    >
                      {![16, 24, 40, 60, 80].includes(input.triggerTicks) && (
                        <option value={input.triggerTicks}>
                          {seconds(input.triggerTicks)}s
                        </option>
                      )}
                      {[16, 24, 40, 60, 80].map((n) => (
                        <option key={n} value={n}>
                          {seconds(n)}s
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <p>
                {playerSong
                  ? '首扫立即发动；每格2拍，其余发动跟随歌曲节拍。战斗只播放我方歌曲。'
                  : '首次扫到必定发动。冷却主要影响同一张牌停留期间的再次发动。'}
              </p>
            </section>
            <section className="wr-inspector" aria-label="物品详情">
              {selectedDef ? (
                <>
                  {details(selectedDef)}
                  {selected?.uid && selected.side === 0 ? (
                    <div className="wr-edit-actions">
                      <button onClick={() => shift(-1)}>← 交换</button>
                      <button onClick={() => shift(1)}>交换 →</button>
                      <button
                        onClick={() =>
                          attempt(() => {
                            setInput(
                              editRhythmCard(input, 0, null, selected.uid),
                            );
                            setSelected({ id: selected.id });
                          })
                        }
                      >
                        收起
                      </button>
                    </div>
                  ) : selected?.side === 1 ? (
                    <p>这是来客的公开阵容。</p>
                  ) : (
                    <p className="wr-place-hint">
                      已从旧物架选中，点空格放入。
                    </p>
                  )}
                </>
              ) : (
                <p>点一件物品，听它的故事。</p>
              )}
            </section>
          </aside>
        )}
      </div>
      <footer className="wr-footnote">
        <span>万灯城 · 共鸣线原型</span>
        <span>
          {mode === 'prep' ? '物品有灵，顺序有意。' : '一条共鸣线，两盏心灯。'}
        </span>
      </footer>
      {notice && (
        <div className="wr-notice" role="alert">
          {notice}
          <button onClick={() => setNotice('')} aria-label="关闭提示">
            ×
          </button>
        </div>
      )}
      {selectedDef && mode === 'battle' && (
        <Modal title="静听物灵" close={closeInspection}>
          {details(selectedDef)}
          <div className="wr-dialog-footer">
            <button className="wr-primary" onClick={closeInspection}>
              返回合奏
            </button>
          </div>
        </Modal>
      )}
      {replayOpen && (
        <Modal title="共鸣回放手记" close={closeReplay}>
          <p>载入同一套物品与节奏，从头回看这段合奏。</p>
          <label className="wr-file">
            打开回放文件
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 256000) throw new Error('回放文件过大。');
                  setReplayText(await file.text());
                  setNotice('');
                } catch (error) {
                  setNotice(
                    error instanceof Error ? error.message : '未能读取回放。',
                  );
                }
              }}
            />
          </label>
          <textarea
            aria-label="回放内容"
            value={replayText}
            onChange={(e) => setReplayText(e.target.value)}
            placeholder="也可以把回放内容粘贴在这里…"
          />
          <div className="wr-dialog-footer">
            <button onClick={() => setReplayText(serializeRhythmReplay(input))}>
              填入当前对局
            </button>
            <button className="wr-primary" onClick={loadReplay}>
              载入并回看
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
