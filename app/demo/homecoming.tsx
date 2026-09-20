'use client';
import { ShoppingBag, ScanLine, BedDouble, Coins } from 'lucide-react';
import { type Run, type Action, itemCount } from '@/lib/demo-engine';
import ExpeditionSummary from './expedition-summary';
import { ContextHint } from './focus-guide';
export default function Homecoming({
  run,
  onAction,
  onSleep,
}: {
  run: Run;
  onAction: (a: Action) => unknown;
  onSleep: () => void;
}) {
  const stage = run.homeGuide;
  const hints = {
    sell: [
      '把收获换成下一次机会',
      '纪念章很值钱。把它卖给电梯商店，准备下一次出发。',
    ],
    buy: [
      '买一只鉴定仪',
      '商店每天只卖2只，每只12金币。用完就会消失，留给值得鉴定的物品。',
    ],
    scan: ['打开最后一件战利品', '用刚买的鉴定仪，看看守卫宝箱里的武器。'],
    sleep: [
      '今天到这里',
      '睡一觉恢复精力，并开启下一次出勤。睡眠消耗1补给和1生命。',
    ],
    done: ['', ''],
  };
  const hint = hints[stage ?? 'done'];
  return (
    <section className="homecoming ed-panel">
      <h2>
        <ShoppingBag />
        电梯商店
      </h2>
      {!run.identification && stage && stage !== 'done' && (
        <ContextHint
          mandatory
          key={stage}
          step={{ target: '.homecoming-action', title: hint[0], body: hint[1] }}
        />
      )}
      <div className="homecoming-action">
        {stage === 'sell' ? (
          <button
            className="ed-primary rarity-3"
            onClick={() => onAction({ type: 'sell-relic' })}
          >
            <Coins />
            售出镀金纪念章 · +30
          </button>
        ) : stage === 'scan' ? (
          <button
            className="ed-primary"
            onClick={() =>
              onAction({ type: 'scan', id: 'tutorial-boss-weapon' })
            }
          >
            <ScanLine />
            鉴定宝箱武器
          </button>
        ) : stage === 'sleep' ? (
          <button className="ed-primary" onClick={onSleep}>
            <BedDouble />
            上床睡觉
          </button>
        ) : (
          <button
            className="ed-primary rarity-3"
            disabled={run.shopDay === run.day && (run.shopBought ?? 0) >= 2}
            onClick={() => onAction({ type: 'buy-scanner' })}
          >
            <ScanLine />
            购买鉴定仪 · 12 金币
          </button>
        )}
      </div>
      {(!stage || stage === 'done') &&
        run.items.some((x) => x.id === 'relic') && (
          <button onClick={() => onAction({ type: 'sell-relic' })}>
            <Coins />
            售出镀金纪念章 · +30
          </button>
        )}
      {run.expedition && !run.expedition.active && (
        <details>
          <summary>查看本次探索结算</summary>
          <ExpeditionSummary run={run} />
        </details>
      )}
      <small>
        今日库存 {run.shopDay === run.day ? 2 - (run.shopBought ?? 0) : 2} / 2 ·
        已有 {itemCount(run, 'scanner', false)} 个
      </small>
    </section>
  );
}
