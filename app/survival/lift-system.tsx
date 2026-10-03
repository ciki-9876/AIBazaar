'use client';
import DialogueBubble, { type DialogueControls } from './dialogue';
import type { DialogueCue } from '@/lib/survival-opening';
import { ASCENT_COST, ascentReady } from '@/lib/survival-ascent';
import {
  brainExperience,
  countKind,
  itemName,
  itemCount,
} from '@/lib/survival-stacks';
import { ITEMS } from '@/lib/survival-room';
import { useEffect, useRef } from 'react';
import { X, Settings } from 'lucide-react';
import type { OpeningState, OpeningAction } from '@/lib/survival-opening';
import { afterlightSettlement } from '@/lib/survival-afterlight';
import { paintTerminal } from './terminal-screen';
import { GearIcon } from './equipment';
import LiftTerminal from './lift-terminal';
import BaseUpgrade from './base-upgrade';
export type SystemTab = 'tasks' | 'inventory' | 'upgrade' | 'floors';
const tabs: [SystemTab, string][] = [
  ['upgrade', '电梯'],
  ['tasks', '任务'],
  ['inventory', '行囊'],
  ['floors', '楼层'],
];
const objectives: Partial<Record<OpeningState['afterlight']['phase'], string>> =
  {
    quiet: '稍作休息，听听机器人的话。',
    home: '听听机器人对这里的解释。',
    question: '了解生存规则。',
    safe: '把一件物品放进安全容器。',
    rule: '精神力归零，普通背包留在原地，可再次找回；已装备物品和安全容器保留。',
    'offer-food': '等机器人送出面包。',
    'serve-food': '接住面包。背包满时，先腾出一格。',
    'eat-food': '在行囊中选中面包，吃掉。',
    depart: '按右侧按键 E，选择 2 层，寻找饮水。',
    explore: '翻找维保廊的柜子，找到饮水。',
    report: '确认本次带回的物资。',
    'equip-module': '打开行囊，将增幅模块拖入装备栏，紧贴一件武器。',
    'upgrade-goal': '收集脑浆经验 30、机械零件 × 2，升级电梯并开启第三层。',
    ascend: '按 E，选择第三层。进入后，低楼层永久关闭。',
    branches: '带好物资，决定下一次出发。',
    complete: '探索维保廊，带着物资回家。',
  };
