'use client';
import { useEffect, useRef, useState } from 'react';
import InventoryDrag from '../../../../../../packages/ui/inventory-drag';
import { ObjectGlyph } from '../../stage/glyphs';
import { KitDetail, KitIcon, KitTags, UpgradeMark } from './throw-kit';
import { KitFilterBar } from './throw-kit-filters';
import type { ItemUpgrades } from '../../../lib/cards/throw-upgrades';
import { DialogueText } from '../../adventure/dialogue-text';
import { ITEM_LABELS, EMPTY_KIT_FILTERS, matchesKitFilters, type KitFilterSelection, type KitRecommendations } from '../../../lib/cards/throw-kit-guide';
import {
  ITEMS,
  RELICS,
  PRESETS,
  BAG_CELLS,
  itemDefinition,
  itemEnd,
  packThrowItems,
  placeThrowItem,
  swapThrowItems,
  adjacentThrowItems,
  type ItemPlacement,
  type ItemId,
  type RelicId,
  type Style,
  COMPETITIVE_STYLES,
} from '../../../lib/cards/throw-loadout';

type Props = {
  layout: ItemPlacement[];
  relic: RelicId | null;
  style: Style;
  onLayout: (layout: ItemPlacement[]) => void;
  onRelic: (id: RelicId | null) => void;
  onStyle: (style: Style) => void;
  /** Story-limited kit; omitted in the practice room, where everything is out. */
  available?: { items: readonly ItemId[]; relics: readonly RelicId[] };
  tip?: string;
  upgrades?: ItemUpgrades;
  recommendations?: KitRecommendations;
  tap: () => void;
};
type KitDrop = { kind: 'cell'; start: number } | { kind: 'item'; id: ItemId; area: 'board' | 'pack' } | { kind: 'pack' };

