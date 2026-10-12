'use client';
import { ITEMS, RELICS } from '../../../lib/cards/throw-loadout';
import {
  EMPTY_KIT_FILTERS, availableKitFilterTags, toggleKitFilter,
  type KitFilterSelection, type KitReference,
} from '../../../lib/cards/throw-kit-guide';
import './throw-kit-filters.css';

const ALL_KIT: readonly KitReference[] = [
  ...ITEMS.map(({ id }) => ({ kind: 'item' as const, id })),
  ...RELICS.map(({ id }) => ({ kind: 'relic' as const, id })),
];

/** Shared by the trunk, backpack and shop: selected chips always intersect. */
export function KitFilterBar({ catalog = ALL_KIT, value, onChange }: {
  catalog?: readonly KitReference[];
  value: KitFilterSelection;
  onChange: (filters: KitFilterSelection) => void;
}) {
  const facets = availableKitFilterTags(catalog, value);
  const active = value.play.length + value.effect.length;
  return <div className="tp-kit-filters" aria-label="道具标签筛选">
    {(['play', 'effect'] as const).map((category) => {
      // Retain an active option even after switching a shop tab/category.
      const tags = [...new Set([...facets[category], ...value[category]])];
      const label = category === 'play' ? '打法' : '效果';
      return <fieldset className={`tp-kit-filter-row is-${category}`} key={category} aria-label={`${label}筛选`}>
        <b>{label}</b>
        <div className="tp-kit-filter-options">
          <button aria-pressed={value[category].length === 0} onClick={() => onChange({ ...value, [category]: [] })}>全部</button>
          {tags.map((tag) => <button key={tag} aria-pressed={value[category].includes(tag)} onClick={() => onChange(toggleKitFilter(value, category, tag))}>{tag}</button>)}
        </div>
      </fieldset>;
    })}
    <div className="tp-kit-filter-note">
      <span>{active ? `已选 ${active} 项 · 同时满足所有标签` : '可多选 · 仅显示同时满足所选标签的物品'}</span>
      <button disabled={!active} onClick={() => onChange(EMPTY_KIT_FILTERS)}>清空筛选</button>
    </div>
  </div>;
}
