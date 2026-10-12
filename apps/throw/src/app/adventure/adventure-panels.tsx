'use client';

import { useState, type KeyboardEvent, type RefObject } from 'react';
import {
  BATTLES,
  CHARACTERS,
  GOSSIP,
  INTEL_NAMES,
  INTEL_PRICES,
  INTEL_SLOTS,
  intelView,
  lodgingsFor,
  lodgingOf,
  MEALS,
  memberBook,
  memberStatus,
  MOODS,
  presenceBreakdown,
  RECRUITS,
  scoutable,
  SLOT_NAMES,
  stageLevel,
  WEEKDAYS,
  weekday,
  weekNumber,
  type BattleId,
  type IntelSource,
  type MealTier,
  offerOwned,
  offerStocked,
  shopFor,
  SHOWS,
  type AdventureState,
  type CharacterId,
  type ShowId,
  type ShopOffer,
} from '../../lib/adventure/magician-world';
import { fighterSleight } from '../../lib/cards/throw-duel';
import { ITEMS, RELICS, type ItemId, type RelicId } from '../../lib/cards/throw-loadout';
import { enchantOf, RARITY_NAMES } from '../../lib/cards/throw-enchant';
import { HAND_NAMES, SUITS } from '../../lib/cards/throw-poker';
import { ObjectGlyph } from '../stage/glyphs';
import { CardFace } from '../stage/card-art';
import { Figure, type RigId } from '../stage/rig';
import { PERFORMERS, type PerformerId } from '../../lib/cards/throw-performer';
import { KitTags } from '../wandeng/throw/throw-kit';
import { KitFilterBar } from '../wandeng/throw/throw-kit-filters';
import { EMPTY_KIT_FILTERS, matchesKitFilters, type KitFilterSelection, type KitReference } from '../../lib/cards/throw-kit-guide';
import { DialogueText } from './dialogue-text';

/** Variant reference `${suit}-${rank}:${id}` → a card to draw and its enchantment. */
export function variantCard(ref: string) {
  const [key, id] = ref.split(':');
  const [suit, rank] = key.split('-').map(Number);
  return { card: { uid: `v-${ref}`, suit: suit as 0 | 1 | 2 | 3, rank, ench: id }, enchant: enchantOf(id) };
}

const Fee = ({ value }: { value: number }) => (
  <span className="rg-fee" aria-label={`演出费 ${value}`}>
    <i aria-hidden="true">£</i>
    {value}
  </span>
);
export { Fee };

