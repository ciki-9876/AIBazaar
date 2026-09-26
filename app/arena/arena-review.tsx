'use client';
import { useState } from 'react';
import { cardDef } from '@/lib/demo-cards';
import { amplifier } from '@/lib/arena-catalog';
import {
  LANE_NAMES,
  rounded,
  type arenaReview,
} from '@/lib/arena-presentation';
import type { ArenaMatch } from '@/lib/arena-archive';
import type { Duel } from '@/lib/demo-combat';

export function ArenaReview({
  review,
  duel,
  time,
  onSeek,
  previous,
  current,
}: {
  review: ReturnType<typeof arenaReview>;
  duel: Duel;
  time: number;
  onSeek: (t: number) => void;
  previous?: ArenaMatch;
  current: ArenaMatch;
}) {
  const [tab, setTab] = useState('turns'),
    [side, setSide] = useState(0),
    [lane, setLane] = useState(-1);
  const changes = previous
    ? [0, 1, 2].flatMap((l) => {
        const describe = (d: Duel) =>
          d.player
            .filter((c) => Math.floor(c.at / 3) === l)
            .map((c) => `${cardDef(c.id).name}@${(c.at % 3) + 1}`)
            .join('、') || '空路';
        const a = describe(previous.duel),
          b = describe(duel),
          before = previous.duel.arena!.amplifiers[0][l],
          after = duel.arena!.amplifiers[0][l];
        return [
          ...(a !== b ? [`${LANE_NAMES[l]}：${a} → ${b}`] : []),
          ...(before !== after
            ? [
                `${LANE_NAMES[l]}增幅器：${amplifier(before)?.name ?? '无'} → ${amplifier(after)?.name ?? '无'}`,
              ]
            : []),
        ];
      })
    : [];
  const events = review.events.filter(
    (e) => (tab === 'events' || e.important) && (lane < 0 || e.lane === lane),
  );
  return (
    <section className="tac-review" aria-label="整局复盘">
      <div className="tac-review-head">
        <div>
          <small>AFTER ACTION / 整局复盘</small>
          <h2>沿着发生过的事，调整下一局。</h2>
        </div>
        <span>点击事件回到发生时刻 · 当前 {time.toFixed(2)}s</span>
      </div>
      <nav className="tac-tabs" aria-label="复盘内容">
        {[
          ['turns', '局势转折'],
          ['lanes', '三路对照'],
          ['cards', '装备运转'],
          ['events', '效果明细'],
          ['compare', '与上局比较'],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      {['turns', 'events'].includes(tab) && (
        <>
          <div className="tac-review-filters">
            {[-1, 0, 1, 2].map((l) => (
              <button
                key={l}
                aria-pressed={lane === l}
                onClick={() => setLane(l)}
              >
                {l < 0 ? '全部路线' : LANE_NAMES[l]}
              </button>
            ))}
            <small>记录事实与实际收益</small>
          </div>
          <div className="tac-event-list">
            {events.length ? (
              events.map((e) => (
                <button
                  key={e.id}
                  className={Math.abs(e.time - time) < 0.26 ? 'current' : ''}
                  onClick={() => onSeek(e.time)}
                >
                  <time>{e.time.toFixed(2)}s</time>
                  <span>{e.text}</span>
                  <b>↗</b>
                </button>
              ))
            ) : (
              <p>此范围内没有已记录事件。</p>
            )}
          </div>
        </>
      )}
      {['lanes', 'cards'].includes(tab) && (
        <div className="tac-review-filters">
          {[0, 1].map((s) => (
            <button
              key={s}
              aria-pressed={side === s}
              onClick={() => setSide(s)}
            >
              {s ? '敌方' : '我方'}
            </button>
          ))}
        </div>
      )}
      {tab === 'lanes' && (
        <div className="tac-lane-reports">
          {review.lanes[side].map((l, i) => (
            <article key={i}>
              <small>
                0{i + 1} / {LANE_NAMES[i]}
              </small>
              <h3>
                {l.brokenAt === null ? '屏障未破' : `${l.brokenAt}s 破屏`}
              </h3>
              <dl>
                {[
                  ['屏障承伤', l.barrier],
                  ['宿主承伤', l.host],
                  ['其中持续伤害', l.periodic],
                  ['有效修屏', l.repair],
                ].map(([label, n]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{rounded(Number(n))}</dd>
                  </div>
                ))}
              </dl>
              {l.brokenAt !== null && (
                <button onClick={() => onSeek(l.brokenAt!)}>回看破屏 →</button>
              )}
            </article>
          ))}
        </div>
      )}
      {tab === 'cards' && (
        <>
          <p className="tac-muted">
            伤害统计为可归属的直接效果；灼烧、侵蚀的持续伤害合并在路线统计。控制计成功施加次数，充能计实际注入的冷却进度。
            宿主共恢复 {rounded(review.healing[side])} 点，其中再生{' '}
            {rounded(review.regeneration[side])} 点；下表治疗列仅计直接治疗。
          </p>
          <div className="tac-report-scroll">
            <table>
              <thead>
                <tr>
                  <th>装备 / 位置</th>
                  <th>发动</th>
                  <th>直接伤害</th>
                  <th>修屏</th>
                  <th>治疗</th>
                  <th>充能</th>
                  <th>控制</th>
                  <th>装填</th>
                </tr>
              </thead>
              <tbody>
                {(side ? duel.enemy : duel.player).map((c) => {
                  const r = review.cards[c.uid];
                  return (
                    <tr key={c.uid}>
                      <th>
                        {cardDef(c.id).name}
                        <small>
                          {LANE_NAMES[Math.floor(c.at / 3)]} · 第
                          {(c.at % 3) + 1}格
                        </small>
                      </th>
                      {[
                        r.fired,
                        r.damage,
                        r.repair,
                        r.heal,
                        r.charge,
                        r.control,
                        r.ammo,
                      ].map((n, i) => (
                        <td key={i}>
                          {rounded(n)}
                          {i === 4 ? 's' : ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === 'compare' &&
        (previous ? (
          <div className="tac-comparison">
            <h3>相对上一场调整</h3>
            {changes.length ? (
              changes.map((c, i) => <p key={i}>{c}</p>)
            ) : (
              <p>己方卡牌位置与增幅器未变。</p>
            )}
            <p>
              对手：{previous.duel.name} → {duel.name}
            </p>
            <div className="tac-compare-results">
              <span>
                己方剩余生命{' '}
                <b>
                  {previous.summary.finalHp[0]} → {current.summary.finalHp[0]}
                </b>
              </span>
              <span>
                对手剩余生命{' '}
                <b>
                  {previous.summary.finalHp[1]} → {current.summary.finalHp[1]}
                </b>
              </span>
              <span>
                时长{' '}
                <b>
                  {previous.summary.duration}s → {current.summary.duration}s
                </b>
              </span>
            </div>
            <p className="tac-muted">
              这些变化是两局的事实对照；单次对比不足以证明某张牌或调整普遍更强。
            </p>
          </div>
        ) : (
          <p className="tac-muted">
            从一场对局点击“调整阵容”后再战，即可比较两局的布阵与结果。
          </p>
        ))}
    </section>
  );
}
