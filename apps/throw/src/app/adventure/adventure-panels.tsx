'use client';

import type { RefObject } from 'react';
import {
  CHARACTERS,
  GOSSIP,
  offerOwned,
  offerStocked,
  SHOP,
  SHOWS,
  type AdventureState,
  type CharacterId,
  type ShowId,
} from '../../lib/adventure/magician-world';
import { ITEMS, RELICS } from '../../lib/cards/throw-loadout';
import { enchantOf, RARITY_NAMES } from '../../lib/cards/throw-enchant';
import { HAND_NAMES, SUITS } from '../../lib/cards/throw-poker';
import { ObjectGlyph } from '../stage/glyphs';
import { CardFace } from '../stage/card-art';
import { Figure, type RigId } from '../stage/rig';

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
  const stocked = SHOP.filter((offer) => offerStocked(state, offer.id));
  return (
    <dialog ref={modalRef} open className="rg-map-modal rg-panel rg-shop" aria-modal="true" aria-label="霍布斯旧货铺">
      <PanelHeading title="霍布斯旧货铺" eyebrow="旧货不退 · 你赢了谁，这里就有谁的货" onClose={onClose} />
      <div className="rg-panel-bar">
        <span>口袋里</span>
        <Fee value={state.fee} />
        <small>{stocked.length < SHOP.length ? `还有 ${SHOP.length - stocked.length} 件货要等你赢了对应的人才上架。` : '货全上齐了。'}</small>
      </div>
      <ul className="rg-shop-list">
        {stocked.map((offer) => {
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
                <span>{item?.text ?? relic?.text ?? variant!.enchant!.text}</span>
                <em>{offer.note}</em>
              </div>
              <button className="rg-primary" disabled={owned || poor} onClick={() => onBuy(offer.id)}>
                {owned ? '已拥有' : (
                  <>
                    买下 <Fee value={offer.price} />
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
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

const ORDER: CharacterId[] = ['felix', 'ada', 'bea', 'agnes', 'rosie', 'basil', 'pike', 'juno', 'hobbs', 'stan', 'pettigrew'];
export function DossierPanel({
  state,
  modalRef,
  onClose,
}: {
  state: AdventureState;
  modalRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) {
  const met = ORDER.filter((id) => state.dossier[id]);
  return (
    <dialog ref={modalRef} open className="rg-map-modal rg-panel rg-dossier" aria-modal="true" aria-label="对手档案">
      <PanelHeading title="对手档案" eyebrow="多德太太的账本 · 只记你亲眼见过的" onClose={onClose} />
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
