'use client';
import { useEffect, useRef, useState } from 'react';
import { GM_STAGES, createGMCheckpoint } from '@/lib/survival-gm';
import type { OpeningState } from '@/lib/survival-opening';
export default function GMPanel({
  close,
  jump,
}: {
  close: () => void;
  jump: (s: OpeningState) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState('after:offer-food'),
    [error, setError] = useState('');
  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    return () => d.close();
  }, []);
  const stage = GM_STAGES.find((s) => s.id === selected)!;
  const matches = GM_STAGES.filter((s) =>
    `${s.title} ${s.description} ${s.group}`.includes(query.trim()),
  );
  return (
    <dialog
      ref={dialog}
      className="lift-terminal gm-panel"
      aria-label="GM 引导调试"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2>GM · 引导调试</h2>
        <button onClick={close} aria-label="关闭 GM">
          ×
        </button>
      </header>
      <div className="gm-layout">
        <section className="gm-index">
          <input
            aria-label="搜索引导阶段"
            placeholder="搜索阶段"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="gm-stage-list">
            {matches.map((s) => (
              <button
                key={s.id}
                aria-pressed={s.id === selected}
                onClick={() => setSelected(s.id)}
              >
                <small>{s.group}</small>
                <strong>
                  {String(GM_STAGES.indexOf(s) + 1).padStart(2, '0')} ·{' '}
                  {s.title}
                </strong>
              </button>
            ))}
            {!matches.length && <p>没有匹配阶段</p>}
          </div>
        </section>
        <section className="gm-preview">
          <small>{stage.group}</small>
          <h3>{stage.title}</h3>
          <p>{stage.description}</p>
          <p className="gm-note">
            切换将替换当前试玩进度，并配好该阶段需要的场景、物品和引导状态。
          </p>
          <button
            className="console-primary"
            onClick={() => {
              try {
                jump(createGMCheckpoint(selected));
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            跳转到此阶段
          </button>
          <output aria-live="polite">{error}</output>
        </section>
      </div>
    </dialog>
  );
}
