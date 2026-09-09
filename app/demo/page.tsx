'use client';
/* oxlint-disable react/react-compiler -- Event handlers read the authoritative run ref; mount effects restore explicitly local browser state. */
/* oxlint-disable next/no-html-link-for-pages -- Static Sites hosting needs native anchors; RSC-prefetch navigation is unsupported. */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowUp,
  ArrowRight,
  Heart,
  Zap,
  Package,
  Backpack,
  Shield,
  Sword,
  Scan,
  Flame,
  CloudRain,
  Wind,
  Snowflake,
  CloudFog,
  BedDouble,
  Wrench,
  Radio,
  Trophy,
  Users,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  BookOpen,
  DoorOpen,
  Search,
  Eye,
  Leaf,
  KeyRound,
  Store,
  Check,
  ChevronRight,
  Apple,
  Lightbulb,
  BatteryCharging,
  Box,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  newRun,
  act,
  validSave,
  SAVE_KEY,
  RARITY,
  QUALITY,
  WEATHER,
  FACILITY,
  itemName,
  volume,
  bagCap,
  safeCap,
  openCells,
  moduleUsed,
  currentFloor,
  currentNode,
  nodeName,
  weatherAt,
  layoutAt,
  searchCost,
  rescueCost,
  puzzle,
  playerCards,
  ranking,
} from '@/lib/demo-engine';
import type { Run, Action, Zone } from '@/lib/demo-engine';
import { simulateDuel, armorOf, targetText } from '@/lib/demo-combat';
import type { FighterCard, CombatFrame } from '@/lib/demo-combat';
import { cardDef, stat, MIRACLE } from '@/lib/prototype-v04';
import { terrainFor } from '@/lib/prototype-v03';
import './demo.css';
const ICONS: Record<string, LucideIcon> = {
  knife: Sword,
  wire: Zap,
  shelter: Shield,
  bottle: CloudRain,
  bell: Wind,
  brick: Flame,
  box: Box,
  cell: BatteryCharging,
  coil: Zap,
  battery: BatteryCharging,
  apple: Apple,
  lighter: Flame,
  scanner: Scan,
  material: Wrench,
  supply: Package,
  power: Zap,
  fuel: Flame,
  medicine: Heart,
  scrap: Wrench,
};
function Icon({ id, size = 26 }: { id: string; size?: number }) {
  const C = ICONS[id] ?? Box;
  return <C size={size} strokeWidth={1.35} />;
}
function WeatherIcon({ index }: { index: number }) {
  const C = [CloudRain, Snowflake, CloudFog, Flame][index];
  return <C size={20} />;
}
const zoneName: Record<Zone, string> = {
  bag: '随身背包',
  safe: '安全容器',
  warehouse: '基地仓库',
  board: '上阵卡组',
};
const phaseName: Record<string, string> = {
  intro: '等待接入',
  base: '电梯基地',
  floor: '楼层探索',
  combat: '自动战斗',
  ended: '协议结算',
};
export default function Demo() {
  const [run, setRun] = useState<Run>(() => newRun(10909)),
    ref = useRef(run);
  const [ready, setReady] = useState(false),
    [saved, setSaved] = useState('正在读取本机存档'),
    [notice, setNotice] = useState(''),
    [tab, setTab] = useState('base'),
    [selected, setSelected] = useState<string | null>(null),
    [help, setHelp] = useState(false),
    [reset, setReset] = useState(false);
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(true),
    [speed, setSpeed] = useState(2),
    [enemyDetail, setEnemyDetail] = useState<FighterCard | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const commit = useCallback((next: Run) => {
    ref.current = next;
    setRun(next);
    setNotice(next.notice);
  }, []);
  const dispatch = useCallback(
    (a: Action) => {
      try {
        const next = act(ref.current, a);
        commit(next);
        if (a.type === 'enter') setTab('floor');
        if (a.type === 'begin') setTab('base');
        if (a.type === 'extract' || a.type === 'rescue' || a.type === 'sleep')
          setTab('base');
        if (a.type === 'resolve')
          setTab(next.phase === 'base' ? 'base' : 'floor');
        if (a.type === 'fight') {
          setCursor(0);
          setPlaying(true);
          setEnemyDetail(null);
        }
        return next;
      } catch (e) {
        setNotice(e instanceof Error ? e.message : '操作失败');
        return null;
      }
    },
    [commit],
  );
  // oxlint-disable-next-line react/react-compiler -- Restore explicitly device-local game state after hydration.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (validSave(parsed)) {
          commit(parsed);
          setTab(parsed.phase === 'floor' ? 'floor' : 'base');
        } else
          setNotice('存档格式无法识别，已保留原文件。可以导入备份或重新开局。');
      } else commit(newRun(crypto.getRandomValues(new Uint32Array(1))[0]));
    } catch {
      setSaved('本机存档不可用，请导出备份');
    }
    setReady(true);
  }, [commit]);
  // oxlint-disable-next-line react/react-compiler -- Persist this device-local run and report storage failures.
  useEffect(() => {
    if (!ready || run.phase === 'intro') return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(run));
      setSaved('本机自动保存');
    } catch {
      setSaved('保存失败 · 请立即导出备份');
    }
  }, [run, ready]);
  const battle = useMemo(
    () => (run.duel ? simulateDuel(run.duel) : null),
    [run.duel],
  );
  useEffect(() => {
    if (!battle || !playing || cursor >= battle.frames.length - 1) return;
    const timer = setTimeout(() => setCursor((c) => c + 1), 250 / speed);
    return () => clearTimeout(timer);
  }, [battle, playing, cursor, speed]);
  const frame = battle?.frames[Math.min(cursor, battle.frames.length - 1)];
  const viewed = run.items.find((x) => x.uid === selected);
  const f = currentFloor(run),
    w = weatherAt(run),
    terrain = terrainFor(w, layoutAt(run));
  const resetRun = () => {
    commit(newRun(crypto.getRandomValues(new Uint32Array(1))[0]));
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    setTab('base');
    setSelected(null);
    setReset(false);
  };
  function exportRun() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `f9-demo1-day${run.day}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importRun(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2000000) throw Error('存档文件过大');
      const value: unknown = JSON.parse(await file.text());
      if (!validSave(value)) throw Error('存档不兼容或内容损坏');
      commit(value);
      setTab(value.phase === 'floor' ? 'floor' : 'base');
      setCursor(0);
      setPlaying(true);
      setSelected(null);
      setNotice('已恢复导入的本机存档。');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '导入失败');
    }
    if (fileRef.current) fileRef.current.value = '';
  }
  function cardGrid(cards: FighterCard[], enemy = false, fr?: CombatFrame) {
    const locked = enemy
      ? []
      : Array.from({ length: 9 }, (_, i) => i).filter(
          (i) => !openCells(run).includes(i),
        );
    return (
      <div className={'ed-board ' + (enemy ? 'enemy' : '')}>
        {[0, 1, 2].map((lane) => (
          <div className="ed-lane" key={lane}>
            <div className="ed-lane-label">
              <b>{['上路', '中路', '下路'][lane]}</b>
              <span>{terrain[lane]}</span>
            </div>
            <div className="ed-lane-cells">
              {[0, 1, 2].map((col) => {
                const at = lane * 3 + col;
                const card = cards.find((x) => x.at === at);
                if (
                  cards.some((x) => x.at < at && x.at + cardDef(x.id).size > at)
                )
                  return null;
                if (!card)
                  return (
                    <button
                      key={at}
                      style={{ gridColumn: col + 1 }}
                      className={
                        'ed-slot ' + (locked.includes(at) ? 'locked' : '')
                      }
                      disabled={!!fr || enemy || locked.includes(at)}
                      onClick={() =>
                        viewed?.type === 'card'
                          ? dispatch({
                              type: 'move',
                              id: viewed.uid,
                              to: 'board',
                              at,
                            })
                          : setNotice('先在容器里选择一张卡牌，再点击目标格。')
                      }
                      aria-label={`${['上', '中', '下'][lane]}路第${col + 1}格${locked.includes(at) ? '未解锁' : '，放置所选卡牌'}`}
                    >
                      {locked.includes(at) ? (
                        <KeyRound size={15} />
                      ) : (
                        <span>
                          ＋<small>{at + 1}</small>
                        </span>
                      )}
                    </button>
                  );
                const c = cardDef(card.id),
                  side = enemy ? 1 : 0;
                return (
                  <button
                    key={card.uid}
                    className={
                      'ed-card rarity-' +
                      card.rarity +
                      (selected === card.uid ? ' selected' : '') +
                      (fr?.fired.includes(card.uid) ? ' firing' : '') +
                      (fr?.hits.some((hit) => hit.targetUid === card.uid)
                        ? ' struck'
                        : '')
                    }
                    style={{ gridColumn: `${col + 1} / span ${c.size}` }}
                    onClick={() =>
                      enemy
                        ? setEnemyDetail(card)
                        : (setSelected(card.uid),
                          setEnemyDetail(null),
                          !fr && setTab('inventory'))
                    }
                    aria-label={`查看${c.name}`}
                  >
                    <span className="ed-card-meta">
                      {RARITY[card.rarity].name} <i>{c.size} 格</i>
                    </span>
                    <Icon id={card.id} />
                    <strong>{c.name}</strong>
                    <small>
                      {QUALITY[card.quality]} · Lv.{card.level} · {c.cd}s
                    </small>
                    <span className="ed-card-armor">
                      <Shield size={10} />
                      护甲 {armorOf(card)}
                      {card.id === 'coil' && <em>越线后排</em>}
                    </span>
                    <div className="ed-card-power">
                      {c.kind === 'charge'
                        ? '充能'
                        : c.kind === 'damage'
                          ? '伤害'
                          : c.kind === 'heal'
                            ? '治疗'
                            : '护盾'}{' '}
                      <b>{stat(card.id, card.rarity, card.level)}</b>
                      {c.energyCost > 0 && <em> / {c.energyCost}能</em>}
                    </div>
                    {fr && (
                      <>
                        <Progress
                          value={Math.min(
                            100,
                            (fr.timers[side][card.at] /
                              (fr.cd[side][card.at] || 1)) *
                              100,
                          )}
                          aria-label={`${c.name}冷却进度`}
                          className="ed-cooldown"
                        />
                        {fr.waiting.includes(card.uid) && (
                          <span className="ed-wait">等待能量</span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }
  function actor(side: number, fr: CombatFrame) {
    return (
      <div className={'ed-actor ' + (side ? 'enemy' : '')}>
        <div className="ed-avatar">
          <span>{side ? '◈' : '◉'}</span>
          <small>{side ? 'SUBJECT' : 'YOU'}</small>
        </div>
        <div className="ed-actor-info">
          <div>
            <strong>{side ? run.duel!.name : '幸存者 #000 · 你'}</strong>
            <b>
              {Math.ceil(fr.hp[side])}
              <small> / {run.duel!.maxHp[side]}</small>
            </b>
          </div>
          <Progress
            value={(fr.hp[side] / run.duel!.maxHp[side]) * 100}
            aria-label={`${side ? '敌方' : '我方'}生命`}
            className="ed-hp"
          />
          <p>
            <Shield size={13} /> {Math.ceil(fr.shield[side])} 护盾{' '}
            <Zap size={13} /> {fr.energy[side]} 能量
          </p>
        </div>
        <div className="ed-floats" aria-hidden="true">
          {(
            battle?.frames
              .slice(Math.max(0, cursor - 6), cursor + 1)
              .flatMap((snapshot) =>
                snapshot.hits.map((hit, index) => ({
                  ...hit,
                  stamp: snapshot.time,
                  index,
                })),
              ) ?? []
          )
            .filter((x) => x.side === side)
            .map((hit) => (
              <span
                key={`${hit.stamp}-${hit.index}`}
                className={'ed-float ' + hit.kind}
                style={{
                  left: `${18 + ((hit.stamp * 68 + hit.index * 29) % 65)}%`,
                  top: `${15 + ((hit.stamp * 44 + hit.index * 23) % 48)}%`,
                }}
              >
                {hit.kind === 'damage' ? '−' : '+'}
                {Math.round((hit.healthLoss ?? hit.value) * 10) / 10}
                <small>
                  {hit.kind === 'shield'
                    ? '盾'
                    : hit.kind === 'energy'
                      ? '能'
                      : hit.kind === 'heal'
                        ? '治疗'
                        : hit.kind === 'damage' && hit.healthLoss === 0
                          ? '盾吸收'
                          : ''}
                </small>
              </span>
            ))}
        </div>
      </div>
    );
  }
  function inventory() {
    return (
      <>
        <div className="ed-section-title">
          <div>
            <p className="ed-kicker">INVENTORY / ONE CONNECTED SYSTEM</p>
            <h2>随身的一切</h2>
          </div>
          <p>
            选择物品查看详情，再点击空格布阵。
            <br />
            我方每路从右到左：前排 →
            后排。卡牌无血量，受击经护甲减伤后传给宿主。
          </p>
        </div>
        <div className="ed-inventory-layout">
          <div>
            <div className="ed-panel">
              <div className="ed-panel-title">
                <h3>上阵卡组</h3>
                <span>
                  {volume(run.items.filter((x) => x.zone === 'board'))} /{' '}
                  {openCells(run).length} 格
                </span>
              </div>
              {cardGrid(playerCards(run))}
            </div>
            {(['bag', 'safe', 'warehouse'] as Zone[]).map((zone) => (
              <section className="ed-panel" key={zone}>
                <div className="ed-panel-title">
                  <h3>{zoneName[zone]}</h3>
                  <span>
                    {zone === 'warehouse'
                      ? run.phase === 'base'
                        ? '基地内可用'
                        : '当前不可访问'
                      : `${volume(run.items.filter((x) => x.zone === zone))} / ${zone === 'bag' ? bagCap(run) : safeCap(run)} 容积`}
                  </span>
                </div>
                <div className="ed-cargo">
                  {run.items
                    .filter((x) => x.zone === zone)
                    .map((x) => (
                      <button
                        key={x.uid}
                        className={
                          'ed-cargo-item ' +
                          (selected === x.uid ? 'selected' : '') +
                          (x.type === 'card' ? ' rarity-' + x.rarity : '')
                        }
                        onClick={() => setSelected(x.uid)}
                      >
                        <Icon id={x.id} />
                        <div>
                          <strong>{itemName(x)}</strong>
                          <small>
                            {x.type === 'card'
                              ? RARITY[x.rarity!].name
                              : x.type === 'physical'
                                ? '实体 · 未鉴定'
                                : x.type === 'resource'
                                  ? `资源 ×${x.amount}`
                                  : '工具'}{' '}
                            · {x.volume} 容积
                          </small>
                        </div>
                      </button>
                    ))}
                  {!run.items.some((x) => x.zone === zone) && (
                    <p className="ed-empty">容器为空</p>
                  )}
                </div>
              </section>
            ))}
          </div>
          <aside className="ed-item-detail ed-panel">
            {viewed ? (
              <>
                <p className="ed-kicker">OBJECT INSPECTION</p>
                <div className="ed-inspection-art">
                  <Icon id={viewed.id} size={68} />
                </div>
                <h2>{itemName(viewed)}</h2>
                <p>
                  {zoneName[viewed.zone]} / {viewed.volume} 容积
                </p>
                {viewed.type === 'physical' ? (
                  <>
                    <p>
                      尚未鉴定的实体。检测前不存在稀有度，鉴定后保持原有占用体积。
                    </p>
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'scan', id: viewed.uid })}
                    >
                      <Scan size={16} />
                      {run.phase === 'base'
                        ? '终端免费鉴定'
                        : '便携鉴定 · 1 电荷'}
                    </button>
                  </>
                ) : viewed.type === 'card' ? (
                  <>
                    <div className={'ed-rarity rarity-' + viewed.rarity}>
                      {RARITY[viewed.rarity!].name} · {QUALITY[viewed.quality]}{' '}
                      · Lv.{viewed.level}
                    </div>
                    <p>{cardDef(viewed.id).effect}</p>
                    <p className="ed-target-rule">{targetText(viewed.id)}</p>
                    <p>
                      卡牌护甲 <b>{armorOf(viewed)}</b> · 减伤{' '}
                      {Math.round(
                        (armorOf(viewed) / (100 + armorOf(viewed))) * 100,
                      )}
                      %<br />
                      <small>
                        护甲 = 基础护甲 + 品质阶数 × 5 + 成长等级 ×
                        2。卡牌不会被摧毁。
                      </small>
                    </p>
                    <small>
                      条件附加效果由精制解锁；发电、能量消耗与选敌规则从基础品质生效。大师：
                      {cardDef(viewed.id).master}
                    </small>
                    {viewed.rarity === 4 && (
                      <p className="ed-gold">{MIRACLE}</p>
                    )}
                    <p>
                      基础主效果{' '}
                      <b>{stat(viewed.id, viewed.rarity!, viewed.level)}</b> /
                      每 {cardDef(viewed.id).cd} 秒
                    </p>
                    <div className="ed-actions">
                      <button
                        disabled={run.phase !== 'base' || viewed.level >= 5}
                        onClick={() =>
                          dispatch({ type: 'grow', id: viewed.uid })
                        }
                      >
                        成长 +1 · {3 + viewed.level * 2} 材料
                      </button>
                      <button
                        disabled={run.phase !== 'base' || viewed.quality >= 2}
                        onClick={() =>
                          dispatch({ type: 'refine', id: viewed.uid })
                        }
                      >
                        提升品质 · {5 + viewed.quality * 4} 材料
                      </button>
                    </div>
                    <p className="ed-hint">
                      移动整张卡：选中后点击目标空格。不跨路，不自动挤走其他卡。
                    </p>
                  </>
                ) : (
                  <p>
                    {viewed.id === 'apple'
                      ? '食用恢复 25 精力。'
                      : viewed.id === 'lighter'
                        ? '异象节点可消耗打火机绕开风险并恢复精力。'
                        : viewed.id === 'scanner'
                          ? `携带时可在楼层鉴定实体；剩余 ${run.charges} 电荷，回基地设备台充能。`
                          : '撤离后自动交付基地。燃料超过库存上限时保留在容器中。'}
                  </p>
                )}
                {viewed.id === 'apple' && (
                  <button
                    className="ed-primary"
                    onClick={() =>
                      dispatch({ type: 'consume', id: viewed.uid })
                    }
                  >
                    吃掉苹果
                  </button>
                )}
                <div className="ed-actions">
                  {(['bag', 'safe', 'warehouse'] as Zone[])
                    .filter((z) => z !== viewed.zone)
                    .map((z) => (
                      <button
                        key={z}
                        disabled={
                          run.phase !== 'base' &&
                          (z === 'warehouse' || viewed.zone === 'warehouse')
                        }
                        onClick={() =>
                          dispatch({ type: 'move', id: viewed.uid, to: z })
                        }
                      >
                        移至{zoneName[z]}
                      </button>
                    ))}
                  {viewed.zone !== 'board' && (
                    <button
                      className="ed-danger"
                      onClick={() =>
                        dispatch({
                          type: run.phase === 'base' ? 'recycle' : 'drop',
                          id: viewed.uid,
                        })
                      }
                    >
                      {run.phase === 'base' ? '分解为材料' : '留在本层'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="ed-empty">
                <Eye size={36} />
                <h3>查看一件物品</h3>
                <p>
                  点击卡牌、实体或工具，
                  <br />
                  在这里管理它的位置与成长。
                </p>
              </div>
            )}
          </aside>
        </div>
        {run.phase === 'floor' && f.searched && loot()}
      </>
    );
  }
  function loot() {
    return (
      <section className="ed-panel">
        <div className="ed-panel-title">
          <h3>本层剩余物资</h3>
          <span>{f.stock.length} 件 · 共享状态保留</span>
        </div>
        <div className="ed-loot">
          {f.stock.map((x) => (
            <div className="ed-loot-item" key={x.uid}>
              <Icon id={x.id} />
              <div>
                <b>{itemName(x)}</b>
                <small>
                  {x.type === 'physical'
                    ? '未鉴定实体'
                    : x.type === 'card'
                      ? RARITY[x.rarity!].name
                      : x.type === 'resource'
                        ? `资源 ×${x.amount}`
                        : '工具'}{' '}
                  / {x.volume} 容积
                </small>
              </div>
              <button onClick={() => dispatch({ type: 'pickup', id: x.uid })}>
                拾取
              </button>
            </div>
          ))}
          {!f.stock.length && (
            <p className="ed-empty">这里已被搜刮一空，主目标仍可挑战。</p>
          )}
        </div>
        <p className="ed-hint">带不走时，可先将卡牌上阵，或放入安全容器。</p>
      </section>
    );
  }
  function base() {
    return (
      <>
        <section className="ed-base-hero">
          <div className="ed-cabin">
            <div className="ed-cabin-screen">
              <small>TERMINAL CONNECTED</small>
              <b>↑ {String(run.floor).padStart(2, '0')}</b>
              <span>生命维持 / {run.quota} 配额</span>
            </div>
            <div className="ed-bed">
              <BedDouble size={50} />
              <small>你的床</small>
            </div>
            <div className="ed-table">
              <Lightbulb size={34} />
              <span>鉴定终端 · 免费使用</span>
            </div>
            <div className="ed-delivery">▰ 送物口</div>
          </div>
          <div className="ed-base-copy">
            <p className="ed-kicker">YOUR ONLY SAFE ROOM</p>
            <h1>
              一部电梯。
              <br />
              一个尚存的世界。
            </h1>
            <p>
              门外的世界每层都不同。这里是你唯一能睡下、重建，并为下一次出发准备的地方。
            </p>
            <div className="ed-actions">
              <button
                className="ed-primary"
                disabled={run.used}
                onClick={() => setTab('map')}
              >
                <ArrowUp size={18} />
                选择楼层
              </button>
              <button onClick={() => dispatch({ type: 'sleep' })}>
                <BedDouble size={18} />
                睡到明天 · −1 配额
              </button>
            </div>
            <small>
              {run.used ? '今日已出勤，睡眠后可再次出发。' : '今日尚未出勤。'}
              有补给恢复 50 精力，无补给恢复 15。
            </small>
          </div>
        </section>
        <div className="ed-base-grid">
          <section className="ed-panel">
            <div className="ed-panel-title">
              <h3>电梯改造 / Lv.{run.level}</h3>
              <span>
                模块 {moduleUsed(run)} / {run.moduleCap}
              </span>
            </div>
            <div className="ed-module-plan">
              <div style={{ gridColumn: 'span 2' }}>
                <BedDouble />
                固定床位 · 2 槽
              </div>
              {run.installed.map((id) => {
                const f = FACILITY.find((x) => x.id === id)!;
                return (
                  <div key={id} style={{ gridColumn: `span ${f.slots}` }}>
                    <Wrench />
                    {f.name}
                  </div>
                );
              })}
              {Array.from(
                { length: run.moduleCap - moduleUsed(run) },
                (_, i) => (
                  <div className="empty" key={i}>
                    空槽
                  </div>
                ),
              )}
            </div>
            <div className="ed-actions">
              <button
                disabled={run.moduleCap >= 10}
                onClick={() => dispatch({ type: 'expand' })}
              >
                扩建 +2 槽 · 6 材料
              </button>
              <button
                disabled={run.level >= 6}
                onClick={() => dispatch({ type: 'upgrade' })}
              >
                电梯升级 · {5 + run.level} 材料
              </button>
            </div>
            <p className="ed-hint">
              升级解锁战斗格；Lv.3 / Lv.5 同步扩充背包与安全容器。终端不占槽位。
            </p>
          </section>
          <section className="ed-panel">
            <p className="ed-kicker">PREPARATION</p>
            <h3>下一次出发</h3>
            <div className="ed-prep">
              <span>
                上阵 <b>{playerCards(run).length} 张卡</b>
              </span>
              <span>
                背包{' '}
                <b>
                  {volume(run.items.filter((x) => x.zone === 'bag'))} /{' '}
                  {bagCap(run)}
                </b>
              </span>
              <span>
                鉴定电荷 <b>{run.charges} / 4</b>
              </span>
              <span>
                地形适应 <b>{run.adapted ? '已准备' : '未准备'}</b>
              </span>
            </div>
            <div className="ed-actions">
              <button onClick={() => setTab('inventory')}>
                <Backpack size={17} />
                整理行装
              </button>
              <button onClick={() => dispatch({ type: 'deposit' })}>
                交付资源
              </button>
              {!run.items.some((x) => x.id === 'scanner') && (
                <button onClick={() => dispatch({ type: 'craft-scanner' })}>
                  重制鉴定仪 · 4 材料 / 2 电力
                </button>
              )}
            </div>
            {run.forecast && (
              <p className="ed-forecast">
                <Radio size={18} />
                明天天气：
                {
                  WEATHER[
                    weatherAt(
                      run,
                      Math.min(10, Math.max(1, run.floor + 1)),
                      run.day + 1,
                    )
                  ].name
                }
                。
                {
                  WEATHER[
                    weatherAt(
                      run,
                      Math.min(10, Math.max(1, run.floor + 1)),
                      run.day + 1,
                    )
                  ].explore
                }
                各楼层的具体预报见楼层选择。
              </p>
            )}
          </section>
        </div>
        <div className="ed-section-title">
          <h2>把庇护所建起来</h2>
          <span>每设施每日一次 · 拆除保留当日使用记录</span>
        </div>
        <div className="ed-facilities">
          {FACILITY.map((f) => {
            const built = run.installed.includes(f.id),
              used = run.facilityUsed.includes(f.id);
            return (
              <section
                className={'ed-panel ' + (built ? 'built' : '')}
                key={f.id}
              >
                <div className="ed-panel-title">
                  <h3>{f.name}</h3>
                  <small>{f.slots} 槽</small>
                </div>
                <p>{f.desc}</p>
                <div className="ed-actions">
                  {built ? (
                    <>
                      <button
                        className={used ? '' : 'ed-primary'}
                        disabled={used}
                        onClick={() => dispatch({ type: 'facility', id: f.id })}
                      >
                        {used ? <Check size={15} /> : <Wrench size={15} />}{' '}
                        {used ? '今日已完成' : '使用设施'}
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'remove', id: f.id })}
                      >
                        拆除 +{Math.floor(f.cost / 2)}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => dispatch({ type: 'build', id: f.id })}
                    >
                      建造 · {f.cost} 材料
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </>
    );
  }
  function map() {
    return (
      <>
        <div className="ed-section-title">
          <div>
            <p className="ed-kicker">THE ONLY DIRECTION IS UP</p>
            <h2>电梯通往哪里？</h2>
          </div>
          <p>
            每次只允许出勤一次。可跳层，不能下降。
            <br />
            Demo 1.0 开放十层；第十层通关撤离即完成本局。
          </p>
        </div>
        <div className="ed-floor-map">
          {run.floors.map((fl) => {
            const locked = fl.id < run.floor,
              weather = weatherAt(run, fl.id),
              forecast = weatherAt(run, fl.id, run.day + 1);
            return (
              <button
                key={fl.id}
                disabled={locked || run.used}
                className={
                  'ed-floor-tile ' +
                  (run.clears.includes(fl.id) ? 'cleared' : '')
                }
                onClick={() => dispatch({ type: 'enter', floor: fl.id })}
              >
                <span className="ed-floor-number">
                  {String(fl.id).padStart(2, '0')}
                  <small>FLOOR</small>
                </span>
                <div>
                  <h3>{fl.name}</h3>
                  <p>{fl.detail}</p>
                  <div className="ed-tags">
                    <span>
                      <WeatherIcon index={weather} />
                      {WEATHER[weather].name}
                    </span>
                    <span>物资 {fl.stock.length}</span>
                    <span>挑战 {16 + fl.id * 5}</span>
                    {fl.visitors.length > 0 && (
                      <span>已有 {fl.visitors.length} 人触达</span>
                    )}
                  </div>
                  {run.forecast && (
                    <small>
                      明日：{WEATHER[forecast].name} /{' '}
                      {WEATHER[forecast].explore}
                    </small>
                  )}
                </div>
                <span className="ed-floor-enter">
                  {locked
                    ? '无法下降'
                    : run.clears.includes(fl.id)
                      ? '已通关'
                      : run.used
                        ? '明日可出发'
                        : '进入 →'}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  }
  function floor() {
    const node = currentNode(run);
    return (
      <>
        <section className={'ed-floor-scene scene-' + (run.floor % 4)}>
          <div className="ed-orbit" aria-hidden="true">
            <div />
            <span>0{run.floor}</span>
          </div>
          <div className="ed-scene-copy">
            <p className="ed-kicker">
              FLOOR {String(run.floor).padStart(2, '0')} / UNKNOWN WORLD
            </p>
            <h1>{f.name}</h1>
            <p>{f.detail}</p>
            <div className="ed-tags">
              <span>
                <WeatherIcon index={w} />
                {WEATHER[w].name}
              </span>
              <span>存留物资 {f.stock.length}</span>
              <span>{run.objective ? '主目标已完成' : '尚未提交通关'}</span>
            </div>
          </div>
        </section>
        <div className="ed-route">
          {[...f.nodes, 'exit'].map((n, i) => (
            <div
              key={i}
              className={i === run.node ? 'active' : i < run.node ? 'done' : ''}
            >
              <b>{i < run.node ? '✓' : String(i + 1).padStart(2, '0')}</b>
              <span>{nodeName[n]}</span>
            </div>
          ))}
        </div>
        <div className="ed-explore-grid">
          <section className="ed-panel ed-node">
            <p className="ed-kicker">
              {String(run.node + 1).padStart(2, '0')} /{' '}
              {node === 'guardian' && run.encounter && !run.encounterDone
                ? 'CONTACT DETECTED'
                : 'EXPLORATION'}
            </p>
            <h2>{nodeName[node]}</h2>
            {node === 'event' ? (
              <>
                <p>
                  走廊里，一群没有面孔的人正倒着走。他们让你用一点火光交换前路。
                </p>
                <div className="ed-actions">
                  <button
                    className="ed-primary"
                    onClick={() => dispatch({ type: 'event', choice: 0 })}
                  >
                    绕过人群 · 6 精力
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'event', choice: 1 })}
                  >
                    消耗打火机 · 恢复 8 精力
                  </button>
                </div>
              </>
            ) : node === 'search' ? (
              <>
                <p>
                  柜子里传来细小的回声。天气正在改变你的搜索消耗。
                  {WEATHER[w].name}下本次搜索需 {searchCost(run)} 精力。
                </p>
                <div className="ed-actions">
                  <button
                    className="ed-primary"
                    onClick={() => dispatch({ type: 'search' })}
                  >
                    <Search size={17} />
                    搜查区域
                  </button>
                  <button onClick={() => dispatch({ type: 'skip' })}>
                    跳过搜索
                  </button>
                </div>
              </>
            ) : node === 'puzzle' ? (
              <>
                <p>{puzzle(run).text}</p>
                <p className="ed-hint">
                  每次尝试消耗 4 精力。提示：相邻两个数字的差相同。
                </p>
                <div className="ed-actions">
                  {puzzle(run).options.map((n) => (
                    <button
                      key={n}
                      onClick={() => dispatch({ type: 'puzzle', choice: n })}
                    >
                      输入 {n}
                    </button>
                  ))}
                </div>
              </>
            ) : node === 'merchant' ? (
              <>
                <p>
                  游商把面具摘下，下面还是同一张面具。他愿意用一件未鉴定异物，交换
                  4 份机械组件。
                </p>
                <div className="ed-actions">
                  <button
                    className="ed-primary"
                    disabled={f.tradeSold}
                    onClick={() => dispatch({ type: 'trade' })}
                  >
                    <Store size={17} />
                    {f.tradeSold ? '本层交易已售罄' : '交易 · 4 材料'}
                  </button>
                  <button onClick={() => dispatch({ type: 'skip' })}>
                    离开商人
                  </button>
                </div>
              </>
            ) : node === 'guardian' ? (
              <>
                <p>
                  {run.encounter && !run.encounterDone
                    ? `幸存者 #${run.encounter} 也在本层。进入封锁对决后不能撤离，败者被强制回收，胜者继续挑战守卫。`
                    : '守门人等在出口前。检查你的卡牌位置，天气地形也会作用于敌方。'}
                </p>
                <div className="ed-actions">
                  <button
                    className="ed-primary"
                    onClick={() => dispatch({ type: 'fight' })}
                  >
                    <Sword size={17} />
                    开始
                    {run.encounter && !run.encounterDone
                      ? '封锁对决'
                      : '守卫战'}
                  </button>
                  <button onClick={() => setTab('inventory')}>调整构筑</button>
                </div>
              </>
            ) : (
              <>
                <p>门终于打开了。现在撤回电梯，带走物资并提交本层记录。</p>
                <button
                  className="ed-primary"
                  onClick={() => dispatch({ type: 'extract' })}
                >
                  <DoorOpen size={17} />
                  带着战利品撤离 · 8 精力
                </button>
              </>
            )}
          </section>
          <aside className="ed-panel">
            <h3>退路仍然亮着</h3>
            <p>正常撤离需 8 精力，保留所有物品。提前离开不会记录本层通关。</p>
            <div className="ed-actions vertical">
              <button onClick={() => dispatch({ type: 'extract' })}>
                <DoorOpen size={17} />
                现在撤离
              </button>
              <button onClick={() => setTab('inventory')}>
                <Backpack size={17} />
                整理背包 / 吃苹果
              </button>
              <button
                className="ed-danger"
                onClick={() => dispatch({ type: 'rescue' })}
              >
                紧急回收 · −{rescueCost(run)} 配额
              </button>
            </div>
            <p className="ed-hint">
              回收会丢失普通背包；安全格和上阵卡组保留。
            </p>
          </aside>
        </div>
        {f.searched && loot()}
        {f.history.length > 0 && (
          <details className="ed-panel">
            <summary>其他幸存者留下的痕迹</summary>
            {f.history.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </details>
        )}
      </>
    );
  }
  function combat() {
    if (!battle || !frame || !run.duel) return null;
    const finished = cursor >= battle.frames.length - 1;
    return (
      <section className="ed-combat">
        <div className="ed-section-title">
          <div>
            <p className="ed-kicker">
              {run.duel.kind === 'survivor'
                ? 'SEALED ENCOUNTER'
                : 'FLOOR GUARDIAN'}
            </p>
            <h2>
              {run.duel.kind === 'survivor' ? '只能有一人继续' : '门后的守卫'}
            </h2>
          </div>
          <span>
            <WeatherIcon index={w} /> {WEATHER[w].name} ·{' '}
            {frame.time.toFixed(2)}s
          </span>
        </div>
        <section
          className="ed-battle-scroll"
          aria-label="左右对战棋盘，可横向滚动"
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to focus this horizontal scroll region.
          tabIndex={0}
        >
          <div className="ed-horizontal-battle">
            {actor(0, frame)}
            <div className="ed-battle-half">
              <div className="ed-facing">我方 · 后排 → 前排</div>
              {cardGrid(run.duel.player, false, frame)}
            </div>
            <div className="ed-lane-bridge">
              <div className="ed-facing">
                {frame.time >= 40 ? '坍缩' : '交锋'}
              </div>
              {[0, 1, 2].map((lane) => (
                <div key={lane}>
                  <b>{['上路', '中路', '下路'][lane]}</b>
                  <span>↔</span>
                  <small>{terrain[lane]}</small>
                </div>
              ))}
            </div>
            <div className="ed-battle-half">
              <div className="ed-facing">敌方 · 前排 → 后排</div>
              {cardGrid(run.duel.enemy, true, frame)}
            </div>
            {actor(1, frame)}
          </div>
        </section>
        <div className="ed-battle-controls">
          <button onClick={() => setPlaying((x) => !x)}>
            {playing ? <Pause size={16} /> : <Play size={16} />}{' '}
            {playing ? '暂停' : '播放'}
          </button>
          <button
            onClick={() => setSpeed((x) => (x === 1 ? 2 : x === 2 ? 4 : 1))}
          >
            {speed}× 速度
          </button>
          <button onClick={() => setCursor(battle.frames.length - 1)}>
            跳至结果
          </button>
          <span>
            双方前排朝中央 · 命中卡牌 → 护甲 → 宿主护盾 / 生命 · 空路直击
          </span>
        </div>
        {(enemyDetail || viewed) && (
          <div className="ed-panel ed-battle-inspect">
            <strong>{cardDef((enemyDetail ?? viewed)!.id).name}</strong>
            <p>{cardDef((enemyDetail ?? viewed)!.id).effect}</p>
            <p>
              {targetText((enemyDetail ?? viewed)!.id)} 护甲{' '}
              {armorOf((enemyDetail ?? viewed)!)}。
            </p>
            <small>{cardDef((enemyDetail ?? viewed)!.id).master}</small>
          </div>
        )}
        <div className="ed-combat-log">
          {battle.frames
            .slice(Math.max(0, cursor - 12), cursor + 1)
            .flatMap((fr) => [
              ...fr.hits.map((h) =>
                h.targetName
                  ? `${fr.time.toFixed(1)}s · ${h.source} → ${h.targetName}：${h.raw} 原伤 / ${h.armor} 护甲 → 传递 ${h.value}；宿主盾吸收 ${Math.round((h.shieldAbsorbed ?? 0) * 10) / 10} / 生命 −${Math.round((h.healthLoss ?? 0) * 10) / 10}`
                  : `${fr.time.toFixed(1)}s · ${h.source} → ${h.side ? '敌方' : '我方'} ${h.kind === 'damage' ? '伤害' : h.kind === 'heal' ? '治疗' : h.kind === 'shield' ? '护盾' : '能量'} ${Math.round(h.value * 10) / 10}`,
              ),
              ...fr.log,
            ])
            .slice(-6)
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
        {finished && (
          <section
            className={'ed-battle-result ' + (battle.winner === 0 ? 'won' : '')}
          >
            <Trophy size={30} />
            <div>
              <h2>
                {battle.winner === 0
                  ? '你还活着。'
                  : battle.winner === -1
                    ? '同归于尽。'
                    : '电梯启动了回收。'}
              </h2>
              <p>
                {battle.winner === 0
                  ? '确认结算，继续楼层旅程。'
                  : `本次回收消耗 ${rescueCost(run)} 配额，普通背包丢失。`}
              </p>
            </div>
            <button
              className="ed-primary"
              onClick={() => dispatch({ type: 'resolve' })}
            >
              确认结果 <ArrowRight size={17} />
            </button>
            <button
              onClick={() => {
                setCursor(0);
                setPlaying(true);
              }}
            >
              重播
            </button>
          </section>
        )}
      </section>
    );
  }
  function survivors() {
    const rows = ranking(run);
    return (
      <>
        <div className="ed-section-title">
          <div>
            <p className="ed-kicker">100 ELEVATORS / ONE PROTOCOL</p>
            <h2>还亮着的屏幕</h2>
          </div>
          <p>
            {run.bots.filter((b) => b.alive).length + (run.quota > 0 ? 1 : 0)}{' '}
            人存活 · 按已通关最高楼层排名，同层并列。
            <br />
            机器人每日选择 1–2 层进度，并按构筑与挑战强度结算。
          </p>
        </div>
        <div className="ed-table-wrap">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>幸存者</th>
                <th>最高通关</th>
                <th>已抵达</th>
                <th>配额</th>
                <th>状态与原因</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className={b.id === 0 ? 'you' : !b.alive ? 'eliminated' : ''}
                >
                  <td>{b.rank}</td>
                  <td>
                    #{String(b.id).padStart(3, '0')}
                    {b.id === 0 ? ' · 你' : ''}
                  </td>
                  <td>{b.best} F</td>
                  <td>{b.floor} F</td>
                  <td>{b.quota}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  return (
    <main className="elevator-demo">
      <header className="ed-header">
        <a href="/">
          f9<span> / 幸存者电梯</span>
        </a>
        <div className="ed-header-tools">
          <button aria-label="游玩说明" onClick={() => setHelp(true)}>
            <BookOpen size={17} />
          </button>
          <button onClick={exportRun} aria-label="导出存档">
            <Download size={17} />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="导入存档"
          >
            <Upload size={17} />
          </button>
          <a href="/design/">设计档案 ↗</a>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void importRun(e.target.files?.[0])}
        />
      </header>
      {run.phase === 'intro' ? (
        <section className="ed-intro">
          <div className="ed-door">
            <span>↑</span>
            <b>00</b>
            <small>只能向上</small>
          </div>
          <div>
            <p className="ed-kicker">SURVIVOR PROTOCOL / DEMO 1.0</p>
            {notice && (
              <output className="ed-hint" aria-live="polite">
                {notice}
              </output>
            )}
            <h1>
              醒来之后，
              <br />
              世界只剩向上。
            </h1>
            <p>
              一张床，一张桌子。水果刀、苹果、打火机。
              <br />
              你在一部没有下行按钮的电梯里醒来。
            </p>
            <div className="ed-actions">
              <button
                className="ed-primary"
                disabled={!ready}
                onClick={() => dispatch({ type: 'begin' })}
              >
                这是哪儿？ <ArrowRight size={18} />
              </button>
              <button
                disabled={!ready}
                onClick={() => dispatch({ type: 'begin' })}
              >
                我在做一个什么奇葩的梦？
              </button>
            </div>
            <small className="ed-hint">
              单人策略生存 · 十层完整旅程 · 本机自动存档
              <br />
              每局重组楼层题材，当前使用离线生成规则。
            </small>
          </div>
        </section>
      ) : (
        <>
          <div className="ed-resources">
            {[
              ['配额', run.quota, Heart],
              ['精力', run.stamina, Leaf],
              ['补给', run.supply, Package],
              ['材料', run.material, Wrench],
              ['电力', run.power, Zap],
              ['燃料', run.fuel, Flame],
              ['药品', run.medicine, Heart],
              ['废料', run.scrap, Box],
            ].map(([name, n, I]) => {
              const C = I as LucideIcon;
              return (
                <div key={String(name)}>
                  <C size={16} />
                  <span>{String(name)}</span>
                  <b>{String(n)}</b>
                </div>
              );
            })}
          </div>
          <div className="ed-shell">
            <aside className="ed-sidebar">
              <p className="ed-kicker">
                DAY {String(run.day).padStart(2, '0')}
              </p>
              <div className="ed-floor-display">
                {String(run.floor).padStart(2, '0')}
                <small>当前楼层 / 10</small>
              </div>
              <p className="ed-phase">
                <span /> {phaseName[run.phase]}
              </p>
              <nav>
                {[
                  ['base', '电梯基地', BedDouble],
                  ['map', '选择楼层', ArrowUp],
                  ['floor', '继续探索', DoorOpen],
                  ['inventory', '行装与构筑', Backpack],
                  ['survivors', '幸存者榜', Users],
                  ['log', '旅程日志', BookOpen],
                ].map(([id, name, I]) => {
                  const C = I as LucideIcon;
                  return (
                    <button
                      key={String(id)}
                      className={tab === id ? 'active' : ''}
                      disabled={
                        run.phase === 'combat' ||
                        ((id === 'base' || id === 'map') &&
                          run.phase === 'floor') ||
                        (id === 'floor' && run.phase !== 'floor')
                      }
                      onClick={() => setTab(String(id))}
                    >
                      <C size={17} />
                      {String(name)}
                      <ChevronRight size={13} />
                    </button>
                  );
                })}
              </nav>
              <div className="ed-side-note">
                <Trophy size={18} />
                <span>
                  最高通关<b>{run.best} F</b>
                </span>
              </div>
              <small className="ed-save">{saved}</small>
              <button className="ed-restart" onClick={() => setReset(true)}>
                <RotateCcw size={13} />
                重新开始
              </button>
            </aside>
            <div className="ed-main">
              <output className="ed-notice" aria-live="polite">
                <Radio size={15} />
                <span>{notice || run.notice}</span>
              </output>
              {run.phase === 'combat' ? (
                combat()
              ) : run.phase === 'ended' ? (
                <>
                  <section className="ed-ending">
                    <Trophy size={54} />
                    <p className="ed-kicker">END OF TRANSMISSION</p>
                    <h1>{run.ending}</h1>
                    <div>
                      <span>
                        <b>{run.best}</b>最高通关楼层
                      </span>
                      <span>
                        <b>{ranking(run).find((x) => x.id === 0)!.rank}</b>
                        本局排名
                      </span>
                      <span>
                        <b>{run.day}</b>存活天数
                      </span>
                    </div>
                    <p>
                      {run.ending.includes('完成')
                        ? '电梯停在第十层。广播第一次没有命令，只说了一句：我们还会再见。'
                        : '屏幕暗了下来。你到过的高度仍会被记住。'}
                    </p>
                    <button
                      className="ed-primary"
                      onClick={() => setReset(true)}
                    >
                      开启新的电梯
                    </button>
                  </section>
                  {survivors()}
                </>
              ) : tab === 'base' ? (
                base()
              ) : tab === 'map' ? (
                map()
              ) : tab === 'floor' ? (
                floor()
              ) : tab === 'inventory' ? (
                inventory()
              ) : tab === 'survivors' ? (
                survivors()
              ) : (
                <section className="ed-panel">
                  <h2>旅程日志</h2>
                  {run.log.map((line, i) => (
                    <p className="ed-log-line" key={i}>
                      {line}
                    </p>
                  ))}
                </section>
              )}
            </div>
          </div>
        </>
      )}
      <footer className="ed-footer">
        <span>f9 / DEMO 1.0 · 十层幸存者协议</span>
        <span>
          存档仅保存在当前浏览器，可导出备份 · <a href="/legacy/">旧版实验</a>
        </span>
      </footer>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="ed-dialog">
          <DialogTitle>欢迎加入幸存者游戏</DialogTitle>
          <DialogDescription>
            100
            名参与者，每人一部电梯。只能向上；高层奖励更多，但构筑与天气决定真正的难度。
          </DialogDescription>
          <div className="ed-help">
            <h3>准备 → 出勤 → 撤离 → 成长</h3>
            <p>
              每天一次出勤，无倒计时。睡觉推进一天并扣 1 配额。有补给恢复 50
              精力，没有补给恢复 15。初始 12 配额。
            </p>
            <p>
              楼层由事件、搜索、解谜、商人和守卫组成。搜索后自行挑选物资，预留 8
              精力正常返回；完成守卫后撤离才会提交最高通关楼层。
            </p>
            <p>
              实体需要鉴定才成为卡牌。基地终端免费，楼层鉴定需携带仪器并消耗电荷。上阵卡不占背包，1–3
              格卡不可跨路。安全容器独立计量。
            </p>
            <p>
              回收扣
              3、5、7……配额，普通背包丢失。成功正常撤回重置连续救援计数；睡觉不重置。装备与基地保留，配额耗尽则本局结束。
            </p>
            <p>
              十层是本 Demo
              的完整范围，撤离第十层后结算。楼层使用离线种子重组，尚未接入大模型；机器人采用可解释的数值模拟。
            </p>
            <p>
              伤害默认命中同路前排卡牌，空路直击宿主。卡牌只有护甲，没有生命值，不会被打掉；减伤公式为原始伤害
              × 100 ÷（100 +
              护甲），之后扣宿主护盾与生命。治疗、护盾仍给宿主。脉冲线圈明确攻击其他路后排；多格卡算一个完整目标。我方右侧为前排，敌方左侧为前排，双方前排在中央相对。40
              秒后空间坍缩属于环境伤害，绕过卡牌护甲与宿主护盾。
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reset} onOpenChange={setReset}>
        <DialogContent className="ed-dialog">
          <DialogTitle>开始新的一局？</DialogTitle>
          <DialogDescription>
            当前进度会被新局替换。需要保留时，请先用顶部下载按钮导出存档。
          </DialogDescription>
          <div className="ed-actions">
            <button onClick={() => setReset(false)}>继续当前旅程</button>
            <button className="ed-primary" onClick={resetRun}>
              确认重新开始
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
