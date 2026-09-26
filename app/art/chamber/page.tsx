/* oxlint-disable next/no-html-link-for-pages -- isolated art prototypes */
'use client';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  DoorOpen,
  Eye,
  Hand,
  Package,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Volume2,
  VolumeX,
  X,
  LockKeyhole,
  ShieldOff,
  Heart,
} from 'lucide-react';
import { act, openCells, previewPlacement, type Run } from '@/lib/demo-engine';
import {
  createBattleSlice,
  slicePreview,
  startSlice,
  settleSlice,
  sliceEvidence,
  sliceCard,
} from '@/lib/battle-slice';
import { simulateDuel, type Duel, type FighterCard } from '@/lib/demo-combat';
import { cardDef } from '@/lib/demo-cards';
import { describeCard } from '@/lib/card-description';
import { SETTLE_SECONDS, battleFeedback } from '@/lib/battle-slice-fx';
import { sitePath } from '@/lib/site-path';
import { advanceReplay } from '../playback';
import type { Anchor, BoardAnchors } from '../slice/scene';
import type { ChamberView, RoomPoint } from '../slice/chamber';
import './chamber.css';
const Scene = lazy(() => import('../slice/scene'));
const lanes = ['左路', '中路', '右路'];
type Phase =
  | 'explore'
  | 'build'
  | 'fight'
  | 'won'
  | 'reward'
  | 'claimed'
  | 'left';
const fresh = () => {
  const s = createBattleSlice();
  s.items = s.items.filter((x) => x.uid !== 'slice-pad');
  return s;
};

