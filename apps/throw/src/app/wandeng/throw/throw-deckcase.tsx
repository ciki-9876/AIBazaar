'use client';
import { useEffect, useRef, useState } from 'react';
import { CardFace } from '../../stage/card-art';
import { rankText, SUITS, type Suit } from '../../../lib/cards/throw-poker';
import {
  cardKey,
  DECK_LIMITS,
  enchantOf,
  RARITY_NAMES,
  variantsFor,
  type DeckBook,
  type Rarity,
} from '../../../lib/cards/throw-enchant';

const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const LIMITED = ['rare', 'epic', 'legendary'] as const;

export const bookCounts = (book: DeckBook) => {
  const counts = { rare: 0, epic: 0, legendary: 0 };
  for (const id of Object.values(book)) {
    const enchant = enchantOf(id);
    if (enchant) counts[enchant.rarity]++;
  }
  return counts;
};

/**
 * 牌匣: the 52-slot deck editor. One copy of every card; each slot holds the
 * variant you choose. The practice room lends you every variant.
 */
export function DeckCase({
  book,
  owned,
  onBook,
  onClose,
  tap,
}: {
  book: DeckBook;
  /** Story mode: only these variants (`${suit}-${rank}:${id}`) may be used. */
  owned?: readonly string[];
  onBook: (book: DeckBook) => void;
  onClose: () => void;
  tap: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [focus, setFocus] = useState<{ suit: Suit; rank: number }>({ suit: 1, rank: 14 });
  useEffect(() => {
    dialog.current!.showModal();
  }, []);
  const counts = bookCounts(book);
  const key = cardKey(focus.suit, focus.rank);
  const current = book[key];
  const choose = (id: string | null) => {
    tap();
    const next: Record<string, string> = { ...book };
    if (id) next[key] = id;
    else delete next[key];
    onBook(next);
  };
  const full = (rarity: Rarity) =>
    rarity !== 'common' && counts[rarity] >= DECK_LIMITS[rarity];
  return (
    <dialog
      ref={dialog}
      className="tp-deckcase"
      aria-labelledby="tp-deckcase-title"
      onCancel={onClose}
      onClose={onClose}
    >
      <header>
        <div>
          <h2 id="tp-deckcase-title">牌匣</h2>
          <p>
            {owned
              ? `一副 52 张，每个牌位放一个变种。你已收集 ${owned.length} 个变种；白牌永远可用。`
              : '一副 52 张，每个牌位放一个变种。练习场里所有变种都借给你——别告诉里德。'}
          </p>
        </div>
        <ul className="tp-deckcase-limits" aria-label="附魔上限">
          {LIMITED.map((rarity) => (
            <li key={rarity} className={`tp-rarity-${rarity}`}>
              {RARITY_NAMES[rarity]} <b>{counts[rarity]}</b>/{DECK_LIMITS[rarity]}
            </li>
          ))}
        </ul>
        <button className="tp-close" onClick={onClose} aria-label="关闭牌匣">
          ×
        </button>
      </header>
      <div className="tp-deckcase-body">
        <div className="tp-deckcase-grid" role="grid" aria-label="52 个牌位">
          {([0, 1, 2, 3] as Suit[]).map((suit) => (
            <div key={suit} role="row" className="tp-deckcase-row">
              {RANKS.map((rank) => {
                const id = book[cardKey(suit, rank)];
                const picked = focus.suit === suit && focus.rank === rank;
                return (
                  <button
                    key={rank}
                    role="gridcell"
                    aria-selected={picked}
                    aria-label={`${SUITS[suit]}${rankText(rank)}${id ? ` · ${enchantOf(id)!.name}` : ''}`}
                    className={`tp-deckcase-slot ${picked ? 'tp-picked' : ''}`}
                    onClick={() => {
                      tap();
                      setFocus({ suit, rank });
                    }}
                  >
                    <CardFace card={{ uid: `book-${suit}-${rank}`, suit, rank, ...(id ? { ench: id } : {}) }} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <aside className="tp-deckcase-detail" aria-live="polite">
          <h3>
            {SUITS[focus.suit]}
            {rankText(focus.rank)} 的变种
          </h3>
          <ul>
            {variantsFor(focus.suit, focus.rank)
              .filter((enchant) => !owned || !enchant || owned.includes(`${key}:${enchant.id}`))
              .map((enchant) => {
              const id = enchant?.id ?? null;
              const rarity: Rarity = enchant?.rarity ?? 'common';
              const active = (current ?? null) === id;
              const blocked = !active && full(rarity) && enchantOf(current)?.rarity !== rarity;
              return (
                <li key={id ?? 'common'}>
                  <button
                    className={`tp-variant tp-rarity-${rarity} ${active ? 'tp-active' : ''}`}
                    aria-pressed={active}
                    disabled={blocked}
                    onClick={() => choose(id)}
                  >
                    <span className="tp-variant-chip">{RARITY_NAMES[rarity]}</span>
                    <strong>{enchant?.name ?? '白牌'}</strong>
                    <span>{enchant?.text ?? '没有附魔。朴素，可靠，像一杯不加糖的茶。'}</span>
                    {enchant && <em>{enchant.quip}</em>}
                    {blocked && <small>此稀有度已满</small>}
                  </button>
                </li>
              );
            })}
          </ul>
          {owned && !owned.some((entry) => entry.startsWith(`${key}:`)) && (
            <p className="tp-deckcase-empty">这张牌还没有收集到变种。街头演出、旧货铺和强敌手里都有。</p>
          )}
        </aside>
      </div>
      <footer>
        <button
          onClick={() => {
            tap();
            onBook({});
          }}
          disabled={!Object.keys(book).length}
        >
          全部换回白牌
        </button>
        <button className="tp-primary" onClick={onClose}>
          装好了
        </button>
      </footer>
    </dialog>
  );
}
