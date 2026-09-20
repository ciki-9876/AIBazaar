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
import { MinigameShell } from './minigame-room';
import { PackageOpen, Leaf } from 'lucide-react';
import FocusGuide from './focus-guide';

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
      <small>
        {object.consumed ? '使用后耗尽' : '本体保留 · 每次出勤限用一次'}
      </small>
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
  const [selected, setSelected] = useState<string[]>([]);
  const [help, setHelp] = useState(true);
  const [value, setValue] = useState(0),
    [sequence, setSequence] = useState<number[]>([]),
    [lane, setLane] = useState(0);
  const chosen = candidates.filter((x) => selected.includes(x.uid));
  const preview = fieldWorkPreview(run, selected, lane);
  const consumed = chosen.filter((x) => OBJECTS[x.id].consumed);
  const hasBarrier = chosen.some((x) =>
    ['salvage', 'barrier', 'pump'].includes(OBJECTS[x.id].effect),
  );
  const clear = () => {
    setValue(0);
    setSequence([]);
    setSelected([]);
    setLane(0);
  };
  const answer =
    task.mode === 'sequence' ? sequence.reduce((n, x) => n * 10 + x, 0) : value;
  const complete = task.mode !== 'sequence' || sequence.length === 3;
  if (currentFloor(run).workResolved?.includes(node))
    return (
      <section className="ed-field-work">
        <p>通道已经畅通，远处传来电梯的回声。</p>
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
      {help && (
        <FocusGuide
          step={{
            target: '.ed-device-controls',
            title: task.title,
            body: `${task.hint}。不使用物品也能完成；选择物品可以增加额外收益。完成后开启奖励，重置不会消耗物品。`,
          }}
          onNext={() => setHelp(false)}
        />
      )}
      <MinigameShell
        reward={
          <>
            <PackageOpen size={64} />
            <strong>通关宝箱</strong>
          </>
        }
        controls={
          <>
            <button
              onClick={() => onAction({ type: 'field-work', choice: -1 })}
            >
              跳过
            </button>
            <button onClick={clear}>重置</button>
            <button aria-label="玩法帮助" onClick={() => setHelp(true)}>
              ?
            </button>
            <button
              className="ed-primary"
              disabled={!preview.allowed || !complete}
              onClick={() =>
                onAction({
                  type: 'field-work',
                  ids: selected,
                  choice: answer,
                  at: lane,
                })
              }
            >
              完成 <Leaf size={16} /> 2
            </button>
          </>
        }
        tools={
          <fieldset className="ed-tool-selection">
            <legend>携带工具</legend>
            <div className="ed-field-tools">
              {task.tools.map((id) => {
                const owned = candidates.filter((x) => x.id === id);
                const available = owned.filter(
                  (x) => fieldToolState(run, x.uid).allowed,
                );
                const picked = owned.filter((x) => selected.includes(x.uid));
                const next = available.find((x) => !selected.includes(x.uid));
                const bag = owned.filter((x) => x.zone === 'bag').length;
                return (
                  <div key={id} className={picked.length ? 'is-selected' : ''}>
                    <strong>{OBJECTS[id].name}</strong>
                    <p>{OBJECTS[id].benefit}</p>
                    <div className="ed-tool-quantity">
                      <div>
                        <button
                          aria-label={`减少${OBJECTS[id].name}`}
                          disabled={!picked.length}
                          onClick={() =>
                            setSelected((v) =>
                              v.filter(
                                (uid) => uid !== picked[picked.length - 1].uid,
                              ),
                            )
                          }
                        >
                          −
                        </button>
                        <output aria-label={`${OBJECTS[id].name}使用数量`}>
                          {picked.length}
                        </output>
                        <button
                          aria-label={`增加${OBJECTS[id].name}`}
                          disabled={!next}
                          onClick={() =>
                            next && setSelected((v) => [...v, next.uid])
                          }
                        >
                          +
                        </button>
                      </div>
                      <small>
                        背包 {bag} 件
                        {owned.length > bag
                          ? ` · 安全箱 ${owned.length - bag}`
                          : ''}
                      </small>
                      {available.length !== owned.length && (
                        <small>本次可用 {available.length} 件</small>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {hasBarrier && (
              <label className="ed-field-lane">
                加固路线{' '}
                <select value={lane} onChange={(e) => setLane(+e.target.value)}>
                  {['左路', '中路', '右路'].map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {consumed.length > 0 && (
              <p className="ed-tool-consumed">
                用尽：
                {task.tools
                  .flatMap((id) => {
                    const count = consumed.filter((x) => x.id === id).length;
                    return count ? [`${OBJECTS[id].name} ×${count}`] : [];
                  })
                  .join('、')}
              </p>
            )}
          </fieldset>
        }
      >
        <fieldset className="ed-device-controls">
          <legend>{task.title}</legend>
          <p className="ed-work-intent">
            {chosen.length
              ? `${task.condition}：${[...new Set(chosen.map((x) => OBJECTS[x.id].verb))].join(' · ')}`
              : task.condition}
          </p>
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
        </fieldset>
      </MinigameShell>
    </section>
  );
}