export default function ChamberPage() {
  const [run, setRun] = useState<Run>(fresh),
    [phase, setPhase] = useState<Phase>('explore');
  const [view, setView] = useState<ChamberView>('entry'),
    [opened, setOpened] = useState(false),
    [taken, setTaken] = useState(false);
  const [ready, setReady] = useState(false),
    [settled, setSettled] = useState(false),
    [points, setPoints] = useState<RoomPoint[]>([]),
    [anchors, setAnchors] = useState<Anchor[]>([]);
  const [frozen, setFrozen] = useState<Duel | null>(null),
    [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<string>(),
    [detail, setDetail] = useState<FighterCard | null>(null),
    [hover, setHover] = useState<FighterCard | null>(null);
  const [reduced, setReduced] = useState(false),
    [sound, setSound] = useState(false),
    [notice, setNotice] = useState('');
  const [materialStyle, setMaterialStyle] = useState<'tactile' | 'legacy'>(
    'tactile',
  );
  const [neutral, setNeutral] = useState(false),
    [study, setStudy] = useState<'springbow' | 'rubber'>();
  const [stats, setStats] = useState('');
  const [debug, setDebug] = useState(false);
  const [board, setBoard] = useState<BoardAnchors>({
    barriers: [],
    cores: [],
    lanes: [],
  });
  const [overAt, setOverAt] = useState<number>(),
    [dragPoint, setDragPoint] = useState<{ x: number; y: number }>(),
    [placed, setPlaced] = useState<string>();
  const onBoard = useCallback((value: BoardAnchors) => setBoard(value), []);
  const onStats = useCallback((value: string) => setStats(value), []);
  const clock = useRef(0),
    resume = useRef(false),
    audio = useRef<AudioContext | null>(null),
    gain = useRef<GainNode | null>(null),
    lastHit = useRef(-1);
  const drag = useRef<string | null>(null);
  const pointerDrag = useRef<{
      uid: string;
      x: number;
      y: number;
      moved: boolean;
    } | null>(null),
    suppressClick = useRef(false);
  const duel = useMemo(() => frozen ?? slicePreview(run), [frozen, run]);
  const result = useMemo(() => simulateDuel(duel), [duel]);
  const frame = result.frames[cursor] ?? result.frames[0];
  const evidence = useMemo(() => sliceEvidence(result.frames), [result]);
  const feedback = useMemo(() => battleFeedback(result.frames), [result]);
  const recentFeedback = [
    ...feedback
      .filter((f) => f.time <= frame.time && frame.time - f.time < 1.5)
      .reduce((groups, f) => {
        const key = `${f.side}/${f.lane}`,
          previous = groups.get(key);
        groups.set(
          key,
          previous
            ? {
                ...f,
                absorbed: previous.absorbed + f.absorbed,
                core: previous.core + f.core,
                blocked: previous.blocked + f.blocked,
                repair: previous.repair + f.repair,
                broken: previous.broken || f.broken,
                sources: [...new Set([...previous.sources, ...f.sources])],
              }
            : f,
        );
        return groups;
      }, new Map<string, (typeof feedback)[number]>())
      .values(),
  ];
  const fired = new Set(
    result.frames
      .filter((f) => f.time <= frame.time && frame.time - f.time < 0.5)
      .flatMap((f) => f.fired),
  );
  const bag = run.items.filter((x) => x.type === 'card' && x.zone === 'bag');
  const reward = run.loot?.source === 'battle' ? run.loot.item : null;
  const inspecting = detail ?? hover,
    atTable = view === 'table',
    finished = phase === 'claimed' || phase === 'left';
  const selectedItem = run.items.find((x) => x.uid === selected);
  const placement = useMemo(
    () =>
      selected && overAt !== undefined
        ? previewPlacement(run, selected, overAt)
        : null,
    [run, selected, overAt],
  );
  const focusLane =
    overAt !== undefined && selected
      ? Math.floor(overAt / 3)
      : inspecting
        ? Math.floor(inspecting.at / 3)
        : undefined;
  const onAnchors = useCallback((a: Anchor[]) => setAnchors(a), []),
    onReady = useCallback(() => setReady(true), []);
  const onPoints = useCallback((a: RoomPoint[], done: boolean) => {
    setPoints(a);
    setSettled(done);
  }, []);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches);
      setDebug(new URLSearchParams(location.search).has('debug'));
    });
    return () => {
      cancelAnimationFrame(id);
      void audio.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!placed) return;
    const timeout = setTimeout(() => setPlaced(undefined), 700);
    return () => clearTimeout(timeout);
  }, [placed]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (!playing) return;
    let id = 0,
      last = performance.now();
    const tick = (now: number) => {
      clock.current = advanceReplay(
        clock.current,
        now - last,
        speed,
        result.duration + SETTLE_SECONDS,
      );
      last = now;
      setCursor(
        Math.min(
          result.frames.length - 1,
          Math.floor((clock.current + 1e-8) * 4),
        ),
      );
      if (clock.current < result.duration + SETTLE_SECONDS)
        id = requestAnimationFrame(tick);
      else {
        setPlaying(false);
        setPhase('won');
      }
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, speed, result]);
  useEffect(() => {
    if (
      !sound ||
      !audio.current ||
      phase !== 'fight' ||
      !playing ||
      frame.time === lastHit.current ||
      !frame.hits.length
    )
      return;
    lastHit.current = frame.time;
    const ctx = audio.current,
      osc = ctx.createOscillator(),
      g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(
      frame.hits.some((h) => h.healthLoss) ? 66 : 190,
      ctx.currentTime,
    );
    osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.16);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.19);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }, [sound, phase, playing, frame]);
  useEffect(() => {
    const movePointer = (e: PointerEvent) => {
      const d = pointerDrag.current;
      if (!d || phase !== 'build') return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7) {
        d.moved = true;
        drag.current = d.uid;
        setSelected(d.uid);
        setHover(null);
        setDetail(null);
        setDragPoint({ x: e.clientX, y: e.clientY });
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>('[data-ch-at]');
        setOverAt(target ? Number(target.dataset.chAt) : undefined);
      }
    };
    const endPointer = (e: PointerEvent) => {
      const d = pointerDrag.current;
      pointerDrag.current = null;
      drag.current = null;
      setDragPoint(undefined);
      setOverAt(undefined);
      if (!d?.moved) return;
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 200);
      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-ch-at]');
      try {
        if (target) {
          setRun(
            act(run, {
              type: 'place',
              id: d.uid,
              at: Number(target.dataset.chAt),
            }),
          );
          setPlaced(d.uid);
        }
        setNotice(target ? '装备已就位' : '已取消放置');
      } catch (error) {
        setNotice((error as Error).message);
      }
      setSelected(undefined);
      setHover(null);
      setDragPoint(undefined);
      setOverAt(undefined);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancel();
        if (detail) {
          setDetail(null);
          if (resume.current && phase === 'fight') setPlaying(true);
        }
      }
    };
    const cancel = () => {
      pointerDrag.current = null;
      drag.current = null;
      setSelected(undefined);
      setHover(null);
    };
    window.addEventListener('pointermove', movePointer);
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointermove', movePointer);
      window.removeEventListener('pointerup', endPointer);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', escape);
    };
  }, [phase, run, detail]);
  function move(next: ChamberView) {
    setView(next);
    setSettled(false);
    setSelected(undefined);
    setHover(null);
    setDetail(null);
    setNotice('');
  }
  function toggleSound() {
    if (!audio.current) {
      const ctx = new AudioContext();
      audio.current = ctx;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(ctx.destination);
      gain.current = g;
      for (const hz of [49, 50.2, 99]) {
        const o = ctx.createOscillator();
        o.frequency.value = hz;
        o.type = 'sine';
        o.connect(g);
        o.start();
      }
    }
    void audio.current.resume();
    gain.current!.gain.setTargetAtTime(
      sound ? 0 : 0.018,
      audio.current.currentTime,
      0.4,
    );
    setSound(!sound);
  }
  function take() {
    if (taken) return;
    const pad = createBattleSlice().items.find((x) => x.uid === 'slice-pad')!;
    setRun((s) =>
      s.items.some((x) => x.uid === pad.uid)
        ? s
        : { ...s, items: [...s.items, pad] },
    );
    setTaken(true);
    setNotice('皮质缓冲垫已收好。');
  }
  function sit() {
    move('table');
    if (phase === 'explore') setPhase('build');
  }
  function place(at: number) {
    if (!selected || phase !== 'build') return;
    try {
      setRun(act(run, { type: 'place', id: selected, at }));
      setPlaced(selected);
      setSelected(undefined);
      setOverAt(undefined);
      setHover(null);
      setNotice('装备已就位');
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function begin() {
    try {
      const s = startSlice(run);
      setRun(s);
      setFrozen(s.duel!);
      clock.current = 0;
      setCursor(0);
      setSelected(undefined);
      setDetail(null);
      setHover(null);
      setPhase('fight');
      setNotice('');
      setPlaying(true);
      lastHit.current = -1;
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function reveal() {
    try {
      setRun(act(settleSlice(run), { type: 'reveal-loot' }));
      setPhase('reward');
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function claim() {
    try {
      setRun(act(run, { type: 'claim-loot' }));
      setPhase('claimed');
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function inspect(card: FighterCard) {
    resume.current = playing;
    setPlaying(false);
    setDetail(card);
    setHover(null);
  }
  function closeDetail() {
    setDetail(null);
    if (resume.current && phase === 'fight') setPlaying(true);
  }
  function reset() {
    setStudy(undefined);
    setRun(fresh());
    setFrozen(null);
    setPhase('explore');
    setOpened(false);
    setTaken(false);
    setCursor(0);
    clock.current = 0;
    setPlaying(false);
    move('entry');
  }
  function pick(id: string) {
    if (id === 'cabinet') move('cabinet');
    else if (id === 'table') sit();
    else if (id === 'open') setOpened(true);
    else if (id === 'take') take();
    else if (id === 'leave' && finished) setPhase('left');
  }
  const pointName = (id: string) =>
    ({
      cabinet: '检查保管柜',
      table: '坐到桌前',
      open: '打开柜门',
      take: taken ? '柜子已经空了' : '拿取皮质缓冲垫',
      leave: finished ? '离开值守室' : '门还锁着',
    })[id] ?? id;
  function cardButton(c: FighterCard, side: number) {
    const a = anchors[side * 9 + c.at],
      end = anchors[side * 9 + c.at + cardDef(c.id).size - 1];
    if (!a || !end) return null;
    return (
      <button
        key={c.uid}
        className={`ch-card ${side ? 'enemy' : 'own'} ${selected === c.uid ? 'selected' : ''} ${placed === c.uid ? 'just-placed' : ''} ${fired.has(c.uid) && phase === 'fight' ? 'fired' : ''} ${phase === 'fight' && (frame.cd[side][c.at] || cardDef(c.id).cd) - (frame.timers[side][c.at] ?? 0) < 1 ? 'soon' : ''}`}
        style={{ left: a.x, top: a.y, width: end.x + end.w - a.x, height: a.h }}
        data-ch-at={side === 0 ? c.at : undefined}
        onPointerDown={(e) => {
          if (phase === 'build' && side === 0 && e.button === 0)
            pointerDrag.current = {
              uid: c.uid,
              x: e.clientX,
              y: e.clientY,
              moved: false,
            };
        }}
        aria-label={`${side ? '敌方' : '我方'}${lanes[Math.floor(c.at / 3)]} ${cardDef(c.id).name}`}
        onMouseEnter={() => {
          setOverAt(side === 0 ? c.at : undefined);
          if (!selected && !drag.current) setHover(c);
        }}
        onMouseLeave={() => {
          setHover(null);
          if (!drag.current) setOverAt(undefined);
        }}
        onFocus={() => {
          if (side === 0) setOverAt(c.at);
          if (!selected) setHover(c);
        }}
        onBlur={() => setHover(null)}
        onClick={() => {
          if (suppressClick.current) return;
          if (phase === 'build' && side === 0) {
            if (selected && selected !== c.uid) place(c.at);
            else {
              setSelected(c.uid === selected ? undefined : c.uid);
              setHover(null);
            }
          } else inspect(c);
        }}
        onDragOver={(e) => {
          if (phase === 'build' && side === 0) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          place(c.at);
          drag.current = null;
        }}
        draggable={false}
        onDragStart={(e) => {
          drag.current = c.uid;
          setSelected(c.uid);
          setHover(null);
          e.dataTransfer.setData('text/plain', c.uid);
        }}
        onDragEnd={() => {
          drag.current = null;
          setSelected(undefined);
        }}
      >
        <span className="ch-card-name">{cardDef(c.id).name}</span>
        {phase === 'fight' && (
          <i className="ch-cooldown">
            <b
              style={{
                width: `${Math.min(100, ((frame.timers[side][c.at] ?? 0) / (frame.cd[side][c.at] || cardDef(c.id).cd)) * 100)}%`,
              }}
            />
          </i>
        )}
        {phase === 'fight' && (
          <small className="ch-cycle">
            {fired.has(c.uid)
              ? '发动'
              : frame.waiting.includes(c.uid)
                ? '等待能量'
                : `${Math.max(0, (frame.cd[side][c.at] || cardDef(c.id).cd) - (frame.timers[side][c.at] ?? 0)).toFixed(1)}s`}
          </small>
        )}
      </button>
    );
  }
  return (
    <main
      className={`chamber phase-${phase} view-${view} ${study ? 'is-study' : ''} ${inspecting && !selected ? 'has-inspect' : ''} ${dragPoint ? 'is-dragging' : ''} ${reduced ? 'reduced' : ''}`}
    >
      <div className="ch-scene">
        <Suspense
          fallback={<div className="ch-loading">值守室的灯正在亮起…</div>}
        >
          <Scene
            duel={duel}
            frame={frame}
            frames={result.frames}
            clock={clock}
            selected={selected}
            focusLane={focusLane}
            placed={placed}
            reduced={reduced}
            chamber={{ view, opened, taken, cleared: finished, neutral, study }}
            materialStyle={materialStyle}
            onStats={onStats}
            onRoomPoints={onPoints}
            onAnchors={onAnchors}
            onBoardAnchors={onBoard}
            onReady={onReady}
            reward={phase === 'reward' ? 'springbow' : undefined}
          />
        </Suspense>
      </div>
      <div className="ch-vignette" />
      <div className="ch-grain" />
      <header className="ch-header">
        <a href={sitePath('/art/rooms')} aria-label="返回箱庭 demo">
          F9 <span>异层档案</span>
        </a>
        <div>
          {debug && (
            <details className="ch-quality">
              <summary>材质对照</summary>
              <div className="ch-quality-panel">
                <p>同机位查看材质与光照</p>
                <div className="ch-quality-options">
                  <button
                    aria-pressed={materialStyle === 'tactile'}
                    disabled={phase === 'fight'}
                    onClick={() => setMaterialStyle('tactile')}
                  >
                    新版材质
                  </button>
                  <button
                    aria-pressed={materialStyle === 'legacy'}
                    disabled={phase === 'fight'}
                    onClick={() => setMaterialStyle('legacy')}
                  >
                    原版材质
                  </button>
                  <button
                    aria-pressed={!neutral}
                    onClick={() => setNeutral(false)}
                  >
                    房间灯光
                  </button>
                  <button
                    aria-pressed={neutral}
                    onClick={() => setNeutral(true)}
                  >
                    中性灯光
                  </button>
                </div>
                <p>近看物件</p>
                <div className="ch-quality-options">
                  <button
                    disabled={phase === 'fight' || phase === 'reward'}
                    aria-pressed={study === 'springbow'}
                    onClick={() => setStudy('springbow')}
                  >
                    卷簧弩
                  </button>
                  <button
                    disabled={phase === 'fight' || phase === 'reward'}
                    aria-pressed={study === 'rubber'}
                    onClick={() => setStudy('rubber')}
                  >
                    缓冲垫
                  </button>
                  <button onClick={() => setStudy(undefined)}>返回房间</button>
                </div>
                <small>{stats}</small>
              </div>
            </details>
          )}
          <button
            onClick={toggleSound}
            aria-label={sound ? '关闭声音' : '开启声音'}
          >
            {sound ? <Volume2 /> : <VolumeX />}
          </button>
          <label>
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => setReduced(e.target.checked)}
            />
            减少动态
          </label>
        </div>
      </header>
      {!ready && <div className="ch-loading">门后，有人留下了灯。</div>}
      {ready && !atTable && !study && phase !== 'left' && (
        <>
          <div className="ch-location">
            <small>第一层 / 旧楼</small>
            <h1>
              {view === 'cabinet'
                ? '保管柜'
                : view === 'exit'
                  ? '归途'
                  : '无人值守室'}
            </h1>
            <p>
              {view === 'cabinet'
                ? opened
                  ? taken
                    ? '木板上，只剩一个空印。'
                    : '旧皮垫静静地躺在隔板上。'
                  : '锁早就坏了。'
                : view === 'exit'
                  ? finished
                    ? '外面的电梯还在等你。'
                    : '门后的锁扣还没有松开。'
                  : finished
                    ? '桌子那头终于安静了。'
                    : '灯下的桌子，已经摆好了。'}
            </p>
          </div>
          {settled &&
            points
              .filter((p) => !(p.id === 'take' && taken))
              .map((p) => (
                <button
                  key={p.id}
                  className="ch-hotspot"
                  style={{ left: p.x, top: p.y }}
                  onClick={() => pick(p.id)}
                  disabled={p.id === 'leave' && !finished}
                  aria-label={pointName(p.id)}
                >
                  <span>
                    {p.id === 'table' ? (
                      <Eye />
                    ) : p.id === 'leave' ? (
                      <DoorOpen />
                    ) : (
                      <Hand />
                    )}
                  </span>
                  <b>{pointName(p.id)}</b>
                </button>
              ))}
          {view === 'cabinet' && opened && !taken && settled && (
            <aside className="ch-found">
              <small>遗留物 / 稀有</small>
              <h2>皮质缓冲垫</h2>
              <p>放上装备台，可以保护它所在的路线。</p>
              <button className="ch-primary" onClick={take}>
                收进行囊 <Package />
              </button>
            </aside>
          )}
          <nav className="ch-explore-nav">
            {view !== 'entry' && (
              <button onClick={() => move('entry')}>
                <ArrowLeft />
                退回房间
              </button>
            )}
            {view === 'entry' && finished && (
              <button className="ch-primary" onClick={() => move('exit')}>
                走向出口
                <DoorOpen />
              </button>
            )}
            {view === 'cabinet' && taken && (
              <button onClick={sit}>
                走向装备台
                <ArrowRight />
              </button>
            )}
          </nav>
        </>
      )}
      {atTable && ready && settled && !study && phase !== 'left' && (
        <>
          {phase !== 'reward' && (
            <div className="ch-board-overlays">
              {[0, 1].map(
                (side) =>
                  board.cores[side] && (
                    <div
                      key={side}
                      className={`ch-host ${side ? 'enemy' : 'own'} ${frame.hp[side] / duel.maxHp[side] < 0.3 ? 'critical' : ''}`}
                      style={{
                        left: board.cores[side].x,
                        top: board.cores[side].y + (side ? -54 : 18),
                      }}
                    >
                      <span>
                        <Heart size={13} />
                        {side ? '蜷卧者' : '你的投影'}
                      </span>
                      <b>
                        {frame.hp[side]} <small>/ {duel.maxHp[side]}</small>
                      </b>
                      <i className="ch-health-track">
                        <i
                          style={{
                            width: `${(100 * frame.hp[side]) / duel.maxHp[side]}%`,
                          }}
                        />
                      </i>
                    </div>
                  ),
              )}
              {board.lanes.map((a, lane) => (
                <div
                  key={lane}
                  className={`ch-lane-name ${focusLane === lane ? 'active' : ''}`}
                  style={{
                    left: a.x,
                    top: a.y,
                    visibility:
                      phase === 'fight' &&
                      recentFeedback.some((f) => f.lane === lane)
                        ? 'hidden'
                        : 'visible',
                  }}
                >
                  <small>0{lane + 1}</small>
                  {lanes[lane]}
                  {frame.barriers[1][lane].broken && <b>敌方暴露</b>}
                  {frame.barriers[0][lane].broken && (
                    <b className="danger">我方失守</b>
                  )}
                </div>
              ))}
              {[0, 1].flatMap((side) =>
                [0, 1, 2].map((lane) => {
                  const a = board.barriers[side * 3 + lane],
                    b = frame.barriers[side][lane];
                  if (!a) return null;
                  return (
                    <div
                      key={`${side}-${lane}`}
                      className={`ch-barrier ${side ? 'enemy' : 'own'} ${b.broken ? 'broken' : b.hp < b.maxHp ? 'damaged' : ''} ${focusLane === lane ? 'active' : ''}`}
                      aria-label={`${side ? '敌方' : '我方'}${lanes[lane]}屏障 ${b.broken ? '已击破' : `${b.hp}/${b.maxHp}`}`}
                      style={{
                        left: a.x,
                        top: a.y + (side ? -5 : 8),
                      }}
                    >
                      {b.broken ? (
                        <ShieldOff size={13} />
                      ) : (
                        <Shield size={13} />
                      )}
                      <b>{b.broken ? '已击破' : b.hp}</b>
                      {!b.broken && <small>/{b.maxHp}</small>}
                      <i style={{ width: `${(100 * b.hp) / b.maxHp}%` }} />
                    </div>
                  );
                }),
              )}
              {phase === 'build' &&
                anchors.slice(0, 9).map((a, at) => {
                  if (
                    duel.player.some(
                      (c) => c.at <= at && at < c.at + cardDef(c.id).size,
                    )
                  )
                    return null;
                  const locked = !openCells(run).includes(at),
                    valid =
                      selected && previewPlacement(run, selected, at).allowed;
                  return (
                    <button
                      key={at}
                      className={`ch-slot ${valid ? 'valid' : ''}`}
                      disabled={locked}
                      data-ch-at={at}
                      onMouseEnter={() => setOverAt(at)}
                      onFocus={() => setOverAt(at)}
                      onBlur={() => {
                        if (!drag.current) setOverAt(undefined);
                      }}
                      onMouseLeave={() => {
                        if (!drag.current) setOverAt(undefined);
                      }}
                      aria-label={`${lanes[Math.floor(at / 3)]}第${(at % 3) + 1}格${locked ? ' 已锁定' : ''}`}
                      style={{ left: a.x, top: a.y, width: a.w, height: a.h }}
                      onClick={() => place(at)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        place(at);
                        drag.current = null;
                      }}
                    >
                      {locked ? <LockKeyhole size={12} /> : '＋'}
                    </button>
                  );
                })}
              {duel.player.map((c) => cardButton(c, 0))}
              {duel.enemy.map((c) => cardButton(c, 1))}
              {selectedItem &&
                overAt !== undefined &&
                (() => {
                  const a = anchors[overAt];
                  const end =
                    anchors[
                      Math.min(
                        overAt + cardDef(selectedItem.id).size - 1,
                        Math.floor(overAt / 3) * 3 + 2,
                      )
                    ];
                  if (!a || !end) return null;
                  return (
                    <div
                      className={`ch-placement ${placement?.allowed ? 'valid' : 'invalid'}`}
                      style={{
                        left: a.x,
                        top: a.y,
                        width: end.x + end.w - a.x,
                        height: a.h,
                      }}
                    >
                      <span>
                        {placement?.allowed
                          ? `${cardDef(selectedItem.id).size} 格 · ${dragPoint ? '松手放置' : '点击放置'}`
                          : placement?.reason}
                      </span>
                    </div>
                  );
                })()}
              {phase === 'fight' &&
                recentFeedback.map((f) => {
                  const a = board.lanes[f.lane];
                  if (!a) return null;
                  return (
                    <div
                      key={f.key}
                      className={`ch-impact-label ${f.side ? 'enemy' : 'own'} ${f.core ? 'core' : ''}`}
                      title={f.sources.join('、')}
                      style={{
                        left: a.x,
                        top:
                          a.y +
                          (recentFeedback.filter(
                            (value) => value.lane === f.lane,
                          ).length > 1
                            ? f.side
                              ? -25
                              : 25
                            : 0),
                        opacity: Math.min(1, (1.5 - (frame.time - f.time)) * 2),
                      }}
                    >
                      {f.broken && (
                        <strong>{f.side ? '敌方' : '我方'}破路</strong>
                      )}
                      <span>
                        {!f.broken && `${f.side ? '敌方' : '我方'} · `}
                        {f.absorbed > 0 && `屏障 −${f.absorbed}`}
                        {f.core > 0 && `  核心 −${f.core}`}
                      </span>
                      {(f.blocked > 0 || f.repair > 0) && (
                        <small>
                          {f.blocked > 0 && `减伤 ${f.blocked}`}
                          {f.blocked > 0 && f.repair > 0 && ' · '}
                          {f.repair > 0 && `修复 +${f.repair}`}
                        </small>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
          <section className="ch-table-panel">
            {phase === 'build' && (
              <>
                <div className="ch-panel-title">
                  <small>
                    布阵 <span> / 敌方主攻中路</span>
                  </small>
                  <button onClick={() => move('entry')}>
                    <ArrowLeft />
                    起身
                  </button>
                </div>
                <div className="ch-build-row">
                  <div>
                    <div className="ch-reserves">
                      {bag.map((item) => (
                        <button
                          key={item.uid}
                          draggable={false}
                          onPointerDown={(e) => {
                            if (e.button === 0)
                              pointerDrag.current = {
                                uid: item.uid,
                                x: e.clientX,
                                y: e.clientY,
                                moved: false,
                              };
                          }}
                          onDragStart={(e) => {
                            drag.current = item.uid;
                            setSelected(item.uid);
                            setHover(null);
                            e.dataTransfer.setData('text/plain', item.uid);
                          }}
                          onDragEnd={() => {
                            drag.current = null;
                            setSelected(undefined);
                          }}
                          className={selected === item.uid ? 'selected' : ''}
                          onClick={() => {
                            if (suppressClick.current) return;
                            setSelected(
                              selected === item.uid ? undefined : item.uid,
                            );
                            setHover(null);
                          }}
                        >
                          <Shield />
                          {cardDef(item.id).name}
                          <small>
                            {selected === item.uid
                              ? '点击桌面落点'
                              : '拖到桌面 / 点击选择'}
                          </small>
                        </button>
                      ))}
                      {bag.length === 0 && (
                        <small>
                          {taken ? '装备已上阵' : '保管柜里似乎还留着东西。'}
                        </small>
                      )}
                    </div>
                  </div>
                  <button className="ch-primary" onClick={begin}>
                    开始战斗 <ArrowRight />
                  </button>
                </div>
                {selected && (
                  <div className="ch-selection">
                    <button onClick={() => setSelected(undefined)}>
                      取消选择 · Esc
                    </button>
                    {run.items.find((x) => x.uid === selected)?.zone ===
                      'board' && (
                      <button
                        onClick={() => {
                          try {
                            setRun(act(run, { type: 'unequip', id: selected }));
                            setSelected(undefined);
                          } catch (e) {
                            setNotice((e as Error).message);
                          }
                        }}
                      >
                        收回行囊
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {phase === 'fight' && (
              <div className="ch-fight-controls">
                <span>
                  {frame.time.toFixed(2)} <small>秒</small>
                </span>
                <button
                  disabled={!!detail}
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause /> : <Play />}
                  {playing ? '暂停' : '继续'}
                </button>
                <button onClick={() => setSpeed(speed === 1 ? 2 : 1)}>
                  {speed}×
                </button>
                {!playing && !detail && (
                  <button
                    onClick={() => {
                      clock.current = Math.min(
                        result.duration,
                        clock.current + 0.25,
                      );
                      setCursor(
                        Math.min(
                          result.frames.length - 1,
                          Math.floor((clock.current + 1e-8) * 4),
                        ),
                      );
                    }}
                  >
                    前进 0.25s
                  </button>
                )}
                <small>{playing ? '自动交战中' : '战斗已暂停'}</small>
              </div>
            )}
            {phase === 'won' && (
              <>
                <small>封锁解除</small>
                <h2>{result.winner === 0 ? '胜利' : '遭遇结束'}</h2>
                <p>
                  投影损伤 {evidence.ownLoss} · 蜷卧者损伤 {evidence.enemyLoss}
                  {evidence.reduced > 0 && ` · 缓冲垫减伤 ${evidence.reduced}`}
                </p>
                <div className="ch-panel-actions">
                  {result.winner === 0 && (
                    <button className="ch-primary" onClick={reveal}>
                      拿起战利品
                      <Hand />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      clock.current = 0;
                      setCursor(0);
                      setPhase('fight');
                      setPlaying(true);
                    }}
                  >
                    重播
                  </button>
                </div>
              </>
            )}
            {phase === 'reward' && reward && (
              <>
                <small>从敌方装备中取得</small>
                <h2>{cardDef(reward.id).name}</h2>
                <p>{describeCard(sliceCard(reward)).summary}</p>
                <button className="ch-primary" onClick={claim}>
                  收进行囊
                  <Package />
                </button>
              </>
            )}
            {phase === 'claimed' && (
              <>
                <small>战利品已收好</small>
                <h2>该离开了。</h2>
                <button className="ch-primary" onClick={() => move('entry')}>
                  起身，回到房间
                  <ArrowRight />
                </button>
              </>
            )}
          </section>
          {inspecting && !selected && !dragPoint && phase !== 'reward' && (
            <aside
              className="ch-detail"
              role={detail ? 'dialog' : undefined}
              aria-label="装备详情"
            >
              <div className="ch-detail-head">
                <small>
                  {cardDef(inspecting.id).size}格 ·{' '}
                  {cardDef(inspecting.id).kind === 'shield'
                    ? '屏障支援'
                    : describeCard(inspecting).hitType === 'instant'
                      ? '即时命中'
                      : '弹道命中'}
                </small>
                {detail && (
                  <button onClick={closeDetail} aria-label="关闭详情">
                    <X />
                  </button>
                )}
                <h2>{cardDef(inspecting.id).name}</h2>
              </div>
              <div className="ch-detail-abilities">
                {describeCard(inspecting).abilities.map((a, i) => (
                  <p key={i}>
                    <b>{a.when}</b>
                    <br />
                    {a.text}
                  </p>
                ))}
              </div>
              {detail && phase === 'fight' && (
                <small>查看中 · 战斗已暂停</small>
              )}
            </aside>
          )}
        </>
      )}
      {dragPoint && selectedItem && (
        <div
          className="ch-drag-ghost"
          style={{ left: dragPoint.x + 18, top: dragPoint.y - 24 }}
        >
          <b>{cardDef(selectedItem.id).name}</b>
          <span>
            {Array.from({ length: cardDef(selectedItem.id).size }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </div>
      )}
      {notice && phase !== 'left' && (
        <output className="ch-notice">{notice}</output>
      )}
      {study && (
        <div className="ch-study-caption">
          <small>物件近景 / {neutral ? '中性灯光' : '房间灯光'}</small>
          <h2>{study === 'springbow' ? '卷簧弩' : '皮质缓冲垫'}</h2>
          <button onClick={() => setStudy(undefined)}>
            返回房间 <ArrowRight />
          </button>
        </div>
      )}
      <footer className="ch-footer">
        <span>THE NIGHT WATCH / 01</span>
        <span>{atTable ? '装备台' : '点击物件靠近'}</span>
        <button onClick={reset} aria-label="重新体验">
          <RotateCcw size={13} />
        </button>
      </footer>
      {phase === 'left' && (
        <div className="ch-end">
          <small>BACK TO THE ELEVATOR</small>
          <h1>门在身后合上。</h1>
          <p>你带走了卷簧弩。房间里，只剩下灯的嗡鸣。</p>
          <button className="ch-primary" onClick={reset}>
            重新进入
            <ArrowRight />
          </button>
          <a href={sitePath('/art/rooms')}>返回箱庭 demo</a>
          <small>独立切片 · 不读写冒险存档</small>
        </div>
      )}
    </main>
  );
}
