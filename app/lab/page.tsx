'use client';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation for static Sites routes. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ARCHETYPES, archetypeDuel, PERMUTATIONS } from '@/lib/demo-archetypes';
import { CARDS, cardDef, SCHOOLS, type School } from '@/lib/demo-cards';
import { rarityOf } from '@/lib/demo-card-rules';
import { simulateDuel, type Duel, type FighterCard } from '@/lib/demo-combat';
import report from '@/lib/archetype-report.json';
import CardFace from '../demo/card-face';
import CardDetail from '../demo/card-detail';
import BattleEffects from '../demo/battle-effects';
import ScrollChrome from '../demo/scroll-chrome';
import '../demo/demo.css';
import './lab.css';

export default function Lab() {
  const [schools, setSchools] = useState<School[]>(['rush', 'erosion']);
  const [variants, setVariants] = useState([0, 0]),
    [lanes, setLanes] = useState([0, 0]);
  const [stage, setStage] = useState(0),
    [editing, setEditing] = useState(true),
    [showReport, setShowReport] = useState(false);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<{
    side: number;
    uid: string;
  } | null>(null);
  const profiles = [
    [300, 0, 0],
    [300, 1, 2],
    [400, 2, 5],
  ];
  const [hp, quality, level] = profiles[stage];
  const duel = useMemo(() => {
    const d = archetypeDuel(
      schools[0],
      schools[1],
      variants[0],
      variants[1],
      lanes[0],
      lanes[1],
      hp,
      quality,
      level,
    );
    for (const board of [d.player, d.enemy])
      for (const card of board) {
        const id = changes[card.uid];
        if (id && cardDef(id).size === cardDef(card.id).size) {
          card.id = id;
          card.rarity = rarityOf(id);
        }
      }
    return d;
  }, [schools, variants, lanes, hp, quality, level, changes]);
  const chosen = selected
    ? (selected.side ? duel.enemy : duel.player).find(
        (c) => c.uid === selected.uid,
      )
    : null;
  return (
    <main className="elevator-demo in-combat f9-lab">
      <header className="lab-header">
        <a href="/demo">← 返回电梯</a>
        <h1>三路 · 流派试验场</h1>
        <button
          onClick={() => {
            setEditing(!editing);
            setShowReport(false);
          }}
        >
          配置对局
        </button>
        <button
          onClick={() => {
            setShowReport(!showReport);
            setEditing(false);
          }}
        >
          设计与测试
        </button>
      </header>
      <Replay
        key={JSON.stringify(duel)}
        duel={duel}
        paused={editing || showReport}
        onPlay={() => {
          setEditing(false);
          setShowReport(false);
        }}
        onSelect={(side, uid) => {
          setSelected({ side, uid });
          setEditing(true);
          setShowReport(false);
        }}
      />
      {editing && (
        <aside className="lab-drawer">
          <header>
            <h2>装配试验</h2>
            <button onClick={() => setEditing(false)}>收起 ×</button>
          </header>
          <p>
            完整开放 9
            格。不读取或改动冒险存档。点击棋盘卡牌，可换成任意同尺寸卡牌。
          </p>
          {[0, 1].map((side) => (
            <section key={side}>
              <h3>{side ? '敌方' : '我方'}</h3>
              <label>
                流派
                <select
                  value={schools[side]}
                  onChange={(e) => {
                    setSchools((s) =>
                      s.map((x, i) =>
                        i === side ? (e.target.value as School) : x,
                      ),
                    );
                    setChanges({});
                    setSelected(null);
                  }}
                >
                  {ARCHETYPES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>{ARCHETYPES.find((a) => a.id === schools[side])?.core}</p>
              <div className="lab-select-pair">
                <label>
                  构筑变体
                  <select
                    value={variants[side]}
                    onChange={(e) => {
                      setVariants((v) =>
                        v.map((x, i) => (i === side ? +e.target.value : x)),
                      );
                      setChanges({});
                    }}
                  >
                    <option value={0}>体系标准</option>
                    <option value={1}>偏重主输出</option>
                  </select>
                </label>
                <label>
                  三路排序
                  <select
                    value={lanes[side]}
                    onChange={(e) =>
                      setLanes((v) =>
                        v.map((x, i) => (i === side ? +e.target.value : x)),
                      )
                    }
                  >
                    {PERMUTATIONS.map((p, i) => (
                      <option key={i} value={i}>
                        {p.map((n) => ['甲', '乙', '丙'][n]).join(' → ')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          ))}
          <label>
            双方成长阶段
            <select value={stage} onChange={(e) => setStage(+e.target.value)}>
              <option value={0}>基础 · Lv 0 · 300 生命</option>
              <option value={1}>精制 · Lv 2 · 300 生命</option>
              <option value={2}>大师 · Lv 5 · 400 生命</option>
            </select>
          </label>
          {chosen && (
            <section>
              <h3>{cardDef(chosen.id).name}</h3>
              <CardDetail card={chosen} />
              <label>
                同尺寸替换
                <select
                  value={chosen.id}
                  onChange={(e) =>
                    setChanges((v) => ({ ...v, [chosen.uid]: e.target.value }))
                  }
                >
                  {CARDS.filter((c) => c.size === cardDef(chosen.id).size).map(
                    (c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.school ? SCHOOLS[c.school] : '通用'}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </section>
          )}
          <button
            onClick={() => {
              setChanges({});
              setSelected(null);
            }}
          >
            恢复流派预设
          </button>
          <p>改动配置会从 0 秒重算。收起面板后点击播放。</p>
        </aside>
      )}
      {showReport && (
        <aside className="lab-drawer lab-report">
          <header>
            <h2>让流派拥有决策</h2>
            <button onClick={() => setShowReport(false)}>收起 ×</button>
          </header>
          <p>
            先定义赢法，再设计启动牌、收益牌与反制窗口。互相克制来自攻击方式和启动速度，没有流派专属伤害加成。
          </p>
          {ARCHETYPES.map((a) => (
            <section key={a.id}>
              <h3>
                {a.name} → {SCHOOLS[a.beats]}
              </h3>
              <p>{a.core}</p>
              <p>弱点：{a.weakness}</p>
              <p>
                {CARDS.filter((c) => c.school === a.id)
                  .map((c) => c.name)
                  .join(' / ')}
              </p>
            </section>
          ))}
          <h3>4,320 场预设对局</h3>
          <p>{report.method}</p>
          <table>
            <thead>
              <tr>
                <th>优势对局</th>
                <th>胜 / 平 / 负</th>
              </tr>
            </thead>
            <tbody>
              {ARCHETYPES.map((a) => {
                const rows = report.rows.filter((r) => r.school === a.id);
                return (
                  <tr key={a.id}>
                    <td>
                      {a.name} → {SCHOOLS[a.beats]}
                    </td>
                    <td>
                      {rows.reduce((n, r) => n + r.win, 0)} /{' '}
                      {rows.reduce((n, r) => n + r.draw, 0)} /{' '}
                      {rows.reduce((n, r) => n + r.loss, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p>
            测试中没有触及 90
            秒上限，交换敌我后胜负对称。这里的胜率仅描述选定样本，不能代表所有构筑。
          </p>
          <h3>当前判断</h3>
          <p>
            克制链清楚，但纯流派克制偏硬。趣味点是针对对手换一张牌、调整搭配，不应变成只猜流派名称。尚未经过真实玩家体验测试。
          </p>
          <p>
            可尝试：固守对侵蚀，把缓冲垫换成猎隙刃；侵蚀对速攻，把催化管换成补漏胶；速攻对固守，用蚀液喷壶替换一张钉枪。观察收益与代价。
          </p>
          <a href="/archetype-design.md" target="_blank" rel="noreferrer">
            完整卡表、方法与评估 ↗
          </a>
        </aside>
      )}
      <ScrollChrome />
    </main>
  );
}

function Replay({
  duel,
  paused,
  onPlay,
  onSelect,
}: {
  duel: Duel;
  paused: boolean;
  onPlay: () => void;
  onSelect: (side: number, uid: string) => void;
}) {
  const result = useMemo(() => simulateDuel(duel), [duel]),
    [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const [hover, setHover] = useState<FighterCard | null>(null),
    surface = useRef<HTMLDivElement>(null);
  const finished = cursor === result.frames.length - 1,
    active = playing && !paused && !finished,
    fr = result.frames[cursor];
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(
      () => setCursor((i) => Math.min(result.frames.length - 1, i + 1)),
      250 / speed,
    );
    return () => clearInterval(timer);
  }, [active, speed, result.frames.length]);
  const host = (side: number) => (
    <div
      className={'ed-actor ' + (side ? 'enemy' : '')}
      data-entity={`host-${side}`}
    >
      <div className="ed-host-hitboxes">
        {[0, 1, 2].map((lane) => (
          <span key={lane} data-entity={`host-${side}-lane-${lane}`} />
        ))}
      </div>
      <div className="ed-actor-info">
        <div>
          <strong>{side ? '敌方' : '我方'}宿主</strong>
          <b>
            {Math.ceil(fr.hp[side])}
            <small> / {duel.maxHp[side]}</small>
          </b>
        </div>
        <div className="lab-health">
          <i style={{ width: (fr.hp[side] / duel.maxHp[side]) * 100 + '%' }} />
        </div>
      </div>
    </div>
  );
  const barriers = (side: number) => (
    <div className="ed-barriers">
      {fr.barriers[side].map((b, lane) => (
        <div
          className={'ed-barrier ' + (b.broken ? 'broken' : '')}
          key={lane}
          data-entity={`barrier-${side}-${lane}`}
        >
          <div>
            <strong>{['上路', '中路', '下路'][lane]}</strong>
            {fr.corrosion[side][lane] > 0 && (
              <em className="ed-corrosion-badge">
                侵蚀 {+fr.corrosion[side][lane].toFixed(1)}
              </em>
            )}
            <span>
              {b.broken
                ? '屏障损毁'
                : `${Math.ceil(b.hp)} / ${Math.ceil(b.maxHp)}`}
            </span>
          </div>
          <div className="ed-barrier-track">
            <i style={{ width: (b.hp / b.maxHp) * 100 + '%' }} />
          </div>
        </div>
      ))}
    </div>
  );
  const board = (side: number) => (
    <div className={'ed-board ' + (side ? 'enemy' : '')}>
      {[0, 1, 2].map((lane) => (
        <div className="ed-lane" key={lane}>
          <div className="ed-lane-cells">
            {(side ? duel.enemy : duel.player)
              .filter((c) => Math.floor(c.at / 3) === lane)
              .map((card) => (
                <button
                  key={card.uid}
                  data-entity={card.uid}
                  className={`ed-card ed-card-v2 rarity-${card.rarity} quality-${card.quality}${fr.fired.includes(card.uid) ? ' firing' : ''}`}
                  style={{
                    gridColumn: `${(card.at % 3) + 1} / span ${cardDef(card.id).size}`,
                  }}
                  onClick={() => {
                    setHover(null);
                    onSelect(side, card.uid);
                  }}
                  onMouseEnter={() => setHover(card)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(card)}
                  onBlur={() => setHover(null)}
                  aria-label={`${cardDef(card.id).name}，点击更换同尺寸卡牌`}
                >
                  <CardFace
                    card={card}
                    stored={fr.stored[card.uid] ?? 0}
                    enemy={side === 1}
                    progress={
                      fr.timers[side][card.at] / (fr.cd[side][card.at] || 1)
                    }
                    cooldown={fr.cd[side][card.at]}
                    waiting={fr.waiting.includes(card.uid)}
                    playing={active}
                    speed={speed}
                  />
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <section className="lab-replay">
      <div className="ed-battle-scroll">
        <div className="ed-vertical-battle" ref={surface}>
          <BattleEffects
            surface={surface}
            frames={result.frames}
            cursor={cursor}
            playing={active}
            speed={speed}
          />
          {host(1)}
          {barriers(1)}
          {board(1)}
          <div className="ed-battle-divider">
            <span>上路</span>
            <strong>{fr.time.toFixed(2)} s</strong>
            <span>下路</span>
          </div>
          {board(0)}
          {barriers(0)}
          {host(0)}
        </div>
      </div>
      <footer className="lab-controls">
        <button
          onClick={() => {
            onPlay();
            if (finished) setCursor(0);
            setPlaying(!active);
          }}
        >
          {finished ? '重播' : active ? '暂停' : '播放'}
        </button>
        <button
          onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
        >
          {speed}×
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            setCursor(0);
          }}
        >
          回到开场
        </button>
        <label>
          回放
          <input
            aria-label="回放进度"
            type="range"
            min={0}
            max={result.frames.length - 1}
            value={cursor}
            onChange={(e) => {
              setPlaying(false);
              setCursor(+e.target.value);
            }}
          />
        </label>
        <b>
          {finished
            ? result.winner === -1
              ? '平局'
              : result.winner === 0
                ? '我方胜利'
                : '敌方胜利'
            : '点击卡牌可配置 · 悬停查看详情'}
        </b>
      </footer>
      {hover && !paused && (
        <div className="lab-card-preview">
          <h3>{cardDef(hover.id).name}</h3>
          <CardDetail card={hover} />
        </div>
      )}
    </section>
  );
}
