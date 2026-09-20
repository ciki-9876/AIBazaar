/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/prefer-tag-over-role -- Drop surfaces supplement fully keyboard-operable card and cell buttons. */
'use client';
import { useState, useRef } from 'react';
import { itemName, openCells, previewPlacement } from '@/lib/demo-engine';
import type { Item, Run, Action } from '@/lib/demo-engine';
import CardFace from './card-face';
import CardDetail from './card-detail';
export default function BuildBoard({
  run,
  onAction,
}: {
  run: Run;
  selected: string | null;
  placing: string | null;
  onSelect: (item: Item, element: HTMLElement) => void;
  onPlacing: (uid: string | null) => void;
  onAction: (action: Action) => Run | null;
}) {
  const [drag, setDrag] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };
  const hideHover = () => {
    hoverTimer.current = setTimeout(() => setHover(null), 160);
  };
  const [hover, setHover] = useState<Item | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const cards = run.items.filter(
    (x) =>
      x.type === 'card' && (run.phase === 'base' || x.zone !== 'warehouse'),
  );
  const board = cards.filter((x) => x.zone === 'board');
  const active = cards.find((x) => x.uid === drag);
  const finish = (at: number) => {
    if (!active) return;
    const check = previewPlacement(run, active.uid, at);
    if (check.allowed) {
      onAction({ type: 'place', id: active.uid, at });
      setMessage(`${itemName(active)}已上阵`);
    } else setMessage(check.reason);
    setDrag(null);
    setTarget(null);
    setHover(null);
  };
  const source = (item: Item) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', item.uid);
      e.dataTransfer.effectAllowed = 'move';
      setDrag(item.uid);
      setHover(null);
    },
    onDragEnd: () => {
      setDrag(null);
      setTarget(null);
    },
    onMouseEnter: () => {
      keepHover();
      if (!drag) setHover(item);
    },
    onMouseLeave: hideHover,
    onFocus: () => {
      if (!drag) setHover(item);
    },
    onBlur: () => setHover(null),
    onClick: () => {
      setDrag(item.uid);
      setHover(null);
    },
  });
  return (
    <section className="ed-panel ed-build-board drag-build">
      <aside
        className="ed-build-candidates"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (active?.zone === 'board')
            onAction({ type: 'unequip', id: active.uid });
          setDrag(null);
        }}
      >
        <h3>卡牌</h3>
        <p className="build-hint">拖到右侧棋盘</p>
        {cards
          .filter((x) => x.zone !== 'board')
          .map((item) => (
            <button
              key={item.uid}
              {...source(item)}
              className={`build-list-card rarity-${item.rarity}`}
              aria-label={`拖动${itemName(item)}`}
            >
              <strong>{itemName(item)}</strong>
              <span>{item.volume} 格</span>
              <CardFace
                card={{ ...item, at: 0, rarity: item.rarity ?? 0 }}
                enemy={false}
              />
            </button>
          ))}
        {!cards.some((x) => x.zone !== 'board') && <p>备用卡已全部上阵</p>}
        {drag && (
          <button
            onClick={() => {
              setDrag(null);
              setTarget(null);
            }}
          >
            取消放置
          </button>
        )}
      </aside>
      <div className="ed-planning-board drag-planning">
        <h3>战斗棋盘</h3>
        <div className="drag-lanes">
          {[0, 1, 2].map((lane) => (
            <section className="drag-lane" key={lane}>
              <h4>{['左路', '中路', '右路'][lane]}</h4>
              {[0, 1, 2].map((col) => {
                const at = lane * 3 + col,
                  item = board.find((x) => x.at === at),
                  covered = board.some(
                    (x) => x.at! < at && x.at! + x.volume > at,
                  );
                const allowed =
                  active && previewPlacement(run, active.uid, at).allowed;
                if (covered) return null;
                return (
                  <div
                    role="group"
                    key={at}
                    className={`drag-cell ${!openCells(run).includes(at) ? 'locked' : ''} ${target === at ? (allowed ? 'legal' : 'invalid') : ''}`}
                    style={{
                      gridColumn: `${col + 1} / span ${item?.volume ?? 1}`,
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setTarget(at);
                      setHover(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      finish(at);
                    }}
                  >
                    {item ? (
                      <button
                        {...source(item)}
                        className={`ed-card ed-card-v2 rarity-${item.rarity}`}
                        aria-label={`${itemName(item)}，${['左路', '中路', '右路'][lane]}`}
                        onClick={() =>
                          active ? finish(at) : setDrag(item.uid)
                        }
                      >
                        <CardFace
                          card={{ ...item, at, rarity: item.rarity ?? 0 }}
                          enemy={false}
                        />
                      </button>
                    ) : (
                      <button
                        onClick={() => finish(at)}
                        disabled={!openCells(run).includes(at)}
                        aria-label={`放置到${['左路', '中路', '右路'][lane]}第${col + 1}格`}
                      >
                        {openCells(run).includes(at) ? '+' : '锁定'}
                      </button>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        <output aria-live="polite">
          {message || (active ? '选择落点，或按取消返回' : '')}
        </output>
      </div>
      {hover && !drag && (
        <aside
          className="build-hover"
          role="tooltip"
          onMouseEnter={keepHover}
          onMouseLeave={hideHover}
        >
          <h3>{itemName(hover)}</h3>
          <CardDetail
            card={{ ...hover, at: hover.at ?? 0, rarity: hover.rarity ?? 0 }}
          />
        </aside>
      )}
    </section>
  );
}
