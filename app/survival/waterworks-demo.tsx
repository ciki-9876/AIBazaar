/* oxlint-disable next/no-html-link-for-pages -- Standalone local prototype navigation. */
'use client';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  Backpack,
  Check,
  ChevronRight,
  CirclePause,
  Droplets,
  Heart,
  LockKeyhole,
  Play,
  RotateCcw,
  ShieldCheck,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import {
  BAG_SIZE,
  SAFE_SIZE,
  STEP,
  ELEVATOR,
  capacity,
  cargoValue,
  createSurvival,
  hasWeapon,
  cacheTitle,
  searchDuration,
  stepSurvival,
  survivalAction,
  type Point,
  type SurvivalAction,
} from '@/lib/survival-room';
import { sitePath } from '@/lib/site-path';
import { insideLift } from '@/lib/survival-lift';
import {
  presentationFrame,
  retargetPresentation,
} from '@/lib/survival-presentation';
import type { Marker } from './scene';
import CargoGrid from './cargo';
import '../../experiments/survival-waterworks/survival.css';
import '../../experiments/survival-waterworks/painted-ui.css';
import DesignSystem from './design-system';
import { uiVariables } from './design-tokens';
import EquipmentBoard from './equipment';
import Minimap from './minimap';
const Scene = lazy(() => import('./scene'));
type Mode = 'none' | 'pause' | 'bag';
function clock(ticks: number) {
  const seconds = Math.floor(ticks * STEP);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export default function WaterworksDemo() {
  const [designSystem, setDesignSystem] = useState(false);
  const [state, setState] = useState(createSurvival);
  const world = useRef(state);
  const presentation = useRef(presentationFrame(state));
  const [mode, setMode] = useState<Mode>('none'),
    modeRef = useRef<Mode>('none');
  const [reduced, setReduced] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const markerLayer = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>()),
    accumulator = useRef(0);
  const changeMode = useCallback((next: Mode) => {
    keys.current.clear();
    accumulator.current = 0;
    modeRef.current = next;
    setMode(next);
  }, []);
  const act = useCallback((action: SurvivalAction) => {
    if (action.type === 'start') keys.current.clear();
    const next = survivalAction(world.current, action);
    world.current = next;
    presentation.current = retargetPresentation(presentation.current, next);
    setState(next);
  }, []);
  const restart = useCallback(() => {
    world.current = createSurvival();
    presentation.current = presentationFrame(world.current);
    setState(world.current);
    changeMode('none');
  }, [changeMode]);
  const openDoor = useCallback(() => {
    if (modeRef.current !== 'none' || !sceneReady) return;
    if (world.current.status === 'extracted') restart();
    act({ type: 'start' });
  }, [act, restart, sceneReady]);
  const go = useCallback(
    (point: Point) => {
      if (modeRef.current === 'none') act({ type: 'move', to: point });
    },
    [act],
  );
  const handleMarkers = useCallback((next: Marker[]) => {
    const nodes =
      markerLayer.current?.querySelectorAll<HTMLElement>('[data-marker-id]');
    if (!nodes) return;
    const map = new Map(next.map((m) => [m.id, m]));
    nodes.forEach((node) => {
      const marker = map.get(node.dataset.markerId!);
      const visible = !!marker?.visible;
      node.style.visibility = visible ? 'visible' : 'hidden';
      node.style.pointerEvents =
        visible && node.tagName === 'BUTTON' ? 'auto' : 'none';
      node.setAttribute('aria-hidden', String(!visible));
      if (marker) {
        node.style.left = '0';
        node.style.top = '0';
        node.style.transform =
          'translate3d(' +
          marker.x +
          'px,' +
          marker.y +
          'px,0) translate(-50%,-100%)';
      }
    });
  }, []);
  useEffect(() => {
    let frame = 0,
      previous = 0;
    const update = (time: number) => {
      const elapsed = previous ? Math.min((time - previous) / 1000, 0.12) : 0;
      previous = time;
      if (
        (world.current.status === 'running' ||
          world.current.status === 'departing') &&
        modeRef.current === 'none' &&
        !document.hidden
      ) {
        accumulator.current += elapsed;
        let changed = false;
        while (accumulator.current >= STEP) {
          const pressed = keys.current;
          presentation.current.previous = world.current;
          world.current = stepSurvival(world.current, {
            x:
              Number(pressed.has('KeyD') || pressed.has('ArrowRight')) -
              Number(pressed.has('KeyA') || pressed.has('ArrowLeft')),
            z:
              Number(pressed.has('KeyS') || pressed.has('ArrowDown')) -
              Number(pressed.has('KeyW') || pressed.has('ArrowUp')),
          });
          presentation.current.current = world.current;
          accumulator.current -= STEP;
          changed =
            changed ||
            world.current.tick % 3 === 0 ||
            world.current.status !== 'running';
        }
        presentation.current.alpha = accumulator.current / STEP;
        if (changed) setState(world.current);
      } else accumulator.current = 0;
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches('input, textarea, select')) return;
      const movement = [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'ArrowUp',
        'ArrowLeft',
        'ArrowDown',
        'ArrowRight',
      ].includes(e.code);
      if (movement) {
        e.preventDefault();
        if (modeRef.current === 'none' && world.current.status === 'running')
          keys.current.add(e.code);
      }
      if (e.repeat) return;
      if (
        (e.code === 'Escape' || e.code === 'Space') &&
        (world.current.status === 'running' ||
          world.current.status === 'departing')
      ) {
        e.preventDefault();
        changeMode(modeRef.current === 'none' ? 'pause' : 'none');
      }
      if (e.code === 'KeyB' && world.current.status === 'running')
        changeMode(modeRef.current === 'bag' ? 'none' : 'bag');
      if (e.code === 'KeyE' && modeRef.current === 'none')
        act({ type: 'extract' });
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => {
      keys.current.clear();
      if (
        (world.current.status === 'running' ||
          world.current.status === 'departing') &&
        modeRef.current === 'none'
      )
        changeMode('pause');
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [act, changeMode]);
  const active = state.status === 'running',
    ended = state.status === 'dead' || state.status === 'extracted';
  useEffect(() => {
    if (mode === 'none' && !ended) return;
    const dialog = document.querySelector<HTMLDialogElement>(
      '.survival-page dialog[open]',
    );
    if (!dialog) return;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, a[href]',
        ),
      );
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = focusable(),
        first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener('keydown', trap);
    return () => dialog.removeEventListener('keydown', trap);
  }, [mode, ended]);
  const nearLift = state.leftLift && insideLift(state.player, ELEVATOR);
  const boss = state.enemies.find((e) => e.kind === 'boss');
  const safeValue = cargoValue(state.safe),
    totalValue =
      cargoValue(state.bag) +
      cargoValue(state.equipment.map((e) => e.item)) +
      safeValue;
  const bagUsed = capacity(state.bag),
    safeUsed = capacity(state.safe);
  return (
    <main
      style={uiVariables as React.CSSProperties}
      className={`survival-page ${state.status} ${mode !== 'none' ? 'is-paused' : ''}`}
    >
      <div className="survival-world">
        <Suspense fallback={null}>
          <Scene
            key={state.seed}
            state={world}
            presentation={presentation}
            reduced={reduced}
            onMove={go}
            onMarkers={handleMarkers}
            onReady={() => setSceneReady(true)}
            onDoor={openDoor}
            paused={mode !== 'none'}
          />
        </Suspense>
      </div>
      <div className="survival-vignette" />
      {designSystem && <DesignSystem close={() => setDesignSystem(false)} />}
      {(active || state.status === 'dead') && (
        <header className="survival-header">
          <a
            className="survival-brand"
            href={sitePath('/art/')}
            aria-label="返回美术原型"
          >
            <span>F9</span>
            <ArrowLeft size={15} />
          </a>
          <div className="survival-location">
            <span>
              {state.status === 'ready'
                ? 'F9 / PASSENGER LIFT'
                : '01 / THE PAINTED WATERWORKS'}
            </span>
            <h1>{state.status === 'ready' ? '初始轿厢' : '旧城水处理站'}</h1>
          </div>
          <div className="survival-header-right">
            <span className="survival-clock">{clock(state.tick)}</span>
            <button
              className="survival-bag-button"
              onClick={() =>
                active && changeMode(mode === 'bag' ? 'none' : 'bag')
              }
              disabled={!active}
            >
              <Backpack size={17} />
              <span>行囊</span>
              <b>
                {bagUsed}/{BAG_SIZE}
              </b>
            </button>
            <button
              className="survival-icon-button"
              aria-label="暂停"
              onClick={() => changeMode(mode === 'none' ? 'pause' : 'none')}
              disabled={!active && state.status !== 'departing'}
            >
              <CirclePause size={21} />
            </button>
          </div>
        </header>
      )}
      {active && (
        <>
          <aside className="survival-mission">
            <span className="survival-eyebrow">本次出勤</span>
            <p>
              {state.bossDefeated
                ? '带上机芯，返回电梯。'
                : hasWeapon(state, 'coil') || hasWeapon(state, 'blade')
                  ? '继续搜刮，或挑战深处驻守者。'
                  : '先拿到一件自动装备。'}
            </p>
            <div>
              <span
                className={state.bag.length || state.safe.length ? 'done' : ''}
              >
                <Check size={12} />
                搜取物资
              </span>
              <span className={state.bossDefeated ? 'done' : ''}>
                ◇ 驻守者 · 可选
              </span>
            </div>
          </aside>
          <div className="survival-wave">
            <i />
            <span>
              {state.wave === 0
                ? '通风井里传来声响'
                : `第 ${state.wave} 波 · ${state.spawns.length ? '敌群正在涌入' : state.enemies.filter((e) => e.awake).length > 9 ? '保持移动' : '搜刮间隙'}`}
            </span>
            <small>
              {state.wave > 0 ? `${state.kills} 击倒` : '注意地面的预警环'}
            </small>
          </div>
          <div
            ref={markerLayer}
            className="survival-markers"
            aria-label="场景中的物资与电梯"
          >
            <button
              className="survival-marker lift"
              data-marker-id="lift"
              disabled={mode !== 'none'}
              aria-label="返回电梯"
              onPointerDown={(event) => {
                if (event.button === 0) {
                  event.preventDefault();
                  go(ELEVATOR);
                }
              }}
              onClick={(event) => {
                if (event.detail === 0) go(ELEVATOR);
              }}
            >
              <ArrowDownLeft size={13} />
              <span>返回电梯</span>
            </button>
            {state.caches
              .filter((c) => !c.opened && c.available <= state.tick)
              .map((c) => {
                const searching = state.searching === c.id;
                return (
                  <button
                    key={c.id}
                    className={`survival-marker ${c.item.kind} ${searching ? 'searching' : ''}`}
                    data-marker-id={c.id}
                    onPointerDown={(event) => {
                      if (event.button === 0) {
                        event.preventDefault();
                        go(c);
                      }
                    }}
                    onClick={(event) => {
                      if (event.detail === 0) go(c);
                    }}
                    disabled={mode !== 'none'}
                    aria-label={`前往${cacheTitle(c)}`}
                  >
                    <span className="marker-dot" />
                    <span>
                      {cacheTitle(c)}
                      <small>
                        {c.searched
                          ? ` · 剩余 ${c.contents.length} 件`
                          : c.container === 'loose'
                            ? ' · 拾取'
                            : ` · 翻找 ${(searchDuration(c, state.player.energy) / 30).toFixed(1)} 秒`}
                      </small>
                    </span>
                    {searching && (
                      <i
                        style={{
                          width: `${Math.min(100, (state.searchTicks / searchDuration(c, state.player.energy)) * 100)}%`,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            {boss && (
              <div className="survival-boss-tag" data-marker-id="warden">
                <span>{boss.awake ? '驻守者 · 已惊动' : '驻守者 · 危险'}</span>
                <div>
                  <i style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
                </div>
              </div>
            )}
            {state.searching && (
              <div className="survival-player-tag" data-marker-id="player">
                正在翻找 · 移动可中断
              </div>
            )}
          </div>
          {state.noticeUntil > state.tick && (
            <output className="survival-notice" key={state.notice}>
              <span />
              {state.notice}
            </output>
          )}
          {nearLift && mode === 'none' && (
            <div className="survival-extract">
              <button
                onClick={() => act({ type: 'extract' })}
                disabled={state.extraction > 0}
              >
                <ArrowDownLeft size={20} />
                <span>
                  {state.extraction ? '正在撤离…' : '返回电梯'}
                  <small>
                    {state.extraction
                      ? '移动或受到攻击会中断'
                      : `带回物资价值 ${totalValue} · 按 E`}
                  </small>
                </span>
                {state.extraction > 0 && (
                  <i style={{ width: `${(state.extraction / 66) * 100}%` }} />
                )}
              </button>
            </div>
          )}
        </>
      )}
      {active && <Minimap state={state} />}
      {active && (
        <footer className="survival-hud">
          <section className="survival-vitals" aria-label="生存状态">
            <div className="survival-health">
              <Heart size={15} />
              <span>生命</span>
              <strong>
                {Math.ceil(state.player.hp)}
                <small>/100</small>
              </strong>
              <div>
                <i style={{ width: `${state.player.hp}%` }} />
              </div>
            </div>
            <div className="survival-needs">
              {(
                [
                  { key: 'water', label: '饮水', icon: <Droplets size={12} /> },
                  { key: 'food', label: '饱食', icon: <Utensils size={12} /> },
                  { key: 'energy', label: '精力', icon: <Zap size={12} /> },
                ] as const
              ).map((need) => (
                <div
                  key={need.key}
                  className={state.player[need.key] < 25 ? 'low' : ''}
                >
                  {need.icon}
                  <span>{need.label}</span>
                  <b>{Math.ceil(state.player[need.key])}</b>
                  <i>
                    <em style={{ width: `${state.player[need.key]}%` }} />
                  </i>
                </div>
              ))}
            </div>
          </section>
          <EquipmentBoard state={state} onOpen={() => changeMode('bag')} />
          <div className="survival-cargo">
            <ShieldCheck size={17} />
            <div>
              <strong>
                {totalValue}
                <small> 物资价值</small>
              </strong>
              <span>
                安全容器 {safeUsed}/{SAFE_SIZE} 格
              </span>
            </div>
          </div>
          <div className="survival-controls">
            <span>
              <kbd>WASD</kbd> / 方向键移动
            </span>
            <span>点击地面前往 · 停留搜取</span>
            <span>
              <kbd>B</kbd> 行囊 <kbd>空格</kbd> 暂停
            </span>
          </div>
        </footer>
      )}
      {(state.status === 'ready' || state.status === 'extracted') && (
        <button
          className="survival-screen-reader"
          onClick={openDoor}
          disabled={!sceneReady}
          aria-label={
            state.status === 'ready' ? '打开电梯门' : '开门重新开始试玩'
          }
        >
          {state.status === 'ready'
            ? '打开电梯门，快捷键 E'
            : '再次开门将重置本次试玩，快捷键 E'}
        </button>
      )}
      {(active || state.status === 'departing') && mode === 'pause' && (
        <div className="survival-modal-backdrop">
          <dialog
            open
            className="survival-pause"
            aria-modal="true"
            aria-label="暂停"
          >
            <span className="survival-eyebrow">EXPEDITION PAUSED</span>
            <h2>稍作停留。</h2>
            <p>世界已暂停。准备好后，继续这次出勤。</p>
            <button
              className="survival-primary"
              onClick={() => changeMode('none')}
              autoFocus
            >
              <Play size={16} />
              继续探索
            </button>
            <button
              className="survival-secondary"
              onClick={() => changeMode('bag')}
              disabled={!active}
            >
              <Backpack size={16} />
              整理行囊
            </button>
            <button
              className="survival-secondary"
              onClick={() => setDesignSystem(true)}
            >
              界面设计系统
            </button>
            <label className="survival-reduced">
              <input
                type="checkbox"
                checked={reduced}
                onChange={(e) => setReduced(e.target.checked)}
              />
              减少额外动态
            </label>
            <button className="survival-text-button" onClick={restart}>
              <RotateCcw size={13} />
              重新开始试玩
            </button>
          </dialog>
        </div>
      )}
      {active && mode === 'bag' && (
        <div className="survival-modal-backdrop inventory-backdrop">
          <dialog
            open
            className="survival-inventory"
            aria-modal="true"
            aria-label="整理行囊"
          >
            <header>
              <div>
                <span className="survival-eyebrow">
                  CARGO MANIFEST / 已暂停
                </span>
                <h2>这趟带回什么？</h2>
              </div>
              <button
                className="survival-icon-button"
                aria-label="关闭行囊"
                onClick={() => changeMode('none')}
                autoFocus
              >
                <X size={20} />
              </button>
            </header>
            <div className="survival-inventory-body">
              <EquipmentBoard state={state} editing act={act} />
              <CargoGrid state={state} act={act} />
            </div>
            <footer>
              <span>
                携行价值 <strong>{totalValue}</strong>
              </span>
              <button
                className="survival-primary"
                onClick={() => changeMode('none')}
              >
                继续探索
                <ChevronRight size={16} />
              </button>
            </footer>
          </dialog>
        </div>
      )}
      {state.status === 'dead' && (
        <div className="survival-modal-backdrop ending-backdrop">
          <dialog
            open
            className={`survival-result ${state.status}`}
            aria-modal="true"
            aria-label="出勤结算"
          >
            <span className="survival-eyebrow">EXPEDITION LOST</span>
            <h2>这次，没能走回来。</h2>
            <p>装备与普通背包已经遗失。安全容器里的东西仍属于你。</p>
            <div className="survival-result-stats">
              <div>
                <b>{safeValue}</b>
                <span>保住的物资价值</span>
              </div>
              <div>
                <b>{state.kills}</b>
                <span>击倒敌人</span>
              </div>
              <div>
                <b>{clock(state.tick)}</b>
                <span>出勤时间</span>
              </div>
            </div>
            <div className="survival-result-loot">
              {[
                ...state.equipment.map((e) => e.item),
                ...state.bag,
                ...state.safe,
              ].length ? (
                [
                  ...state.equipment.map((e) => e.item),
                  ...state.bag,
                  ...state.safe,
                ].map((i) => (
                  <span key={i.uid}>
                    {state.safe.includes(i) && <LockKeyhole size={11} />}
                    {i.name}
                  </span>
                ))
              ) : (
                <span className="muted">本次没有保住物资</span>
              )}
            </div>
            {state.lost.length > 0 && (
              <p className="survival-loss">
                遗失：{state.lost.map((i) => i.name).join('、')}
              </p>
            )}
            <div className="survival-result-note">
              {state.bossDefeated
                ? '驻守者已击败。本次房间内不会复生。'
                : '深处的驻守者还在。下一次，可以准备得更充分。'}
            </div>
            <button className="survival-primary" onClick={restart}>
              <RotateCcw size={17} />
              重新开始试玩
            </button>
            <small>本切片每次重开都重置同一房间。</small>
          </dialog>
        </div>
      )}
    </main>
  );
}
