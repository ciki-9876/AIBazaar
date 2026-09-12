'use client';
/* oxlint-disable next/no-html-link-for-pages -- Native anchors for static Sites hosting. */
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Hammer, Wrench, BookOpen, ArrowRight } from 'lucide-react';
import { HEROES, heroDef, heroOwner } from '@/lib/heroes';
import { type HeroId } from '@/lib/hero-cards';
import { HERO_DECKS, heroBoard, heroPool } from '@/lib/hero-decks';
import { addHeroCard, compactHeroLane } from '@/lib/hero-builder';
import { cardDef } from '@/lib/demo-cards';
import { rarityOf } from '@/lib/demo-card-rules';
import type { Duel, FighterCard } from '@/lib/demo-combat';
import report from '@/lib/hero-report.json';
import Replay from '../lab/battle-replay';
import CardDetail from '../demo/card-detail';
import ScrollChrome from '../demo/scroll-chrome';
import '../demo/demo.css';
import '../lab/lab.css';
import './heroes.css';

const initial = (index: number, side: number) =>
  heroBoard(HERO_DECKS[index], side ? 'e' : 'p');
export default function Heroes() {
  const [view, setView] = useState('archive'),
    [heroes, setHeroes] = useState<HeroId[]>(['breaker', 'mender']);
  const [boards, setBoards] = useState<FighterCard[][]>(() => [
    initial(0, 0),
    initial(3, 1),
  ]);
  const [editing, setEditing] = useState(true),
    [side, setSide] = useState(0),
    [lane, setLane] = useState(0),
    [level, setLevel] = useState(0),
    [quality, setQuality] = useState(0),
    [hp, setHp] = useState(300);
  const [filter, setFilter] = useState('exclusive'),
    [size, setSize] = useState(0),
    [message, setMessage] = useState('点击卡池中的卡牌，将它加入选中的一路。'),
    [selected, setSelected] = useState('c-ram');
  const duel = useMemo<Duel>(
    () => ({
      player: boards[0].map((c) => ({ ...c, level, quality })),
      enemy: boards[1].map((c) => ({ ...c, level, quality })),
      heroes,
      maxHp: [hp, hp],
      weather: 0,
      layout: 0,
      name: '回响试验',
      kind: 'guardian',
      botId: null,
    }),
    [boards, heroes, hp, level, quality],
  );
  const loadDeck = (index: number, target: number) => {
    const deck = HERO_DECKS[index];
    setHeroes((v) => v.map((x, i) => (i === target ? deck.hero : x)));
    setBoards((v) =>
      v.map((x, i) => (i === target ? initial(index, target) : x)),
    );
    setSelected(deck.lanes[0][0]);
    setMessage(deck.idea);
  };
  const add = (id: string) => {
    setSelected(id);
    try {
      const next = addHeroCard(
        boards[side],
        heroes[side],
        id,
        lane,
        side ? 'e' : 'p',
      );
      setBoards((v) => v.map((x, i) => (i === side ? next : x)));
      setMessage(`已加入${['上路', '中路', '下路'][lane]}。`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  const specimen = {
    id: selected,
    uid: 'specimen',
    at: 0,
    rarity: rarityOf(selected),
    level,
    quality,
  };
  const used = boards[side].reduce((n, c) => n + cardDef(c.id).size, 0);
  return (
    <main
      className={
        'elevator-demo hero-screen ' +
        (view === 'battle' ? 'in-combat f9-lab' : '')
      }
    >
      <header className="hero-top">
        <a href="/demo">← 电梯</a>
        <span>F9 / 回响档案</span>
        <nav aria-label="回响试验场页面">
          {[
            ['archive', '回响档案'],
            ['battle', '构筑试验'],
            ['report', '实测报告'],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <a href="/lab">上一轮流派试验 ↗</a>
      </header>
      {view === 'archive' && (
        <div className="hero-page-scroll">
          <section className="hero-intro">
            <p>PERSONALITY RECORD / ACCESS GRANTED</p>
            <h1>
              有人离开了。
              <br />
              他们的方法留了下来。
            </h1>
            <div>
              <p>
                电梯保存着往届参与者的技能回响。你仍然是你，可以在基地接入不同档案，借用他们的技艺与记忆遗物。
              </p>
              <p>
                建议规则：一场战斗激活一位，漫长旅程体验多位。专属卡只供对应回响上阵，中立卡始终通用。
              </p>
              <small>可实测设计提案 · 暂未改变冒险中的解锁、掉落与存档</small>
            </div>
          </section>
          <section className="hero-dossiers">
            {HEROES.map((hero, i) => {
              const Icon = [Hammer, Wrench, BookOpen][i];
              return (
                <article
                  key={hero.id}
                  style={{ '--hero-accent': hero.color } as CSSProperties}
                >
                  <p className="hero-code">
                    {hero.code}
                    <span>技能回响</span>
                  </p>
                  <Icon className="hero-seal" size={42} />
                  <h2>
                    {hero.name}
                    <small>{hero.job}</small>
                  </h2>
                  <blockquote>“{hero.quote}”</blockquote>
                  <h3>英雄被动</h3>
                  <p>{hero.passive}</p>
                  <h3>构筑问题</h3>
                  <p>{hero.question}</p>
                  <p className="hero-count">
                    {heroPool(hero.id).filter((c) => heroOwner(c.id)).length}{' '}
                    张专属卡 · 1 / 2 / 3 格规格
                  </p>
                  <button
                    onClick={() => {
                      loadDeck(i * 3, 0);
                      setSide(0);
                      setView('battle');
                      setEditing(true);
                    }}
                  >
                    接入并装配 <ArrowRight size={16} />
                  </button>
                </article>
              );
            })}
          </section>
          <section className="hero-proposal">
            <h2>让转型成为旅程，而不是重开</h2>
            <div>
              <h3>专属卡从哪里来</h3>
              <p>
                「记忆遗物」具有明确主人：破门机、维修站、旧档案。实体先带回鉴定台，识别为固定稀有度的卡牌。拾到未激活回响的遗物仍可鉴定和收藏，切换后使用。
              </p>
            </div>
            <div>
              <h3>什么时候切换</h3>
              <p>
                建议在电梯基地自由切换、出发后锁定。各回响保存一套卡组预设，共享中立卡的实际库存；切换只移动物品，不复制卡牌。战斗中不切换。
              </p>
            </div>
            <div>
              <h3>怎样避免半局才成型</h3>
              <p>
                建议首次接入赠送可支撑 6 格的种子卡；第 3、6
                层各安排一次其他回响的保底发现。转型时允许退还旧卡的强化材料，保留其卡牌与品阶，使换玩法不必重新攒一套强化投入。
              </p>
            </div>
            <div>
              <h3>先不添加新的养成</h3>
              <p>
                不增加英雄等级、装备槽或专属货币。特色来自一个被动、独占卡池和中立卡搭配。上面的解锁与材料退还仍是待验收方案，当前只在此试验场验证战斗。
              </p>
            </div>
          </section>
        </div>
      )}
      {view === 'battle' && (
        <>
          <Replay
            key={JSON.stringify(duel)}
            duel={duel}
            paused={editing}
            onPlay={() => setEditing(false)}
            onSelect={(target, uid) => {
              setSide(target);
              const c = boards[target].find((c) => c.uid === uid);
              if (c) {
                setLane(Math.floor(c.at / 3));
                setSelected(c.id);
              }
              setEditing(true);
            }}
          />
          <button
            className="hero-editor-toggle"
            onClick={() => setEditing(!editing)}
          >
            {editing ? '收起装配' : '编辑卡组'}
          </button>
          {editing && (
            <aside className="lab-drawer hero-editor">
              <header>
                <h2>九格，自由装配</h2>
                <button onClick={() => setEditing(false)}>收起 ×</button>
              </header>
              <div className="hero-side-picker">
                {[0, 1].map((i) => (
                  <button
                    key={i}
                    aria-pressed={side === i}
                    onClick={() => {
                      setSide(i);
                      setSelected(
                        boards[i][0]?.id ?? heroPool(heroes[i])[0].id,
                      );
                    }}
                  >
                    {i ? '敌方' : '我方'} · {heroDef(heroes[i]).name}
                  </button>
                ))}
              </div>
              <label>
                读取预设 / 切换回响
                <select
                  value=""
                  onChange={(e) => loadDeck(+e.target.value, side)}
                >
                  <option value="" disabled>
                    选择一套起点，可继续增减卡牌
                  </option>
                  {HERO_DECKS.map((d, i) => (
                    <option key={d.id} value={i}>
                      {heroDef(d.hero).name} · {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>{heroDef(heroes[side]).passive}</p>
              <div className="hero-mini-board">
                {[0, 1, 2].map((row) => (
                  <section key={row} className={row === lane ? 'chosen' : ''}>
                    <button onClick={() => setLane(row)}>
                      {['上路', '中路', '下路'][row]}
                    </button>
                    <div>
                      {[0, 1, 2].map((col) => {
                        const at = row * 3 + col,
                          c = boards[side].find((c) => c.at === at);
                        if (
                          boards[side].some(
                            (c) => c.at < at && c.at + cardDef(c.id).size > at,
                          )
                        )
                          return null;
                        return c ? (
                          <button
                            key={col}
                            title="点击移除"
                            style={{
                              gridColumn: `${col + 1} / span ${cardDef(c.id).size}`,
                            }}
                            onClick={() => {
                              setSelected(c.id);
                              setBoards((v) =>
                                v.map((b, i) =>
                                  i === side
                                    ? b.filter((x) => x.uid !== c.uid)
                                    : b,
                                ),
                              );
                            }}
                          >
                            {cardDef(c.id).name}
                            <small>移除 ×</small>
                          </button>
                        ) : (
                          <button
                            key={col}
                            style={{ gridColumn: col + 1 }}
                            onClick={() => setLane(row)}
                            aria-label={`选择${['上', '中', '下'][row]}路`}
                          >
                            ＋
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
              <p>
                {boards[side].length} 张 · {used} / 9 格 · 按现行实体价格约{' '}
                {boards[side].reduce((n, c) => n + 3 + cardDef(c.id).size, 0)}{' '}
                金币
              </p>
              <div className="hero-side-picker">
                <button
                  onClick={() =>
                    setBoards((v) =>
                      v.map((b, i) =>
                        i === side ? compactHeroLane(b, lane) : b,
                      ),
                    )
                  }
                >
                  整理本路
                </button>
                <button
                  onClick={() =>
                    setBoards((v) => v.map((b, i) => (i === side ? [] : b)))
                  }
                >
                  清空本方
                </button>
              </div>
              <output className="hero-message">{message}</output>
              <div className="lab-select-pair">
                <label>
                  卡池
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">专属 + 中立</option>
                    <option value="exclusive">只看专属</option>
                    <option value="neutral">只看中立</option>
                  </select>
                </label>
                <label>
                  尺寸
                  <select
                    value={size}
                    onChange={(e) => setSize(+e.target.value)}
                  >
                    <option value={0}>全部尺寸</option>
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n} 格
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="hero-card-pool">
                {heroPool(heroes[side])
                  .filter(
                    (c) =>
                      (!size || c.size === size) &&
                      (filter === 'all' ||
                        (filter === 'exclusive'
                          ? !!heroOwner(c.id)
                          : !heroOwner(c.id))),
                  )
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => add(c.id)}
                      onMouseEnter={() => setSelected(c.id)}
                      onFocus={() => setSelected(c.id)}
                    >
                      <strong>{c.name}</strong>
                      <span>
                        {c.size} 格 · {c.cd}s ·{' '}
                        {heroOwner(c.id) ? '专属' : '中立'}
                      </span>
                    </button>
                  ))}
              </div>
              <section>
                <h3>{cardDef(selected).name}</h3>
                <CardDetail card={specimen} />
              </section>
              <div className="lab-select-pair">
                <label>
                  双方生命
                  <select value={hp} onChange={(e) => setHp(+e.target.value)}>
                    {[240, 300, 360, 450].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  双方强化
                  <select
                    value={level}
                    onChange={(e) => setLevel(+e.target.value)}
                  >
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        Lv {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                双方品阶
                <select
                  value={quality}
                  onChange={(e) => setQuality(+e.target.value)}
                >
                  {['基础', '精制', '大师'].map((x, i) => (
                    <option key={x} value={i}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <p>战斗外修改会从 0 秒重算。不读取或改动冒险存档。</p>
            </aside>
          )}
        </>
      )}
      {view === 'report' && (
        <div className="hero-page-scroll hero-report">
          <h1>先验证选择，再扩充卡池。</h1>
          <p>
            真实战斗引擎，全部九格，无英雄伤害克制系数。每位 3 种预设，4–9
            张卡。共 {report.mainCases.toLocaleString()}{' '}
            场预设对局，另有英雄被动对照、中立替代和固定种子混搭探测。
          </p>
          <p>
            各构筑同格数、同生命与成长阶段；卡牌数量与价格不同，不能把结果当作等金币预算下的平衡结论。
          </p>
          <h2>九种构筑 · 基础阶段</h2>
          <table>
            <thead>
              <tr>
                <th>英雄 / 构筑</th>
                <th>专属 / 总张数</th>
                <th>胜 / 平 / 负</th>
                <th>胜率</th>
              </tr>
            </thead>
            <tbody>
              {report.decks.map((d) => {
                const rows = report.rows.filter(
                    (r) => r.a === d.id && r.hp === 300 && r.b !== d.id,
                  ),
                  w = rows.reduce((n, r) => n + r.wins, 0),
                  draw = rows.reduce((n, r) => n + r.draws, 0),
                  total = rows.reduce((n, r) => n + r.cases, 0);
                return (
                  <tr key={d.id}>
                    <td>
                      {heroDef(d.hero as HeroId).name} · {d.name}
                    </td>
                    <td>
                      {d.exclusive} / {d.count}
                    </td>
                    <td>
                      {w} / {draw} / {total - w - draw}
                    </td>
                    <td>{((w / total) * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <h2>成长阶段的差异</h2>
          <p>
            以下只统计跨英雄对战，每个单元格 648
            场；同英雄内战另计。三组预设权重相同，胜率不包含平局。
          </p>
          <table>
            <thead>
              <tr>
                <th>英雄</th>
                <th>基础 · Lv 0</th>
                <th>精制 · Lv 2</th>
                <th>大师 · Lv 5</th>
              </tr>
            </thead>
            <tbody>
              {HEROES.map((hero) => {
                const ids = HERO_DECKS.filter((d) => d.hero === hero.id).map(
                  (d) => d.id,
                );
                return (
                  <tr key={hero.id}>
                    <td>{hero.name}</td>
                    {[300, 360, 450].map((hp) => {
                      const rows = report.rows.filter(
                        (r) =>
                          r.hp === hp &&
                          ids.includes(r.a) &&
                          !ids.includes(r.b),
                      );
                      return (
                        <td key={hp}>
                          {(
                            (rows.reduce((n, r) => n + r.wins, 0) /
                              rows.reduce((n, r) => n + r.cases, 0)) *
                            100
                          ).toFixed(1)}
                          %
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p>
            这里已经能看到风险：闻砂在高强化样本中仍偏弱；岑火的先手价值会放大。不能据基础阶段的局部胜率宣布三英雄已平衡。
          </p>
          <p>
            主测试有 {report.rows.reduce((n, r) => n + r.timeout, 0)} 场达到 90
            秒上限，集中在内战；对调敌我后，
            {report.mirrors === 0
              ? '全部胜负对称'
              : `${report.mirrors} 个配置仍存在差异`}
            。这些都保留在结果里，没有靠空间坍缩强行结束。
          </p>
          <h2>英雄被动是否真的改变结果</h2>
          <p>
            保持专属卡合法，只关闭我方被动，对手不变。每种构筑 54
            场基础阶段对照；胜场差不等于被动全部价值，未翻盘的时间差与存活差也值得观察。
          </p>
          <table>
            <thead>
              <tr>
                <th>构筑</th>
                <th>开启被动胜场</th>
                <th>关闭被动胜场</th>
              </tr>
            </thead>
            <tbody>
              {report.passive.map((r) => (
                <tr key={r.id}>
                  <td>{HERO_DECKS.find((d) => d.id === r.id)?.name}</td>
                  <td>
                    {r.enabled} / {r.cases}
                  </td>
                  <td>
                    {r.disabled} / {r.cases}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>还不能下的结论</h2>
          <p>
            这些是确定性测试样本，不是玩家胜率。部分换路互为对称等价。预设经过调优；随机混搭使用固定种子，未据此反复挑选赢家。实际趣味度、长局掉落节奏、强化投入的转换成本，还需要玩家体验与冒险验证。
          </p>
          <a href="/hero-design.md" target="_blank" rel="noreferrer">
            阅读完整英雄卡表、包装规则与测试评估 ↗
          </a>
        </div>
      )}
      <ScrollChrome />
    </main>
  );
}
