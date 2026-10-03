'use client';
import { useEffect, useRef, useState } from 'react';
import type { OpeningAction, OpeningState } from '@/lib/survival-opening';
import type { Item } from '@/lib/survival-room';
import CargoGrid from './cargo';
import { GearIcon } from './equipment';
import { paintTerminal } from './terminal-screen';
import { itemName } from '@/lib/survival-stacks';
export default function BaseUpgrade({
  state,
  act,
  reduced,
}: {
  state: OpeningState;
  act: (a: OpeningAction) => void;
  reduced: boolean;
}) {
  const dialog = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    hole = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<Item | null>(null),
    [drag, setDrag] = useState<{
      item: Item;
      x: number;
      y: number;
      over: boolean;
    } | null>(null),
    [message, setMessage] = useState('');
  useEffect(() => {
    if (canvas.current)
      paintTerminal(canvas.current.getContext('2d')!, state, reduced, true);
  }, [state, reduced]);
  const feeding = state.homecoming.scene === 'feed';
  const feed = (item: Item) => {
    if (!feeding) return;
    if (item.kind !== 'energy-core') {
      setMessage('需要能源核心');
      return;
    }
    act({ type: 'feed-core', uid: item.uid });
    setSelected(null);
    setMessage('');
  };
  const over = drag?.over;
  return (
    <div
      ref={dialog}
      className="base-upgrade base-upgrade-panel"
      aria-label="基地升级"
    >
      <header>
        <span className="base-level">0 → 1</span>
        <progress
          aria-label="电梯升级进度"
          value={
            feeding ? 0 : Math.min(100, (state.homecoming.tick / 105) * 100)
          }
          max={100}
        />
      </header>
      <div className="first-upgrade-reward">
        <span>升级条件 · 能源核心 × 1</span>
        <span>升级奖励 · 轿厢照明 / 第二层</span>
      </div>
      <div className="base-upgrade-layout">
        <section className="base-terminal" aria-label="电梯终端与投喂口">
          <canvas
            ref={canvas}
            width={600}
            height={860}
            aria-label={
              feeding ? '机器人：把能源核心拖进黑孔' : '电梯供能升级中'
            }
          />
          <button
            ref={hole}
            className={`base-mouth ${over ? 'hover' : ''}`}
            disabled={!feeding || !selected}
            aria-label="投喂黑孔：放入选中的能源核心"
            onClick={() => selected && feed(selected)}
          >
            <span>
              {feeding ? (over ? '松手' : selected ? '投喂' : '拖入核心') : '…'}
            </span>
          </button>
        </section>
        <section className="base-cargo">
          <CargoGrid
            state={state.room}
            act={(action) => act({ type: 'inventory', action })}
            delivery={{
              select: setSelected,
              drag: (item, p) => {
                const r = hole.current?.getBoundingClientRect(),
                  d = dialog.current?.getBoundingClientRect();
                setDrag(
                  item && d
                    ? {
                        item,
                        x: p.x - d.left + dialog.current!.scrollLeft,
                        y: p.y - d.top + dialog.current!.scrollTop,
                        over:
                          !!r &&
                          p.x >= r.left &&
                          p.x <= r.right &&
                          p.y >= r.top &&
                          p.y <= r.bottom,
                      }
                    : null,
                );
              },
              drop: (item, p) => {
                const r = hole.current?.getBoundingClientRect();
                if (
                  r &&
                  p.x >= r.left &&
                  p.x <= r.right &&
                  p.y >= r.top &&
                  p.y <= r.bottom
                ) {
                  feed(item);
                  return true;
                }
                return false;
              },
            }}
          />
          <output aria-live="polite" className="base-feedback">
            {message}
          </output>
        </section>
      </div>
      {drag && (
        <div className="base-drag" style={{ left: drag.x, top: drag.y }}>
          <GearIcon kind={drag.item.kind} />
          {itemName(drag.item)}
        </div>
      )}
    </div>
  );
}
