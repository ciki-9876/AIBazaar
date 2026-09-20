'use client';
import { useEffect, useState } from 'react';

const tours = {
  map: [
    [
      '挑选目的地',
      '每次出勤前看一眼楼层情报和工具需求。一天能出发一次，也可以跳层挑战。',
      '.ed-floor-map',
    ],
    [
      '记住停靠点',
      '击败守卫并完成撤离，才会确认新停靠点。提前撤离返回出发处；紧急回收会损失生命和普通背包。',
      '.ed-floor-map',
    ],
  ],
  terminal: [
    [
      '扩建与升级',
      '扩建增加设施槽，升级解锁战斗格和新设施。下一等级的解锁内容列在顶部。',
      '.ed-module-plan',
    ],
    [
      '让物资派上用场',
      '按需要建造设施，把物资换成补给、精力或鉴定仪。每座设施每天使用一次，按钮显示本次成本。',
      '.ed-terminal-content',
    ],
  ],
  field: [
    [
      '带上工具',
      '用加减号选择实体数量。不同工具带来不同收获；同类多件可一起使用，实际收益以现场提示为准。',
      '.ed-tool-selection',
    ],
    [
      '处理现场',
      '工具已经就位，再根据现场线索调整机关。机关稳定后，所选工具才能完成各自的作业。',
      '.ed-device-controls',
    ],
    [
      '核对收获',
      '确认前查看收获、用尽物品和精力成本。错误尝试花费2精力，工具保留；取消预览不花资源。',
      '.ed-field-readout',
    ],
  ],
  inventory: [
    [
      '整理行装',
      '点击物品查看用途。未鉴定实体可在探索中作为工具，也可以带回电梯转化成战斗卡牌。',
      '.ed-inventory-tabs',
    ],
    [
      '安排阵容',
      '选择卡牌后使用手动落点，移动或交换位置；也可以快捷自动上阵。',
      '.ed-build-board',
    ],
  ],
  room: [
    [
      '先从房间出发',
      '点击房间物件使用设施。鉴定台把实体转化为卡牌，桌面可以整理阵容。',
      '.ed-room-identify',
    ],
    [
      '准备下一次出勤',
      '门口选择楼层。带上工具和补给，回到电梯后可以睡眠、鉴定和升级。',
      '.ed-room-door',
    ],
  ],
  explore: [
    [
      '沿路线探索',
      '搜查带回物资，机关让工具派上用场。每次前往下一节点通常消耗3精力。',
      '.ed-route',
    ],
    [
      '留好归途',
      '正常撤离需要8精力；紧急回收会扣除生命。开战前可查看敌阵并整理行装。',
      '.ed-explore-grid',
    ],
  ],
} as const;
export type TourContext = keyof typeof tours;

export default function Onboarding({ context }: { context: TourContext }) {
  const [step, setStep] = useState<number | null>(null);
  const steps = tours[context];
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        if (!localStorage.getItem(`f9.guide.v1.${context}`)) setStep(0);
      } catch {
        /* The guide remains available without persistent storage. */
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [context]);
  useEffect(() => {
    if (step === null) return;
    const target = document.querySelector(steps[step][2]);
    target?.classList.add('ed-tour-focus');
    return () => target?.classList.remove('ed-tour-focus');
  }, [step, steps]);
  const close = () => {
    setStep(null);
    try {
      localStorage.setItem(`f9.guide.v1.${context}`, 'done');
    } catch {
      /* Optional preference. */
    }
  };
  if (step === null)
    return (
      <button className="ed-guide-reopen" onClick={() => setStep(0)}>
        操作引导
      </button>
    );
  return (
    <aside className="ed-onboarding" aria-label="新手引导">
      <div>
        <small>
          初次到访 · {step + 1}/{steps.length}
        </small>
        <strong>{steps[step][0]}</strong>
        <p>{steps[step][1]}</p>
      </div>
      <div className="ed-tour-actions">
        <button onClick={close}>跳过</button>
        <button
          onClick={() =>
            step + 1 < steps.length ? setStep(step + 1) : close()
          }
        >
          {step + 1 < steps.length ? '下一步' : '知道了'}
        </button>
      </div>
    </aside>
  );
}
