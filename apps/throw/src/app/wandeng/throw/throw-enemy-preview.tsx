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

const RANK_LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
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
  tap,
}: {
  name: string;
  character: RigId;
  style: Style;
  items: readonly ItemId[];
  relic: RelicId | null;
  book?: DeckBook;
  rule?: string;
  tap: () => void;
}) {
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
            打法 <b>{preset.name}</b>
          </p>
          <p>{preset.hint}</p>
          {(preset.beats.length > 0 || fearedBy.length > 0) && (
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
          {rule && <p className="tp-house-rule">本场规矩：{rule}</p>}
        </div>
      </section>
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
      </div>
      <KitDetail focus={focus} empty="知道对手带什么，就回「我的布阵」换上克制他的道具。" />
      <section className="tp-enemy-deck" aria-label="对手的牌匣">
        <h3>
          牌匣 <span>{variants.length ? `${variants.length} 张变种` : '全白牌'}</span>
        </h3>
        {variants.length > 0 && (
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
