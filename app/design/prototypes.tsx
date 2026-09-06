'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  ArrowUp,
  ArrowRight,
  RotateCcw,
  Radio,
  Check,
  Box,
  ScanLine,
  Backpack,
  Package,
  Apple,
  ChevronRight,
  Shield,
  Swords,
  Zap,
  Bed,
  Monitor,
  Plus,
  Users,
  Skull,
  Play,
  Pause,
  Layers,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Route,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  createWorld,
  expeditionStart,
  expeditionAction,
  cargoStart,
  cargoAction,
  cargoVolume,
  QUALITY,
  RARITIES,
  cardPower,
  newLedger,
  tickLedger,
  rankEntries,
} from '@/lib/design-model';
import type { ExpeditionAction, RankEntry } from '@/lib/design-model';
import type { ModuleId } from '@/lib/design-data';
import { simulate } from '@/lib/game-engine';
export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <Table className="ds-data-table">
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c}>{c}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            {row.map((cell, j) => (
              <TableCell key={j}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
function DemoTop({
  title,
  onReset,
  children,
}: {
  title: string;
  onReset: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="ds-demo-top">
      <span>
        <i />
        {title}
      </span>
      <div>
        {children}
        <button className="ds-ghost" onClick={onReset}>
          <RotateCcw />
          重置样例
        </button>
      </div>
    </div>
  );
}
function DemoStats({
  values,
}: {
  values: { label: string; value: string | number; icon?: React.ReactNode }[];
}) {
  return (
    <div className="ds-demo-stats">
      {values.map((x) => (
        <div key={x.label}>
          <span>
            {x.icon}
            {x.label}
          </span>
          <strong>{x.value}</strong>
        </div>
      ))}
    </div>
  );
}
function IntroDemo() {
  const [awake, setAwake] = useState(false);
  const [inspected, setInspected] = useState('');
  const [reply, setReply] = useState('');
  return (
    <div className="ds-intro-prototype">
      <div className="ds-cabin-controls">
        <span className="ds-micro">ELEVATOR 001 / PRIVATE CABIN</span>
        <div className="ds-floor-display">
          <ArrowUp />
          <b>01</b>
          <span>
            LEVEL
            <br />
            ONE WAY ONLY
          </span>
        </div>
        <div className="ds-cabin-plan">
          <button
            onClick={() =>
              setInspected('一张床。休息能恢复精力，但需要补给并推进全局周期。')
            }
          >
            BED / 床
          </button>
          <div className="ds-table">
            <span>TABLE / 桌面</span>
            {['水果刀', '苹果', '打火机'].map((x) => (
              <button
                key={x}
                onClick={() =>
                  setInspected(
                    `${x}：一件实体物品，还没有卡牌稀有度。可以使用，也可以交给电梯系统鉴定。`,
                  )
                }
              >
                {x}
              </button>
            ))}
          </div>
        </div>
        <output className="ds-cabin-inspection">
          {inspected || '你醒了。四周没有窗户，只有一部停着的电梯。'}
        </output>
      </div>
      <div className="ds-terminal">
        <div className="ds-terminal-header">
          <span>
            <i />
            SYSTEM CONNECTION
          </span>
          <Radio />
        </div>
        <div className="ds-terminal-body">
          <span className="ds-terminal-code">PROTOCOL_100</span>
          <h3>{awake ? '欢迎加入，幸存者 001。' : '你终于醒了。'}</h3>
          <p>
            {awake
              ? '你已加入了这场幸存者游戏。参与者有 100 人，每人都在一部独立电梯里。电梯可以前往 1—100 层，只能上，不能下。越高层总体越危险，奖励也越好。'
              : '屏幕还没有亮起。桌上放着一把水果刀、一个苹果和一个打火机。你准备开口。'}
          </p>
          {awake && <p className="ds-reply">{reply}</p>}
          {!awake ? (
            <div className="ds-terminal-choices">
              <button
                onClick={() => {
                  setAwake(true);
                  setReply('这里是你的电梯，也是你目前唯一安全的地方。');
                }}
              >
                这是哪儿？ <ArrowRight />
              </button>
              <button
                onClick={() => {
                  setAwake(true);
                  setReply(
                    '你可以把这里称作梦。但失去生命信号的人，不会再醒来。',
                  );
                }}
              >
                我在做一个什么奇葩的梦？ <ArrowRight />
              </button>
            </div>
          ) : (
            <div className="ds-terminal-ready">
              <Check />
              参与协议已展示{' '}
              <button onClick={() => setAwake(false)}>重播开场</button>
            </div>
          )}
        </div>
        <div className="ds-dispense">
          <span />
          OBJECT DELIVERY PORT
        </div>
      </div>
    </div>
  );
}
function WorldDemo() {
  const [seed, setSeed] = useState(907);
  const [input, setInput] = useState('907');
  const [fallback, setFallback] = useState(false);
  const [selected, setSelected] = useState(12);
  const [current, setCurrent] = useState(7);
  const [power, setPower] = useState(24);
  const [notice, setNotice] = useState(
    '样例只使用本地组合器；没有调用真实大模型。',
  );
  const world = useMemo(() => createWorld(seed, fallback), [seed, fallback]);
  const floor = world[selected - 1];
  const cost = 2 + Math.ceil((selected - current) / 5);
  return (
    <div className="ds-prototype">
      <DemoTop
        title="WORLD INITIALIZATION / 楼层实验台"
        onReset={() => {
          setCurrent(7);
          setPower(24);
          setSelected(12);
          setNotice('当前位置恢复到 7 层，当前世界蓝图未变化。');
        }}
      >
        <span className="ds-mini-badge">本地生成样例</span>
      </DemoTop>
      <div className="ds-world-toolbar">
        <label htmlFor="world-seed">
          世界种子
          <Input
            id="world-seed"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="世界种子"
          />
        </label>
        <button
          className="ds-button"
          onClick={() => {
            const n = Number(input);
            if (!Number.isSafeInteger(n) || n < 0 || n > 4294967295) {
              setNotice('请输入 0—4294967295 的整数种子。');
              return;
            }
            setSeed(n);
            setCurrent(7);
            setPower(24);
            setNotice(`已冻结种子 ${n} 的 100 层蓝图。`);
          }}
        >
          按种子初始化
        </button>
        <button
          className="ds-ghost"
          onClick={() => {
            setSeed((s) => s + 1);
            setInput(String(seed + 1));
            setCurrent(7);
            setPower(24);
            setNotice('已换成新的一局。查看同一层的主题和节点变化。');
          }}
        >
          <RotateCcw />
          换一局
        </button>
        <label htmlFor="world-fallback" className="ds-checkbox-label">
          <Checkbox
            id="world-fallback"
            checked={fallback}
            onCheckedChange={(v) => {
              setFallback(!!v);
              setNotice(
                v
                  ? '模拟模型校验失败，已走合法模板回退。'
                  : '恢复正常样例生成流程。',
              );
            }}
          />
          演示生成失败
        </label>
      </div>
      <div className="ds-world-grid">
        <div className="ds-floor-picker">
          <span className="ds-micro">100 FLOORS / 只能上行</span>
          <div>
            {world.map((f) => (
              <button
                key={f.id}
                disabled={f.id <= current}
                className={selected === f.id ? 'selected' : ''}
                onClick={() => setSelected(f.id)}
                aria-label={`选择第 ${f.id} 层`}
              >
                {String(f.id).padStart(2, '0')}
              </button>
            ))}
          </div>
          <p>
            当前 {current} 层 · 电力 {power}
            <br />
            已离开的低层永久关闭。
          </p>
        </div>
        <div className="ds-floor-detail">
          <div className="ds-floor-tag">
            <span>FLOOR {String(selected).padStart(3, '0')}</span>
            <b>{fallback ? 'FALLBACK · 模板回退' : 'VALIDATED · 结构通过'}</b>
          </div>
          <h3>{floor.name}</h3>
          <p className="ds-anomaly">{floor.anomaly}</p>
          <div className="ds-floor-info">
            <span>
              <AlertTriangle />
              {floor.hazard}
            </span>
            <span>
              <Package />
              {floor.resource}
            </span>
            <span>
              <Route />
              {floor.objective}
            </span>
          </div>
          <div className="ds-node-chain">
            {floor.nodes.map((n, i) => (
              <span key={i}>
                {n}
                {i < floor.nodes.length - 1 && <ChevronRight />}
              </span>
            ))}
          </div>
          <div className="ds-floor-bottom">
            <span>
              风险预算 <b>{floor.budget}</b>
              <small>奖励与挑战按预算绑定</small>
            </span>
            <button
              className="ds-button"
              disabled={selected <= current || cost > power}
              onClick={() => {
                setPower((p) => p - cost);
                setCurrent(selected);
                setNotice(
                  `电梯上行到 ${selected} 层，消耗 ${cost} 电力。到达不增加通关成绩。`,
                );
              }}
            >
              <ArrowUp />
              上行 · {cost} 电力
            </button>
          </div>
        </div>
      </div>
      <Tabs defaultValue="pipeline" className="ds-prototype-tabs">
        <TabsList>
          <TabsTrigger value="pipeline">生成与校验链</TabsTrigger>
          <TabsTrigger value="blueprint">本层蓝图字段</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline">
          <div className="ds-pipeline">
            {[
              '生成语义蓝图',
              '结构 / 引用校验',
              '预算 / 可解性校验',
              fallback ? '两次修复失败 → 模板' : '冻结内容哈希',
              '按需展开场景',
            ].map((x, i) => (
              <span key={x}>
                <b>0{i + 1}</b>
                {x}
              </span>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="blueprint">
          <pre className="ds-code">
            {JSON.stringify({ runSeed: seed, ...floor }, null, 2)}
          </pre>
        </TabsContent>
      </Tabs>
      <output className="ds-demo-notice">{notice}</output>
    </div>
  );
}
function ExpeditionDemo() {
  const [s, setS] = useState(expeditionStart);
  const [error, setError] = useState('');
  const go = (type: ExpeditionAction) => {
    try {
      setS(expeditionAction(s, type));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="ds-prototype">
      <DemoTop
        title="FLOOR 012 / 撤离协议样例"
        onReset={() => {
          setS(expeditionStart());
          setError('');
        }}
      />
      <DemoStats
        values={[
          { label: '补给', value: s.supply, icon: <Apple /> },
          { label: '精力', value: s.stamina, icon: <Zap /> },
          {
            label: '背包容积',
            value: `${s.carried} / ${s.bagCapacity}`,
            icon: <Backpack />,
          },
          { label: '警戒', value: s.noise, icon: <Radio /> },
        ]}
      />
      <div className="ds-expedition-map">
        <div className="ds-path">
          {['电梯入口', '失重走廊', '封闭金库', '异常核心'].map((x, i) => (
            <div
              className={s.node === i ? 'active' : s.node > i ? 'done' : ''}
              key={x}
            >
              <span>{s.node > i ? <Check /> : `0${i + 1}`}</span>
              <strong>{x}</strong>
              <small>
                {['安全整备', '探索 / 线索', '谜题 / 战斗', '主目标'][i]}
              </small>
            </div>
          ))}
        </div>
        <div className="ds-extraction-state">
          <span className="ds-micro">EXTRACTION STATUS</span>
          <h3>
            {s.phase === 'extracted'
              ? '已经回到电梯'
              : s.phase === 'dead'
                ? '生命信号中断'
                : s.phase === 'returning'
                  ? `返回途中 · 还剩 ${s.returnLeft} 节点`
                  : s.objective
                    ? '主目标完成，尚未保全'
                    : '探索进行中'}
          </h3>
          <p>
            {s.objective
              ? '现在撤回可提交通关，继续搜刮则要承担损失本次成绩的风险。'
              : '可以提前撤回保住物资；最高通关不会因此增加。'}
          </p>
          <div className="ds-loot-tags">
            {s.loot.length ? (
              s.loot.map((x, i) => (
                <span key={i}>
                  <Box />
                  {x} · 实体
                </span>
              ))
            ) : (
              <span>尚未携带战利品</span>
            )}
          </div>
          <div className="ds-prototype-actions">
            {s.phase === 'exploring' && (
              <>
                <button
                  className="ds-button"
                  disabled={s.objective}
                  onClick={() => go('advance')}
                >
                  推进路线 <ArrowRight />
                </button>
                <button className="ds-ghost" onClick={() => go('search')}>
                  搜刮 · 1 补给 / 8 精力
                </button>
                <button className="ds-ghost" onClick={() => go('retreat')}>
                  常规撤离 · {Math.max(1, s.node + 1)} 补给
                </button>
                <button className="ds-ghost" onClick={() => go('emergency')}>
                  使用紧急回程器
                </button>
              </>
            )}
            {s.phase === 'returning' && (
              <>
                <button className="ds-button" onClick={() => go('return-step')}>
                  经过下一个返回节点
                </button>
                <button
                  className="ds-ghost ds-danger"
                  onClick={() => go('defeat')}
                >
                  验收：演示撤离战败
                </button>
              </>
            )}
            {s.phase === 'extracted' && (
              <span className="ds-success">
                <CheckCircle2 />
                物资已保全 · 最高通关 {s.best} 层
              </span>
            )}
            {s.phase === 'dead' && (
              <span className="ds-danger">
                <Skull />
                携带物资丢失 · 旧纪录 {s.best} 层保留
              </span>
            )}
          </div>
        </div>
      </div>
      <output className="ds-demo-notice">{error || s.notice}</output>
      <p className="ds-prototype-footnote">
        固定验收场景。推进路线用预设成功结果展示流程；战斗细节在模块 06
        验收。返回每节点消耗 4 精力、1 补给。
      </p>
    </div>
  );
}
function InventoryDemo() {
  const [s, setS] = useState(cargoStart);
  const [error, setError] = useState('');
  const go = (type: 'take' | 'drop' | 'scan', uid: string) => {
    try {
      setS(cargoAction(s, type, uid));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const used = cargoVolume(s);
  return (
    <div className="ds-prototype">
      <DemoTop
        title="FIELD KIT / 现场背包与扫描"
        onReset={() => {
          setS(cargoStart());
          setError('');
        }}
      />
      <DemoStats
        values={[
          { label: '探索背包', value: `${used} / 12`, icon: <Backpack /> },
          { label: '扫描电荷', value: `${s.charges} / 2`, icon: <ScanLine /> },
          {
            label: '已转换实体',
            value: Object.keys(s.receipts).length,
            icon: <Layers />,
          },
          { label: '扫描已用周期', value: s.cycles, icon: <Radio /> },
        ]}
      />
      <div className="ds-inventory-grid">
        <div>
          <h3>
            携带物 <small>带入物与战利品共用容量</small>
          </h3>
          <div className="ds-capacity-cells">
            {Array.from({ length: 12 }, (_, i) => (
              <span className={i < used ? 'filled' : ''} key={i}>
                {String(i + 1).padStart(2, '0')}
              </span>
            ))}
          </div>
          <div className="ds-cargo-list">
            {s.bag.map((x) => (
              <div key={x.uid} className={x.kind === 'card' ? 'is-card' : ''}>
                <span>{x.kind === 'card' ? <Layers /> : <Box />}</span>
                <div>
                  <strong>{x.name}</strong>
                  <small>
                    {x.kind === 'card'
                      ? `${RARITIES[x.rarity!].name} · 封装卡`
                      : x.kind === 'device'
                        ? '探索工具'
                        : x.kind === 'supply'
                          ? '生存补给'
                          : '未鉴定实体'}{' '}
                    · {x.size} 容积
                  </small>
                </div>
                <div className="ds-cargo-actions">
                  {x.kind === 'physical' && (
                    <button
                      onClick={() => go('scan', x.uid)}
                      className="ds-mini-button"
                    >
                      鉴定
                    </button>
                  )}
                  <button
                    onClick={() => go('drop', x.uid)}
                    className="ds-mini-button"
                    aria-label={`放下${x.name}`}
                  >
                    放下
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="ds-ground-list">
          <h3>当前节点物资</h3>
          <p>别人拿走或你放下的物资，都保留原对象身份。</p>
          {s.available.map((x) => (
            <button key={x.uid} onClick={() => go('take', x.uid)}>
              <Box />
              <span>
                {x.name}
                <small>
                  {x.size} 容积
                  {x.kind === 'card' ? ` / ${RARITIES[x.rarity!].name}卡` : ''}
                </small>
              </span>
              <Plus />
            </button>
          ))}
          <div className="ds-scan-tip">
            <Lock />
            <p>
              实体没有稀有度字段。首次扫描创建稀有度，之后不能通过丢弃或再次扫描重抽。
            </p>
          </div>
          {Object.keys(s.receipts).length > 0 && (
            <button
              className="ds-ghost"
              onClick={() => go('scan', Object.keys(s.receipts)[0])}
            >
              验收：重发首次鉴定请求
            </button>
          )}
        </div>
      </div>
      <output className="ds-demo-notice">{error || s.notice}</output>
    </div>
  );
}
function CardsDemo() {
  const [rarity, setRarity] = useState(1);
  const [quality, setQuality] = useState(0);
  const [level, setLevel] = useState(0);
  const [material, setMaterial] = useState(40);
  const [essence, setEssence] = useState(3);
  const [invested, setInvested] = useState(0);
  const [destroyed, setDestroyed] = useState(false);
  const [notice, setNotice] = useState(
    '当前卡牌稀有度已经锁定。下面的“加载样本”用于比较不同卡，不是培养功能。',
  );
  const reset = (r = 1) => {
    setRarity(r);
    setQuality(0);
    setLevel(0);
    setMaterial(40);
    setEssence(3);
    setInvested(0);
    setDestroyed(false);
    setNotice('已加载另一张已鉴定样本；不存在稀有度升级操作。');
  };
  const nextCost = 2 * (level + 1);
  const qCost = 4 * (quality + 1);
  const refund = 3 + Math.floor(invested * 0.7);
  return (
    <div className="ds-prototype">
      <DemoTop title="CARD LAB / 同一模板，不同天赋" onReset={() => reset()} />
      <div className="ds-sample-switch">
        <span>验收样本</span>
        {RARITIES.map((r, i) => (
          <button
            key={r.name}
            onClick={() => reset(i)}
            className={rarity === i ? 'selected' : ''}
          >
            加载{r.name}卡
          </button>
        ))}
      </div>
      <div className="ds-growth-grid">
        <div
          className={
            'ds-elevator-card ' + (destroyed ? 'ds-card-destroyed' : '')
          }
          style={{ '--rarity': RARITIES[rarity].color } as React.CSSProperties}
        >
          <div>
            <span>WEAPON / 02 SLOTS</span>
            <Lock />
          </div>
          <div className="ds-card-icon">
            <Swords strokeWidth={1} />
          </div>
          <span className="ds-rarity-label">
            {RARITIES[rarity].name} · 不可培养
          </span>
          <h3>弹弓</h3>
          <p>
            {destroyed
              ? '卡牌已拆解'
              : `每 4 秒造成 ${cardPower(rarity, quality, level)} 点伤害。`}
          </p>
          <footer>
            <span>{QUALITY[quality]}</span>
            <b>+{level}</b>
          </footer>
        </div>
        <div className="ds-growth-controls">
          <DemoStats
            values={[
              { label: '材料', value: material },
              { label: '同类精华', value: essence },
              { label: '已投入材料', value: invested },
            ]}
          />
          <div className="ds-growth-row">
            <div>
              <strong>品质培养</strong>
              <small>
                {QUALITY[quality]} →{' '}
                {quality < 3 ? QUALITY[quality + 1] : '已达上限'}
              </small>
            </div>
            <button
              className="ds-button"
              disabled={
                destroyed || quality >= 3 || material < qCost || essence < 1
              }
              onClick={() => {
                setQuality((q) => q + 1);
                setMaterial((m) => m - qCost);
                setEssence((e) => e - 1);
                setInvested((i) => i + qCost);
                setNotice(`品质已提升，稀有度仍为${RARITIES[rarity].name}。`);
              }}
            >
              升级 · {qCost} 材料 / 1 精华
            </button>
          </div>
          <div className="ds-growth-row">
            <div>
              <strong>有限强化</strong>
              <small>强化等级 {level} / 5</small>
            </div>
            <button
              className="ds-button"
              disabled={destroyed || level >= 5 || material < nextCost}
              onClick={() => {
                setLevel((l) => l + 1);
                setMaterial((m) => m - nextCost);
                setInvested((i) => i + nextCost);
                setNotice('强化成功，稀有度不会改变。');
              }}
            >
              强化 · {nextCost} 材料
            </button>
          </div>
          <div className="ds-formula">
            <span>强度公式 · 建议系数</span>
            <code>
              round(20 × {RARITIES[rarity].base} ×{' '}
              {[1, 1.35, 1.75, 2.25][quality]} + {level} × 3 ×{' '}
              {RARITIES[rarity].growth}) = {cardPower(rarity, quality, level)}
            </code>
          </div>
          <button
            className="ds-ghost ds-danger"
            disabled={destroyed}
            onClick={() => {
              setMaterial((m) => m + refund);
              setDestroyed(true);
              setNotice(
                `拆解完成，返还 ${refund} 材料（基础 3 + 已投入的 70%，向下取整）。样例拆解可以通过重置恢复。`,
              );
            }}
          >
            样例拆解 · 返还 {refund} 材料
          </button>
          <p className="ds-prototype-footnote">
            此处拆解是可重置的设计试验。正式游戏对装备中的卡牌增加确认，并禁止在战斗中拆解。
          </p>
        </div>
      </div>
      <output className="ds-demo-notice">{notice}</output>
    </div>
  );
}
const BUILDINGS = [
  {
    id: 'grow',
    name: '补给培育箱',
    cost: 6,
    slots: 2,
    icon: Apple,
    description: '3 电力 + 1 原料 → 1 补给',
  },
  {
    id: 'generator',
    name: '手摇发电机',
    cost: 4,
    slots: 1,
    icon: Zap,
    description: '8 精力 → 6 电力 / 周期',
  },
  {
    id: 'bench',
    name: '维修工作台',
    cost: 6,
    slots: 2,
    icon: Swords,
    description: '解锁维修与便携扫描器充能',
  },
  {
    id: 'storage',
    name: '储物架',
    cost: 4,
    slots: 1,
    icon: Box,
    description: '电梯仓库容量 +8',
  },
];
function BaseDemo() {
  const [installed, setInstalled] = useState<string[]>([]);
  const [capacity, setCapacity] = useState(6);
  const [material, setMaterial] = useState(20);
  const [supply, setSupply] = useState(3);
  const [stamina, setStamina] = useState(55);
  const [power, setPower] = useState(18);
  const [cycles, setCycles] = useState(0);
  const [notice, setNotice] = useState(
    '床与扫描桌已占 4 槽。先决定剩下的空间留给什么。',
  );
  const used =
    4 +
    installed.reduce(
      (n, id) => n + BUILDINGS.find((b) => b.id === id)!.slots,
      0,
    );
  const reset = () => {
    setInstalled([]);
    setCapacity(6);
    setMaterial(20);
    setSupply(3);
    setStamina(55);
    setPower(18);
    setCycles(0);
    setNotice('基地恢复为初始样例。');
  };
  return (
    <div className="ds-prototype">
      <DemoTop title="CABIN 001 / 基地经营实验" onReset={reset} />
      <DemoStats
        values={[
          { label: '补给', value: supply, icon: <Apple /> },
          { label: '精力', value: stamina, icon: <Zap /> },
          { label: '电力', value: power, icon: <Monitor /> },
          { label: '材料', value: material, icon: <Box /> },
        ]}
      />
      <div className="ds-base-grid">
        <div className="ds-base-layout">
          <span className="ds-micro">
            MODULE SLOTS {used} / {capacity}
          </span>
          <div className="ds-module-slots">
            <div style={{ gridColumn: 'span 2' }}>
              <Bed />
              <strong>床</strong>
              <small>2 槽 / 休息</small>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <ScanLine />
              <strong>扫描桌</strong>
              <small>2 槽 / 基地鉴定</small>
            </div>
            {installed.map((id) => {
              const b = BUILDINGS.find((x) => x.id === id)!;
              return (
                <div key={id} style={{ gridColumn: `span ${b.slots}` }}>
                  <b.icon />
                  <strong>{b.name}</strong>
                  <small>{b.slots} 槽</small>
                </div>
              );
            })}
            {Array.from({ length: capacity - used }, (_, i) => (
              <div className="empty" key={i}>
                <Plus />
                <small>可用槽</small>
              </div>
            ))}
          </div>
          <div className="ds-prototype-actions">
            <button
              className="ds-ghost"
              disabled={supply < 1 || stamina >= 100}
              onClick={() => {
                setSupply((s) => s - 1);
                setStamina((s) => Math.min(100, s + 25));
                setCycles((c) => c + 1);
                setNotice('休息消耗 1 补给，精力 +25，世界推进 1 周期。');
              }}
            >
              休息 · 1 补给
            </button>
            <button
              className="ds-ghost"
              disabled={material < 8 || capacity >= 10}
              onClick={() => {
                setMaterial((m) => m - 8);
                setCapacity((c) => c + 2);
                setCycles((c) => c + 1);
                setNotice('扩建 +2 槽，战斗格位仍为 10。');
              }}
            >
              扩建 · 8 材料
            </button>
          </div>
        </div>
        <div className="ds-build-menu">
          {BUILDINGS.map((b) => (
            <div key={b.id}>
              <b.icon />
              <span>
                <strong>{b.name}</strong>
                <small>{b.description}</small>
              </span>
              <button
                className="ds-mini-button"
                disabled={
                  installed.includes(b.id) ||
                  material < b.cost ||
                  used + b.slots > capacity
                }
                onClick={() => {
                  setInstalled((s) => [...s, b.id]);
                  setMaterial((m) => m - b.cost);
                  setCycles((c) => c + 1);
                  setNotice(`建成${b.name}，消耗 ${b.cost} 材料与 1 周期。`);
                }}
              >
                {installed.includes(b.id) ? '已建造' : `${b.cost} 材料`}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="ds-production-controls">
        <span>主动生产 / 样例周期 {cycles}</span>
        <button
          className="ds-button"
          disabled={!installed.includes('grow') || power < 3 || material < 1}
          onClick={() => {
            setPower((p) => p - 3);
            setMaterial((m) => m - 1);
            setSupply((s) => s + 1);
            setCycles((c) => c + 1);
            setNotice(
              '培育完成：消耗 3 电力和 1 材料作为培养基，获得 1 补给。',
            );
          }}
        >
          培育 · 3 电力 / 1 材料
        </button>
        <button
          className="ds-ghost"
          disabled={!installed.includes('generator') || stamina < 8}
          onClick={() => {
            setStamina((s) => s - 8);
            setPower((p) => p + 6);
            setCycles((c) => c + 1);
            setNotice('发电完成：8 精力换取 6 电力。');
          }}
        >
          手摇发电
        </button>
      </div>
      <output className="ds-demo-notice">{notice}</output>
    </div>
  );
}
function CombatDemo() {
  const [adjacent, setAdjacent] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const result = useMemo(() => {
    const x = (id: string, uid: string) => ({ id, uid, tier: 0, bonus: 0 });
    const player = {
      name: '幸存者 001',
      hero: 'duelist' as const,
      hp: 230,
      board: adjacent
        ? [x('wrench', 'p0'), x('saber', 'p1'), x('buckler', 'p2')]
        : [x('wrench', 'p0'), x('buckler', 'p2'), x('saber', 'p1')],
      skills: [],
      gold: 0,
      attack: 0,
      shieldBonus: 0,
    };
    return simulate({
      player,
      enemy: {
        ...player,
        name: '楼层守卫',
        hero: 'artificer',
        hp: 170,
        board: [x('needle', 'e0'), x('lantern', 'e1')],
        attack: 0,
      },
      seed: 907,
      night: false,
      difficulty: 0,
    });
  }, [adjacent]);
  const frame = result.frames[Math.min(cursor, result.frames.length - 1)];
  useEffect(() => {
    if (!playing || cursor >= result.frames.length - 1) return;
    const t = setTimeout(() => setCursor((c) => c + 1), 100);
    return () => clearTimeout(t);
  }, [playing, cursor, result]);
  const names: Record<string, string> = {
    wrench: '校准扳手',
    saber: '水果刀',
    buckler: '金属餐盘',
    needle: '飞钉装置',
    lantern: '燃烧装置',
  };
  return (
    <div className="ds-prototype">
      <DemoTop
        title="AUTOBATTLER / 保留的核心规则"
        onReset={() => {
          setCursor(0);
          setPlaying(false);
        }}
      />
      <div className="ds-combat-toggle">
        <label htmlFor="combat-adjacent" className="ds-checkbox-label">
          <Checkbox
            id="combat-adjacent"
            checked={adjacent}
            onCheckedChange={(v) => {
              setAdjacent(!!v);
              setCursor(0);
              setPlaying(false);
            }}
            disabled={playing && cursor < result.frames.length - 1}
          />
          把校准扳手放在水果刀旁边（冷却 −15%）
        </label>
        <span>旧引擎 · 新题材样例映射</span>
      </div>
      <div className="ds-combat-demo">
        {[frame.enemy, frame.player].map((unit, index) => (
          <div key={unit.name} className={'ds-demo-fighter side-' + index}>
            <div>
              <strong>{unit.name}</strong>
              <span>
                <HeartIcon /> {Math.ceil(unit.hp)} / {unit.maxHP}
                <small>
                  <Shield /> {Math.round(unit.shield)}
                </small>
              </span>
            </div>
            <Progress
              value={(unit.hp / unit.maxHP) * 100}
              aria-label={`${unit.name}生命`}
              className="ds-demo-hp"
            />
            <div className="ds-combat-cards">
              {unit.board.map((card) => (
                <div
                  key={card.uid}
                  className={frame.fired.includes(card.uid) ? 'fired' : ''}
                >
                  <span>{names[card.id]}</span>
                  <strong>{card.power}</strong>
                  <small>冷却 {card.cd.toFixed(2)}s</small>
                  <Progress
                    value={Math.min(100, (card.progress / card.cd) * 100)}
                    aria-label={`${names[card.id]}冷却`}
                    className="ds-demo-cooldown"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="ds-play-controls">
        <button
          className="ds-button"
          onClick={() => {
            if (cursor >= result.frames.length - 1) {
              setCursor(0);
              setPlaying(true);
            } else setPlaying((p) => !p);
          }}
        >
          {playing && cursor < result.frames.length - 1 ? <Pause /> : <Play />}
          {playing && cursor < result.frames.length - 1
            ? '暂停观察'
            : '播放战斗'}
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
        <span>{frame.time.toFixed(1)} s · 播放 2×</span>
      </div>
      <output className="ds-demo-notice">
        {cursor >= result.frames.length - 1
          ? `${result.winner === 'player' ? '玩家胜利' : '玩家失败'}，输出 ${result.playerDamage}。战后掉落应进入实体拾取池。`
          : '排列改变后生成新的战斗快照；同一快照可重复回放。播放速度不改变世界周期。'}
      </output>
    </div>
  );
}
function HeartIcon() {
  return <span aria-hidden="true">♥</span>;
}
function SurvivorsDemo() {
  const [s, setS] = useState(newLedger);
  const [floor, setFloor] = useState(5);
  const [materialized, setMaterialized] = useState<number[]>([]);
  const [notice, setNotice] = useState(
    '先推进机器人周期，再首次进入某层，观察剩余物资。',
  );
  const alive = s.bots.filter((b) => b.alive).length;
  const localBots = s.bots.filter((b) => b.floor === floor && b.alive);
  const expand = () => {
    setMaterialized((a) => (a.includes(floor) ? a : [...a, floor]));
    setNotice(
      `首次展开 ${floor} 层时读取当前账本：初始 ${s.initial[floor - 1]}，已被拿走 ${s.taken[floor - 1]}，只生成剩余 ${s.stock[floor - 1]}。`,
    );
  };
  return (
    <div className="ds-prototype">
      <DemoTop
        title="99 BOTS / 共享资源账本"
        onReset={() => {
          setS(newLedger());
          setMaterialized([]);
          setNotice('机器人与所有楼层账本已重置。');
        }}
      />
      <DemoStats
        values={[
          { label: '存活参与者', value: `${alive + 1} / 100`, icon: <Users /> },
          { label: '已推进周期', value: s.cycle, icon: <Radio /> },
          {
            label: '已拿走资源',
            value: s.taken.reduce((n, x) => n + x, 0),
            icon: <Package />,
          },
          {
            label: '玩家已展开楼层',
            value: materialized.length,
            icon: <Layers />,
          },
        ]}
      />
      <div className="ds-survivor-toolbar">
        <button
          className="ds-button"
          onClick={() => {
            setS(tickLedger(s));
            setNotice(
              '位置 → 挑战 → 封锁遭遇 → 库存分配 → 成长与死亡，周期已提交。',
            );
          }}
        >
          推进一个重要行动周期 <ArrowRight />
        </button>
        <label htmlFor="ledger-floor">
          观察楼层
          <Input
            id="ledger-floor"
            type="number"
            min={1}
            max={100}
            value={floor}
            onChange={(e) =>
              setFloor(
                Math.min(
                  100,
                  Math.max(1, Math.trunc(Number(e.target.value) || 1)),
                ),
              )
            }
          />
        </label>
        <button className="ds-ghost" onClick={expand}>
          首次进入 / 重新读取详情
        </button>
      </div>
      <div className="ds-ledger-grid">
        <div className="ds-ledger-card">
          <span className="ds-micro">
            FLOOR {String(floor).padStart(3, '0')} /{' '}
            {materialized.includes(floor) ? '详细场景已展开' : '仅轻量账本'}
          </span>
          <h3>别人来过，就会留下空缺。</h3>
          <div className="ds-stock-equation">
            <span>
              {s.initial[floor - 1]}
              <small>初始库存</small>
            </span>
            <b>−</b>
            <span>
              {s.taken[floor - 1]}
              <small>已经拿走</small>
            </span>
            <b>=</b>
            <span className="remaining">
              {s.stock[floor - 1]}
              <small>现在剩余</small>
            </span>
          </div>
          <p>
            {localBots.length}{' '}
            名存活机器人目前位于此层。详情展开只读取账本，不重置库存。
          </p>
        </div>
        <div className="ds-bot-grid" aria-label="99 名机器人状态">
          {s.bots.map((b) => (
            <button
              key={b.id}
              className={!b.alive ? 'dead' : b.floor === floor ? 'here' : ''}
              title={`${String(b.id).padStart(3, '0')} / ${b.personality} / ${b.floor} 层 / 战力 ${b.power} / ${b.alive ? '存活' : '阵亡'}`}
              onClick={() => {
                setFloor(b.floor);
                setNotice(
                  `${String(b.id).padStart(3, '0')}：${b.personality}，位于 ${b.floor} 层，战力 ${b.power}，${b.alive ? '存活' : '已阵亡'}。`,
                );
              }}
            >
              {String(b.id).padStart(3, '0')}
            </button>
          ))}
        </div>
      </div>
      <div className="ds-world-log">
        <span className="ds-micro">PUBLIC BROADCAST / 固定种子本地模拟</span>
        {s.events.length ? (
          s.events
            .slice(-6)
            .reverse()
            .map((e, i) => (
              <p key={i}>
                <time>C{String(e.cycle).padStart(3, '0')}</time>
                {e.text}
              </p>
            ))
        ) : (
          <p>所有人刚刚醒来。等待第一个行动周期。</p>
        )}
      </div>
      <output className="ds-demo-notice">{notice}</output>
    </div>
  );
}
function RankingDemo() {
  const [reached, setReached] = useState(18);
  const [cleared, setCleared] = useState(12);
  const [cycles, setCycles] = useState(32);
  const [dead, setDead] = useState(false);
  const [notice, setNotice] = useState(
    '尝试只把“最高到达”拖到 100，排名不会提高。',
  );
  const entries: RankEntry[] = [
    { id: '你 / 001', cleared, reached, exit: false, cycles, alive: !dead },
    {
      id: '幸存者 037',
      cleared: 22,
      reached: 26,
      exit: false,
      cycles: 51,
      alive: false,
    },
    {
      id: '幸存者 082',
      cleared: 12,
      reached: 16,
      exit: false,
      cycles: 32,
      alive: true,
    },
    {
      id: '幸存者 056',
      cleared: 12,
      reached: 14,
      exit: false,
      cycles: 40,
      alive: true,
    },
    {
      id: '幸存者 014',
      cleared: 8,
      reached: 100,
      exit: false,
      cycles: 18,
      alive: false,
    },
  ];
  const ranked = rankEntries(entries);
  return (
    <div className="ds-prototype">
      <DemoTop
        title="RANKING / 成绩边界实验"
        onReset={() => {
          setReached(18);
          setCleared(12);
          setCycles(32);
          setDead(false);
          setNotice('结算样例已重置。');
        }}
      />
      <div className="ds-rank-controls">
        <div>
          <label>
            最高到达 <b>{reached} F</b>
          </label>
          <Slider
            value={[reached]}
            min={cleared}
            max={100}
            step={1}
            aria-label="最高到达楼层"
            onValueChange={(v) => {
              setReached(Array.isArray(v) ? v[0] : v);
              setNotice('只改变到达楼层，不产生通关凭证。');
            }}
          />
          <small>可以跳到高层，但不能因此刷高成绩。</small>
        </div>
        <div>
          <label>
            达成最佳成绩时 <b>{cycles} 周期</b>
          </label>
          <Slider
            value={[cycles]}
            min={12}
            max={90}
            step={1}
            aria-label="达成最佳成绩时的周期"
            onValueChange={(v) => setCycles(Array.isArray(v) ? v[0] : v)}
          />
          <small>用于同高度时的公开次级排序。</small>
        </div>
      </div>
      <div className="ds-prototype-actions">
        <button
          className="ds-button"
          disabled={dead || cleared >= reached}
          onClick={() => {
            setCleared(reached);
            setNotice('验收事件：主目标与成功撤回凭证已经提交，成绩更新。');
          }}
        >
          <CheckCircle2 />
          验收：提交当前到达层通关
        </button>
        <button
          className="ds-ghost ds-danger"
          disabled={dead}
          onClick={() => {
            setDead(true);
            setNotice('玩家死亡，但已提交的最高通关成绩保留。');
          }}
        >
          验收：演示死亡
        </button>
      </div>
      <DataTable
        columns={[
          '名次',
          '幸存者',
          '最高已通关',
          '最高到达',
          '达标周期',
          '状态',
        ]}
        rows={ranked.map((e) => [
          e.rank!,
          e.id,
          `${e.cleared} F`,
          `${e.reached} F`,
          e.cycles,
          e.alive ? '存活' : '阵亡',
        ])}
      />
      <output className="ds-demo-notice">{notice}</output>
      <p className="ds-prototype-footnote">
        五人排序切片，用于检查规则。不是在线排行榜；提交按钮代表已验证凭证，而非允许正式玩家自行填写成绩。
      </p>
    </div>
  );
}
export default function DesignPrototype({ moduleId }: { moduleId: ModuleId }) {
  switch (moduleId) {
    case 'overview':
      return <IntroDemo />;
    case 'world':
      return <WorldDemo />;
    case 'expedition':
      return <ExpeditionDemo />;
    case 'inventory':
      return <InventoryDemo />;
    case 'cards':
      return <CardsDemo />;
    case 'base':
      return <BaseDemo />;
    case 'combat':
      return <CombatDemo />;
    case 'survivors':
      return <SurvivorsDemo />;
    case 'ranking':
      return <RankingDemo />;
  }
}
