import type { CSSProperties } from 'react';
import { cardDef } from '@/lib/demo-cards';
import type { CombatFrame, Duel, FighterCard } from '@/lib/demo-combat';
import { ATLAS, KIND, LANES } from './art-data';
export default function FlatBattle({
  duel,
  frame: f,
  selected,
  onSelect,
}: {
  duel: Duel;
  frame: CombatFrame;
  selected?: string;
  onSelect: (c: FighterCard) => void;
}) {
  const boards = [duel.player, duel.enemy];
  const point = (
    uid: string | undefined,
    side: number,
    lane: number,
    host = false,
  ) => {
    if (host) return { x: side ? 99 : 1, y: 17 + lane * 33 };
    const c = boards.flat().find((c) => c.uid === uid);
    if (c) {
      const s = boards[0].some((v) => v.uid === uid) ? 0 : 1;
      const size = cardDef(c.id).size;
      return {
        x: s
          ? 60 + ((c.at % 3) + size / 2) * 11
          : 40 - ((c.at % 3) + size / 2) * 11,
        y: 17 + Math.floor(c.at / 3) * 33,
      };
    }
    return {
      x: f.barriers[side][lane].broken ? (side ? 99 : 1) : side ? 56 : 44,
      y: 17 + lane * 33,
    };
  };
  return (
    <div className="art-flat">
      <div className="art-charcoal-scene" />
      <div className="art-flat-board">
        <div className="art-board-captions">
          <span>YOUR INVENTORY / 幸存者</span>
          <span>CHECKPOINT / 封锁者</span>
        </div>
        {[0, 1, 2].map((lane) => (
          <div className="art-flat-lane" key={lane}>
            {boards.map((board, side) => (
              <div className={`art-flat-side side-${side}`} key={side}>
                <div className="art-flat-slots">
                  {board
                    .filter((c) => Math.floor(c.at / 3) === lane)
                    .map((c) => {
                      const d = cardDef(c.id),
                        progress = Math.min(
                          1,
                          f.timers[side][c.at] / (f.cd[side][c.at] || 1),
                        );
                      return (
                        <button
                          key={c.uid}
                          className={`art-card ${f.fired.includes(c.uid) ? 'fired' : ''} ${selected === c.uid ? 'selected' : ''}`}
                          style={
                            {
                              gridColumn: `${side ? (c.at % 3) + 1 : 4 - (c.at % 3) - d.size} / span ${d.size}`,
                              '--cooldown': `${progress * 100}%`,
                            } as CSSProperties
                          }
                          onClick={() => onSelect(c)}
                          aria-label={`${side ? '敌方' : '我方'}${LANES[lane]} ${d.name}，${KIND[d.kind] ?? '效果'} ${d.power}，冷却 ${d.cd} 秒`}
                        >
                          <span className="art-card-rarity">
                            {['•', '••', '•••'][Math.min(2, c.rarity)]}
                            <em>{d.size} 格</em>
                          </span>
                          <span
                            className="art-card-picture"
                            style={{
                              backgroundPosition: `${(ATLAS[c.id] % 3) * 50}% ${Math.floor(ATLAS[c.id] / 3) * 50}%`,
                            }}
                          />
                          <strong>{d.name}</strong>
                          <span className="art-card-stats">
                            <b>
                              {d.power}
                              <small>{KIND[d.kind] ?? '效果'}</small>
                            </b>
                            <i>
                              {Math.max(
                                0,
                                (f.cd[side][c.at] || d.cd) -
                                  f.timers[side][c.at],
                              ).toFixed(1)}
                              s
                            </i>
                          </span>
                          <span className="art-cd">
                            <i />
                          </span>
                        </button>
                      );
                    })}
                </div>
                <div
                  className={`art-flat-barrier ${f.barriers[side][lane].broken ? 'broken' : ''}`}
                >
                  <span>
                    {f.barriers[side][lane].broken
                      ? '× 破损'
                      : Math.ceil(f.barriers[side][lane].hp)}
                  </span>
                  <div>
                    <i
                      style={{
                        height: `${(f.barriers[side][lane].hp / (duel.maxHp[side] * 0.3)) * 100}%`,
                      }}
                    />
                  </div>
                  {f.corrosion[side][lane] > 0 && (
                    <em>蚀 {f.corrosion[side][lane].toFixed(0)}</em>
                  )}
                </div>
              </div>
            ))}
            <span className="art-lane-index">
              {['I', 'II', 'III'][lane]}
              <small>{LANES[lane]}</small>
            </span>
          </div>
        ))}
        <svg
          className="art-projectiles"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {f.projectiles.map((p) => {
            const from = point(p.sourceUid, 1 - p.side, p.targetLane ?? 1),
              to = point(
                p.targetUid,
                p.side,
                p.targetLane ?? 1,
                p.kind === 'heal' || p.kind === 'energy',
              ),
              t = Math.min(
                1,
                (f.time - p.launchedAt) / (p.impactAt - p.launchedAt),
              ),
              x = from.x + (to.x - from.x) * t,
              y = from.y + (to.y - from.y) * t;
            const color =
              p.kind === 'charge'
                ? '#cbb779'
                : p.kind === 'corrode'
                  ? '#aeb97b'
                  : p.side
                    ? '#ecbd70'
                    : '#db7968';
            return (
              <g key={p.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={x}
                  y2={y}
                  stroke={color}
                  strokeWidth=".18"
                  opacity=".6"
                />
                <circle cx={x} cy={y} r=".6" fill={color} />
              </g>
            );
          })}
          {f.hits
            .filter((h) => h.kind === 'damage' || h.kind === 'corrode')
            .map((h, i) => {
              const p = point(h.targetUid, h.side, h.targetLane ?? 1);
              return (
                <g key={`${f.time}-${i}`} className="art-impact">
                  <path
                    d={`M ${p.x - 1} ${p.y - 2} l 2 4 m -3 -2 h 4`}
                    stroke="#f3c185"
                    strokeWidth=".35"
                  />
                  <text
                    x={p.x}
                    y={p.y - 3}
                    fill="#ffcf9f"
                    fontSize="2.5"
                    textAnchor="middle"
                  >
                    −{Math.round(h.healthLoss || h.barrierAbsorbed || h.value)}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>
    </div>
  );
}