function PanelHeading({ title, eyebrow, onClose }: { title: string; eyebrow: string; onClose: () => void }) {
  return (
    <div className="rg-map-heading">
      <div>
        <h2>{title}</h2>
        <span>{eyebrow}</span>
      </div>
      <button aria-label="关闭" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

export function ShopPanel({
  state,
  modalRef,
  onBuy,
  onClose,
}: {
  state: AdventureState;
  modalRef: RefObject<HTMLDialogElement | null>;
  onBuy: (id: string) => void;
  onClose: () => void;
}) {
  const shop = shopFor(state);
  const stocked = shop.filter((offer) => offerStocked(state, offer.id));
  const shopName = state.act === 4 ? '纺锤精工铺 · 道具与材料' : state.act === 3 ? '港口修缮工坊 · 货架' : '霍布斯旧货铺';
  const categories: { kind: ShopOffer['kind']; label: string }[] = [
    { kind: 'item', label: '道具' },
    { kind: 'relic', label: '遗物' },
    { kind: 'variant', label: '牌的变种' },
  ];
  const [category, setCategory] = useState<ShopOffer['kind']>('item');
  const [filters, setFilters] = useState<KitFilterSelection>(EMPTY_KIT_FILTERS);
  const switchTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? (index + 1) % categories.length
      : event.key === 'ArrowLeft' ? (index + categories.length - 1) % categories.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    setCategory(categories[next].kind);
    setFilters(EMPTY_KIT_FILTERS);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#rg-shop-tab-${categories[next].kind}`)?.focus();
  };
  const categoryOffers = stocked.filter((offer) => offer.kind === category);
  const catalog: KitReference[] = categoryOffers.flatMap<KitReference>((offer) => offer.kind === 'item'
    ? [{kind: 'item' as const, id: offer.ref as ItemId}]
    : offer.kind === 'relic' ? [{kind: 'relic' as const, id: offer.ref as RelicId}] : []);
  const offers = categoryOffers.filter((offer) => offer.kind === 'variant' || matchesKitFilters(offer.kind, offer.ref as KitReference['id'], filters));
  return (
    <dialog ref={modalRef} open className="rg-map-modal rg-panel rg-shop" aria-modal="true" aria-label={shopName}>
      <PanelHeading title={shopName} eyebrow={state.act === 4 ? '纺织街的手艺 · 原件与同款材料均有货' : state.act === 3 ? '海风吹不坏好手艺 · 给下一场准备一个新答案' : '旧货不退 · 你赢了谁，这里就有谁的货'} onClose={onClose} />
      <div className="rg-panel-bar">
        <span>口袋里</span>
        <Fee value={state.fee} />
        <small>{stocked.length < shop.length ? `还有 ${shop.length - stocked.length} 件货要等你赢了对应的人才上架。` : '货全上齐了。'}</small>
      </div>
      <div className="rg-shop-tabs" role="tablist" aria-label="商品类型">
        {categories.map(({ kind, label }, index) => (
          <button key={kind} id={`rg-shop-tab-${kind}`} role="tab" aria-selected={category === kind}
            aria-controls="rg-shop-products" tabIndex={category === kind ? 0 : -1}
            onClick={() => { setCategory(kind); setFilters(EMPTY_KIT_FILTERS); }} onKeyDown={(event) => switchTab(event, index)}>
            {label} <small>{stocked.filter((offer) => offer.kind === kind).length}</small>
          </button>
        ))}
      </div>
      {category !== 'variant' && <KitFilterBar catalog={catalog} value={filters} onChange={setFilters} />}
      <div id="rg-shop-products" role="tabpanel" aria-labelledby={`rg-shop-tab-${category}`}>
      {!offers.length && <p className="rg-shop-empty">{categoryOffers.length ? '没有同时符合所选标签的商品。减少条件，或清空筛选。' : '这一类货还没上架。赢下对应的对手，再来看看。'}</p>}
      <ul className="rg-shop-list">
        {offers.map((offer) => {
          const owned = offerOwned(state, offer.id);
          const poor = state.fee < offer.price;
          const item = offer.kind === 'item' ? ITEMS.find((entry) => entry.id === offer.ref) : undefined;
          const relic = offer.kind === 'relic' ? RELICS.find((entry) => entry.id === offer.ref) : undefined;
          const variant = offer.kind === 'variant' ? variantCard(offer.ref) : undefined;
          return (
            <li key={offer.id} className={owned ? 'is-owned' : ''}>
              <div className="rg-shop-art">
                {item && <ObjectGlyph id={item.id} family={item.family} />}
                {relic && <ObjectGlyph id={relic.id} family="relic" />}
                {variant && (
                  <span className="rg-shop-card">
                    <CardFace card={variant.card} />
                  </span>
                )}
              </div>
              <div className="rg-shop-text">
                <strong>
                  {item?.name ?? relic?.name ?? `${SUITS[variant!.card.suit]}${variant!.card.rank > 10 ? ['J', 'Q', 'K', 'A'][variant!.card.rank - 11] : variant!.card.rank} · ${variant!.enchant!.name}`}
                  <small>
                    {item ? '道具' : relic ? '遗物' : `${RARITY_NAMES[variant!.enchant!.rarity]}变种`}
                  </small>
                </strong>
                {item && <KitTags kind="item" id={item.id} />}
                {relic && <KitTags kind="relic" id={relic.id} />}
                <span><DialogueText text={item?.text ?? relic?.text ?? variant!.enchant!.text} /></span>
                <em>{offer.note}</em>
              </div>
              <div className="rg-shop-purchase">
                <div className="rg-shop-price" aria-label={`售价 ${offer.price} 演出费`}><Fee value={offer.price} /></div>
                <button className="rg-primary" disabled={(owned && !(item && state.act >= 3 && (state.spareItems[item.id] ?? 0) < 999)) || poor} onClick={() => onBuy(offer.id)}>
                  {poor ? '演出费不足' : owned && item && state.act >= 3 ? `购同款材料 · 余 ${state.spareItems[item.id] ?? 0}` : owned ? '已拥有' : '买下'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      </div>
      <p className="rg-panel-foot">买到的道具会出现在巡演箱里，牌的变种在对战前的「牌匣」里装上。</p>
    </dialog>
  );
}

export function ShowsPanel({
  state,
  modalRef,
  onStart,
  onClose,
}: {
  state: AdventureState;
  modalRef: RefObject<HTMLDialogElement | null>;
  onStart: (id: ShowId) => void;
  onClose: () => void;
}) {
  const wins = state.won.filter((id) => id.startsWith('show-')).length;
  return (
    <dialog ref={modalRef} open className="rg-map-modal rg-panel rg-shows" aria-modal="true" aria-label="今日街头演出">
      <PanelHeading title="今日街头演出" eyebrow="守住规矩赢下来，帽子里就有演出费" onClose={onClose} />
      <div className="rg-panel-bar">
        <span>已完成</span>
        <b>
          {wins}/{SHOWS.length}
        </b>
        <small>{state.flags.mainHall ? '主厅已经为你开放。' : wins >= 3 ? '够了——回剧院找多丽丝。' : `赢下 ${3 - wins} 场，主厅就会为你开放。`}</small>
      </div>
      <ul className="rg-show-list">
        {SHOWS.map((show) => {
          const done = state.won.includes(`show-${show.id}`);
          return (
            <li key={show.id} className={done ? 'is-done' : ''}>
              <div>
                <strong>
                  {show.title}
                  {done && <i>✓ 已演过</i>}
                </strong>
                <span className="rg-show-rule">{show.rule}</span>
                <em>{show.blurb}</em>
              </div>
              <button className={done ? 'rg-secondary' : 'rg-primary'} onClick={() => onStart(show.id)}>
                {done ? '再演一场' : '上台'} <span>→</span>
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}

/** v6: the clock in words: 第 2 周 · 周五 · 下午. */
export const clockLabel = (state: AdventureState) =>
  `第 ${weekNumber(state.clock.day)} 周 · ${WEEKDAYS[weekday(state.clock.day)]} · ${SLOT_NAMES[state.clock.slot]}`;
const SOURCES: IntelSource[] = ['paper', 'pub', 'watch', 'backstage'];
const SOURCE_HINTS: Record<IntelSource, string> = {
  paper: '确认打法，外加一条头条传闻',
  pub: '一两条传闻，有真有假',
  watch: '亲眼确认三件大道具和手法',
  backstage: '确认遗物（主厅开放后）',
};
/** v6 intel: scout the formal opponents on the bill (ADR-0059). */
function IntelSection({ state, onScout }: { state: AdventureState; onScout: (battle: BattleId, source: IntelSource) => void }) {
  const bill = scoutable(state);
  if (!bill.length && !state.flags.doddCorrection) return null;
  return (
    <section className="rg-intel" aria-label="打听情报">
      <h3 className="rg-troupe-heading">
        打听情报 <small>{clockLabel(state)}</small>
      </h3>
      {state.flags.doddCorrection && (
        <p className="rg-intel-card">
          <b>情报的可信度</b>
          报纸和酒馆传来的都是传闻，可能是假的；观摩比赛、后台打点，以及交过手之后看到的，都是确认的。每周日的报纸末版有更正启事。
        </p>
      )}
      <ul className="rg-dossier-list">
        {bill.map((battle) => {
          const view = intelView(state, battle);
          const definition = BATTLES[battle];
          return (
            <li key={battle}>
              <div className="rg-dossier-portrait">
                <Figure character={definition.opponent as RigId} crop="head" height={64} />
              </div>
              <div>
                <strong>
                  {CHARACTERS[definition.opponent].name}
                  <small>
                    {definition.title.split(' · ')[0]} · 已确认 {view.visible.length}/{view.units.length}
                  </small>
                </strong>
                {view.rumours.map((rumour) => (
                  <span key={rumour.id} className={`rg-rumour is-${rumour.status}`}>
                    {rumour.status === 'heard' ? '传闻' : rumour.status === 'true' ? '属实' : '情报有误'} · {rumour.text}
                  </span>
                ))}
                <div className="rg-intel-sources">
                  {SOURCES.map((source) => {
                    const used = view.sources.includes(source);
                    const slot = INTEL_SLOTS[source];
                    const wrongTime = slot !== null && state.clock.slot !== slot;
                    const locked = source === 'backstage' && !state.flags.mainHall;
                    const poor = state.fee < INTEL_PRICES[source];
                    return (
                      <button
                        key={source}
                        className="rg-secondary"
                        disabled={used || wrongTime || locked || poor || !(state.mode === 'explore' || state.panel === 'dossier')}
                        title={SOURCE_HINTS[source]}
                        onClick={() => onScout(battle, source)}
                      >
                        {INTEL_NAMES[source]} <small>£{INTEL_PRICES[source]}</small>
                        <em>{used ? '已打听' : locked ? '主厅开放后' : wrongTime ? `${SLOT_NAMES[slot!]}才行` : poor ? '钱不够' : SOURCE_HINTS[source]}</em>
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const ORDER: CharacterId[] = ['holt', 'edith', 'oswald', 'pip', 'felix', 'ada', 'bea', 'agnes', 'rosie', 'basil', 'pike', 'juno', 'hobbs', 'stan', 'pettigrew', 'nora', 'vale', 'molly', 'kit', 'brannigan'];
export function DossierPanel({
  state,
  modalRef,
  onClose,
  onScout,
}: {
  state: AdventureState;
  modalRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  /** v6: spend a slot learning about a formal opponent. */
  onScout?: (battle: BattleId, source: IntelSource) => void;
}) {
  const met = ORDER.filter((id) => state.dossier[id]);
  return (
    <dialog ref={modalRef} open className="rg-map-modal rg-panel rg-dossier" aria-modal="true" aria-label="对手档案">
      <PanelHeading title="对手档案" eyebrow="多德太太的账本 · 只记你亲眼见过的" onClose={onClose} />
      {onScout && <IntelSection state={state} onScout={onScout} />}
      {!met.length && <p className="rg-panel-foot">还是空的。跟谁打过一场，多德太太就给谁记一笔。</p>}
      <ul className="rg-dossier-list">
        {met.map((id) => {
          const entry = state.dossier[id]!;
          const thrown = entry.suits.reduce((a, b) => a + b, 0);
          const topKind = entry.kinds.indexOf(Math.max(...entry.kinds));
          return (
            <li key={id}>
              <div className="rg-dossier-portrait">
                <Figure character={id as RigId} crop="head" height={64} />
              </div>
              <div>
                <strong>
                  {CHARACTERS[id].name}
                  <small>
                    交手 {entry.duels} · 胜 {entry.wins} · 负 {entry.losses}
                  </small>
                </strong>
                <span className="rg-dossier-gossip">“{GOSSIP[id] ?? '没什么可说的。这本身就很可疑。'}”</span>
                {thrown > 0 ? (
                  <div className="rg-dossier-suits" aria-label="对手甩出的花色比例">
                    {entry.suits.map((count, suit) => (
                      <span key={suit} style={{ flexGrow: count || 0.0001 }} className={`rg-suit-${suit}`} title={`${SUITS[suit]} ${count} 张`}>
                        {count / thrown >= 0.12 ? `${SUITS[suit]} ${Math.round((count / thrown) * 100)}%` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <small>还没看清他甩了什么。</small>
                )}
                {thrown > 0 && <small>最常出：{HAND_NAMES[topKind]}</small>}
              </div>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}

export type LifeAction =
  | { kind: 'tea' | 'rehearse'; id: PerformerId }
  | { kind: 'meals'; tier: MealTier }
  | { kind: 'pay' | 'help' };
const STATUS_NAMES = { ready: '', refuses: '罢演中', away: '回家吃饭了', lodged: '住不下，暂住朋友家' } as const;
const signed = (value: number) => (value > 0 ? `+${value}%` : value < 0 ? `−${-value}%` : '');
/** v5 troupe: who tours with the hero, and how the others might be won over. v6: their days, too. */
export function TroupePanel({
  state,
  modalRef,
  onClose,
  onLife,
}: {
  state: AdventureState;
  modalRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  /** v6 life actions (act two on). */
  onLife?: (action: LifeAction) => void;
}) {
  const prospects = (Object.keys(RECRUITS) as Exclude<PerformerId, 'eli'>[]).filter((id) => !['holt', 'edith', 'oswald'].includes(id) && !state.troupe.includes(id));
  const lodging = lodgingOf(state);
  const life = Boolean(onLife && lodging);
  const idle = state.mode === 'explore' || (state.mode === 'panel' && state.panel === 'troupe');
  const members = state.troupe.filter((id) => id !== 'eli' && state.away[id] === undefined).length;
  return (
    <dialog ref={modalRef} open className="rg-map-modal rg-panel rg-troupe" aria-modal="true" aria-label="剧团">
      <PanelHeading
        title="剧团"
        eyebrow={life ? `${clockLabel(state)} · ${lodging?.name ?? '巡演途中'} · ${state.troupe.length} 人` : `巡演中 ${state.troupe.length} 人 · 街头演出可以派任何人上台`}
        onClose={onClose}
      />
      <ul className="rg-troupe-list">
        {state.troupe.map((id) => {
          const performer = PERFORMERS[id];
          const deck = id === 'eli' ? state.owned.variants.length : Object.keys(memberBook(state, id)).length;
          const presence = presenceBreakdown(state, id);
          const mood = state.mood[id] ?? 2;
          const status = memberStatus(state, id);
          return (
            <li key={id} className={status === 'ready' ? '' : 'is-unavailable'}>
              <div className="rg-dossier-portrait">
                <Figure character={id as RigId} crop="head" height={64} />
              </div>
              <div>
                <strong>
                  {performer.name}
                  <small>{id === 'eli' ? '团长' : `牌匣 ${deck} 张变种`}</small>
                  {STATUS_NAMES[status] && <small className="rg-troupe-status">{STATUS_NAMES[status]}</small>}
                </strong>
                <span
                  className="rg-presence"
                  title={`底子 ${presence.base}（台龄 ${presence.level} 级）+ 名气 ${presence.fame}；住处 ${signed(presence.lodging) || '±0%'}，心情 ${signed(presence.mood) || '±0%'}`}
                >
                  <b>气场 {presence.total}</b>　台龄 {stageLevel(state.stage[id] ?? 0)} 级 · 名气 {presence.fame}
                  {life && (
                    <>
                      {' '}· 心情 <i className={`rg-mood is-${mood}`}>{MOODS[mood].name}{signed(MOODS[mood].presence) && ` ${signed(MOODS[mood].presence)}`}</i>
                    </>
                  )}
                </span>
                <span>
                  <b>天赋 · {performer.talent.name}</b>　{performer.talent.text}
                </span>
                <span>
                  <b>手法 · {fighterSleight({ performer: id, encore: state.flags.stanReturned }).name}</b>　{fighterSleight({ performer: id, encore: state.flags.stanReturned }).text}
                  <small>（冷却 {fighterSleight({ performer: id, encore: state.flags.stanReturned }).cooldownMs / 1000} 秒）</small>
                </span>
                {life && (
                  <div className="rg-life-actions">
                    {id !== 'eli' && (
                      <button
                        className="rg-secondary"
                        disabled={!idle || state.clock.slot !== 1 || status === 'away' || state.week.includes(`tea:${id}`)}
                        onClick={() => onLife!({ kind: 'tea', id })}
                      >
                        约下午茶 <em>{state.week.includes(`tea:${id}`) ? '本周喝过了' : state.clock.slot !== 1 ? '下午才行' : `心情 +${1 + (lodging?.recovery ?? 0)}，好感 +3`}</em>
                      </button>
                    )}
                    <button
                      className="rg-secondary"
                      disabled={!idle || state.clock.slot !== 0 || !lodging!.rehearsal || state.arrears >= 2 || status !== 'ready'}
                      onClick={() => onLife!({ kind: 'rehearse', id })}
                    >
                      排练 <em>{!lodging!.rehearsal ? '住处没有排练室' : state.arrears >= 2 ? '排练室锁了' : state.clock.slot !== 0 ? '上午才行' : `台龄 +${2 + (lodging?.rehearsalBonus ?? 0)}`}</em>
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {life && (
        <>
          <h3 className="rg-troupe-heading">
            住处 <small>每周日晚上从演出费里扣房租、伙食和薪水</small>
          </h3>
          {state.arrears > 0 && (
            <div className="rg-arrears">
              <span>
                欠了 {state.arrears} 周房租。{state.arrears >= 2 ? '排练室已经锁了，全员心情受影响。' : '再欠下去，排练室就要上锁了。'}
              </span>
              <button className="rg-primary" disabled={!idle || state.fee < lodging!.price * state.arrears} onClick={() => onLife!({ kind: 'pay' })}>
                补交 £{lodging!.price * state.arrears}
              </button>
              <button className="rg-secondary" disabled={!idle} onClick={() => onLife!({ kind: 'help' })}>
                帮房东干活抵一周 <em>花一个时段</em>
              </button>
            </div>
          )}
          <ul className="rg-lodgings">
            {lodgingsFor(state).map((entry) => {
              const here = entry.id === state.lodging;
              const price = here ? lodging!.price : entry.price;
              return (
                <li key={entry.id} className={here ? 'is-here' : ''}>
                  <strong>
                    {entry.name}
                    <small>{price ? `£${price}/周` : '免费'}</small>
                  </strong>
                  <span>
                    全员气场 <b>{entry.presence ? `+${entry.presence}%` : '+0%'}</b> · 住 {entry.beds} 人（不含伊莱）{entry.rehearsal ? ' · 有排练室' : ''}
                  </span>
                  <em>{here ? lodging!.note : entry.note}</em>
                  {here && <small className="rg-lodging-current">当前根据地</small>}
                </li>
              );
            })}
          </ul>
          <p className="rg-panel-foot">更换根据地：进入想租的建筑，与管家交谈。确认租用后会自动退租旧址。</p>
          <h3 className="rg-troupe-heading">
            伙食 <small>{1 + members} 人吃饭</small>
          </h3>
          <div className="rg-meals" role="radiogroup" aria-label="伙食">
            {(Object.keys(MEALS) as MealTier[]).map((tier) => (
              <label
                key={tier}
                className={state.meals === tier ? 'is-chosen' : ''}
              >
                <input type="radio" name="troupe-meals" value={tier} checked={state.meals === tier} disabled={!idle}
                  onChange={() => onLife!({ kind: 'meals', tier })} />
                <b>{MEALS[tier].name}</b>
                <small>
                  £{MEALS[tier].perHead}/人/周 · 心情 {MEALS[tier].mood > 0 ? '+1' : MEALS[tier].mood < 0 ? '−1' : '不变'}
                </small>
                <em>{MEALS[tier].note}</em>
              </label>
            ))}
          </div>
        </>
      )}
      {prospects.length > 0 && (
        <>
          <h3 className="rg-troupe-heading">还没入团</h3>
          <ul className="rg-troupe-list is-prospect">
            {prospects.map((id) => {
              const recruit = RECRUITS[id];
              const affinity = state.affinity[recruit.character] ?? 0;
              return (
                <li key={id}>
                  <div className="rg-dossier-portrait">
                    <Figure character={id as RigId} crop="head" height={64} />
                  </div>
                  <div>
                    <strong>
                      {PERFORMERS[id].name}
                      <small className="rg-troupe-how">{recruit.how}</small>
                    </strong>
                    <span>{recruit.hint}</span>
                    {recruit.threshold !== undefined && (
                      <div className="rg-troupe-affinity" aria-label={`好感 ${affinity}/${recruit.threshold}`}>
                        <span style={{ width: `${Math.min(100, (affinity / recruit.threshold) * 100)}%` }} />
                        <small>
                          好感 {affinity}/{recruit.threshold}
                        </small>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </dialog>
  );
}
