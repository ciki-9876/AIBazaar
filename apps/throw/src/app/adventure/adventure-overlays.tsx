'use client';

import { useState, type CSSProperties, type RefObject } from 'react';
import { ITEMS, RELICS, type ItemId, type RelicId } from '../../lib/cards/throw-loadout';
import { upgradedItemText } from '../../lib/cards/throw-upgrades';
import { PERFORMERS } from '../../lib/cards/throw-performer';
import { unlockedKit, RECRUITS, type AdventureState, type Reward } from '../../lib/adventure/magician-world';
import { RARITY_NAMES } from '../../lib/cards/throw-enchant';
import { Figure } from '../stage/rig';
import { ObjectGlyph } from '../stage/glyphs';
import { CardFace } from '../stage/card-art';
import { KitTags, UpgradeMark } from '../wandeng/throw/throw-kit';
import ThrowWorkbench from '../wandeng/throw/throw-workbench';
import { DeckCase } from '../wandeng/throw/throw-deckcase';
import type { PreparedThrowLoadout } from '../wandeng/throw/throw-table';
import { DialogueText } from './dialogue-text';
import { KitFilterBar } from '../wandeng/throw/throw-kit-filters';
import { EMPTY_KIT_FILTERS, matchesKitFilters, type KitFilterSelection, type KitReference } from '../../lib/cards/throw-kit-guide';
import { Fee, variantCard } from './adventure-panels';

type ModalRef = RefObject<HTMLDialogElement | null>;

/** Authored scroll shape shared by every route marker, including the optional blue route. */
export function QuestScroll() {
  return <svg viewBox="0 0 32 40" aria-hidden="true">
    <path d="M7 5h20v26c0 4-3 6-7 6H7V11H4a3 3 0 0 1 0-6h3Z" />
    <path d="M7 5v6M11 14h11M11 20h9M11 26h7M7 31h13a3 3 0 0 0 0 6" />
  </svg>;
}

export function RewardReveal({ reward, modalRef, onClose }: { reward: Reward; modalRef: ModalRef; onClose: () => void }) {
  const count = (reward.items?.length ?? 0) + (reward.relics?.length ?? 0) + (reward.variants?.length ?? 0);
  return <div className="rg-reveal-shade">
    <dialog ref={modalRef} open aria-modal="true" aria-labelledby="rg-reward-title" className="rg-reward-reveal">
      <div className="rg-reward-rays" aria-hidden="true" />
      <div className="rg-reward-sparkles" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index}
        style={{ '--i': index } as CSSProperties} />)}</div>
      <header><span className="rg-eyebrow">THE SHOW GOES ON</span><h2 id="rg-reward-title">这一程，有了新的收获。</h2>
        <p>{count ? '收进巡演箱。下一次上台，让它们派上用场。' : '掌声散去，报酬留在口袋里。'}</p></header>
      <div className="rg-reward-collection">
        {!!reward.fee && <article className="rg-reward-card rg-reward-money"><div className="rg-reward-coin">£</div><strong>+{reward.fee}</strong><span>演出费</span></article>}
        {reward.items?.map((id) => {
          const item = ITEMS.find((entry) => entry.id === id)!;
          return <article className="rg-reward-card" key={id}><ObjectGlyph id={id} family={item.family} />
            <small>道具收获</small><strong>{item.name}</strong><KitTags kind="item" id={id} /><p><DialogueText text={item.text} /></p></article>;
        })}
        {reward.relics?.map((id) => {
          const relic = RELICS.find((entry) => entry.id === id)!;
          return <article className="rg-reward-card rg-reward-relic" key={id}><ObjectGlyph id={id} family="relic" />
            <small>新遗物</small><strong>{relic.name}</strong><KitTags kind="relic" id={id} /><p><DialogueText text={relic.text} /></p></article>;
        })}
        {reward.variants?.map((ref) => {
          const { card, enchant } = variantCard(ref);
          return <article className="rg-reward-card rg-reward-playing" key={ref}><CardFace card={card} />
            <small>{enchant ? RARITY_NAMES[enchant.rarity] : '卡牌'}</small><strong>{enchant?.name}</strong><p><DialogueText text={enchant?.text ?? ''} /></p></article>;
        })}
      </div>
      <button className="rg-primary" onClick={onClose} autoFocus>收下，继续旅程 <span>→</span></button>
    </dialog>
  </div>;
}

