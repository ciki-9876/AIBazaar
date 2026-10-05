'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronsUp, Warehouse } from 'lucide-react';
import type { OpeningAction, OpeningState } from '@/lib/survival-opening';
import type { Item } from '@/lib/survival-room';
import CargoGrid from './cargo';
import { GearIcon } from './equipment';
import { paintTerminal } from './terminal-screen';
import { itemName } from '@/lib/survival-stacks';
import { itemCount } from '@/lib/survival-stacks';
import { feedLift, liftFed, liftRecipe } from '@/lib/survival-lift-feed';
import { warehouseRows } from '@/lib/survival-cargo';
import { raceSpan } from '@/lib/survival-race';
export default function BaseUpgrade({
  state,
  act,
  reduced,
  compact = false,
}: {
  state: OpeningState;
  act: (a: OpeningAction) => void;
  reduced: boolean;
  compact?: boolean;
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
  const materialPointer = useRef<{
    item: Item;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const ignoreClick = useRef(false);
  useEffect(() => {
    if (canvas.current)
      paintTerminal(canvas.current.getContext('2d')!, state, reduced, true);
  }, [state, reduced]);
  const first = state.homecoming.scene !== 'complete';
  const level = first ? 0 : state.room.liftLevel || 1;
  const recipe = liftRecipe(level);
  const upgradeBlocked = !state.race && !state.season
    ? level > 1
      ? '探索第三层后继续升级'
      : !state.afterlight.equipmentTaught
        ? '先完成装备引导'
        : ''
    : '';
  const feeding = first
    ? state.homecoming.scene === 'feed'
    : level < 5 && state.afterlight.phase !== 'report';
  const inventory = [...state.room.bag, ...(state.room.warehouse || [])];
  const current = selected && inventory.find((i) => i.uid === selected.uid);
  const accepts = (item: Item) =>
    feeding &&
    (first
      ? item.kind === 'energy-core'
      : item.kind === 'scrap'
        ? (state.room.liftParts || 0) < recipe.parts
        : item.kind === 'lift-material' &&
          (state.room.liftExperience || 0) < recipe.xp);
  const preview =
    current && accepts(current) && !first
      ? feedLift(state.room, current.uid)
      : null;
  const remaining =
    preview && current
      ? [...preview.bag, ...(preview.warehouse || [])].find(
          (i) => i.uid === current.uid,
        )
      : null;
  const consumed =
    current && preview
      ? itemCount(current) - (remaining ? itemCount(remaining) : 0)
      : 0;
  const gained = preview
    ? (preview.liftExperience || 0) - (state.room.liftExperience || 0)
    : 0;
  const condensed = compact && !first;
  const feed = (item: Item) => {
    if (!feeding) return;
    if (
      first
        ? item.kind !== 'energy-core'
        : !['lift-material', 'scrap'].includes(item.kind)
    ) {
      setMessage(first ? '需要能源核心' : '只收脑浆与机械零件');
      return;
    }
    if (
      !first &&
      (item.kind === 'scrap'
        ? (state.room.liftParts || 0) >= recipe.parts
        : (state.room.liftExperience || 0) >= recipe.xp)
    ) {
      setMessage('这项材料已投满');
      return;
    }
    act({ type: first ? 'feed-core' : 'feed-lift', uid: item.uid });
    setSelected(null);
    setMessage('');
  };
  const over = drag?.over;
  const moveMaterial = (item: Item, x: number, y: number) => {
    const mouth = hole.current?.getBoundingClientRect(),
      panel = dialog.current?.getBoundingClientRect();
    if (!panel) return;
    setDrag({
      item,
      x: x - panel.left + dialog.current!.scrollLeft,
      y: y - panel.top + dialog.current!.scrollTop,
      over:
        !!mouth &&
        accepts(item) &&
        x >= mouth.left &&
        x <= mouth.right &&
        y >= mouth.top &&
        y <= mouth.bottom,
    });
  };
  return (
    <div
      ref={dialog}
      className={`base-upgrade base-upgrade-panel ${first ? '' : 'material-feeding'} ${condensed ? 'compact-feeding' : ''}`}
      aria-label="基地升级"
    >
      <header>
        <span className="base-level">
          {condensed ? (
            <>
              电梯升级 <b>Lv.{level}</b>
              {level < 5 ? (
                <>
                  <ArrowRight size={14} />
                  <b>{level + 1}</b>
                </>
              ) : (
                <small>满级</small>
              )}
            </>
          ) : level >= 5 ? (
            '电梯 Lv.5 / 满级'
          ) : first ? (
            '点亮电梯'
          ) : (
            `电梯 Lv.${level} → ${level + 1}`
          )}
        </span>
        {!condensed && (
          <progress
            aria-label="电梯升级进度"
            value={
              first
                ? feeding
                  ? 0
                  : Math.min(100, (state.homecoming.tick / 105) * 100)
                : Math.min(
                    100,
                    ((Math.min(recipe.xp, state.room.liftExperience || 0) /
                      recipe.xp +
                      Math.min(recipe.parts, state.room.liftParts || 0) /
                        recipe.parts) /
                      2) *
                      100,
                  )
            }
            max={100}
          />
        )}
      </header>
      {condensed && level < 5 && (
        <div className="feed-progress" aria-label="升级材料进度">
          <div title="已投入的脑浆经验">
            <GearIcon kind="lift-material" size={24} />
            <span>脑浆</span>
            <b>
              {Math.min(recipe.xp, state.room.liftExperience || 0)}
              <small>/{recipe.xp}</small>
            </b>
            <progress
              aria-label="脑浆经验"
              value={Math.min(recipe.xp, state.room.liftExperience || 0)}
              max={recipe.xp}
            />
          </div>
          <div title="已投入的机械零件">
            <GearIcon kind="scrap" size={24} />
            <span>零件</span>
            <b>
              {state.room.liftParts || 0}
              <small>/{recipe.parts}</small>
            </b>
            <progress
              aria-label="机械零件"
              value={state.room.liftParts || 0}
              max={recipe.parts}
            />
          </div>
        </div>
      )}
      <div
        className={`first-upgrade-reward ${condensed ? 'compact-rewards' : ''}`}
      >
        {condensed ? (
          <>
            <span title="升级后的仓库格数">
              <Warehouse size={15} /> 仓库
              <b>
                {4 * warehouseRows(level)}
                {level < 5 && <>→{4 * warehouseRows(level + 1)}</>}
              </b>
            </span>
            <span title="升级后单次最大跨层跨度">
              <ChevronsUp size={15} /> 跨度
              <b>
                {raceSpan(level)}
                {level < 5 && <>→{raceSpan(level + 1)}</>}F
              </b>
            </span>
          </>
        ) : (
          <>
            <span>
              {first
                ? '升级条件 · 能源核心 × 1'
                : level >= 5
                  ? '本轮电梯已达上限'
                  : `已投喂：脑浆经验 ${Math.min(recipe.xp, state.room.liftExperience || 0)} / ${recipe.xp} · 零件 ${state.room.liftParts || 0} / ${recipe.parts}`}
            </span>
            <span>
              {first
                ? '升级奖励 · 轿厢照明 / 第二层'
                : level >= 5
                  ? `仓库 ${4 * warehouseRows(level)} 格`
                  : `仓库 ${4 * warehouseRows(level)} → ${4 * warehouseRows(level + 1)} 格${level === 1 ? ' · 开启第三层' : ` · 跨度 ${raceSpan(level + 1)} 层`}`}
            </span>
          </>
        )}
      </div>
      <div className="base-upgrade-layout">
        <section className="base-terminal" aria-label="电梯终端与投喂口">
          <canvas
            ref={canvas}
            width={600}
            height={860}
            aria-label={
              feeding ? '机器人：把材料拖进黑孔，可逐件投喂' : '电梯终端'
            }
          />
          <button
            ref={hole}
            className={`base-mouth ${over ? 'hover' : ''}`}
            disabled={!current || !accepts(current)}
            aria-label={
              first
                ? '投喂黑孔：放入选中的能源核心'
                : '投喂黑孔：放入选中的升级材料'
            }
            onClick={() => current && feed(current)}
          >
            <span>
              {feeding
                ? over
                  ? '松手'
                  : current && accepts(current)
                    ? '投喂'
                    : first
                      ? '拖入核心'
                      : '拖入材料'
                : '…'}
            </span>
          </button>
        </section>
        <section className="base-cargo">
          {condensed ? (
            <>
              <small className="feed-material-label">
                {level >= 5 ? '满级' : '可投喂'}
              </small>
              <div
                className="feed-materials"
                aria-label="行囊与仓库中的升级材料"
              >
                {inventory
                  .filter((i) => ['lift-material', 'scrap'].includes(i.kind))
                  .map((item) => {
                    const stored = (state.room.warehouse || []).some(
                      (i) => i.uid === item.uid,
                    );
                    return (
                      <button
                        key={item.uid}
                        type="button"
                        data-feed-uid={item.uid}
                        data-quality={item.quality || 'low'}
                        className={`feed-material ${accepts(item) ? '' : 'filled'}`}
                        disabled={!accepts(item)}
                        aria-pressed={current?.uid === item.uid}
                        aria-label={`${stored ? '仓库' : '行囊'}中的${itemName(item)}，${itemCount(item)}份${accepts(item) ? '' : '，已投满'}`}
                        title={`${itemName(item)} ×${itemCount(item)} · ${stored ? '仓库' : '行囊'}${accepts(item) ? '' : ' · 已投满'}`}
                        onClick={(e) => {
                          if (ignoreClick.current && e.detail > 0) {
                            ignoreClick.current = false;
                            return;
                          }
                          ignoreClick.current = false;
                          setSelected(current?.uid === item.uid ? null : item);
                          setMessage('');
                        }}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          ignoreClick.current = false;
                          e.currentTarget.setPointerCapture(e.pointerId);
                          materialPointer.current = {
                            item,
                            x: e.clientX,
                            y: e.clientY,
                            active: false,
                          };
                        }}
                        onPointerMove={(e) => {
                          const pointer = materialPointer.current;
                          if (
                            !pointer ||
                            (!pointer.active &&
                              Math.hypot(
                                e.clientX - pointer.x,
                                e.clientY - pointer.y,
                              ) < 5)
                          )
                            return;
                          pointer.active = true;
                          setSelected(item);
                          moveMaterial(item, e.clientX, e.clientY);
                        }}
                        onPointerUp={(e) => {
                          const pointer = materialPointer.current;
                          if (pointer?.active) {
                            ignoreClick.current = true;
                            const mouth = hole.current?.getBoundingClientRect();
                            if (
                              mouth &&
                              e.clientX >= mouth.left &&
                              e.clientX <= mouth.right &&
                              e.clientY >= mouth.top &&
                              e.clientY <= mouth.bottom
                            )
                              feed(item);
                          }
                          materialPointer.current = null;
                          setDrag(null);
                        }}
                        onPointerCancel={() => {
                          materialPointer.current = null;
                          setDrag(null);
                        }}
                        onLostPointerCapture={() => {
                          materialPointer.current = null;
                          setDrag(null);
                        }}
                      >
                        <GearIcon kind={item.kind} size={34} />
                        <b>×{itemCount(item)}</b>
                        {stored && (
                          <Warehouse className="feed-stored" size={10} />
                        )}
                      </button>
                    );
                  })}
                {!inventory.some((i) =>
                  ['lift-material', 'scrap'].includes(i.kind),
                ) && <span className="feed-empty">暂无材料</span>}
              </div>
              <div className="feed-preview" aria-live="polite">
                {current && preview ? (
                  <>
                    <span>
                      {itemName(current)} <b>×{consumed}</b>
                    </span>
                    <strong>
                      {gained ? `+${gained}经验` : `+${consumed}零件`}
                    </strong>
                    <small>投入后不可取回</small>
                  </>
                ) : (
                  level < 5 && (
                    <small>
                      {inventory.some(accepts)
                        ? '选材料 · 点黑孔或拖入'
                        : '探索补充材料'}
                    </small>
                  )
                )}
              </div>
            </>
          ) : (
            <CargoGrid
              state={state.room}
              act={(action) => act({ type: 'inventory', action })}
              minimal={!first}
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
          )}
          {!first &&
            !condensed &&
            (state.room.warehouse || []).some((i) =>
              ['lift-material', 'scrap'].includes(i.kind),
            ) && (
              <div className="stored-feed-items" aria-label="仓库中的升级材料">
                <small>仓库</small>
                {(state.room.warehouse || [])
                  .filter((i) => ['lift-material', 'scrap'].includes(i.kind))
                  .map((i) => (
                    <button
                      key={i.uid}
                      data-item-uid={i.uid}
                      aria-pressed={current?.uid === i.uid}
                      onClick={() =>
                        setSelected(current?.uid === i.uid ? null : i)
                      }
                    >
                      <GearIcon kind={i.kind} />
                      {itemName(i)} ×{itemCount(i)}
                    </button>
                  ))}
              </div>
            )}
          {!first && liftFed(state.room) && level < 5 && (
            <button
              className="console-primary"
              disabled={!!upgradeBlocked}
              onClick={() =>
                act({ type: state.race ? 'upgrade-race' : 'upgrade-lift' })
              }
            >
              {upgradeBlocked || '升级电梯'}
            </button>
          )}
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
