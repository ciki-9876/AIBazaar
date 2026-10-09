import type { PlayingCard } from '../../lib/cards/throw-poker';
import { rankText } from '../../lib/cards/throw-poker';
import { enchantOf } from '../../lib/cards/throw-enchant';
import {
  AMETHYST,
  BONE,
  BRASS,
  BRASS_DARK,
  GILT,
  INK,
  LACQUER,
  LIMELIGHT,
  PEACOCK,
  PEACOCK_MID,
  SILVER,
  VERDIGRIS,
} from './palette';

const SUIT_PATH = [
  // spade
  'M50 6C62 29 93 43 89 64C86 79 66 83 54 70C55 81 60 89 69 95H31C40 89 45 81 46 70C34 83 14 79 11 64C7 43 38 29 50 6Z',
  // heart
  'M50 90C17 64 5 45 11 28C17 11 41 9 50 29C59 9 83 11 89 28C95 45 83 64 50 90Z',
  // club
  'M50 8A18 18 0 0 1 64.5 36.7A18 18 0 1 1 55 69C56 80 60 88 69 95H31C40 88 44 80 45 69A18 18 0 1 1 35.5 36.7A18 18 0 0 1 50 8Z',
  // diamond
  'M50 3Q66 30 89 50Q66 70 50 97Q34 70 11 50Q34 30 50 3Z',
] as const;
const INK_RED = '#a8203a';
const INK_BLACK = '#1b2228';
export const suitInk = (suit: number) => (suit % 2 ? INK_RED : INK_BLACK);

export function SuitMark({ suit, size = 16, x = 0, y = 0, flip = false, color }: {
  suit: number;
  size?: number;
  x?: number;
  y?: number;
  flip?: boolean;
  color?: string;
}) {
  const scale = size / 100;
  return (
    <path
      d={SUIT_PATH[suit]}
      fill={color ?? suitInk(suit)}
      transform={`translate(${x} ${y}) ${flip ? 'rotate(180)' : ''} scale(${scale}) translate(-50 -50)`}
    />
  );
}

const C = 50,
  L = 31,
  R = 69;
const PIPS: Record<number, [number, number][]> = {
  2: [[C, 31], [C, 109]],
  3: [[C, 31], [C, 70], [C, 109]],
  4: [[L, 31], [R, 31], [L, 109], [R, 109]],
  5: [[L, 31], [R, 31], [C, 70], [L, 109], [R, 109]],
  6: [[L, 31], [R, 31], [L, 70], [R, 70], [L, 109], [R, 109]],
  7: [[L, 31], [R, 31], [C, 50.5], [L, 70], [R, 70], [L, 109], [R, 109]],
  8: [[L, 31], [R, 31], [C, 50.5], [L, 70], [R, 70], [C, 89.5], [L, 109], [R, 109]],
  9: [[L, 31], [R, 31], [L, 57], [R, 57], [C, 70], [L, 83], [R, 83], [L, 109], [R, 109]],
  10: [[L, 31], [R, 31], [C, 44], [L, 57], [R, 57], [L, 83], [R, 83], [C, 96], [L, 109], [R, 109]],
};
const COURT_TITLE: Record<number, string> = { 11: 'Jack', 12: 'Queen', 13: 'King' };

function Court({ card }: { card: PlayingCard }) {
  const red = card.suit % 2 === 1;
  const field = red ? '#7d1a2c' : PEACOCK;
  return (
    <g>
      <rect x="20" y="22" width="60" height="96" rx="3" fill={field} />
      <rect x="23" y="25" width="54" height="90" rx="2" fill="none" stroke={BRASS} strokeWidth=".8" />
      <path d="M23 70H77" stroke={BRASS} strokeWidth=".5" strokeOpacity=".6" />
      {/* crown, coronet or plume over the monogram */}
      {card.rank === 13 && (
        <path d="M36 44L39 33L45 40L50 30L55 40L61 33L64 44Z" fill={BRASS} />
      )}
      {card.rank === 12 && (
        <g fill={BRASS}>
          <path d="M38 44Q50 34 62 44Z" />
          <circle cx="50" cy="34.5" r="2.6" />
          <circle cx="41" cy="38" r="1.6" />
          <circle cx="59" cy="38" r="1.6" />
        </g>
      )}
      {card.rank === 11 && (
        <path d="M44 45Q46 32 60 30Q52 35 52 45Z" fill={BRASS} />
      )}
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="25"
        fontStyle="italic"
        fill={BONE}
      >
        {rankText(card.rank)}
      </text>
      <SuitMark suit={card.suit} size={14} x={50} y={84} color={BONE} />
      <text x="50" y="108" textAnchor="middle" fontFamily="var(--font-display)" fontSize="7" letterSpacing="1.2" fill={BRASS}>
        {COURT_TITLE[card.rank]}
      </text>
    </g>
  );
}

