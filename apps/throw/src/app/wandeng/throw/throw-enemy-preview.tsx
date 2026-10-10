'use client';
import { useState } from 'react';
import { ObjectGlyph } from '../../stage/glyphs';
import { Figure, type RigId } from '../../stage/rig';
import {
  BAG_CELLS,
  COMPETITIVE_STYLES,
  PRESETS,
  RELICS,
  itemDefinition,
  packThrowItems,
  type ItemId,
  type RelicId,
  type Style,
} from '../../../lib/cards/throw-loadout';
import { SUITS } from '../../../lib/cards/throw-poker';
import { enchantOf, RARITY_NAMES, type DeckBook } from '../../../lib/cards/throw-enchant';
import { KitDetail, type KitFocus } from './throw-kit';
import { PERFORMERS, type PerformerId } from '../../../lib/cards/throw-performer';

const RANK_LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
/** v6 intel (ADR-0059): what the hero knows before a formal performance or a street show. */
export type PreviewIntel = {
  fog: 'open' | 'street' | 'formal';
  /** Confirmed units: 'style', 'relic', 'performer', 'book', `item:${id}`. */
  visible: readonly string[];
  units: readonly string[];
  rumours: readonly { id: string; source: 'paper' | 'pub'; text: string; status: 'heard' | 'true' | 'false' }[];
};
const SOURCE_NAMES = { paper: '报纸', pub: '酒馆' } as const;
const SOURCE_TRUST = { paper: '★', pub: '★' } as const;
const cardLabel = (key: string) => {
  const [suit, rank] = key.split('-').map(Number);
  return `${SUITS[suit] ?? '?'}${RANK_LABELS[rank] ?? rank}`;
};

/**
 * Pre-duel scouting: the opponent's trunk exactly as the duel will pack it,
 * their relic, enchanted cards and any house rule. Read-only.
 */
