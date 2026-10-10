'use client';
import { useEffect, useRef, useState } from 'react';
import InventoryDrag from '../../../../../../packages/ui/inventory-drag';
import { ObjectGlyph } from '../../stage/glyphs';
import { FAMILY_NAMES, KitDetail } from './throw-kit';
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
  ...(Object.entries(FAMILY_NAMES) as [Family, string][]).map(([id, name]) => ({ id, name })),
];
/** Drop target meaning “back into the pack”, i.e. unequip. */
const TO_PACK = -1;

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
  const currentRelic = RELICS.find((entry) => entry.id === relic);
  const shown = catalog.filter((item) => filter === 'all' || item.family === filter);
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
        // Dragging an equipped item back down into the pack takes it off.
        const pack = root.querySelector<HTMLElement>('[data-pack-drop]');
        const box = pack?.getBoundingClientRect();
        if (box && x >= box.left && x < box.right && y >= box.top && y < box.bottom)
          return { value: TO_PACK, bounds: { x: box.left, y: box.top, width: box.width, height: box.height } };
        return null;
      }}
      canDrop={(source, start) =>
        start === TO_PACK
          ? layout.some((entry) => entry.id === source.id)
          : placeThrowItem(layout, source.id as ItemId, start) !== layout
      }
      onDrop={(source, start) =>
        start === TO_PACK ? remove(source.id as ItemId) : place(source.id as ItemId, start)
      }
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
      <div className="tp-section-heading">
        <h2>道具布阵</h2>
        <span>相邻道具互相增幅 · 从下方背包拖上来</span>
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
                className={`tp-bag-item tp-family-${item.family} ${chosen === entry.id ? 'is-chosen' : ''}`}
                aria-label={`摆放 ${item.name}，第${entry.start + 1}至${itemEnd(entry)}格`}
                aria-pressed={chosen === entry.id}
                style={{
                  gridColumn: `${entry.start + 1} / span ${item.size}`,
                  gridRow: 1,
                }}
                onClick={() => choose(entry.id)}
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
            <ObjectGlyph id={currentRelic.id} family="relic" />
          ) : (
            <span className="tp-relic-empty">＋</span>
          )}
          <strong>{currentRelic?.name ?? '选择遗物'}</strong>
        </button>
      </div>
      <KitDetail
        focus={chosen ? { kind: 'item', id: chosen } : null}
        note={neighbors.length ? `相邻：${neighbors.map((n) => itemDefinition(n.id).name).join('、')}` : undefined}
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
          <span>{shown.length}</span>
        </div>
        <div className="tp-items tp-strategy-catalog">
          {shown.map((item) => {
            const equipped = layout.some((entry) => entry.id === item.id);
            return (
              <button
                key={item.id}
                data-drag-uid={item.id}
                className={`tp-item tp-family-${item.family} ${equipped ? 'is-equipped' : ''} ${chosen === item.id ? 'is-chosen' : ''}`}
                aria-pressed={chosen === item.id}
                aria-label={`${item.name}，${item.tag}，${item.size}格${equipped ? '，已装备' : ''}`}
                style={{ gridColumn: `span ${item.size}` }}
                onClick={() => choose(item.id)}
              >
                <ObjectGlyph id={item.id} family={item.family} />
                <strong>{item.name}</strong>
                <em>{item.tag}</em>
                {equipped && <b aria-hidden="true">✓</b>}
              </button>
            );
          })}
        </div>
      </section>
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
