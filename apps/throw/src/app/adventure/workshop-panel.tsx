'use client';

import { useState, type RefObject } from 'react';
import type { AdventureState } from '../../lib/adventure/magician-world';
import { unlockedKit } from '../../lib/adventure/magician-world';
import { ITEMS, type ItemId } from '../../lib/cards/throw-loadout';
import { canUpgradeItem, UPGRADE_PRICES, UPGRADABLE_ITEMS, upgradedItemText, type UpgradeTier } from '../../lib/cards/throw-upgrades';
import { ObjectGlyph } from '../stage/glyphs';
import { KitTags } from '../wandeng/throw/throw-kit';
import { Fee } from './adventure-panels';
import { DialogueText } from './dialogue-text';

export function WorkshopPanel({ state, modalRef, onUpgrade, onClose }: {
  state: AdventureState;
  modalRef: RefObject<HTMLDialogElement | null>;
  onUpgrade: (id: ItemId, tier: UpgradeTier) => void;
  onClose: () => void;
}) {
  const owned = unlockedKit(state).items;
  const items = ITEMS.filter((item) => owned.includes(item.id) && UPGRADABLE_ITEMS.includes(item.id));
  const [selected, setSelected] = useState<ItemId>(items[0]?.id ?? 'quick');
  const item = items.find((entry) => entry.id === selected) ?? items[0];
  const tier = item ? state.itemUpgrades[item.id] : undefined;
  const nextTier = tier === 'silver' ? 'gold' : 'silver';
  const spare = item ? state.spareItems[item.id] ?? 0 : 0;
  const canBuy = item && canUpgradeItem(state.itemUpgrades, item.id, nextTier) && state.fee >= UPGRADE_PRICES[nextTier] && (nextTier !== 'gold' || spare > 0);
  return <div className="rg-system-shade"><dialog ref={modalRef} open className="rg-map-modal rg-workshop-panel" aria-modal="true" aria-labelledby="rg-workshop-title">
    <header className="rg-map-heading"><div><span>PRECISION & REPAIR</span><h2 id="rg-workshop-title">{state.act === 4 ? '纺锤精工铺' : '港口修缮工坊'}</h2><p>把熟悉的手艺，磨得更准一点。</p></div><button aria-label="关闭工坊" onClick={onClose}>×</button></header>
    <div className="rg-workshop-balance"><Fee value={state.fee} /><span>同款材料 {spare} 件 · 金级无数量上限</span></div>
    <div className="rg-workshop-layout"><nav aria-label="可改装道具">{items.map((entry) => <button key={entry.id} aria-pressed={entry.id === item?.id} onClick={() => setSelected(entry.id)}>
      <ObjectGlyph id={entry.id} family={entry.family} /><span>{entry.name}<small>{state.itemUpgrades[entry.id] === 'gold' ? '金级 · 精制' : state.itemUpgrades[entry.id] === 'silver' ? '银级 · 校准' : '原装'}</small></span>
    </button>)}{!items.length && <p>先带一件可改装道具来。店主的工具不认空箱子。</p>}</nav>
    {item && <section className="rg-workshop-bench"><div className="rg-workshop-showcase"><div key={`${item.id}:${tier ?? 'base'}`} className={`rg-workshop-object is-${tier ?? 'base'}`}><ObjectGlyph id={item.id} family={item.family} /><span>{tier === 'gold' ? 'GOLD' : tier === 'silver' ? 'SILVER' : 'ORIGINAL'}</span></div>
      <div><h3>{item.name}</h3><KitTags kind="item" id={item.id} /><p>当前：<DialogueText text={upgradedItemText(item.id, state.itemUpgrades)} /></p></div></div>
      <ol className="rg-upgrade-steps"><li className={tier ? 'is-done' : ''}><strong>银级校准 <b>£{UPGRADE_PRICES.silver}</b></strong><span>{upgradedItemText(item.id, { [item.id]: 'silver' })}</span></li><li className={tier === 'gold' ? 'is-done' : ''}><strong>金级精制 <b>£{UPGRADE_PRICES.gold}</b></strong><span>另消耗 1 件同款道具。{upgradedItemText(item.id, { [item.id]: 'gold' })}</span></li></ol>
      <p className="rg-workshop-note">先改装，再计算相邻增幅与家族效果。触发条件、格数和禁手时间不变。改装随道具永久保存，不重复叠加。</p>
    </section>}</div>
    <footer><span>「放心，我只拧螺丝，不拧命运。」</span><div className="rg-workshop-actions">
      {item && (tier === 'gold' ? <output className="rg-upgrade-finished">金级改装完成 · 下场演出即生效</output> : <button className="rg-primary" disabled={!canBuy} onClick={() => onUpgrade(item.id, nextTier)}>{tier === 'silver' && spare < 1 ? '缺少同款道具 · 到商店购材料' : state.fee < UPGRADE_PRICES[nextTier] ? `还需 £${UPGRADE_PRICES[nextTier] - state.fee}` : `进行${nextTier === 'gold' ? '金级精制' : '银级校准'} · £${UPGRADE_PRICES[nextTier]}`}</button>)}
      <button className="rg-secondary" onClick={onClose}>回到街区</button></div></footer>
  </dialog></div>;
}
