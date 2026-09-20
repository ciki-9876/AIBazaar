'use client';
import {
  Swords,
  PackageOpen,
  Backpack,
  Sparkles,
  ArrowRight,
  ScanLine,
} from 'lucide-react';
import type { Run, Action } from '@/lib/demo-engine';
import { itemName } from '@/lib/demo-engine';
import { describeCard } from '@/lib/card-description';
export default function LootScene({
  loot,
  onAction,
  onBag,
}: {
  loot: NonNullable<Run['loot']>;
  onAction: (a: Action) => unknown;
  onBag: () => void;
}) {
  const item = loot.item,
    card =
      item.type === 'card'
        ? describeCard({ ...item, at: 0, rarity: item.rarity ?? 0 })
        : null;
  return (
    <section
      className={'loot-scene ' + (loot.revealed ? 'revealed' : '')}
      aria-label="战利品结算"
    >
      <div className="loot-rays" aria-hidden="true" />
      <p className="ed-kicker">
        {loot.source === 'battle'
          ? 'VICTORY / 战利品'
          : 'WORKSHOP CLEARED / 检修完成'}
      </p>
      <h1>{loot.source === 'battle' ? '把胜利带走' : '气室恢复了平静'}</h1>
      {!loot.revealed ? (
        <>
          <button
            className="loot-sealed"
            onClick={() => onAction({ type: 'reveal-loot' })}
            aria-label={
              loot.source === 'battle' ? '抽取敌方武器' : '打开检修箱'
            }
          >
            <PackageOpen size={68} />
            <span>
              {loot.source === 'battle' ? '抽取敌方武器' : '打开检修箱'}
            </span>
            <Sparkles size={22} />
          </button>
          <p>
            {loot.source === 'battle'
              ? '从刚击败的敌人武器中随机获得一件'
              : '一只完好的鉴定仪，藏在检修柜里。'}
          </p>
        </>
      ) : (
        <>
          <article className="loot-card">
            <div className="loot-emblem">
              {card ? <Swords size={54} /> : <ScanLine size={54} />}
            </div>
            <small>{loot.sourceName}</small>
            <h2>{itemName(item)}</h2>
            {card ? (
              <>
                <p className="loot-hit-type">
                  {card.hitType === 'instant' ? '即时命中' : '弹道命中'} ·{' '}
                  {item.volume} 格
                </p>
                {card.abilities.map((a) => (
                  <p key={a.when}>
                    <b>{a.when}</b>
                    {a.text}
                  </p>
                ))}
              </>
            ) : (
              <p>
                携带鉴定仪，将实体转化为卡牌。
                <br />
                附带 1 次鉴定电荷。
              </p>
            )}
          </article>
          <button
            className="ed-primary loot-claim"
            onClick={() => onAction({ type: 'claim-loot' })}
          >
            收入背包 <ArrowRight size={19} />
          </button>
        </>
      )}
      <button className="loot-pack" onClick={onBag}>
        <Backpack size={18} />
        整理背包
      </button>
    </section>
  );
}