export function RecruitBoard({ state, modalRef, onHire, onClose }: {
  state: AdventureState; modalRef: ModalRef; onHire: () => void; onClose: () => void;
}) {
  const joined = state.troupe.includes('stan');
  return <div className="rg-system-shade"><dialog ref={modalRef} open aria-modal="true" aria-labelledby="rg-recruit-title" className="rg-map-modal rg-recruit-board">
    <header className="rg-board-heading"><div><span>{state.act === 4 ? 'SHUTTLE & TEA · NOTICE BOARD' : state.act === 3 ? 'SALT & WIND · NOTICE BOARD' : 'THE DRUNKEN GOOSE · NOTICE BOARD'}</span><h2 id="rg-recruit-title">{state.act === 4 ? '梭子与茶招募告示板' : state.act === 3 ? '盐风酒馆招募告示板' : '醉鹅招募告示板'}</h2></div>
      <button onClick={onClose} aria-label="关闭招募告示板">×</button></header>
    <div className="rg-board-papers">
      <article className="rg-hiring-paper"><i className="rg-paper-pin" /><small>寻一支愿意等人的剧团</small><h3>司机斯坦</h3>
        <div className="rg-board-portrait"><Figure character="stan" crop="bust" height={160} /></div>
        <blockquote>会开巴士，会换牌，会等人。<br />可随团巡演。厕所时间另计。</blockquote>
        <dl><dt>拿手天赋</dt><dd>{PERFORMERS.stan.talent.name} · {PERFORMERS.stan.talent.text}</dd>
          <dt>手法</dt><dd>{PERFORMERS.stan.sleight.name} · {PERFORMERS.stan.sleight.text}</dd>
          <dt>聘金 / 周薪</dt><dd>£1 / £{RECRUITS.stan.wage}</dd></dl>
        {joined ? <div className="rg-hired-stamp">已随团巡演</div> : <button className="rg-primary" onClick={onHire} disabled={state.fee < 1}>揭下告示 · 聘请 £1</button>}
        {!joined && state.fee < 1 && <small>还差 £1。街头演出可以赚取演出费。</small>}
      </article>
      {state.act === 4 ? <article className="rg-hiring-paper rg-kitchen-paper"><i className="rg-paper-pin" /><small>铜管广场留条</small><h3>小号手皮普</h3>
        <div className="rg-board-portrait"><Figure character="pip" crop="bust" height={160} /></div><blockquote>第三声部，想和伙伴一起上台。</blockquote>
        <p>在铜管广场完成三声部演出，再亲自邀请皮普。每周薪水 £4。</p>
        {state.troupe.includes('pip') ? <div className="rg-hired-stamp">已随团巡演</div> : <small>去铜管广场找他，不用在看板代签邀请。</small>}
      </article> : <>
      <article className="rg-hiring-paper rg-kitchen-paper"><i className="rg-paper-pin" /><small>厨房留条</small><h3>罗茜说了——</h3>
        <blockquote>「先学会好好吃饭，<br />再谈一起上路。」</blockquote>
        <p>尝尝炖菜、聊聊火，和她熟悉起来。好感达到 {RECRUITS.rosie.threshold} 后，到吧台邀请她。</p>
        <div className="rg-board-affinity">好感 {state.affinity.rosie ?? 0} / {RECRUITS.rosie.threshold}</div>
        {state.troupe.includes('rosie') ? <div className="rg-hired-stamp">已随团巡演</div> : <small>{state.act === 3 ? '她在港口酒馆照看新的炉子。' : '她就在醉鹅吧台旁。'}</small>}
      </article>
      </>}
      <aside className="rg-community-notes"><div>寻猫<br /><small>白色，脾气像房东。<br />看见了也不必追。</small></div><div>旧自行车出售<br /><small>缺铃。不影响骑行，<br />影响别人让路。</small></div><p>请勿揭走别人的生活。<br />招聘告示除外。</p></aside>
    </div>
    <footer><span>你的演出费 <Fee value={state.fee} /></span><button className="rg-secondary" onClick={onClose}>返回酒馆</button></footer>
  </dialog></div>;
}

export function BackpackIntro({ modalRef, onOpen, onLater }: { modalRef: ModalRef; onOpen: () => void; onLater: () => void }) {
  return <div className="rg-reveal-shade"><dialog ref={modalRef} open aria-modal="true" aria-labelledby="rg-backpack-intro" className="rg-backpack-intro">
    <span className="rg-eyebrow">第一章完成 · 新系统开启</span><div className="rg-backpack-emblem"><ObjectGlyph id="quick" family="damage" /></div>
    <h2 id="rg-backpack-intro">你的巡演背包，正式开箱。</h2>
    <p><DialogueText text="点击顶部的「背包」或按" /> <kbd>B</kbd><DialogueText text="，随时整理下一场演出。" /></p>
    <ol><li><DialogueText text="道具与遗物：查看收藏，挑选互相搭配的效果。" /></li><li><DialogueText text="布阵：拖进十格巡演箱，调整相邻关系。" /></li><li><DialogueText text="卡牌：在牌匣里换上收集到的变种。" /></li></ol>
    <div><button className="rg-secondary" onClick={onLater}>稍后整理</button><button className="rg-primary" onClick={onOpen}>打开我的背包</button></div>
  </dialog></div>;
}

