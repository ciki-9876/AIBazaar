'use client';
import { useEffect, useRef, useState } from 'react';
import { HAND_NAMES, SUITS, rankText } from '../../../lib/cards/throw-poker';
import { ITEMS, RELICS, TICK_MS, type ThrowDuel } from '../../../lib/cards/throw-duel';
import { enchantOf } from '../../../lib/cards/throw-enchant';
import { PERFORMERS } from '../../../lib/cards/throw-performer';
import { ObjectGlyph } from '../../stage/glyphs';

/** Counters come from the rules ledger, including events already aged off the stage. */
export function BattleReport({ duel, onExit, onRetry }: { duel: ThrowDuel; onExit: () => void; onRetry: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const stats = duel.stats[0];
  const [damageView, setDamageView] = useState<'dealt' | 'taken'>('dealt');
  const damage = [
    ['直伤', stats.damage.direct, 'direct'], ['灼烧', stats.damage.burn, 'burn'],
    ['剧毒', stats.damage.poison, 'poison'], ['反弹', stats.damage.reflection, 'reflection'],
  ] as const;
  const taken = [
    ['直伤', stats.damageTaken.direct, 'direct'], ['灼烧', stats.damageTaken.burn, 'burn'],
    ['剧毒', stats.damageTaken.poison, 'poison'], ['反弹', stats.damageTaken.reflection, 'reflection'],
    ['落幕', stats.damageTaken.curtain, 'curtain'],
  ] as const;
  const shownDamage = damageView === 'dealt' ? damage : taken;
  const shownTotal = shownDamage.reduce((sum, [, value]) => sum + value, 0);
  const totalDamage = damage.reduce((sum, [, value]) => sum + value, 0);
  const triggers = [
    ...ITEMS.flatMap((item) => stats.itemTriggers[item.id] ? [{ ...item, count: stats.itemTriggers[item.id]! }] : []),
    ...RELICS.flatMap((relic) => stats.relicTriggers[relic.id] ? [{ ...relic, count: stats.relicTriggers[relic.id]!, family: 'relic' as const }] : []),
  ].sort((a, b) => b.count - a.count);
  const totalTriggers = triggers.reduce((sum, item) => sum + item.count, 0);
  return (
    <dialog ref={dialog} className="tp-battle-report" aria-labelledby="tp-report-title" onCancel={(event) => event.preventDefault()}>
      <header className="tp-report-heading">
        <span className="tp-report-eyebrow">THE LAST ACE · 演出记录</span>
        <h2 id="tp-report-title">{duel.winner === 0 ? '胜利' : duel.winner === 'draw' ? '平局' : '失败'}</h2>
        <p>{duel.winner === 0 ? '灯光为你停留了一刻。把这一手记下来。' : duel.winner === 'draw' ? '两个人同时鞠躬，掌声谁也没让。' : '幕布落下，下一场的答案藏在这一场里。'}</p>
        <small>{(duel.tick * TICK_MS / 1000).toFixed(1)} 秒 · 甩出 {stats.throws} 次 · 命中 {stats.hits} 次</small>
        {duel.endReason === 'deadline' && <p className="tp-house-rule">演出超时，未能在时限内取胜。</p>}
        {duel.endReason === 'floor' && <p className="tp-house-rule">气场跌破了本场规矩的底线。</p>}
      </header>
      <div className="tp-report-body">
        <section className="tp-report-totals" aria-label="对战总计">
          {[['实际伤害', totalDamage], ['产生护盾', stats.shieldGenerated], ['有效治疗', stats.healingDone], ['道具与遗物触发', totalTriggers]].map(([label, value]) => (
            <div key={label}><small>{label}</small><strong>{value}</strong></div>
          ))}
        </section>
        <div className="tp-report-columns">
          <section className="tp-report-panel">
            <h3>伤害账目 <small>实际气场损失 · 共 {shownTotal}</small></h3>
            <div className="tp-report-tabs" role="tablist" aria-label="伤害统计">
              {([['dealt', '造成伤害'], ['taken', '承受伤害']] as const).map(([value, label]) => <button key={value}
                id={`tp-damage-tab-${value}`} role="tab" aria-controls="tp-damage-panel" aria-selected={damageView === value}
                tabIndex={damageView === value ? 0 : -1} onClick={() => setDamageView(value)}
                onKeyDown={(event) => {
                  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
                  event.preventDefault();
                  const next = event.key === 'Home' ? 'dealt' : event.key === 'End' ? 'taken' : damageView === 'dealt' ? 'taken' : 'dealt';
                  setDamageView(next); event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#tp-damage-tab-${next}`)?.focus();
                }}>{label}</button>)}
            </div>
            <div className="tp-report-damage" role="tabpanel" id="tp-damage-panel" aria-labelledby={`tp-damage-tab-${damageView}`}>
              {shownDamage.map(([label, value, kind]) => <div key={kind} className={`tp-report-${kind}`}><span>{label}</span><i><b style={{ width: `${shownTotal ? value / shownTotal * 100 : 0}%` }} /></i><strong>{value}</strong></div>)}
            </div>
            <p className="tp-report-note">伤害统计抵扣后的气场损失，破盾单独记入出手记录；承受伤害包含落幕。护盾统计获得量，治疗统计实际恢复量。</p>
            <h3>出牌方式 <small>共 {stats.cardsThrown} 张 · 手法 {stats.sleightsUsed} 次</small></h3>
            <div className="tp-report-kinds">{stats.kinds.map((count, index) => count > 0 && <span key={index}>{HAND_NAMES[index]} <b>{count} 次</b></span>)}{!stats.throws && <p>尚未出牌。</p>}</div>
          </section>
          <section className="tp-report-panel">
            <h3>舞台上的功臣 <small>道具 / 遗物</small></h3>
            <div className="tp-report-triggers">{triggers.map((item) => <div key={`${item.family}:${item.id}`}><ObjectGlyph id={item.id} family={item.family} /><span>{item.name}</span><b>{item.count} <small>次</small></b></div>)}{!triggers.length && <p>本场尚未触发道具或遗物效果。</p>}</div>
          </section>
        </div>
        <section className="tp-report-panel tp-report-cards">
          <h3>本场每次出手 <small>按出手顺序 · 实际结算后的效果</small></h3>
          <ol className="tp-action-ledger">{stats.actions.map((action, index) => {
            const effectRows: [string, number, string][] = [
              ['直伤', action.effects.direct, 'direct'], ['灼烧伤害', action.effects.burn, 'burn'],
              ['剧毒伤害', action.effects.poison, 'poison'], ['破盾', action.effects.shieldDamage, 'shield'],
              ['获得护盾', action.effects.shield, 'shield'], ['治疗', action.effects.heal, 'heal'],
              ['点燃层数', action.effects.burnApplied, 'burn'], ['施毒层数', action.effects.poisonApplied, 'poison'],
              ['净化层数', action.effects.cleanse, 'heal'], ['承受反弹', action.effects.reflected, 'reflection'],
              ['抽牌', action.effects.draw, 'draw'], ['力量', action.effects.growth, 'growth'],
              ['迟缓秒', action.effects.slowMs / 1000, 'slow'], ['创伤秒', action.effects.woundMs / 1000, 'wound'],
            ];
            return <li key={action.id}>
              <div className="tp-action-heading"><b>第 {index + 1} 手</b><time>{(action.tick * TICK_MS / 1000).toFixed(1)}s</time><span>{action.name}</span>{action.performer && <small>{PERFORMERS[action.performer].name.split('·')[0]}</small>}</div>
              <div className="tp-action-cards">{action.cards.map((card) => <span key={card.uid} className={card.suit % 2 ? 'is-red' : ''}
                title={card.ench ? enchantOf(card.ench)?.name ?? card.ench : '白牌'}>{SUITS[card.suit]}{rankText(card.rank)}{card.ench && <small>{enchantOf(card.ench)?.name ?? card.ench}</small>}</span>)}</div>
              <div className="tp-action-effects">{effectRows.filter(([, amount]) => amount > 0).map(([label, amount, kind]) => <span key={label} className={`tp-action-${kind}`}><b>{amount}</b>{label}</span>)}
                {!effectRows.some(([, amount]) => amount > 0) && <small>未产生有效伤害或增益</small>}
                {action.status !== 'resolved' && <small>{action.status === 'cancelled' ? '飞牌未能命中' : '结束时仍在飞行'}</small>}
              </div>
            </li>;
          })}{!stats.actions.length && <li>还没来得及甩出第一张。</li>}</ol>
          <p className="tp-report-note">每手灼烧、剧毒伤害累计到该次施加的状态；角色手法与落幕等独立来源不冒记为某一手牌。过量治疗和被抵扣伤害已扣除。</p>
        </section>
      </div>
      <footer><button onClick={onExit}>退出</button><button className="tp-primary" onClick={onRetry}>重来</button></footer>
    </dialog>
  );
}
