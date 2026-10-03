'use client';
import { memo, type CSSProperties } from 'react';
import { Clock3, Snowflake } from 'lucide-react';
import { arenaCard } from '@/lib/arena-catalog';
import { cardDef } from '@/lib/cards/catalog';
import {
  CARD_RARITIES,
  CARD_ROLES,
  CORE_COLORS,
  cardIllustration,
  coreStats,
  type CoreStat,
} from '@/lib/arena-card-face';
import type { ArenaFrame } from '@/lib/arena-engine';
import type { Duel, FighterCard } from '@/lib/cards/combat';
import { sitePath } from '@/lib/site-path';

export function CoreNumbers({ stats }: { stats: CoreStat[] }) {
  return (
    <span className="cc-numbers" aria-label="核心效果数值">
      {stats.map((s) => (
        <span
          key={s.key}
          style={{ color: CORE_COLORS[s.kind] }}
          title={`${s.value} · ${s.meaning}`}
          aria-label={`${s.value}，${s.meaning}`}
          data-effect={s.kind}
        >
          {s.value}
        </span>
      ))}
    </span>
  );
}

export const CollectibleCard = memo(function CollectibleCard({
  card,
  frame,
  side = 0,
  duel,
  mode = 'board',
  active = false,
  reduced = false,
}: {
  card: FighterCard;
  frame?: ArenaFrame;
  side?: number;
  duel?: Duel;
  mode?: 'board' | 'catalog' | 'detail';
  active?: boolean;
  reduced?: boolean;
}) {
  const def = cardDef(card.id),
    catalog = arenaCard(card.id),
    tile = cardIllustration(card.id);
  const cd = frame?.cd[side][card.at] ?? def.cd,
    timer = frame?.timers[side][card.at] ?? 0;
  const frozen = !!frame?.freeze[card.uid],
    remaining = Math.max(0, cd - timer);
  const dry = !!frame?.waiting.includes(card.uid) && frame.ammo[card.uid] === 0;
  const progress = cd > 0 ? Math.min(1, timer / cd) : 0;
  const stats = coreStats(card, frame, side, duel);
  const style = {
    '--art-x': `${(tile % 3) * 50}%`,
    '--art-y': `${(Math.floor(tile / 3) * 100) / 3}%`,
    '--progress': `${progress * 100}%`,
    '--art': `var(--theme-art, url("${sitePath('/art-assets/arena-2d/item-atlas.png')}"))`,
  } as CSSProperties;
  return (
    <span
      className={`collectible-card cc-${mode} cc-rarity-${card.rarity} cc-size-${def.size} ${active ? 'cc-active' : ''} ${frozen ? 'cc-frozen' : ''} ${reduced ? 'cc-reduced' : ''}`}
      style={style}
      data-card-size={def.size}
    >
      <span className="cc-art-window" aria-hidden="true">
        <span className="cc-art" />
      </span>
      <span className="cc-foil" aria-hidden="true" />
      <span className="cc-heading">
        <strong>{def.name}</strong>
        <small>{CARD_ROLES[catalog?.kind ?? def.kind] ?? '组件 · 联动'}</small>
      </span>
      <span className="cc-info">
        <span
          className="cc-clock"
          title={
            dry
              ? '弹药耗尽，等待装填'
              : cd
                ? `冷却周期 ${cd} 秒`
                : '由规则条件触发'
          }
        >
          {frozen ? <Snowflake size={11} /> : <Clock3 size={11} />}
          <b>
            {dry ? '待装填' : cd ? (frame ? remaining : cd).toFixed(1) : '被动'}
          </b>
          {cd > 0 && !dry && <small>秒</small>}
        </span>
        <span className="cc-description">
          {catalog?.text ?? def.rule ?? def.effect}
        </span>
        {stats.length > 0 && <CoreNumbers stats={stats} />}
      </span>
      <span className="cc-timer" aria-hidden="true">
        <i />
      </span>
      {mode === 'detail' && (
        <span className="cc-edition">
          {CARD_RARITIES[card.rarity]} · {def.size} 格{' '}
          <i>F9 / {catalog?.number?.toString().padStart(2, '0') ?? '—'}</i>
        </span>
      )}
    </span>
  );
});
