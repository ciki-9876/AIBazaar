/* oxlint-disable next/no-html-link-for-pages -- Standalone visual studies use document navigation. */
'use client';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Focus,
  Grid2X2,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Sun,
  EyeOff,
  Eye,
  Move3D,
  Sparkles,
} from 'lucide-react';
import { sitePath } from '@/lib/site-path';
import { STUDIES, type StudyId, type CameraView } from './catalog';
import './showcase.css';
const Viewer = lazy(() => import('./viewer'));
export default function ArtShowcase() {
  const [study, setStudy] = useState<StudyId>('myth'),
    [view, setView] = useState<CameraView>('scene'),
    [motion, setMotion] = useState(true),
    [neutral, setNeutral] = useState(false),
    [reset, setReset] = useState(0),
    [burst, setBurst] = useState(0),
    [clean, setClean] = useState(false),
    [status, setStatus] = useState('正在载入'),
    [fps, setFps] = useState(0);
  const selected = STUDIES.find((s) => s.id === study)!;
  const reportStatus = useCallback((text: string) => setStatus(text), []);
  const reportStats = useCallback((value: number) => setFps(value), []);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) requestAnimationFrame(() => setMotion(false));
  }, []);
  const choose = (id: StudyId) => {
    if (id === study) return;
    setStudy(id);
    setStatus('正在布置场景');
    setFps(0);
    setView('scene');
    setNeutral(false);
    setReset((r) => r + 1);
  };
  return (
    <main
      className={`atelier-page ${clean ? 'clean' : ''}`}
      style={{ '--atelier-accent': selected.color } as React.CSSProperties}
    >
      <header className="atelier-header">
        <a href={sitePath('/survival')} aria-label="返回房间试玩">
          <ArrowLeft size={16} />
          <b>F9</b>
        </a>
        <span>
          ENVIRONMENT STUDIES <i>/</i> 2026
        </span>
        <div className="atelier-status">
          <i />
          {status}
        </div>
        <button
          title={clean ? '显示面板' : '隐藏面板'}
          onClick={() => setClean(!clean)}
        >
          {clean ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </header>
      <aside className="atelier-sidebar">
        <div className="atelier-intro">
          <span className="atelier-eyebrow">材质 · 光线 · 空间</span>
          <h1>
            世界的
            <br />
            三种质感<span>。</span>
          </h1>
          <p>
            同样是三维空间，
            <br />
            让不同的美术语言决定它的性格。
          </p>
        </div>
        <nav aria-label="艺术风格">
          {STUDIES.map((s) => (
            <button
              key={s.id}
              className={study === s.id ? 'selected' : ''}
              aria-pressed={study === s.id}
              onClick={() => choose(s.id)}
            >
              <span className="atelier-index">{s.number}</span>
              <div>
                <strong>{s.name}</strong>
                <small>{s.genre}</small>
              </div>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </nav>
        <div className="atelier-caption">
          <span className="atelier-eyebrow">本场景的观察重点</span>
          <ul>
            {selected.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p>{selected.note}</p>
        </div>
        <div className="atelier-sidebar-foot">
          <span>ACTUAL REALTIME RENDER</span>
          <strong>
            {fps || '—'} <small>FPS</small>
          </strong>
        </div>
      </aside>
      <section
        className="atelier-stage"
        aria-label={selected.name + '三维场景'}
      >
        <Suspense
          fallback={<div className="atelier-loading">准备光线与材质…</div>}
        >
          <Viewer
            options={{ study, view, motion, neutral, reset, burst }}
            onStatus={reportStatus}
            onStats={reportStats}
          />
        </Suspense>
        <div className="atelier-scene-title">
          <span>{selected.en}</span>
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
        </div>
        <div className="atelier-orbit-hint">
          <MousePointer2 size={13} />
          拖动旋转 <i>·</i> 滚轮缩放 <i>·</i> 右键平移
        </div>
        <div className="atelier-corner-mark">
          <span>{selected.number}</span>
          <small>
            SCENE STUDY
            <br />
            FULL 3D
          </small>
        </div>
      </section>
      <footer className="atelier-toolbar">
        <div className="atelier-views" aria-label="观察视角">
          <button
            aria-pressed={view === 'scene'}
            onClick={() => setView('scene')}
          >
            <Move3D size={15} />
            全景
          </button>
          <button
            aria-pressed={view === 'detail'}
            onClick={() => setView('detail')}
          >
            <Focus size={15} />
            细节近看
          </button>
          <button
            aria-pressed={view === 'game'}
            onClick={() => setView('game')}
          >
            <Grid2X2 size={15} />
            战斗视角
          </button>
        </div>
        <div className="atelier-actions">
          <button aria-pressed={neutral} onClick={() => setNeutral(!neutral)}>
            <Sun size={15} />
            中性光
          </button>
          <button
            onClick={() => {
              setMotion(true);
              setBurst((b) => b + 1);
            }}
          >
            <Sparkles size={15} />
            光效演示
          </button>
          <button
            aria-label={motion ? '暂停动态' : '继续动态'}
            onClick={() => setMotion(!motion)}
          >
            {motion ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button aria-label="重置镜头" onClick={() => setReset((r) => r + 1)}>
            <RotateCcw size={16} />
          </button>
        </div>
      </footer>
    </main>
  );
}
