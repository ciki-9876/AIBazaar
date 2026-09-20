'use client';
import { sitePath } from '@/lib/site-path';
import Replay from './battle-replay';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation for static Sites routes. */
import { useMemo, useState } from 'react';
import { ARCHETYPES, archetypeDuel, PERMUTATIONS } from '@/lib/demo-archetypes';
import { CARDS, cardDef, SCHOOLS, type School } from '@/lib/demo-cards';
import { rarityOf } from '@/lib/demo-card-rules';
import report from '@/lib/archetype-report.json';
import CardDetail from '../demo/card-detail';
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
        <a href={sitePath('/design')}>物品用途手册 ↗</a>
        <a href={sitePath('/demo')}>← 返回电梯</a>
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
            基础品质的标准配方存在预期克制；加入变体或升到大师后，部分关系会反转。此表包含这些未收敛场景，不能视为所有成长阶段已平衡。尚未经过独立玩家测试。
          </p>
          <p>
            可尝试：固定血量与成长，仅交换上、中、右路。对照关键破路时点与实际充能目标；相同胜负也可能有不同过程。
          </p>
          <a
            href={sitePath('/archetype-design.md')}
            target="_blank"
            rel="noreferrer"
          >
            完整卡表、方法与评估 ↗
          </a>
        </aside>
      )}
      <ScrollChrome />
    </main>
  );
}