export function BackpackPanel({ state, loadout, onChange, modalRef, onClose }: {
  state: AdventureState; loadout: PreparedThrowLoadout; onChange: (value: PreparedThrowLoadout) => void; modalRef: ModalRef; onClose: () => void;
}) {
  const [tab, setTab] = useState<'formation' | 'items' | 'relics' | 'cards'>('formation');
  const [cardsOpen, setCardsOpen] = useState(false);
  const [filters, setFilters] = useState<KitFilterSelection>(EMPTY_KIT_FILTERS);
  const available = unlockedKit(state);
  const tabs = [{ id: 'formation', name: '布阵' }, { id: 'items', name: '道具' }, { id: 'relics', name: '遗物' }, { id: 'cards', name: '卡牌' }] as const;
  const collection = tab === 'items' ? ITEMS.filter((item) => available.items.includes(item.id)) : RELICS.filter((relic) => available.relics.includes(relic.id));
  const filterKind = tab === 'items' ? 'item' : 'relic';
  const catalog: KitReference[] = tab === 'items' ? available.items.map((id) => ({kind:'item', id})) : available.relics.map((id) => ({kind:'relic', id}));
  const visibleCollection = collection.filter(({ id }) => matchesKitFilters(filterKind, id, filters));
  return <div className="rg-system-shade"><dialog ref={modalRef} open aria-modal="true" aria-labelledby="rg-backpack-title" className="rg-map-modal rg-backpack">
    <header className="rg-map-heading"><div><span>TOURING TRUNK</span><h2 id="rg-backpack-title">我的巡演背包</h2></div><button onClick={onClose} aria-label="关闭背包">×</button></header>
    <nav className="rg-backpack-tabs" aria-label="背包分类">{tabs.map((entry) => <button key={entry.id} aria-pressed={tab === entry.id} onClick={() => { setTab(entry.id); setFilters(EMPTY_KIT_FILTERS); }}>{entry.name}</button>)}</nav>
    <div className="rg-backpack-body">
      {tab === 'formation' && <ThrowWorkbench layout={loadout.layout} relic={loadout.relic} style={loadout.style} available={available} upgrades={state.itemUpgrades}
        onLayout={(layout) => onChange({ ...loadout, layout })} onRelic={(relic) => onChange({ ...loadout, relic })}
        onStyle={(style) => onChange({ ...loadout, style })} tap={() => {}} />}
      {(tab === 'items' || tab === 'relics') && <><KitFilterBar catalog={catalog} value={filters} onChange={setFilters} /><div className="rg-backpack-collection">{visibleCollection.map((entry) => <article key={entry.id}>
        <ObjectGlyph id={entry.id} family={'family' in entry ? entry.family : 'relic'} /><h3>{entry.name}{tab === 'items' && <UpgradeMark tier={state.itemUpgrades[entry.id as ItemId]} />}</h3>
        {tab === 'items' ? <KitTags kind="item" id={entry.id as ItemId} /> : <KitTags kind="relic" id={entry.id as RelicId} />}
        <p><DialogueText text={tab === 'items' ? upgradedItemText(entry.id as ItemId, state.itemUpgrades) : entry.text} /></p><small>{entry.quip}</small>{tab === 'items' && <small>同款材料 ×{state.spareItems[entry.id as ItemId] ?? 0}</small>}
        {tab === 'items' ? <button className="rg-secondary" onClick={() => setTab('formation')}>前往布阵</button>
          : <button className="rg-secondary" onClick={() => onChange({ ...loadout, relic: loadout.relic === entry.id ? null : entry.id as RelicId })}>{loadout.relic === entry.id ? '取下遗物' : '装备遗物'}</button>}
      </article>)}{!collection.length && <p>这一格收藏还空着。继续旅程，舞台上会有新的收获。</p>}</div></>}
      {tab === 'cards' && <div className="rg-backpack-cards"><h3>一副牌，五十二种可能。</h3><p>标准 52 张牌一直可用；你已收集 {state.owned.variants.length} 个变种，已装上 {Object.keys(loadout.book ?? {}).length} 个。</p>
        <button className="rg-primary" onClick={() => setCardsOpen(true)}>打开牌匣 · 管理卡牌</button>
        <div className="rg-owned-variants">{state.owned.variants.map((ref) => { const variant = variantCard(ref); return <article key={ref}><CardFace card={variant.card} /><strong>{variant.enchant?.name}</strong></article>; })}</div></div>}
    </div><footer><small>调整即时保存，下次上台沿用这只巡演箱。</small><button className="rg-primary" onClick={onClose}>整理好了</button></footer>
    {cardsOpen && <DeckCase book={loadout.book ?? {}} owned={state.owned.variants} onBook={(book) => onChange({ ...loadout, book })} onClose={() => setCardsOpen(false)} tap={() => {}} />}
  </dialog></div>;
}
