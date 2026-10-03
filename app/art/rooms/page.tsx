/* oxlint-disable next/no-html-link-for-pages -- Art prototypes use document navigation. */
'use client';
import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Package,
  RotateCcw,
  X,
  Check,
  ScanLine,
  DoorOpen,
  ChevronRight,
  Plus,
  MapPin,
} from 'lucide-react';
import {
  newRoomDemo,
  roomAction,
  ROOM_INFO,
  type RoomAction,
} from '@/lib/room-demo';
import { createBattleSlice } from '@/lib/battle-slice';
import { sitePath } from '@/lib/site-path';
import type { RoomAnchor } from './scene';
import './rooms.css';
const RoomScene = lazy(() => import('./scene'));
const Battle = lazy(() =>
  import('../slice/page').then((m) => ({ default: m.BattleSlice })),
);
export default function RoomsDemo() {
  const [state, setState] = useState(newRoomDemo),
    [focus, setFocus] = useState<string | null>(null),
    [anchors, setAnchors] = useState<RoomAnchor[]>([]);
  const [bag, setBag] = useState(false),
    [battle, setBattle] = useState(false),
    [reduced, setReduced] = useState(false),
    [notice, setNotice] = useState('');
  const info = ROOM_INFO[state.room];
  const act = useCallback(
    (action: RoomAction) => setState((s) => roomAction(s, action)),
    [],
  );
  const travel = useCallback((room: number) => {
    setState((s) => roomAction(s, { type: 'travel', room }));
    setFocus(null);
    setNotice('');
    setAnchors([]);
  }, []);
  const pick = useCallback(
    (id: string) => {
      if (id.startsWith('valve-')) {
        act({ type: 'turn', index: Number(id.slice(-1)) });
        setFocus('pipes');
        return;
      }
      setFocus(id);
    },
    [act],
  );
  const onAnchors = useCallback((value: RoomAnchor[]) => setAnchors(value), []);
  const initialRun = useMemo(() => {
    const run = createBattleSlice();
    if (state.pad !== 'card')
      run.items = run.items.filter((x) => x.uid !== 'slice-pad');
    return run;
  }, [state.pad]);
  const items = [
    ...(state.glue ? ['补漏胶'] : []),
    ...(state.pad === 'item'
      ? ['缓冲垫 · 未鉴定']
      : state.pad === 'card'
        ? ['皮质缓冲垫 · 稀有']
        : []),
    ...(state.scanner ? ['鉴定仪 · 传说'] : []),
    ...(state.weapon ? ['卷簧弩 · 战利品'] : []),
  ];
  const labels: Record<string, string> = {
    exit: state.room === 3 ? '归返通道' : '下一间',
    back: state.room === 0 ? '电梯入口' : '上一间',
    elevator: '电梯',
    note: '墙上的纸条',
    chest: state.searched ? '空工具箱' : '工具箱',
    shelf: '散落物件',
    console: state.repaired ? '已恢复供压' : '泄压控制台',
    battle: state.cleared ? '已清理的装备台' : '装备台',
    trophy: '封存箱',
    'valve-0': '转动左段管道',
    'valve-1': '转动中段管道',
    'valve-2': '转动右段管道',
  };
  const canExit = state.room !== 2 || state.repaired;
  const next = state.room === 3 ? 2 : state.room + 1;
  if (battle)
    return (
      <Suspense fallback={<div className="rooms-loading">正在展开装备台…</div>}>
        <Battle
          initialRun={initialRun}
          onLeave={() => setBattle(false)}
          onReturn={() => {
            act({ type: 'victory' });
            setBattle(false);
            setFocus('trophy');
            setNotice('卷簧弩已收好。可以沿原路返回电梯。');
          }}
        />
      </Suspense>
    );
  return (
    <main className="rooms-page">
      <header className="rooms-header">
        <a href={sitePath('/art/')} className="rooms-brand">
          f9<span>异层档案</span>
        </a>
        <span className="rooms-location">
          云端旧街 <i /> 第一层
        </span>
        <div className="rooms-header-actions">
          <label>
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => setReduced(e.target.checked)}
            />
            减少动态
          </label>
          <button onClick={() => setBag(true)}>
            <Package size={16} />
            行囊 <b>{items.length}</b>
          </button>
        </div>
      </header>
      <section className="rooms-layout">
        <aside className="rooms-story">
          <span className="rooms-eyebrow">FIELD NOTES / {info.tag}</span>
          <div className="rooms-title">
            <span>{info.number}</span>
            <h1>{info.title}</h1>
          </div>
          <p>{info.description}</p>
          <div className="rooms-objective">
            <span>此刻</span>
            {state.cleared
              ? '沿原路返回电梯，带走这次收获。'
              : state.room === 2 && state.repaired
                ? '通道已经打开。鉴定仪已收入行囊。'
                : info.goal}
          </div>
          <nav className="rooms-map" aria-label="已发现的房间">
            {ROOM_INFO.map((r, i) => (
              <div
                key={r.tag}
                className={`${i === state.room ? 'current' : ''} ${state.visited.includes(i) ? 'visited' : ''}`}
              >
                <span>
                  {i === state.room ? (
                    <MapPin size={14} />
                  ) : state.visited.includes(i) ? (
                    <Check size={13} />
                  ) : (
                    i.toString().padStart(2, '0')
                  )}
                </span>
                <b>{state.visited.includes(i) ? r.title : '未知房间'}</b>
              </div>
            ))}
          </nav>
          <div className="rooms-note">
            房门连接着下一处空间。
            <br />
            点击物件，看看这里留下了什么。
          </div>
          <button
            className="rooms-restart"
            onClick={() => {
              setState(newRoomDemo());
              setFocus(null);
              setNotice('');
              setBag(false);
            }}
          >
            <RotateCcw size={13} />
            重新探索
          </button>
        </aside>
        <div className={`rooms-viewport ${reduced ? 'reduced' : ''}`}>
          <div key={state.room} className="rooms-scene-enter">
            <Suspense
              fallback={<div className="rooms-loading">房间正在显现…</div>}
            >
              <RoomScene
                state={state}
                focus={focus}
                reduced={reduced}
                onAnchors={onAnchors}
                onPick={pick}
              />
            </Suspense>
            <div className="rooms-hotspots">
              {anchors.map((a) => (
                <button
                  key={a.id}
                  className={`rooms-hotspot ${focus === a.id ? 'active' : ''} ${a.id.startsWith('valve') ? 'valve' : ''}`}
                  style={{ left: a.x, top: a.y }}
                  onClick={() => pick(a.id)}
                  aria-label={labels[a.id]}
                >
                  <span>
                    {a.id === 'exit' || a.id === 'back' ? (
                      <DoorOpen size={15} />
                    ) : a.id.startsWith('valve') ? (
                      <RotateCcw size={14} />
                    ) : (
                      <Plus size={15} />
                    )}
                  </span>
                  <b>{labels[a.id]}</b>
                </button>
              ))}
            </div>
          </div>
          <div className="rooms-coordinate">
            01F <span>/</span> {info.tag} <span>/</span>{' '}
            {state.room.toString().padStart(2, '0')}
          </div>
          {state.room === 2 && !state.repaired && (
            <div className="rooms-pressure">
              <span>管道连通</span>
              <div>
                {state.valves.map((v, i) => (
                  <i key={i} className={v ? 'connected' : ''} />
                ))}
              </div>
              <b>余量 {state.moves} 步</b>
            </div>
          )}
          {notice && (
            <output className="rooms-toast">
              <Check size={15} />
              {notice}
            </output>
          )}
          {focus && (
            <section className="rooms-inspect" aria-label="物件交互">
              <button
                className="rooms-close"
                aria-label="关闭物件详情"
                onClick={() => setFocus(null)}
              >
                <X size={18} />
              </button>
              <span className="rooms-eyebrow">
                {focus === 'pipes' ? 'FLOW CONTROL' : 'INTERACTION'}
              </span>
              <h2>{focus === 'pipes' ? '让管道朝向一致' : labels[focus]}</h2>
              {(focus === 'exit' || focus === 'back') && (
                <>
                  <p>
                    {focus === 'back' && state.room === 0
                      ? '电梯仍在这里等你。'
                      : focus === 'exit' && !canExit
                        ? '门锁受蒸汽压力控制。先恢复供压。'
                        : focus === 'exit' && state.room === 3 && !state.cleared
                          ? '守卫尚未击退。你仍可回到前面的房间。'
                          : '门后传来了另一种声音。'}
                  </p>
                  {focus === 'back' && state.room === 0 ? (
                    <button
                      className="rooms-primary"
                      disabled={!state.cleared}
                      onClick={() => act({ type: 'return' })}
                    >
                      返回电梯
                      <DoorOpen size={16} />
                    </button>
                  ) : (
                    <button
                      className="rooms-primary"
                      disabled={focus === 'exit' && !canExit}
                      onClick={() =>
                        travel(focus === 'back' ? state.room - 1 : next)
                      }
                    >
                      {focus === 'back' ? '返回上一间' : '穿过房门'}
                      <ArrowRight size={16} />
                    </button>
                  )}
                </>
              )}
              {focus === 'elevator' && (
                <>
                  <p>
                    {state.cleared
                      ? '封锁解除。把收获带回去。'
                      : '门一直开着，像是在等一个迟到的人。'}
                  </p>
                  <button
                    className="rooms-primary"
                    disabled={!state.cleared}
                    onClick={() => act({ type: 'return' })}
                  >
                    返回电梯
                    <ArrowRight size={16} />
                  </button>
                </>
              )}
              {focus === 'note' && (
                <p className="rooms-quote">
                  “如果里面传来你的声音，
                  <br />
                  不要回答。”
                </p>
              )}
              {focus === 'chest' && (
                <>
                  <p>
                    {state.searched
                      ? '只剩下旧布衬和两处空印。'
                      : '箱扣没有上锁。里面的东西还算完好。'}
                  </p>
                  <button
                    className="rooms-primary"
                    disabled={state.searched}
                    onClick={() => {
                      act({ type: 'search' });
                      setNotice('收好补漏胶与缓冲垫。后面也许用得上。');
                    }}
                  >
                    {state.searched ? '已收好' : '打开并收取'}
                    <Package size={16} />
                  </button>
                </>
              )}
              {focus === 'shelf' && (
                <p>胶罐干涸了。旁边压着一张早已作废的出勤表。</p>
              )}
              {(focus === 'console' || focus === 'pipes') && (
                <>
                  <p>
                    {state.repaired
                      ? '指针回到绿区。门后的蒸汽声停了。'
                      : '转动台面上的管道，把左侧入口连向右侧出口。'}
                  </p>
                  {!state.repaired && (
                    <>
                      <div className="rooms-toolrow">
                        <button
                          disabled={!state.glue || state.assisted}
                          onClick={() => {
                            act({ type: 'assist' });
                            setNotice('补漏胶封住漏口，增加 4 步操作余量。');
                          }}
                        >
                          使用补漏胶 <small>+4 步</small>
                        </button>
                        <button
                          onClick={() => act({ type: 'reset-pipes' })}
                          aria-label="重置管道"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                      <button
                        className="rooms-primary"
                        disabled={!state.valves.every(Boolean)}
                        onClick={() => {
                          act({ type: 'repair' });
                          setNotice(
                            '通道已开启。检修槽内发现一枚鉴定仪，已收进行囊。',
                          );
                        }}
                      >
                        恢复供压
                        <Check size={16} />
                      </button>
                    </>
                  )}
                  {state.repaired && (
                    <button
                      className="rooms-primary"
                      onClick={() => setBag(true)}
                    >
                      打开行囊
                      <Package size={16} />
                    </button>
                  )}
                </>
              )}
              {focus === 'battle' && (
                <>
                  <p>
                    {state.cleared
                      ? '装备台安静了。那个东西不再呼吸。'
                      : '中路的卷簧弩已经上弦。靠近装备台，布置你的防线。'}
                  </p>
                  {!state.cleared && (
                    <button
                      className="rooms-primary"
                      onClick={() => setBattle(true)}
                    >
                      接近装备台
                      <ArrowRight size={16} />
                    </button>
                  )}
                </>
              )}
              {focus === 'trophy' && (
                <>
                  <p>
                    {state.cleared
                      ? '卷簧弩已收入行囊。守卫留下的箱子里，只有发黄的账本。'
                      : '箱子被封住了，钥匙似乎在守卫那里。'}
                  </p>
                  {state.cleared && (
                    <button className="rooms-primary" onClick={() => travel(2)}>
                      带着收获离开
                      <ArrowLeft size={16} />
                    </button>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </section>
      <footer className="rooms-footer">
        <span>剖面探索试验 / 01</span>
        <span>独立 demo · 不读写冒险存档</span>
        <a href={sitePath('/art/slice')}>
          战斗切片 <ChevronRight size={13} />
        </a>
      </footer>
      {bag && (
        <div className="rooms-scrim">
          <dialog
            className="rooms-bag"
            aria-label="行囊"
            ref={(node) => {
              if (node && !node.open) node.showModal();
            }}
            onCancel={() => setBag(false)}
          >
            <button
              className="rooms-close"
              aria-label="关闭行囊"
              onClick={() => setBag(false)}
            >
              <X />
            </button>
            <span className="rooms-eyebrow">CARRIED OBJECTS</span>
            <h2>随身行囊</h2>
            {items.length ? (
              items.map((name) => (
                <div
                  className={`rooms-item ${name.includes('传说') ? 'legendary' : name.includes('稀有') ? 'rare' : ''}`}
                  key={name}
                >
                  <Package size={20} />
                  <span>{name}</span>
                  <b>×1</b>
                </div>
              ))
            ) : (
              <p>还没有带走任何东西。</p>
            )}
            {state.pad === 'item' && (
              <button
                className="rooms-primary"
                disabled={!state.scanner}
                onClick={() => {
                  act({ type: 'identify' });
                  setNotice('鉴定完成：皮质缓冲垫，可在装备台布阵。');
                }}
              >
                <ScanLine size={17} />
                {state.scanner ? '消耗鉴定仪 · 鉴定缓冲垫' : '尚未获得鉴定仪'}
              </button>
            )}
            <small>皮质缓冲垫可带入接下来的真实战斗。</small>
          </dialog>
        </div>
      )}
      {state.returned && (
        <div className="rooms-scrim">
          <dialog
            className="rooms-ending"
            aria-label="探索结束"
            ref={(node) => {
              if (node && !node.open) node.showModal();
            }}
            onCancel={(e) => e.preventDefault()}
          >
            <span className="rooms-eyebrow">BACK TO THE ELEVATOR</span>
            <h2>你回来了。</h2>
            <p>门缓缓合上，把那间房留在了外面。</p>
            <div>
              {items.map((name) => (
                <p key={name}>
                  <Check size={15} />
                  {name}
                </p>
              ))}
            </div>
            <button
              className="rooms-primary"
              onClick={() => {
                setState(newRoomDemo());
                setFocus(null);
                setNotice('');
              }}
            >
              再走一次
              <RotateCcw size={16} />
            </button>
          </dialog>
        </div>
      )}
    </main>
  );
}
