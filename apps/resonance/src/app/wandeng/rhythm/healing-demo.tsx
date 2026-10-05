'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  chapterHealingInput,
  initialHealingFrame,
  parseHealingReplay,
  serializeHealingReplay,
  simulateHealing,
  validateHealingInput,
  type HealingInput,
  type HealingFrame,
  type DemonState,
} from '../../../lib/cards/healing';
import {
  HEALING_CHAPTERS,
  HEALING_OPENING,
  HEALING_DEPARTURE,
  heartDemon,
  type HeartDemonKind,
} from '../../../lib/cards/healing-catalog';
import {
  RHYTHM_CARDS,
  RHYTHM_PRESETS,
  RHYTHM_RARITIES,
  rhythmDefinition,
  type RhythmDefinition,
} from '../../../lib/cards/rhythm-catalog';
import {
  rhythmCardAt,
  rhythmPosition,
  rhythmPreset,
  shiftRhythmCard,
  RHYTHM_SONG_VERSION,
  type RhythmFighter,
} from '../../../lib/cards/rhythm';
import { RHYTHM_SONGS, rhythmSong } from '../../../lib/cards/rhythm-songs';
import { RhythmSongAudio } from './rhythm-song-audio';
import { Numbers, Picture } from './rhythm-view';
import { HealerArt, DemonArt } from './healing-art';
import { PixelIcon } from '../wandeng-pixel-icons';
import { sitePath } from '../../../lib/site-path';
import {
  PresentationCardArt,
  PresentationDemonArt,
  PresentationHealerArt,
  PresentationNumbers,
  PresentationEffectIcon,
  AtlasArt,
  presentationAsset,
  type ArtDirection,
} from '../../../presentation/art';

const FLIGHT = 12,
  FEEDBACK = 36;
type Point = { x: number; y: number };
type Geometry = {
  width: number;
  height: number;
  anchors: Record<string, Point>;
};
type Story = {
  kind: 'opening' | 'departure' | 'before' | 'after';
  index: number;
};

function CardPicture({
  def,
  presentation,
}: {
  def: RhythmDefinition;
  presentation?: ArtDirection;
}) {
  return presentation ? (
    <PresentationCardArt def={def} direction={presentation} />
  ) : (
    <Picture def={def} />
  );
}
function HealerPicture({
  presentation,
  teacher = false,
}: {
  presentation?: ArtDirection;
  teacher?: boolean;
}) {
  return presentation ? (
    <PresentationHealerArt direction={presentation} teacher={teacher} />
  ) : (
    <HealerArt teacher={teacher} />
  );
}
function DemonPicture({
  kind,
  color,
  presentation,
}: {
  kind: HeartDemonKind;
  color: string;
  presentation?: ArtDirection;
}) {
  return presentation ? (
    <PresentationDemonArt kind={kind} direction={presentation} />
  ) : (
    <DemonArt kind={kind} color={color} />
  );
}
function CardNumbers({
  def,
  presentation,
}: {
  def: RhythmDefinition;
  presentation?: ArtDirection;
}) {
  return presentation ? (
    <PresentationNumbers def={def} direction={presentation} />
  ) : (
    <Numbers def={def} />
  );
}

function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="wh-dialog"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <span>听风之旅</span>
        <button onClick={close} aria-label="关闭窗口">
          ×
        </button>
      </header>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
function Life({
  hp,
  max,
  feedback,
  tick,
  label,
}: {
  hp: number;
  max: number;
  feedback: RhythmFighter['feedback'];
  tick: number;
  label: string;
}) {
  const age = feedback ? tick - feedback.tick : FEEDBACK,
    fresh = age >= 0 && age < FEEDBACK;
  const hurt = fresh && feedback!.damage > 0,
    healed = fresh && feedback!.heal > 0;
  return (
    <div
      className={`wh-life ${hurt ? 'is-hurt' : ''} ${healed ? 'is-healed' : ''}`}
    >
      <div className="wh-life-track">
        {hurt && (
          <i
            className="wh-life-chip"
            style={{
              width: `${(Math.min(max, hp + feedback!.damage) / max) * 100}%`,
              opacity: 1 - age / FEEDBACK,
            }}
          />
        )}
        <i className="wh-life-fill" style={{ width: `${(hp / max) * 100}%` }} />
        <span>
          <b>{hp}</b>
          <small> / {max}</small>
        </span>
      </div>
      <progress className="wr-sr-only" aria-label={label} max={max} value={hp}>
        {hp} / {max}
      </progress>
      {fresh && (
        <div
          className="wh-float"
          style={{
            opacity: Math.min(1, (1 - age / FEEDBACK) * 4),
            transform: `translateY(${-12 - age * 0.5}px)`,
          }}
          aria-hidden="true"
        >
          {hurt && <b className="wh-loss">−{feedback!.damage}</b>}
          {healed && <b className="wh-gain">＋{feedback!.heal}</b>}
        </div>
      )}
    </div>
  );
}
function Conditions({
  state,
  presentation,
}: {
  state: Pick<DemonState, 'burn' | 'poison' | 'guard'>;
  presentation?: ArtDirection;
}) {
  return (
    <div className="wh-conditions">
      {state.burn > 0 && (
        <span title="灼烧">
          {presentation ? (
            <PresentationEffectIcon kind="burn" direction={presentation} />
          ) : (
            <PixelIcon name="Flame" />
          )}
          {state.burn}
        </span>
      )}
      {state.poison > 0 && (
        <span title="毒">
          {presentation ? (
            <PresentationEffectIcon kind="poison" direction={presentation} />
          ) : (
            <PixelIcon name="Skull" />
          )}
          {state.poison}
        </span>
      )}
      {state.guard > 0 && (
        <span title="下一次承伤减免">
          {presentation ? (
            <PresentationEffectIcon kind="guard" direction={presentation} />
          ) : (
            <PixelIcon name="Shield" />
          )}
          {state.guard}%
        </span>
      )}
    </div>
  );
}

