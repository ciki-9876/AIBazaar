'use client';
/* oxlint-disable react/react-compiler -- Event handlers read the authoritative run ref; mount effects restore explicitly local browser state. */
/* oxlint-disable next/no-html-link-for-pages -- Static Sites hosting needs native anchors; RSC-prefetch navigation is unsupported. */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import BattleEffects from './battle-effects';
import CardFace from './card-face';
import CardDetail from './card-detail';
import CargoGrid, { CargoProvider, CarryButton } from './cargo-grid';
import CostButton from './cost-button';
import ElevatorRoom from './elevator-room';
import {
  Coins,
  Settings,
  X,
  ArrowUp,
  ArrowRight,
  Heart,
  Zap,
  Package,
  Backpack,
  Shield,
  Flame,
  CloudRain,
  Snowflake,
  CloudFog,
  BedDouble,
  Wrench,
  Radio,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  BookOpen,
  DoorOpen,
  Search,
  Leaf,
  KeyRound,
  Store,
  Check,
  ChevronRight,
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
  openCells,
  moduleUsed,
  currentFloor,
  currentNode,
  nodeName,
  weatherAt,
  layoutAt,
  searchCost,
  eventAt,
  nodeTitle,
  merchantOffers,
  offerPrice,
  sellPrice,
  rescueCost,
  cargoShape,
  migrateCargo,
  checkpoint,
  unlockedItem,
  FACILITY_LEVEL,
  LEVEL_GUIDE,
  puzzle,
  playerCards,
  ranking,
} from '@/lib/demo-engine';
import type { Run, Action, Zone, Item } from '@/lib/demo-engine';
import { simulateDuel, armorOf } from '@/lib/demo-combat';
import type { FighterCard, CombatFrame } from '@/lib/demo-combat';
import { cardDef } from '@/lib/prototype-v04';
import { terrainFor } from '@/lib/prototype-v03';
import './demo.css';
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
  const battlefieldRef = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState<Run>(() => newRun(10909)),
    ref = useRef(run);
  const [ready, setReady] = useState(false),
    [saved, setSaved] = useState('正在读取本机存档'),
    [notice, setNotice] = useState(''),
    [tab, setTab] = useState('base'),
    [selected, setSelected] = useState<string | null>(null),
    [inspection, setInspection] = useState<{
      uid: string;
      source: string;
      x: number;
      y: number;
    } | null>(null),
    [settings, setSettings] = useState(false),
    [sleepPrompt, setSleepPrompt] = useState(false),
    [help, setHelp] = useState(false),
    [reset, setReset] = useState(false);
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(true),
    [speed, setSpeed] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const hoverClose = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepInspection = () => {
    if (hoverClose.current) clearTimeout(hoverClose.current);
  };
  const hideInspection = () => {
    keepInspection();
    hoverClose.current = setTimeout(() => setInspection(null), 220);
  };
  const showInspection = (uid: string, source: string, target: HTMLElement) => {
    keepInspection();
    const rect = target.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const x =
      rect.right + 8 + width <= window.innerWidth
        ? rect.right + 8
        : Math.max(12, rect.left - width - 8);
    setInspection({
      uid,
      source,
      x,
      y: Math.max(12, Math.min(rect.top, window.innerHeight - 440)),
    });
  };
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspection(null);
    };
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('keydown', close);
      if (hoverClose.current) clearTimeout(hoverClose.current);
    };
  }, []);

  const commit = useCallback((next: Run) => {
    next = migrateCargo(next);
    ref.current = next;
    setRun(next);
    setNotice(next.notice);
  }, []);
  const dispatch = useCallback(
    (a: Action) => {
      try {
        const next = act(ref.current, a);
        commit(next);
        if ((a.type === 'pickup' || a.type === 'trade') && a.id)
          setSelected(a.id);
        if (a.type === 'enter') setTab('floor');
        if (a.type === 'begin') setTab('base');
        if (a.type === 'extract' || a.type === 'rescue' || a.type === 'sleep')
          setTab('base');
        if (a.type === 'resolve')
          setTab(next.phase === 'base' ? 'base' : 'floor');
        if (a.type === 'fight') {
          setCursor(0);
          setPlaying(true);
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
                    data-entity={card.uid}
                    className={
                      (fr?.cards[card.uid]?.reviveAt != null
                        ? 'is-ghost '
                        : '') +
                      'ed-card ed-card-v2 quality-' +
                      card.quality +
                      ' rarity-' +
                      card.rarity +
                      (selected === card.uid ? ' selected' : '') +
                      (fr?.fired.includes(card.uid) ? ' firing' : '') +
                      (fr?.hits.some((hit) => hit.targetUid === card.uid)
                        ? ' struck'
                        : '')
                    }
                    style={{ gridColumn: `${col + 1} / span ${c.size}` }}
                    onMouseEnter={(e) =>
                      showInspection(
                        card.uid,
                        enemy ? 'enemy' : 'inventory',
                        e.currentTarget,
                      )
                    }
                    onMouseLeave={hideInspection}
                    onFocus={(e) =>
                      showInspection(
                        card.uid,
                        enemy ? 'enemy' : 'inventory',
                        e.currentTarget,
                      )
                    }
                    onBlur={hideInspection}
                    onClick={() => !enemy && setSelected(card.uid)}
                    aria-label={`查看${c.name}，${RARITY[card.rarity].name}，${QUALITY[card.quality]}，强化${card.level}，护甲${armorOf(card)}`}
                  >
                    <CardFace
                      card={card}
                      health={fr?.cards[card.uid]?.hp}
                      deaths={fr?.cards[card.uid]?.deaths}
                      reviveRemaining={
                        fr?.cards[card.uid]?.reviveAt != null
                          ? Math.max(0, fr.cards[card.uid].reviveAt! - fr.time)
                          : 0
                      }
                      enemy={enemy}
                      progress={
                        fr
                          ? fr.timers[side][card.at] /
                            (fr.cd[side][card.at] || 1)
                          : 0
                      }
                      waiting={!!fr?.waiting.includes(card.uid)}
                      cooldown={fr?.cd[side][card.at]}
                      playing={
                        !!fr &&
                        fr.cards[card.uid]?.reviveAt == null &&
                        playing &&
                        cursor < (battle?.frames.length ?? 0) - 1
                      }
                      speed={speed}
                    />
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
      <div
        data-entity={`host-${side}`}
        className={'ed-actor ' + (side ? 'enemy' : '')}
      >
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
            .filter(
              (x) =>
                x.side === side &&
                x.kind !== 'charge' &&
                x.cardHealthLoss === undefined,
            )
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
  function grid(zone: Zone) {
    const shape = cargoShape(run, zone);
    return (
      <section className="ed-panel">
        <div className="ed-panel-title">
          <h3>{zoneName[zone]}</h3>
          <span>
            {volume(run.items.filter((x) => x.zone === zone))} /{' '}
            {shape.capacity} 格
          </span>
        </div>
        <CargoGrid
          items={run.items.filter((x) => x.zone === zone)}
          zone={zone}
          {...shape}
        />
      </section>
    );
  }
  function inventory() {
    return (
      <>
        <div className="ed-section-title">
          <h2>行装与构筑</h2>
          <p>悬停查看详情与操作，拖动整理，固定横向占格。</p>
        </div>
        <section className="ed-panel">
          <h3>上阵卡组</h3>
          {cardGrid(playerCards(run))}
        </section>
        <div className="ed-cargo-columns">
          {grid('bag')}
          {grid('safe')}
        </div>
        {grid('warehouse')}
        {run.phase === 'floor' && run.interaction === 'search' && loot()}
      </>
    );
  }
  function loot() {
    const items = f.stock.filter((x) => unlockedItem(run, x.id));
    return (
      <section className="ed-panel">
        <h3>待拾取物品 · {items.length} 件</h3>
        <CargoGrid
          items={items}
          zone="loot"
          columns={4}
          capacity={Math.min(
            96,
            Math.max(12, ...items.map((x) => (x.slot ?? 0) + x.volume * 4 + 4)),
          )}
        />
      </section>
    );
  }
  function terminal() {
    return (
      <>
        <p className="ed-unlock-note">
          Lv.{run.level} · {LEVEL_GUIDE[run.level - 1]}
          {run.level < 6 && <small>下一级：{LEVEL_GUIDE[run.level]}</small>}
        </p>
        <div
          className={
            'ed-base-grid ed-terminal-content ' +
            (tab === 'prep' ? 'show-prep' : 'show-upgrades')
          }
        >
          <section className="ed-panel">
            <div className="ed-panel-title">
              <h3>电梯改造 / Lv.{run.level}</h3>
              <span>
                金币 {run.material} · 模块 {moduleUsed(run)} / {run.moduleCap}
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
              <CostButton
                cost={6}
                disabled={run.moduleCap >= 10}
                onClick={() => dispatch({ type: 'expand' })}
              >
                扩建 +2 槽
              </CostButton>
              <CostButton
                cost={5 + run.level}
                disabled={run.level >= 6}
                onClick={() => dispatch({ type: 'upgrade' })}
              >
                电梯升级
              </CostButton>
            </div>
            <p className="ed-hint">
              升级解锁战斗格；Lv.3 / Lv.5 同步扩充背包与安全容器。终端不占槽位。
            </p>
            <section className="ed-resource-cycle">
              <h3>现在能做什么</h3>
              <p>补给 → 出勤与睡眠 → 带回物资 → 免费鉴定 → 新卡牌。</p>
              <p>
                金币来自搜查、交易和首次通关，用来升级电梯。当前库存{' '}
                {run.material}。
              </p>
              {run.level >= 2 && (
                <p>
                  多余物品 → 分解为金币 → 强化卡牌。废料 → 回收台 → 金币；药品 →
                  医疗站 → 精力。
                </p>
              )}
              {run.level >= 3 && (
                <p>
                  废料 → 储藏架 → 燃料 → 发电机 → 电力；电力与金币 → 设备台 →
                  鉴定电荷。仪器必须随身携带。
                </p>
              )}
              {run.level >= 4 && (
                <p>
                  电力与金币 → 种植架 →
                  补给。观测台免费预报明天天气，帮助选择下一条路线。
                </p>
              )}
              {run.level >= 5 && (
                <p>
                  电力与金币 → 地形准备 → 下次出勤减少搜索消耗 →
                  留出更多探索余量。
                </p>
              )}
              {run.level >= 2 && (
                <p>设施每日各使用一次；睡眠消耗有限生命，经营无法无限循环。</p>
              )}
            </section>
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
              <span className={run.level < 3 ? 'ed-hidden' : ''}>
                鉴定电荷 <b>{run.charges} / 4</b>
              </span>
              <span className={run.level < 5 ? 'ed-hidden' : ''}>
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
              {run.level >= 3 && !run.items.some((x) => x.id === 'scanner') && (
                <CostButton
                  cost={4}
                  onClick={() => dispatch({ type: 'craft-scanner' })}
                >
                  重制鉴定仪 · 2 电力
                </CostButton>
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
        <div
          className={'ed-section-title ' + (tab === 'prep' ? 'ed-hidden' : '')}
        >
          <h2>把庇护所建起来</h2>
          <span>每设施每日一次 · 拆除保留当日使用记录</span>
        </div>
        <div className={'ed-facilities ' + (tab === 'prep' ? 'ed-hidden' : '')}>
          {FACILITY.filter(
            (f) =>
              run.level >= FACILITY_LEVEL[f.id] || run.installed.includes(f.id),
          ).map((f) => {
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
                      <CostButton
                        cost={
                          (
                            { grow: 1, workshop: 1, adapt: 2 } as Record<
                              string,
                              number
                            >
                          )[f.id] ?? 0
                        }
                        className={used ? '' : 'ed-primary'}
                        disabled={used}
                        onClick={() => dispatch({ type: 'facility', id: f.id })}
                      >
                        {used ? <Check size={15} /> : <Wrench size={15} />}{' '}
                        {used ? '今日已完成' : '使用设施'}
                      </CostButton>
                      <button
                        onClick={() => dispatch({ type: 'remove', id: f.id })}
                      >
                        拆除 +{Math.floor(f.cost / 2)}
                      </button>
                    </>
                  ) : (
                    <CostButton
                      cost={f.cost}
                      onClick={() => dispatch({ type: 'build', id: f.id })}
                    >
                      建造
                    </CostButton>
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
            每天一次出勤。可跳层；通关后才确认新停靠点。
            <br />
            未通关撤离返回出发点；救援另扣生命并丢失普通背包。
          </p>
        </div>
        <div className="ed-floor-map">
          {run.floors.map((fl) => {
            const locked = fl.id < checkpoint(run),
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
  function fieldInventory() {
    return (
      <section className="ed-field-bag">
        <p>金币 {run.material}</p>
        {grid('bag')}
        {grid('safe')}
        <details className="ed-field-board">
          <summary>上阵卡组</summary>
          {cardGrid(playerCards(run))}
        </details>
      </section>
    );
  }
  function trading() {
    const items = merchantOffers(run).map((x) => ({ ...x, slot: undefined }));
    return (
      <section className="ed-panel">
        <h3>商人商品</h3>
        <p>金币 {run.material} · 点击查看价格；拖入背包购买。</p>
        <CargoGrid
          items={items}
          zone="shop"
          columns={4}
          capacity={Math.max(12, items.reduce((n, x) => n + x.volume, 0) * 2)}
        />
      </section>
    );
  }
  function floor() {
    const node = currentNode(run),
      active = !!run.interaction,
      ev = eventAt(run);
    const fights = node === 'guardian' && run.encounter ? 2 : 1,
      round =
        node === 'guardian' && run.encounter && !run.encounterDone ? 1 : fights;
    return (
      <>
        <p className="ed-route-cost">
          前往下一个节点：基础消耗 3
          精力；搜查、事件等消耗另计。击败敌人可获得金币，精英与幸存者另掉落一张携带卡牌。
        </p>
        <section
          className={
            'ed-floor-scene scene-' +
            (run.floor % 4) +
            (active ? ' engaged' : '')
          }
        >
          <div className="ed-orbit" aria-hidden="true">
            <div />
            <span>{run.floor}</span>
          </div>
          <div className="ed-scene-copy">
            <p className="ed-kicker">
              FLOOR {String(run.floor).padStart(2, '0')} /{' '}
              {active
                ? '正在' + (run.interaction === 'trade' ? '交易' : '搜查')
                : 'EXPLORATION'}
            </p>
            <h1>{f.name}</h1>
            {!active && <p>{f.detail}</p>}
            <div className="ed-tags">
              <span>
                <WeatherIcon index={w} />
                {WEATHER[w].name}
              </span>
              <span>{run.objective ? '主目标完成' : '尚未提交通关'}</span>
            </div>
          </div>
        </section>
        <div
          className="ed-route"
          style={{
            gridTemplateColumns: `repeat(${f.nodes.length + 1},minmax(76px,1fr))`,
          }}
        >
          {[...f.nodes, 'exit'].map((n, i) => (
            <div
              key={i}
              className={i === run.node ? 'active' : i < run.node ? 'done' : ''}
            >
              <b>{i < run.node ? '✓' : i + 1}</b>
              <span>{nodeName[n]}</span>
            </div>
          ))}
        </div>
        {active ? (
          <>
            <div className="ed-interaction-heading">
              <div>
                <h2>{nodeTitle(run)}</h2>
                <p>
                  {run.interaction === 'search'
                    ? '拾取的物品会立即出现在右侧背包；可以随时转移、鉴定和上阵。'
                    : '商品与行装同屏，先整理出空间再购买。交易不会自动推进路线。'}
                </p>
              </div>
              <button
                className="ed-primary"
                onClick={() => dispatch({ type: 'next-node' })}
              >
                前往下个目的地 <ArrowRight size={16} />
              </button>
            </div>
            <div className="ed-interaction-grid">
              {run.interaction === 'search' ? loot() : trading()}
              {fieldInventory()}
            </div>
            <div className="ed-actions">
              <button onClick={() => dispatch({ type: 'extract' })}>
                提前撤离 · 8 精力
              </button>
              <button
                className="ed-danger"
                onClick={() => dispatch({ type: 'rescue' })}
              >
                紧急回收 · {rescueCost(run)} 生命
              </button>
            </div>
          </>
        ) : (
          <div className="ed-explore-grid">
            <section className="ed-panel ed-node">
              <p className="ed-kicker">
                NODE {run.node + 1} / {nodeName[node]}
              </p>
              <h2>{nodeTitle(run)}</h2>
              {node === 'event' ? (
                <>
                  <p>{ev.text}</p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'event', choice: 0 })}
                    >
                      谨慎通过 · {ev.safeCost} 精力
                    </button>
                    <CostButton
                      cost={ev.kind === 2 ? 2 : 0}
                      onClick={() => dispatch({ type: 'event', choice: 1 })}
                    >
                      {ev.kind === 2 ? '修复通路 · 恢复 6 精力' : ev.alt}
                    </CostButton>
                  </div>
                </>
              ) : node === 'search' ? (
                <>
                  <p>
                    {nodeTitle(run)}
                    里还有未被带走的物资。当前天气下，打开搜查区域需要{' '}
                    {searchCost(run)} 精力。
                  </p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'search' })}
                    >
                      <Search size={16} />
                      搜查区域
                    </button>
                    <button onClick={() => dispatch({ type: 'skip' })}>
                      跳过搜查
                    </button>
                  </div>
                </>
              ) : node === 'merchant' ? (
                <>
                  <p>
                    {nodeTitle(run)}
                    带来了不同的实体、工具与补给。可以用金币购买，也可以卖掉不需要的随身物品。
                  </p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'open-trade' })}
                    >
                      <Store size={16} />
                      查看商品 / 开始交易
                    </button>
                    <button onClick={() => dispatch({ type: 'skip' })}>
                      离开商人
                    </button>
                  </div>
                </>
              ) : node === 'puzzle' ? (
                <>
                  <p>{puzzle(run).text}</p>
                  <p className="ed-hint">
                    每次尝试 4 精力。提示：{puzzle(run).hint}
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
              ) : node === 'rest' ? (
                <>
                  <p>这里暂时没有威胁。坐下来，喘一口气。</p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'rest' })}
                    >
                      短暂休整 · +8 精力
                    </button>
                    <button
                      className={run.level < 2 ? 'ed-hidden' : ''}
                      onClick={() => dispatch({ type: 'rest', choice: 1 })}
                    >
                      消耗药品 · +25 精力
                    </button>
                  </div>
                </>
              ) : node === 'hazard' ? (
                <>
                  <p>
                    {nodeTitle(run)}
                    阻断前路。用电力启动防护装置，或消耗精力谨慎穿越。
                  </p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'hazard' })}
                    >
                      穿越 · 8 精力
                    </button>
                    <button
                      className={run.level < 3 ? 'ed-hidden' : ''}
                      onClick={() => dispatch({ type: 'hazard', choice: 1 })}
                    >
                      启动防护 · 2 电力
                    </button>
                  </div>
                </>
              ) : node === 'cache' ? (
                <>
                  <p>里面还剩两件应急用品，只能拿走一件。</p>
                  <div className="ed-actions">
                    <button onClick={() => dispatch({ type: 'cache' })}>
                      拿走苹果
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'cache', choice: 1 })}
                    >
                      拿走打火机
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'cache', choice: 2 })}
                    >
                      不拿，继续前进
                    </button>
                  </div>
                </>
              ) : node === 'bargain' ? (
                <>
                  <p>装置愿意购买你的体力：12 精力换 4 金币。</p>
                  <div className="ed-actions">
                    <button
                      onClick={() => dispatch({ type: 'bargain', choice: 1 })}
                    >
                      接受交易
                    </button>
                    <button onClick={() => dispatch({ type: 'bargain' })}>
                      拒绝并前进
                    </button>
                  </div>
                </>
              ) : node === 'patrol' || node === 'elite' ? (
                <>
                  <h3>
                    {node === 'patrol'
                      ? '第一阶段 · 普通战'
                      : '第二阶段 · 精英战'}
                  </h3>
                  <p>
                    战败损失 35
                    精力并进入下一个节点，生命与背包保留，不领取战斗奖励。最终
                    BOSS 尚未到达。
                  </p>
                  <button
                    className="ed-primary"
                    onClick={() => dispatch({ type: 'fight' })}
                  >
                    挑战{node === 'patrol' ? '巡逻者' : '精英看守'}
                  </button>
                </>
              ) : node === 'guardian' ? (
                <>
                  <div className="ed-fight-queue">
                    <b>
                      本节点共 {fights} 场战斗 · 即将第 {round}/{fights} 场
                    </b>
                    {run.encounter && (
                      <p className={run.encounterDone ? 'finished' : ''}>
                        {run.encounterDone ? '✓ 已完成' : '① 待挑战'} 幸存者 #
                        {run.encounter} · 封锁对决
                      </p>
                    )}
                    <p>
                      {fights === 2 ? '②' : '①'} {nodeTitle(run)} · 最终 BOSS
                    </p>
                  </div>
                  <p>
                    {run.encounter && !run.encounterDone
                      ? '先击败相遇的幸存者，之后还有楼层守卫。两场之间可以整理，也可以提前撤离。'
                      : '击败这名守卫后，本层战斗全部结束。随后撤离才会提交通关。'}
                  </p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'fight' })}
                    >
                      开始第 {round}/{fights} 场：
                      {run.encounter && !run.encounterDone
                        ? '幸存者对决'
                        : 'BOSS 战'}
                    </button>
                    <button onClick={() => setTab('inventory')}>
                      调整构筑
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>本层战斗全部完成。撤离后提交成绩，并把资源带回电梯。</p>
                  <button
                    className="ed-primary"
                    onClick={() => dispatch({ type: 'extract' })}
                  >
                    完成撤离 · 8 精力
                  </button>
                </>
              )}
            </section>
            <aside className="ed-panel">
              <h3>保留退路</h3>
              <p>提前撤离保留物资，但不提交通关。正常返回需要 8 精力。</p>
              <div className="ed-actions vertical">
                <button onClick={() => dispatch({ type: 'extract' })}>
                  现在撤离
                </button>
                <button onClick={() => setTab('inventory')}>
                  整理行装 / 吃苹果
                </button>
                <button
                  className="ed-danger"
                  onClick={() => dispatch({ type: 'rescue' })}
                >
                  紧急回收 · {rescueCost(run)} 生命
                </button>
              </div>
            </aside>
          </div>
        )}
        {f.history.length > 0 && (
          <details className="ed-panel">
            <summary>本层其他幸存者留下的痕迹</summary>
            {f.history.map((line, i) => (
              <p key={i}>{line}</p>
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
        <p className="ed-stage-warning">
          {run.duel.kind === 'survivor'
            ? '幸存者 AI 对战 · 战败触发强制回收，损失生命和普通背包。'
            : run.duel?.stage === 'boss' ||
                (!run.duel?.stage && run.duel?.kind === 'guardian')
              ? '最终 BOSS · 战败触发强制回收，损失生命和普通背包。'
              : '普通 / 精英战斗 · 战败仅损失 35 精力并进入下一个节点，保留生命和背包。'}
        </p>
        <div className="ed-section-title">
          <div>
            <p className="ed-kicker">
              {run.duel.kind === 'survivor'
                ? 'SEALED ENCOUNTER'
                : 'FLOOR GUARDIAN'}
            </p>
            <h2>
              {run.duel.kind === 'survivor'
                ? '第 1/2 场 · 幸存者封锁战'
                : run.duel.stage === 'normal'
                  ? '第一阶段 · 普通战'
                  : run.duel.stage === 'elite'
                    ? '第二阶段 · 精英战'
                    : '第三阶段 · 最终 BOSS'}
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
          <div className="ed-horizontal-battle" ref={battlefieldRef}>
            <BattleEffects
              surface={battlefieldRef}
              frames={battle.frames}
              cursor={cursor}
              playing={playing}
              speed={speed}
            />
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
            双方前排朝中央 · 命中卡牌 → 护甲 → 卡牌生命 / 幽魂 · 空路直击
          </span>
        </div>
        <details className="ed-visual-guide">
          <summary>卡牌与弹道图例</summary>
          <p>
            底色：灰色普通、蓝色罕见、黄色稀有、暗金传说、红色奇迹。品质：基础单线框、精制双线框、大师雕角框。左上角为强化等级，我方右下角、敌方左下角显示卡牌护甲；蒙层铺满时发动。
          </p>
          <p>
            直线流光：伤害红、治疗绿、护甲/护盾黄、灼烧橙、毒素墨绿、冰冻淡蓝。当前样卡尚无独立灼烧、毒素、冰冻效果，这三类已预留对应颜色。弹道飞行
            0.75–1.5 秒后结算效果；暂停会冻结弹道位置。
          </p>
        </details>
        <div className="ed-combat-log">
          {battle.frames
            .slice(Math.max(0, cursor - 12), cursor + 1)
            .flatMap((fr) => [
              ...fr.hits.map((h) =>
                h.targetName
                  ? h.cardHealthLoss !== undefined
                    ? `${fr.time.toFixed(1)}s · ${h.source} → ${h.targetName}：卡牌生命 −${h.cardHealthLoss}`
                    : `${fr.time.toFixed(1)}s · ${h.source} → ${h.targetName}：${h.raw} 原伤 / ${h.armor} 护甲 → 传递 ${h.value}；宿主盾吸收 ${Math.round((h.shieldAbsorbed ?? 0) * 10) / 10} / 生命 −${Math.round((h.healthLoss ?? 0) * 10) / 10}`
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
                    : run.duel.kind === 'survivor' ||
                        run.duel.stage === 'boss' ||
                        !run.duel.stage
                      ? '电梯启动了回收。'
                      : '负伤继续前进。'}
              </h2>
              <p>
                {battle.winner === 0
                  ? run.duel.kind === 'survivor'
                    ? '幸存者封锁战结束，下一场是楼层守卫。确认后可先整理或提前撤离。'
                    : run.duel.stage === 'normal' || run.duel.stage === 'elite'
                      ? '本阶段胜利，确认后继续深入。最终 BOSS 仍未击败。'
                      : '本层全部战斗已结束。返回楼层后撤离提交通关。'
                  : run.duel.kind === 'survivor' ||
                      run.duel.stage === 'boss' ||
                      (!run.duel.stage && run.duel.kind === 'guardian')
                    ? `本次回收消耗 ${rescueCost(run)} 生命，普通背包丢失。`
                    : '本次战败损失 35 精力，进入当前楼层的下一个节点。生命与背包保留，不领取战斗奖励。'}
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
                <th>生命</th>
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
  const inspected = inspection
    ? (inspection.source === 'enemy'
        ? run.duel?.enemy.map((c) => ({
            ...c,
            type: 'card' as const,
            zone: 'board' as const,
            volume: cardDef(c.id).size,
            amount: 1,
          }))
        : inspection.source === 'loot'
          ? f?.stock
          : inspection.source === 'shop'
            ? merchantOffers(run)
            : run.items
      )?.find((x) => x.uid === inspection.uid)
    : undefined;
  const inspectItem = (item: Item, source: string, target: HTMLElement) => {
    setSelected(item.uid);
    showInspection(item.uid, source, target);
  };
  const placeItem = (item: Item, from: string, to: string, slot: number) => {
    if (to === 'loot') {
      if (from === 'loot')
        dispatch({
          type: 'arrange-stock',
          id: item.uid,
          slot,
          rotated: item.rotated,
        });
      else if (from !== 'shop') dispatch({ type: 'drop', id: item.uid });
      return;
    }
    if (!['bag', 'safe', 'warehouse'].includes(to)) return;
    dispatch({
      type: from === 'loot' ? 'pickup' : from === 'shop' ? 'trade' : 'move',
      id: item.uid,
      to: to as Zone,
      slot,
      rotated: item.rotated,
    });
  };
  const itemAction = (a: Action) => {
    const next = dispatch(a);
    if (next && !next.items.some((x) => x.uid === inspection?.uid))
      setInspection(null);
  };
  return (
    <CargoProvider
      onPlace={placeItem}
      onInspect={inspectItem}
      onDismiss={hideInspection}
    >
      <main
        className={
          'elevator-demo ed-immersive ' +
          (run.phase === 'base' ? 'at-base ' : '') +
          (run.phase === 'base' && tab === 'base' ? 'in-room' : '')
        }
      >
        <header className="ed-header">
          <button
            className="ed-settings-button"
            aria-label="设置"
            onClick={() => setSettings(true)}
          >
            <Settings size={20} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void importRun(e.target.files?.[0])}
          />
        </header>
        {run.phase === 'intro' ? (
          <section className="ed-intro ed-intro-room">
            <div inert className="ed-intro-backdrop">
              <ElevatorRoom
                floor={0}
                day={1}
                used={false}
                level={1}
                onTable={() => {}}
                onDoor={() => {}}
                onBed={() => {}}
                onTerminal={() => {}}
              />
            </div>
            <div className="ed-door">
              <span>↑</span>
              <b>00</b>
              <small>只能向上</small>
            </div>
            <div>
              <p className="ed-kicker">未知位置 / 00:00</p>
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
                屏幕忽然闪了一下。它像是在等你说话。
              </small>
            </div>
          </section>
        ) : (
          <>
            <div className="ed-resources">
              {[
                ['生命', run.quota, Heart],
                ['精力', run.stamina, Leaf],
                ['补给', run.supply, Package],
                ['金币', run.material, Coins],
                ['电力', run.power, Zap],
                ['燃料', run.fuel, Flame],
                ['药品', run.medicine, Heart],
                ['废料', run.scrap, Box],
              ]
                .filter(
                  ([name]) =>
                    ['生命', '精力', '补给'].includes(String(name)) ||
                    (run.level >= 2 &&
                      ['金币', '药品', '废料'].includes(String(name))) ||
                    run.level >= 3,
                )
                .map(([name, n, I]) => {
                  const C = I as LucideIcon;
                  return (
                    <div
                      key={String(name)}
                      title={
                        (
                          {
                            生命: '有限的生存次数。睡眠消耗 1；幸存者 AI、BOSS 战败或主动救援按回收费用扣除。',
                            精力: '出勤、探索和撤离需要精力；睡眠、苹果和药品可以恢复。',
                            补给: '出勤消耗 1；睡眠消耗 1 并恢复更多精力。',
                            金币: '购买物品、升级电梯、建造设施和培养卡牌。',
                            电力: '设备充能、种植和地形准备。战斗能量独立计算。',
                            燃料: '发电机将 1 燃料转为 8 电力。',
                            药品: '医疗站或休整点消耗药品恢复精力。',
                            废料: '回收成金币，或在储藏架制成燃料。',
                          } as Record<string, string>
                        )[String(name)]
                      }
                    >
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
              </aside>
              <div className="ed-main">
                {run.phase === 'base' && tab !== 'base' && (
                  <div className="ed-terminal-nav">
                    <span>
                      {['upgrades', 'survivors', 'log', 'prep'].includes(tab)
                        ? '电梯系统'
                        : tab === 'inventory'
                          ? '桌面 / 行装与构筑'
                          : '门禁 / 选择楼层'}
                    </span>
                    {['upgrades', 'survivors', 'log', 'prep'].includes(tab) && (
                      <nav aria-label="电梯系统界面">
                        {[
                          ['upgrades', '电梯改造'],
                          ['survivors', '幸存者榜'],
                          ['log', '旅程日志'],
                          ['prep', '下一次出发'],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            className={tab === id ? 'active' : ''}
                            onClick={() => setTab(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </nav>
                    )}
                    <button
                      onClick={() => setTab('base')}
                      aria-label="返回电梯房间"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}

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
                  <ElevatorRoom
                    floor={checkpoint(run)}
                    day={run.day}
                    used={run.used}
                    level={run.level}
                    onTable={() => setTab('inventory')}
                    onDoor={() => setTab('map')}
                    onBed={() => setSleepPrompt(true)}
                    onTerminal={() => setTab('upgrades')}
                  />
                ) : tab === 'upgrades' || tab === 'prep' ? (
                  terminal()
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
        {inspected && inspection && (
          <dialog
            open
            className="ed-item-tooltip ed-inspect-dialog"
            aria-modal={false}
            tabIndex={-1}
            aria-label="物品详情"
            style={{
              left: inspection.x,
              top: inspection.y,
              maxHeight: `calc(100dvh - ${inspection.y + 12}px)`,
            }}
            onPointerEnter={keepInspection}
            onPointerLeave={hideInspection}
            onFocusCapture={keepInspection}
            onBlurCapture={hideInspection}
          >
            <h3>{inspected && itemName(inspected)}</h3>
            <p>
              {inspected?.volume} 格 ·{' '}
              {inspected?.type === 'card'
                ? '卡牌'
                : inspected?.type === 'physical'
                  ? '未鉴定实体'
                  : '物品'}
            </p>
            {inspected && (
              <>
                {inspected.type === 'card' ? (
                  <CardDetail
                    card={{
                      ...inspected,
                      at: inspected.at ?? 0,
                      rarity: inspected.rarity ?? 0,
                    }}
                  />
                ) : (
                  <p>
                    {inspected.type === 'physical'
                      ? '带回电梯免费鉴定后成为卡牌。'
                      : inspected.id === 'apple'
                        ? '食用恢复 25 精力。'
                        : inspected.id === 'scanner'
                          ? `携带后可在楼层鉴定实体。剩余 ${run.charges} 电荷。`
                          : inspected.id === 'lighter'
                            ? '可以用于特定事件。'
                            : `数量 ${inspected.amount}，带回电梯后存入库存。`}
                  </p>
                )}
                <div
                  className={
                    'ed-actions ' + (run.phase === 'combat' ? 'ed-hidden' : '')
                  }
                >
                  {inspection?.source === 'shop' ? (
                    <CostButton
                      cost={offerPrice(inspected)}
                      onClick={() =>
                        itemAction({ type: 'trade', id: inspected.uid })
                      }
                    >
                      购买
                    </CostButton>
                  ) : inspection?.source === 'loot' ? (
                    <button
                      onClick={() =>
                        itemAction({ type: 'pickup', id: inspected.uid })
                      }
                    >
                      拾取到背包
                    </button>
                  ) : (
                    <>
                      {inspected.type === 'physical' && (
                        <button
                          disabled={run.phase !== 'base' && run.level < 3}
                          onClick={() =>
                            itemAction({ type: 'scan', id: inspected.uid })
                          }
                        >
                          {run.phase === 'base' ? '免费鉴定' : '鉴定 · 1 电荷'}
                        </button>
                      )}
                      {inspected.type === 'card' && (
                        <>
                          <select
                            aria-label="选择上阵位置"
                            value=""
                            onChange={(e) =>
                              itemAction({
                                type: 'move',
                                id: inspected.uid,
                                to: 'board',
                                at: Number(e.target.value),
                              })
                            }
                          >
                            <option value="" disabled>
                              上阵到…
                            </option>
                            {openCells(run).map((at) => (
                              <option key={at} value={at}>
                                {['上', '中', '下'][Math.floor(at / 3)]}路{' '}
                                {(at % 3) + 1}号位
                              </option>
                            ))}
                          </select>
                          {run.phase === 'base' && run.level >= 2 && (
                            <>
                              <CostButton
                                cost={3 + inspected.level * 2}
                                disabled={inspected.level >= 5}
                                onClick={() =>
                                  itemAction({
                                    type: 'grow',
                                    id: inspected.uid,
                                  })
                                }
                              >
                                强化 +1
                              </CostButton>
                              <CostButton
                                cost={5 + inspected.quality * 4}
                                disabled={inspected.quality >= 2}
                                onClick={() =>
                                  itemAction({
                                    type: 'refine',
                                    id: inspected.uid,
                                  })
                                }
                              >
                                提升品质
                              </CostButton>
                            </>
                          )}
                        </>
                      )}
                      {inspected.id === 'apple' && (
                        <button
                          onClick={() =>
                            itemAction({ type: 'consume', id: inspected.uid })
                          }
                        >
                          食用
                        </button>
                      )}
                      {(['bag', 'safe', 'warehouse'] as Zone[])
                        .filter(
                          (z) =>
                            z !== inspected.zone &&
                            (run.phase === 'base' || z !== 'warehouse'),
                        )
                        .map((to) => (
                          <button
                            key={to}
                            onClick={() =>
                              itemAction({
                                type: 'move',
                                id: inspected.uid,
                                to,
                              })
                            }
                          >
                            移至{zoneName[to]}
                          </button>
                        ))}

                      {run.interaction === 'trade' &&
                        inspected.zone !== 'board' && (
                          <button
                            onClick={() =>
                              itemAction({ type: 'sell', id: inspected.uid })
                            }
                          >
                            出售 +{sellPrice(inspected)} 金币
                          </button>
                        )}
                      {inspected.zone !== 'board' &&
                        (run.phase !== 'base' || run.level >= 2) && (
                          <button
                            onClick={() =>
                              itemAction({
                                type: run.phase === 'base' ? 'recycle' : 'drop',
                                id: inspected.uid,
                              })
                            }
                          >
                            {run.phase === 'base' ? '分解换金币' : '丢弃'}
                          </button>
                        )}
                    </>
                  )}
                  {run.phase !== 'combat' && (
                    <CarryButton
                      item={inspected}
                      from={inspection!.source}
                      onCarry={() => setInspection(null)}
                    />
                  )}
                </div>
              </>
            )}
          </dialog>
        )}
        <Dialog open={settings} onOpenChange={setSettings}>
          <DialogContent className="ed-dialog">
            <DialogTitle>设置与记录</DialogTitle>
            <DialogDescription>f9 · 幸存者电梯</DialogDescription>
            <p>
              最高通关 {run.best} F · 第 {run.day} 天 · {saved}
            </p>
            <div className="ed-actions">
              <button
                onClick={() => {
                  setSettings(false);
                  setHelp(true);
                }}
              >
                <BookOpen size={16} />
                指南
              </button>
              <button onClick={exportRun}>
                <Download size={16} />
                导出存档
              </button>
              <button onClick={() => fileRef.current?.click()}>
                <Upload size={16} />
                导入存档
              </button>
              <button
                onClick={() => {
                  setSettings(false);
                  setReset(true);
                }}
              >
                <RotateCcw size={16} />
                重新开始
              </button>
              <a href="/design/">设计档案 ↗</a>
              <a href="/legacy/">旧版实验 ↗</a>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={sleepPrompt} onOpenChange={setSleepPrompt}>
          <DialogContent className="ed-dialog">
            <DialogTitle>让门外的世界再等一会儿。</DialogTitle>
            <DialogDescription>
              睡一觉，醒来就是下一天。每日没有倒计时。
            </DialogDescription>
            <p>
              生命 −1。
              {run.supply > 0
                ? '消耗 1 补给，恢复 50 精力。'
                : '没有补给，仅恢复 15 精力。'}
              {!run.used && '今天尚未出勤，睡眠会放弃今天的出发机会。'}
            </p>
            <button
              className="ed-primary"
              onClick={() => {
                dispatch({ type: 'sleep' });
                setSleepPrompt(false);
              }}
            >
              睡到明天
            </button>
          </DialogContent>
        </Dialog>
        <Dialog open={help} onOpenChange={setHelp}>
          <DialogContent className="ed-dialog">
            <DialogTitle>欢迎加入幸存者游戏</DialogTitle>
            <DialogDescription>
              100
              名参与者，每人一部电梯。正常航行只能向上；未通关撤离返回原停靠点。高层奖励更多，但构筑与天气决定真正的难度。
            </DialogDescription>
            <div className="ed-help">
              <h3>准备 → 出勤 → 撤离 → 成长</h3>
              <p>
                每天一次出勤，无倒计时。睡觉推进一天并扣 1 生命。有补给恢复 50
                精力，没有补给恢复 15。初始 12 生命。
              </p>
              <p>
                楼层由事件、搜索、解谜、商人和守卫组成。搜索后自行挑选物资，预留
                8 精力正常返回；完成守卫后撤离才会提交最高通关楼层。
              </p>
              <p>
                实体需要鉴定才成为卡牌。基地终端免费，楼层鉴定需携带仪器并消耗电荷。上阵卡不占背包，1–3
                格卡不可跨路。安全容器独立计量。
              </p>
              <p>
                回收扣
                3、5、7……生命，普通背包丢失。成功正常撤回重置连续救援计数；睡觉不重置。装备与基地保留，生命耗尽则本局结束。
              </p>
              <p>
                十层是本 Demo
                的完整范围，撤离第十层后结算。楼层使用离线种子重组，尚未接入大模型；机器人采用可解释的数值模拟。
              </p>
              <p>
                伤害默认命中同路前排卡牌，空路直击宿主。卡牌拥有独立生命，归零进入幽魂，期间视为空格且不发动、不承受效果。复活时间为
                首次 8 秒，每多死亡一次增加 2 秒（基础时间的
                25%），本场独立累计，新战斗重置。
                复活时满生命并重新冷却。减伤公式为原始伤害 × 100 ÷（100 +
                护甲），之后扣卡牌生命；只有直击宿主才扣宿主护盾与生命。治疗、护盾仍给宿主。脉冲线圈明确攻击其他路后排；多格卡算一个完整目标。我方右侧为前排，敌方左侧为前排，双方前排在中央相对。40
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
    </CargoProvider>
  );
}
