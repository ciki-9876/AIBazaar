'use client';
import { useState, type CSSProperties } from 'react';
import { Art } from '../wandeng-cards';
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
} from '../../../lib/cards/throw-loadout';
type Props = {
  layout: ItemPlacement[];
  relic: RelicId | null;
  style: Style;
  onLayout: (layout: ItemPlacement[]) => void;
  onRelic: (id: RelicId | null) => void;
  onStyle: (style: Style) => void;
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
export default function ThrowWorkbench({
  layout,
  relic,
  style,
  onLayout,
  onRelic,
  onStyle,
  tap,
}: Props) {
  const [chosen, setChosen] = useState<ItemId | null>(null),
    [filter, setFilter] = useState<Family | 'all'>('all'),
    [notice, setNotice] = useState(
      '点击旧物装入；点行囊中的旧物，再点空格移动。',
    );
  const used = layout.reduce(
      (sum, entry) => sum + itemDefinition(entry.id).size,
      0,
    ),
    selected = chosen ? layout.find((entry) => entry.id === chosen) : undefined;
  const currentRelic = RELICS.find((entry) => entry.id === relic);
  const move = (start: number) => {
    if (!chosen) return;
    const next = placeThrowItem(layout, chosen, start);
    if (next === layout) {
      setNotice(
        '放不下：目标处需要连续 ' + itemDefinition(chosen).size + ' 格空位。',
      );
      return;
    }
    tap();
    onLayout(next);
    setNotice('位置已更新；只有边缘贴合的旧物才算相邻。');
  };
  return (
    <>
      <div className="tp-section-heading">
        <div>
          <span className="tp-eyebrow">旧物决定你的出手方式</span>
          <h2>十格同行行囊</h2>
        </div>
        <b>
          {used}/{BAG_CELLS}格
        </b>
      </div>
      <div className="tp-presets tp-strategy-presets">
        {(Object.keys(PRESETS) as Style[]).map((value) => (
          <button
            key={value}
            className={style === value ? 'is-active' : ''}
            onClick={() => {
              tap();
              onStyle(value);
              onLayout(packThrowItems(PRESETS[value].items));
              onRelic(PRESETS[value].relic);
              setChosen(null);
              setNotice(
                '已装好「' + PRESETS[value].name + '」。可以重新摆放测试联动。',
              );
            }}
          >
            {PRESETS[value].name}
          </button>
        ))}
      </div>
      <p className="tp-preset-hint">{PRESETS[style].hint}</p>
      <div className="tp-bag" aria-label="十格行囊布局">
        {Array.from({ length: BAG_CELLS }, (_, index) => (
          <button
            key={'cell' + index}
            className="tp-bag-cell"
            aria-label={'行囊第' + (index + 1) + '格'}
            style={{ gridColumn: index + 1, gridRow: 1 }}
            onClick={() => move(index)}
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
              data-layout-id={entry.id}
              data-layout-start={entry.start}
              className={`tp-bag-item tp-family-${item.family} ${chosen === entry.id ? 'is-chosen' : ''}`}
              aria-label={`摆放 ${item.name}，第${entry.start + 1}至${itemEnd(entry)}格`}
              aria-pressed={chosen === entry.id}
              style={
                {
                  gridColumn: `${entry.start + 1} / span ${item.size}`,
                  gridRow: 1,
                } as CSSProperties
              }
              title={
                item.text +
                '；贴邻：' +
                neighbors.map((n) => itemDefinition(n.id).name).join('、')
              }
              onClick={() => {
                tap();
                setChosen(chosen === entry.id ? null : entry.id);
                setNotice(item.name + ' · ' + item.text);
              }}
            >
              <Art tile={item.tile} />
              <small>{item.size}格</small>
              <b>{item.tag}</b>
            </button>
          );
        })}
      </div>
      <div className="tp-bag-tools">
        <output>{notice}</output>
        <div>
          <button
            disabled={!selected || selected.start === 0}
            onClick={() => move(selected!.start - 1)}
          >
            左移
          </button>
          <button
            disabled={!selected || itemEnd(selected) === BAG_CELLS}
            onClick={() => move(selected!.start + 1)}
          >
            右移
          </button>
          <button
            disabled={!selected}
            onClick={() => {
              onLayout(layout.filter((entry) => entry.id !== chosen));
              setChosen(null);
              setNotice('已取下，可以换上另一件旧物。');
            }}
          >
            取下
          </button>
        </div>
      </div>
      <div className="tp-catalog-filters">
        {families.map((family) => (
          <button
            key={family.id}
            className={filter === family.id ? 'is-active' : ''}
            onClick={() => setFilter(family.id)}
          >
            {family.name}
          </button>
        ))}
      </div>
      <div className="tp-items tp-strategy-catalog">
        {ITEMS.filter((item) => filter === 'all' || item.family === filter).map(
          (item) => {
            const equipped = layout.some((entry) => entry.id === item.id);
            return (
              <button
                key={item.id}
                className={`tp-item tp-family-${item.family} ${equipped ? 'is-equipped' : ''}`}
                aria-pressed={equipped}
                title={item.text}
                onClick={() => {
                  tap();
                  setChosen(item.id);
                  if (equipped) {
                    setNotice(
                      '已选中 ' + item.name + '；点空格移动，或按取下。',
                    );
                    return;
                  }
                  const next = placeThrowItem(layout, item.id);
                  if (next === layout)
                    setNotice('连续空位不足，先取下旧物或重新布局。');
                  else {
                    onLayout(next);
                    setNotice(item.name + '已装入。' + item.text);
                  }
                }}
              >
                <Art tile={item.tile} />
                <span>
                  <small>
                    {item.tag} · {item.size}格
                  </small>
                  <strong>{item.name}</strong>
                  <p>{item.text}</p>
                </span>
                <b>{equipped ? '✓' : '+'}</b>
              </button>
            );
          },
        )}
      </div>
      <div className="tp-relic-heading">
        <h3>唯一遗物</h3>
        <span>{relic ? '1 / 1' : '0 / 1'} · 点击更换</span>
      </div>
      <div className="tp-relics tp-strategy-relics">
        {RELICS.map((entry) => (
          <button
            key={entry.id}
            aria-pressed={relic === entry.id}
            title={entry.text}
            className={relic === entry.id ? 'is-equipped' : ''}
            onClick={() => {
              tap();
              onRelic(relic === entry.id ? null : entry.id);
            }}
          >
            <Art tile={entry.tile} />
            <strong>{entry.name}</strong>
            <span>{relic === entry.id ? '已携带' : '遗物'}</span>
          </button>
        ))}
      </div>
      <div className="tp-relic-description">
        <strong>{currentRelic?.name ?? '暂不携带遗物'}</strong>
        <p>{currentRelic?.text ?? '只依靠行囊中的伙伴对决。'}</p>
        <small>{currentRelic?.story ?? '一只小行囊，也有自己的默契。'}</small>
      </div>
    </>
  );
}
