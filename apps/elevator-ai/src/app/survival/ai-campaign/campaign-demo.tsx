'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Download,
  Mail,
  ChevronUp,
  Package,
  House,
  Search,
  Shield,
  Zap,
  LoaderCircle,
} from 'lucide-react';
import {
  createCampaign,
  stepCampaign,
  campaignRequest,
  applyCampaignChoice,
  baselineCampaign,
  counts,
  FLOORS,
  RESOURCE_NAMES,
} from '../../../lib/survival-ai/campaign';
import type {
  Campaign,
  CampaignChoice,
  Resource,
} from '../../../lib/survival-ai/campaign';
import { PROFILES } from '../../../lib/survival-ai/encounter';
import type { Profile } from '../../../lib/survival-ai/encounter';
import { sitePath } from '../../../lib/site-path';
import './campaign.css';

const seed = 20261004;
const titles: Record<string, string> = {
  explore: '搜刮',
  return: '带回物资',
  lift: '升级电梯',
  ward: '建造防护',
  storage: '扩建行囊',
  ascend: '升层',
  rest: '休养',
  drink: '饮水',
  eat: '进食',
};
const profiles = Object.keys(PROFILES) as Profile[];
export default function CampaignDemo() {
  const [view, setView] = useState(() => createCampaign(seed, 'campaign-demo'));
  const state = useRef(view),
    cursor = useRef(0),
    request = useRef<AbortController | null>(null),
    pending = useRef(false);
  const [running, setRunning] = useState(false),
    [mode, setMode] = useState<'model' | 'rules'>('model'),
    [speed, setSpeed] = useState(5);
  const [selected, setSelected] = useState<Profile>('ally'),
    [thinking, setThinking] = useState<Profile | null>(null),
    [ready, setReady] = useState(false);
  const [error, setError] = useState(''),
    [draft, setDraft] = useState('你现在打算做什么？为什么？'),
    [letter, setLetter] = useState<{
      actor: Profile;
      text: string;
      tick: number;
    } | null>(null),
    [mailBusy, setMailBusy] = useState(false);
  function publish(s: Campaign) {
    state.current = s;
    setView(s);
  }
  useEffect(() => {
    let gone = false;
    async function status() {
      try {
        const r = await fetch('/api/ai-mail/status');
        const b = (await r.json()) as { ready: boolean };
        if (!gone) setReady(!!b.ready);
      } catch {
        if (!gone) setReady(false);
      }
    }
    void status();
    const timer = setInterval(() => void status(), 15000);
    return () => {
      gone = true;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!running) return;
    async function decide() {
      if (pending.current) return;
      const candidates = profiles.map(
        (_, i) => profiles[(cursor.current + i) % profiles.length],
      );
      const id = candidates.find(
        (p) => campaignRequest(state.current, p).options.length,
      );
      if (!id) {
        if (state.current.actors.every((a) => !a.plan)) setRunning(false);
        return;
      }
      cursor.current = (profiles.indexOf(id) + 1) % profiles.length;
      const r = campaignRequest(state.current, id),
        session = state.current.session;
      if (mode === 'rules') {
        publish(
          applyCampaignChoice(state.current, r, baselineCampaign(r)).state,
        );
        return;
      }
      pending.current = true;
      setThinking(id);
      const controller = new AbortController();
      request.current = controller;
      try {
        const response = await fetch('/api/ai-campaign/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request: r }),
          signal: controller.signal,
        });
        const c = (await response.json()) as CampaignChoice & {
          error?: string;
        };
        if (!response.ok) throw new Error(c.error || '模型暂时不可用');
        if (state.current.session === session && !controller.signal.aborted) {
          const result = applyCampaignChoice(state.current, r, c);
          if (result.reason === 'applied') publish(result.state);
          else if (result.reason !== 'stale')
            throw new Error('模型决定无效，未消耗物资。');
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : '推理失败');
          setRunning(false);
        }
      } finally {
        if (request.current === controller) {
          pending.current = false;
          setThinking(null);
          request.current = null;
        }
      }
    }
    const timer = setInterval(() => {
      publish(stepCampaign(state.current));
      void decide();
    }, 1000 / speed);
    return () => {
      clearInterval(timer);
      request.current?.abort();
    };
  }, [running, mode, speed]);
  const a = view.actors.find((b) => b.id === selected)!,
    person = PROFILES[selected],
    bag = counts(a.bag),
    stock = counts(a.stock);
  const progress = a.plan
    ? Math.min(
        100,
        ((view.tick - a.plan.start) / (a.plan.finish - a.plan.start)) * 100,
      )
    : 0;
  const available = campaignRequest(view, selected);
  function reset() {
    setRunning(false);
    request.current?.abort();
    cursor.current = 0;
    setLetter(null);
    setError('');
    publish(createCampaign(seed, 'campaign-' + crypto.randomUUID()));
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(view, null, 2)], { type: 'application/json' }),
    );
    const el = document.createElement('a');
    el.href = url;
    el.download = 'f9-ai-campaign.json';
    el.click();
    URL.revokeObjectURL(url);
  }
  async function write() {
    if (running || mailBusy || !draft.trim()) return;
    const snapshot = campaignRequest(state.current, selected),
      tick = state.current.tick,
      session = state.current.session;
    setMailBusy(true);
    setError('');
    try {
      const r = await fetch('/api/ai-campaign/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: snapshot, message: draft }),
        signal: AbortSignal.timeout(90000),
      });
      const answer = (await r.json()) as { body: string; error?: string };
      if (!r.ok) throw new Error(answer.error);
      if (state.current.session === session)
        setLetter({ actor: selected, text: answer.body, tick });
    } catch (e) {
      setError(e instanceof Error ? e.message : '邮件未送达');
    } finally {
      setMailBusy(false);
    }
  }
  return (
    <main className="campaign-demo">
      <header className="campaign-head">
        <a href={sitePath('/')}>
          <ArrowLeft size={18} />
          <b>F9</b>
          <span>
            离屏导播<small>EXPLORE / BUILD / ASCEND</small>
          </span>
        </a>
        <span
          className={
            'campaign-model ' + (mode === 'model' && ready ? 'on' : '')
          }
        >
          {mode === 'model'
            ? ready
              ? '本地 Qwen · 真实决策'
              : '本地模型未连接'
            : '规则对照 · 无模型调用'}
        </span>
        <div className="campaign-controls">
          <select
            aria-label="决策来源"
            value={mode}
            disabled={running || mailBusy}
            onChange={(e) => setMode(e.target.value as 'model' | 'rules')}
          >
            <option value="model">本地大模型</option>
            <option value="rules">规则对照</option>
          </select>
          <select
            aria-label="播放速度"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {[1, 5, 15].map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
          <button title="导出可重放记录" onClick={download}>
            <Download size={17} />
          </button>
          <button title="同种子重开" disabled={mailBusy} onClick={reset}>
            <RotateCcw size={17} />
          </button>
          <button
            className="campaign-primary"
            disabled={(mode === 'model' && !ready) || mailBusy}
            onClick={() => {
              setError('');
              setRunning(!running);
            }}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? '暂停' : '开始观察'}
          </button>
        </div>
      </header>
      <div className="campaign-layout">
        <aside className="campaign-roster">
          <small className="campaign-eyebrow">选手独立行动</small>
          <h1>
            你不在场，
            <br />
            他们也在攀爬。
          </h1>
          <p>每人独立楼层、有限物资。导播可看见全部，选手只知道自己的经历。</p>
          {view.actors.map((b) => (
            <button
              key={b.id}
              className={
                'campaign-person ' + (selected === b.id ? 'selected' : '')
              }
              style={
                { '--person': PROFILES[b.id].color } as React.CSSProperties
              }
              onClick={() => setSelected(b.id)}
            >
              <header>
                <strong>{PROFILES[b.id].name}</strong>
                <span>{PROFILES[b.id].title}</span>
                <b>{b.floor}F</b>
              </header>
              <p>
                {b.status === 'dead'
                  ? '已倒下'
                  : b.status === 'finished'
                    ? '抵达终点'
                    : thinking === b.id
                      ? '正在权衡…'
                      : b.plan
                        ? titles[b.plan.action]
                        : '等待下一步决定'}
              </p>
              <div className="campaign-mini">
                <span>精神 {Math.ceil(b.hp)}</span>
                <span>电梯 Lv.{b.lift}</span>
                <span>库存 {b.stock.length}</span>
              </div>
            </button>
          ))}
          <div className="campaign-clock">
            <span>模拟时间</span>
            <b>
              {Math.floor(view.tick / 60)
                .toString()
                .padStart(2, '0')}
              :{(view.tick % 60).toString().padStart(2, '0')}
            </b>
            <small>模型等待期间，该选手不消耗饥渴。</small>
          </div>
        </aside>
        <section className="campaign-tower" aria-label="楼层进度">
          <div className="campaign-tower-head">
            <span>平行楼层 · 公开进度</span>
            <small>
              单向通行 <ChevronUp size={14} />
            </small>
          </div>
          <div className="campaign-lanes">
            <span />
            <span>林砚</span>
            <span>许衡</span>
            <span>祁烈</span>
          </div>
          {[...FLOORS].reverse().map((theme, i) => {
            const floor = 6 - i;
            return (
              <div className="campaign-floor" key={floor}>
                <div className="campaign-floor-name">
                  <b>{String(floor).padStart(2, '0')}</b>
                  <span>{theme}</span>
                </div>
                {view.actors.map((b) => (
                  <div
                    key={b.id}
                    className={
                      'campaign-cell ' +
                      (b.floor === floor
                        ? 'occupied'
                        : b.floor > floor
                          ? 'closed'
                          : '')
                    }
                  >
                    {b.floor === floor ? (
                      <button
                        aria-label={`${PROFILES[b.id].name} 当前${floor}层`}
                        style={
                          {
                            '--person': PROFILES[b.id].color,
                          } as React.CSSProperties
                        }
                        onClick={() => setSelected(b.id)}
                      >
                        <i className={b.plan ? 'active' : ''}>
                          {b.location === 'home' ? (
                            <House size={24} />
                          ) : (
                            <Search size={24} />
                          )}
                        </i>
                        <span>
                          {b.status === 'dead'
                            ? '倒下'
                            : b.status === 'finished'
                              ? '终点'
                              : b.location === 'home'
                                ? '电梯内'
                                : `资源点 ${b.zone || 1}`}
                        </span>
                        <small>
                          {b.plan
                            ? titles[b.plan.action]
                            : thinking === b.id
                              ? '决策中'
                              : '待命'}
                        </small>
                      </button>
                    ) : (
                      <span>
                        {b.floor > floor
                          ? '已关闭'
                          : floor <= b.lift
                            ? '已解锁'
                            : '未接通'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          <div className="campaign-live-strip">
            <span className={running ? 'live' : ''} />
            {running ? '观察中' : '已暂停'}
            <span>已记录 {view.receipts.length} 次决定</span>
          </div>
        </section>
        <aside
          className="campaign-detail"
          style={{ '--person': person.color } as React.CSSProperties}
        >
          <header>
            <span>选手 {person.title}</span>
            <h2>
              {person.name}
              <b>{a.floor}F</b>
            </h2>
          </header>
          <div className="campaign-vitals">
            {(
              [
                ['精神', a.hp],
                ['饱食', a.food],
                ['饮水', a.water],
              ] as const
            ).map(([title, value]) => (
              <div key={title}>
                <span>{title}</span>
                <i>
                  <em style={{ width: value + '%' }} />
                </i>
                <b>{Math.ceil(value)}</b>
              </div>
            ))}
          </div>
          <div className="campaign-plan">
            <small>
              当前决定 ·{' '}
              {a.plan?.source === 'rule-baseline'
                ? '规则'
                : a.plan
                  ? 'Qwen'
                  : '待命'}
            </small>
            <h3>
              {thinking === selected ? (
                <>
                  <LoaderCircle size={17} className="campaign-spin" /> 思考中
                </>
              ) : a.plan ? (
                titles[a.plan.action]
              ) : (
                '等待决定'
              )}
            </h3>
            <p>
              {a.plan?.reason ||
                '开始观察后，选手会根据资源、身体状态和经历选择下一步。'}
            </p>
            <i>
              <em style={{ width: progress + '%' }} />
            </i>
          </div>
          <div className="campaign-facilities">
            <span>
              <Zap size={17} />
              电梯 {a.lift}
            </span>
            <span>
              <Shield size={17} />
              防护 {a.ward}
            </span>
            <span>
              <Package size={17} />
              行囊 {16 + a.storage * 4}
            </span>
          </div>
          <div className="campaign-stock">
            <header>
              <span>物资</span>
              <span>行囊</span>
              <span>仓库</span>
            </header>
            {(Object.keys(RESOURCE_NAMES) as Resource[]).map((kind) => (
              <div key={kind}>
                <span>{RESOURCE_NAMES[kind]}</span>
                <b>{bag[kind]}</b>
                <b>{stock[kind]}</b>
              </div>
            ))}
          </div>
          <div className="campaign-sites">
            <small>本层资源点</small>
            <div>
              {view.sites[selected]
                .filter((s) => s.floor === a.floor)
                .map((s) => (
                  <span className={s.searched ? 'searched' : ''} key={s.zone}>
                    {s.zone}
                    {s.searched ? ' · 已搜' : ' · 未知'}
                  </span>
                ))}
            </div>
          </div>
          <div className="campaign-options">
            <small>当前可执行</small>
            <p>
              {available.options.map((o) => o.title).join(' / ') ||
                (a.plan ? '当前行动完成后重新权衡' : '没有可执行行动')}
            </p>
            {a.status === 'active' && !a.plan && !available.options.length && (
              <p>
                本层物资耗尽，无法继续。升级还缺脑浆{' '}
                {Math.max(0, a.lift * 6 - stock.brain)}、零件{' '}
                {Math.max(0, a.lift + 1 - stock.part)}。
              </p>
            )}
          </div>
        </aside>
        <section className="campaign-journal">
          <header>
            <small>行动与收支</small>
            <b>{person.name}的真实经历</b>
          </header>
          <div>
            {view.events
              .filter((e) => e.actor === selected)
              .slice(-10)
              .reverse()
              .map((e, i) => (
                <article key={`${e.tick}:${i}`}>
                  <time>{e.tick}s</time>
                  <p>{e.text}</p>
                </article>
              ))}
            {!view.events.length && (
              <p className="campaign-muted">
                点击开始观察。也可切换规则对照，比较决策来源。
              </p>
            )}
          </div>
        </section>
        <section className="campaign-mailbox">
          <header>
            <Mail size={17} />
            <b>给{person.name}写信</b>
            <small>暂停时询问当前安排</small>
          </header>
          <textarea
            aria-label="离屏选手邮件"
            maxLength={300}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={running || mailBusy}
          />
          <button
            disabled={running || mailBusy || !ready || !draft.trim()}
            onClick={() => void write()}
          >
            {mailBusy ? '等待回信…' : '发送邮件'}
          </button>
          {letter?.actor === selected && (
            <article>
              <small>
                {person.name} · {letter.tick}s 的状态
              </small>
              <p>{letter.text}</p>
            </article>
          )}
        </section>
      </div>
      {error && (
        <div className="campaign-error" role="alert">
          {error}
          <button onClick={() => setError('')}>关闭</button>
        </div>
      )}
    </main>
  );
}
