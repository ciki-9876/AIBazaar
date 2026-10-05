'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ChevronRight,
  Droplets,
  HeartHandshake,
  Pause,
  Play,
  RotateCcw,
  Search,
  Shield,
  Swords,
  X,
} from 'lucide-react';
import {
  createEncounter,
  stepEncounter,
  playerCommand,
  encounterRequest,
  applyEncounterReply,
  canSee,
  PROFILES,
  SCENARIOS,
} from '../../../lib/survival-ai/encounter';
import type {
  Encounter,
  EncounterRequest,
  EncounterReply,
  Intent,
  Profile,
  Scenario,
} from '../../../lib/survival-ai/encounter';
import { ITEM_PROPERTIES } from '../../../lib/survival-item-traits';
import { itemName, itemCount, brainExperience } from '../../../lib/survival-stacks';
import { cargoLayout, footprint } from '../../../lib/survival-cargo';
import { ELEVATOR } from '../../../lib/survival-world';
import { searchDuration } from '../../../lib/survival-room';
import type { Item, Point } from '../../../lib/survival-room';
import { sitePath } from '../../../lib/site-path';
import EncounterScene from './scene';
// oxlint-disable-next-line import/default -- Vite's worker wrapper supplies the constructor export.
import DecisionWorker from './decision.worker.ts?worker';
import { OpeningAudio } from '../opening-audio';
import './demo.css';

const SEED = 20261003;
type Trace = {
  tick: number;
  request: EncounterRequest;
  reply: EncounterReply;
  receipt: string;
};
type Recording = {
  schema: string;
  seed: number;
  profile: Profile;
  scenario: Scenario;
  sessionId: string;
  commands: { tick: number; intent: Intent | { type: 'help' } }[];
  inputs: { tick: number; input: Point }[];
  decisions: Trace[];
};
const recordingFor = (s: Encounter): Recording => ({
  schema: 'f9-encounter-replay-v1',
  seed: s.seed,
  profile: s.profile,
  scenario: s.scenario,
  sessionId: s.sessionId,
  commands: [],
  inputs: [],
  decisions: [],
});
const glyphs: Record<string, string> = {
  phone: '▤',
  flashlight: '╱',
  water: '◈',
  bread: '▰',
  food: '▰',
  scrap: '⚙',
  'lift-material': '✦',
  core: '▣',
  capacitor: '⊞',
  medicine: '✚',
};

