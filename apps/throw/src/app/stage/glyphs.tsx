import type { ReactNode } from 'react';
import type { Family, ItemId, RelicId } from '../../lib/cards/throw-loadout';

/** Family hues double as the tile ground for every object in the trunk. */
export const FAMILY_COLOR: Record<Family | 'relic', string> = {
  damage: '#b3263a',
  burn: '#d0772f',
  poison: '#6d9647',
  shield: '#4f7fae',
  heal: '#c98f7c',
  utility: '#4fa39a',
  relic: '#c9a25a',
};

const reel = (x: number, y: number, r: number) => (
  <g>
    <circle cx={x} cy={y} r={r} />
    <circle cx={x} cy={y} r={r * 0.28} fill="currentColor" />
  </g>
);
const projector = (extra: ReactNode) => (
  <g>
    {reel(17, 14, 6.5)}
    {reel(31, 13, 7.5)}
    <rect x="10" y="22" width="24" height="15" rx="2.5" />
    <path d="M34 26L41 23V36L34 33" />
    <path d="M14 37V41M30 37V41" />
    {extra}
  </g>
);
const clockFace = (cx: number, cy: number, r: number) => (
  <g>
    <circle cx={cx} cy={cy} r={r} />
    <path d={`M${cx} ${cy - r * 0.6}V${cy}L${cx + r * 0.45} ${cy + r * 0.3}`} />
  </g>
);

