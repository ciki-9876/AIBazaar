'use client';
import { useEffect, useRef, useState } from 'react';
import InventoryDrag from '../../../../../../packages/ui/inventory-drag';
import { ObjectGlyph } from '../../stage/glyphs';
import {
  ITEMS,
  RELICS,
  PRESETS,
  BAG_CELLS,
  itemDefinition,
  itemEnd,
  packThrowItems,
  placeThrowItem,
  adjacentThrowItems,
  type ItemPlacement,
  type ItemId,
  type RelicId,
  type Style,
  type Family,
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
  tap: () => void;
};
const families: { id: Family | 'all'; name: string }[] = [
  { id: 'all', name: '全部' },
  { id: 'damage', name: '直伤' },
  { id: 'burn', name: '灼烧' },
  { id: 'poison', name: '剧毒' },
  { id: 'shield', name: '护盾' },
  { id: 'heal', name: '续航' },
  { id: 'utility', name: '联动' },
];

function RelicPicker({
  equipped,
  onEquip,
  onClose,
  tap,
  relics,
}: {
  equipped: RelicId | null;
  onEquip: (id: RelicId | null) => void;
  onClose: () => void;
  tap: () => void;
  relics: readonly (typeof RELICS)[number][];
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
            <ObjectGlyph id={entry.id} family="relic" />
            <strong>{entry.name}</strong>
            <small>{equipped === entry.id ? '已装备' : '\u00a0'}</small>
          </button>
        ))}
      </div>
      <div className="tp-relic-preview">
        <ObjectGlyph id={selected.id} family="relic" />
        <div>
          <h3>{selected.name}</h3>
          <p>{selected.text}</p>
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
  tip,
  tap,
}: Props) {
  const catalog = ITEMS.filter((item) => !available || available.items.includes(item.id));
  const relicCatalog = RELICS.filter((entry) => !available || available.relics.includes(entry.id));
  const [chosen, setChosen] = useState<ItemId | null>(null),
    [filter, setFilter] = useState<Family | 'all'>('all'),
    [error, setError] = useState(''),
    [picker, setPicker] = useState(false);
  const used = layout.reduce(
      (sum, entry) => sum + itemDefinition(entry.id).size,
      0,
    ),
    selected = chosen ? layout.find((entry) => entry.id === chosen) : undefined;
  const selectedItem = chosen ? itemDefinition(chosen) : null,
    currentRelic = RELICS.find((entry) => entry.id === relic);
  const place = (id: ItemId, start?: number) => {
    const next = placeThrowItem(layout, id, start);
    setChosen(id);
    if (next === layout) {
      setError(`需要连续 ${itemDefinition(id).size} 格空位`);
      return;
    }
    tap();
    onLayout(next);
    setError('');
  };
  return (
    <InventoryDrag<number>
      className="tp-workbench"
      resolve={(root, source, x, y) => {
        if (!ITEMS.some((entry) => entry.id === source.id)) return null;
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
            value: start,
            bounds: {
              x: bounds.left,
              y: bounds.top,
              width: last.right - bounds.left,
              height: bounds.height,
            },
          };
        }
        return null;
      }}
      canDrop={(source, start) =>
        placeThrowItem(layout, source.id as ItemId, start) !== layout
      }
      onDrop={(source, start) => place(source.id as ItemId, start)}
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
      <div className="tp-section-heading">
        <h2>道具布阵</h2>
        <b>
          {used}/{BAG_CELLS}格
        </b>
      </div>
      {tip && <p className="tp-workbench-tip">{tip}</p>}
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
                setChosen(null);
                setError('');
              }}
            >
              {preset.name}
              <small>克 {preset.beats.map((id) => PRESETS[id].name.slice(0, 2)).join('·')}</small>
            </button>
          );
        })}
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
            const item = itemDefinition(entry.id),
              neighbors = adjacentThrowItems(layout, entry.id);
            return (
              <button
                key={entry.id}
                data-drag-uid={entry.id}
                data-layout-id={entry.id}
                data-layout-start={entry.start}
                className={`tp-bag-item tp-family-${item.family} ${chosen === entry.id ? 'is-chosen' : ''}`}
                aria-label={`摆放 ${item.name}，第${entry.start + 1}至${itemEnd(entry)}格`}
                aria-pressed={chosen === entry.id}
                style={{
                  gridColumn: `${entry.start + 1} / span ${item.size}`,
                  gridRow: 1,
                }}
                title={
                  item.text +
                  (neighbors.length
                    ? ' · 相邻：' +
                      neighbors.map((n) => itemDefinition(n.id).name).join('、')
                    : '')
                }
                onClick={() => {
                  tap();
                  setChosen(chosen === entry.id ? null : entry.id);
                  setError('');
                }}
              >
                <ObjectGlyph id={item.id} family={item.family} />
                <small>{item.size}格</small>
                <b>{item.name}</b>
              </button>
            );
          })}
        </div>
        <button
          className={`tp-relic-slot ${relic ? 'is-equipped' : ''}`}
          data-relic-slot
          aria-label="遗物槽"
          onClick={() => {
            tap();
            setPicker(true);
          }}
        >
          <small>遗物</small>
          {currentRelic ? (
            <ObjectGlyph id={currentRelic.id} family="relic" />
          ) : (
            <span className="tp-relic-empty">＋</span>
          )}
          <strong>{currentRelic?.name ?? '选择遗物'}</strong>
        </button>
      </div>
      <div className="tp-bag-tools">
        <div className="tp-item-preview">
          {selectedItem && (
            <>
              <strong>{selectedItem.name}</strong>
              <p>{selectedItem.text}</p>
              <p className="tp-quip">{selectedItem.quip}</p>
            </>
          )}
          {error && <output>{error}</output>}
        </div>
        <div>
          <button
            disabled={!selected || selected.start === 0}
            onClick={() => place(selected!.id, selected!.start - 1)}
          >
            左移
          </button>
          <button
            disabled={!selected || itemEnd(selected) === BAG_CELLS}
            onClick={() => place(selected!.id, selected!.start + 1)}
          >
            右移
          </button>
          <button
            disabled={!selected}
            onClick={() => {
              tap();
              onLayout(layout.filter((entry) => entry.id !== chosen));
              setChosen(null);
              setError('');
            }}
          >
            取下
          </button>
        </div>
      </div>
      <div className="tp-catalog-heading">
        <h3>道具</h3>
        <div className="tp-catalog-filters">
          {families.map((family) => (
            <button
              key={family.id}
              aria-pressed={filter === family.id}
              className={filter === family.id ? 'is-active' : ''}
              onClick={() => setFilter(family.id)}
            >
              {family.name}
            </button>
          ))}
        </div>
        <span>
          {catalog.filter((item) => filter === 'all' || item.family === filter).length}
        </span>
      </div>
      <div className="tp-items tp-strategy-catalog">
        {catalog.filter((item) => filter === 'all' || item.family === filter).map(
          (item) => {
            const equipped = layout.some((entry) => entry.id === item.id);
            return (
              <button
                key={item.id}
                data-drag-uid={item.id}
                className={`tp-item tp-family-${item.family} ${equipped ? 'is-equipped' : ''}`}
                aria-pressed={equipped}
                title={item.text}
                onClick={() => {
                  if (equipped) {
                    tap();
                    setChosen(item.id);
                    setError('');
                  } else place(item.id);
                }}
              >
                <ObjectGlyph id={item.id} family={item.family} />
                <span>
                  <small>
                    {item.tag} · {item.size}格
                  </small>
                  <strong>{item.name}</strong>
                  <p>{item.text}</p>
                  <em>{item.quip}</em>
                </span>
                <b>{equipped ? '✓' : '+'}</b>
              </button>
            );
          },
        )}
      </div>
      {picker && (
        <RelicPicker
          relics={relicCatalog}
          equipped={relic}
          onEquip={onRelic}
          onClose={() => setPicker(false)}
          tap={tap}
        />
      )}
    </InventoryDrag>
  );
}
