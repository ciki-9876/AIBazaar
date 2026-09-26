/* oxlint-disable next/no-html-link-for-pages -- Local art slice uses document navigation. */
'use client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
  useCallback,
} from 'react';
import {
  ArrowRight,
  Crosshair,
  Shield,
  Swords,
  Play,
  Pause,
  RotateCcw,
  Package,
  Volume2,
  VolumeX,
  X,
  Check,
  Lock,
  Eye,
  Move,
  Sparkles,
} from 'lucide-react';
import { act, openCells, previewPlacement } from '@/lib/demo-engine';
import type { Run } from '@/lib/demo-engine';
import {
  createBattleSlice,
  startSlice,
  settleSlice,
  slicePreview,
  sliceCard,
  sliceEvidence,
} from '@/lib/battle-slice';
import { simulateDuel, type Duel, type FighterCard } from '@/lib/demo-combat';
import { cardDef, cardFamily } from '@/lib/demo-cards';
import { describeCard } from '@/lib/card-description';
import { sitePath } from '@/lib/site-path';
import { advanceReplay } from '../playback';
import { SETTLE_SECONDS } from '@/lib/battle-slice-fx';
import type { Anchor, BoardAnchors } from './scene';
import './slice.css';
const BattleScene = lazy(() => import('./scene'));
type Step = 'preview' | 'build' | 'combat' | 'victory' | 'reward' | 'done';
const lanes = ['左路', '中路', '右路'];
const short: Record<string, string> = {
  slingshot: '弹弓',
  gapblade: '猎隙刃',
  rubber: '缓冲垫',
  springbow: '卷簧弩',
  sealant: '补漏胶',
};

export default function BattleSlicePage() {
  return <BattleSlice />;
}

