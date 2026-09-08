'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Lock,
  Moon,
  Zap,
  Shield,
  Heart,
  Plus,
  Trash2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import V03 from './prototypes-v03';
import { WEATHER, terrainFor } from '@/lib/prototype-v03';
import {
  CARDS,
  START,
  ENEMY,
  EARLY_ENEMY,
  POWER,
  FOUR,
  cardDef,
  covered,
  placeCard,
  battle,
  RARITY,
  stat,
  MIRACLE,
  newBase,
  baseSlots,
  baseAction,
  FACILITIES,
  safeCapacity,
} from '@/lib/prototype-v04';
import type { Piece, Frame } from '@/lib/prototype-v04';
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
function Choice({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: [string, string][];
}) {
  return (
    <label className="v3-select">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {items.map(([v, t]) => (
          <option value={v} key={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
function Info({ children }: { children: React.ReactNode }) {
  return (
    <output className="ds-demo-notice" aria-live="polite">
      {children}
    </output>
  );
}
function Board({
  pieces,
  side,
  open,
  frame,
  terrain,
  selected,
  onSelect,
  miracle,
}: {
  pieces: Piece[];
  side: number;
  open: number[];
  frame: Frame;
  terrain: string[];
  selected: number;
  onSelect: (n: number) => void;
  miracle: string | null;
}) {
  return (
    <div className={'v4-board side-' + side}>
      <header>
        <span>{side ? '对手 / 自动阵容' : '你 / 编辑布局'}</span>
        <strong>
          <Heart />
          {Math.ceil(frame.hp[side])}
          <small>/260</small>
          <Shield />
          {Math.round(frame.shield[side])}
        </strong>
        <Progress
          value={(frame.hp[side] / 260) * 100}
          aria-label={(side ? '敌方' : '己方') + '主人生命'}
        />
        <p>
          <Zap />
          流派能量 {frame.energy[side]} / {frame.cap[side]}{' '}
          <small>仅发电卡产生</small>
        </p>
      </header>
      {['上路', '中路', '下路'].map((name, row) => (
        <div className="v4-lane" key={name}>
          <div>
            <strong>{name}</strong>
            <span>{terrain[row]}</span>
          </div>
          <div className="v4-grid">
            {[0, 1, 2].map((col) => {
              const slot = row * 3 + col;
              const piece = pieces.find((p) => covered(p).includes(slot));
              if (piece && piece.at !== slot) return null;
              const c = piece ? cardDef(piece.id) : null;
              const locked = !open.includes(slot);
              return (
                <button
                  key={slot}
                  disabled={locked}
                  style={{ gridColumn: `${col + 1} / span ${c?.size || 1}` }}
                  className={`${side === 0 && selected === slot ? 'selected ' : ''}${frame.fired.includes(side + '-' + slot) ? 'fired ' : ''}${c?.id === miracle && !side ? 'miracle' : ''}`}
                  onClick={() => onSelect(slot)}
                  aria-label={`${side ? '敌方' : '己方'}${name}第${col + 1}格 ${c?.name || '空位'}`}
                >
                  <small className="v4-cellnum">
                    {slot + 1}
                    {c && c.size > 1 ? '—' + (slot + c.size) : ''}
                  </small>
                  {locked ? (
                    <>
                      <Lock />
                      <span>未开放</span>
                    </>
                  ) : c ? (
                    <>
                      <strong>{c.name}</strong>
                      <span>
                        {c.size} 格 · {frame.cd[side][slot].toFixed(2)}s
                        {c.energyCost ? ' · 耗能 ' + c.energyCost : ''}
                      </span>
                      <Progress
                        value={Math.min(
                          100,
                          (frame.timers[side][slot] / frame.cd[side][slot]) *
                            100,
                        )}
                        aria-label={c.name + '冷却'}
                      />
                      {frame.waiting.includes(side + '-' + slot) && (
                        <em>等待流派能量</em>
                      )}
                    </>
                  ) : (
                    <span>空位</span>
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
function Combat() {
  const [board, setBoard] = useState<Piece[]>(START);
  const [full, setFull] = useState(false);
  const [weather, setWeather] = useState(0);
  const [layout, setLayout] = useState(0);
  const [quality, setQuality] = useState(1);
  const [miracle, setMiracle] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [inspect, setInspect] = useState({ id: 'wire', side: 0 });
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState(
    '先选己方格位，再选择卡牌；多格卡需要本路连续空位。敌方卡牌也可点击查看。',
  );
  const enemy = full ? ENEMY : EARLY_ENEMY;
  const open = full ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : FOUR;
  const result = useMemo(
    () => battle(board, enemy, weather, layout, quality, miracle),
    [board, enemy, weather, layout, quality, miracle],
  );
  const frame = result.frames[Math.min(cursor, result.frames.length - 1)];
  const c = cardDef(inspect.id);
  const q = inspect.side ? 1 : quality;
  const restart = () => {
    setCursor(0);
    setPlaying(false);
  };
  const reset = () => {
    setBoard([...START]);
    setFull(false);
    setWeather(0);
    setLayout(0);
    setQuality(1);
    setMiracle(null);
    setSelected(0);
    setInspect({ id: 'wire', side: 0 });
    restart();
  };
  useEffect(() => {
    if (!playing || cursor >= result.frames.length - 1) return;
    const t = setTimeout(() => setCursor((v) => v + 1), 100);
    return () => clearTimeout(t);
  }, [playing, cursor, result]);
  const place = (id: string) => {
    try {
      setBoard(placeCard(board, id, selected, open));
      setInspect({ id, side: 0 });
      setNotice('整张卡牌已放入；跨路、重叠或未解锁位置均会拒绝。');
      restart();
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const pick = (side: number, at: number) => {
    const p = (side ? enemy : board).find((x) => x.at === at);
    if (!side) setSelected(at);
    if (p) setInspect({ id: p.id, side });
  };
  return (
    <div className="ds-prototype">
      <Top title="LANE LAB / 多格卡与完整敌我棋盘" reset={reset} />
      <div className="v3-toolbar">
        <Choice
          label="实验天气"
          value={String(weather)}
          onChange={(v) => {
            setWeather(+v);
            restart();
          }}
          items={WEATHER.map((w, i) => [String(i), w.name])}
        />
        <Choice
          label="己方品质"
          value={String(quality)}
          onChange={(v) => {
            setQuality(+v);
            restart();
          }}
          items={['基础', '精制', '大师'].map((q, i) => [String(i), q])}
        />
        <button
          className="ds-ghost"
          onClick={() => {
            setLayout((v) => (v + 1) % 3);
            restart();
          }}
        >
          轮换地形
        </button>
        <button
          className="ds-ghost"
          onClick={() => {
            setFull((v) => !v);
            setBoard([...START]);
            setSelected(0);
            restart();
          }}
        >
          {full ? '恢复四格' : '加载九格'}
        </button>
        <button
          className="ds-button"
          onClick={() => {
            setFull(true);
            setBoard([...POWER]);
            setSelected(0);
            setMiracle(null);
            restart();
            setNotice(
              '已加载供能流派：电芯与阵列发电，线圈耗能；天气仍然有效，普通卡不需要能量。',
            );
          }}
        >
          <Zap />
          供能流派示例
        </button>
      </div>
      <div className="v4-board-pair">
        <Board
          pieces={board}
          side={0}
          open={open}
          frame={frame}
          terrain={terrainFor(weather, layout)}
          selected={selected}
          onSelect={(at) => pick(0, at)}
          miracle={miracle}
        />
        <Board
          pieces={enemy}
          side={1}
          open={open}
          frame={frame}
          terrain={terrainFor(weather, layout)}
          selected={-1}
          onSelect={(at) => pick(1, at)}
          miracle={null}
        />
      </div>
      <div className="v4-inspect">
        <div>
          <span>
            {inspect.side ? '敌方卡牌' : '己方样卡'} / {c.size} 格
          </span>
          <h3>{c.name}</h3>
          <p>
            基础：每 {c.cd} 秒，
            {c.kind === 'damage'
              ? '对敌方主人造成 ' + c.power + ' 伤害'
              : c.kind === 'heal'
                ? '治疗己方主人 ' + c.power
                : c.kind === 'shield'
                  ? '为己方主人提供 ' + c.power + ' 护盾'
                  : '推进同路另一张牌冷却 ' + c.power + ' 秒'}
            。
            {c.energyCost
              ? '发动需 ' + c.energyCost + ' 流派能量。'
              : '不消耗能量。'}
          </p>
          <p>
            {q > 0 ? '精制已生效：' : '精制未解锁：'}
            {c.effect}
          </p>
          {q === 2 && <p>大师：{c.master}</p>}
          {!inspect.side && miracle === c.id && (
            <p className="v4-gold">奇迹数值 ×2.4；{MIRACLE}</p>
          )}
        </div>
        <div className="v4-inspect-actions">
          <button
            className="ds-ghost"
            disabled={inspect.side === 1 || !board.some((p) => p.id === c.id)}
            onClick={() => {
              setMiracle((m) => (m === c.id ? null : c.id));
              restart();
            }}
          >
            {miracle === c.id ? '恢复普通样本' : '对照：加载奇迹样本'}
          </button>
          <button
            className="ds-ghost"
            onClick={() => {
              setBoard((b) => b.filter((p) => p.at !== selected));
              restart();
            }}
          >
            <Trash2 />
            移除己方选中卡
          </button>
        </div>
      </div>
      <div className="v3-catalog">
        <div className="v3-catalog-heading">
          放入己方第 {selected + 1} 格 · 不自动挤走其他卡
        </div>
        <div>
          {CARDS.map((x) => (
            <button key={x.id} onClick={() => place(x.id)}>
              <strong>
                {x.name} · {x.size} 格
              </strong>
              <small>
                {x.energyCost
                  ? '耗能 ' + x.energyCost + ' / '
                  : x.energyGain
                    ? '发电 ' + x.energyGain + ' / '
                    : ''}
                {x.effect}
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
          {playing && cursor < result.frames.length - 1 ? <Pause /> : <Play />}
          {playing && cursor < result.frames.length - 1 ? '暂停' : '播放'}
        </button>
        <button
          className="ds-ghost"
          onClick={() => {
            setCursor((v) => Math.min(v + 1, result.frames.length - 1));
            setPlaying(false);
          }}
        >
          单步
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
        <span>{frame.time.toFixed(2)}s · 2.5×</span>
      </div>
      <div className="v3-battle-log">
        {frame.log.length ? (
          frame.log.map((x, i) => <p key={i}>{x}</p>)
        ) : (
          <p>
            双方使用同一天气。每个卡牌锚点只运行一个计时器，覆盖格不重复发动。
          </p>
        )}
      </div>
      <Info>
        {cursor >= result.frames.length - 1
          ? result.winner + ' · ' + notice
          : notice}
      </Info>
      <p className="ds-prototype-footnote">
        样例卡池 10 张；四格初期与九格实验可切换。伤害和治疗作用主人。40
        秒后双方逐步承受消耗伤害，防止永久僵局。没有全员常驻能量消耗。
      </p>
    </div>
  );
}
function Base() {
  const [s, setS] = useState(newBase);
  const [error, setError] = useState('');
  const go = (a: string, id = '') => {
    try {
      setS(baseAction(s, a, id));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="ds-prototype">
      <Top
        title="CABIN WORKSHOP / 建造、生产与出勤准备"
        reset={() => {
          setS(newBase());
          setError('');
        }}
      />
      <div className="v4-resource-bar">
        {[
          ['天', s.day],
          ['维持配额', s.quota],
          ['精力', s.stamina],
          ['补给', s.supply],
          ['电力', s.power],
          ['材料', s.material],
          ['燃料', s.fuel],
          ['药品', s.medicine],
          ['废料', s.scrap],
        ].map(([k, v]) => (
          <span key={k}>
            <small>{k}</small>
            <b>{v}</b>
          </span>
        ))}
      </div>
      <div className="v4-terminal">
        <span>电梯终端 / 基础设施 · 不占槽</span>
        <h3>今天，把空间留给什么？</h3>
        <p>
          模块 {baseSlots(s)} / {s.moduleCap} 槽 · 战斗 {s.slots} / 9 格 · 可达{' '}
          {s.maxFloor} 层 · 安全容器 {safeCapacity(s.slots)} 容积
        </p>
        <div className="ds-prototype-actions">
          <button
            className="ds-button"
            disabled={s.phase === 'over'}
            onClick={() => go('sleep')}
          >
            <Moon />
            睡觉 / 下一天
          </button>
          <button
            className="ds-ghost"
            disabled={s.moduleCap >= 10 || s.material < 6 || s.phase === 'over'}
            onClick={() => go('expand')}
          >
            扩建模块槽 · 6 材料
          </button>
          <button
            className="ds-ghost"
            disabled={s.slots >= 9 || s.material < 6 || s.phase === 'over'}
            onClick={() => go('upgrade')}
          >
            终端升级 · 6 材料
          </button>
          <button
            className="ds-ghost"
            disabled={s.used || s.phase === 'over'}
            onClick={() => go('supply-run')}
          >
            验收：完成一次补给出勤
          </button>
        </div>
        <small>
          出勤按钮使用固定成功奖励，供测试设施循环；详细探索和救援仍在模块
          02。各设施每日各使用一次。
        </small>
      </div>
      <div className="v4-cabin-plan">
        <div className="v4-bed" style={{ gridColumn: 'span 2' }}>
          <strong>床</strong>
          <span>固定 2 槽 / 睡觉恢复精力</span>
        </div>
        {s.installed.map((id) => {
          const f = FACILITIES.find((x) => x.id === id)!;
          return (
            <div key={id} style={{ gridColumn: `span ${f.slots}` }}>
              <strong>{f.name}</strong>
              <span>
                {f.slots} 槽 ·{' '}
                {s.facilityUsed.includes(id) ? '今日已用' : '可使用'}
              </span>
              <button
                className="ds-mini-button"
                disabled={s.phase === 'over'}
                onClick={() => go('remove', id)}
              >
                拆除 · 返 {Math.floor(f.cost * 0.5)}
              </button>
            </div>
          );
        })}
        {Array.from({ length: s.moduleCap - baseSlots(s) }, (_, i) => (
          <div className="empty" key={i}>
            <Plus />
            <span>空槽</span>
          </div>
        ))}
      </div>
      <div className="v4-base-benefits">
        <span>鉴定电荷 {s.charges} / 4</span>
        <span>燃料上限 {s.installed.includes('storage') ? 10 : 6}</span>
        <span>适应装备 {s.adapted ? '已备好 / 下次出勤生效' : '未准备'}</span>
        <span>出勤 {s.used ? '今日已用' : '可用'}</span>
      </div>
      {s.forecast && (
        <div className="v4-forecast">
          次日预报：{WEATHER[(s.day + 1) % 4].name}。
          {WEATHER[(s.day + 1) % 4].explore} 建议提前准备适应装备。
          <small>固定日序列预报样例，跨页天气尚未共享。</small>
        </div>
      )}
      <div className="v4-facilities">
        {FACILITIES.map((f) => {
          const built = s.installed.includes(f.id);
          return (
            <article key={f.id}>
              <span>
                {f.slots} 槽 / {f.cost} 建造材料
              </span>
              <h3>{f.name}</h3>
              <p>{f.desc}</p>
              <button
                className={built ? 'ds-ghost' : 'ds-button'}
                disabled={
                  s.phase === 'over' ||
                  (built
                    ? s.facilityUsed.includes(f.id)
                    : s.material < f.cost ||
                      baseSlots(s) + f.slots > s.moduleCap)
                }
                onClick={() => go(built ? 'use' : 'build', f.id)}
              >
                {built
                  ? s.facilityUsed.includes(f.id)
                    ? '今日额度已用'
                    : '使用设施'
                  : '建造设施'}
              </button>
            </article>
          );
        })}
      </div>
      <Info>{error || s.notice}</Info>
      <p className="ds-prototype-footnote">
        拆除返 50%
        建造材料，重建保留当日使用记录。配额不可通过设施生产。建造槽、战斗格和仓库容量彼此独立。数值与设施种类待本轮验收。
      </p>
    </div>
  );
}
function Cards() {
  const [id, setId] = useState('wire');
  const [rarity, setRarity] = useState(0);
  const [quality, setQuality] = useState(0);
  const [level, setLevel] = useState(0);
  const [material, setMaterial] = useState(40);
  const [invested, setInvested] = useState(0);
  const [destroyed, setDestroyed] = useState(false);
  const c = cardDef(id);
  const reset = () => {
    setQuality(0);
    setLevel(0);
    setMaterial(40);
    setInvested(0);
    setDestroyed(false);
  };
  const current = useMemo(
    () =>
      battle(
        [{ id, at: 0 }],
        START,
        0,
        0,
        quality,
        rarity === 4 ? id : null,
        rarity,
        level,
      ),
    [id, rarity, quality, level],
  );
  const echoCount = current.frames.filter((f) =>
    f.fired.includes('0-0'),
  ).length;
  return (
    <div className="ds-prototype">
      <Top title="MIRACLE LAB / 稀有度跃迁与特殊词条" reset={reset} />
      <div className="v3-toolbar">
        <Choice
          label="加载已鉴定样卡"
          value={id}
          onChange={(v) => {
            setId(v);
            reset();
          }}
          items={CARDS.map((c) => [c.id, c.name])}
        />
        <Choice
          label="加载稀有度样本（不可培养）"
          value={String(rarity)}
          onChange={(v) => {
            setRarity(+v);
            reset();
          }}
          items={RARITY.map((r, i) => [String(i), r.name])}
        />
      </div>
      <div className="v4-card-lab">
        <article
          className={rarity === 4 ? 'v4-miracle-card' : 'v3-card-detail'}
        >
          <span>
            {RARITY[rarity].name} · {c.size} 格 ·{' '}
            {['基础', '精制', '大师'][quality]} +{level}
          </span>
          <h3>{c.name}</h3>
          <strong>
            {stat(id, rarity, level)}
            <small>{c.kind === 'charge' ? '秒冷却推进' : '主效果数值'}</small>
          </strong>
          <p>
            {c.kind === 'damage'
              ? '伤害敌方主人'
              : c.kind === 'heal'
                ? '治疗己方主人'
                : c.kind === 'shield'
                  ? '为己方主人提供护盾'
                  : '推进同路其他牌冷却'}{' '}
            · 每 {c.cd} 秒
          </p>
          <p>
            {quality ? '品质效果：' : '待解锁：'}
            {c.effect}
          </p>
          {quality === 2 && <p>大师效果：{c.master}</p>}
          {rarity === 4 && (
            <div className="v4-affix">
              <b>特殊词条 / 回响</b>
              <p>{MIRACLE}</p>
            </div>
          )}
        </article>
        <div>
          <div className="v4-stat-compare">
            {RARITY.map((r, i) => (
              <div className={i === rarity ? 'selected' : ''} key={r.name}>
                <span>{r.name}</span>
                <strong>{stat(id, i, level)}</strong>
                <small>
                  基础 ×{r.base} / 成长 ×{r.growth}
                </small>
              </div>
            ))}
          </div>
          <div className="v4-grow-buttons">
            <span>
              可用材料 {material} · 已投入 {invested}
            </span>
            <button
              className="ds-button"
              disabled={
                destroyed || quality >= 2 || material < 8 * (quality + 1)
              }
              onClick={() => {
                const n = 8 * (quality + 1);
                setQuality((q) => q + 1);
                setMaterial((m) => m - n);
                setInvested((v) => v + n);
              }}
            >
              品质解锁 · {8 * (quality + 1)} 材料
            </button>
            <button
              className="ds-ghost"
              disabled={destroyed || level >= 5 || material < 2 * (level + 1)}
              onClick={() => {
                const n = 2 * (level + 1);
                setLevel((q) => q + 1);
                setMaterial((m) => m - n);
                setInvested((v) => v + n);
              }}
            >
              强化数值 · {2 * (level + 1)} 材料
            </button>
            <button
              className="ds-ghost ds-danger"
              disabled={destroyed}
              onClick={() => {
                setMaterial((m) => m + 3 + Math.floor(invested * 0.7));
                setDestroyed(true);
              }}
            >
              拆解样例 · 返 {3 + Math.floor(invested * 0.7)}
            </button>
          </div>
          <p className="ds-prototype-footnote">
            独立单卡回放计算：本牌发动 {echoCount} 次
            {rarity === 4 ? `，可触发回响 ${Math.floor(echoCount / 3)} 次` : ''}
            。充能卡没有同路目标时不产生额外收益。战斗页可加载完整阵容观察实际胜负。
          </p>
        </div>
      </div>
      <Info>
        {destroyed
          ? '已拆解。重置或加载另一张样卡可恢复实验。'
          : '奇迹样例采用基础 ×2.4、成长 ×2.8，外加每第三次发动的 50% 回响。词条在鉴定时固定，不可免费重抽；本页切换仅用于设计对照。'}
      </Info>
    </div>
  );
}
export default function V04({ moduleId }: { moduleId: ModuleId }) {
  if (moduleId === 'combat') return <Combat />;
  if (moduleId === 'base') return <Base />;
  if (moduleId === 'cards') return <Cards />;
  return <V03 moduleId={moduleId} />;
}
