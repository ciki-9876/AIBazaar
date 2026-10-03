/* oxlint-disable next/no-html-link-for-pages -- standalone art specimen */
/* oxlint-disable next/no-img-element -- reusable transparent inventory renders */
'use client';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  Clock3,
  Fingerprint,
  FlipHorizontal2,
  Layers3,
  Maximize2,
  Minimize2,
  MoveUpRight,
  Package,
  RotateCcw,
  ScanLine,
  Shield,
  Sparkles,
} from 'lucide-react';
import { sitePath } from '@/lib/site-path';
import { EDITIONS, specimenCard, type SpecimenView } from './specimen';
import './cards.css';

const Scene = lazy(() => import('./scene'));
const icon = sitePath('/art-assets/card-specimen/cushion-icon.png');
const phaseLabels = [
  '等待鉴定',
  '读取物件的残留',
  '异常正在显影',
  '封存为卡牌',
  '鉴定完成',
];
const views: {
  id: SpecimenView;
  label: string;
  en: string;
  icon: typeof Package;
}[] = [
  { id: 'item', label: '行囊', en: 'OBJECT', icon: Package },
  { id: 'card', label: '图鉴', en: 'ARCHIVE', icon: Layers3 },
  { id: 'identify', label: '鉴定', en: 'REVEAL', icon: ScanLine },
];

