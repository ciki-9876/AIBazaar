/* oxlint-disable next/no-html-link-for-pages -- Standalone art sample. */
'use client';
import { lazy, Suspense, useState } from 'react';
import { GARDEN_MOODS, type PavilionMood } from '@/lib/survival-pavilion';
import { sitePath } from '@/lib/site-path';
import type { GardenView } from './viewer';
import './pavilion.css';
const Viewer = lazy(() => import('./viewer'));
export default function PavilionStudy() {
  const [mood, setMood] = useState<PavilionMood>('rain'),
    [view, setView] = useState<GardenView>('court'),
    [motion, setMotion] = useState(true);
  return (
    <main className="garden-study">
      <aside className="garden-curator">
        <a className="garden-back" href={sitePath('/survival')}>
          ← 返回电梯
        </a>
        <span className="garden-kicker">F9 / 异境样板 001</span>
        <h1>
          听雨<span>庭</span>
        </h1>
        <p className="garden-poem">
          门外雨未歇。
          <br />
          此间，已无人。
        </p>
        <nav aria-label="庭院氛围">
          {(Object.keys(GARDEN_MOODS) as PavilionMood[]).map((id, i) => (
            <button
              key={id}
              aria-pressed={mood === id}
              onClick={() => setMood(id)}
            >
              <small>0{i + 1}</small>
              <strong>{GARDEN_MOODS[id].name}</strong>
              <span>{GARDEN_MOODS[id].note}</span>
            </button>
          ))}
        </nav>
        <div className="garden-kit-note">
          <span>一套构件 · 三重气息</span>
          <p>
            飞檐 / 月门 / 花窗 / 木作
            <br />
            荷池 / 灯笼 / 竹木 / 帘幡
          </p>
          <small>建筑 / 陈设 / 鬼怪，共用主题构件。</small>
        </div>
        <a className="garden-play" href={sitePath('/survival')}>
          进入游戏 <span>↗</span>
        </a>
        <small className="garden-access">设置 → GM → 听雨庭</small>
      </aside>
      <section className="garden-frame" aria-label="庭院样板">
        <Suspense
          fallback={<div className="garden-loading">正在布置庭院…</div>}
        >
          <Viewer mood={mood} view={view} motion={motion} />
        </Suspense>
        <header className="garden-caption">
          <span>江南构件集 / 壹</span>
          <h2>
            {view === 'spirits'
              ? '灯魇 · 丧鸢 · 铜餮 · 祠守'
              : GARDEN_MOODS[mood].name}
          </h2>
        </header>
        <span className="garden-seal" aria-hidden="true">
          听<br />雨
        </span>
        <footer className="garden-tools">
          <fieldset aria-label="观察角度">
            {(
              [
                ['court', '庭院'],
                ['gate', '月门'],
                ['roof', '飞檐'],
                ['spirits', '鬼怪'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={view === id}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
            <button aria-pressed={!motion} onClick={() => setMotion(!motion)}>
              {motion ? '暂停动态' : '播放动态'}
            </button>
          </fieldset>
          <span>拖动旋转 · 滚轮靠近 · 右键平移</span>
        </footer>
      </section>
    </main>
  );
}