function RelicPicker({
  equipped,
  onEquip,
  onClose,
  tap,
  relics,
  recommendations,
}: {
  equipped: RelicId | null;
  onEquip: (id: RelicId | null) => void;
  onClose: () => void;
  tap: () => void;
  relics: readonly (typeof RELICS)[number][];
  recommendations?: KitRecommendations['relics'];
}) {
  const [draft, setDraft] = useState<RelicId>(equipped ?? relics[0].id);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = RELICS.find((entry) => entry.id === draft)!;
  useEffect(() => {
    dialog.current!.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="tp-relic-picker"
      aria-labelledby="tp-relic-picker-title"
      onCancel={onClose}
      onClose={onClose}
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <header>
        <div>
          <small>遗物</small>
          <h2 id="tp-relic-picker-title">选择遗物</h2>
        </div>
        <button aria-label="关闭遗物选择" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="tp-relic-choices">
        {relics.map((entry) => (
          <button
            key={entry.id}
            aria-pressed={draft === entry.id}
            className={draft === entry.id ? 'is-selected' : ''}
            onClick={() => {
              tap();
              setDraft(entry.id);
            }}
          >
            <KitIcon id={entry.id} family="relic" recommendation={recommendations?.[entry.id]} />
            <strong>{entry.name}</strong>
            <KitTags kind="relic" id={entry.id} />
            <small>{equipped === entry.id ? '已装备' : '\u00a0'}</small>
          </button>
        ))}
      </div>
      <div className="tp-relic-preview">
        <KitIcon id={selected.id} family="relic" recommendation={recommendations?.[selected.id]} />
        <div>
          <h3>{selected.name}</h3>
          <KitTags kind="relic" id={selected.id} />
          <p>{selected.text}</p>
          {recommendations?.[selected.id] && <p className="tp-kit-note">{recommendations[selected.id]}</p>}
          <p className="tp-quip">{selected.quip}</p>
        </div>
      </div>
      <footer>
        <button
          disabled={!equipped}
          onClick={() => {
            tap();
            onEquip(null);
            onClose();
          }}
        >
          卸下
        </button>
        <button
          className="tp-primary"
          onClick={() => {
            tap();
            onEquip(draft);
            onClose();
          }}
        >
          装备
        </button>
      </footer>
    </dialog>
  );
}

export default function ThrowWorkbench({
  layout,
  relic,
  style,
  onLayout,
  onRelic,
  onStyle,
  available,
  upgrades,
  tip,
  recommendations,
  tap,
}: Props) {
  const [packOrder, setPackOrder] = useState<ItemId[]>(() => ITEMS.map((item) => item.id));
  const catalog = packOrder.map(itemDefinition).filter((item) => !available || available.items.includes(item.id));
  const relicCatalog = RELICS.filter((entry) => !available || available.relics.includes(entry.id));
  const [chosen, setChosen] = useState<ItemId | null>(() => catalog[0]?.id ?? null),
    [filter, setFilter] = useState<KitFilterSelection>(EMPTY_KIT_FILTERS),
    [error, setError] = useState(''),
    [picker, setPicker] = useState(false);
  const used = layout.reduce(
      (sum, entry) => sum + itemDefinition(entry.id).size,
      0,
    ),
    selected = chosen ? layout.find((entry) => entry.id === chosen) : undefined;
  const currentRelic = RELICS.find((entry) => entry.id === relic);
  const shown = catalog.filter((item) => matchesKitFilters('item', item.id, filter));
  const neighbors = selected ? adjacentThrowItems(layout, selected.id) : [];
  const choose = (id: ItemId | null) => {
    tap();
    setChosen(chosen === id ? null : id);
    setError('');
  };
  const place = (id: ItemId, start?: number) => {
    const next = placeThrowItem(layout, id, start);
    setChosen(id);
    if (next === layout) {
      setError(`放不下：需要连续 ${itemDefinition(id).size} 格空位`);
      return;
    }
    tap();
    onLayout(next);
    setError('');
  };
  const remove = (id: ItemId) => {
    tap();
    onLayout(layout.filter((entry) => entry.id !== id));
    setError('');
  };
  const dropResult = (id: ItemId, target: KitDrop) => {
    if (target.kind === 'pack') return layout.some((entry) => entry.id === id) ? layout.filter((entry) => entry.id !== id) : layout;
    if (target.kind === 'cell') return placeThrowItem(layout, id, target.start);
    return swapThrowItems(layout, id, target.id);
  };
  const reorderPack = (source: ItemId, target: ItemId) => {
    setPackOrder((order) => order.map((id) => id === source ? target : id === target ? source : id));
  };
  return (
    <InventoryDrag<KitDrop>
      className="tp-workbench"
      resolve={(root, source, x, y) => {
        if (!ITEMS.some((entry) => entry.id === source.id)) return null;
        const visibleRoot = root.getBoundingClientRect();
        if (x < visibleRoot.left || x >= visibleRoot.right || y < visibleRoot.top || y >= visibleRoot.bottom) return null;
        // Hit a whole item first: even a drop over the second occupied cell swaps its anchor.
        for (const node of root.querySelectorAll<HTMLElement>('[data-kit-drop-id]')) {
          const clip = node.closest('.tp-items')?.getBoundingClientRect();
          if (clip && (x < clip.left || x >= clip.right || y < clip.top || y >= clip.bottom)) continue;
          const bounds = node.getBoundingClientRect();
          if (x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom)
            return {
              value: { kind: 'item', id: node.dataset.kitDropId as ItemId, area: node.dataset.kitArea as 'board' | 'pack' },
              bounds: { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height },
            };
        }
        const item = itemDefinition(source.id as ItemId),
          cells = [...root.querySelectorAll<HTMLElement>('[data-drop-slot]')];
        for (const node of cells) {
          const bounds = node.getBoundingClientRect();
          if (
            x < bounds.left ||
            x >= bounds.right ||
            y < bounds.top ||
            y >= bounds.bottom
          )
            continue;
          const start = Number(node.dataset.dropSlot),
            last =
              cells[
                Math.min(BAG_CELLS - 1, start + item.size - 1)
              ].getBoundingClientRect();
          return {
            value: { kind: 'cell', start },
            bounds: {
              x: bounds.left,
              y: bounds.top,
              width: last.right - bounds.left,
              height: bounds.height,
            },
          };
        }
        // Dragging an equipped item back down into the pack takes it off.
        const pack = root.querySelector<HTMLElement>('[data-pack-drop]');
        const box = pack?.getBoundingClientRect();
        if (box && x >= box.left && x < box.right && y >= box.top && y < box.bottom)
          return { value: { kind: 'pack' }, bounds: { x: box.left, y: box.top, width: box.width, height: box.height } };
        return null;
      }}
      canDrop={(source, target) => {
        if (target.kind === 'item' && target.area === 'pack' && source.data.kitArea === 'pack')
          return source.id !== target.id;
        return dropResult(source.id as ItemId, target) !== layout;
      }}
      onDrop={(source, target) => {
        const id = source.id as ItemId;
        if (target.kind === 'item' && target.area === 'pack' && source.data.kitArea === 'pack') reorderPack(id, target.id);
        else {
          const next = dropResult(id, target);
          if (next === layout) return;
          onLayout(next);
        }
        tap();
        setChosen(id);
        setError('');
      }}
      ghostClassName="tp-drag-ghost"
      highlightClassName="tp-drop-highlight"
      renderGhost={(source, valid) => {
        const item = itemDefinition(source.id as ItemId);
        return (
          <>
            <ObjectGlyph id={item.id} family={item.family} />
            <strong>{item.name}</strong>
            <small>{valid ? `${item.size}格` : '无法放置'}</small>
          </>
        );
      }}
    >
      {tip && <p className="tp-workbench-tip"><DialogueText text={tip} /></p>}
      <div className="tp-presets tp-strategy-presets" hidden={Boolean(available)}>
        {COMPETITIVE_STYLES.map((value) => {
          const preset = PRESETS[value],
            active =
              style === value &&
              preset.relic === relic &&
              preset.items.length === layout.length &&
              preset.items.every((id) =>
                layout.some((entry) => entry.id === id),
              );
          return (
            <button
              key={value}
              aria-pressed={active}
              title={`${preset.hint}　克制：${preset.beats.map((id) => PRESETS[id].name).join('、')}`}
              className={active ? 'is-active' : ''}
              onClick={() => {
                tap();
                onStyle(value);
                onLayout(packThrowItems(preset.items));
                onRelic(preset.relic);
                setChosen(catalog[0]?.id ?? null);
                setError('');
              }}
            >
              {preset.name}
              <small>克 {preset.beats.map((id) => PRESETS[id].name.slice(0, 2)).join('·')}</small>
            </button>
          );
        })}
      </div>
      <div className="tp-section-heading">
        <h2>道具布阵</h2>
        <span>拖到空位装备 · 拖到道具上交换 · 相邻增幅见说明</span>
        <b>
          {used}/{BAG_CELLS}格
        </b>
      </div>
      <div className="tp-board-and-relic">
        <div className="tp-bag" aria-label="十格道具布阵">
          {Array.from({ length: BAG_CELLS }, (_, index) => (
            <button
              key={'cell' + index}
              data-drop-slot={index}
              className="tp-bag-cell"
              aria-label={'行囊第' + (index + 1) + '格'}
              style={{ gridColumn: index + 1, gridRow: 1 }}
              onClick={() => {
                if (chosen) place(chosen, index);
              }}
            >
              <small>{index + 1}</small>
              <span>＋</span>
            </button>
          ))}
          {layout.map((entry) => {
            const item = itemDefinition(entry.id);
            return (
              <button
                key={entry.id}
                data-drag-uid={entry.id}
                data-layout-id={entry.id}
                data-layout-start={entry.start}
                data-kit-drop-id={entry.id}
                data-kit-area="board"
                className={`tp-bag-item tp-family-${item.family} ${chosen === entry.id ? 'is-chosen' : ''}`}
                aria-label={`摆放 ${item.name}，第${entry.start + 1}至${itemEnd(entry)}格`}
                aria-pressed={chosen === entry.id}
                style={{
                  gridColumn: `${entry.start + 1} / span ${item.size}`,
                  gridRow: 1,
                }}
                onClick={() => choose(entry.id)}
              >
                <KitIcon id={item.id} family={item.family} recommendation={recommendations?.items[item.id]} />
                <small>{item.size}格</small>
                <b>{item.name}<UpgradeMark tier={upgrades?.[item.id]} /></b>
                <KitTags kind="item" id={item.id} />
              </button>
            );
          })}
        </div>
        <button
          className={`tp-relic-slot ${relic ? 'is-equipped' : ''}`}
          data-relic-slot
          aria-label="遗物槽"
          disabled={!relicCatalog.length}
          onClick={() => {
            tap();
            setPicker(true);
          }}
        >
          <small>遗物</small>
          {currentRelic ? (
            <KitIcon id={currentRelic.id} family="relic" recommendation={recommendations?.relics[currentRelic.id]} />
          ) : (
            <span className="tp-relic-empty">＋</span>
          )}
          <strong>{currentRelic?.name ?? '选择遗物'}</strong>
          {currentRelic && <KitTags kind="relic" id={currentRelic.id} />}
        </button>
      </div>
      <KitDetail
        upgrades={upgrades}
        focus={chosen ? { kind: 'item', id: chosen } : null}
        note={[
          neighbors.length ? `相邻：${neighbors.map((n) => itemDefinition(n.id).name).join('、')}` : '',
          chosen ? recommendations?.items[chosen] : '',
        ].filter(Boolean).join('　') || undefined}
        empty="点一件道具查看效果；拖到上方格子里装备，拖回背包取下。"
      >
        {error && <output>{error}</output>}
        {chosen && !selected && (
          <button className="tp-primary" onClick={() => place(chosen)}>
            装备
          </button>
        )}
        {selected && (
          <>
            <button
              disabled={selected.start === 0}
              onClick={() => place(selected.id, selected.start - 1)}
            >
              左移
            </button>
            <button
              disabled={itemEnd(selected) === BAG_CELLS}
              onClick={() => place(selected.id, selected.start + 1)}
            >
              右移
            </button>
            <button onClick={() => remove(selected.id)}>取下</button>
          </>
        )}
      </KitDetail>
      <section className="tp-pack" data-pack-drop aria-label="道具背包">
        <div className="tp-catalog-heading">
          <h3>背包</h3>
          <span aria-live="polite">{shown.length} / {catalog.length}</span>
        </div>
        <KitFilterBar catalog={catalog.map(({ id }) => ({ kind: 'item', id }))} value={filter} onChange={setFilter} />
        <div className="tp-items tp-strategy-catalog">
          {!shown.length && <div className="tp-kit-filter-empty"><p>没有同时满足这些标签的道具。</p><button onClick={() => setFilter(EMPTY_KIT_FILTERS)}>清空筛选，查看全部</button></div>}
          {shown.map((item) => {
            const equipped = layout.some((entry) => entry.id === item.id);
            return (
              <button
                key={item.id}
                data-drag-uid={item.id}
                data-kit-drop-id={item.id}
                data-kit-area="pack"
                className={`tp-item tp-family-${item.family} ${equipped ? 'is-equipped' : ''} ${chosen === item.id ? 'is-chosen' : ''}`}
                aria-pressed={chosen === item.id}
                aria-label={`${item.name}，${ITEM_LABELS[item.id].play}，${ITEM_LABELS[item.id].effect}，${item.size}格${equipped ? '，已装备' : ''}${recommendations?.items[item.id] ? '，推荐对抗当前对手' : ''}`}
                style={{ gridColumn: `span ${item.size}` }}
                onClick={() => choose(item.id)}
              >
                <KitIcon id={item.id} family={item.family} recommendation={recommendations?.items[item.id]} />
                <strong>{item.name}<UpgradeMark tier={upgrades?.[item.id]} /></strong>
                <KitTags kind="item" id={item.id} />
                {equipped && <b aria-hidden="true">✓</b>}
              </button>
            );
          })}
        </div>
      </section>
      {picker && (
        <RelicPicker
          relics={relicCatalog}
          recommendations={recommendations?.relics}
          equipped={relic}
          onEquip={onRelic}
          onClose={() => setPicker(false)}
          tap={tap}
        />
      )}
    </InventoryDrag>
  );
}
