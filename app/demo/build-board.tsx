'use client';
import { useState } from 'react';
import { cardDef } from '@/lib/demo-cards';
import {
  itemName,
  openCells,
  previewPlacement,
  QUALITY,
} from '@/lib/demo-engine';
import type { Item, Run, Action } from '@/lib/demo-engine';
import CardFace from './card-face';

export default function BuildBoard({
  run,
  selected,
  placing,
  onSelect,
  onPlacing,
  onAction,
}: {
  run: Run;
  selected: string | null;
  placing: string | null;
  onSelect: (item: Item, element: HTMLElement) => void;
  onPlacing: (uid: string | null) => void;
  onAction: (action: Action) => Run | null;
}) {
  const [target, setTarget] = useState<{ uid: string; at: number } | null>(
    null,
  );
  const card = run.items.find((x) => x.uid === placing);
  const at = target?.uid === placing ? target.at : null;
  const preview =
    card && at !== null ? previewPlacement(run, card.uid, at) : null;
  const board = run.items.filter((x) => x.zone === 'board');
  const candidates = run.items.filter(
    (x) =>
      x.type === 'card' &&
      x.zone !== 'board' &&
      (run.phase === 'base' || x.zone !== 'warehouse'),
  );
  const other = board.find((x) => x.uid !== card?.uid && x.at === at);
  return (
    <section className="ed-panel ed-build-board">
      <h3>上阵构筑 · {openCells(run).length} / 9 格已解锁</h3>
      <section className="ed-build-candidates">
        <h3>候选卡 · {candidates.length}</h3>
        <div>
          {candidates.map((item) => (
            <button
              key={item.uid}
              aria-pressed={selected === item.uid}
              onClick={(e) => onSelect(item, e.currentTarget)}
            >
              <strong>{cardDef(item.id).name}</strong>
              <small>
                {item.volume}格 · {QUALITY[item.quality]} ·{' '}
                {item.zone === 'warehouse'
                  ? '仓库'
                  : item.zone === 'safe'
                    ? '安全容器'
                    : '背包'}
              </small>
            </button>
          ))}
        </div>
        {!candidates.length && <p>暂无备用卡牌。</p>}
      </section>
      {card && (
        <section className="ed-placement" aria-label="手动落点预览">
          <b>
            {itemName(card)} · {card.volume} 格 · 选择起始格
          </b>
          <div className="ed-target-grid">
            {Array.from({ length: 9 }, (_, pos) => {
              const check = previewPlacement(run, card.uid, pos);
              const inPreview =
                at !== null && pos >= at && pos < at + card.volume;
              const occupant = board.find(
                (x) => x.at! <= pos && x.at! + x.volume > pos,
              );
              return (
                <button
                  key={pos}
                  aria-pressed={at === pos}
                  className={`${check.allowed ? 'legal' : 'invalid'} ${inPreview ? 'preview' : ''}`}
                  onClick={() => setTarget({ uid: card.uid, at: pos })}
                  aria-label={`预览${['上路', '中路', '下路'][Math.floor(pos / 3)]}第${(pos % 3) + 1}格`}
                >
                  {['上', '中', '下'][Math.floor(pos / 3)]}
                  {(pos % 3) + 1}
                  <small>
                    {!openCells(run).includes(pos)
                      ? '锁定'
                      : occupant
                        ? itemName(occupant)
                        : '空位'}
                  </small>
                </button>
              );
            })}
          </div>
          <output>
            {at === null
              ? '尚未选择落点'
              : `${['上路', '中路', '下路'][Math.floor(at / 3)]}第${(at % 3) + 1}格起，占${card.volume}格。${other ? `与${itemName(other)}交换；对方移至${card.zone === 'board' ? ['上路', '中路', '下路'][Math.floor(card.at! / 3)] + '第' + ((card.at! % 3) + 1) + '格' : card.zone === 'warehouse' ? '仓库' : card.zone === 'safe' ? '安全容器' : '背包'}。` : ''}${preview?.reason}`}
          </output>
          <div className="ed-actions">
            <button
              className="ed-primary"
              disabled={!preview?.allowed}
              onClick={() => {
                if (
                  at !== null &&
                  onAction({ type: 'place', id: card.uid, at })
                ) {
                  setTarget(null);
                  onPlacing(null);
                }
              }}
            >
              确认{other ? '交换' : '放置'}
            </button>
            <button
              onClick={() => {
                setTarget(null);
                onPlacing(null);
              }}
            >
              取消预览
            </button>
          </div>
        </section>
      )}
      <div className="ed-board-scroll">
        <div className="ed-board ed-planning-board">
          {[0, 1, 2].map((lane) => (
            <div className="ed-lane" key={lane}>
              <div className="ed-lane-label">
                <b>{['上路', '中路', '下路'][lane]}</b>
              </div>
              <div className="ed-lane-cells">
                {[0, 1, 2].map((col) => {
                  const pos = lane * 3 + col;
                  const item = board.find((x) => x.at === pos);
                  if (board.some((x) => x.at! < pos && x.at! + x.volume > pos))
                    return null;
                  return item ? (
                    <button
                      key={pos}
                      className={`ed-card ed-card-v2 rarity-${item.rarity} quality-${item.quality}${selected === item.uid ? ' selected' : ''}`}
                      style={{ gridColumn: `${col + 1} / span ${item.volume}` }}
                      onClick={(e) => onSelect(item, e.currentTarget)}
                      aria-label={`选择${itemName(item)}，${['上路', '中路', '下路'][lane]}`}
                    >
                      <CardFace
                        card={{ ...item, at: pos, rarity: item.rarity ?? 0 }}
                        enemy={false}
                      />
                    </button>
                  ) : (
                    <div
                      key={pos}
                      className={`ed-slot ${openCells(run).includes(pos) ? '' : 'locked'}`}
                      style={{ gridColumn: col + 1 }}
                    >
                      {openCells(run).includes(pos) ? '空位' : '未解锁'}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
