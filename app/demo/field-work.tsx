'use client';
import { useState } from 'react';
import {
  OBJECTS,
  FIELD_TITLES,
  fieldTask,
  type FieldNode,
} from '@/lib/field-items';
import {
  currentNode,
  currentFloor,
  fieldToolState,
  fieldWorkPreview,
  travelCost,
} from '@/lib/demo-engine';
import type { Run, Action } from '@/lib/demo-engine';
import { cardDef } from '@/lib/demo-cards';

export function ObjectInfo({ id }: { id: string }) {
  const object = OBJECTS[id];
  if (!object) return null;
  return (
    <div className="ed-object-info">
      <strong>实体用途 · {object.verb}</strong>
      <p>
        用于：{FIELD_TITLES[object.node]}。{object.use}
      </p>
      <p>{object.benefit}。</p>
      <p className="ed-hint">
        {object.consumed
          ? '使用会耗尽这件本体。'
          : '每件实体每次出勤可使用一次，使用后仍可转化。'}
        战斗准备仅在本次出勤下一场战斗使用，撤离清空。鉴定后变为「
        {cardDef(id).name}」，失去实体工具用途。
      </p>
    </div>
  );
}

export default function FieldWork({
  run,
  onAction,
}: {
  run: Run;
  onAction: (action: Action) => unknown;
}) {
  const node = currentNode(run) as FieldNode,
    task = fieldTask(run.seed, run.floor, node);
  const candidates = run.items.filter(
    (x) =>
      x.type === 'physical' &&
      ['bag', 'safe'].includes(x.zone) &&
      task.tools.includes(x.id),
  );
  const [uid, setUid] = useState(
    () => candidates.find((x) => fieldToolState(run, x.uid).allowed)?.uid ?? '',
  );
  const [value, setValue] = useState(0),
    [sequence, setSequence] = useState<number[]>([]),
    [lane, setLane] = useState(0);
  const item = candidates.find((x) => x.uid === uid),
    object = item ? OBJECTS[item.id] : null;
  const preview = fieldWorkPreview(run, uid, lane);
  const clear = () => {
    setValue(0);
    setSequence([]);
  };
  const answer =
    task.mode === 'sequence' ? sequence.reduce((n, x) => n * 10 + x, 0) : value;
  const complete = task.mode !== 'sequence' || sequence.length === 3;
  if (currentFloor(run).workResolved?.includes(node))
    return (
      <section className="ed-field-work">
        <p>这处机关已经处理过。准备与奖励不会重复领取。</p>
        <button
          className="ed-primary"
          onClick={() => onAction({ type: 'field-work', choice: -2 })}
        >
          继续通行 · 路程 {travelCost(run)} 精力
        </button>
      </section>
    );
  return (
    <section className="ed-field-work" aria-label={task.title + '操作台'}>
      <p>{task.text}</p>
      <div className="ed-field-readout">
        <span>现场提示</span>
        <strong>{task.hint}</strong>
      </div>
      <fieldset>
        <legend>1 · 选择实体工具</legend>
        <div className="ed-field-tools">
          {task.tools.map((id) => {
            const owned = candidates.filter((x) => x.id === id);
            return (
              <div key={id}>
                <strong>{OBJECTS[id].name}</strong>
                <p>{OBJECTS[id].benefit}</p>
                {owned.length ? (
                  owned.map((x) => (
                    <button
                      key={x.uid}
                      aria-pressed={uid === x.uid}
                      disabled={!fieldToolState(run, x.uid).allowed}
                      onClick={() => setUid(x.uid)}
                    >
                      {uid === x.uid ? '已选 · ' : ''}
                      {x.zone === 'safe' ? '安全容器' : '背包'} ·{' '}
                      {fieldToolState(run, x.uid).allowed
                        ? '本次可用'
                        : '本次已用'}
                    </button>
                  ))
                ) : (
                  <span className="ed-hint">未携带 · 卡牌形态不能替代</span>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend>2 · 调整机关（预览不扣费）</legend>
        {task.mode === 'point' && (
          <div className="ed-field-controls">
            {task.options.map((text, i) => (
              <button
                key={text}
                aria-pressed={value === i}
                onClick={() => setValue(i)}
              >
                {text}
              </button>
            ))}
          </div>
        )}
        {task.mode === 'sequence' && (
          <>
            <output className="ed-field-sequence" aria-live="polite">
              {sequence.length
                ? sequence.map((i) => task.options[i]).join(' → ')
                : '尚未设置顺序'}
            </output>
            <div className="ed-field-controls">
              {task.options.map((text, i) => (
                <button
                  key={text}
                  disabled={sequence.includes(i)}
                  onClick={() => setSequence((v) => [...v, i])}
                >
                  {text}
                </button>
              ))}
              <button
                disabled={!sequence.length}
                onClick={() => setSequence((v) => v.slice(0, -1))}
              >
                撤销一步
              </button>
            </div>
          </>
        )}
        {task.mode === 'balance' && (
          <label className="ed-field-range">
            右臂配重：<output>{value}</output>
            <input
              aria-label="右臂配重"
              type="range"
              min="0"
              max="12"
              step="1"
              value={value}
              onChange={(e) => setValue(+e.target.value)}
            />
            <small>
              左臂力矩 {task.answer} · 右臂力矩 {value}
            </small>
          </label>
        )}
        {task.mode === 'valves' && (
          <>
            <div className="ed-field-controls">
              {[1, 2, 4].map((weight, i) => (
                <button
                  key={weight}
                  aria-pressed={!!(value & weight)}
                  onClick={() => setValue((v) => v ^ weight)}
                >
                  {value & weight ? '已开 · ' : ''}
                  {task.options[i]}
                </button>
              ))}
            </div>
            <output>
              当前释放量 {value} / 目标 {task.answer}
            </output>
          </>
        )}
        {task.mode === 'mixture' && (
          <label className="ed-field-range">
            试剂份数{' '}
            <input
              aria-label="试剂份数"
              type="number"
              min="0"
              max="12"
              value={value}
              onChange={(e) => setValue(+e.target.value)}
            />
          </label>
        )}
        <button className="ed-field-reset" onClick={clear}>
          取消操作预览
        </button>
      </fieldset>
      {object && (
        <div className="ed-field-outcome">
          <strong>成功后的实际变化 · {object.verb}</strong>
          <p>{preview.summary}</p>
          {['salvage', 'barrier', 'pump'].includes(object.effect) && (
            <label>
              屏障准备路线{' '}
              <select value={lane} onChange={(e) => setLane(+e.target.value)}>
                {['上路', '中路', '下路'].map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p>
            {object.consumed
              ? '本次会消耗所选实体，之后无法鉴定。' +
                (object.effect === 'barrier'
                  ? '达到屏障上限时增加0，仍会消耗本体。'
                  : '')
              : '本体保留，用过后仍可带回鉴定。'}
          </p>
        </div>
      )}
      <p className="ed-hint">
        每次提交操作消耗2精力。读数错误不耗工具、不领奖，可调整重试；成功后另扣路费。取消预览不改变库存。
      </p>
      <div className="ed-actions">
        <button
          className="ed-primary"
          disabled={!preview.allowed || !complete}
          onClick={() =>
            onAction({ type: 'field-work', id: uid, choice: answer, at: lane })
          }
        >
          确认{object?.consumed ? '并消耗本体' : ''} · 操作2＋路程{preview.road}
        </button>
        <button
          disabled={run.stamina < 6 + travelCost(run)}
          onClick={() => onAction({ type: 'field-work', choice: -1 })}
        >
          绕行 · 6＋路程{travelCost(run)}精力
        </button>
      </div>
      <p className="ed-hint">绕行会永久放弃本层该机关的奖励，之后不能补领。</p>
      {!preview.allowed && <output>{preview.reason}</output>}
    </section>
  );
}
