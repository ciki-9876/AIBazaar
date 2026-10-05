import { Radio, Ticket, CircleCheck } from 'lucide-react';
import type { OpeningState } from '@/lib/survival-opening';
import {
  raceNextCheckpoint,
  racePlayer,
  PASS_CAPACITY,
} from '@/lib/survival-race';
import { nextRaceGoal } from '@/lib/survival-race-session';
import { clearSight } from '@/lib/survival-room';
import { raceTime } from './race-console';

export default function RaceHUD({ state }: { state: OpeningState }) {
  const r = state.race!,
    p = racePlayer(r),
    work = r.work.player;
  const near = r.sources.find(
    (s) =>
      s.floor === p.floor &&
      !s.exhausted &&
      Math.hypot(state.room.player.x - s.x, state.room.player.z - s.z) < 1.8 &&
      clearSight(state.room.player, s, state.room.world),
  );
  const last = r.events.at(-1);
  const checkpoint = p.floor % 10 === 0 && !p.qualified.includes(p.floor);
  const ready = checkpoint
    ? !state.room.enemies.some((e) => e.kind === 'boss' && e.hp > 0) &&
      p.passes.length >= 2
    : p.passes.length > 0;
  return (
    <>
      <aside
        key={`${p.floor}-${ready}`}
        className={`race-field ${ready ? 'quest-complete' : ''}`}
        aria-label="竞速目标"
      >
        <span className="race-live">
          <i /> 007 / LIVE
        </span>
        <div>
          <b>
            {p.floor}
            <small> / 100F</small>
          </b>
          <span>
            <Ticket size={16} /> {p.passes.length} / {PASS_CAPACITY}
          </span>
        </div>
        <p>
          {ready && <CircleCheck size={15} />} {nextRaceGoal(state)}
        </p>
        <footer>
          <span>{raceNextCheckpoint(p)}层审查</span>
          <time className={p.deadline - r.tick < 1800 ? 'urgent' : ''}>
            {raceTime(p.deadline - r.tick)}
          </time>
        </footer>
      </aside>
      {near && state.stage === 'expedition' && (
        <aside className="race-register-hint">
          <Ticket size={18} />
          <span>
            {near.guarded &&
            state.room.enemies.some((e) => e.kind === 'boss' && e.hp > 0)
              ? '先击败驻守者'
              : near.nextAt > r.tick
                ? `签发冷却 ${raceTime(near.nextAt - r.tick)}`
                : p.passes.length + near.amount > PASS_CAPACITY
                  ? '票袋已满，先回电梯使用'
                  : `按住 E · ${near.title} +${near.amount}`}
          </span>
          {work?.source === near.id && (
            <progress max={near.duration} value={work.ticks} />
          )}
        </aside>
      )}
      {last && r.tick - last.at < 135 && (
        <output key={last.id} className="race-broadcast">
          <Radio size={17} />
          <span>{last.text}</span>
        </output>
      )}
    </>
  );
}