export default function EnemyPreview({
  name,
  character,
  style,
  items,
  relic,
  book,
  rule,
  performer,
  intel,
  tap,
}: {
  name: string;
  character: RigId;
  style: Style;
  items: readonly ItemId[];
  relic: RelicId | null;
  book?: DeckBook;
  rule?: string;
  /** v10: the opponent's talent and sleight. */
  performer?: PerformerId;
  /** v6: fog of war; omitted means everything is public (practice room). */
  intel?: PreviewIntel;
  tap: () => void;
}) {
  const knows = (unit: string) => !intel || intel.fog === 'open' || intel.visible.includes(unit);
  const known = intel ? intel.units.filter((unit) => knows(unit)).length : 0;
  /** A white deck has no 'book' unit; it is only known to be white once everything else is. */
  const deckKnown = !intel || intel.fog === 'open' || (intel.units.includes('book') ? knows('book') : known === intel.units.length);
  const [focus, setFocus] = useState<KitFocus | null>(null);
  const preset = PRESETS[style];
  // Same packing the duel uses for the opponent's layout.
  const layout = packThrowItems([...items]);
  const used = layout.reduce((sum, entry) => sum + itemDefinition(entry.id).size, 0);
  const relicEntry = RELICS.find((entry) => entry.id === relic);
  const fearedBy = COMPETITIVE_STYLES.filter((id) => PRESETS[id].beats.includes(style));
  const variants = Object.entries(book ?? {})
    .map(([key, id]) => ({ key, enchant: enchantOf(id) }))
    .filter((entry) => entry.enchant)
    .sort((a, b) => ['legendary', 'epic', 'rare'].indexOf(a.enchant!.rarity) - ['legendary', 'epic', 'rare'].indexOf(b.enchant!.rarity));
  const pick = (next: KitFocus) => {
    tap();
    setFocus(focus && focus.kind === next.kind && focus.id === next.id ? null : next);
  };
  return (
    <div className="tp-enemy-preview">
      <section className="tp-enemy-card" aria-label={`${name}档案`}>
        <div className="tp-enemy-portrait" data-speaker={character}>
          <Figure crop="bust" character={character} height={168} facing={-1} />
        </div>
        <div className="tp-enemy-copy">
          <small>对手</small>
          <h2>{name}</h2>
          <p className="tp-enemy-style">
            打法 <b>{knows('style') ? preset.name : '？'}</b>
          </p>
          {knows('style') && <p>{preset.hint}</p>}
          {knows('style') && (preset.beats.length > 0 || fearedBy.length > 0) && (
            <dl className="tp-enemy-matchups">
              {preset.beats.length > 0 && (
                <div>
                  <dt>擅长对付</dt>
                  <dd>{preset.beats.map((id) => PRESETS[id].name).join('、')}</dd>
                </div>
              )}
              {fearedBy.length > 0 && (
                <div>
                  <dt>怕遇到</dt>
                  <dd>{fearedBy.map((id) => PRESETS[id].name).join('、')}</dd>
                </div>
              )}
            </dl>
          )}
          {performer && !knows('performer') && <p className="tp-intel-unknown">天赋和手法：还没打听到。</p>}
          {performer && knows('performer') && (
            <dl className="tp-enemy-identity">
              <div>
                <dt>天赋 · {PERFORMERS[performer].talent.name}</dt>
                <dd>{PERFORMERS[performer].talent.text}</dd>
              </div>
              <div>
                <dt>
                  手法 · {PERFORMERS[performer].sleight.name}
                  <small>冷却 {PERFORMERS[performer].sleight.cooldownMs / 1000} 秒</small>
                </dt>
                <dd>{PERFORMERS[performer].sleight.text}</dd>
              </div>
            </dl>
          )}
          {rule && <p className="tp-house-rule">本场规矩：{rule}</p>}
        </div>
      </section>
      {intel && intel.fog !== 'open' && (
        <section className="tp-intel" aria-label="情报">
          <h3>
            情报 <span>已确认 {known}/{intel.units.length} 项</span>
          </h3>
          <p>
            {intel.fog === 'formal'
              ? '正式演出：对手的配置要靠看报、打听、观摩来揭开。去报刊亭翻多德太太的档案。'
              : '街头演出：打法和占两格以上的大道具看得见，小件、遗物和牌匣看不见。'}
          </p>
          {intel.rumours.length > 0 && (
            <ul className="tp-rumours">
              {intel.rumours.map((rumour) => (
                <li key={rumour.id} className={`is-${rumour.status}`}>
                  <small>
                    传闻 · {SOURCE_NAMES[rumour.source]} {SOURCE_TRUST[rumour.source]}
                  </small>
                  <span>{rumour.text}</span>
                  {rumour.status === 'true' && <b className="tp-stamp is-true">属实</b>}
                  {rumour.status === 'false' && <b className="tp-stamp is-false">情报有误</b>}
                </li>
              ))}
            </ul>
          )}
          {intel.rumours.some((rumour) => rumour.status === 'heard') && <p className="tp-intel-warning">传闻可能是假的。亲眼看见的才算数。</p>}
        </section>
      )}
      <div className="tp-section-heading">
        <h2>对手的巡演箱</h2>
        <span>点道具或遗物查看效果</span>
        <b>
          {used}/{BAG_CELLS}格
        </b>
      </div>
      <div className="tp-board-and-relic">
        <div className="tp-bag is-readonly" aria-label="对手的道具布阵">
          {Array.from({ length: BAG_CELLS }, (_, index) => (
            <span key={'cell' + index} className="tp-bag-cell" style={{ gridColumn: index + 1, gridRow: 1 }} aria-hidden="true">
              <small>{index + 1}</small>
            </span>
          ))}
          {layout.map((entry) => {
            const item = itemDefinition(entry.id);
            if (!knows(`item:${entry.id}`))
              return (
                <span
                  key={entry.id}
                  className="tp-bag-item is-fogged"
                  style={{ gridColumn: `${entry.start + 1} / span ${item.size}`, gridRow: 1 }}
                  aria-label={`未知道具，占 ${item.size} 格`}
                >
                  <b>？</b>
                  <small>{item.size}格</small>
                </span>
              );
            const active = focus?.kind === 'item' && focus.id === entry.id;
            return (
              <button
                key={entry.id}
                className={`tp-bag-item tp-family-${item.family} ${active ? 'is-chosen' : ''}`}
                aria-pressed={active}
                style={{ gridColumn: `${entry.start + 1} / span ${item.size}`, gridRow: 1 }}
                onClick={() => pick({ kind: 'item', id: entry.id })}
              >
                <ObjectGlyph id={item.id} family={item.family} />
                <small>{item.size}格</small>
                <b>{item.name}</b>
                <em>{item.tag}</em>
              </button>
            );
          })}
        </div>
        {knows('relic') ? (
        <button
          className={`tp-relic-slot ${relicEntry ? 'is-equipped' : ''}`}
          disabled={!relicEntry}
          aria-pressed={focus?.kind === 'relic'}
          onClick={() => relicEntry && pick({ kind: 'relic', id: relicEntry.id })}
        >
          <small>遗物</small>
          {relicEntry ? <ObjectGlyph id={relicEntry.id} family="relic" /> : <span className="tp-relic-empty">—</span>}
          <strong>{relicEntry?.name ?? '没带遗物'}</strong>
        </button>
        ) : (
          <span className="tp-relic-slot is-fogged" aria-label="遗物未知">
            <small>遗物</small>
            <b>？</b>
          </span>
        )}
      </div>
      <KitDetail focus={focus} empty="知道对手带什么，就回「我的布阵」换上克制他的道具。" />
      <section className="tp-enemy-deck" aria-label="对手的牌匣">
        <h3>
          牌匣 <span>{!deckKnown ? '还没打听到' : variants.length ? `${variants.length} 张变种` : '全白牌'}</span>
        </h3>
        {deckKnown && variants.length > 0 && (
          <ul>
            {variants.map(({ key, enchant }) => (
              <li key={key} className={`tp-rarity-${enchant!.rarity}`} title={enchant!.text}>
                <b>{cardLabel(key)}</b>
                <span>{enchant!.name}</span>
                <small>
                  {RARITY_NAMES[enchant!.rarity]} · {enchant!.text}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