function Ace({ card }: { card: PlayingCard }) {
  return (
    <g>
      <circle cx="50" cy="70" r="30" fill="none" stroke={BRASS} strokeWidth=".7" />
      <circle cx="50" cy="70" r="26.5" fill="none" stroke={BRASS} strokeWidth=".35" strokeDasharray="1.2 2.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <path
          key={angle}
          d="M50 37.5L51.6 40.5L50 43.5L48.4 40.5Z"
          fill={BRASS}
          transform={`rotate(${angle} 50 70)`}
        />
      ))}
      <SuitMark suit={card.suit} size={36} x={50} y={70} />
    </g>
  );
}

const RARITY_STROKE = { rare: VERDIGRIS, epic: AMETHYST, legendary: 'url(#card-foil)' } as const;
/** Variant dressing: paper tint, rarity frame and a one-character seal. */
function VariantFrame({ card }: { card: PlayingCard }) {
  const enchant = enchantOf(card.ench);
  if (!enchant) return null;
  const legend = enchant.rarity === 'legendary';
  return (
    <g className={`card-variant card-variant-${enchant.rarity}`}>
      <rect
        x="2.6"
        y="2.6"
        width="94.8"
        height="134.8"
        rx="5.8"
        fill="none"
        stroke={RARITY_STROKE[enchant.rarity]}
        strokeWidth={legend ? 4.4 : 3.2}
      />
      {legend && (
        <path d="M50 2.5L52.6 7.4L58 8.2L54 11.9L55 17.2L50 14.6L45 17.2L46 11.9L42 8.2L47.4 7.4Z" fill={LIMELIGHT} stroke={BRASS_DARK} strokeWidth=".6" />
      )}
      <g transform="translate(50 129)">
        <rect x="-9" y="-6" width="18" height="11" rx="5.5" fill={legend ? BRASS_DARK : enchant.rarity === 'epic' ? AMETHYST : VERDIGRIS} />
        <text y="2.6" textAnchor="middle" fontSize="8" fontWeight="700" fill={BONE}>
          {legend ? '传' : enchant.name[0]}
        </text>
      </g>
    </g>
  );
}

/** Full playing-card face in a 100×140 box. */
export function CardFace({ card, compact = false }: { card: PlayingCard; compact?: boolean }) {
  const ink = suitInk(card.suit);
  const label = rankText(card.rank);
  const pips = PIPS[card.rank];
  const enchant = enchantOf(card.ench);
  const paper = enchant?.points ? GILT : enchant?.plus ? SILVER : BONE;
  return (
    <svg viewBox="0 0 100 140" className="card-art" aria-hidden="true">
      {enchant?.rarity === 'legendary' && (
        <defs>
          <linearGradient id="card-foil" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={BRASS_DARK} />
            <stop offset=".35" stopColor={LIMELIGHT} />
            <stop offset=".55" stopColor={BRASS} />
            <stop offset=".8" stopColor={LIMELIGHT} />
            <stop offset="1" stopColor={BRASS_DARK} />
          </linearGradient>
        </defs>
      )}
      <rect x=".5" y=".5" width="99" height="139" rx="7" fill={paper} />
      <rect x="4.5" y="4.5" width="91" height="131" rx="4.5" fill="none" stroke={BRASS} strokeOpacity=".55" strokeWidth=".6" />
      {[0, 1].map((corner) => (
        <g key={corner} transform={corner ? 'rotate(180 50 70)' : undefined}>
          <text
            x="11.5"
            y="21"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fontSize={label.length > 1 ? 14 : 17}
            letterSpacing={label.length > 1 ? -1.2 : 0}
            fill={ink}
          >
            {label}
          </text>
          <SuitMark suit={card.suit} size={9.5} x={11.5} y={30} />
        </g>
      ))}
      {compact ? (
        <SuitMark suit={card.suit} size={38} x={50} y={70} />
      ) : pips ? (
        pips.map(([x, y], index) => (
          <SuitMark key={index} suit={card.suit} size={17} x={x} y={y} flip={y > 70} />
        ))
      ) : card.rank === 14 ? (
        <Ace card={card} />
      ) : (
        <Court card={card} />
      )}
      <VariantFrame card={card} />
    </svg>
  );
}

/** Card back: peacock lacquer, brass lattice and the ace medallion. */
export function CardBack() {
  return (
    <svg viewBox="0 0 100 140" className="card-art" aria-hidden="true">
      <defs>
        <pattern id="card-lattice" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 5H10M5 0V10" stroke={BRASS} strokeOpacity=".28" strokeWidth=".6" />
        </pattern>
      </defs>
      <rect x=".5" y=".5" width="99" height="139" rx="7" fill={PEACOCK} />
      <rect x="6" y="6" width="88" height="128" rx="4" fill="url(#card-lattice)" stroke={BRASS} strokeOpacity=".7" strokeWidth=".8" />
      <circle cx="50" cy="70" r="20" fill={PEACOCK_MID} stroke={BRASS} strokeWidth="1" />
      <SuitMark suit={0} size={20} x={50} y={70} color={BRASS} />
      <circle cx="50" cy="70" r="23" fill="none" stroke={BRASS_DARK} strokeWidth=".6" />
      <path d="M50 9L53 14L50 19L47 14Z M50 121L53 126L50 131L47 126Z" fill={LACQUER} />
      <rect x=".5" y=".5" width="99" height="139" rx="7" fill="none" stroke={INK} strokeOpacity=".4" />
    </svg>
  );
}
