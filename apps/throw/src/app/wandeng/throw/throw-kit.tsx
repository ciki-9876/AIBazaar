'use client';
import type { ReactNode } from 'react';
import { ObjectGlyph } from '../../stage/glyphs';
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

/**
 * The one place an item's or relic's rule text appears on the preparation
 * screen. Tiles only show icon, name and tag; clicking one fills this panel.
 */
export function KitDetail({
  focus,
  note,
  empty,
  children,
}: {
  focus: KitFocus | null;
  /** Extra line under the rule text, e.g. adjacency. */
  note?: string;
  /** Shown when nothing is selected. */
  empty: string;
  /** Action buttons. */
  children?: ReactNode;
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
            meta: [...new Set([item.tag, FAMILY_NAMES[item.family]])].join(' · ') + ` · ${item.size}格`,
            text: item.text,
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
        <small>{entry.meta}</small>
        <strong>{entry.name}</strong>
        <p>{entry.text}</p>
        {note && <p className="tp-kit-note">{note}</p>}
        <p className="tp-quip">{entry.quip}</p>
      </div>
      {children && <div className="tp-kit-actions">{children}</div>}
    </div>
  );
}