export function MiniMap({ state }: { state: Encounter }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!,
      a = state.actors[0],
      scale = 5;
    ctx.fillStyle = '#091215';
    ctx.fillRect(0, 0, 155, 160);
    for (let z = 46; z < 78; z++)
      for (let x = 34; x < 65; x++) {
        const idx = z * 96 + x;
        if (!a.fog.explored[idx]) continue;
        ctx.fillStyle = a.fog.visible[idx] ? '#64706a' : '#2c3838';
        ctx.fillRect((x - 34) * scale, (z - 46) * scale, scale, scale);
      }
    ctx.fillStyle = '#101a1c';
    state.world.obstacles.forEach((o) => {
      if (a.fog.explored[Math.floor(o.z) * 96 + Math.floor(o.x)])
        ctx.fillRect(
          (o.x - 34 - o.w / 2) * scale,
          (o.z - 46 - o.d / 2) * scale,
          o.w * scale,
          o.d * scale,
        );
    });
    const dot = (p: Point, color: string, size: number) => {
      ctx.fillStyle = color;
      ctx.fillRect(
        (p.x - 34) * scale - size / 2,
        (p.z - 46) * scale - size / 2,
        size,
        size,
      );
    };
    dot(ELEVATOR, '#d9bd80', 7);
    dot(a, '#f2e8cb', 5);
    const b = state.actors[1];
    if (b.status === 'active' && canSee(state, a, b))
      dot(b, PROFILES[state.profile].color, 5);
    state.enemies
      .filter((e) => canSee(state, a, e))
      .forEach((e) => dot(e, '#b7685b', 3));
  }, [state]);
  return (
    <canvas width={155} height={160} ref={ref} aria-label="个人探索小地图" />
  );
}
export function Meter({
  name,
  value,
  color,
}: {
  name: string;
  value: number;
  color: string;
}) {
  return (
    <div className="enc-meter">
      <span>{name}</span>
      <div>
        <i style={{ width: value + '%', background: color }} />
        <b />
      </div>
      <em>{Math.ceil(value)}</em>
    </div>
  );
}
export default function EncounterDemo() {
  const [view, setView] = useState(() =>
    createEncounter(SEED, 'ally', 'water', 'demo:0'),
  );
  const state = useRef(view),
    serial = useRef(0),
    recording = useRef(recordingFor(view));
  const [paused, setPaused] = useState(true),
    pausedRef = useRef(true);
  const [ready, setReady] = useState(false),
    readyRef = useRef(false);
  const [debug, setDebug] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const [stats, setStats] = useState({
    ms: 0,
    count: 0,
    version: '加载本地模型',
    reason: '',
    top: [] as { label: string; score: number }[],
  });
  const [error, setError] = useState('');
  const worker = useRef<Worker | null>(null),
    pending = useRef<EncounterRequest | null>(null),
    keys = useRef(new Set<string>());
  const audio = useRef<OpeningAudio | null>(null),
    heard = useRef(0);
  const togglePause = useCallback((value?: boolean) => {
    pausedRef.current = value ?? !pausedRef.current;
    keys.current.clear();
    setPaused(pausedRef.current);
    if (!pausedRef.current) {
      audio.current ??= new OpeningAudio();
      audio.current.start();
    }
    audio.current?.pause(pausedRef.current);
  }, []);
  const command = useCallback((intent: Intent | { type: 'help' }) => {
    if (
      pausedRef.current ||
      !readyRef.current ||
      state.current.actors[0].status !== 'active'
    )
      return;
    recording.current.commands.push({ tick: state.current.tick, intent });
    state.current = playerCommand(state.current, intent);
    setView(state.current);
  }, []);
  const restart = useCallback(
    (profile: Profile, scenario: Scenario) => {
      const next = createEncounter(
        SEED,
        profile,
        scenario,
        'demo:' + ++serial.current,
      );
      state.current = next;
      recording.current = recordingFor(next);
      setView(next);
      setSelected(null);
      heard.current = 0;
      // A pending old-session reply will be rejected. Keep backpressure until it returns.
      togglePause(false);
      setStats((s) => ({ ...s, count: 0, reason: '', top: [] }));
    },
    [togglePause],
  );
  useEffect(() => {
    const w = new DecisionWorker();
    worker.current = w;
    w.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'ready') {
        readyRef.current = true;
        setReady(true);
        setStats((s) => ({ ...s, version: data.version }));
        return;
      }
      if (data.type === 'error') {
        setError(data.message);
        pending.current = null;
        return;
      }
      if (data.type === 'decision' && pending.current) {
        const request = pending.current;
        pending.current = null;
        const applied = applyEncounterReply(state.current, request, data.reply);
        if (request.sessionId === state.current.sessionId)
          recording.current.decisions.push({
            tick: state.current.tick,
            request,
            reply: data.reply,
            receipt: applied.reason,
          });
        state.current = applied.state;
        setStats((s) => ({
          ...s,
          ms: data.milliseconds,
          count: s.count + Number(applied.reason === 'applied'),
          reason: applied.reason,
          top: data.top,
        }));
        setView(state.current);
      }
    };
    w.onerror = () => {
      setError('本地决策 Worker 加载失败，请刷新。');
      pending.current = null;
    };
    return () => {
      w.terminate();
      worker.current = null;
      readyRef.current = false;
      audio.current?.close();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    let raf = 0,
      last = performance.now(),
      accumulator = 0;
    function frame(now: number) {
      accumulator += Math.min((now - last) / 1000, 0.1);
      last = now;
      if (
        !pausedRef.current &&
        readyRef.current &&
        state.current.actors[0].status === 'active'
      ) {
        while (accumulator >= 1 / 30) {
          const k = keys.current;
          const input = {
            x:
              Number(k.has('d') || k.has('arrowright')) -
              Number(k.has('a') || k.has('arrowleft')),
            z:
              Number(k.has('s') || k.has('arrowdown')) -
              Number(k.has('w') || k.has('arrowup')),
          };
          recording.current.inputs.push({ tick: state.current.tick, input });
          state.current = stepEncounter(state.current, input);
          accumulator -= 1 / 30;
          const s = state.current;
          for (const fx of s.effects)
            if (fx.id > heard.current) {
              if (
                fx.kind === 'beam' &&
                (canSee(s, s.actors[0], fx.from) ||
                  canSee(s, s.actors[0], fx.to))
              )
                audio.current?.skill(
                  fx.color === '#86c4d5' ? 'phone-beam' : 'torch-beam',
                );
              heard.current = Math.max(heard.current, fx.id);
            }
          if (
            s.tick % 15 === 0 &&
            s.actors[1].status === 'active' &&
            !pending.current
          ) {
            const request = encounterRequest(s);
            pending.current = request;
            worker.current?.postMessage(request);
          }
          if (s.tick % 4 === 0 || s.actors[0].status !== 'active') setView(s);
        }
      } else accumulator = 0;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const down = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest(
          'select,input,textarea,[contenteditable=true]',
        )
      )
        return;
      const key = event.key.toLowerCase();
      if (
        [
          'w',
          'a',
          's',
          'd',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          'e',
          'h',
          ' ',
          'escape',
        ].includes(key)
      )
        event.preventDefault();
      if (key === 'escape' && !event.repeat) {
        togglePause();
        return;
      }
      keys.current.add(key);
      if (key === 'e' && !event.repeat) {
        const s = state.current,
          a = s.actors[0];
        if (Math.hypot(a.x - ELEVATOR.x, a.z - ELEVATOR.z) < 2)
          command({ type: 'extract' });
        else {
          const nearest = s.caches
            .filter(
              (c) =>
                c.contents.length &&
                canSee(s, a, c) &&
                Math.hypot(c.x - a.x, c.z - a.z) < 2,
            )
            .sort(
              (x, y) =>
                Math.hypot(x.x - a.x, x.z - a.z) -
                Math.hypot(y.x - a.x, y.z - a.z),
            )[0];
          if (nearest) command({ type: 'search', cacheId: nearest.id });
        }
      }
      if (key === 'h' && !event.repeat) command({ type: 'help' });
    };
    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.key.toLowerCase());
    };
    const blur = () => togglePause(true);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [command, togglePause]);
  function download() {
    const blob = new Blob([JSON.stringify(recording.current)], {
        type: 'application/json',
      }),
      url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'f9-encounter-' + view.profile + '-' + view.scenario + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  const a = view.actors[0],
    b = view.actors[1],
    profile = PROFILES[view.profile];
  const scenario = SCENARIOS.find((row) => row.id === view.scenario)!;
  const item = a.bag.find((row) => row.uid === selected),
    seen = b.status === 'active' && canSee(view, a, b);
  const knownTerminal =
    canSee(view, a, b) ||
    view.events.some(
      (row) =>
        row.actorId === 'rival' &&
        row.visibleToPlayer &&
        (row.text.includes('返回了电梯') || row.text.includes('倒下了')),
    );
  const rivalLabel =
    b.status === 'extracted' && knownTerminal
      ? '已撤离'
      : b.status === 'dead' && knownTerminal
        ? '已倒下'
        : seen
          ? b.label + ' · 精神 ' + Math.ceil(b.hp)
          : '不在视野内';
  const busyCache = view.caches.find((c) => c.id === a.searching);
  const visibleEvents = view.events
    .filter((row) => row.visibleToPlayer)
    .slice(-4);
  const isOver = a.status !== 'active';
  return (
    <main className="enc-demo">
      <header className="enc-header">
        <a href={sitePath('/')} className="enc-brand">
          <span>F9</span>
          <div>
            安泊 · 竞争者实验<small>FIRST ENCOUNTER / 01</small>
          </div>
        </a>
        <div className="enc-header-status">
          <i /> 本地推理 · 零 API 调用 <span>SEED {SEED}</span>
        </div>
        <div className="enc-tools">
          <a href={sitePath('/survival/ai-mail')}>电梯邮箱</a>
          <button
            onClick={() => setDebug(!debug)}
            className={debug ? 'active' : ''}
          >
            导演观察
          </button>
          <button onClick={download} title="导出决策、输入和回放">
            <ArrowDownToLine />
          </button>
          <button
            onClick={() => restart(view.profile, view.scenario)}
            title="相同种子重开"
          >
            <RotateCcw />
          </button>
          <button onClick={() => togglePause()} title="暂停 / 继续">
            {paused ? <Play /> : <Pause />}
          </button>
        </div>
      </header>
      <aside className="enc-left">
        <div className="enc-section-title">
          <span>01</span> 遭遇谁
        </div>
        <div className="enc-profiles">
          {(
            Object.entries(PROFILES) as [Profile, (typeof PROFILES)[Profile]][]
          ).map(([id, row]) => {
            const Icon =
              id === 'ally'
                ? HeartHandshake
                : id === 'broker'
                  ? Shield
                  : Swords;
            return (
              <button
                key={id}
                className={
                  'enc-profile ' + (view.profile === id ? 'selected' : '')
                }
                style={{ '--person': row.color } as React.CSSProperties}
                onClick={() => restart(id, view.scenario)}
              >
                <Icon />
                <div>
                  <b>{row.name}</b>
                  <span>{row.title}</span>
                  <p>{row.description}</p>
                </div>
                {view.profile === id && <ChevronRight />}
              </button>
            );
          })}
        </div>
        <div className="enc-section-title">
          <span>02</span> 冲突局面
        </div>
        <nav className="enc-scenarios">
          {SCENARIOS.map((row, i) => (
            <button
              key={row.id}
              className={view.scenario === row.id ? 'selected' : ''}
              onClick={() => restart(view.profile, row.id)}
            >
              <small>{String(i + 1).padStart(2, '0')}</small>
              {row.title}
              {view.scenario === row.id && <ChevronRight />}
            </button>
          ))}
        </nav>
        <div className="enc-rule">
          <Search />
          <p>{scenario.rule}</p>
        </div>
        <div className="enc-model-note">
          学习型战术原型
          <br />
          合成样例训练，尚非 Laya / 大语言模型。
        </div>
      </aside>
      <section className="enc-arena">
        <EncounterScene key={view.sessionId} state={state} command={command} />
        <div className="enc-room-title">
          <small>维保廊 / SHARED ROOM</small>
          <h1>{scenario.title}</h1>
          <p>{scenario.description}</p>
        </div>
        <div
          className="enc-companion"
          style={{ '--person': profile.color } as React.CSSProperties}
        >
          <span className="enc-dot" />
          {profile.name}
          <small>{rivalLabel}</small>
        </div>
        {(busyCache || a.extraction > 0) && (
          <div className="enc-progress">
            <span>{a.extraction ? '返回电梯' : '翻找中'}</span>
            <div>
              <i
                style={{
                  width:
                    (a.extraction
                      ? a.extraction / 66
                      : a.searchTicks / searchDuration(busyCache!, 100)) *
                      100 +
                    '%',
                }}
              />
            </div>
          </div>
        )}
        <div className="enc-map">
          <MiniMap state={view} />
          <small>已探索区域 · 独立视野</small>
        </div>
        <div className="enc-controls">
          <span>
            <kbd>WASD</kbd> 移动
          </span>
          <span>
            <kbd>E</kbd> 翻找 / 门前撤离
          </span>
          <span>
            <kbd>H</kbd> 求水
          </span>
          <span>点击地面移动，点击容器翻找</span>
        </div>
        {error && <div className="enc-error">{error}</div>}
        {(paused || isOver) && (
          <div className="enc-overlay">
            <div className="enc-modal">
              <small>
                {isOver
                  ? 'ENCOUNTER COMPLETE'
                  : 'ROOM 02 / AUTONOMOUS COMPETITOR'}
              </small>
              <h2>
                {a.status === 'dead'
                  ? '你撑不住了'
                  : a.status === 'extracted'
                    ? '带着物资归来'
                    : view.tick
                      ? '暂时停留'
                      : '你不是唯一的幸存者'}
              </h2>
              <p>
                {a.status === 'dead'
                  ? '安泊将你拖回了电梯。普通行囊留在原地。'
                  : a.status === 'extracted'
                    ? '你带回了 ' +
                      a.bag.length +
                      ' 件物品，其中脑浆可提供 ' +
                      brainExperience(a.bag) +
                      ' 点升级经验。'
                    : '竞争者拥有自己的视野、行囊和选择。你的行动会改变这次遭遇。'}
              </p>
              <button
                className="enc-primary"
                disabled={!ready}
                onClick={() =>
                  isOver
                    ? restart(view.profile, view.scenario)
                    : togglePause(false)
                }
              >
                {ready
                  ? isOver
                    ? '再试一次'
                    : view.tick
                      ? '继续探索'
                      : '进入房间'
                  : '加载模型…'}
                <ChevronRight />
              </button>
              <small className="enc-modal-foot">
                自动攻击 · 共享物资 · 真实转移
              </small>
            </div>
          </div>
        )}
      </section>
      <aside className="enc-right">
        <div className="enc-section-title">
          <span>你</span> 身体状态
        </div>
        <Meter name="精神" value={a.hp} color="#c5b99a" />
        <Meter name="饱食" value={a.food} color="#abbf98" />
        <Meter name="饮水" value={a.water} color="#84a9ae" />
        <div className="enc-actions">
          <button onClick={() => command({ type: 'help' })}>
            <Droplets />
            求水
          </button>
          <button
            disabled={!seen}
            className="danger"
            onClick={() => command({ type: 'engage', actorId: 'rival' })}
          >
            <Swords />
            攻击对方
          </button>
        </div>
        <div className="enc-section-title">
          <span>10</span> 装备
        </div>
        <div className="enc-equipment">
          {Array.from({ length: 10 }, (_, slot) => (
            <i key={slot} style={{ gridColumn: slot + 1, gridRow: 1 }} />
          ))}
          {a.equipment.map((e) => (
            <div
              key={e.item.uid}
              style={{ gridColumn: e.slot + 1 + ' / span ' + e.item.size }}
            >
              {glyphs[e.item.kind]}
            </div>
          ))}
        </div>
        <div className="enc-section-title">
          <span>{16 - a.bag.reduce((n, entry) => n + entry.size, 0)}</span>{' '}
          行囊空位 / 16
        </div>
        <div className="enc-cargo">
          {Array.from({ length: 16 }, (_, slot) => (
            <i
              key={slot}
              style={{
                gridColumn: (slot % 4) + 1,
                gridRow: Math.floor(slot / 4) + 1,
              }}
            />
          ))}
          {cargoLayout(a.bag).map((p) => {
            const f = footprint(p.item.size, p.rotated);
            return (
              <button
                title={itemName(p.item)}
                key={p.item.uid}
                onClick={() =>
                  setSelected(selected === p.item.uid ? null : p.item.uid)
                }
                className={selected === p.item.uid ? 'selected' : ''}
                style={{
                  gridColumn: (p.slot % 4) + 1 + ' / span ' + f.w,
                  gridRow: Math.floor(p.slot / 4) + 1 + ' / span ' + f.h,
                }}
              >
                {glyphs[p.item.kind] || '▣'}
                {itemCount(p.item) > 1 && <small>{itemCount(p.item)}</small>}
              </button>
            );
          })}
        </div>
        {item ? (
          <div className="enc-item">
            <b>{itemName(item)}</b>
            <button
              className="enc-close"
              onClick={() => setSelected(null)}
              title="取消选择"
            >
              <X />
            </button>
            <p>
              {ITEM_PROPERTIES[item.kind].use
                ? '可使用 · 恢复 ' +
                  ITEM_PROPERTIES[item.kind].use!.gain +
                  (ITEM_PROPERTIES[item.kind].use!.stat === 'water'
                    ? ' 饮水'
                    : ITEM_PROPERTIES[item.kind].use!.stat === 'food'
                      ? ' 饱食'
                      : ' 精神')
                : item.kind === 'lift-material'
                  ? '升级材料 · ' + brainExperience([item]) + ' 经验'
                  : '带回电梯的物资'}
            </p>
            <div>
              {ITEM_PROPERTIES[item.kind].use && (
                <button
                  onClick={() => command({ type: 'consume', uid: item.uid })}
                >
                  使用
                </button>
              )}
              <button
                disabled={!seen || Math.hypot(a.x - b.x, a.z - b.z) >= 2}
                onClick={() =>
                  command({ type: 'give', uid: item.uid, actorId: 'rival' })
                }
              >
                赠送
              </button>
              <button
                onClick={() => command({ type: 'discard', uid: item.uid })}
              >
                丢下
              </button>
            </div>
          </div>
        ) : (
          <p className="enc-bag-tip">点击物品，再选择使用或赠送。</p>
        )}
        <div className="enc-event-list">
          <div className="enc-section-title">现场记录</div>
          {visibleEvents.map((row) => (
            <p key={row.id}>
              <small>
                {Math.floor(row.tick / 30)
                  .toString()
                  .padStart(2, '0')}
                s
              </small>
              {row.text}
            </p>
          ))}
        </div>
        {debug && (
          <div className="enc-debug">
            <div className="enc-section-title">导演观察 / 私有信息</div>
            <p>
              {stats.version}
              <br />
              推理 {stats.ms.toFixed(3)} ms · 已执行 {stats.count}
            </p>
            <p>
              精神 {Math.ceil(b.hp)} / 饱食 {Math.ceil(b.food)} / 饮水{' '}
              {Math.ceil(b.water)}
              <br />
              动作：{b.label}
              <br />
              行囊：{b.bag.map((i: Item) => itemName(i)).join('、') || '空'}
            </p>
            {stats.top.map((row, i) => (
              <p key={i}>
                {i + 1}. {row.label} <em>{row.score.toFixed(2)}</em>
              </p>
            ))}
            <small>分数是模型排序值，不是概率。</small>
          </div>
        )}
      </aside>
    </main>
  );
}