export default function HealingDemo({
  presentation,
}: { presentation?: ArtDirection } = {}) {
  const [input, setInput] = useState<HealingInput>(() =>
    chapterHealingInput(presentation ? 1 : 0),
  );
  const [chapterIndex, setChapterIndex] = useState(presentation ? 1 : 0);
  const [imported, setImported] = useState(false);
  const [mode, setMode] = useState<'prep' | 'battle'>('prep');
  const [running, setRunning] = useState(false),
    [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1),
    [volume, setVolume] = useState(0.45);
  const [revision, setRevision] = useState(0),
    [notice, setNotice] = useState('');
  const [story, setStory] = useState<Story | null>(
    presentation
      ? null
      : {
          kind: 'opening',
          index: 0,
        },
  );
  const [panel, setPanel] = useState<
    'setup' | 'journey' | 'library' | 'replay' | null
  >(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null);
  const [placement, setPlacement] = useState<string | null>(null);
  const [replayText, setReplayText] = useState('');
  const [completed, setCompleted] = useState<number[]>([]);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const table = useRef<HTMLDivElement>(null),
    playhead = useRef(0),
    serial = useRef(1);
  const [audio] = useState(() => new RhythmSongAudio());
  const result = useMemo(() => simulateHealing(input), [input]);
  const chapter = HEALING_CHAPTERS[chapterIndex],
    song = rhythmSong(input.song)!;
  const end = result.frames[result.frames.length - 1].tick,
    playbackEnd = end + FLIGHT + FEEDBACK;
  const displayTick = Math.max(-1, Math.min(end, Math.floor(tick) - FLIGHT));
  const feedbackTick = mode === 'battle' ? Math.floor(tick) - FLIGHT : -1;
  const frame: HealingFrame =
    mode === 'prep'
      ? initialHealingFrame(input)
      : result.frames[displayTick + 1];
  const finished = mode === 'battle' && tick >= end + FLIGHT;
  const position =
    mode === 'battle'
      ? rhythmPosition(Math.min(end, tick), song.beatTicks * 18)
      : 0;
  const current =
    mode === 'battle'
      ? rhythmCardAt(input.player, Math.floor(position))
      : undefined;
  const active =
    mode === 'battle'
      ? result.actions.filter((a) => a.tick <= tick && tick - a.tick < 22)
      : [];
  const inspected = selected
    ? rhythmDefinition(
        input.player.find((c) => c.uid === selected)?.id ?? selected,
      )
    : undefined;
  const inspectedUnit = selectedEnemy
    ? input.enemies.find((e) => e.uid === selectedEnemy)
    : undefined;
  const inspectedDemon = inspectedUnit
    ? heartDemon(inspectedUnit.id)
    : undefined;

  useEffect(() => {
    const measure = () => {
      const root = table.current;
      if (!root) return;
      const bounds = root.getBoundingClientRect(),
        anchors: Record<string, Point> = {};
      root.querySelectorAll<HTMLElement>('[data-anchor]').forEach((node) => {
        const r = node.getBoundingClientRect();
        anchors[node.dataset.anchor!] = {
          x: r.left + r.width / 2 - bounds.left,
          y: r.top + r.height / 2 - bounds.top,
        };
      });
      setGeometry({ width: bounds.width, height: bounds.height, anchors });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (table.current) observer.observe(table.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [input, mode]);
  useEffect(() => {
    audio.setVolume(volume);
  }, [audio, volume]);
  useEffect(() => () => audio.dispose(), [audio]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);
  useEffect(() => {
    if (!running) {
      audio.pause();
      return;
    }
    let cancelled = false,
      raf = 0;
    const anchorTick = playhead.current;
    void audio
      .play(song, anchorTick, speed)
      .catch(() => {
        setNotice('乐曲未能加载，正在静音演奏。');
        return false;
      })
      .then(() => {
        if (cancelled) return;
        const anchorTime = performance.now();
        const advance = (now: number) => {
          if (cancelled) return;
          playhead.current = Math.min(
            playbackEnd,
            audio.currentTick() ??
              anchorTick + ((now - anchorTime) / 25) * speed,
          );
          setTick(playhead.current);
          if (playhead.current >= playbackEnd) {
            setRunning(false);
            return;
          }
          raf = requestAnimationFrame(advance);
        };
        raf = requestAnimationFrame(advance);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      audio.pause();
    };
  }, [audio, running, song, speed, playbackEnd, revision]);

  function seek(value: number) {
    playhead.current = value;
    setTick(value);
  }
  function start() {
    void audio.unlock().catch(() => {});
    setPanel(null);
    setSelected(null);
    setSelectedEnemy(null);
    setNotice('');
    setMode('battle');
    seek(0);
    setRevision((r) => r + 1);
    setRunning(true);
  }
  function prepare() {
    setRunning(false);
    setMode('prep');
    seek(0);
    setNotice('');
  }
  function openPanel(value: typeof panel) {
    setRunning(false);
    setPanel(value);
    setNotice('');
  }
  function attempt(action: () => void) {
    try {
      action();
      setNotice('');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '这一步没有完成。');
    }
  }
  function changeChapter(index: number, narrative = true) {
    setRunning(false);
    setMode('prep');
    seek(0);
    setPanel(null);
    setSelected(null);
    setSelectedEnemy(null);
    setPlacement(null);
    setChapterIndex(index);
    setImported(false);
    setInput((old) =>
      validateHealingInput({
        ...chapterHealingInput(index),
        player: old.player,
        song: old.song,
      }),
    );
    setStory(narrative ? { kind: 'before', index: 0 } : null);
    setNotice('');
  }
  function advanceStory() {
    if (!story) return;
    const scenes =
      story.kind === 'opening'
        ? HEALING_OPENING
        : story.kind === 'departure'
          ? HEALING_DEPARTURE
          : chapter[story.kind];
    if (story.index < scenes.length - 1) {
      setStory({ ...story, index: story.index + 1 });
      return;
    }
    if (story.kind === 'opening') setStory({ kind: 'before', index: 0 });
    else if (story.kind === 'after' && chapterIndex === 0)
      setStory({ kind: 'departure', index: 0 });
    else if (story.kind === 'departure') changeChapter(1);
    else if (
      story.kind === 'after' &&
      chapterIndex < HEALING_CHAPTERS.length - 1
    )
      changeChapter(chapterIndex + 1);
    else setStory(null);
  }
  function finishChapter() {
    setRunning(false);
    setCompleted((old) =>
      old.includes(chapterIndex) ? old : [...old, chapterIndex],
    );
    setStory({ kind: 'after', index: 0 });
  }
  function inspectCard(uid: string) {
    setRunning(false);
    setSelected(uid);
    setSelectedEnemy(null);
  }
  function place(at: number) {
    if (!placement) {
      openPanel('library');
      return;
    }
    attempt(() => {
      let counter = serial.current;
      while (
        [...input.player, ...input.enemies].some(
          (c) => c.uid === `healer:placed:${counter}`,
        )
      )
        counter++;
      const uid = `healer:placed:${counter}`;
      const next = validateHealingInput({
        ...input,
        player: [...input.player, { uid, id: placement, at }],
      });
      setInput(next);
      serial.current = counter + 1;
      setPlacement(null);
      setSelected(uid);
    });
  }
  function shift(direction: -1 | 1) {
    if (!selected) return;
    attempt(() => {
      const old = shiftRhythmCard(
        {
          rulesVersion: RHYTHM_SONG_VERSION,
          seed: input.seed,
          health: input.health,
          maxTicks: input.maxTicks,
          player: input.player,
          enemy: [],
          songs: [input.song, input.song],
          triggerTicks: song.beatTicks,
          sweepTicks: song.beatTicks * 18,
        },
        0,
        selected,
        direction,
      );
      setInput(validateHealingInput({ ...input, player: old.player }));
    });
  }
  function exportReplay() {
    const url = URL.createObjectURL(
      new Blob([serializeHealingReplay(input)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resonance-healing-replay-v3.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function effects() {
    if (!geometry || mode !== 'battle') return null;
    const recentPlayer = result.actions.filter(
      (a) => a.tick <= tick && tick - a.tick < 24,
    );
    const recentEnemy = result.enemyActions.filter(
      (a) => a.tick <= tick && tick - a.tick < 24,
    );
    const projectile = (
      key: string,
      source: string,
      destination: string,
      when: number,
      color: string,
      musical: boolean,
    ) => {
      const origin = geometry!.anchors[source],
        target = geometry!.anchors[destination];
      if (!origin || !target) return null;
      const age = tick - when,
        p = Math.min(1, age / FLIGHT);
      const point = (n: number) => ({
        x: origin.x + (target.x - origin.x) * n,
        y: origin.y + (target.y - origin.y) * n,
      });
      const head = point(p),
        tail = point(Math.max(0, p - 0.24));
      return (
        <g
          key={key}
          style={{ color }}
          data-source={source}
          data-target={destination}
        >
          {age < FLIGHT ? (
            <>
              <line
                x1={tail.x}
                y1={tail.y}
                x2={head.x}
                y2={head.y}
                stroke="#223b31"
                strokeWidth="16"
              />
              <line
                x1={tail.x}
                y1={tail.y}
                x2={head.x}
                y2={head.y}
                stroke="currentColor"
                strokeWidth="9"
              />
              {presentation === 'storybook' ? (
                <>
                  <circle cx={head.x} cy={head.y} r="11" fill="#fff0bd" />
                  <path
                    transform={`translate(${head.x - 4} ${head.y + 2})`}
                    d="M2-8v13c-8 3-9-4-2-5V-8l8-2v11c-7 3-8-4-2-5v-4z"
                    fill={color}
                  />
                </>
              ) : (
                <rect
                  x={head.x - 7}
                  y={head.y - 7}
                  width="14"
                  height="14"
                  fill="#fff1c7"
                />
              )}
            </>
          ) : (
            <path
              transform={`translate(${target.x} ${target.y}) scale(${1 + (age - FLIGHT) / 8})`}
              d={
                presentation === 'storybook'
                  ? 'M0-18l5 12 13 6-13 5-5 13-5-13-13-5 13-6z'
                  : 'M-16 -4h12v-12h8v12h12v8H4v12h-8V4h-12z'
              }
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity={1 - (age - FLIGHT) / 12}
            />
          )}
          {musical && (
            <path
              transform={`translate(${origin.x - 9} ${origin.y - 18 - age * 1.4}) scale(1.8)`}
              d={
                presentation === 'storybook'
                  ? 'M4-12v14c-8 4-10-4-2-5V-12l11-3V0c-8 4-10-4-2-5v-6z'
                  : 'M4-12h9v4H8v12H0V0h4zM11-8h4v4h-4z'
              }
              fill="currentColor"
              opacity={1 - age / 24}
            />
          )}
        </g>
      );
    };
    return (
      <svg
        className="wh-effects"
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        aria-hidden="true"
      >
        {recentPlayer.map((a) => (
          <g key={`p:${a.uid}:${a.tick}`}>
            {a.damage + a.burn + a.poison > 0 &&
              projectile(
                `p-hit:${a.tick}`,
                a.uid,
                a.target,
                a.tick,
                a.poison ? '#8cd598' : a.burn ? '#ffc173' : '#ffdfa0',
                true,
              )}
            {a.heal > 0 &&
              projectile(
                `p-heal:${a.tick}`,
                a.uid,
                'player',
                a.tick,
                '#c3f39d',
                true,
              )}
            {a.damage + a.burn + a.poison === 0 &&
              a.heal === 0 &&
              projectile(
                `p-support:${a.tick}`,
                a.uid,
                'player',
                a.tick,
                song.color,
                true,
              )}
          </g>
        ))}
        {recentEnemy.map((a) =>
          a.damage + a.burn + a.poison + a.heal > 0
            ? projectile(
                `e:${a.uid}:${a.skill}:${a.tick}`,
                a.uid,
                a.target,
                a.tick,
                a.heal ? '#b1dfa8' : '#f1a3a1',
                false,
              )
            : null,
        )}
      </svg>
    );
  }
  const nextPlayer = result.actions.find((a) => a.tick > tick);
  const latestEnemy = result.enemyActions.filter((a) => a.tick <= tick).at(-1);
  const storyScenes = story
    ? story.kind === 'opening'
      ? HEALING_OPENING
      : story.kind === 'departure'
        ? HEALING_DEPARTURE
        : chapter[story.kind]
    : null;
  const scene = story && storyScenes ? storyScenes[story.index] : null;
  return (
    <main
      className={`wd-root wr-root wh-root ${presentation ? `wh-art-${presentation}` : ''} ${mode === 'battle' ? 'wh-battle' : 'wh-prep'}`}
      style={
        presentation
          ? ({
              '--pa-battle-scene': `url("${presentationAsset(presentation === 'summer' ? 'summer-scene-v2' : 'storybook-scene')}")`,
            } as CSSProperties)
          : undefined
      }
    >
      <header className="wh-header">
        <div>
          <span className="wh-eyebrow">共鸣 · 治愈师的旅途</span>
          <h1>
            听风之旅 <small> / {imported ? '回放心景' : chapter.place}</small>
          </h1>
        </div>
        <nav>
          <a
            href={sitePath(
              presentation === 'storybook' ? '/art/storybook' : '/art',
            )}
          >
            {presentation ? '← 回到驿站' : '美术试演'}
          </a>
          <a href={sitePath('/outline')}>大纲编排</a>
          <button onClick={() => openPanel('journey')}>旅途手记</button>
          <button
            disabled={imported}
            onClick={() => {
              setRunning(false);
              setStory({ kind: 'before', index: 0 });
            }}
          >
            故事
          </button>
          <button onClick={() => openPanel('setup')}>编排与乐曲</button>
        </nav>
      </header>
      <section className="wh-stage">
        <div className="wh-song-strip">
          <div
            className={`wr-record ${running ? 'is-spinning' : ''}`}
            style={{ '--song-color': song.color } as CSSProperties}
          >
            {presentation ? (
              <AtlasArt direction={presentation} index={9} />
            ) : (
              <i>♪</i>
            )}
          </div>
          <div>
            <b>{song.name}</b>
            <span>
              {song.bpm} BPM · {song.abilityName}
            </span>
          </div>
          <div
            className="wh-beats"
            aria-label={`歌曲第${(Math.floor(tick / song.beatTicks) % 4) + 1}拍`}
          >
            {[0, 1, 2, 3].map((n) => (
              <i
                key={n}
                className={
                  Math.floor(tick / song.beatTicks) % 4 === n ? 'is-beat' : ''
                }
              />
            ))}
          </div>
          <label className="wh-volume">
            音量
            <input
              aria-label="音乐音量"
              type="range"
              min="0"
              max="1"
              step=".05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
          <button onClick={() => setVolume((v) => (v ? 0 : 0.45))}>
            {volume ? '静音' : '开声'}
          </button>
        </div>
        <div className="wh-table" ref={table}>
          <div className="wh-scene-title">
            <span>心景 · {imported ? '一段保存的演奏' : chapter.title}</span>
            <small>
              {mode === 'prep'
                ? '选择一只心魔作为优先目标'
                : `心魔 ${frame.enemies.filter((e) => e.hp > 0).length} / ${input.enemies.length}`}
            </small>
          </div>
          <div
            className="wh-enemies"
            style={{ '--enemy-count': input.enemies.length } as CSSProperties}
          >
            {input.enemies.map((unit, n) => {
              const def = heartDemon(unit.id)!,
                state = frame.enemies[n];
              const focus =
                mode === 'prep'
                  ? input.priority === unit.uid
                  : frame.target === unit.uid;
              const recentHit =
                state.feedback &&
                feedbackTick - state.feedback.tick < 10 &&
                state.feedback.damage > 0;
              const skill = def.skills.toSorted(
                (a, b) => state.next[a.id] - state.next[b.id],
              )[0];
              const remaining = Math.max(
                0,
                state.next[skill.id] - Math.max(0, displayTick),
              );
              const warning =
                mode === 'battle' &&
                remaining <= 30 &&
                state.hp > 0 &&
                !finished;
              const preparing =
                state.next[skill.id] === skill.first
                  ? skill.first
                  : skill.cooldown;
              return (
                <article
                  key={unit.uid}
                  className={`wh-enemy ${focus ? 'is-target' : ''} ${state.hp === 0 ? 'is-gone' : ''} ${warning ? 'is-warning' : ''} ${recentHit ? 'is-hit' : ''}`}
                  data-enemy={unit.uid}
                >
                  <div className="wh-enemy-title">
                    <b>{def.name}</b>
                    <small>
                      {state.hp === 0
                        ? '已消散'
                        : focus
                          ? '优先目标'
                          : `攻击 ${unit.attack}`}
                    </small>
                  </div>
                  <button
                    className="wh-entity"
                    onClick={() => {
                      if (mode === 'prep')
                        setInput(
                          validateHealingInput({
                            ...input,
                            priority: unit.uid,
                          }),
                        );
                      else {
                        setRunning(false);
                        setSelectedEnemy(unit.uid);
                      }
                    }}
                    aria-label={
                      mode === 'prep'
                        ? `优先攻击${def.name}`
                        : `查看${def.name}技能`
                    }
                  >
                    <span className="wh-entity-anchor" data-anchor={unit.uid}>
                      <DemonPicture
                        kind={unit.id}
                        color={def.color}
                        presentation={presentation}
                      />
                    </span>
                    {focus && state.hp > 0 && (
                      <span className="wh-target-marker">▼</span>
                    )}
                  </button>
                  <Life
                    hp={state.hp}
                    max={unit.health}
                    feedback={state.feedback}
                    tick={feedbackTick}
                    label={`${def.name}生命`}
                  />
                  <div className="wh-skill-next">
                    <span>
                      {state.hp === 0
                        ? '声音渐渐安静'
                        : `${warning ? '！' : ''}${skill.name}`}
                    </span>
                    <b>
                      {state.hp > 0 ? `${(remaining / 40).toFixed(1)}s` : '✓'}
                    </b>
                  </div>
                  <div className="wh-skill-track">
                    <i
                      style={{
                        width: `${state.hp > 0 ? Math.min(1, 1 - remaining / preparing) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <Conditions state={state} presentation={presentation} />
                  {mode === 'prep' && (
                    <button
                      className="wh-skill-help"
                      onClick={() => setSelectedEnemy(unit.uid)}
                    >
                      查看技能
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          <div className="wh-battle-caption" aria-live="polite">
            {finished ? (
              <>
                <b>
                  {result.winner === 'player'
                    ? '心景重新有了风'
                    : result.timedOut
                      ? '先停下来，换一种编排'
                      : '没关系，先歇一歇'}
                </b>
                <span>
                  {result.winner === 'player'
                    ? '去听听，这个人接下来想做什么。'
                    : '器具和歌曲都还在，可重新尝试。'}
                </span>
              </>
            ) : mode === 'prep' ? (
              <>
                <b>先倾听，再开始演奏</b>
                <span>{chapter.promise}</span>
              </>
            ) : (
              <>
                <b>
                  {current ? rhythmDefinition(current.id)!.name : '旋律继续'}
                </b>
                <span>
                  {latestEnemy && tick - latestEnemy.tick < 70
                    ? `${heartDemon(input.enemies.find((e) => e.uid === latestEnemy.uid)!.id)!.name} · ${latestEnemy.label}`
                    : '让歌带着共鸣线走'}
                </span>
              </>
            )}
          </div>
          <div className="wh-player-board">
            <div className="wh-slot-grid">
              {Array.from({ length: 9 }, (_, at) => (
                <button
                  key={at}
                  className={placement ? 'can-place' : ''}
                  aria-label={`第${at + 1}格${placement ? '放置器具' : '添加器具'}`}
                  disabled={mode === 'battle'}
                  onClick={() => place(at)}
                >
                  <span>{at + 1}</span>
                </button>
              ))}
            </div>
            <div className="wh-cards">
              {input.player.map((card) => {
                const def = rhythmDefinition(card.id)!,
                  fired = active.find((a) => a.uid === card.uid);
                return (
                  <button
                    key={card.uid}
                    className={`wh-card ${current?.uid === card.uid ? 'is-current' : ''} ${fired ? 'is-fired' : ''}`}
                    data-rarity={def.rarity}
                    style={{
                      left: `calc(${(card.at / 9) * 100}% + 3px)`,
                      width: `calc(${(def.size / 9) * 100}% - 6px)`,
                    }}
                    onClick={() => inspectCard(card.uid)}
                    aria-label={`${def.name}，${def.size}格，${RHYTHM_RARITIES[def.rarity]}`}
                  >
                    <header>
                      <strong>{def.name}</strong>
                      <small>
                        {RHYTHM_RARITIES[def.rarity]} · {def.size}格
                      </small>
                    </header>
                    <div data-anchor={card.uid}>
                      <CardPicture def={def} presentation={presentation} />
                    </div>
                    <CardNumbers def={def} presentation={presentation} />
                    <footer>{fired ? fired.label : '♪ 共鸣器具'}</footer>
                  </button>
                );
              })}
            </div>
            {mode === 'battle' && !finished && (
              <div
                className="wh-scan"
                style={{ left: `${(position / 9) * 100}%` }}
              >
                <span>♪</span>
              </div>
            )}
          </div>
          <div
            className={`wh-player-host ${frame.player.feedback && feedbackTick - frame.player.feedback.tick < 10 && frame.player.feedback.damage > 0 ? 'is-hit' : ''}`}
          >
            <div className="wh-player-portrait" data-anchor="player">
              <HealerPicture presentation={presentation} />
            </div>
            <div className="wh-player-vital">
              <div className="wh-player-name">
                <b>治愈师 · 阿弦</b>
                <span>
                  生命{' '}
                  {frame.player.guard > 0
                    ? ` · 定心 ${frame.player.guard}%`
                    : ''}
                </span>
              </div>
              <Life
                hp={frame.player.hp}
                max={input.health}
                feedback={frame.player.feedback}
                tick={feedbackTick}
                label="治愈师生命"
              />
            </div>
            <div className="wh-player-status">
              <Conditions state={frame.player} presentation={presentation} />
              {frame.player.songBoost ? (
                <small>回甘 ＋{frame.player.songBoost}</small>
              ) : null}
            </div>
          </div>
          {effects()}
        </div>
        <footer className="wh-controls">
          <div className="wh-play-controls">
            {mode === 'prep' ? (
              <button className="wh-primary" onClick={start}>
                ♪ 开始演奏
              </button>
            ) : (
              <>
                <button
                  className="wh-primary"
                  onClick={() => {
                    if (tick >= playbackEnd) seek(0);
                    void audio.unlock().catch(() => {});
                    setRunning(!running);
                  }}
                >
                  {running ? '暂停' : finished ? '再听一次' : '继续演奏'}
                </button>
                <button onClick={start}>重播</button>
                <button onClick={prepare}>重新编排</button>
              </>
            )}
            {finished && result.winner === 'player' && !imported && (
              <button className="wh-primary" onClick={finishChapter}>
                {chapterIndex === 5 ? '听见尾声' : '走出心景 →'}
              </button>
            )}
          </div>
          <div className="wh-progress">
            <input
              type="range"
              aria-label="战斗回看"
              min="0"
              max={playbackEnd}
              step="1"
              value={tick}
              disabled={mode === 'prep'}
              onChange={(e) => {
                setRunning(false);
                seek(Number(e.target.value));
              }}
            />
            <small>{(Math.min(end, tick) / 40).toFixed(1)}s</small>
          </div>
          <button
            onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 0.5 : 1)}
          >
            {speed}×
          </button>
          <button
            className="wh-replay-button"
            onClick={() => openPanel('replay')}
          >
            回放
          </button>
        </footer>
      </section>
      <footer className="wh-footnote">
        <output>
          {notice ||
            (placement
              ? `已拿起${rhythmDefinition(placement)!.name}，点击空格放下。`
              : mode === 'battle' && nextPlayer && !finished
                ? `下一声：${rhythmDefinition(input.player.find((c) => c.uid === nextPlayer.uid)!.id)!.name}`
                : '九格编排 · 每圈首扫必响 · 心魔独立行动')}
        </output>
        <small>
          {imported ? '回放记录' : `心景试演 · ${chapterIndex + 1} / 6`}
        </small>
      </footer>

      {story && scene && (
        <Dialog
          title={
            story.kind === 'opening'
              ? '序 · 一首还没唱完的歌'
              : story.kind === 'departure'
                ? '启程 · 一封来自沿途的信'
                : chapter.title
          }
          close={() => setStory(null)}
        >
          <div className="wh-story-art">
            <span className="wh-story-moon" />
            <HealerPicture
              teacher={scene.speaker.includes('师傅')}
              presentation={presentation}
            />
            <div className="wh-story-notes">♪　♫　♪</div>
            <span className="wh-story-ground" />
          </div>
          <p className="wh-scene-speaker">{scene.speaker}</p>
          <p className="wh-scene-text">{scene.text}</p>
          <div className="wh-story-pagination">
            {storyScenes!.map((_, i) => (
              <i key={i} className={story.index === i ? 'is-current' : ''} />
            ))}
          </div>
          <div className="wh-dialog-actions">
            <button onClick={() => setStory(null)}>跳过这段</button>
            <button className="wh-primary" onClick={advanceStory}>
              {story.index < storyScenes!.length - 1
                ? '继续 →'
                : story.kind === 'after'
                  ? chapterIndex === 5
                    ? '把这首歌带回家'
                    : chapterIndex === 0
                      ? '读一封来信 →'
                      : '前往下一站 →'
                  : story.kind === 'opening'
                    ? '跟师傅练习 →'
                    : story.kind === 'departure'
                      ? '启程 →'
                      : '进入心景 →'}
            </button>
          </div>
          {story.kind === 'opening' && (
            <a className="wh-outline-link" href={sitePath('/outline')}>
              共同撰写故事大纲 →
            </a>
          )}
        </Dialog>
      )}
      {panel === 'journey' && (
        <Dialog title="沿途，还没说完的话" close={() => setPanel(null)}>
          <div className="wh-journey-list">
            {HEALING_CHAPTERS.map((c, i) => (
              <button
                key={c.id}
                className={i === chapterIndex ? 'is-current' : ''}
                onClick={() => changeChapter(i)}
              >
                <b>
                  {completed.includes(i) ? '✓' : String(i + 1).padStart(2, '0')}
                </b>
                <div>
                  <strong>
                    {c.place} · {c.title}
                  </strong>
                  <span>{c.person}</span>
                </div>
                <small>{c.enemies.length}只心魔 →</small>
              </button>
            ))}
          </div>
          <p className="wh-note">
            原型开放全部章节试战。胜利后有收尾对话；下一站保留自己的器具编排与歌曲，生命恢复。
          </p>
          <div className="wh-dialog-actions">
            <button
              onClick={() => {
                changeChapter(0, false);
                setStory({ kind: 'opening', index: 0 });
              }}
            >
              重看开篇
            </button>
            <a href={sitePath('/legacy')}>历史对称试演</a>
            <a href={sitePath('/outline')}>共同撰写故事大纲 →</a>
          </div>
        </Dialog>
      )}
      {panel === 'setup' && (
        <Dialog title="把声音排成一首歌" close={() => setPanel(null)}>
          {mode === 'battle' && (
            <p className="wh-note">演奏已暂停。重新编排后再修改歌曲或器具。</p>
          )}
          <div className="wh-song-choices">
            {RHYTHM_SONGS.map((s) => (
              <button
                key={s.id}
                className={s.id === input.song ? 'is-current' : ''}
                disabled={mode === 'battle'}
                onClick={() =>
                  setInput(validateHealingInput({ ...input, song: s.id }))
                }
              >
                <strong>♪ {s.name}</strong>
                <small>{s.bpm} BPM · 每格两拍</small>
                <p>{s.text}</p>
              </button>
            ))}
          </div>
          <h3>器具合奏</h3>
          <div className="wh-presets">
            {RHYTHM_PRESETS.map((p, i) => (
              <button
                key={p.name}
                disabled={mode === 'battle'}
                onClick={() => {
                  setInput(
                    validateHealingInput({
                      ...input,
                      player: rhythmPreset(i, 0),
                    }),
                  );
                  setSelected(null);
                }}
              >
                <b>{p.name}</b>
                <small>{p.note}</small>
              </button>
            ))}
          </div>
          <p className="wh-note">
            点击演奏台上的器具查看、交换顺序或移除；空格可加入器具。减伤不叠加，保护下一次共同承伤结算。心魔技能冷却独立于歌速。
          </p>
          <div className="wh-dialog-actions">
            {mode === 'battle' && (
              <button
                onClick={() => {
                  prepare();
                  setPanel(null);
                }}
              >
                回到编排
              </button>
            )}
            <button className="wh-primary" onClick={() => setPanel(null)}>
              回到演奏台
            </button>
          </div>
        </Dialog>
      )}
      {selected && inspected && (
        <Dialog title={inspected.name} close={() => setSelected(null)}>
          <div className="wh-detail-art">
            <CardPicture def={inspected} presentation={presentation} />
            <CardNumbers def={inspected} presentation={presentation} />
          </div>
          <p>{inspected.text}</p>
          <blockquote>{inspected.story}</blockquote>
          {input.player.some((c) => c.uid === selected) && (
            <p className="wh-note">
              本场发动{' '}
              {result.scores.find((s) => s.uid === selected)?.triggers ?? 0} 次
              · 战斗中查看会暂停演奏。
            </p>
          )}
          {mode === 'prep' && input.player.some((c) => c.uid === selected) && (
            <div className="wh-dialog-actions">
              <button onClick={() => shift(-1)}>← 左移 / 交换</button>
              <button onClick={() => shift(1)}>右移 / 交换 →</button>
              <button
                onClick={() => {
                  setInput(
                    validateHealingInput({
                      ...input,
                      player: input.player.filter((c) => c.uid !== selected),
                    }),
                  );
                  setSelected(null);
                }}
              >
                移回行囊
              </button>
            </div>
          )}
          {notice && <output>{notice}</output>}
        </Dialog>
      )}
      {inspectedDemon && inspectedUnit && (
        <Dialog
          title={`${inspectedDemon.name} · 心魔`}
          close={() => setSelectedEnemy(null)}
        >
          <div className="wh-monster-detail">
            <DemonPicture
              kind={inspectedUnit.id}
              color={inspectedDemon.color}
              presentation={presentation}
            />
            <div>
              <p>{inspectedDemon.subtitle}</p>
              <b>
                生命 {inspectedUnit.health} · 攻击 {inspectedUnit.attack}
              </b>
            </div>
          </div>
          <div className="wh-skill-list">
            {inspectedDemon.skills.map((s) => (
              <div key={s.id}>
                <strong>
                  {s.name}
                  <small>每 {s.cooldown / 40} 秒</small>
                </strong>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <p className="wh-note">
            心魔没有卡牌和歌曲，按各自冷却行动。只治疗存活的同伴。优先目标消散后，下一次器具发动会自动选择存活心魔。
          </p>
        </Dialog>
      )}
      {panel === 'library' && (
        <Dialog title="随行的共鸣器具" close={() => setPanel(null)}>
          <div className="wh-library">
            {RHYTHM_CARDS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setPlacement(c.id);
                  setPanel(null);
                }}
              >
                <CardPicture def={c} presentation={presentation} />
                <strong>{c.name}</strong>
                <small>
                  {c.size}格 · {RHYTHM_RARITIES[c.rarity]}
                </small>
                <CardNumbers def={c} presentation={presentation} />
              </button>
            ))}
          </div>
          <p className="wh-note">
            每种最多两件。拿起器具后，点击空格放下；相邻器具可在详情里交换位置。
          </p>
        </Dialog>
      )}
      {panel === 'replay' && (
        <Dialog title="保存这一段心景" close={() => setPanel(null)}>
          <button onClick={exportReplay}>导出本场回放</button>
          <textarea
            aria-label="心魔战斗回放内容"
            placeholder="粘贴心魔战斗的回放内容"
            value={replayText}
            onChange={(e) => setReplayText(e.target.value)}
          />
          <div className="wh-dialog-actions">
            <a href={sitePath('/legacy')}>导入旧版对决 →</a>
            <button
              onClick={() =>
                attempt(() => {
                  const next = parseHealingReplay(replayText);
                  setInput(next);
                  setImported(true);
                  setMode('battle');
                  seek(0);
                  setPanel(null);
                  setRunning(false);
                })
              }
            >
              载入回放
            </button>
          </div>
          {notice && <output>{notice}</output>}
        </Dialog>
      )}
    </main>
  );
}
