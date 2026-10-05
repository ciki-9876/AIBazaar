'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ChevronRight,
  DoorOpen,
  Inbox,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  createMailEncounter,
  encounterRequest,
  canSee,
  PROFILES,
} from '../../../lib/survival-ai/encounter';
import type {
  Encounter,
  EncounterRequest,
  Profile,
  Intent,
} from '../../../lib/survival-ai/encounter';
import {
  MAIL_CASES,
  restoreMail,
  saveMail,
} from '../../../lib/survival-ai/mail';
import type {
  MailCase,
  MailReply,
  Agreement,
} from '../../../lib/survival-ai/mail';
import {
  applyMailAction,
  recordMail,
} from '../../../lib/survival-ai/mail-replay';
import type { MailAction } from '../../../lib/survival-ai/mail-replay';
import { ELEVATOR } from '../../../lib/survival-world';
import { ITEM_PROPERTIES } from '../../../lib/survival-item-traits';
import { itemName, itemCount } from '../../../lib/survival-stacks';
import { sitePath } from '../../../lib/site-path';
import EncounterScene from '../ai-demo/scene';
// oxlint-disable-next-line import/default -- Vite's worker wrapper supplies the constructor export.
import DecisionWorker from '../ai-demo/decision.worker.ts?worker';
import { MiniMap, Meter } from '../ai-demo/demo';
import { OpeningAudio } from '../opening-audio';
import './mail.css';

const SEED = 20261003,
  KEY = 'f9-ai-mail-experiment-v1';
