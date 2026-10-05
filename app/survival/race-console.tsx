'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  Radio,
  Ticket,
  ShieldCheck,
  Clock3,
  ChevronsUp,
  ArrowRight,
  Pause,
  Lock,
  DoorOpen,
  PackageOpen,
  Warehouse,
  Swords,
  Check,
} from 'lucide-react';
import type { OpeningAction, OpeningState } from '@/lib/survival-opening';
import {
  destinationReason,
  raceNextCheckpoint,
  racePlayer,
  raceSpan,
  PASS_CAPACITY,
} from '@/lib/survival-race';
import BaseUpgrade from './base-upgrade';

export const raceTime = (ticks: number) => {
  const seconds = Math.max(0, Math.ceil(ticks / 30));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
export function PassCounter({ count }: { count: number }) {
  return (
    <span className="race-pass-counter">
      <Ticket size={18} /> <b>{count}</b>
      <small> / {PASS_CAPACITY}</small>
    </span>
  );
}
type Props = {
  state: OpeningState;
  act: (a: OpeningAction) => void;
  close?: () => void;
  reduced?: boolean;
  navigate?: (tab: 'inventory' | 'warehouse' | 'race' | 'tasks') => void;
};
export function RaceHome({
  state,
  act,
  close,
  navigate,
  reduced = false,
}: Props) {
  const r = state.race!,
    p = racePlayer(r),
    checkpoint = raceNextCheckpoint(p);
  const rivals = r.contestants.filter(
    (c) => c.id !== 'player' && c.status === 'active',
  );
  const leader = [...rivals].sort((a, b) => b.floor - a.floor)[0];
  return (
    <div className="race-home race-command">
      <header className="race-command-status">
        <div className="race-floor-display">
          <span>当前楼层</span>
          <strong>
            {String(p.floor).padStart(2, '0')}
            <small>F</small>
          </strong>
          <span className="race-finish">/ 100</span>
        </div>
        <div className="race-command-deadline">
          <span>
            <ShieldCheck size={15} /> 审查 {checkpoint}F
          </span>
          <time
            title="距本赛段资格截止的剩余时间"
            aria-label={`审查剩余${raceTime(p.deadline - r.tick)}`}
            className={p.deadline - r.tick <= 60 * 30 ? 'urgent' : ''}
          >
            {raceTime(p.deadline - r.tick)}
          </time>
          <small>
            <Pause size={12} /> 已暂停
          </small>
        </div>
      </header>
      <section className="race-command-departure" aria-label="出发与楼层路线">
        <DepartureControls
          state={state}
          act={act}
          close={close}
          navigate={navigate}
        />
        <footer className="race-command-tools">
          <button onClick={() => navigate?.('inventory')}>
            <PackageOpen size={17} /> 行囊
          </button>
          <button onClick={() => navigate?.('warehouse')}>
            <Warehouse size={17} /> 仓库
          </button>
          <button
            className="race-command-rivals"
            onClick={() => navigate?.('race')}
          >
            <Radio size={15} />
            {!leader
              ? r.contestants.some((c) => c.status === 'pending')
                ? '对手未入场'
                : '暂无在场对手'
              : leader.floor > p.floor
                ? `${leader.name}领先${leader.floor - p.floor}层`
                : leader.floor === p.floor
                  ? `${leader.name}与你同层`
                  : `你领先${p.floor - leader.floor}层`}
            <ArrowUpRight size={13} />
          </button>
        </footer>
      </section>
      <aside className="race-command-upgrade" aria-label="电梯成长">
        <BaseUpgrade state={state} act={act} reduced={reduced} compact />
      </aside>
    </div>
  );
}

/** Both terminal entries use the same legal destinations and explicit ascent confirmation. */
function DepartureControls({ state, act, close, navigate }: Props) {
  const r = state.race!,
    p = racePlayer(r),
    level = state.room.liftLevel || 2;
  const checkpoint = raceNextCheckpoint(p);
  const start = Math.min(p.floor, Math.max(1, checkpoint - 9));
  const floors = Array.from(
    { length: checkpoint - start + 1 },
    (_, i) => start + i,
  );
  const [selected, select] = useState<number | null>(null);
  const needsReview = p.floor === checkpoint && !p.qualified.includes(p.floor);
  const guardianReady = !state.room.enemies.some(
    (e) => e.kind === 'boss' && e.hp > 0,
  );
  const reviewReady = needsReview && guardianReady && p.passes.length >= 2;
  const report = state.afterlight.phase === 'report';
  const canDepart =
    state.stage === 'home' &&
    state.homecoming.scene === 'complete' &&
    state.afterlight.breadEaten &&
    r.scene === 'live' &&
    ['depart', 'upgrade-goal', 'ascend', 'branches', 'complete'].includes(
      state.afterlight.phase,
    );
  const validSelection =
    selected !== null &&
    selected > p.floor &&
    selected <= checkpoint &&
    !destinationReason(r, 'player', selected, level);
  const canAscend =
    !needsReview && !destinationReason(r, 'player', p.floor + 1, level);
  const depart = (floor: number) => {
    if (!canDepart || destinationReason(r, 'player', floor, level)) return;
    act({ type: 'open-door' });
    act({ type: 'choose-floor', floor });
    close?.();
  };
  const primary = report
    ? '确认返程物资'
    : reviewReady
      ? '进入审查'
      : needsReview
        ? `返回${p.floor}F${guardianReady ? '找票' : '挑战'}`
        : validSelection
          ? `上升至 ${String(selected).padStart(2, '0')}F`
          : canAscend
            ? '选择上升楼层'
            : `返回 ${String(p.floor).padStart(2, '0')}F 找票`;
  return (
    <div className="race-departure-controls">
      <div className="race-journey-heading">
        <span>{needsReview ? '审查准备' : '本赛段'}</span>
        <span className="race-journey-span" title="电梯一次最多跨越的楼层数">
          <ChevronsUp size={15} /> 跨度 {raceSpan(level)}F
        </span>
        <PassCounter count={p.passes.length} />
      </div>
      <div
        className="race-journey"
        aria-label={`当前${p.floor}层，下一审查${checkpoint}层`}
      >
        {floors.map((floor) => {
          const current = floor === p.floor,
            past = floor < p.floor;
          const reason = destinationReason(r, 'player', floor, level);
          const content = (
            <>
              <b>{String(floor).padStart(2, '0')}</b>
              <small>
                {current ? (
                  '你'
                ) : past ? (
                  '·'
                ) : floor - p.floor <= raceSpan(level) ? (
                  <>
                    <Ticket size={11} />
                    {floor - p.floor}
                  </>
                ) : (
                  <Lock size={11} />
                )}
              </small>
              {floor === checkpoint && (
                <ShieldCheck className="race-journey-checkpoint" size={12} />
              )}
            </>
          );
          return current || past ? (
            <span
              key={floor}
              className={`race-journey-stop ${current ? 'current' : 'past'}`}
            >
              {content}
            </span>
          ) : (
            <button
              key={floor}
              className={`race-journey-stop ${selected === floor ? 'selected' : ''}`}
              disabled={!canDepart || !!reason}
              title={reason || `${floor}层 · 消耗${floor - p.floor}张通行证`}
              aria-label={`${floor}层${floor === checkpoint ? '审查' : ''}，${reason || `消耗${floor - p.floor}张通行证`}`}
              aria-pressed={selected === floor}
              onClick={() => select(floor)}
            >
              {content}
            </button>
          );
        })}
      </div>
      {needsReview ? (
        <div className="race-command-requirements">
          <span className={guardianReady ? 'ready' : ''}>
            {guardianReady ? <Check size={16} /> : <Swords size={16} />} 驻守者
          </span>
          <span className={p.passes.length >= 2 ? 'ready' : ''}>
            <Ticket size={16} /> {Math.min(2, p.passes.length)}/2
            {p.passes.length >= 2 && <Check size={14} />}
          </span>
        </div>
      ) : (
        <p className="race-departure-note" aria-live="polite">
          {validSelection
            ? `消耗${selected! - p.floor}张 · 低层及跳过楼层永久关闭`
            : report
              ? '确认物资后出发'
              : canAscend
                ? '点选目的地 · 每层消耗1张'
                : '通行证不足 · 本层免费重进'}
        </p>
      )}
      <div className="race-command-actions">
        <button
          className="race-primary"
          disabled={
            report ? !navigate : !canDepart || (canAscend && !validSelection)
          }
          onClick={() =>
            report
              ? navigate?.('tasks')
              : reviewReady
                ? act({ type: 'review-race' })
                : depart(validSelection ? selected! : p.floor)
          }
        >
          {reviewReady ? (
            <ShieldCheck size={20} />
          ) : validSelection ? (
            <ChevronsUp size={20} />
          ) : (
            <DoorOpen size={20} />
          )}
          {primary}
          <ArrowRight size={18} />
        </button>
        {canAscend && (
          <button
            className="race-command-stay"
            disabled={!canDepart}
            onClick={() => depart(p.floor)}
          >
            继续搜刮 <small>免费</small>
          </button>
        )}
      </div>
    </div>
  );
}
export function RaceBoard({ state }: Pick<Props, 'state'>) {
  const r = state.race!,
    p = racePlayer(r);
  const entrants = [...r.contestants].sort(
    (a, b) =>
      Number(a.status === 'pending') - Number(b.status === 'pending') ||
      b.floor - a.floor ||
      a.arrivedAt - b.arrivedAt ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return (
    <div className="race-board">
      <header>
        <div>
          <span className="race-live">
            <i /> 公开赛况
          </span>
          <h3>
            终点 <b>100</b> 层
          </h3>
        </div>
        <div>
          <Clock3 size={16} />
          {raceTime(r.tick)} <small>比赛用时</small>
        </div>
      </header>
      <div className="race-roster">
        {entrants.map((c) => (
          <div
            className={`race-contestant ${c.status} ${c.id === 'player' ? 'self' : ''}`}
            key={c.id}
          >
            <span className="race-number">{c.number}</span>
            <div>
              <strong>{c.name}</strong>
              <small>
                {c.status === 'pending'
                  ? '未入场'
                  : c.status === 'eliminated'
                    ? '资格注销'
                    : c.status === 'winner'
                      ? '本季优胜'
                      : c.floor === p.floor
                        ? '同层'
                        : c.floor > p.floor
                          ? `领先${c.floor - p.floor}层`
                          : `落后${p.floor - c.floor}层`}
              </small>
            </div>
            <b>{c.status === 'pending' ? '—' : `${c.floor}F`}</b>
          </div>
        ))}
      </div>
      <section className="race-event-feed">
        <h4>
          <Radio size={14} /> 节目记录
        </h4>
        {[...r.events]
          .reverse()
          .slice(0, 12)
          .map((e) => (
            <p key={e.id}>
              <time>{raceTime(e.at)}</time>
              <span>{e.text}</span>
            </p>
          ))}
      </section>
    </div>
  );
}
export function RaceRoutes({ state, act, close, navigate }: Props) {
  const p = racePlayer(state.race!);
  return (
    <div className="race-routes race-command-routes">
      <header>
        <div>
          <small>目的地</small>
          <h3>
            {p.floor}F <ArrowRight size={22} /> {raceNextCheckpoint(p)}F
          </h3>
        </div>
      </header>
      <DepartureControls
        state={state}
        act={act}
        close={close}
        navigate={navigate}
      />
    </div>
  );
}
