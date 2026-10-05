import { CircleCheck } from 'lucide-react';
import type { OpeningState } from '@/lib/survival-opening';
import { ASCENT_COST } from '@/lib/survival-ascent';
import { brainExperience, countKind } from '@/lib/survival-stacks';

export default function FieldQuest({ state }: { state: OpeningState }) {
  const bag = [
    ...state.room.bag,
    ...state.room.safe,
    ...(state.room.warehouse || []),
  ];
  const water = !state.afterlight.equipmentTaught;
  const garden = state.room.floor === 3;
  const resources = ASCENT_COST.map((c) => ({
    ...c,
    value:
      c.kind === 'lift-material'
        ? brainExperience(bag) + (state.room.liftExperience || 0)
        : countKind(bag, c.kind) + (state.room.liftParts || 0),
  }));
  const complete = garden
    ? state.afterlight.collected.some(
        (i) => !state.afterlight.departureOwned.includes(i.uid),
      )
    : water
      ? state.afterlight.waterFound
      : resources.every((c) => c.value >= c.count);
  return (
    <aside
      key={`${state.room.floor}-${water}-${complete}`}
      className={`field-quest ${complete ? 'quest-complete' : ''}`}
      aria-label="任务目标"
      aria-live="polite"
    >
      <small>
        {complete ? (
          <>
            <CircleCheck size={15} /> 目标完成
          </>
        ) : (
          '任务目标'
        )}
      </small>
      <h3>
        {complete
          ? '回到电梯'
          : garden
            ? `探索${state.room.world.theme === 'dunes' ? '风蚀遗庭' : '听雨庭'}`
            : water
              ? '寻找饮水'
              : '寻找升级物资'}
      </h3>
      {garden ? (
        <p>{complete ? '已找到物资 · 安全带回' : '搜寻遗物，带回电梯'}</p>
      ) : water ? (
        <>
          <p>净水瓶 {state.afterlight.waterFound ? '1 / 1' : '0 / 1'}</p>
          <progress max={1} value={Number(state.afterlight.waterFound)} />
        </>
      ) : (
        resources.map((c) => (
          <p key={c.kind}>
            {c.kind === 'scrap' ? '机械零件' : '脑浆经验'}{' '}
            {Math.min(c.count, c.value)} / {c.count}
          </p>
        ))
      )}
      {complete && (
        <span className="quest-stamp" aria-hidden="true">
          <CircleCheck size={28} />
        </span>
      )}
    </aside>
  );
}
