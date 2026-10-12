'use client';
import type { ReactNode } from 'react';
import { upgradedItemText, type ItemUpgrades, type UpgradeTier } from '../../../lib/cards/throw-upgrades';
import { ObjectGlyph } from '../../stage/glyphs';
import { ITEM_LABELS, RELIC_LABELS } from '../../../lib/cards/throw-kit-guide';
import {
  RELICS,
  itemDefinition,
  type Family,
  type ItemId,
  type RelicId,
} from '../../../lib/cards/throw-loadout';

export const FAMILY_NAMES: Record<Family, string> = {
  damage: '直伤',
  burn: '灼烧',
  poison: '剧毒',
  shield: '护盾',
  heal: '续航',
  utility: '联动',
};

export type KitFocus = { kind: 'item'; id: ItemId } | { kind: 'relic'; id: RelicId };
/** The advice seal belongs to the item's icon, never the equip checkmark. */
export function KitIcon({ id, family, recommendation }: { id: ItemId | RelicId; family: Family | 'relic'; recommendation?: string }) {
  return <span className="tp-kit-icon">
    <ObjectGlyph id={id} family={family} />
    {recommendation && <span className="tp-counter-mark" aria-label={`推荐：${recommendation}`} title={recommendation}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10 12 3c.5-1 2-.7 2 1v4h5c2 0 2.5 1.2 2 3l-2 8c-.2.7-.8 1-1.5 1H8zM3 10h5v10H3z" /></svg>
    </span>}
  </span>;
}
export function UpgradeMark({ tier }: { tier?: UpgradeTier }) {
  return tier ? <sup className={`tp-upgrade-mark is-${tier}`} title={`${tier === 'gold' ? '金级' : '银级'}改装：效果数值已计入描述`}>{tier === 'gold' ? '金' : '银'}</sup> : null;
}

/** A tiny brass ticket and effect seal make the two meanings distinct at a glance. */
export function KitTags({ kind, id }: KitFocus) {
  const tags = kind === 'item' ? ITEM_LABELS[id] : RELIC_LABELS[id];
  return (
    <span className="tp-kit-tags" aria-label={`打法：${tags.play}；效果类型：${tags.effect}`}>
      <span className="tp-kit-tag is-play" title={`打法：${tags.play}`}>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1.5h6l2 2v7H2z" /><path d="M4 5h4M4 7h3" /></svg>
        {tags.play}
      </span>
      <span className="tp-kit-tag is-effect" title={`效果类型：${tags.effect}`}>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m6 1 4.5 5L6 11 1.5 6z" /><path d="M6 4v4M4 6h4" /></svg>
        {tags.effect}
      </span>
    </span>
  );
}

/**
 * The one place an item's or relic's rule text appears on the preparation
 * screen. Tiles only show icon, name and tag; clicking one fills this panel.
 */
export function KitDetail({
  focus,
  note,
  empty,
  children,
  upgrades,
}: {
  focus: KitFocus | null;
  /** Extra line under the rule text, e.g. adjacency. */
  note?: string;
  /** Shown when nothing is selected. */
  empty: string;
  /** Action buttons. */
  children?: ReactNode;
  upgrades?: ItemUpgrades;
}) {
  if (!focus)
    return (
      <div className="tp-kit-detail is-empty">
        <p>{empty}</p>
        {children && <div className="tp-kit-actions">{children}</div>}
      </div>
    );
  const entry =
    focus.kind === 'item'
      ? (() => {
          const item = itemDefinition(focus.id);
          return {
            id: item.id,
            family: item.family as Family | 'relic',
            name: item.name,
            meta: `${item.size}格`,
            text: upgradedItemText(item.id, upgrades),
            quip: item.quip,
          };
        })()
      : (() => {
          const relic = RELICS.find((value) => value.id === focus.id)!;
          return {
            id: relic.id,
            family: 'relic' as const,
            name: relic.name,
            meta: '遗物 · 每人一件',
            text: relic.text,
            quip: relic.quip,
          };
        })();
  return (
    <div className={`tp-kit-detail tp-family-${entry.family}`} key={`${focus.kind}:${focus.id}`}>
      <ObjectGlyph id={entry.id} family={entry.family} />
      <div className="tp-kit-copy">
        <div className="tp-kit-meta"><KitTags {...focus} /><small>{entry.meta}</small></div>
        <strong>{entry.name}<UpgradeMark tier={focus.kind === 'item' ? upgrades?.[focus.id] : undefined} /></strong>
        <p>{entry.text}</p>
        {note && <p className="tp-kit-note">{note}</p>}
        <p className="tp-quip">{entry.quip}</p>
      </div>
      {children && <div className="tp-kit-actions">{children}</div>}
    </div>
  );
}