export function BattleSlice({
  initialRun,
  onReturn,
  onLeave,
}: {
  initialRun?: Run;
  onReturn?: (run: Run) => void;
  onLeave?: () => void;
} = {}) {
  const drag = useRef<{
      uid: string;
      x: number;
      y: number;
      moved: boolean;
    } | null>(null),
    suppressClick = useRef(false);
  const [run, setRun] = useState(() =>
      initialRun ? structuredClone(initialRun) : createBattleSlice(),
    ),
    [step, setStep] = useState<Step>('preview');
  const [frozen, setFrozen] = useState<Duel | null>(null),
    [selected, setSelected] = useState<string>(),
    [hover, setHover] = useState<FighterCard | null>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]),
    [ready, setReady] = useState(false),
    [intel, setIntel] = useState(false);
  const [boardAnchors, setBoardAnchors] = useState<BoardAnchors>({
    barriers: [],
    cores: [],
    lanes: [],
  });
  const onBoardAnchors = useCallback(
    (value: BoardAnchors) => setBoardAnchors(value),
    [],
  );
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [reduced, setReduced] = useState(false),
    [sound, setSound] = useState(false);
  const [notice, setNotice] = useState(''),
    [dropAt, setDropAt] = useState<number | null>(null),
    [detail, setDetail] = useState<FighterCard | null>(null);
  const clock = useRef(0),
    resume = useRef(false),
    audio = useRef<AudioContext | null>(null),
    lastAudio = useRef(-1);
  const duel = useMemo(() => frozen ?? slicePreview(run), [frozen, run]);
  const result = useMemo(() => simulateDuel(duel), [duel]);
  const frame = result.frames[cursor] ?? result.frames[0];
  const evidence = useMemo(() => sliceEvidence(result.frames), [result]);
  const events = useMemo(
    () =>
      result.frames.flatMap((f) =>
        f.hits.map((hit, i) => ({ hit, time: f.time, key: `${f.time}-${i}` })),
      ),
    [result],
  );
  const available = openCells(run);
  const bag = run.items.filter((x) => x.type === 'card' && x.zone === 'bag');
  const reward = run.loot?.source === 'battle' ? run.loot.item : null;
  const inspecting = detail ?? hover;
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || step !== 'build') return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7) d.moved = true;
      if (d.moved) {
        setSelected(d.uid);
        setHover(null);
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>('[data-slice-at]');
        setDropAt(target ? Number(target.dataset.sliceAt) : null);
      }
    };
    const up = (e: PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d?.moved) return;
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 200);
      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-slice-at]');
      try {
        if (target)
          setRun(
            act(run, {
              type: 'place',
              id: d.uid,
              at: Number(target.dataset.sliceAt),
            }),
          );
        setNotice(target ? '装备已就位' : '已取消放置');
      } catch (error) {
        setNotice((error as Error).message);
      }
      setSelected(undefined);
      setDropAt(null);
      setHover(null);
    };
    const cancel = () => {
      drag.current = null;
      setSelected(undefined);
      setDropAt(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [run, step]);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches),
    );
    return () => {
      cancelAnimationFrame(id);
      void audio.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now(),
      id = 0;
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
        setStep('victory');
      }
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, speed, result]);
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drag.current = null;
        setSelected(undefined);
        setDropAt(null);
        setHover(null);
      }
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, []);
  useEffect(() => {
    if (!sound || !playing || cursor === lastAudio.current) return;
    lastAudio.current = cursor;
    if (!frame.hits.length && !frame.fired.length) return;
    const ctx = audio.current;
    if (!ctx || ctx.state !== 'running') return;
    const impact = frame.hits.some((h) => h.kind === 'damage' && h.value > 0);
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = impact ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(impact ? 140 : 420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      impact ? 38 : 150,
      ctx.currentTime + 0.16,
    );
    gain.gain.setValueAtTime(impact ? 0.055 : 0.022, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.23);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }, [cursor, sound, playing, frame]);
  const onAnchors = useCallback((a: Anchor[]) => setAnchors(a), []),
    onReady = useCallback(() => setReady(true), []);
  function place(at: number) {
    if (step !== 'build' || !selected) return;
    try {
      setRun(act(run, { type: 'place', id: selected, at }));
      setSelected(undefined);
      setDropAt(null);
      setHover(null);
      setNotice('装备已就位');
    } catch (e) {
      setNotice((e as Error).message);
      setDropAt(null);
    }
  }
  function begin() {
    try {
      const next = startSlice(run);
      setRun(next);
      setFrozen(next.duel);
      clock.current = 0;
      setCursor(0);
      setHover(null);
      setSelected(undefined);
      setStep('combat');
      setPlaying(true);
      lastAudio.current = -1;
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function reset() {
    setRun(initialRun ? structuredClone(initialRun) : createBattleSlice());
    setFrozen(null);
    clock.current = 0;
    setCursor(0);
    setPlaying(false);
    setStep('preview');
    setIntel(false);
    setSelected(undefined);
    setDetail(null);
    setNotice('');
  }
  function showDetail(card: FighterCard) {
    resume.current = playing;
    setPlaying(false);
    setDetail(card);
    setHover(null);
  }
  function closeDetail() {
    setDetail(null);
    if (resume.current && step === 'combat') setPlaying(true);
  }
  function reveal() {
    try {
      setRun(act(settleSlice(run), { type: 'reveal-loot' }));
      setStep('reward');
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function claim() {
    try {
      setRun(act(run, { type: 'claim-loot' }));
      setStep('done');
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  const showBoard = !['reward', 'done'].includes(step);
  function cardButton(card: FighterCard, side: number) {
    const a = anchors[side * 9 + card.at];
    if (!a) return null;
    const def = cardDef(card.id),
      last = anchors[side * 9 + card.at + def.size - 1];
    const progress = Math.min(
      100,
      ((frame.timers[side][card.at] ?? 0) /
        (frame.cd[side][card.at] || def.cd)) *
        100,
    );
    return (
      <button
        key={card.uid}
        className={`slice-object side-${side} ${selected === card.uid ? 'selected' : ''}`}
        style={{
          left: a.x,
          top: a.y,
          width: last.x + last.w - a.x,
          height: a.h,
        }}
        aria-label={`${side ? '敌方' : '我方'}${lanes[Math.floor(card.at / 3)]} ${def.name}`}
        data-slice-at={side === 0 ? card.at : undefined}
        onPointerDown={(e) => {
          if (step === 'build' && side === 0 && e.button === 0)
            drag.current = {
              uid: card.uid,
              x: e.clientX,
              y: e.clientY,
              moved: false,
            };
        }}
        draggable={false}
        onDragStart={(e) => {
          setSelected(card.uid);
          setHover(null);
          e.dataTransfer.setData('text/plain', card.uid);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          setDropAt(null);
          setHover(null);
        }}
        onMouseEnter={() => {
          if (!selected && !detail) setHover(card);
        }}
        onMouseLeave={() => setHover(null)}
        onFocus={() => {
          if (!selected) setHover(card);
        }}
        onBlur={() => setHover(null)}
        onDragOver={(e) => {
          if (step === 'build' && side === 0) {
            e.preventDefault();
            setDropAt(card.at);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          place(card.at);
        }}
        onClick={() => {
          if (suppressClick.current) return;
          if (step === 'build' && side === 0) {
            if (selected && selected !== card.uid) place(card.at);
            else {
              setSelected(selected === card.uid ? undefined : card.uid);
              setHover(null);
            }
          } else showDetail(card);
        }}
      >
        <span className="slice-object-name">
          {short[cardFamily(card.id)] ?? def.name}
        </span>
        {step === 'combat' && (
          <span className="slice-cooldown">
            <i style={{ width: `${progress}%` }} />
          </span>
        )}
      </button>
    );
  }
  return (
    <main className={`slice-page phase-${step}`}>
      <header className="slice-header">
        <a href={sitePath('/art/')} className="slice-brand">
          f9<span>战斗切片</span>
        </a>
        <div className="slice-location">
          <span>01 / 云端旧街</span>
          <b>检查站 · 守卫</b>
        </div>
        <div className="slice-header-actions">
          <button
            aria-label={sound ? '关闭声音' : '开启声音'}
            onClick={() => {
              if (!audio.current) audio.current = new AudioContext();
              void audio.current.resume();
              setSound(!sound);
            }}
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
          {onLeave ? (
            <button onClick={onLeave}>返回房间</button>
          ) : (
            <a href={sitePath('/')}>返回电梯</a>
          )}
        </div>
      </header>
      <div className="slice-workspace">
        <aside className="slice-sidebar">
          <div className="slice-chapter">
            ENCOUNTER 01 <span>●</span>
          </div>
          <h1>
            {step === 'build'
              ? '部署装备'
              : step === 'preview'
                ? '守卫前室'
                : step === 'combat'
                  ? '交火'
                  : step === 'victory'
                    ? result.winner === 0
                      ? '胜利'
                      : '遭遇结束'
                    : step === 'reward'
                      ? '战利品'
                      : '装备已收好'}
          </h1>
          {step === 'preview' && (
            <>
              <p className="slice-story">
                房间深处，伏着一个分不清头尾的东西。
                <br />
                你的影子被拉长，铺在装备身后。
              </p>
              <button className="slice-primary" onClick={() => setIntel(true)}>
                <Eye />
                查看敌阵
              </button>
              {intel && (
                <div className="slice-intel">
                  <span>主要威胁 / 中路</span>
                  <h2>卷簧弩</h2>
                  <p>{describeCard(duel.enemy[0]).summary}</p>
                  <div className="slice-rule">
                    <Crosshair />
                    中路的弩已经上弦。
                  </div>
                  <button
                    className="slice-primary"
                    onClick={() => {
                      setStep('build');
                      setHover(null);
                    }}
                  >
                    准备迎战
                    <ArrowRight />
                  </button>
                </div>
              )}
            </>
          )}
          {step === 'build' && (
            <>
              <p className="slice-story">把行装变成你的防线。</p>
              <div className="slice-bag-title">
                <Package />
                备用卡牌 <span>{bag.length}</span>
              </div>
              <div className="slice-card-list">
                {bag.map((item) => {
                  const c = sliceCard(item),
                    d = describeCard(c);
                  return (
                    <button
                      key={item.uid}
                      className={`slice-reserve ${selected === item.uid ? 'selected' : ''}`}
                      draggable={false}
                      onPointerDown={(e) => {
                        if (e.button === 0)
                          drag.current = {
                            uid: item.uid,
                            x: e.clientX,
                            y: e.clientY,
                            moved: false,
                          };
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', item.uid);
                        setSelected(item.uid);
                        setHover(null);
                      }}
                      onDragEnd={() => setDropAt(null)}
                      onClick={() => {
                        if (suppressClick.current) return;
                        setSelected(
                          selected === item.uid ? undefined : item.uid,
                        );
                        setHover(null);
                      }}
                      onMouseEnter={() => {
                        if (!selected) setHover(c);
                      }}
                      onMouseLeave={() => setHover(null)}
                    >
                      <span className="slice-rarity">
                        稀有 · {cardDef(item.id).size}格
                      </span>
                      <strong>{cardDef(item.id).name}</strong>
                      <span>{d.summary}</span>
                      <small>
                        <Move />
                        拖到右侧棋盘 / 点击选择
                      </small>
                    </button>
                  );
                })}
                {bag.length === 0 && (
                  <div className="slice-bag-empty">
                    <Check />
                    装备已全部上阵
                  </div>
                )}
              </div>
              {selected && (
                <div className="slice-selection">
                  <span>选择落点</span>
                  <button
                    onClick={() => {
                      setSelected(undefined);
                      setDropAt(null);
                    }}
                  >
                    取消
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
                      收回背包
                    </button>
                  )}
                </div>
              )}
              <button
                className="slice-primary slice-bottom"
                disabled={!ready}
                onClick={begin}
              >
                开始战斗
                <Swords />
              </button>
            </>
          )}
          {step === 'combat' && (
            <>
              <p className="slice-story">
                保持阵线。
                <br />
                让装备完成它们的工作。
              </p>
              <div className="slice-clock">
                <b>{frame.time.toFixed(2)}</b>
                <span>SECONDS</span>
              </div>
              <div className="slice-play-controls">
                <button
                  disabled={!!detail}
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause /> : <Play />}
                  {playing ? '暂停' : '继续'}
                </button>
                <button
                  onClick={() =>
                    setSpeed(speed === 1 ? 2 : speed === 2 ? 0.25 : 1)
                  }
                >
                  {speed}×
                </button>
              </div>
              {!playing && !detail && (
                <button
                  className="slice-secondary"
                  onClick={() => {
                    clock.current = Math.min(
                      result.duration + SETTLE_SECONDS,
                      (Math.floor((clock.current + 1e-8) * 4) + 1) / 4,
                    );
                    const next = Math.min(
                      Math.floor((clock.current + 1e-8) * 4),
                      result.frames.length - 1,
                    );
                    setCursor(next);
                    if (clock.current >= result.duration + SETTLE_SECONDS)
                      setStep('victory');
                  }}
                >
                  下一帧 · 0.25秒
                </button>
              )}
              <div className="slice-live-event" aria-live="polite">
                {!playing
                  ? '战斗已暂停'
                  : frame.hits.some((h) => h.healthLoss)
                    ? '本体受到伤害'
                    : frame.hits.some((h) => h.barrierAbsorbed)
                      ? '屏障正在承受攻击'
                      : '自动交战中'}
              </div>
            </>
          )}
          {step === 'victory' && (
            <>
              <div className="slice-victory-seal">
                {result.winner === 0 ? <Check /> : <Shield />}
              </div>
              <p className="slice-story">
                {result.winner === 0
                  ? '封锁已经解除。'
                  : '调整布局，再试一次。'}
              </p>
              <div className="slice-evidence">
                <div>
                  <span>投影损伤</span>
                  <b>{evidence.ownLoss}</b>
                </div>
                <div>
                  <span>蜷卧者损伤</span>
                  <b>{evidence.enemyLoss}</b>
                </div>
                <p>{evidence.breakLine}</p>
                <p>
                  {evidence.reduced > 0
                    ? `皮质缓冲垫 · 实际减免 ${evidence.reduced} 点直接伤害`
                    : '本场未产生缓冲垫减伤收益'}
                </p>
              </div>
              {result.winner === 0 && (
                <button className="slice-primary" onClick={reveal}>
                  夺取敌方装备
                  <ArrowRight />
                </button>
              )}
              <button
                className="slice-secondary"
                onClick={() => {
                  clock.current = 0;
                  setCursor(0);
                  setStep('combat');
                  setPlaying(true);
                }}
              >
                重播这场战斗
              </button>
            </>
          )}
          {step === 'reward' && reward && (
            <>
              <span className="slice-rarity">从敌方武器中获得</span>
              <h2 className="slice-reward-name">{cardDef(reward.id).name}</h2>
              <p className="slice-story">
                原本朝向你的弩，
                <br />
                现在属于你了。
              </p>
              <div className="slice-evidence">
                {describeCard(sliceCard(reward)).abilities.map((a, i) => (
                  <p key={i}>
                    <b>{a.when}</b>
                    <br />
                    {a.text}
                  </p>
                ))}
              </div>
              <button className="slice-primary" onClick={claim}>
                <Package />
                收入背包
              </button>
            </>
          )}
          {step === 'done' && (
            <>
              <div className="slice-victory-seal">
                <Package />
              </div>
              <p className="slice-story">卷簧弩已收入本次切片背包。</p>
              <button
                className="slice-primary"
                onClick={() => (onReturn ? onReturn(run) : reset())}
              >
                {onReturn ? '带着战利品返回房间' : '重新体验'}
                <RotateCcw />
              </button>
              <a className="slice-secondary" href={sitePath('/art/')}>
                返回美术试验场
              </a>
            </>
          )}
          <footer className="slice-sidebar-footer">
            独立体验 · 不读写冒险存档
          </footer>
        </aside>
        <section className="slice-stage" aria-label="三维战斗棋盘">
          <Suspense
            fallback={<div className="slice-loading">检查站照明接通中…</div>}
          >
            <BattleScene
              duel={duel}
              frame={frame}
              frames={result.frames}
              clock={clock}
              selected={selected}
              reduced={reduced}
              onAnchors={onAnchors}
              onBoardAnchors={onBoardAnchors}
              onReady={onReady}
              reward={
                step === 'reward' || step === 'done' ? 'springbow' : undefined
              }
            />
          </Suspense>
          {!ready && <div className="slice-loading">正在展开装备台…</div>}
          {showBoard && (
            <>
              {step === 'combat' &&
                anchors.length > 0 &&
                events
                  .filter(
                    (e) =>
                      e.time <= frame.time &&
                      frame.time - e.time < 0.75 &&
                      e.hit.value > 0,
                  )
                  .slice(-6)
                  .map((e) => {
                    const h = e.hit;
                    const source = [...duel.player, ...duel.enemy].find(
                      (c) => c.uid === h.sourceUid,
                    );
                    const offset = source
                      ? (source.at % 3) + (cardDef(source.id).size - 1) / 2
                      : 1;
                    const cell =
                      h.side * 9 + (h.targetLane ?? 0) * 3 + Math.floor(offset);
                    const a = anchors[cell];
                    const x =
                      a.x +
                      a.w / 2 +
                      (offset % 1) * (anchors[cell + 1]?.x - a.x || 0);
                    const core =
                      (h.healthLoss ?? 0) > 0 && !(h.barrierAbsorbed ?? 0);
                    return (
                      <div
                        key={e.key}
                        className={`slice-hit ${h.kind === 'damage' ? 'damage' : 'repair'}`}
                        style={{
                          left: x,
                          top: core
                            ? boardAnchors.cores[h.side]?.y
                            : boardAnchors.barriers[
                                h.side * 3 + (h.targetLane ?? 0)
                              ]?.y,
                          opacity: 1 - (frame.time - e.time) / 0.9,
                          transform: `translate(-50%,${-(frame.time - e.time) * 22}px)`,
                        }}
                      >
                        {h.kind === 'damage'
                          ? `−${h.barrierAbsorbed || h.healthLoss || h.value}`
                          : `+${h.value}`}
                        {(h.blocked ?? 0) > 0 && (
                          <small>缓冲 −{h.blocked}</small>
                        )}
                        {(h.healthLoss ?? 0) > 0 &&
                          (h.barrierAbsorbed ?? 0) > 0 && (
                            <small>本体 −{h.healthLoss}</small>
                          )}
                      </div>
                    );
                  })}
              <div className="slice-host enemy">
                <span>◆ 蜷卧者</span>
                <b>
                  {frame.hp[1]}
                  <small> / {duel.maxHp[1]}</small>
                </b>
                <i
                  style={{ width: `${(frame.hp[1] / duel.maxHp[1]) * 100}%` }}
                />
              </div>
              <div className="slice-host player">
                <span>◉ 你的投影</span>
                <b>
                  {frame.hp[0]}
                  <small> / {duel.maxHp[0]}</small>
                </b>
                <i
                  style={{ width: `${(frame.hp[0] / duel.maxHp[0]) * 100}%` }}
                />
              </div>
              {anchors.length > 0 &&
                [0, 1].flatMap((side) =>
                  [0, 1, 2].map((lane) => {
                    const a = anchors[side * 9 + lane * 3],
                      end = anchors[side * 9 + lane * 3 + 2],
                      b = frame.barriers[side][lane];
                    return (
                      <div
                        key={`${side}-${lane}`}
                        className={`slice-barrier ${side ? 'enemy' : 'player'} ${b.broken ? 'broken' : ''}`}
                        style={{
                          left: a.x,
                          width: end.x + end.w - a.x,
                          top:
                            (boardAnchors.barriers[side * 3 + lane]?.y ?? a.y) +
                            (side ? -20 : 8),
                        }}
                      >
                        <Shield size={12} />
                        <span>{lanes[lane]}</span>
                        <b>{b.broken ? '已击破' : `${b.hp} / ${b.maxHp}`}</b>
                      </div>
                    );
                  }),
                )}
              {step === 'build' &&
                anchors.slice(0, 9).map((a, at) => {
                  const locked = !available.includes(at),
                    occupied = duel.player.some(
                      (c) => c.at <= at && c.at + cardDef(c.id).size > at,
                    );
                  if (occupied) return null;
                  const valid = selected
                    ? previewPlacement(run, selected, at).allowed
                    : false;
                  return (
                    <button
                      key={at}
                      aria-label={`${lanes[Math.floor(at / 3)]}第${(at % 3) + 1}格${locked ? ' 已锁定' : ''}`}
                      data-slice-at={at}
                      disabled={locked}
                      className={`slice-slot ${locked ? 'locked' : ''} ${selected ? (valid ? 'legal' : 'illegal') : ''} ${dropAt === at ? 'over' : ''}`}
                      style={{ left: a.x, top: a.y, width: a.w, height: a.h }}
                      onClick={() => place(at)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDropAt(at);
                      }}
                      onDragLeave={() => setDropAt(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        place(at);
                      }}
                    >
                      {locked ? <Lock size={14} /> : <span>＋</span>}
                    </button>
                  );
                })}
              {duel.player.map((c) => cardButton(c, 0))}
              {duel.enemy.map((c) => cardButton(c, 1))}
              {intel && step === 'preview' && anchors[12] && (
                <div
                  className="slice-threat"
                  style={{
                    left: anchors[12].x - 6,
                    top: anchors[12].y - 7,
                    width: anchors[14].x + anchors[14].w - anchors[12].x + 12,
                    height: anchors[12].h + 14,
                  }}
                >
                  <span>主要威胁 · 中路</span>
                </div>
              )}
              {step === 'combat' && !playing && !detail && (
                <div className="slice-paused">
                  <Pause />
                  战斗已暂停
                </div>
              )}
            </>
          )}
          {(step === 'reward' || step === 'done') && (
            <div className="slice-reward-caption">
              <Sparkles />
              <span>{step === 'done' ? '已领取' : '战利品'} · 卷簧弩</span>
            </div>
          )}
          {inspecting && showBoard && (
            <aside
              className={`slice-detail ${detail ? 'pinned' : ''}`}
              role={detail ? 'dialog' : undefined}
              aria-label="装备详情"
            >
              <div>
                <span>
                  {cardDef(inspecting.id).size}格 ·{' '}
                  {describeCard(inspecting).hitType === 'instant'
                    ? '即时命中'
                    : '弹道命中'}
                </span>
                {detail && (
                  <button aria-label="关闭详情" onClick={closeDetail}>
                    <X />
                  </button>
                )}
              </div>
              <h2>{cardDef(inspecting.id).name}</h2>
              {describeCard(inspecting).abilities.map((a, i) => (
                <p key={i}>
                  <b>{a.when}</b>
                  <br />
                  {a.text}
                </p>
              ))}
              {detail && step === 'combat' && (
                <small>查看中 · 战斗已暂停</small>
              )}
            </aside>
          )}
        </section>
      </div>
      <div className="slice-foot">
        <span>
          {notice ||
            (step === 'build'
              ? '准备好后，开始战斗。'
              : '装备台 / 立体战斗切片 01')}
        </span>
        <button onClick={reset}>
          <RotateCcw size={13} />
          重新开始
        </button>
      </div>
      {step === 'victory' && (
        <details className="slice-record">
          <summary>详细战斗记录</summary>
          {result.frames.flatMap((f) =>
            f.hits.map((h, i) => (
              <p key={`${f.time}-${i}`}>
                {f.time.toFixed(2)}s ·{' '}
                {duel.player.some((c) => c.uid === h.sourceUid)
                  ? '我方'
                  : '敌方'}{' '}
                {h.source} [{h.sourceUid}] → {h.side === 0 ? '我方' : '敌方'}{' '}
                {h.targetName ?? lanes[h.targetLane ?? 0]} [{h.targetUid}]：
                {h.kind === 'damage'
                  ? `屏障 ${h.barrierAbsorbed ?? 0} / 宿主 ${h.healthLoss ?? 0} / 减免 ${h.blocked ?? 0}`
                  : `实际生效 ${h.value}`}
              </p>
            )),
          )}
        </details>
      )}
    </main>
  );
}
