'use client';
import { ShoppingBag, ScanLine } from 'lucide-react';
import {
  type Run,
  type Action,
  itemCount,
  itemName,
  sellPrice,
} from '@/lib/demo-engine';
import ExpeditionSummary from './expedition-summary';
import { ContextHint } from './focus-guide';
// Permanent shop. Tutorial only points at controls that remain after onboarding.
export default function Homecoming({
  run,
  onAction,
}: {
  run: Run;
  onAction: (a: Action) => unknown;
}) {
  const stock = run.shopDay === run.day ? 2 - (run.shopBought ?? 0) : 2;
  const saleItems = run.items.filter(
    (x) => x.zone !== 'board' && x.id !== 'core',
  );
  return (
    <section className="permanent-shop ed-panel">
      <h1>
        <ShoppingBag />
        电梯商店
      </h1>
      {run.homeGuide === 'sell' && (
        <ContextHint
          mandatory
          step={{
            target: '[data-shop-item="relic"]',
            title: '售卖收获',
            body: '在收购列表找到镀金纪念章，点击售卖换取金币。',
          }}
        />
      )}
      {run.homeGuide === 'buy' && (
        <ContextHint
          mandatory
          step={{
            target: '.shop-scanner',
            title: '购买鉴定仪',
            body: '点击购买鉴定仪。每次使用消耗一只，商店每天限量供应。',
          }}
        />
      )}
      {run.homeGuide === 'scan' && (
        <ContextHint
          mandatory
          step={{
            target: '.ed-global-bag',
            title: '回到背包鉴定',
            body: '打开背包，选择守卫宝箱里的未鉴定武器，使用刚买的鉴定仪。',
          }}
        />
      )}
      {run.homeGuide === 'sleep' && (
        <ContextHint
          mandatory
          step={{
            target: '.ed-terminal-nav > button',
            title: '回房间休息',
            body: '返回电梯房间，再点击床睡觉。',
          }}
        />
      )}
      <div className="shop-columns">
        <section>
          <h2>购买</h2>
          <article className="shop-scanner rarity-3">
            <ScanLine />
            <h3>鉴定仪</h3>
            <p>使用一次 · 库存 {stock} / 2</p>
            <button
              className="ed-primary"
              disabled={stock <= 0 || run.material < 12}
              onClick={() => onAction({ type: 'buy-scanner' })}
            >
              购买 · 12 金币
            </button>
            <small>已有 {itemCount(run, 'scanner', false)} 个</small>
          </article>
        </section>
        <section>
          <h2>出售</h2>
          <div className="shop-sales">
            {saleItems.map((x) => (
              <article
                key={x.uid}
                data-shop-item={x.id}
                className={`rarity-${x.id === 'scanner' || x.id === 'relic' ? 3 : (x.rarity ?? 0)}`}
              >
                <span>
                  {itemName(x)} <small>×{x.amount}</small>
                </span>
                <button onClick={() => onAction({ type: 'sell', id: x.uid })}>
                  售卖 · {sellPrice(x)} 金币
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
      {run.expedition && !run.expedition.active && (
        <details>
          <summary>查看本次探索结算</summary>
          <ExpeditionSummary run={run} />
        </details>
      )}
    </section>
  );
}
