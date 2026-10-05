'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Ticket,
  ShieldCheck,
  Radio,
  ArrowUp,
  Trophy,
  Skull,
  HeartPulse,
} from 'lucide-react';
import type { OpeningAction, OpeningState } from '@/lib/survival-opening';
import {
  seasonPlayer,
  seasonCheckpoint,
  seasonSpan,
  seasonDestinationReason,
  seasonHeld,
  rescueUnits,
  SEASON_RULES,
  BROADCAST_PART_TICKS,
} from '@/lib/survival-season';
import { distance, ELEVATOR } from '@/lib/survival-room';
import BaseUpgrade from './base-upgrade';

type Props = { state: OpeningState; act: (a: OpeningAction) => void };
export function SeasonHome({
  state,
  act,
  reduced,
  navigate,
  close,
}: Props & {
  reduced: boolean;
  navigate: (tab: 'floors' | 'warehouse') => void;
  close: () => void;
}) {
  const s = state.season!,
    p = seasonPlayer(s),
    pool = s.checkpoints.find((q) => q.floor === state.room.floor),
    remaining = s.golden.filter(
      (g) => g.floor === p.floor && g.status !== 'redeemed',
    ).length,
    qualified = p.qualified.includes(p.floor),
    ready = !!rescueUnits(state.room);
  return (
    <section className="season-home">
      <aside className="season-floor">
        <small>百层生存 / 007</small>
        <strong>{String(p.floor).padStart(2, '0')}</strong>
        <span>/ 100 F</span>
        <div className="season-track">
          <i style={{ height: `${p.floor}%` }} />
        </div>
        <small>{s.phase === 'live' ? '正赛' : '集结'}</small>
      </aside>
      <div className="season-home-main race-command">
        <div className="season-metrics">
          <span>
            <Ticket size={18} /> {p.passes.length}
            <small>/ 10</small>
          </span>
          <span>
            <ArrowUp size={18} />
            {seasonSpan(state.room.liftLevel || 2)} F
          </span>
          <span>
            <ShieldCheck size={18} />
            {qualified
              ? '已晋级'
              : pool?.frozenAt !== null && pool
                ? remaining
                  ? `${remaining} 名额`
                  : '名额已用尽'
                : `下个据点 ${seasonCheckpoint(p)} F`}
          </span>
        </div>
        <div className="season-actions">
          <button
            className="console-primary"
            onClick={() => navigate('floors')}
          >
            {s.phase === 'entry'
              ? '前往 4F'
              : s.phase === 'boarding'
                ? '准备开赛'
                : '选择楼层'}{' '}
            <ArrowUp size={16} />
          </button>
          <button onClick={() => navigate('warehouse')}>
            <HeartPulse size={16} />
            {ready ? '救援已锁定' : '储备救援'}
          </button>
          {s.phase === 'live' && (
            <button
              aria-pressed={!!state.room.resting}
              onClick={() => {
                act({ type: 'rest', enabled: !state.room.resting });
                close();
              }}
            >
              {state.room.resting ? '停止休息' : '休息'}
              <small>消耗食水</small>
            </button>
          )}
        </div>
        <BaseUpgrade state={state} act={act} reduced={reduced} compact />
      </div>
    </section>
  );
}
export function SeasonRoutes({
  state,
  act,
  close,
}: Props & { close: () => void }) {
  const s = state.season!,
    p = seasonPlayer(s),
    targets =
      s.phase === 'entry'
        ? [4]
        : s.phase === 'boarding'
          ? [5]
          : s.phase === 'live'
            ? Array.from(
                {
                  length:
                    Math.min(
                      100,
                      p.floor + seasonSpan(state.room.liftLevel || 2),
                    ) -
                    p.floor +
                    1,
                },
                (_, i) => p.floor + i,
              ).filter(
                (f) =>
                  !seasonDestinationReason(
                    s,
                    'player',
                    f,
                    state.room.liftLevel || 2,
                  ),
              )
            : [];
  return (
    <section className="season-routes">
      <h3>
        {p.floor} F <ArrowUp size={20} />
      </h3>
      <div>
        {targets.map((f) => {
          const reason =
            s.phase === 'boarding'
              ? null
              : seasonDestinationReason(
                  s,
                  'player',
                  f,
                  state.room.liftLevel || 2,
                );
          const free =
            f === p.floor || s.phase === 'boarding' || p.floor % 10 === 0;
          return (
            <button
              key={f}
              className="season-route"
              disabled={!!reason}
              title={reason || ''}
              onClick={() => {
                act({ type: 'choose-floor', floor: f });
                close();
              }}
            >
              <strong>{f} F</strong>
              <span>
                {f === 4
                  ? '集结'
                  : f % 10 === 0
                    ? '共享据点'
                    : f === p.floor
                      ? '重新探索'
                      : free
                        ? '资格通行'
                        : `${f - p.floor} 张`}
              </span>
              {reason && <small>{reason}</small>}
            </button>
          );
        })}
      </div>
      {!targets.length && <p>广播结束后开放</p>}
    </section>
  );
}
export function SeasonBoard({ state }: Pick<Props, 'state'>) {
  const [rules, setRules] = useState(false),
    s = state.season!;
  return (
    <section className="season-board">
      <header>
        <h3>
          参赛名册{' '}
          <small>
            {s.actors.filter((a) => a.status !== 'dead').length} /{' '}
            {s.actors.length}
          </small>
        </h3>
        <button aria-expanded={rules} onClick={() => setRules(!rules)}>
          规则回看
        </button>
      </header>
      {rules ? (
        <ol>
          {SEASON_RULES.map(([title, text]) => (
            <li key={title}>
              <b>{title}</b>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <p className="season-control-note">对手控制待接入</p>
          <div className="season-roster">
            {s.actors.map((a) => (
              <div key={a.id}>
                <span>
                  {a.number} · {a.name}
                </span>
                <strong>{a.floor} F</strong>
                <small>
                  {a.status === 'dead'
                    ? '死亡'
                    : a.status === 'winner'
                      ? '优胜'
                      : a.qualified.includes(a.floor)
                        ? '已晋级'
                        : '存活'}
                </small>
              </div>
            ))}
          </div>
        </>
      )}
      <SeasonEvents state={state} />
    </section>
  );
}
export function SeasonHUD({
  state,
  act,
  restart,
}: Props & { restart: () => void }) {
  const s = state.season!,
    p = seasonPlayer(s),
    held = seasonHeld(s),
    pool = s.checkpoints.find((q) => q.floor === p.floor),
    remaining = s.golden.filter(
      (g) => g.floor === p.floor && g.status !== 'redeemed',
    ).length,
    q = s.sources.find(
      (q) =>
        q.actor === 'player' &&
        q.floor === p.floor &&
        !q.taken &&
        distance(q, state.room.player) < 1.8,
    ),
    work = s.work.player,
    ground = state.room.caches.find(
      (c) =>
        c.manualPickup &&
        !c.opened &&
        distance(c, state.room.player) <= 1.65 &&
        c.available <= state.room.tick,
    );
  if (s.phase === 'victory' || s.phase === 'defeat')
    return <SeasonResult state={state} restart={restart} />;
  const part =
    SEASON_RULES[
      Math.min(
        SEASON_RULES.length - 1,
        Math.floor(s.phaseTick / BROADCAST_PART_TICKS),
      )
    ];
  return (
    <>
      <div className="season-hud">
        <strong>{p.floor} F</strong>
        <span>
          <Ticket size={15} />
          {p.passes.length} / 10
        </span>
        <span>
          {p.floor % 10 === 0
            ? p.qualified.includes(p.floor)
              ? '已晋级'
              : pool?.frozenAt === null
                ? '名册待结算'
                : remaining
                  ? `余票 ${remaining}`
                  : '名额已用尽'
            : `据点 ${seasonCheckpoint(p)} F`}
        </span>
        {held.length > 0 && <b>金票 ×{held.length}</b>}
      </div>
      {s.phase === 'gathering' && (
        <div className="season-broadcast">
          <Radio size={19} />
          <div>
            <strong>准备房间</strong>
            <p>自由走动 · 广播即将开始</p>
          </div>
        </div>
      )}
      {s.phase === 'broadcast' && (
        <div className="season-broadcast" aria-live="polite">
          <Radio size={19} />
          <div>
            <strong>{part[0]}</strong>
            <p>{part[1]}</p>
          </div>
          <small>{Math.floor(s.phaseTick / BROADCAST_PART_TICKS) + 1}/6</small>
        </div>
      )}
      {s.phase === 'boarding' && state.stage !== 'home' && (
        <div className="season-broadcast">
          <Radio size={19} />
          <div>
            <strong>电梯已开放</strong>
            <p>回到 007 号电梯 · 按 E</p>
          </div>
          {distance(state.room.player, ELEVATOR) <= 3 && (
            <button onClick={() => act({ type: 'return' })}>回电梯</button>
          )}
        </div>
      )}
      {s.phase === 'live' && q && (
        <div className="season-source">
          <span>
            {q.title} <b>+{q.amount}</b>
          </span>
          <progress
            max={q.duration}
            value={work?.source === q.id ? work.ticks : 0}
          />
          <button
            disabled={p.passes.length + q.amount > 10}
            onClick={() =>
              act({
                type: 'interact-world',
                id: state.interacting === q.id ? null : q.id,
              })
            }
          >
            {state.interacting === q.id ? '取消' : '登记'} <kbd>E</kbd>
          </button>
        </div>
      )}
      {s.phase === 'live' && ground && (
        <button
          className="season-pickup"
          disabled={
            ground.contents.some((i) => i.kind === 'golden') &&
            p.qualified.includes(p.floor)
          }
          onClick={() =>
            act({
              type: 'interact-world',
              id: state.interacting === ground.id ? null : ground.id,
            })
          }
        >
          {state.interacting === ground.id
            ? '拾取中…'
            : ground.contents.some((i) => i.kind === 'golden')
              ? '拾取金票'
              : '拾取物品'}{' '}
          <kbd>E</kbd>
        </button>
      )}
      {state.room.resting && (
        <button
          className="season-source"
          onClick={() => act({ type: 'rest', enabled: false })}
        >
          休息中 · 停止
        </button>
      )}
      {s.phase === 'live' &&
        p.floor % 10 === 0 &&
        s.actors
          .filter(
            (a) =>
              a.id !== 'player' &&
              a.floor === p.floor &&
              a.status === 'alive' &&
              !a.inLift &&
              distance(a.position, state.room.player) < 12,
          )
          .sort(
            (a, b) =>
              Number(b.id === state.hostileTarget) -
                Number(a.id === state.hostileTarget) ||
              distance(a.position, state.room.player) -
                distance(b.position, state.room.player),
          )
          .slice(0, 1)
          .map((a) => (
            <button
              key={a.id}
              className="season-target"
              aria-pressed={state.hostileTarget === a.id}
              onClick={() =>
                act({
                  type: 'target-contestant',
                  id: state.hostileTarget === a.id ? null : a.id,
                })
              }
            >
              {state.hostileTarget === a.id ? '停止攻击' : '攻击'} {a.number}
              <small> {Math.ceil(a.hp)}</small>
            </button>
          ))}
      {held.length > 1 && (
        <div className="season-gold-warning">
          只可带回一张 · 在行囊扔下多余金票
        </div>
      )}
      {state.room.notice && state.room.noticeUntil > state.room.tick && (
        <output className="season-notice">{state.room.notice}</output>
      )}
    </>
  );
}

function SeasonEvents({ state }: Pick<Props, 'state'>) {
  return (
    <details className="season-events">
      <summary>事件记录</summary>
      <ul>
        {state
          .season!.events.slice(-12)
          .reverse()
          .map((e) => (
            <li key={e.id}>
              <span>{e.floor} F</span>
              <span>{e.text}</span>
            </li>
          ))}
      </ul>
    </details>
  );
}

function SeasonResult({
  state,
  restart,
}: {
  state: OpeningState;
  restart: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    s = state.season!,
    p = seasonPlayer(s),
    winner = s.actors.find((a) => a.id === s.result?.actor);
  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="season-result"
      aria-label="赛季结果"
      onCancel={(e) => e.preventDefault()}
    >
      <div>
        {s.phase === 'victory' ? <Trophy size={48} /> : <Skull size={48} />}
        <small>007 / {p.floor} F</small>
        <h2>
          {s.phase === 'victory'
            ? winner?.id === 'player'
              ? '本季优胜'
              : '本季结束'
            : '永久死亡'}
        </h2>
        <p>
          {s.phase === 'victory' && winner?.id !== 'player'
            ? `${winner?.number}号选手带回终局金票`
            : s.result?.reason}
        </p>
        <SeasonEvents state={state} />
        <button className="console-primary" onClick={restart}>
          新赛季
        </button>
      </div>
    </dialog>
  );
}
