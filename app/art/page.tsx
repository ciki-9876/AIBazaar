'use client';
import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Maximize2,
} from 'lucide-react';
import { archetypeDuel, ARCHETYPES } from '@/lib/demo-archetypes';
import { simulateDuel, type FighterCard } from '@/lib/demo-combat';
import { cardDef, type School } from '@/lib/demo-cards';
import { ATLAS, LANES } from './art-data';
import FlatBattle from './flat-battle';
const RoomBattle = lazy(() => import('./room-battle'));

export default function ArtLab() {
  const [mode, setMode] = useState<'2d' | '3d'>('3d');
  const [school, setSchool] = useState<School>('erosion');
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const [entry, setEntry] = useState(0),
    [countdown, setCountdown] = useState(0),
    [view, setView] = useState<'tactical' | 'seat'>('tactical');
  const [selected, setSelected] = useState<FighterCard | null>(null),
    [sound, setSound] = useState(false),
    [reduced, setReduced] = useState(false);
  const duel = useMemo(() => archetypeDuel('rush', school), [school]);
  const result = useMemo(() => simulateDuel(duel), [duel]);
  const fr = result.frames[cursor] ?? result.frames[0];
  const finished = cursor >= result.frames.length - 1;
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const m = new URLSearchParams(window.location.search).get('mode');
      if (m === '2d') setMode('2d');
    });
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    if (!playing || finished || countdown) return;
    const id = setInterval(
      () => setCursor((c) => Math.min(c + 1, result.frames.length - 1)),
      250 / speed,
    );
    return () => clearInterval(id);
  }, [playing, finished, speed, countdown, result.frames.length]);
  useEffect(() => {
    if (!countdown) return;
    const id = setTimeout(() => {
      setCountdown((c) => c - 1);
      if (countdown === 1) {
        setView('tactical');
        setPlaying(true);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [countdown]);
  useEffect(() => {
    if (!sound || !playing || !fr.hits.length || countdown) return;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(
      fr.hits.some((h) => h.healthLoss) ? 85 : 230,
      ctx.currentTime,
    );
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
    const id = setTimeout(() => void ctx.close(), 180);
    return () => {
      clearTimeout(id);
      void ctx.close();
    };
  }, [cursor, sound, playing, countdown, fr.hits]);
  function reset() {
    setPlaying(false);
    setCursor(0);
    setCountdown(0);
    setView('tactical');
  }
  function changeMode(m: '2d' | '3d') {
    setMode(m);
    setCountdown(0);
    setView('tactical');
    const u = new URL(window.location.href);
    u.searchParams.set('mode', m);
    history.replaceState(null, '', u);
  }
  function start() {
    setCursor(0);
    setPlaying(false);
    setEntry((e) => e + 1);
    setView('tactical');
    setCountdown(reduced ? 3 : mode === '3d' ? 6 : 3);
  }
  const def = selected ? cardDef(selected.id) : null;
  return (
    <main className={`art-lab mode-${mode} ${reduced ? 'art-reduced' : ''}`}>
      <header className="art-header">
        <Link href="/" className="art-logo">
          f9<span>美术试验 / 01</span>
        </Link>
        <nav aria-label="美术方案">
          <button aria-pressed={mode === '2d'} onClick={() => changeMode('2d')}>
            <i>A</i> 2D · 炭笔档案
          </button>
          <button aria-pressed={mode === '3d'} onClick={() => changeMode('3d')}>
            <i>B</i> 3D · 工业异象
          </button>
        </nav>
        <Link className="art-doc-link" href="/art/base">
          3D 电梯基地
        </Link>
        <Link className="art-doc-link" href="/art/direction">
          完整方案 <ArrowUpRight />
        </Link>
      </header>
      <section className="art-title">
        <div>
          <span className="art-kicker">
            ART DIRECTION /{' '}
            {mode === '2d' ? 'THIS WAR OF MINE' : 'PACIFIC DRIVE'}
          </span>
          <h1>
            {mode === '2d'
              ? '黑暗里，每件东西都有分量。'
              : '坐下来，听见机器仍在呼吸。'}
          </h1>
        </div>
        <div className="art-location">
          <b>F09 / 封锁检查站</b>
          <span>同一场战斗 · 切换风格保留进度</span>
        </div>
      </section>
      <section
        className="art-stage"
        aria-label={`${mode === '2d' ? '二维炭笔' : '三维桌面'}战斗原型`}
      >
        {mode === '2d' ? (
          <FlatBattle
            duel={duel}
            frame={fr}
            selected={selected?.uid}
            onSelect={setSelected}
          />
        ) : (
          <Suspense
            fallback={<div className="art-loading">正在接通检查站照明…</div>}
          >
            <RoomBattle
              duel={duel}
              frame={fr}
              entry={entry}
              countdown={countdown}
              view={view}
              reduced={reduced}
              selected={selected?.uid}
              onSelect={setSelected}
            />
          </Suspense>
        )}
        <div className="art-stage-top">
          <span>
            <i />
            {mode === '2d'
              ? '炭笔 / 纸张 / 层叠空间'
              : '低多边形 / 搪瓷 / 体积空间'}
          </span>
          <div>
            <button
              title={sound ? '关闭声音' : '开启声音'}
              aria-label={sound ? '关闭声音' : '开启声音'}
              onClick={() => setSound(!sound)}
            >
              {sound ? <Volume2 /> : <VolumeX />}
            </button>
            <button
              aria-label="放大战斗区域"
              title="放大战斗区域"
              onClick={(e) => {
                const stage = e.currentTarget.closest('.art-stage');
                if (document.fullscreenElement) void document.exitFullscreen();
                else void stage?.requestFullscreen();
              }}
            >
              <Maximize2 />
            </button>
          </div>
        </div>
        <div className="art-hosts">
          {[0, 1].map((side) => (
            <div key={side} className={`art-host side-${side}`}>
              <span>
                {side
                  ? '封锁者 / ' + ARCHETYPES.find((a) => a.id === school)?.name
                  : '幸存者 / 速攻突破'}
              </span>
              <strong>
                {Math.max(0, Math.ceil(fr.hp[side]))}
                <small> / 300</small>
              </strong>
              <div>
                <i style={{ width: `${Math.max(0, fr.hp[side]) / 3}%` }} />
              </div>
            </div>
          ))}
        </div>
        {!!countdown && (
          <output className="art-countdown">
            <span>{countdown > 3 ? '入席 · 展开战术桌' : '协议已锁定'}</span>
            <b>{countdown > 3 ? 'F9' : countdown}</b>
            <button
              onClick={() => {
                setCountdown(0);
                setPlaying(true);
                setView('tactical');
              }}
            >
              跳过入场
            </button>
          </output>
        )}
        {finished && !countdown && (
          <output className="art-outcome">
            <span>封锁协议 / 结算</span>
            <h2>
              {result.winner === 0
                ? '通路已打开'
                : result.winner === 1
                  ? '撤离信号中断'
                  : '双方停止响应'}
            </h2>
            <p>
              {result.duration.toFixed(2)} 秒 ·{' '}
              {result.winner === 0
                ? '屏障破损留下，物品继续运转。'
                : '回看第一处破障，调整下一次构筑。'}
            </p>
            <button onClick={start}>重新对战</button>
          </output>
        )}
        <div className="art-stage-bottom">
          <span>
            {LANES.map((l, i) => (
              <em key={l}>
                {['I', 'II', 'III'][i]}{' '}
                {mode === '3d' ? ['左路', '中路', '右路'][i] : l}
              </em>
            ))}
          </span>
          {mode === '3d' ? (
            <button
              onClick={() => {
                setView((v) => (v === 'tactical' ? 'seat' : 'tactical'));
                setPlaying(false);
                setCountdown(0);
              }}
            >
              {view === 'tactical' ? '切至入席视角' : '返回战术俯视'}
            </button>
          ) : (
            <span>点击物件卡，查看档案</span>
          )}
          <b>
            {fr.time.toFixed(2)} <small>秒</small>
          </b>
        </div>
      </section>
      <section className="art-transport" aria-label="战斗回放控制">
        <button
          className="art-primary"
          onClick={() => {
            if (finished || (!cursor && !playing && !countdown)) start();
            else {
              setCountdown(0);
              setPlaying(!playing);
            }
          }}
        >
          {playing && !finished ? <Pause /> : <Play />}
          {playing && !finished
            ? '暂停'
            : countdown
              ? '立即开战'
              : cursor && !finished
                ? '继续'
                : '开始对战'}
        </button>
        <button onClick={reset} title="重置战斗" aria-label="重置战斗">
          <RotateCcw />
        </button>
        <button
          onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
        >
          {speed}×
        </button>
        <input
          type="range"
          aria-label="战斗回放进度"
          min={0}
          max={result.frames.length - 1}
          value={cursor}
          onChange={(e) => {
            setPlaying(false);
            setCountdown(0);
            setCursor(+e.target.value);
            setView('tactical');
          }}
        />
        <time>
          {fr.time.toFixed(1)} / {result.duration.toFixed(1)}s
        </time>
        <label>
          对手{' '}
          <select
            value={school}
            onChange={(e) => {
              setSchool(e.target.value as School);
              reset();
              setSelected(null);
            }}
          >
            {ARCHETYPES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="art-underboard">
        <div className="art-inspector">
          {selected && def ? (
            <>
              <div
                className="art-object-large"
                style={{
                  backgroundPosition: `${(ATLAS[selected.id] % 3) * 50}% ${Math.floor(ATLAS[selected.id] / 3) * 50}%`,
                }}
              />
              <div>
                <span className="art-kicker">
                  物件档案 /{' '}
                  {selected.rarity === 0
                    ? '普通'
                    : selected.rarity === 1
                      ? '罕见'
                      : '稀有'}{' '}
                  · 基础 · Lv.0
                </span>
                <h2>{def.name}</h2>
                <p>
                  {def.effect} 占 {def.size} 格 · 基础冷却 {def.cd}s。
                </p>
              </div>
              <button
                aria-label="关闭物件档案"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </>
          ) : (
            <>
              <span className="art-number">{mode === '2d' ? 'A' : 'B'}</span>
              <div>
                <h2>
                  {mode === '2d' ? '让废弃物成为主角' : '让电梯成为真实的居所'}
                </h2>
                <p>
                  {mode === '2d'
                    ? '场景退入炭灰，卡面保留纸纤维与工具剪影。伤害用短促划痕，破障留下无法抹去的缺口。'
                    : '实体桌面、带厚度的物件卡、检修灯和对面的封锁者。入席后镜头升起，三路与弹道清楚展开。'}
                </p>
              </div>
            </>
          )}
        </div>
        <div className="art-events">
          <span className="art-kicker">当前结算 / {fr.time.toFixed(2)}s</span>
          <p aria-live={playing ? 'off' : 'polite'}>
            {fr.log.slice(-2).join(' ') ||
              '双方屏障就绪。冷却完成后发射，弹道到达时结算。'}
          </p>
        </div>
      </section>
      <footer className="art-footer">
        <p>表现原型 · 使用当前 F9 战斗引擎 · 卡牌不被击毁 · 屏障不能重建</p>
        <label>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
          />
          减少动态
        </label>
        <Link href="/art/direction">从世界到细节，阅读两套完整设计 →</Link>
      </footer>
    </main>
  );
}