export default function CardSpecimenPage() {
  const [view, setView] = useState<SpecimenView>('card'),
    [tier, setTier] = useState(2);
  const [flipped, setFlipped] = useState(false),
    [zoom, setZoom] = useState(false),
    [reduced, setReduced] = useState(false);
  const [reveal, setReveal] = useState(0),
    [phase, setPhase] = useState(0),
    [skip, setSkip] = useState(false),
    [reset, setReset] = useState(0);
  const [context, setContext] = useState<'bag' | 'loot' | 'tool'>('bag');
  const [ready, setReady] = useState(false);
  const updatePhase = useCallback((p: number) => setPhase(p), []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    const id = requestAnimationFrame(update);
    media.addEventListener('change', update);
    return () => {
      cancelAnimationFrame(id);
      media.removeEventListener('change', update);
    };
  }, []);
  const sample = specimenCard(tier),
    busy = view === 'identify' && phase > 0 && phase < 4;
  function changeView(v: SpecimenView) {
    setView(v);
    setFlipped(false);
    setZoom(false);
    setPhase(0);
    setSkip(false);
    setReset((n) => n + 1);
  }
  function changeTier(t: number) {
    setTier(t);
    setFlipped(false);
    setSkip(false);
    setPhase(0);
    setReset((n) => n + 1);
  }
  function start() {
    setSkip(false);
    setFlipped(false);
    setZoom(false);
    setReveal((n) => n + 1);
    setPhase(reduced ? 4 : 1);
  }
  const style = {
    '--cs-accent': view === 'item' ? '#91ba9c' : sample.edition.color,
    '--cs-grain':
      'url(' +
      sitePath('/art-assets/material-study/grey_plaster_02-color.jpg') +
      ')',
  } as CSSProperties;
  return (
    <main
      className={`card-specimen view-${view} ${reduced ? 'cs-reduced' : ''}`}
      style={style}
    >
      <header className="cs-header">
        <a
          href={sitePath('/art/chamber')}
          className="cs-brand"
          aria-label="返回 3D 房间"
        >
          <span>f9</span>
          <i />
          异物档案
        </a>
        <nav aria-label="美术展示场景">
          {views.map((v) => (
            <button
              key={v.id}
              aria-pressed={view === v.id}
              disabled={busy}
              onClick={() => changeView(v.id)}
            >
              <v.icon />
              <span>{v.label}</span>
              <small>{v.en}</small>
            </button>
          ))}
        </nav>
        <label className="cs-motion">
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
          />
          减少动态
        </label>
      </header>

      <div className="cs-workspace">
        <aside className="cs-sidebar">
          <div className="cs-index">
            <span>COLLECTION STUDY</span>
            <b>007</b>
          </div>
          <div className="cs-heading">
            <p>
              {view === 'item'
                ? '未鉴定实体'
                : view === 'card'
                  ? '卡牌实体'
                  : '从物品，到卡牌'}
            </p>
            <h1>缓冲垫</h1>
            <div className="cs-rule" />
          </div>
          {view === 'item' ? (
            <>
              <div
                className="cs-context"

                aria-label="物品展示位置"
              >
                {(
                  [
                    ['bag', '背包'],
                    ['loot', '搜刮'],
                    ['tool', '机关'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={context === id}
                    onClick={() => setContext(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {context === 'bag' ? (
                <div className="cs-inventory" aria-label="背包物品列表">
                  <button
                    className="cs-slot selected"
                    aria-label="查看缓冲垫"
                    onClick={() => setReset((n) => n + 1)}
                  >
                    <img src={icon} alt="棕色皮革缓冲垫" />
                    <span>1</span>
                    <i />
                  </button>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div className="cs-slot empty" key={i}>
                      <span>·</span>
                    </div>
                  ))}
                </div>
              ) : context === 'loot' ? (
                <div className="cs-object-row">
                  <img src={icon} alt="缓冲垫" />
                  <div>
                    <small>搜刮所得</small>
                    <strong>缓冲垫</strong>
                  </div>
                  <b>×1</b>
                </div>
              ) : (
                <div className="cs-object-row">
                  <img src={icon} alt="缓冲垫" />
                  <div>
                    <small>可用工具</small>
                    <strong>隔离高压接口</strong>
                    <p>使用后保留</p>
                  </div>
                  <Shield />
                </div>
              )}
              <p className="cs-subtle">
                一件结实的旧垫子。皮面留着受压的痕迹，缝线依然牢靠。
              </p>
              <div className="cs-item-facts">
                <span>
                  <Box />1 格
                </span>
                <span>
                  <Shield />
                  耐用工具
                </span>
              </div>
              <button
                className="cs-text-button"
                onClick={() => changeView('identify')}
              >
                送去鉴定 <MoveUpRight />
              </button>
            </>
          ) : (
            <>
              <div className="cs-selector-title">
                <span>
                  {view === 'identify' ? '演示鉴定结果' : '选择收藏变种'}
                </span>
                <small>05 EDITIONS</small>
              </div>
              <div className="cs-editions" aria-label="卡牌稀有度">
                {EDITIONS.map((e, i) => (
                  <button
                    key={e.id}
                    disabled={busy}
                    aria-pressed={tier === i}
                    onClick={() => changeTier(i)}
                    style={{ '--edition-color': e.color } as CSSProperties}
                  >
                    <span className="cs-rarity-mark" aria-hidden="true">
                      {Array.from({ length: e.marks }, (_, j) => (
                        <i key={j} />
                      ))}
                    </span>
                    <span>
                      <strong>{e.label}</strong>
                      <small>{specimenCard(i).def.name}</small>
                    </span>
                    {tier === i ? <Check /> : <ChevronRight />}
                  </button>
                ))}
              </div>
              <p className="cs-subtle cs-demo-note">
                {view === 'identify'
                  ? '预选结果仅用于观看美术演示，不消耗道具，不代表掉落概率。'
                  : '同一实体族的命名变种。每个变种的稀有度固定。'}
              </p>
            </>
          )}
          <a href={sitePath('/art/chamber')} className="cs-back-link">
            <ArrowLeft />
            回到房间
          </a>
        </aside>

        <section className="cs-display" aria-label="标本展示台">
          <div className="cs-stage-heading">
            <span>
              {view === 'item'
                ? 'PHYSICAL SPECIMEN'
                : view === 'card'
                  ? 'THE MATERIAL ARCHIVE'
                  : 'IDENTIFICATION CHAMBER'}
            </span>
            <i />
            <span>
              {view === 'item'
                ? '实体 / 01'
                : view === 'card'
                  ? '卡牌 / 02'
                  : '鉴定 / 03'}
            </span>
          </div>
          <div className={`cs-stage ${busy ? 'is-revealing' : ''}`}>
            <div className="cs-backdrop" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>F9</span>
            </div>
            <Suspense
              fallback={<div className="cs-loading">正在打开档案…</div>}
            >
              <Scene
                view={view}
                tier={tier}
                flipped={flipped}
                zoom={zoom}
                reduced={reduced}
                reveal={reveal}
                reset={reset}
                skip={skip}
                onPhase={updatePhase}
                onReady={setReady}
              />
            </Suspense>
            <div className="cs-corner top-left" />
            <div className="cs-corner bottom-right" />
            {view === 'identify' && (
              <div
                className={`cs-reveal-caption phase-${phase}`}
                aria-live="polite"
              >
                <span>
                  {phase === 4
                    ? 'IDENTIFIED'
                    : String(phase + 1).padStart(2, '0') + ' / RESONANCE'}
                </span>
                <h2>{phase === 4 ? sample.def.name : phaseLabels[phase]}</h2>
                {phase === 4 && (
                  <p>
                    <Sparkles />
                    {sample.edition.label}
                    <i />
                    已封存
                  </p>
                )}
                {busy && (
                  <div className="cs-reveal-progress">
                    <i key={reveal} />
                  </div>
                )}
              </div>
            )}
            {!busy && view !== 'identify' && (
              <div className="cs-stage-label">
                <span>
                  {view === 'item'
                    ? '实物标本'
                    : flipped
                      ? '卡背 · 异常留存'
                      : sample.edition.label + ' · ' + sample.def.name}
                </span>
                <small>
                  {view === 'item'
                    ? '皮革 / 棉线 / 金属底座'
                    : sample.edition.finish}
                </small>
              </div>
            )}
          </div>
          <div className="cs-stage-controls">
            {view === 'identify' ? (
              <>
                {phase === 0 ? (
                  <button
                    className="cs-primary"
                    disabled={!ready}
                    onClick={start}
                  >
                    <Fingerprint />
                    开始鉴定
                  </button>
                ) : busy ? (
                  <>
                    <span className="cs-reading">正在鉴定…</span>
                    <button
                      className="cs-text-button"
                      onClick={() => setSkip(true)}
                    >
                      跳过动画 <ChevronRight />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="cs-primary"
                      onClick={() => changeView('card')}
                    >
                      查看卡牌 <ArrowUpRight />
                    </button>
                    <button
                      className="cs-icon-button"
                      aria-label="重播鉴定动画"
                      onClick={start}
                    >
                      <RotateCcw />
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="cs-drag-tip">拖动旋转 · 观察表面反光</span>
                <div>
                  {view === 'card' && (
                    <button onClick={() => setFlipped((v) => !v)}>
                      <FlipHorizontal2 />
                      {flipped ? '查看正面' : '翻到背面'}
                    </button>
                  )}
                  <button
                    className="cs-icon-button"
                    aria-label={zoom ? '缩小标本' : '放大标本'}
                    onClick={() => setZoom((v) => !v)}
                  >
                    {zoom ? <Minimize2 /> : <Maximize2 />}
                  </button>
                  <button
                    className="cs-icon-button"
                    aria-label="复位视角"
                    onClick={() => {
                      setFlipped(false);
                      setZoom(false);
                      setReset((n) => n + 1);
                    }}
                  >
                    <RotateCcw />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="cs-notes">
          <span className="cs-notes-kicker">
            {view === 'item' ? 'OBJECT NOTES' : 'ARCHIVE NOTES'}
          </span>
          <h2>
            {view === 'item'
              ? '每件物品，\n留下同一个轮廓。'
              : view === 'identify'
                ? '把未知，\n变成值得收藏的发现。'
                : '拿在手里，\n才像一张卡。'}
          </h2>
          {view === 'item' ? (
            <>
              <p>从拾取到行囊，再到机关里的工具列表，始终使用同一张物品图。</p>
              <div className="cs-icon-scales">
                <div>
                  <img
                    src={icon}
                    alt="32 像素物品图标"
                    width="32"
                    height="32"
                  />
                  <small>32</small>
                </div>
                <div>
                  <img
                    src={icon}
                    alt="64 像素物品图标"
                    width="64"
                    height="64"
                  />
                  <small>64</small>
                </div>
                <div>
                  <img
                    src={icon}
                    alt="96 像素物品图标"
                    width="96"
                    height="96"
                  />
                  <small>96</small>
                </div>
              </div>
              <dl>
                <div>
                  <dt>缩略图</dt>
                  <dd>透明底、固定角度</dd>
                </div>
                <div>
                  <dt>近看</dt>
                  <dd>同源 3D 模型</dd>
                </div>
                <div>
                  <dt>品质</dt>
                  <dd>边框表达，保留原色</dd>
                </div>
              </dl>
              <a
                className="cs-asset-link"
                href={icon}
                target="_blank"
                rel="noreferrer"
              >
                查看 1024px 透明图 <ArrowUpRight />
              </a>
            </>
          ) : (
            <>
              <p>
                {view === 'identify'
                  ? '读取、显影、翻转、落定。光先留在边缘，最后让名称与能力清晰出现。'
                  : '纸面保持哑光，纹路藏在近处。转动时，只有压印与箔层接住光。'}
              </p>
              <div className="cs-material-notes">
                <span>
                  <i className="paper" />
                  纤维纸面
                </span>
                <span>
                  <i className="foil" />
                  局部箔光
                </span>
                <span>
                  <i className="edge" />
                  薄层切边
                </span>
              </div>
              <details className="cs-abilities">
                <summary>
                  查看卡牌能力 <ChevronRight />
                </summary>
                <h3>{sample.def.name}</h3>
                <div className="cs-item-facts">
                  <span>
                    <Clock3 />
                    {sample.description.cd} 秒
                  </span>
                  <span>
                    <Box />
                    {sample.def.size} 格
                  </span>
                </div>
                {sample.description.abilities.map((a) => (
                  <p key={a.when}>
                    <small>{a.when}</small>
                    {a.text}
                  </p>
                ))}
                <small>基础品阶 · Lv.0</small>
              </details>
              <div className="cs-colophon">
                <span>
                  NOT ALL THINGS
                  <br />
                  WISH TO BE FOUND.
                </span>
                <b>F / 007</b>
              </div>
            </>
          )}
        </aside>
      </div>
      <footer className="cs-footer">
        <span>F9 / 物品与卡牌美术样例</span>
        <span>独立演示 · 不读写冒险存档</span>
        <span>OBJECT → ARCHIVE</span>
      </footer>
    </main>
  );
}