const persist = (s: Encounter) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(saveMail(s)));
  } catch {
    /* Keep the active experiment if storage is unavailable. */
  }
};
const statusText: Record<Agreement['status'], string> = {
  offered: '等待你确认',
  accepted: '已约定 · 待执行',
  fulfilled: '已履约',
  broken: '已违约',
  cancelled: '已撤回',
};
export default function MailDemo() {
  const [view, setView] = useState(() =>
    createMailEncounter(SEED, 'ally', 'help', 'mail:initial'),
  );
  const state = useRef(view),
    recording = useRef(recordMail(view)),
    keys = useRef(new Set<string>());
  const [draft, setDraft] = useState(MAIL_CASES[0].prompt),
    [offer, setOffer] = useState(0);
  const [error, setError] = useState(''),
    [debug, setDebug] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const [paused, setPaused] = useState(false),
    pausedRef = useRef(false);
  const [ready, setReady] = useState(false),
    readyRef = useRef(false),
    [model, setModel] = useState({
      ready: false,
      local: true,
      model: '连接模型中',
    });
  const worker = useRef<Worker | null>(null),
    pending = useRef<EncounterRequest | null>(null);
  const [tactics, setTactics] = useState({ ms: 0, count: 0, receipt: '' });
  const audio = useRef<OpeningAudio | null>(null),
    heard = useRef(0),
    lettersEnd = useRef<HTMLDivElement>(null);
  const dispatch = useCallback((action: MailAction, publish = true) => {
    const result = applyMailAction(state.current, action);
    recording.current.entries.push({
      tick: state.current.tick,
      action,
      receipt: result.reason,
    });
    state.current = result.state;
    if (publish) {
      setView(result.state);
      persist(result.state);
    }
    return result;
  }, []);
  const pause = useCallback((value?: boolean) => {
    pausedRef.current = value ?? !pausedRef.current;
    setPaused(pausedRef.current);
    keys.current.clear();
    audio.current?.pause(
      pausedRef.current || state.current.mail!.stage === 'home',
    );
  }, []);
  const command = useCallback(
    (intent: Intent) => {
      if (
        !pausedRef.current &&
        readyRef.current &&
        state.current.mail!.stage === 'field'
      )
        dispatch({ type: 'command', intent });
    },
    [dispatch],
  );
  const restart = (profile: Profile, scenario: MailCase) => {
    const next = createMailEncounter(
      SEED,
      profile,
      scenario,
      'mail:' + crypto.randomUUID(),
    );
    state.current = next;
    recording.current = recordMail(next);
    heard.current = 0;
    setView(next);
    persist(next);
    setDraft(MAIL_CASES.find((c) => c.id === scenario)!.prompt);
    setOffer(scenario === 'bargain' ? 1 : 0);
    setSelected(null);
    setError('');
    pause(false);
  };
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      try {
        const saved = localStorage.getItem(KEY),
          restored = saved && restoreMail(JSON.parse(saved));
        if (restored) {
          state.current = restored;
          recording.current = recordMail(restored);
          setView(restored);
          setDraft(
            MAIL_CASES.find((c) => c.id === restored.mail!.case)!.prompt,
          );
        } else {
          const fresh = createMailEncounter(
            SEED,
            'ally',
            'help',
            'mail:' + crypto.randomUUID(),
          );
          state.current = fresh;
          recording.current = recordMail(fresh);
          setView(fresh);
        }
      } catch {
        setError('未能读取实验存档，本轮从头开始。');
      }
    });
    const w = new DecisionWorker();
    worker.current = w;
    w.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'ready') {
        readyRef.current = true;
        setReady(true);
      }
      if (data.type === 'error') {
        pending.current = null;
        setError(data.message);
      }
      if (data.type === 'decision' && pending.current) {
        const request = pending.current;
        pending.current = null;
        const result = dispatch({
          type: 'decision',
          request,
          reply: data.reply,
        });
        setTactics((v) => ({
          ms: data.milliseconds,
          count: v.count + Number(result.reason === 'applied'),
          receipt: result.reason,
        }));
      }
    };
    w.onerror = () => {
      pending.current = null;
      readyRef.current = false;
      setReady(false);
      setError('战术模型加载失败，请刷新。');
    };
    const controller = new AbortController();
    fetch('/api/ai-mail/status', { signal: controller.signal })
      .then((r) => r.json())
      .then((value) => {
        const info = value as {
          ready?: boolean;
          local?: boolean;
          model?: string;
        };
        setModel({
          ready: info.ready === true,
          local: info.local === true,
          model: info.model || '模型未连接',
        });
      })
      .catch(() =>
        setModel({ ready: false, local: true, model: '模型未连接' }),
      );
    return () => {
      mounted = false;
      controller.abort();
      w.terminate();
      worker.current = null;
      readyRef.current = false;
      audio.current?.close();
    };
  }, [dispatch]);
  useEffect(() => {
    lettersEnd.current?.scrollIntoView({ block: 'end' });
  }, [view.mail!.letters.length, view.mail!.requests.length]);
  useEffect(() => {
    let raf = 0,
      last = performance.now(),
      accumulator = 0;
    const frame = (now: number) => {
      accumulator += Math.min((now - last) / 1000, 0.1);
      last = now;
      if (
        !pausedRef.current &&
        readyRef.current &&
        state.current.mail!.stage === 'field'
      ) {
        while (accumulator >= 1 / 30) {
          const k = keys.current,
            input = {
              x:
                Number(k.has('d') || k.has('arrowright')) -
                Number(k.has('a') || k.has('arrowleft')),
              z:
                Number(k.has('s') || k.has('arrowdown')) -
                Number(k.has('w') || k.has('arrowup')),
            };
          dispatch({ type: 'step', input }, false);
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
          if (s.mail!.stage === 'home') {
            keys.current.clear();
            audio.current?.pause(true);
            setView(s);
            persist(s);
            break;
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
          if (s.tick % 4 === 0) setView(s);
          if (s.tick % 30 === 0) persist(s);
        }
      } else accumulator = 0;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const down = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          'textarea,input,select,[contenteditable=true]',
        )
      )
        return;
      const k = e.key.toLowerCase();
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
          'escape',
          ' ',
        ].includes(k)
      )
        e.preventDefault();
      if (k === 'escape' && !e.repeat) {
        pause();
        return;
      }
      if (state.current.mail!.stage !== 'field' || pausedRef.current) return;
      keys.current.add(k);
      if (k === 'e' && !e.repeat) {
        const s = state.current,
          a = s.actors[0];
        if (Math.hypot(a.x - ELEVATOR.x, a.z - ELEVATOR.z) < 2)
          command({ type: 'extract' });
        else {
          const c = s.caches
            .filter(
              (c) =>
                !c.opened &&
                c.contents.length &&
                canSee(s, a, c) &&
                Math.hypot(a.x - c.x, a.z - c.z) < 2,
            )
            .sort(
              (c, d) =>
                Math.hypot(a.x - c.x, a.z - c.z) -
                Math.hypot(a.x - d.x, a.z - d.z),
            )[0];
          if (c) command({ type: 'search', cacheId: c.id });
        }
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase()),
      blur = () => pause(true);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [dispatch, command, pause]);
  async function send() {
    if (state.current.mail!.requests.length) return;
    setError('');
    const sent = dispatch({ type: 'send', text: draft, offer }),
      request = sent.state.mail!.requests[0];
    if (sent.reason !== 'queued' || !request) {
      setError(sent.reason);
      return;
    }
    setDraft('');
    try {
      const response = await fetch('/api/ai-mail/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(95000),
      });
      const body = (await response.json()) as MailReply & { error?: string };
      if (!response.ok) throw new Error(body.error || '回信暂未送达。');
      // Apply to the latest state; a restarted session never receives an old promise.
      const result = dispatch({ type: 'reply', reply: body as MailReply });
      if (result.reason !== 'committed' && result.reason !== 'wrong-request')
        setError(result.reason);
    } catch (e) {
      if (state.current.sessionId === request.sessionId) {
        const reason = e instanceof Error ? e.message : '模型暂时不可用。';
        dispatch({ type: 'failed', id: request.id, reason });
        setError(reason);
      }
    }
  }
  function depart() {
    if (!ready || view.mail!.requests.length) return;
    dispatch({ type: 'depart' });
    keys.current.clear();
    setSelected(null);
    pause(false);
    audio.current ??= new OpeningAudio();
    audio.current.start();
    audio.current.pause(false);
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify({
            ...recording.current,
            final: saveMail(state.current),
          }),
        ],
        { type: 'application/json' },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'f9-mail-' + view.profile + '-' + view.mail!.case + '.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  const m = view.mail!,
    home = m.stage === 'home',
    person = PROFILES[view.profile],
    player = view.actors[0],
    rival = view.actors[1];
  const busy = !!m.requests.length,
    latest = [...m.letters].reverse().find((l) => l.direction === 'in'),
    selectedItem = player.bag.find((i) => i.uid === selected);
  const waterCount = player.bag
      .filter((i) => i.kind === 'water')
      .reduce((n, i) => n + itemCount(i), 0),
    scrapCount = player.bag
      .filter((i) => i.kind === 'scrap')
      .reduce((n, i) => n + itemCount(i), 0);
  return (
    <main className={'enc-demo mail-demo ' + (home ? 'at-home' : 'in-field')}>
      <header className="enc-header">
        <a className="enc-brand" href={sitePath('/survival/ai-demo')}>
          <ArrowLeft />
          <span>F9</span>
          <div>
            电梯邮箱<small>LETTERS / PROMISES / CONSEQUENCES</small>
          </div>
        </a>
        <div className="mail-connection">
          <i className={model.ready ? 'on' : ''} />
          {model.ready
            ? model.local
              ? '本地 Qwen · 无 API 费用'
              : '外部模型已连接'
            : '模型未连接'}
        </div>
        <div className="enc-tools">
          <button
            onClick={() => setDebug(!debug)}
            className={debug ? 'active' : ''}
          >
            导演观察
          </button>
          <button title="导出信件、行动和回放" onClick={download}>
            <ArrowDownToLine />
          </button>
          <button
            title="重开当前实验"
            onClick={() => restart(view.profile, m.case)}
          >
            <RotateCcw />
          </button>
          <button title="暂停" onClick={() => pause()}>
            <Pause />
          </button>
        </div>
      </header>
      <aside className="enc-left">
        <div className="enc-section-title">
          <span>01</span> 收件人
        </div>
        <div className="mail-people">
          {(
            Object.entries(PROFILES) as [Profile, (typeof PROFILES)[Profile]][]
          ).map(([id, p]) => (
            <button
              key={id}
              style={{ '--person': p.color } as React.CSSProperties}
              className={view.profile === id ? 'selected' : ''}
              onClick={() => restart(id, m.case)}
            >
              <b>{p.name}</b>
              <span>{p.title}</span>
              <small>{p.description}</small>
            </button>
          ))}
        </div>
        <div className="enc-section-title">
          <span>02</span> 实验局面
        </div>
        <nav className="enc-scenarios">
          {MAIL_CASES.map((c, i) => (
            <button
              key={c.id}
              className={m.case === c.id ? 'selected' : ''}
              onClick={() => restart(view.profile, c.id)}
            >
              <small>0{i + 1}</small>
              {c.title}
              <ChevronRight />
            </button>
          ))}
        </nav>
        <div className="mail-rule">
          <Inbox />
          <p>电梯里写信。走出门，验证对方会怎么做。</p>
          <small>切换人物或局面会重开实验。</small>
        </div>
        <div className="mail-test-note">
          口头承诺 ≠ 实际履约
          <br />
          同一份记忆、物资与行动计划。
        </div>
      </aside>
      <section className="enc-arena mail-arena">
        <EncounterScene key={view.sessionId} state={state} command={command} />
        {home ? (
          <section className="mail-console" aria-label="电梯邮件">
            <div className="mail-console-head">
              <div>
                <small>收件人 / {person.title}</small>
                <h1>{person.name}</h1>
              </div>
              <span>
                <i /> 电梯通信
              </span>
            </div>
            <div className="mail-thread" aria-live="polite">
              {!m.letters.length && (
                <div className="mail-empty">
                  <span>✉</span>
                  <p>
                    门外的同行者
                    <br />
                    未必是同伴。
                  </p>
                  <small>写下你的请求，带着回信出发。</small>
                </div>
              )}
              {m.letters.map((l) => (
                <article key={l.id} className={'mail-letter ' + l.direction}>
                  <header>
                    {l.direction === 'out' ? '你' : person.name}
                    <small>
                      {l.status === 'pending'
                        ? '等待回信…'
                        : l.status === 'failed'
                          ? '未送达'
                          : l.direction === 'in'
                            ? '已读'
                            : '已发送'}
                    </small>
                  </header>
                  <p>{l.text}</p>
                  {l.writing && (
                    <small className="mail-source">
                      模型原文 · {l.model} ·{' '}
                      {Math.round((l.milliseconds || 0) / 100) / 10}s
                    </small>
                  )}
                  {l.error && <small className="mail-error">{l.error}</small>}
                </article>
              ))}
              {busy && (
                <div className="mail-wait">
                  <LoaderCircle /> 对方正在考虑…
                </div>
              )}
              <div ref={lettersEnd} />
            </div>
            {m.agreements
              .filter((c) => c.status === 'offered')
              .map((c) => (
                <div className="mail-counter" key={c.id}>
                  <span>{c.price}个机械零件 ⇄ 1瓶水</span>
                  <button
                    onClick={() =>
                      dispatch({ type: 'confirm', id: c.id, accept: true })
                    }
                    disabled={busy || scrapCount < c.price}
                  >
                    确认交换
                  </button>
                  <button
                    onClick={() =>
                      dispatch({ type: 'confirm', id: c.id, accept: false })
                    }
                    disabled={busy}
                  >
                    拒绝
                  </button>
                </div>
              ))}
            <form
              className="mail-compose"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <textarea
                aria-label="邮件内容"
                placeholder="说说你的条件…"
                maxLength={300}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={busy}
              />
              <div>
                <label>
                  拟交换{' '}
                  <select
                    aria-label="拟交换机械零件"
                    value={offer}
                    onChange={(e) => setOffer(Number(e.target.value))}
                    disabled={busy}
                  >
                    <option value={0}>无附件</option>
                    {[1, 2].map((n) => (
                      <option key={n} value={n} disabled={scrapCount < n}>
                        机械零件 ×{n}
                      </option>
                    ))}
                  </select>
                </label>
                <small>{draft.length}/300</small>
                <button
                  className="mail-send"
                  type="submit"
                  disabled={busy || !draft.trim() || !model.ready}
                >
                  <Send />
                  发送
                </button>
              </div>
            </form>
            <footer>
              <small>附件在见面时交换</small>
              <button
                className="mail-depart"
                onClick={depart}
                disabled={!ready || busy}
              >
                <DoorOpen />
                进入房间
                <ChevronRight />
              </button>
            </footer>
          </section>
        ) : (
          <>
            <div className="enc-room-title">
              <small>维保廊 / 同一场遭遇</small>
              <h1>{MAIL_CASES.find((c) => c.id === m.case)!.title}</h1>
            </div>
            <div
              className="enc-companion"
              style={{ '--person': person.color } as React.CSSProperties}
            >
              <span className="enc-dot" />
              {person.name}
              <small>
                {canSee(view, player, rival)
                  ? rival.label + ' · 精神 ' + Math.ceil(rival.hp)
                  : '不在视野内'}
              </small>
            </div>
            <div className="enc-map">
              <MiniMap state={view} />
              <small>独立视野</small>
            </div>
            <div className="enc-controls">
              <span>
                <kbd>WASD</kbd>移动
              </span>
              <span>
                <kbd>E</kbd>翻找 / 返回
              </span>
              <span>点击地面移动</span>
            </div>
            {player.extraction > 0 && (
              <div className="enc-progress">正在返回电梯…</div>
            )}
            <div className="mail-field-events">
              {view.events
                .filter((e) => e.visibleToPlayer)
                .slice(-3)
                .map((e) => (
                  <p key={e.id}>{e.text}</p>
                ))}
            </div>
          </>
        )}
      </section>
      <aside className="enc-right mail-right">
        <div className="mail-phase">
          <span>{home ? '01 / 电梯内' : '02 / 遭遇中'}</span>
          <b>{home ? '读信 · 作约定' : '行动 · 看结果'}</b>
        </div>
        <div className="enc-section-title">
          <span>你</span> 当前状态
        </div>
        <Meter name="精神" value={player.hp} color="#c59279" />
        <Meter name="饱食" value={player.food} color="#a9b48b" />
        <Meter name="饮水" value={player.water} color="#80afbd" />
        <div className="mail-inventory-summary">
          <span>
            水 <b>{waterCount}</b>
          </span>
          <span>
            零件 <b>{scrapCount}</b>
          </span>
        </div>
        <div className="mail-bag">
          {Array.from({ length: 16 }, (_, i) => {
            const item = player.bag[i];
            return (
              <button
                key={i}
                title={item ? itemName(item) : '空格'}
                className={item?.uid === selected ? 'selected' : ''}
                onClick={() =>
                  setSelected(item?.uid === selected ? null : item?.uid || null)
                }
              >
                {item && (
                  <>
                    <span>
                      {item.kind === 'water'
                        ? '◈'
                        : item.kind === 'scrap'
                          ? '⚙'
                          : item.kind === 'lift-material'
                            ? '✦'
                            : '▣'}
                    </span>
                    <small>{itemCount(item) > 1 ? itemCount(item) : ''}</small>
                  </>
                )}
              </button>
            );
          })}
        </div>
        {selectedItem && (
          <div className="mail-item">
            <b>{itemName(selectedItem)}</b>
            {ITEM_PROPERTIES[selectedItem.kind].use && (
              <button
                disabled={home || paused}
                onClick={() =>
                  command({ type: 'consume', uid: selectedItem.uid })
                }
              >
                {home ? '出门后使用' : '主动使用'}
              </button>
            )}
            <small title={selectedItem.uid}>
              物品记录 {selectedItem.uid.slice(-15)}
            </small>
          </div>
        )}
        <div className="enc-section-title">
          <ShieldCheck /> 公开约定
        </div>
        <div className="mail-agreements">
          {!m.agreements.length && <p>暂无约定</p>}
          {m.agreements.map((c) => (
            <article key={c.id}>
              <b>
                {c.topic === 'water'
                  ? c.price
                    ? `零件 ×${c.price} ⇄ 水 ×1`
                    : '见面给水 ×1'
                  : '共同打守卫 · 你先翻箱'}
              </b>
              <span className={c.status}>{statusText[c.status]}</span>
              {c.reason && <small>{c.reason}</small>}
            </article>
          ))}
        </div>
        {latest && (
          <div className="mail-last-reply">
            <small>最近回信</small>
            <p>{latest.text}</p>
          </div>
        )}
        {!home && (
          <button
            className="mail-back"
            onClick={() => command({ type: 'move', to: ELEVATOR })}
          >
            <DoorOpen />
            去电梯门口
          </button>
        )}
        {error && (
          <p className="mail-error" role="alert">
            {error}
            <button title="关闭错误提示" onClick={() => setError('')}>
              <X />
            </button>
          </p>
        )}
      </aside>
      {debug && (
        <section className="mail-debug">
          <header>
            导演观察 · 含角色私有意图
            <button onClick={() => setDebug(false)}>
              <X />
            </button>
          </header>
          <p>
            {model.model} / 战术 {tactics.ms.toFixed(2)}ms / 已应用{' '}
            {tactics.count} / {tactics.receipt}
          </p>
          {latest?.tokens && (
            <p>
              上封信 {latest.milliseconds?.toFixed(0)}ms · 输入{' '}
              {latest.tokens.input} / 输出 {latest.tokens.output} tokens
            </p>
          )}
          <p>
            角色动作：{rival.intent.type} / 社会计划版本：{m.revision}
          </p>
          {m.agreements.map((c) => (
            <p key={c.id}>
              {c.intent} → {c.status} / {c.waterUid || c.cacheId}
            </p>
          ))}
          <div>
            {m.memories.slice(-6).map((e, i) => (
              <p key={i}>{e.text}</p>
            ))}
          </div>
        </section>
      )}
      {paused && (
        <dialog
          open
          className="mail-pause"
          aria-modal="true"
          aria-label="实验已暂停"
        >
          <div>
            <Pause />
            <h2>已暂停</h2>
            <p>信件和约定保留在原处。</p>
            <button autoFocus onClick={() => pause(false)}>
              <Play />
              继续
            </button>
          </div>
        </dialog>
      )}
    </main>
  );
}