export default function LiftSystem({
  state,
  act,
  close,
  reduced,
  tab,
  onTab,
  dialogue,
  speech,
  playerSpeech,
  onPause,
}: {
  state: OpeningState;
  act: (a: OpeningAction) => void;
  close: () => void;
  reduced: boolean;
  tab: SystemTab;
  dialogue: DialogueControls;
  speech: DialogueCue | null;
  playerSpeech?: DialogueCue | null;
  onPause?: () => void;
  onTab: (t: SystemTab) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const feeding =
    ['feed', 'upgrade'].includes(state.homecoming.scene) &&
    state.stage === 'home';
  const locked = state.homecoming.scene === 'upgrade';
  const phase = state.afterlight.phase;
  const canDepart =
    state.stage === 'home' &&
    state.homecoming.scene === 'complete' &&
    state.afterlight.breadEaten &&
    ['depart', 'upgrade-goal', 'ascend', 'branches', 'complete'].includes(
      phase,
    );
  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    return () => d.close();
  }, []);
  useEffect(() => {
    if (canvas.current)
      paintTerminal(
        canvas.current.getContext('2d')!,
        state,
        reduced,
        tab === 'tasks' && phase === 'serve-food' ? true : 'system',
      );
  }, [state, reduced, tab, phase]);
  const disabled = (t: SystemTab) =>
    feeding ? t !== 'upgrade' : state.stage !== 'home' && t !== 'inventory';
  const select = (t: SystemTab) => {
    if (disabled(t)) return;
    if (t === 'floors') act({ type: 'open-door' });
    onTab(t);
  };
  const receipt = afterlightSettlement(state.afterlight, state.room);
  return (
    <dialog
      ref={dialog}
      className="lift-terminal lift-console"
      aria-label="电梯系统"
      data-system-tab={tab}
      onCancel={(e) => {
        e.preventDefault();
        if (!locked) close();
      }}
    >
      <header className="console-header">
        <h2>
          安泊 <span>居所 {state.room.liftLevel || 0}</span>
        </h2>
        <button aria-label="设置与暂停" onClick={onPause}>
          <Settings size={17} />
        </button>
        <button aria-label="关闭电梯系统" disabled={locked} onClick={close}>
          <X size={18} />
        </button>
      </header>
      <div
        role="tablist"
        tabIndex={-1}
        aria-label="电梯系统"
        className="console-tabs"
        onKeyDown={(e) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key))
            return;
          e.preventDefault();
          const available = tabs.filter(([t]) => !disabled(t));
          const index = available.findIndex(([t]) => t === tab);
          const next =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? available.length - 1
                : (index +
                    (e.key === 'ArrowRight' ? 1 : -1) +
                    available.length) %
                  available.length;
          select(available[next][0]);
          dialog.current
            ?.querySelector<HTMLButtonElement>(
              `#console-tab-${available[next][0]}`,
            )
            ?.focus();
        }}
      >
        {tabs.map(([t, label]) => (
          <button
            key={t}
            id={`console-tab-${t}`}
            role="tab"
            aria-controls={`console-panel-${t}`}
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            disabled={disabled(t)}
            onClick={() => select(t)}
          >
            {label}
            {t === 'inventory' && phase === 'eat-food' && (
              <i aria-label="面包待食用" />
            )}
          </button>
        ))}
      </div>
      <section
        className={`console-panel console-panel-${tab}`}
        id={`console-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`console-tab-${tab}`}
      >
        {tab === 'inventory' && <LiftTerminal state={state} act={act} />}
        {tab === 'tasks' && (
          <div className="console-task-layout">
            <canvas
              ref={canvas}
              className="console-robot"
              width={600}
              height={860}
              aria-label="机器人终端"
            />
            <section className="console-task-copy">
              {speech && (
                <DialogueBubble
                  text={speech.text}
                  speaker={speech.speaker}
                  controls={dialogue}
                  portrait={false}
                />
              )}
              {phase === 'report' && state.afterlight.failedReturn && (
                <p>精神力耗尽，普通背包已丢失。电梯已完成紧急恢复。</p>
              )}
              <h3>任务目标</h3>
              <p className="task-objective">{objectives[phase]}</p>
              {phase === 'eat-food' && (
                <div className="task-object">
                  <GearIcon kind="bread" size={64} />
                  <span>面包 × 1</span>
                </div>
              )}
              {phase === 'depart' && (
                <div className="task-object">
                  <GearIcon kind="water" size={64} />
                  <span>2 层 · 维保廊</span>
                </div>
              )}
              {phase === 'report' && (
                <div className="system-receipt">
                  {receipt.length ? (
                    receipt.map((i) => (
                      <div key={i.uid}>
                        <GearIcon kind={i.kind} />
                        <span>
                          {itemName(i)}
                          {itemCount(i) > 1 ? ` ×${itemCount(i)}` : ''}
                        </span>
                        <small>{i.location}</small>
                      </div>
                    ))
                  ) : (
                    <p>没有新增物资</p>
                  )}
                </div>
              )}
              <div className="task-actions">
                {phase === 'report' && (
                  <button
                    className="console-primary"
                    onClick={() => act({ type: 'confirm-report' })}
                  >
                    确认结算
                  </button>
                )}
                {phase === 'upgrade-goal' && (
                  <>
                    <button
                      className="console-primary"
                      onClick={() => onTab('upgrade')}
                    >
                      查看升级
                    </button>
                    <button onClick={close}>继续搜集</button>
                  </>
                )}
                {phase === 'ascend' && (
                  <button onClick={close}>
                    去选层按键 <kbd>E</kbd>
                  </button>
                )}
                {['safe', 'eat-food', 'serve-food', 'equip-module'].includes(
                  phase,
                ) && (
                  <button
                    className="console-primary"
                    onClick={() => onTab('inventory')}
                  >
                    打开行囊
                  </button>
                )}
                {phase === 'safe' && (
                  <button onClick={() => act({ type: 'skip-safe' })}>
                    先不保护
                  </button>
                )}
                {phase === 'depart' && (
                  <button onClick={close}>
                    去按键处 <kbd>E</kbd>
                  </button>
                )}
                {phase === 'branches' && (
                  <button
                    onClick={() => {
                      act({ type: 'finish-tutorial' });
                      close();
                    }}
                  >
                    准备好了
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
        {tab === 'upgrade' &&
          (feeding ? (
            <div className="feeding-shell">
              {speech && (
                <DialogueBubble
                  text={speech.text}
                  speaker={speech.speaker}
                  controls={dialogue}
                  portrait={false}
                />
              )}
              <BaseUpgrade state={state} act={act} reduced={reduced} />
            </div>
          ) : (
            <div className="console-task-layout">
              <canvas
                ref={canvas}
                className="console-robot"
                width={600}
                height={860}
                aria-label="机器人终端"
              />
              <section className="console-task-copy">
                {speech && (
                  <DialogueBubble
                    text={speech.text}
                    speaker={speech.speaker}
                    controls={dialogue}
                    portrait={false}
                  />
                )}
                <div className="lift-upgrade-title">
                  <small>居所升级</small>
                  <h3>
                    {(state.room.liftLevel || 1) >= 2
                      ? '02 / 已接通'
                      : '01 → 02'}
                  </h3>
                </div>
                <div className="upgrade-ledger">
                  <section>
                    <h4>
                      {(state.room.liftLevel || 1) >= 2
                        ? '升级条件 · 已投入'
                        : '升级条件'}
                    </h4>
                    <div className="upgrade-cost">
                      {ASCENT_COST.map((cost) => {
                        const complete = (state.room.liftLevel || 1) >= 2;
                        const count = complete
                          ? cost.count
                          : cost.kind === 'lift-material'
                            ? brainExperience(state.room.bag) +
                              (state.room.liftExperience || 0)
                            : countKind(state.room.bag, cost.kind);
                        return (
                          <div
                            key={cost.kind}
                            className={
                              count < cost.count ? 'missing' : 'fulfilled'
                            }
                          >
                            <GearIcon kind={cost.kind} />
                            <span>
                              {cost.kind === 'lift-material'
                                ? '脑浆经验'
                                : ITEMS[cost.kind].name}
                              <b>
                                {Math.min(count, cost.count)} / {cost.count}
                              </b>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <section className="upgrade-rewards">
                    <h4>升级奖励</h4>
                    <strong>
                      <span>03</span>听雨庭
                    </strong>
                    <p>接通第三层 · 解锁新的世界</p>
                  </section>
                </div>
                {(state.room.liftLevel || 1) < 2 ? (
                  <>
                    {state.room.safe.some((i) =>
                      ASCENT_COST.some((c) => c.kind === i.kind),
                    ) && <small>保护格中的材料需先取回背包</small>}
                    <button
                      className="console-primary"
                      disabled={
                        !ascentReady(state.room) ||
                        !state.afterlight.equipmentTaught
                      }
                      onClick={() => act({ type: 'upgrade-lift' })}
                    >
                      升级电梯
                    </button>
                  </>
                ) : (
                  <p className="upgrade-complete">
                    ✓ 本次升级已完成 <small>更高等级尚未开放</small>
                    {!!state.room.liftExperience && (
                      <small>
                        盈余经验 · {state.room.liftExperience} 已保留
                      </small>
                    )}
                  </p>
                )}
                {!['ascend', 'complete', 'branches'].includes(phase) && (
                  <button
                    className="console-task-link"
                    onClick={() => onTab('tasks')}
                  >
                    当前任务 →
                  </button>
                )}
              </section>
            </div>
          ))}
        {tab === 'floors' && (
          <div className="floor-picker">
            {speech && (
              <DialogueBubble
                text={speech.text}
                speaker={speech.speaker}
                controls={dialogue}
                portrait={false}
              />
            )}
            <h3>选择楼层</h3>
            <button className="floor-choice" disabled>
              <strong>01</strong>
              <span>
                荒原<small>已越过 · 永久关闭</small>
              </span>
            </button>
            <button
              className="floor-choice floor-available"
              disabled={!canDepart || state.lift.highestFloor > 2}
              onClick={() => {
                act({ type: 'choose-floor', floor: 2 });
                close();
              }}
            >
              <strong>02</strong>
              <span>
                维保廊
                <small>
                  {state.lift.highestFloor > 2
                    ? '已越过 · 永久关闭'
                    : '饮水 · 物资'}
                </small>
              </span>
              <b>前往 →</b>
            </button>
            <button
              className="floor-choice floor-available"
              disabled={!canDepart || (state.room.liftLevel || 1) < 2}
              onClick={() => {
                act({ type: 'choose-floor', floor: 3 });
                close();
              }}
            >
              <strong>03</strong>
              <span>
                {state.room.world.theme === 'dunes' ? '风蚀遗庭' : '听雨庭'}
                <small>
                  {(state.room.liftLevel || 1) < 2
                    ? '升级电梯后接通'
                    : '进入后低层永久关闭'}
                </small>
              </span>
              <b>前往 →</b>
            </button>
            {!canDepart && <p className="floor-locked">先完成当前任务</p>}
          </div>
        )}
      </section>
      {playerSpeech && (
        <DialogueBubble
          text={playerSpeech.text}
          speaker="player"
          controls={dialogue}
          className="console-player-thought"
        />
      )}
    </dialog>
  );
}
