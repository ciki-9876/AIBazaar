"use client";
import type { CSSProperties } from "react";
import Image from "next/image";
import { arenaCard } from "../../lib/arena-catalog";
import {
  CARD_RARITIES,
  coreStats,
  CORE_COLORS,
} from "../../lib/arena-card-face";
import type { ArenaFrame } from "../../lib/arena-engine";
import type { Duel, FighterCard } from "../../lib/cards/combat";
import { SOULS, soulName } from "../../lib/wandeng-game";
import { sitePath } from "../../lib/site-path";
import { EffectNumber } from "./wandeng-symbols";
import { isTrainingCard, trainingText } from "../../lib/training-catalog";

const rarityColors = ["#a6a79f", "#5795bf", "#9e71b4", "#c29943", "#b995c5"];
const fmt = (n: number) => Number(n.toFixed(1)).toString();

// Alpha bounds measured from the production atlas. Uneven packing must never
// show a neighbouring sprite; the UI adds consistent empty space around each.
const ITEM_SPRITES = [
  [44, 24, 320, 365],
  [392, 42, 342, 347],
  [764, 27, 288, 381],
  [36, 411, 343, 330],
  [425, 405, 281, 361],
  [755, 407, 327, 348],
  [41, 759, 324, 330],
  [436, 754, 238, 338],
  [763, 751, 303, 354],
  [36, 1113, 321, 310],
  [422, 1114, 279, 309],
  [812, 1095, 182, 331],
] as const;

export function Art({
  tile,
  comic = false,
  className = "",
}: {
  tile: number;
  comic?: boolean;
  className?: string;
}) {
  if (!comic) {
    const [x, y, width, height] = ITEM_SPRITES[tile] ?? ITEM_SPRITES[0];
    const longest = Math.max(width, height);
    return (
      <div aria-hidden="true" className={`wd-art wd-item-art ${className}`}>
        <span
          className="wd-pixel-sprite wd-editorial-sprite"
          style={{
            width: `${(width / longest) * 94}%`,
            height: `${(height / longest) * 94}%`,
            imageRendering: "auto",
            backgroundImage: `url("${sitePath("/art-assets/throw/editorial-v1/items-atlas.png")}")`,
            backgroundSize: `${(1086 / width) * 100}% ${(1448 / height) * 100}%`,
            backgroundPosition: `${(x / (1086 - width)) * 100}% ${(y / (1448 - height)) * 100}%`,
          }}
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`wd-art ${comic ? "wd-comic-art" : ""} ${className}`}
      style={{
        backgroundImage: `url("${sitePath(`/art-assets/wandeng/pixel/${comic ? "intro" : "items"}-atlas.png`)}")`,
        backgroundPosition: `${(tile % 3) * 50}% ${Math.floor(tile / 3) * (comic ? 100 : 100 / 3)}%`,
      }}
    />
  );
}
export function SoulCard({
  card,
  frame,
  side = 0,
  duel,
  compact = false,
}: {
  card: FighterCard;
  frame?: ArenaFrame;
  side?: number;
  duel?: Duel;
  compact?: boolean;
}) {
  const def = arenaCard(card.id)!;
  // Engine timing arrays are keyed by the starting board slot, not roster order.
  const cd = frame ? frame.cd[side][card.at] : def.cd;
  const elapsed = frame ? frame.timers[side][card.at] : 0;
  const stats = coreStats(card, frame, side, duel);
  const training = isTrainingCard(card.id);
  const rule = training
    ? trainingText(card.id, duel?.arena?.training)
    : (SOULS[card.id]?.rule ?? def.text);
  const echoRemaining = frame?.trainingState?.[card.uid]?.echoRemaining ?? 0;
  return (
    <div
      className={`wd-card wd-size-${def.size} ${compact ? "wd-card-compact" : ""} ${frame?.fired.includes(card.uid) ? "wd-fired" : ""}`}
      data-rarity={card.rarity}
      style={{ "--rarity": rarityColors[card.rarity] } as CSSProperties}
    >
      <header>
        <strong>{soulName(card.id)}</strong>
        <span>
          {CARD_RARITIES[card.rarity]}·{card.level}级
        </span>
      </header>
      {training ? (
        <div className="wd-art wd-training-art" aria-hidden="true">
          <Image
            src={sitePath(
              `/art-assets/wandeng/training/${card.id.slice(-1)}.png`,
            )}
            alt=""
            width={160}
            height={160}
            unoptimized
          />
        </div>
      ) : (
        <Art tile={SOULS[card.id]?.tile ?? 0} />
      )}
      <div className="wd-card-foot">
        <div className="wd-cooldown">
          <span aria-label="冷却">◷</span>{" "}
          {card.id === "training-e"
            ? echoRemaining > 0
              ? `${fmt(echoRemaining)}s`
              : "待邻接"
            : cd > 0
              ? `${fmt(Math.max(0, cd - elapsed))}s`
              : "联动"}
          <i
            style={{
              width: `${card.id === "training-e" ? (1 - echoRemaining / 3) * 100 : cd > 0 ? Math.min(100, (elapsed / cd) * 100) : 100}%`,
            }}
          />
        </div>
        {!compact && <p>{rule}</p>}
        <div className="wd-stat-strip">
          {stats.map((stat) => (
            <b
              key={stat.key}
              title={stat.meaning}
              aria-label={`${stat.meaning} ${fmt(stat.value)}`}
              style={{ color: CORE_COLORS[stat.kind] }}
            >
              <EffectNumber kind={stat.kind}>{fmt(stat.value)}</EffectNumber>
            </b>
          ))}
        </div>
      </div>
    </div>
  );
}