const icons = (A: string): Record<ItemId | RelicId, ReactNode> => ({
  quick: (
    <g>
      <rect x="8" y="22" width="32" height="17" rx="2.5" />
      <path d="M18 22V18H30V22M8 29H40" />
      <rect x="25" y="7" width="11" height="15" rx="1.5" transform="rotate(18 30 15)" fill={A} />
    </g>
  ),
  pair: (
    <g>
      <path d="M12 23Q12 39 24 39Q36 39 36 23Z" />
      <path d="M36 26Q43 25 41 31Q40 35 35 34M12 27L5 22" />
      <path d="M18 23Q24 18 30 23M24 18.5V16" />
      <path d="M40 12Q43 15 40 18M44 9Q49 15 44 21" stroke={A} />
    </g>
  ),
  sequence: (
    <g>
      <path d="M24 40L8 18Q24 6 40 18Z" />
      <path d="M24 40L14 12M24 40L24 9M24 40L34 12" />
      <path d="M8 18Q24 6 40 18" stroke={A} strokeWidth="3.4" />
    </g>
  ),
  suit: (
    <g>
      <path d="M24 5V10M17 10H31L33 15Q36 26 33 36L31 40H17L15 36Q12 26 15 15Z" />
      <path d="M24 17L29 25L24 33L19 25Z" fill={A} />
      <path d="M15 15H33M15 36H33" />
    </g>
  ),
  sequin: (
    <g>
      <path d="M15 6L24 20L33 6L40 12V40H8V12Z" />
      <path d="M24 20V40" />
      <circle cx="15" cy="22" r="1.8" fill={A} stroke="none" />
      <circle cx="19" cy="29" r="1.8" fill={A} stroke="none" />
      <circle cx="14" cy="34" r="1.8" fill={A} stroke="none" />
      <circle cx="33" cy="22" r="1.8" fill={A} stroke="none" />
      <circle cx="29" cy="29" r="1.8" fill={A} stroke="none" />
      <circle cx="34" cy="34" r="1.8" fill={A} stroke="none" />
    </g>
  ),
  tailcoat: (
    <g>
      <path d="M17 6L24 16L31 6L40 11L38 30L33 44L28 30H20L15 44L10 30L8 11Z" />
      <path d="M17 6L21 24H27L31 6" />
      <path d="M21 13L24 16L27 13" stroke={A} />
      <circle cx="24" cy="27" r="1.6" fill={A} stroke="none" />
    </g>
  ),
  stride: (
    <g>
      <path d="M14 8Q24 4 34 8L38 38Q30 42 24 38Q18 42 10 38Z" />
      <path d="M24 8V36" />
      <path d="M40 16Q45 20 41 24M43 26Q47 31 42 34" stroke={A} />
      <path d="M8 30Q4 33 8 37" stroke={A} />
    </g>
  ),
  draw: (
    <g>
      {clockFace(24, 26, 12)}
      <path d="M11 13Q14 8 19 10M37 13Q34 8 29 10M15 39L12 43M33 39L36 43" />
      <rect x="29" y="5" width="13" height="9" rx="1" fill={A} />
    </g>
  ),
  mend: (
    <g>
      <path d="M14 22L19 9H29L34 22Z" fill={A} />
      <path d="M24 22V36M16 40H32" />
      <path d="M8 26L4 28M40 26L44 28M24 4V1" />
    </g>
  ),
  cinder: (
    <g>
      <rect x="11" y="24" width="26" height="15" rx="2" />
      <path d="M15 39V43M33 39V43M17 31H31" />
      <path d="M24 22Q16 15 21 8Q22 13 25 12Q24 6 29 4Q33 14 28 22Z" fill={A} />
    </g>
  ),
  bellows: (
    <g>
      <path d="M10 15L28 21V29L10 35Q6 25 10 15Z" />
      <path d="M28 25H36M13 19L13 31M18 18V32" />
      <path d="M39 20Q42 25 39 30M43 17Q47 25 43 33" stroke={A} />
    </g>
  ),
  ash: projector(<path d="M42 20Q38 14 41 9Q42 13 44 12Q44 7 47 6" stroke={A} />),
  poison: (
    <g>
      <rect x="9" y="17" width="30" height="21" rx="3" />
      <path d="M9 23H39M20 17V13H28V17" />
      <path d="M17 33Q18 26 27 26Q27 33 17 33ZM17 33L22 29" fill={A} />
    </g>
  ),
  venom: (
    <g>
      <rect x="13" y="8" width="16" height="5" rx="1.5" />
      <rect x="13" y="33" width="16" height="5" rx="1.5" />
      <path d="M16 13V33M26 13V33M16 18L26 21M16 24L26 27M16 30L26 32" />
      <path d="M37 22Q41 29 37 32Q33 29 37 22Z" fill={A} />
    </g>
  ),
  umbrella: (
    <g>
      <path d="M6 23Q24 2 42 23Q36 19 30 23Q24 19 18 23Q12 19 6 23Z" />
      <path d="M24 23V37Q24 42 19 41" />
      <rect x="27" y="10" width="7" height="6" fill={A} transform="rotate(14 30 13)" />
    </g>
  ),
  thorns: (
    <g>
      <path d="M10 34Q10 21 24 21Q38 21 38 34Z" fill={A} />
      <path d="M8 34H40M18 21L14 9M24 21V7M30 21L34 9" />
      <circle cx="14" cy="8" r="1.8" fill="currentColor" />
      <circle cx="24" cy="6" r="1.8" fill="currentColor" />
      <circle cx="34" cy="8" r="1.8" fill="currentColor" />
    </g>
  ),
  shieldbash: projector(<path d="M43 9L47 11V16Q47 20 43 22Q39 20 39 16V11Z" fill={A} />),
  drain: (
    <g>
      <path d="M10 22H34Q34 37 22 37Q10 37 10 22Z" />
      <path d="M34 25Q41 25 39 31Q37 34 33 32M8 41H36" />
      <path d="M17 17Q14 13 17 9Q20 5 17 2M26 17Q23 13 26 9" stroke={A} />
    </g>
  ),
  wash: (
    <g>
      <path d="M12 17Q12 40 24 40Q36 40 36 17Z" />
      <path d="M12 17L18 9H30L36 17M18 9Q24 13 30 9" />
      <path d="M24 22Q29 29 24 33Q19 29 24 22Z" fill={A} />
    </g>
  ),
  growth: (
    <g>
      <rect x="8" y="22" width="26" height="16" rx="2" />
      <path d="M8 22L13 15H38L34 22M38 15V30L34 38M38 25H44V29" />
      <path d="M20 9V3L26 2V8" stroke={A} />
      <circle cx="18" cy="9" r="2.2" fill={A} />
      <circle cx="24" cy="8" r="2.2" fill={A} />
    </g>
  ),
  tempo: (
    <g>
      <path d="M10 8H38M24 3V8" />
      <path d="M15 8V24M21 8V32M27 8V28M33 8V20" />
      <circle cx="24" cy="38" r="3.5" fill={A} />
      <path d="M24 32V34.5" />
    </g>
  ),
  focus: projector(<path d="M44 7L45.4 11L49 11.4L46.2 13.8L47 17.6L44 15.6L41 17.6L41.8 13.8L39 11.4L42.6 11Z" fill={A} />),
  slow: (
    <g>
      <path d="M9 40V20Q9 8 24 8Q39 8 39 20V40Z" />
      {clockFace(24, 22, 9)}
      <path d="M13 40V36H35V40" />
      <path d="M41 30Q44 35 41 37Q38 35 41 30Z" fill={A} />
    </g>
  ),
  compass: (
    <g>
      <rect x="16" y="16" width="16" height="16" rx="2" fill={A} />
      <path d="M16 24H5M32 24H43M24 16V5" />
      <circle cx="5" cy="24" r="2.4" />
      <circle cx="43" cy="24" r="2.4" />
      <circle cx="24" cy="5" r="2.4" />
    </g>
  ),
  ward: (
    <g>
      <path d="M7 18Q24 10 41 18V36Q24 28 7 36Z" />
      <path d="M7 24Q24 16 41 24M7 30Q24 22 41 30" stroke={A} />
    </g>
  ),
  needle: (
    <g>
      <path d="M8 6V42M16 6V42" opacity=".45" />
      <path d="M6 33L42 13" />
      <ellipse cx="39.6" cy="14.4" rx="2.8" ry="1.3" transform="rotate(-29 39.6 14.4)" fill={A} />
      <path d="M39 15Q44 26 36 32" stroke={A} />
    </g>
  ),
  capacity: (
    <g>
      <path d="M10 18Q10 9 18 9H30Q38 9 38 18V40H10Z" />
      <path d="M10 26H38M16 18H32" />
      <rect x="16" y="30" width="16" height="6" rx="1" fill={A} />
    </g>
  ),
  relay: (
    <g>
      {clockFace(22, 26, 12)}
      <path d="M36 9A16 16 0 0 1 41 22M41 22L44 16M41 22L35 20" stroke={A} />
    </g>
  ),
  echo: (
    <g>
      <rect x="7" y="24" width="24" height="15" rx="2" />
      <path d="M7 24L12 17H34L31 24M34 17V32L31 39" />
      <path d="M38 18Q42 24 38 30M42 14Q48 24 42 34" stroke={A} />
    </g>
  ),
  heart: (
    <g>
      <path d="M24 41C10 31 5 23 8 15C11 8 20 8 24 16C28 8 37 8 40 15C43 23 38 31 24 41Z" fill={A} />
      <path d="M17 22L21 26M21 22L17 26M27 20L31 24M31 20L27 24" />
    </g>
  ),
  ember: (
    <g>
      <path d="M8 34Q8 22 17 20Q20 12 29 15Q40 15 40 27Q41 37 30 38H15Q8 38 8 34Z" />
      <path d="M17 28Q21 24 24 29Q27 25 31 29" stroke={A} />
    </g>
  ),
  toxin: (
    <g>
      <ellipse cx="15" cy="16" rx="8" ry="10" transform="rotate(-38 15 16)" />
      <path d="M20 22L40 40" />
      <path d="M13 28Q17 35 13 38Q9 35 13 28Z" fill={A} />
    </g>
  ),
  bastion: (
    <g>
      <ellipse cx="24" cy="20" rx="13" ry="15" />
      <path d="M24 35V42M16 43H32" />
      <path d="M18 14Q20 10 25 9M17 21L29 12" stroke={A} />
    </g>
  ),
});
const ICON_IDS = Object.keys(icons(''));
const drawn = new Map<string, Record<ItemId | RelicId, ReactNode>>();
const iconsFor = (color: string) => {
  let set = drawn.get(color);
  if (!set) drawn.set(color, (set = icons(color)));
  return set;
};

/** A monoline object drawing on its family tile. */
export function ObjectGlyph({
  id,
  family,
  className = '',
}: {
  id: ItemId | RelicId;
  family: Family | 'relic';
  className?: string;
}) {
  return (
    <span
      className={`object-glyph ${className}`}
      data-family={family}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        {iconsFor(FAMILY_COLOR[family])[id]}
      </svg>
    </span>
  );
}

export const hasGlyph = (id: string) => ICON_IDS.includes(id);
