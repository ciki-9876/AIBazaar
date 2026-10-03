/* oxlint-disable next/no-html-link-for-pages -- independent art study */
'use client';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  FlipHorizontal2,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  SplitSquareHorizontal,
} from 'lucide-react';
import { createBattleSlice, slicePreview } from '@/lib/battle-slice';
import { simulateDuel } from '@/lib/cards/combat';
import { cardDef } from '@/lib/cards/catalog';
import { sitePath } from '@/lib/site-path';
import { advanceReplay } from '../../../lib/cards/playback';
import {
  RENDER_STYLES,
  type RenderStyleId,
  type RenderStyleSettings,
} from '../../../packages/render-kit/presets';
import { specimenCard } from '../cards/specimen';
import './styles.css';
const CardScene = lazy(() => import('../cards/scene'));
const BattleScene = lazy(() => import('../../arena/render/scene'));
const noAnchors = () => {};
const sample = specimenCard(2);

export default function RenderStylePage() {
  const [subject, setSubject] = useState<'card' | 'battle'>('battle');
  const [style, setStyle] = useState<RenderStyleId>('cel');
  const [strength, setStrength] = useState(1),
    [compare, setCompare] = useState(false),
    [split, setSplit] = useState(0.5),
    [original, setOriginal] = useState(false);
  const [flipped, setFlipped] = useState(false),
    [reset, setReset] = useState(0),
    [reduced, setReduced] = useState(false);
  const [cardReady, setCardReady] = useState(false),
    [battleReady, setBattleReady] = useState(false),
    [playing, setPlaying] = useState(false),
    [cursor, setCursor] = useState(0);
  const clock = useRef(0);
  const duel = useMemo(() => {
    const run = createBattleSlice();
    const pad = run.items.find((x) => x.uid === 'slice-pad')!;
    pad.zone = 'board';
    pad.at = 4;
    return slicePreview(run);
  }, []);
  const result = useMemo(() => simulateDuel(duel), [duel]);
  const frame = result.frames[cursor] ?? result.frames[0];
  const selected = RENDER_STYLES.find((s) => s.id === style)!;
  const settings: RenderStyleSettings = {
    style,
    strength,
    compare,
    split,
    original,
  };
  const ready = subject === 'card' ? cardReady : battleReady;
  const onBattleReady = useCallback(() => setBattleReady(true), []);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    const id = requestAnimationFrame(update);
    media.addEventListener('change', update);
    return () => {
      cancelAnimationFrame(id);
      media.removeEventListener('change', update);
    };
  }, []);
  useEffect(() => {
    if (!playing || subject !== 'battle') return;
    let id = 0,
      last = performance.now();
    const tick = (now: number) => {
      clock.current = advanceReplay(
        clock.current,
        now - last,
        1,
        result.duration,
      );
      last = now;
      setCursor(
        Math.min(
          result.frames.length - 1,
          Math.floor((clock.current + 1e-8) * 4),
        ),
      );
      if (clock.current < result.duration) id = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, subject, result]);
  function seek(time: number) {
    setPlaying(false);
    clock.current = time;
    setCursor(Math.min(result.frames.length - 1, Math.floor(time * 4)));
  }
  function switchSubject(s: 'card' | 'battle') {
    if (s === subject) return;
    setSubject(s);
    setPlaying(false);
    setCardReady(false);
    setBattleReady(false);
  }
  return (
    <main
      className="rs-page"
      style={{ '--rs-accent': selected.color } as CSSProperties}
    >
      <header className="rs-header">
        <a href={sitePath('/art/cards')} className="rs-brand">
          <ArrowLeft />
          <b>f9</b>
          <span>视觉实验室</span>
        </a>
        <div className="rs-subjects" aria-label="展示场景">
          <button
            aria-pressed={subject === 'card'}
            onClick={() => switchSubject('card')}
          >
            <Layers3 />
            卡牌标本
          </button>
          <button
            aria-pressed={subject === 'battle'}
            onClick={() => switchSubject('battle')}
          >
            <ScanLine />
            战斗桌面
          </button>
        </div>
        <span className="rs-edition">
          RENDER STUDIES <i> / </i> VOL. 02
        </span>
      </header>
      <div className="rs-workspace">
        <aside className="rs-sidebar">
          <p className="rs-kicker">ONE SCENE. FIVE LANGUAGES.</p>
          <h1>
            换一种
            <br />
            <em>看见的方式。</em>
          </h1>
          <p className="rs-intro">
            同样的物件、贴图与灯光。
            <br />
            只改变镜头之后的画面。
          </p>
          <div className="rs-styles" aria-label="渲染风格">
            {RENDER_STYLES.map((s) => (
              <button
                key={s.id}
                aria-pressed={s.id === style}
                style={{ '--swatch': s.color } as CSSProperties}
                onClick={() => {
                  setStyle(s.id);
                  setOriginal(false);
                }}
              >
                <span
                  className={`rs-swatch swatch-${s.id}`}
                  aria-hidden="true"
                />
                <span>
                  <small>
                    {s.mark} / {s.en}
                  </small>
                  <strong>{s.title}</strong>
                </span>
                {style === s.id && <Check />}
              </button>
            ))}
          </div>
          <div className="rs-control">
            <label htmlFor="style-strength">
              风格强度 <output>{Math.round(strength * 100)}%</output>
            </label>
            <input
              id="style-strength"
              type="range"
              min="0"
              max="1"
              step=".05"
              value={strength}
              disabled={original}
              onChange={(e) => setStrength(Number(e.target.value))}
            />
            <label className="rs-check">
              <input
                type="checkbox"
                checked={reduced}
                onChange={(e) => setReduced(e.target.checked)}
              />
              减少动态
            </label>
          </div>
          <p className="rs-scope">独立美术演示 · 不读写存档</p>
        </aside>
        <section className="rs-main" aria-label="实时渲染比较">
          <div className="rs-titlebar">
            <div>
              <span>{selected.mark} / REALTIME RENDER</span>
              <h2>{original ? '原始画面' : selected.title}</h2>
            </div>
            <div className="rs-view-controls">
              <button
                aria-pressed={original}
                onClick={() => setOriginal((v) => !v)}
              >
                原画
              </button>
              <button
                aria-pressed={compare}
                disabled={original}
                onClick={() => setCompare((v) => !v)}
              >
                <SplitSquareHorizontal />
                分屏对照
              </button>
            </div>
          </div>
          <div className={`rs-stage subject-${subject}`}>
            <Suspense fallback={<div className="rs-loading">准备场景…</div>}>
              {subject === 'card' ? (
                <CardScene
                  view="card"
                  tier={2}
                  flipped={flipped}
                  zoom={false}
                  reduced={reduced}
                  reveal={0}
                  reset={reset}
                  skip={false}
                  onPhase={noAnchors}
                  onReady={setCardReady}
                  renderStyle={settings}
                />
              ) : (
                <BattleScene
                  duel={duel}
                  frame={frame}
                  frames={result.frames}
                  clock={clock}
                  reduced={reduced}
                  onAnchors={noAnchors}
                  onReady={onBattleReady}
                  chamber={{
                    view: 'table',
                    opened: true,
                    taken: true,
                    cleared: false,
                  }}
                  materialStyle="tactile"
                  renderStyle={settings}
                />
              )}
            </Suspense>
            {!ready && (
              <div className="rs-loading">正在载入同一份 3D 资产…</div>
            )}
            <div className="rs-frame-label">
              <i />
              {subject === 'card' ? '皮质缓冲垫 · 稀有' : '守卫前室 · 三路战场'}
            </div>
            {compare && !original && (
              <>
                <div
                  className="rs-split-line"
                  style={{ left: `${split * 100}%` }}
                />
                <span className="rs-compare-tag left">原画</span>
                <span className="rs-compare-tag right">{selected.title}</span>
              </>
            )}
            {subject === 'battle' && (
              <div className="rs-battle-hud">
                <span>
                  我方 <b>{frame.hp[0]}</b>
                </span>
                <span>{frame.time.toFixed(2)}s</span>
                <span>
                  敌方 <b>{frame.hp[1]}</b>
                </span>
              </div>
            )}
          </div>
          {compare && !original && (
            <label className="rs-split-control">
              对照分界
              <input
                aria-label="对照分界"
                type="range"
                min=".08"
                max=".92"
                step=".01"
                value={split}
                onChange={(e) => setSplit(Number(e.target.value))}
              />
              <span>
                {Math.round(split * 100)} / {100 - Math.round(split * 100)}
              </span>
            </label>
          )}
          <div className="rs-transport">
            {subject === 'card' ? (
              <>
                <span>拖动卡片，观察反光与轮廓</span>
                <div>
                  <button onClick={() => setFlipped((v) => !v)}>
                    <FlipHorizontal2 />
                    {flipped ? '查看正面' : '翻到背面'}
                  </button>
                  <button
                    onClick={() => {
                      setReset((n) => n + 1);
                      setFlipped(false);
                    }}
                    aria-label="复位卡牌"
                  >
                    <RotateCcw />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  disabled={!ready}
                  onClick={() => {
                    if (clock.current >= result.duration) seek(0);
                    setPlaying((v) => !v);
                  }}
                >
                  {playing ? <Pause /> : <Play />}
                  {playing ? '暂停' : '播放战斗'}
                </button>
                <input
                  aria-label="战斗时间"
                  type="range"
                  min="0"
                  max={result.duration}
                  step=".25"
                  value={frame.time}
                  onChange={(e) => seek(Number(e.target.value))}
                />
                <span className="rs-time">
                  {frame.time.toFixed(2)} / {result.duration.toFixed(2)}s
                </span>
                <button onClick={() => seek(0)} aria-label="回到战斗开场">
                  <RotateCcw />
                </button>
              </>
            )}
          </div>
          <div className="rs-caption">
            <div>
              <p>{selected.note}</p>
              <span>{selected.process}</span>
            </div>
            <small>{selected.limit}</small>
          </div>
          <details className="rs-details">
            <summary>
              查看原始信息与渲染边界 <ArrowUpRight />
            </summary>
            <div>
              <p>
                只对最终 3D 画面做后处理。模型的几何、材质、贴图和物体 shader
                均复用原版；HUD
                保持清晰。卡牌印刷字属于模型贴图，因此也会被风格化。
              </p>
              {subject === 'card' ? (
                <p>
                  <strong>{sample.def.name}</strong>
                  {sample.description.abilities.map((a) => (
                    <span key={a.when}>
                      {a.when}：{a.text}
                    </span>
                  ))}
                </p>
              ) : (
                <div className="rs-roster">
                  {[duel.player, duel.enemy].map((cards, side) => (
                    <div key={side}>
                      <strong>{side === 0 ? '我方配置' : '敌方配置'}</strong>
                      {cards.map((c) => (
                        <span key={c.uid}>
                          {['左', '中', '右'][Math.floor(c.at / 3)]}路 ·{' '}
                          {cardDef(c.id).name}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </section>
      </div>
      <footer className="rs-footer">
        <span>F9 / SCREEN-SPACE ART DIRECTION</span>
        <span>几何不变 · 表面不变 · 五种观看方式</span>
        <a href={sitePath('/art/chamber')}>
          回到原始战场 <ArrowUpRight />
        </a>
      </footer>
    </main>
  );
}
