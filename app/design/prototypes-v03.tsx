'use client';
import { useState, useMemo, useEffect } from 'react';
import LegacyPrototype from './prototypes';
import {
  newDay,
  dayAction,
  newBots,
  botDay,
  rescueCost,
  safeCapacity,
} from '@/lib/prototype-v04';
import {
  Play,
  Pause,
  RotateCcw,
  ArrowUp,
  CloudRain,
  Zap,
  Lock,
  ArrowRight,
  Moon,
  Shield,
  Heart,
  ScanLine,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  CARDS,
  WEATHER,
  TALENTS,
  OPEN_FOUR,
  START_BOARD,
  duel,
  terrainFor,
  newCargo,
  cargoV03,
} from '@/lib/prototype-v03';
import { createWorld, rankEntries } from '@/lib/design-model';
import type { ModuleId } from '@/lib/design-data';
function Top({ title, reset }: { title: string; reset: () => void }) {
  return (
    <div className="ds-demo-top">
      <span>
        <i />
        {title}
      </span>
      <button className="ds-ghost" onClick={reset}>
        <RotateCcw />
        重置实验
      </button>
    </div>
  );
}
function Stats({ items }: { items: [string, string | number][] }) {
  return (
    <div className="ds-demo-stats">
      {items.map(([k, v]) => (
        <div key={k}>
          <span>{k}</span>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  );
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <output className="ds-demo-notice" aria-live="polite">
      {children}
    </output>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  options: string[];
}) {
  return (
    <label className="v3-select">
      {label}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((x, i) => (
          <option value={i} key={x}>
            {x}
          </option>
        ))}
      </select>
    </label>
  );
}
function DayDemo({ moduleId }: { moduleId: ModuleId }) {
  const [s, setS] = useState(newDay);
  const [target, setTarget] = useState(3);
  const [weather, setWeather] = useState(0);
  const [error, setError] = useState('');
  const [seed, setSeed] = useState(907);
  const world = useMemo(() => createWorld(seed), [seed]);
  const go = (action: string) => {
    try {
      setS(dayAction(s, action, target, weather));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const selected = world[target - 1];
  const reset = () => {
    setS(newDay());
    setError('');
    setTarget(3);
  };
  return (
    <div className="ds-prototype">
      <Top
        title={
          moduleId === 'world'
            ? 'WORLD / 访问权限与主目标'
            : moduleId === 'base'
              ? 'ELEVATOR SYSTEM / 电梯终端'
              : 'DAILY LOOP / 一天，一次出勤'
        }
        reset={reset}
      />
      <Stats
        items={[
          [`第 ${s.day} 天`, s.used ? '已出勤' : '未出勤'],
          ['生命维持配额', s.quota],
          ['精力', s.stamina],
          ['补给', s.supply],
        ]}
      />
      <div className="v3-day-body">
        <div className="v3-phase">
          <span className="ds-micro">
            {s.phase === 'floor'
              ? 'EXPEDITION ACTIVE'
              : s.phase === 'over'
                ? 'LIFE SUPPORT OFFLINE'
                : 'CABIN SYSTEM ONLINE'}
          </span>
          <h3>
            {s.phase === 'floor'
              ? `正在探索 ${s.floor} 层`
              : s.phase === 'over'
                ? '生命信号中断'
                : '电梯系统 · 等待指令'}
          </h3>
          <p>日期由睡觉推进。查看、搜索、摆牌都不会让一天自动过去。</p>
        </div>
        <div className="v3-resources">
          <span>电力 {s.power}</span>
          <span>材料 {s.material}</span>
          <span>战斗格 {s.slots} / 9</span>
          <span>探索包 {s.capacity}</span>
          <span>可达 {s.maxFloor} 层</span>
          <span>已通关 {s.best} 层</span>
        </div>
        {s.phase === 'base' && (
          <>
            <div className="v3-toolbar">
              <label className="v3-select" htmlFor="目的楼层">
                目的楼层
                <Input
                  id="目的楼层"
                  aria-label="目的楼层"
                  type="number"
                  min={s.floor}
                  max={100}
                  value={target}
                  onChange={(e) =>
                    setTarget(
                      Math.max(
                        1,
                        Math.min(100, Math.trunc(Number(e.target.value) || 1)),
                      ),
                    )
                  }
                />
              </label>
              <Select
                label="实验天气"
                value={weather}
                onChange={setWeather}
                options={WEATHER.map((w) => w.name)}
              />
              {moduleId === 'world' && (
                <button
                  className="ds-ghost"
                  onClick={() => setSeed((v) => v + 1)}
                >
                  新世界种子 {seed}
                </button>
              )}
            </div>
            {moduleId === 'world' && (
              <div className="v3-floor-grid">
                {world.map((f) => (
                  <button
                    key={f.id}
                    disabled={f.id < s.floor || f.id > s.maxFloor}
                    className={target === f.id ? 'selected' : ''}
                    onClick={() => setTarget(f.id)}
                  >
                    {f.id > s.maxFloor ? <Lock /> : f.id}
                  </button>
                ))}
              </div>
            )}
            <div className="v3-objective">
              <span>目的地 / {selected.name}</span>
              <h3>主目标：取得异常核心</h3>
              <p>
                {selected.anomaly} · {selected.nodes.join(' → ')}
              </p>
              <p>
                {WEATHER[weather].name}：{WEATHER[weather].explore}
              </p>
              <small>
                样例目标覆盖生成器的随机任务，用于验证统一的搜索和撤回流程。
                {target > s.maxFloor ? ' 此层尚未解锁。' : ''}
              </small>
            </div>
            <div className="ds-prototype-actions">
              <button
                className="ds-button"
                disabled={s.used || target > s.maxFloor || target < s.floor}
                onClick={() => go('depart')}
              >
                <ArrowUp />
                出勤
              </button>
              <button className="ds-ghost" onClick={() => go('sleep')}>
                <Moon />
                睡觉 / 下一天
              </button>
              <button
                className="ds-ghost"
                disabled={s.produced || s.material < 1 || s.power < 3}
                onClick={() => go('produce')}
              >
                生产补给 · 每日一次
              </button>
              <button
                className="ds-ghost"
                disabled={s.material < 6 || s.slots >= 9}
                onClick={() => go('upgrade')}
              >
                终端升级 · 6 材料
              </button>
              <button
                className="ds-ghost"
                disabled={s.material < 4 || s.capacity >= 20}
                onClick={() => go('bag')}
              >
                扩包 · 4 材料
              </button>
            </div>
          </>
        )}
        {s.phase === 'floor' && (
          <>
            <div className="v3-objective">
              <span>本层主目标</span>
              <h3>{s.objective ? '异常核心已取得' : '寻找异常核心'}</h3>
              <p>
                搜索进度 {s.searches} / {weather === 2 ? 3 : 2} ·{' '}
                {s.objective
                  ? '还需要成功撤回，才提交通关。'
                  : '每次搜索获得物资及线索。'}
              </p>
              <Progress
                value={Math.min(
                  100,
                  (s.searches / (weather === 2 ? 3 : 2)) * 100,
                )}
                aria-label="目标进度"
              />
            </div>
            <Stats
              items={[
                ['普通包物资', `${s.loot} 件 / ${s.loot * 2 + 2} 容积`],
                ['安全容器', `${s.safe * 2} / ${safeCapacity(s.slots)}`],
                ['本次通关', s.objective ? '待撤回' : '未完成'],
              ]}
            />
            <div className="ds-prototype-actions">
              <button className="ds-button" onClick={() => go('search')}>
                搜索 · 1 补给 / {weather === 2 ? 6 : 12} 精力
              </button>
              <button
                className="ds-ghost"
                disabled={
                  s.loot === 0 || (s.safe + 1) * 2 > safeCapacity(s.slots)
                }
                onClick={() => go('secure')}
              >
                移入安全容器
              </button>
              <button className="ds-ghost" onClick={() => go('extract')}>
                常规撤回 · 8 精力
              </button>
              <button className="ds-ghost ds-danger" onClick={() => go('fail')}>
                验收：战败救援 · {rescueCost(s.streak)} 配额
              </button>
            </div>
          </>
        )}
        {s.phase === 'over' && (
          <p className="v3-ending">
            本局最高已通关 {s.best}{' '}
            层。基地与装备保留是救援规则，配额耗尽仍会终结这一局。
          </p>
        )}
      </div>
      <Notice>{error || s.notice}</Notice>
      <p className="ds-prototype-footnote">
        独立流程实验，天气可手动设置用于比较。正式世界按楼层与游戏日冻结天气。数值、恢复量、扩容曲线均为待验收建议。
      </p>
    </div>
  );
}
function Inventory() {
  const [s, setS] = useState(newCargo);
  const [error, setError] = useState('');
  const go = (action: string, uid = '') => {
    try {
      setS(cargoV03(s, action, uid));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="ds-prototype">
      <Top
        title="CARGO / 可扩容背包与现场鉴定"
        reset={() => {
          setS(newCargo());
          setError('');
        }}
      />
      <Stats
        items={[
          [
            '探索包',
            `${s.bag.reduce((n, x) => n + x.size, 0)} / ${s.capacity}`,
          ],
          ['电荷', s.charges],
          ['材料', s.material],
          ['日期', '第 1 天'],
        ]}
      />
      <div className="ds-inventory-grid">
        <div>
          <h3>携带物品</h3>
          <div className="ds-cargo-list">
            {s.bag.map((x) => (
              <div key={x.uid}>
                <ScanLine />
                <div>
                  <strong>{x.name}</strong>
                  <small>
                    {x.size} 容积 ·{' '}
                    {x.kind === 'card'
                      ? TALENTS[x.rarity!].name
                      : '实体 / 无稀有度'}
                  </small>
                </div>
                <div className="ds-cargo-actions">
                  {x.kind === 'physical' && (
                    <button
                      className="ds-mini-button"
                      onClick={() => go('scan', x.uid)}
                    >
                      鉴定
                    </button>
                  )}
                  <button
                    className="ds-mini-button"
                    onClick={() => go('drop', x.uid)}
                  >
                    放下
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="ds-prototype-actions">
            <button
              className="ds-button"
              disabled={s.material < 4 || s.capacity >= 20}
              onClick={() => go('expand')}
            >
              扩容 +4 · 4 材料
            </button>
          </div>
        </div>
        <div className="ds-ground-list">
          <h3>节点地面</h3>
          {s.available.map((x) => (
            <button key={x.uid} onClick={() => go('take', x.uid)}>
              <span>
                {x.name}
                <small>
                  {x.size} 容积
                  {x.kind === 'card' ? ` · ${TALENTS[x.rarity!].name}` : ''}
                </small>
              </span>
              <ArrowRight />
            </button>
          ))}
          <p>扫描不降低体积、不推进日期。安全容器与救援损失在探索页验证。</p>
          {Object.keys(s.receipts).length > 0 && (
            <button
              className="ds-ghost"
              onClick={() => go('scan', Object.keys(s.receipts)[0])}
            >
              重发首次鉴定请求
            </button>
          )}
        </div>
      </div>
      <Notice>{error || s.notice}</Notice>
    </div>
  );
}
function Growth() {
  const [card, setCard] = useState(1);
  const [rarity, setRarity] = useState(1);
  const [quality, setQuality] = useState(0);
  const [level, setLevel] = useState(0);
  const [material, setMaterial] = useState(40);
  const [invested, setInvested] = useState(0);
  const [destroyed, setDestroyed] = useState(false);
  const c = CARDS[card];
  const reset = () => {
    setQuality(0);
    setLevel(0);
    setMaterial(40);
    setInvested(0);
    setDestroyed(false);
  };
  const power =
    c.kind === 'charge'
      ? (c.power + level * 0.1).toFixed(1)
      : Math.round(
          c.power * TALENTS[rarity].base + level * 3 * TALENTS[rarity].growth,
        );
  return (
    <div className="ds-prototype">
      <Top title="CARD EVOLUTION / 效果与数值分工" reset={reset} />
      <div className="v3-toolbar">
        <Select
          label="加载样卡"
          value={card}
          options={CARDS.map((c) => c.name)}
          onChange={(v) => {
            setCard(v);
            reset();
          }}
        />
        <Select
          label="已鉴定样本稀有度"
          value={rarity}
          options={TALENTS.map((t) => t.name)}
          onChange={(v) => {
            setRarity(v);
            reset();
          }}
        />
      </div>
      <div className="v3-growth">
        <article className="v3-card-detail">
          <span>{TALENTS[rarity].name} · 稀有度锁定</span>
          <h3>{c.name}</h3>
          <strong>
            {power}
            <small>
              {c.kind === 'charge'
                ? '秒冷却推进'
                : c.kind === 'heal'
                  ? '主人治疗'
                  : c.kind === 'shield'
                    ? '主人护盾'
                    : '主人伤害'}
            </small>
          </strong>
          <p>基础：每 {c.cd} 秒发动。</p>
          <p className={quality > 0 ? 'unlocked' : 'locked'}>
            {quality > 0 ? '已解锁' : '待解锁'} · 精制：{c.effect}
          </p>
          <p className={quality > 1 ? 'unlocked' : 'locked'}>
            {quality > 1 ? '已解锁' : '待解锁'} · 大师：{c.master}
          </p>
        </article>
        <div>
          <Stats
            items={[
              ['品质', ['基础', '精制', '大师'][quality]],
              ['强化', `+${level}`],
              ['材料', material],
            ]}
          />
          <div className="v3-growth-actions">
            <button
              className="ds-button"
              disabled={
                destroyed || quality >= 2 || material < 8 * (quality + 1)
              }
              onClick={() => {
                const cost = 8 * (quality + 1);
                setMaterial((m) => m - cost);
                setInvested((i) => i + cost);
                setQuality((q) => q + 1);
              }}
            >
              品质解锁 · {8 * (quality + 1)} 材料
            </button>
            <button
              className="ds-ghost"
              disabled={destroyed || level >= 5 || material < 2 * (level + 1)}
              onClick={() => {
                const cost = 2 * (level + 1);
                setMaterial((m) => m - cost);
                setInvested((i) => i + cost);
                setLevel((l) => l + 1);
              }}
            >
              数值强化 · {2 * (level + 1)} 材料
            </button>
            <button
              className="ds-ghost ds-danger"
              disabled={destroyed}
              onClick={() => {
                setMaterial((m) => m + 3 + Math.floor(invested * 0.7));
                setDestroyed(true);
              }}
            >
              拆解样例 · 返还 {3 + Math.floor(invested * 0.7)} 材料
            </button>
          </div>
          <p className="ds-prototype-footnote">
            品质解锁描述，不使用统一伤害倍率。强化只提升该卡的主数值。战斗实验单独加载整套品质，暂不读取本页养成状态。
          </p>
        </div>
      </div>
      <div className="v3-probabilities">
        {TALENTS.map((t) => (
          <span key={t.name}>
            {t.name}
            <b>{t.chance}%</b>
          </span>
        ))}
      </div>
      <Notice>
        {destroyed
          ? '卡牌已拆解；可以重置加载新样本。'
          : '稀有度切换是验收样本加载，不是正式培养操作。品质、强化、稀有度承担不同作用。'}
      </Notice>
    </div>
  );
}
function Combat() {
  const [mode, setMode] = useState<'weather' | 'power'>('weather');
  const [weather, setWeather] = useState(0);
  const [layout, setLayout] = useState(0);
  const [full, setFull] = useState(false);
  const [quality, setQuality] = useState(1);
  const [board, setBoard] = useState(START_BOARD);
  const [selected, setSelected] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState(
    '先点一个开放格位，再点样卡放入；重复选择已有卡会移动或交换位置。',
  );
  const terrain = terrainFor(weather, layout);
  const result = useMemo(
    () => duel(board, weather, layout, mode, quality),
    [board, weather, layout, mode, quality],
  );
  const frame = result.frames[Math.min(cursor, result.frames.length - 1)];
  const resetPlayback = () => {
    setCursor(0);
    setPlaying(false);
  };
  const reset = () => {
    setBoard([...START_BOARD]);
    setFull(false);
    setSelected(0);
    resetPlayback();
  };
  useEffect(() => {
    if (!playing || cursor >= result.frames.length - 1) return;
    const timer = setTimeout(() => setCursor((v) => v + 1), 100);
    return () => clearTimeout(timer);
  }, [playing, cursor, result]);
  const place = (id: string | null) => {
    setBoard((old) => {
      const b = [...old];
      const prior = id ? b.indexOf(id) : -1;
      if (prior >= 0) b[prior] = b[selected];
      b[selected] = id;
      return b;
    });
    resetPlayback();
    setNotice('布局已更新，当前战斗快照重新计算。');
  };
  return (
    <div className="ds-prototype">
      <Top title="COMBAT LAB / 两个独立候选" reset={reset} />
      <div className="v3-mode-tabs">
        <button
          className={mode === 'weather' ? 'selected' : ''}
          onClick={() => {
            setMode('weather');
            resetPlayback();
          }}
        >
          <CloudRain />A · 三路与天气
        </button>
        <button
          className={mode === 'power' ? 'selected' : ''}
          onClick={() => {
            setMode('power');
            resetPlayback();
          }}
        >
          <Zap />B · 共享供能
        </button>
      </div>
      <div className="v3-toolbar">
        {mode === 'weather' && (
          <>
            <Select
              label="实验天气"
              value={weather}
              onChange={(v) => {
                setWeather(v);
                resetPlayback();
              }}
              options={WEATHER.map((w) => w.name)}
            />
            <button
              className="ds-ghost"
              onClick={() => {
                setLayout((v) => (v + 1) % 3);
                resetPlayback();
              }}
            >
              轮换地形分配
            </button>
          </>
        )}
        <Select
          label="整套样卡品质"
          value={quality}
          onChange={(v) => {
            setQuality(v);
            resetPlayback();
          }}
          options={['基础', '精制', '大师']}
        />
        <button
          className="ds-ghost"
          onClick={() => {
            setFull((v) => !v);
            setBoard([...START_BOARD]);
            setSelected(0);
            resetPlayback();
          }}
        >
          {full ? '恢复初始四格' : '加载九格实验'}
        </button>
      </div>
      <div className="v3-battle-owners">
        {['你 / 幸存者 001', '固定对手 / 四张精制卡'].map((name, i) => (
          <div key={name}>
            <span>{name}</span>
            <strong>
              <Heart />
              {Math.ceil(frame.hp[i])}
              <small>/ 220</small>
              <Shield />
              {Math.round(frame.shield[i])}
            </strong>
            <Progress
              value={(frame.hp[i] / 220) * 100}
              aria-label={name + '生命'}
            />
            {mode === 'power' && (
              <p>能量 {frame.energy[i].toFixed(1)} / 10 · 每秒 +1</p>
            )}
          </div>
        ))}
      </div>
      <div className="v3-lanes">
        {['上路', '中路', '下路'].map((lane, row) => (
          <div className="v3-lane" key={lane}>
            <div className="v3-lane-label">
              <strong>{lane}</strong>
              <span>{mode === 'weather' ? terrain[row] : '共享供能'}</span>
              <small>
                {mode === 'weather'
                  ? terrain[row] === '寒冷' || terrain[row] === '强风'
                    ? '冷却 +0.75s'
                    : '条件效果由卡牌定义'
                  : '上 → 中 → 下优先'}
              </small>
            </div>
            <div className="v3-slots">
              {[0, 1, 2].map((col) => {
                const slot = row * 3 + col;
                const unlocked = full || OPEN_FOUR.includes(slot);
                const c = CARDS.find((c) => c.id === board[slot]);
                return (
                  <button
                    key={slot}
                    className={`${selected === slot ? 'selected ' : ''}${frame.fired.includes('0-' + slot) ? 'fired' : ''}`}
                    disabled={!unlocked}
                    onClick={() => setSelected(slot)}
                    aria-label={`${lane}第 ${col + 1} 格${c ? ' ' + c.name : ''}`}
                  >
                    <span className="v3-slot-num">0{slot + 1}</span>
                    {!unlocked ? (
                      <>
                        <Lock />
                        <span>尚未解锁</span>
                      </>
                    ) : c ? (
                      <>
                        <strong>{c.name}</strong>
                        <small>
                          {c.cd}s{mode === 'power' ? ` / ${c.cost} 能量` : ''}
                        </small>
                        <Progress
                          value={Math.min(
                            100,
                            (frame.progress[0][slot] / c.cd) * 100,
                          )}
                          aria-label={c.name + '冷却'}
                        />
                        {mode === 'power' &&
                          frame.progress[0][slot] >= c.cd &&
                          frame.energy[0] < c.cost && <em>等待供能</em>}
                      </>
                    ) : (
                      <span>空位 / 点击选中</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="v3-catalog">
        <div className="v3-catalog-heading">
          给第 {selected + 1} 格选择卡牌
          <button className="ds-ghost" onClick={() => place(null)}>
            清空此格
          </button>
        </div>
        <div>
          {CARDS.map((c) => (
            <button
              key={c.id}
              onClick={() => place(c.id)}
              className={board[selected] === c.id ? 'selected' : ''}
            >
              <strong>{c.name}</strong>
              <small>
                {quality
                  ? c.effect
                  : `每 ${c.cd} 秒发动基础${c.kind === 'damage' ? '伤害' : c.kind === 'heal' ? '治疗' : c.kind === 'charge' ? '充能' : '护盾'}。`}
              </small>
            </button>
          ))}
        </div>
      </div>
      <div className="ds-play-controls">
        <button
          className="ds-button"
          onClick={() => {
            if (cursor >= result.frames.length - 1) {
              setCursor(0);
              setPlaying(true);
            } else setPlaying((v) => !v);
          }}
        >
          {playing ? <Pause /> : <Play />}
          {playing ? '暂停' : '播放战斗'}
        </button>
        <button
          className="ds-ghost"
          onClick={() => {
            setCursor(Math.min(cursor + 1, result.frames.length - 1));
            setPlaying(false);
          }}
        >
          单步 +0.25s
        </button>
        <button
          className="ds-ghost"
          onClick={() => {
            setCursor(result.frames.length - 1);
            setPlaying(false);
          }}
        >
          查看结算
        </button>
        <span>{frame.time.toFixed(2)}s · 播放 2.5×</span>
      </div>
      <div className="v3-battle-log">
        {frame.log.length ? (
          frame.log.map((e, i) => <p key={i}>{e}</p>)
        ) : (
          <p>
            等待自动战斗。对手：上路水果刀，中路蓄热砖＋遮雨棚，下路导电索。
          </p>
        )}
      </div>
      <Notice>
        {cursor >= result.frames.length - 1
          ? `${result.winner} · 剩余生命 ${Math.ceil(frame.hp[0])} : ${Math.ceil(frame.hp[1])}`
          : notice}
      </Notice>
      <p className="ds-prototype-footnote">
        卡牌没有生命值，伤害与治疗作用主人；不限制同路对抗。40
        秒后增加双方消耗伤害防止僵局。供能模式关闭天气条件。此页是独立战斗切片，非完整游戏。
      </p>
    </div>
  );
}
function Survivors() {
  const [s, setS] = useState(newBots);
  const [floor, setFloor] = useState(3);
  const [viewed, setViewed] = useState<number[]>([]);
  return (
    <div className="ds-prototype">
      <Top
        title="99 SURVIVORS / 配额统一规则"
        reset={() => {
          setS(newBots());
          setViewed([]);
        }}
      />
      <Stats
        items={[
          ['日期', s.day],
          ['存活机器人', s.bots.filter((b) => b.alive).length],
          ['本日回收失败者', s.rescued],
          ['永久淘汰', s.bots.filter((b) => !b.alive).length],
        ]}
      />
      <div className="v3-toolbar">
        <button
          className="ds-button"
          disabled={s.bots.every((b) => !b.alive)}
          onClick={() => setS(botDay(s))}
        >
          <Moon />
          睡觉，推进一天摘要
        </button>
        <label className="v3-select" htmlFor="查看楼层">
          查看楼层
          <Input
            id="查看楼层"
            aria-label="查看楼层"
            type="number"
            min={1}
            max={100}
            value={floor}
            onChange={(e) =>
              setFloor(
                Math.max(
                  1,
                  Math.min(100, Math.trunc(Number(e.target.value) || 1)),
                ),
              )
            }
          />
        </label>
        <button
          className="ds-ghost"
          onClick={() => setViewed((v) => [...new Set([...v, floor])])}
        >
          展开此层详情
        </button>
      </div>
      <div className="v3-ledger-summary">
        第 {floor} 层：初始 {s.initial[floor - 1]} − 已取{' '}
        {s.initial[floor - 1] - s.stock[floor - 1]} = 剩余{' '}
        <b>{s.stock[floor - 1]}</b>
        <small>
          {viewed.includes(floor)
            ? '详情已展开，读取同一账本。'
            : '尚未展开详情，已有消耗仍保留。'}
        </small>
      </div>
      <div className="ds-bot-grid v3-bots">
        {s.bots.map((b) => (
          <button
            key={b.id}
            className={b.alive ? '' : 'dead'}
            title={`${b.id} / 第 ${b.floor} 层 / 配额 ${b.quota} / 战力 ${b.power}`}
            onClick={() => setFloor(b.floor)}
          >
            {b.id}
            <small>{b.alive ? b.quota : '×'}</small>
          </button>
        ))}
      </div>
      <div className="v3-battle-log">
        {s.log.slice(-8).map((e, i) => (
          <p key={i}>{e}</p>
        ))}
      </div>
      <Notice>
        每人初始 12 配额，每天 −1，失败额外
        −3。仅配额归零永久淘汰；本页不消耗玩家实验的配额。
      </Notice>
    </div>
  );
}
function Ranking() {
  const [reached, setReached] = useState(18);
  const [best, setBest] = useState(12);
  const [day, setDay] = useState(5);
  const [dead, setDead] = useState(false);
  const rows = rankEntries([
    {
      id: '你',
      cleared: best,
      reached,
      cycles: day,
      alive: !dead,
      exit: false,
    },
    {
      id: '幸存者 037',
      cleared: 22,
      reached: 24,
      cycles: 8,
      alive: false,
      exit: false,
    },
    {
      id: '幸存者 082',
      cleared: 12,
      reached: 13,
      cycles: 5,
      alive: true,
      exit: false,
    },
    {
      id: '幸存者 014',
      cleared: 8,
      reached: 100,
      cycles: 3,
      alive: false,
      exit: false,
    },
  ]);
  return (
    <div className="ds-prototype">
      <Top
        title="RANK / 记录的是通关高度"
        reset={() => {
          setReached(18);
          setBest(12);
          setDay(5);
          setDead(false);
        }}
      />
      <div className="v3-toolbar">
        <label className="v3-select" htmlFor="最高到达">
          最高到达
          <Input
            id="最高到达"
            aria-label="最高到达"
            type="number"
            min={best}
            max={100}
            value={reached}
            onChange={(e) =>
              setReached(
                Math.max(best, Math.min(100, Number(e.target.value) || best)),
              )
            }
          />
        </label>
        <label className="v3-select" htmlFor="达标日数">
          达标日数
          <Input
            id="达标日数"
            aria-label="达标日数"
            type="number"
            min={1}
            max={99}
            value={day}
            onChange={(e) =>
              setDay(Math.max(1, Math.min(99, Number(e.target.value) || 1)))
            }
          />
        </label>
        <button
          className="ds-button"
          disabled={dead || reached <= best}
          onClick={() => setBest(reached)}
        >
          验收：提交目标＋撤回凭证
        </button>
        <button
          className="ds-ghost"
          disabled={dead}
          onClick={() => setDead(true)}
        >
          验收：配额耗尽
        </button>
      </div>
      <div className="v3-ranking">
        {rows.map((r) => (
          <div key={r.id}>
            <b>#{r.rank}</b>
            <strong>{r.id}</strong>
            <span>通关 {r.cleared} 层</span>
            <span>到达 {r.reached} 层</span>
            <span>第 {r.cycles} 天</span>
            <small>{r.alive ? '存活' : '永久淘汰'}</small>
          </div>
        ))}
      </div>
      <Notice>
        到达高度不会自动算分，永久淘汰保留已经提交的成绩。百层最终决斗将在完整游戏中单独验证。
      </Notice>
    </div>
  );
}
export default function PrototypeV03({ moduleId }: { moduleId: ModuleId }) {
  if (moduleId === 'overview')
    return (
      <>
        <LegacyPrototype moduleId={'overview'} />
        <div style={{ height: 24 }} />
        <DayDemo moduleId={moduleId} />
      </>
    );
  if (moduleId === 'combat') return <Combat />;
  if (moduleId === 'cards') return <Growth />;
  if (moduleId === 'inventory') return <Inventory />;
  if (moduleId === 'survivors') return <Survivors />;
  if (moduleId === 'ranking') return <Ranking />;
  return <DayDemo moduleId={moduleId} />;
}
