'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { simulateDuel, type Duel, type FighterCard } from '@/lib/demo-combat';
import { cardDef } from '@/lib/demo-cards';
import { heroDef } from '@/lib/heroes';
import CardFace from '../demo/card-face';
import CardDetail from '../demo/card-detail';
import BattleEffects from '../demo/battle-effects';
export default function Replay({
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
          <strong>
            {side ? '敌方' : '我方'} ·{' '}
            {duel.heroes?.[side] ? heroDef(duel.heroes[side]!).name : '宿主'}
          </strong>
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
            <strong>{['左路', '中路', '右路'][lane]}</strong>
            {duel.heroes?.[side] && (
              <em
                className="hero-meter"
                title={heroDef(duel.heroes[side]!).passive}
              >
                {duel.heroes[side] === 'archivist'
                  ? `记录 ${fr.heroMeters[side][lane]} / 3`
                  : duel.heroes[side] === 'mender'
                    ? `检修 ${Math.floor(fr.heroMeters[side][lane])} / 30`
                    : fr.heroMeters[side][lane]
                      ? '已触发破障冲锋'
                      : ''}
              </em>
            )}
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
            <span>左路</span>
            <strong>{fr.time.toFixed(2)} s</strong>
            <span>右路</span>
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
