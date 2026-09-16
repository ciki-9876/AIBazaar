/* oxlint-disable next/no-html-link-for-pages -- Static export uses document navigation; client RSC navigation is unavailable on the host. */
'use client';
import { lazy, Suspense, useEffect, useReducer, useState } from 'react';
import {
  ArrowLeft,
  Box,
  DoorOpen,
  Expand,
  Eye,
  Moon,
  RotateCcw,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  BAYS,
  FACILITIES,
  initialBase,
  furnishedBase,
  reduceBase,
  canPlace,
  type FacilityKind,
} from './base-state';
import type { BaseView } from './base-scene';
import './base.css';
const Scene = lazy(() => import('./base-scene'));
export default function BasePrototype({
  refined = false,
}: {
  refined?: boolean;
}) {
  const [state, dispatch] = useReducer(reduceBase, refined, (v) =>
      v ? furnishedBase() : initialBase(),
    ),
    [view, setView] = useState<BaseView>('cabin'),
    [selected, setSelected] = useState<number | null>(1),
    [draft, setDraft] = useState<FacilityKind | null>(null),
    [slot, setSlot] = useState<number | null>(null),
    [door, setDoor] = useState(false),
    [emergency, setEmergency] = useState(false),
    [reduced, setReduced] = useState(false),
    [confirm, setConfirm] = useState(false),
    [sleeping, setSleeping] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches),
    );
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    if (!sleeping) return;
    const id = setTimeout(() => setSleeping(false), 1000);
    return () => clearTimeout(id);
  }, [sleeping]);
  const selectedModule = state.modules.find((m) => m.id === selected),
    def = selectedModule ? FACILITIES[selectedModule.kind] : null,
    occupied = state.modules.reduce((n, m) => n + FACILITIES[m.kind].slots, 0),
    error = draft && slot !== null ? canPlace(state, draft, slot) : null;
  function select(id: number) {
    setSelected(id);
    setDraft(null);
    setSlot(null);
    setConfirm(false);
  }
  function startBuild(kind: FacilityKind) {
    setView('build');
    setDraft(kind);
    setSlot(null);
    setConfirm(false);
  }
  function build() {
    if (!draft || slot === null || error) return;
    dispatch({ type: 'build', kind: draft, slot });
    setSelected(state.serial);
    setDraft(null);
    setSlot(null);
  }
  return (
    <main className="base-app">
      <header className="base-header">
        <a href="/art/?mode=3d" className="base-brand">
          f9 <span>幸存者电梯</span>
        </a>
        <nav>
          <a href="/art/?mode=3d">
            <ArrowLeft />
            战斗试验
          </a>
          <span>基地 / {refined ? 'LUX3D' : '3D'}</span>
          <a href={refined ? '/art/base' : '/art/base/refined'}>
            {refined ? '对照原版' : 'Lux3D 精修版'}
          </a>
          <a href="/art/maintenance">维护成本评估</a>
        </nav>
        <span className="base-header-code">
          CABIN 09 / {refined ? 'REV.03' : 'REV.02'}
        </span>
      </header>
      <section className="base-status">
        <div>
          <b>第 {String(state.day).padStart(2, '0')} 日</b>
          <span>返回之后，重新准备。</span>
        </div>
        <div>
          <span>
            配额 <strong>{state.stock.quota}</strong>
          </span>
          <span>
            精力{' '}
            <strong>
              {state.stock.stamina}
              <small> / 100</small>
            </strong>
          </span>
          <span>
            补给 <strong>{state.stock.supply}</strong>
          </span>
          <span>
            零件 <strong>{state.stock.scrap}</strong>
          </span>
        </div>
      </section>
      <div className="base-workspace">
        <section
          className={`base-viewport ${sleeping ? 'base-sleeping' : ''}`}
          aria-label="三维电梯基地"
        >
          <Suspense
            fallback={<div className="base-loading">正在接通舱内照明…</div>}
          >
            <Scene
              refined={refined}
              state={state}
              view={view}
              selected={selected}
              draft={draft}
              slot={slot}
              door={door}
              emergency={emergency}
              reduced={reduced}
              onSelect={select}
              onSlot={setSlot}
              onDoor={() => setDoor((v) => !v)}
            />
          </Suspense>
          <div className="base-scene-heading">
            <span>电梯生活舱</span>
            <small>
              {view === 'build'
                ? '建造视角 / 模块导轨'
                : view === 'focus'
                  ? '设施观察 / 局部细节'
                  : '舱内视角 / 有限环视'}
            </small>
          </div>
          <div className="base-views" aria-label="镜头视角">
            <button
              aria-pressed={view === 'cabin'}
              onClick={() => setView('cabin')}
            >
              <Eye />
              舱内
            </button>
            <button
              aria-pressed={view === 'build'}
              onClick={() => setView('build')}
            >
              <Box />
              建造
            </button>
            <button
              aria-pressed={view === 'focus'}
              disabled={!selectedModule}
              onClick={() => setView('focus')}
            >
              近看
            </button>
          </div>
          {draft && (
            <div className="base-placement-hint">
              <b>{FACILITIES[draft].name}</b>
              <span>选择 {FACILITIES[draft].slots} 个同侧连续槽位的起点</span>
              <button
                onClick={() => {
                  setDraft(null);
                  setSlot(null);
                }}
              >
                取消
              </button>
            </div>
          )}
          <div className="base-scene-footer">
            <span>拖动环视 · 滚轮缩放 · 点击设施查看</span>
            <button onClick={() => setEmergency((e) => !e)}>
              {emergency ? '恢复日常照明' : '查看应急照明'}
            </button>
          </div>
          {sleeping && (
            <div className="base-sleep-overlay">
              <span>升降机仍在运行</span>
              <b>第 {state.day} 日</b>
            </div>
          )}
        </section>
        <aside className="base-console">
          <div className="base-console-title">
            <span>舱内管理</span>
            <small>
              {occupied} / {state.expanded ? 8 : 6} 槽位
            </small>
          </div>
          <div className="base-resource-grid">
            {[
              ['电力', state.stock.power],
              ['燃料', state.stock.fuel],
              ['药品', state.stock.medicine],
              ['电荷', state.stock.charge],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="base-installed" aria-label="已建造设施">
            {state.modules.map((m) => (
              <button
                key={m.id}
                aria-pressed={selected === m.id && !draft}
                onClick={() => select(m.id)}
              >
                <span>{FACILITIES[m.kind].code}</span>
                <div>
                  <b>{FACILITIES[m.kind].name}</b>
                  <small>
                    {BAYS[m.slot].label} · Mk.{m.level} ·{' '}
                    {m.used ? '今日已用' : '可使用'}
                  </small>
                </div>
                <i>↗</i>
              </button>
            ))}
          </div>
          {draft ? (
            <section className="base-detail">
              <span className="base-eyebrow">INSTALL / 安装预览</span>
              <h1>{FACILITIES[draft].name}</h1>
              <p>{FACILITIES[draft].desc}</p>
              <div className="base-detail-line">
                <span>建造消耗</span>
                <b>{FACILITIES[draft].cost} 零件</b>
              </div>
              <div className="base-bay-picker" aria-label="选择建造起点">
                {BAYS.filter((b) => state.expanded || b.id < 6).map((b) => (
                  <button
                    key={b.id}
                    title={canPlace(state, draft, b.id) ?? '可建造'}
                    disabled={!!canPlace(state, draft, b.id)}
                    aria-pressed={slot === b.id}
                    onClick={() => setSlot(b.id)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <p className="base-hint">
                {error ||
                  (slot === null
                    ? '选择一个可用位置，查看实体预览。'
                    : `将占用从 ${BAYS[slot].label} 开始的 ${FACILITIES[draft].slots} 格。`)}
              </p>
              <button
                className="base-primary"
                disabled={slot === null || !!error}
                onClick={build}
              >
                确认建造
              </button>
            </section>
          ) : selectedModule && def ? (
            <section className="base-detail">
              <span className="base-eyebrow">
                {def.code} / {BAYS[selectedModule.slot].label} / Mk.
                {selectedModule.level}
              </span>
              <h1>{def.name}</h1>
              <p>{def.desc}</p>
              <div className="base-detail-line">
                <span>运行配方</span>
                <b>{def.action}</b>
              </div>
              <button
                className="base-primary"
                disabled={selectedModule.used}
                onClick={() => dispatch({ type: 'use', id: selectedModule.id })}
              >
                <Zap />
                {selectedModule.used ? '今日已使用' : '运行设施'}
              </button>
              <div className="base-secondary-actions">
                <button
                  disabled={
                    selectedModule.level >= 3 ||
                    state.stock.scrap < selectedModule.level * 4
                  }
                  onClick={() =>
                    dispatch({ type: 'upgrade', id: selectedModule.id })
                  }
                >
                  <Wrench />
                  {selectedModule.level >= 3
                    ? '外观已满级'
                    : `升级外观 · ${selectedModule.level * 4} 零件`}
                </button>
                <button onClick={() => setConfirm(!confirm)}>拆除</button>
              </div>
              {confirm && (
                <div className="base-demolish">
                  <p>
                    拆除后返还 {Math.floor(def.cost / 2)} 零件，释放 {def.slots}{' '}
                    格。今日使用记录会保留。
                  </p>
                  <button
                    onClick={() => {
                      dispatch({ type: 'demolish', id: selectedModule.id });
                      setSelected(null);
                      setConfirm(false);
                    }}
                  >
                    确认拆除
                  </button>
                  <button onClick={() => setConfirm(false)}>取消</button>
                </div>
              )}
            </section>
          ) : (
            <section className="base-detail">
              <h1>留下生活的痕迹</h1>
              <p>选择一台设施，或安装新的模块。</p>
            </section>
          )}
          <section className="base-catalog">
            <h2>添加设施</h2>
            <div>
              {(Object.keys(FACILITIES) as FacilityKind[]).map((kind) => (
                <button
                  key={kind}
                  disabled={state.modules.some((m) => m.kind === kind)}
                  onClick={() => startBuild(kind)}
                >
                  <b>{FACILITIES[kind].name}</b>
                  <small>
                    {FACILITIES[kind].slots} 格 / {FACILITIES[kind].cost} 零件
                  </small>
                </button>
              ))}
            </div>
            <button
              className="base-expand"
              disabled={state.expanded || state.stock.scrap < 8}
              onClick={() => {
                dispatch({ type: 'expand' });
                setView('build');
              }}
            >
              <Expand />
              {state.expanded ? '服务导轨已展开' : '展开服务导轨 · 8 零件'}
            </button>
          </section>
        </aside>
      </div>
      <footer className="base-bottom">
        <output>{state.message}</output>
        <div>
          <button onClick={() => setDoor((v) => !v)}>
            <DoorOpen />
            {door ? '关闭舱门' : '查看舱外'}
          </button>
          <button
            disabled={state.stock.quota <= 1}
            onClick={() => {
              dispatch({ type: 'sleep' });
              setDoor(false);
              setSleeping(true);
            }}
          >
            <Moon />
            休息至次日
          </button>
          <button
            aria-label="重置基地沙盘"
            title="重置基地沙盘"
            onClick={() => {
              dispatch({ type: 'reset', furnished: refined });
              setSelected(1);
              setDraft(null);
              setSlot(null);
              setConfirm(false);
              setView('cabin');
              setDoor(false);
            }}
          >
            <RotateCcw />
          </button>
        </div>
      </footer>
      <div className="base-note">
        <p>
          独立美术沙盘 · 建造及生产数值用于演示 · 升级只展示外观阶段 ·
          不读写冒险存档
        </p>
        <label>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
          />
          减少动态
        </label>
      </div>
    </main>
  );
}
