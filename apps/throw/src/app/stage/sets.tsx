import type { ReactNode } from 'react';
import {
  Beam,
  Bench,
  Bulbs,
  Curtain,
  Frame,
  Glow,
  Motes,
  Pane,
  PlayingCardProp,
  StreetLamp,
  TopHat,
  scatter,
} from './scene-kit';
import { BONE, BRASS, BRASS_DARK, INK, LACQUER, LACQUER_DARK, PEACOCK, PEACOCK_MID, VERDIGRIS } from './palette';

export type ScenePart = { depth: number; node: ReactNode };

/**
 * Three hand-authored sets, each a list of painted planes. A plane's depth is
 * the fraction of the camera move it follows; each becomes its own GPU layer.
 */

export function Skyline({ seed, base, top, color, width, windows, from = 0 }: {
  seed: number;
  base: number;
  top: [number, number];
  color: string;
  width: number;
  windows: number;
  from?: number;
}) {
  const random = scatter(seed);
  const blocks: { x: number; w: number; y: number; chimney: boolean; roof: number }[] = [];
  for (let x = from; x < width; ) {
    const w = 60 + random() * 110;
    blocks.push({ x, w, y: top[0] + random() * (top[1] - top[0]), chimney: random() > 0.45, roof: random() });
    x += w - 4;
  }
  return (
    <g>
      {blocks.map((b, i) => (
        <g key={i}>
          {b.roof > 0.7 ? (
            <path d={`M${b.x} ${b.y + 18}L${b.x + b.w / 2} ${b.y - 16}L${b.x + b.w} ${b.y + 18}V${base}H${b.x}Z`} fill={color} />
          ) : (
            <rect x={b.x} y={b.y} width={b.w} height={base - b.y} fill={color} />
          )}
          {b.chimney && <rect x={b.x + b.w * 0.7} y={b.y - 22} width="12" height="26" fill={color} />}
          {Array.from({ length: windows }, (_, j) => {
            const lit = random();
            if (lit < 0.55) return null;
            return (
              <rect
                key={j}
                className={lit > 0.93 ? 'st-window-flicker' : undefined}
                x={b.x + 10 + random() * (b.w - 24)}
                y={b.y + 26 + random() * (base - b.y - 60)}
                width="7"
                height="10"
                fill="#e9b965"
                opacity={0.35 + lit * 0.4}
              />
            );
          })}
        </g>
      ))}
    </g>
  );
}

/* ───────────────────────────── Graywick street ───────────────────────────── */
export function StreetSet(): ScenePart[] {
  const F = 875;
  return [
    {
      depth: 1,
      node: (
        <>
      <defs>
        <linearGradient id="street-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#081820" />
          <stop offset=".34" stopColor="#103241" />
          <stop offset=".6" stopColor="#21505c" />
          <stop offset=".72" stopColor="#4a6663" />
          <stop offset=".8" stopColor="#866f55" />
        </linearGradient>
        <pattern id="bricks" width="28" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 13.5H28M14 0V7M0 7H28M0 0V7" stroke="#000" strokeOpacity=".22" strokeWidth="1" />
        </pattern>
        <pattern id="cobbles" width="34" height="16" patternUnits="userSpaceOnUse">
          <ellipse cx="9" cy="5" rx="8" ry="3.4" fill="#fff" opacity=".035" />
          <ellipse cx="26" cy="13" rx="8" ry="3.4" fill="#fff" opacity=".035" />
        </pattern>
        <linearGradient id="fog" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7fa8a8" stopOpacity="0" />
          <stop offset=".6" stopColor="#7fa8a8" stopOpacity=".14" />
          <stop offset="1" stopColor="#7fa8a8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#street-sky)" />
        </>
      ),
    },
    { depth: 0.08, node: <>
        {Array.from({ length: 46 }, (_, i) => {
          const r = scatter(90 + i);
          return (
            <circle
              key={i}
              className={i % 4 ? undefined : 'st-twinkle'}
              cx={r() * 2100}
              cy={252 + r() * 150}
              r={0.7 + r() * 1.3}
              fill={BONE}
              opacity={0.3 + r() * 0.5}
              style={{ animationDelay: `${-i * 0.7}s` }}
            />
          );
        })}
        <Glow x={1560} y={300} r={170} strength={0.22} />
        <circle cx="1560" cy="300" r="30" fill="#f4e6c0" />
        <circle cx="1550" cy="293" r="30" fill="#e9dbb4" opacity=".35" />
        <g className="st-cloud" opacity=".5">
          <path d="M1350 322h330q-40 -14 -90 -6q-50 -16 -110 0q-70 -6 -130 6z" fill="#3b6068" />
          <path d="M1620 284h260q-30 -10 -70 -4q-40 -12 -90 0q-60 -4 -100 4z" fill="#3b6068" opacity=".7" />
        </g>
      </> },
    { depth: 0.3, node: <>
        <Skyline seed={7} base={F} top={[420, 520]} color="#1a3c4a" width={2300} windows={3} />
        <path d="M860 470Q930 378 1000 470Z" fill="#1a3c4a" />
        <rect x="922" y="360" width="16" height="36" fill="#1a3c4a" />
        <path d="M1220 470V350L1236 300L1252 350V470Z" fill="#1a3c4a" />
        <rect x="380" y="380" width="52" height="140" fill="#1a3c4a" />
        <circle cx="406" cy="406" r="12" fill="#e7cf8f" opacity=".7" />
      </> },
    { depth: 0.6, node: <>
        <Skyline seed={23} base={F} top={[330, 430]} color="#112f3b" width={2200} windows={6} />
      </> },
    {
      depth: 1,
      node: (
        <>

      <rect x="0" y="740" width="2100" height="160" fill="url(#fog)" className="st-fog" />

      {/* Left tenement */}
      <g>
        <rect x="-20" y="380" width="282" height="495" fill="#2c3d42" />
        <rect x="-20" y="380" width="282" height="495" fill="url(#bricks)" />
        <rect x="-24" y="366" width="290" height="16" fill="#3d5156" />
        <Pane x={40} y={430} w={64} h={98} lit curtain={LACQUER_DARK} />
        <Pane x={150} y={430} w={64} h={98} lit={false} frame="#8d9a93" />
        <Pane x={40} y={572} w={64} h={98} lit={false} frame="#8d9a93" />
        <Pane x={150} y={572} w={64} h={98} lit curtain={PEACOCK_MID} />
        <rect x="20" y="712" width="220" height="163" fill="#1e2c30" />
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M24 ${724 + i * 11}H236`} stroke="#000" strokeOpacity=".3" />
        ))}
      </g>

      {/* Reed & Co. — props and repairs */}
      <g>
        <rect x="268" y="420" width="434" height="192" fill="#5a3a31" />
        <rect x="268" y="420" width="434" height="192" fill="url(#bricks)" />
        <rect x="262" y="404" width="446" height="18" fill="#cbbfa3" />
        <rect x="262" y="396" width="446" height="8" fill="#a99c80" />
        <Pane x={308} y={452} w={72} h={112} lit curtain={LACQUER} frame="#d8ceb6" />
        <Pane x={448} y={452} w={72} h={112} lit={false} frame="#d8ceb6" />
        <Pane x={588} y={452} w={72} h={112} lit curtain={LACQUER} frame="#d8ceb6" />
        <rect x="268" y="606" width="434" height="44" fill="#163b37" />
        <rect x="272" y="610" width="426" height="36" fill="none" stroke={BRASS} strokeWidth="1.5" />
        <text x="485" y="636" textAnchor="middle" fontFamily="var(--font-display)" fontSize="21" letterSpacing="5" fill={BRASS}>
          REED &amp; CO.
        </text>
        <text x="336" y="634" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="12" letterSpacing="3" fill={BRASS} opacity=".8">
          道具修复
        </text>
        <text x="634" y="634" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="12" letterSpacing="3" fill={BRASS} opacity=".8">
          魔术用品
        </text>
        <rect x="268" y="650" width="434" height="225" fill="#1f4440" />
        {[280, 438, 532, 690].map((x) => (
          <rect key={x} x={x - 6} y="650" width="12" height="225" fill="#d8ceb6" />
        ))}
        {/* Display windows */}
        {[
          [292, 140],
          [544, 140],
        ].map(([x, w]) => (
          <g key={x}>
            <rect x={x} y="690" width={w} height="150" fill="#e2ac5c" />
            <rect x={x} y="770" width={w} height="70" fill="#b77a38" opacity=".6" />
            <rect x={x} y="828" width={w} height="12" fill="#5a3322" />
            <rect x={x} y="840" width={w} height="35" fill="#163b37" />
          </g>
        ))}
        <TopHat x={330} y={828} s={1.15} />
        <path d="M321 796q-5 -24 2 -32q6 10 4 32zM338 796q2 -26 12 -32q2 12 -7 32z" fill={BONE} />
        <PlayingCardProp x={376} y={808} rotate={-14} s={1.15} />
        <PlayingCardProp x={394} y={805} rotate={2} red s={1.15} />
        <PlayingCardProp x={411} y={809} rotate={16} s={1.15} />
        <g transform="translate(590 768)">
          <path d="M-22 58V8Q0 -22 22 8V58Z" fill="none" stroke={BRASS} strokeWidth="2" />
          <path d="M-11 6V58M0 -8V58M11 6V58" stroke={BRASS} strokeWidth="1" />
          <path d="M-8 42q8 -14 18 -6q-4 8 -18 6z" fill={BONE} />
          <rect x="-26" y="56" width="52" height="5" fill={BRASS_DARK} />
        </g>
        <g transform="translate(646 810)">
          <circle r="16" fill="none" stroke="#e8d7a8" strokeWidth="3" />
          <circle cx="16" r="16" fill="none" stroke="#e8d7a8" strokeWidth="3" />
        </g>
        {/* Awnings */}
        {[
          [286, 152],
          [538, 152],
        ].map(([x, w]) => (
          <g key={`a${x}`}>
            <path d={`M${x} 654L${x + w} 654L${x + w + 8} 678L${x - 8} 678Z`} fill={BONE} />
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d={`M${x + (i * w) / 8} 654h${w / 16}l${w / 16 + 1} 24h${-w / 8 - 2}z`} fill={LACQUER} />
            ))}
            <path
              d={`M${x - 8} 678${Array.from({ length: 10 }, () => `q${(w + 16) / 20} 10 ${(w + 16) / 10} 0`).join('')}`}
              fill={LACQUER}
            />
          </g>
        ))}
        {/* Door */}
        <rect x="444" y="650" width="82" height="225" fill="#d8ceb6" />
        <path d="M452 875V706Q485 668 518 706V875Z" fill="#163b37" />
        <path d="M458 712Q485 680 512 712V744H458Z" fill="#e9b965" />
        <path d="M485 684V744M458 728H512" stroke="#d8ceb6" strokeWidth="2" />
        <rect x="462" y="760" width="46" height="46" fill="none" stroke="#0e2a27" strokeWidth="2" />
        <rect x="462" y="814" width="46" height="50" fill="none" stroke="#0e2a27" strokeWidth="2" />
        <circle cx="508" cy="808" r="3.4" fill={BRASS} />
      </g>

      {/* Poster wall */}
      <g>
        <rect x="702" y="470" width="388" height="405" fill="#2b4045" />
        <rect x="702" y="460" width="388" height="12" fill="#3a5157" />
        <g transform="translate(-6 -70) rotate(-2 800 700)">
          <rect x="740" y="610" width="110" height="164" fill="#d8ccb0" />
          <rect x="748" y="618" width="94" height="84" fill={PEACOCK_MID} />
          <TopHat x={795} y={690} s={1.1} />
          <text x="795" y="730" textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" fill="#3a2a22" fontStyle="italic">
            The Astral
          </text>
          <text x="795" y="752" textAnchor="middle" fontFamily="var(--font-display)" fontSize="10" letterSpacing="2" fill={LACQUER}>
            GRAYWICK 1931
          </text>
        </g>
        <g transform="translate(0 -84) rotate(3 920 690)">
          <rect x="864" y="616" width="116" height="140" fill={LACQUER_DARK} />
          <circle cx="922" cy="670" r="32" fill="none" stroke={BRASS} strokeWidth="2" />
          <path d="M922 644C930 660 948 668 946 680C944 690 932 692 924 684L928 696H916L920 684C912 692 900 690 898 680C896 668 914 660 922 644Z" fill={BRASS} />
          <text x="922" y="732" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" letterSpacing="3" fill={BONE}>
            MAGIC
          </text>
        </g>
        <g transform="translate(0 -60) rotate(-1 1030 740)">
          <rect x="992" y="660" width="80" height="124" fill="#b9c4b4" opacity=".85" />
          <path d="M1002 684h60M1002 698h42M1002 712h54M1002 726h30" stroke="#33454a" strokeWidth="4" />
          <path d="M1046 784l26 -30v30z" fill="#2b4045" />
        </g>
        <rect x="702" y="820" width="388" height="55" fill="#22353a" />
        <Bench x={872} floor={F} width={116} />
      </g>

      {/* Lyric Theatre */}
      <g>
        <rect x="1090" y="368" width="512" height="507" fill="#5f5d55" />
        <rect x="1090" y="368" width="512" height="507" fill="#1a3a44" opacity=".35" />
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M${1108 + i * 32} 384V590`} stroke="#000" strokeOpacity=".16" strokeWidth="3" />
        ))}
        <path d="M1086 354H1606V370H1086Z" fill="#8e8a7b" />
        <path d="M1240 354V304H1284V276H1396V304H1440V354Z" fill="#6f6c62" />
        <path d="M1284 276V262H1396V276Z" fill="#8e8a7b" />
        <path d="M1314 262L1340 228L1366 262Z" fill={BRASS_DARK} />
        <Glow x={1340} y={420} r={170} tone="warm" strength={0.25} className="st-breathe" />
        <rect x="1308" y="288" width="64" height="252" rx="4" fill={LACQUER_DARK} />
        <rect x="1312" y="292" width="56" height="244" rx="3" fill={LACQUER} />
        {'LYRIC'.split('').map((letter, i) => (
          <text
            key={letter + i}
            x="1340"
            y={334 + i * 46}
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontSize="36"
            fontWeight="600"
            fill="#ffeab0"
            className="st-neon"
            style={{ animationDelay: `${i * -0.37}s` }}
          >
            {letter}
          </text>
        ))}
        <Bulbs x1={298} x2={530} y={1302} gap={16.5} r={2.8} vertical />
        <Bulbs x1={298} x2={530} y={1378} gap={16.5} r={2.8} vertical />
        {[1150, 1530].map((x) => (
          <g key={x}>
            <Pane x={x - 38} y={410} w={76} h={130} lit curtain={LACQUER_DARK} frame="#9b9682" />
          </g>
        ))}
        {/* Marquee */}
        <path d="M1150 604H1530L1506 664H1174Z" fill="#141c20" />
        <rect x="1150" y="592" width="380" height="15" fill={BRASS_DARK} />
        <text x="1340" y="644" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="21" letterSpacing="7" fill="#ffe6a6">
          今晚 · 本地资格赛
        </text>
        <Bulbs x1={1156} x2={1524} y={599} gap={14} r={3.2} />
        <Bulbs x1={1178} x2={1502} y={664} gap={14} r={2.8} />
        <Glow x={1340} y={720} r={240} tone="warm" strength={0.35} />
        {/* Doors */}
        <rect x="1282" y="672" width="116" height="203" fill="#9b9682" />
        {[1288, 1342].map((x) => (
          <g key={x}>
            <rect x={x} y="680" width="50" height="195" fill="#e6b665" />
            <rect x={x + 7} y="690" width="36" height="104" fill="#f2cf86" />
            <path d={`M${x + 25} 680V875M${x} 806H${x + 50}`} stroke="#9b9682" strokeWidth="2" />
          </g>
        ))}
        {[1180, 1440].map((x) => (
          <g key={x}>
            <rect x={x} y="690" width="72" height="150" fill={BRASS_DARK} />
            <rect x={x + 6} y="696" width="60" height="138" fill="#2b2133" />
            <circle cx={x + 36} cy="740" r="16" fill="none" stroke={BRASS} strokeWidth="1.5" />
            <path d={`M${x + 36} 728C${x + 40} 736 ${x + 48} 740 ${x + 47} 746C${x + 46} 751 ${x + 40} 752 ${x + 37} 748L${x + 39} 754H${x + 33}L${x + 35} 748C${x + 32} 752 ${x + 26} 751 ${x + 25} 746C${x + 24} 740 ${x + 32} 736 ${x + 36} 728Z`} fill={BRASS} />
            <path d={`M${x + 16} 786h40M${x + 22} 798h28M${x + 26} 810h20`} stroke={BONE} strokeOpacity=".7" strokeWidth="2.4" />
          </g>
        ))}
      </g>

      {/* Bus stop + intercity coach */}
      <g>
        <path d="M1652 875V684" stroke="#14262c" strokeWidth="5" />
        <circle cx="1652" cy="676" r="20" fill={VERDIGRIS} stroke={BONE} strokeWidth="3" />
        <text x="1652" y="681" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="12" fontWeight="700" fill={BONE}>
          巴士
        </text>
        <g className="st-bus">
          <path d="M1690 866V766Q1690 732 1724 730L1940 724V866Z" fill="#cfc6ae" />
          <path d="M1690 806H1940V866H1690Z" fill={PEACOCK_MID} />
          <path d="M1690 802H1940" stroke={BRASS} strokeWidth="3" />
          {[1712, 1772, 1832, 1892].map((x) => (
            <g key={x}>
              <rect x={x} y="744" width="50" height="44" rx="5" fill="#16323a" />
              <rect x={x + 2} y="762" width="46" height="26" rx="3" fill="#e2ad5e" opacity=".75" />
            </g>
          ))}
          <text x="1840" y="842" textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" letterSpacing="4" fill={BONE}>
            GRAND TOUR
          </text>
          <circle cx="1697" cy="834" r="8" fill="#fff1c4" />
          <Glow x={1690} y={834} r={80} tone="warm" strength={0.4} />
          {[1740, 1892].map((x) => (
            <g key={x}>
              <circle cx={x} cy="866" r="25" fill="#0e1619" />
              <circle cx={x} cy="866" r="11" fill="#4b5a5e" />
              <circle cx={x} cy="866" r="3.4" fill={BRASS} />
            </g>
          ))}
        </g>
      </g>

      {/* Lamps */}
      {[732, 1074, 1632].map((x) => (
        <g key={x}>
          <StreetLamp x={x} floor={F} height={266} />
          <Glow x={x} y={F - 248} r={130} tone="warm" strength={0.5} className="st-lamp" />
          <Beam x={x} y={F - 236} length={236} spread={120} strength={0.13} tone="warm" />
          <Motes x={x - 90} y={F - 230} w={180} h={220} count={10} seed={x} />
        </g>
      ))}

      {/* Pavement and road */}
      <rect x="0" y={F} width="1920" height="28" fill="#2d4044" />
      {Array.from({ length: 33 }, (_, i) => (
        <path key={i} d={`M${i * 60} ${F}v28`} stroke="#000" strokeOpacity=".25" />
      ))}
      <path d={`M0 ${F + 1}H1920`} stroke="#58747a" strokeWidth="2" />
      <rect x="0" y={F + 28} width="1920" height="12" fill="#1a282c" />
      <rect x="0" y={F + 40} width="1920" height="170" fill="#132127" />
      <rect x="0" y={F + 40} width="1920" height="170" fill="url(#cobbles)" />
      {[732, 1074, 1340, 1632].map((x) => (
        <ellipse key={x} cx={x} cy={F + 70} rx="34" ry="40" fill="url(#glow-warm)" opacity=".22" />
      ))}
      <rect x="0" y={F + 120} width="1920" height="90" fill="url(#vignette-floor)" />

        </>
      ),
    },
  ];
}

/* ───────────────────────────── Reed's workshop ───────────────────────────── */
export function WorkshopSet(): ScenePart[] {
  const F = 604;
  return [{ depth: 1, node: (
    <g>
      <defs>
        <pattern id="damask" width="40" height="48" patternUnits="userSpaceOnUse">
          <rect width="40" height="48" fill="#173c3d" />
          <path d="M20 8L26 20L20 32L14 20Z" fill="#1f4b4a" />
          <circle cx="0" cy="44" r="2" fill="#1f4b4a" />
          <circle cx="40" cy="44" r="2" fill="#1f4b4a" />
          <path d="M20 14L22.6 20L20 26L17.4 20Z" fill={BRASS_DARK} opacity=".35" />
        </pattern>
        <linearGradient id="room-shade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={INK} stopOpacity=".55" />
          <stop offset=".4" stopColor={INK} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="night-glass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0d2530" />
          <stop offset="1" stopColor="#2c5560" />
        </linearGradient>
      </defs>
      <rect width="1280" height={F} fill="url(#damask)" />
      <rect y="440" width="1280" height={F - 440} fill="#40281e" />
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x={14 + i * 100} y="462" width="80" height="118" rx="2" fill="none" stroke="#5c3b2b" strokeWidth="3" />
      ))}
      <rect y="436" width="1280" height="8" fill={BRASS_DARK} />
      <rect width="1280" height="42" fill="#24160f" />
      <rect y="42" width="1280" height="6" fill={BRASS_DARK} />

      {/* Exit door */}
      <rect x="94" y="390" width="92" height="214" fill="#5c3b2b" />
      <rect x="102" y="398" width="76" height="206" fill="#163b37" />
      <path d="M110 406H170V470H110Z" fill="#e2ad5e" opacity=".85" />
      <path d="M140 406V470M110 438H170" stroke="#163b37" strokeWidth="4" />
      <rect x="112" y="486" width="56" height="104" fill="none" stroke="#0e2a27" strokeWidth="3" />
      <circle cx="168" cy="520" r="4" fill={BRASS} />

      {/* Shelf of apparatus */}
      <g>
        <rect x="228" y="214" width="208" height="390" fill="#3a2419" />
        <rect x="236" y="222" width="192" height="374" fill="#24160f" />
        {[300, 380, 460, 540].map((y) => (
          <rect key={y} x="236" y={y} width="192" height="8" fill="#5c3b2b" />
        ))}
        {[248, 262, 276, 288, 300].map((x, i) => (
          <rect key={x} x={x} y={300 - 46 + (i % 2) * 6} width="12" height={46 - (i % 2) * 6} fill={[LACQUER, PEACOCK_MID, BRASS_DARK, '#5b6b46', LACQUER_DARK][i]} />
        ))}
        <TopHat x={350} y={300} s={1.2} />
        <g transform="translate(400 300)">
          <path d="M-18 0V-34Q0 -58 18 -34V0Z" fill="none" stroke={BRASS} strokeWidth="2" />
          <path d="M-8 -36V0M2 -46V0M10 -38V0" stroke={BRASS} strokeWidth="1" />
          <path d="M-8 -12q10 -16 20 -6q-4 8 -20 6z" fill={BONE} />
        </g>
        <g transform="translate(276 372)">
          <circle r="16" fill="#bcd9de" opacity=".55" />
          <circle cx="-5" cy="-6" r="5" fill="#fff" opacity=".5" />
          <rect x="-12" y="14" width="24" height="6" fill={BRASS_DARK} />
        </g>
        {[330, 362, 394].map((x, i) => (
          <circle key={x} cx={x} cy="356" r="14" fill="none" stroke="#e8d7a8" strokeWidth="2.6" transform={`rotate(${i * 20} ${x} 356)`} />
        ))}
        {[256, 284, 312].map((x, i) => (
          <g key={x}>
            <rect x={x} y={460 - 34 - i * 4} width="18" height={34 + i * 4} rx="3" fill={['#4f7f63', '#7a3a30', '#3d5f78'][i]} opacity=".9" />
            <rect x={x + 5} y={460 - 42 - i * 4} width="8" height="9" fill={BRASS_DARK} />
          </g>
        ))}
        <rect x="350" y="428" width="64" height="32" fill={LACQUER_DARK} />
        <path d="M350 444H414" stroke={BRASS} strokeWidth="2" />
        <PlayingCardProp x={300} y={518} rotate={-10} />
        <PlayingCardProp x={318} y={516} rotate={6} red />
        <rect x="350" y="500" width="70" height="40" fill="#5b4632" />
        <path d="M352 520H418" stroke={BRASS} />
      </g>

      {/* Framed bill of the Great Reed */}
      <Frame x={640} y={196} w={120} h={150}>
        <rect x="640" y="196" width="120" height="150" fill="#d7cbb0" />
        <circle cx="700" cy="254" r="38" fill={PEACOCK_MID} />
        <TopHat x={700} y={262} s={1.15} />
        <text x="700" y="312" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fontStyle="italic" fill="#3a2a22">
          The Great Reed
        </text>
        <text x="700" y="330" textAnchor="middle" fontFamily="var(--font-display)" fontSize="9" letterSpacing="2" fill={LACQUER}>
          LYRIC · 1968
        </text>
      </Frame>

      {/* Workbench */}
      <g>
        <rect x="530" y="526" width="270" height="12" fill="#6a4632" />
        <rect x="530" y="536" width="270" height="6" fill="#3a2419" />
        <rect x="546" y="542" width="12" height="62" fill="#3a2419" />
        <rect x="772" y="542" width="12" height="62" fill="#3a2419" />
        <rect x="556" y="578" width="218" height="7" fill="#3a2419" />
        <g transform="translate(640 526)">
          <path d="M-34 0V-46L0 -60L34 -46V0Z" fill={PEACOCK} />
          <path d="M-34 -46L0 -60L34 -46" stroke={BRASS} strokeWidth="2" fill="none" />
          <path d="M0 -40L3 -32H11L5 -27L7 -19L0 -24L-7 -19L-5 -27L-11 -32H-3Z" fill={BRASS} />
          <rect x="-28" y="-14" width="56" height="4" fill={BRASS_DARK} />
        </g>
        <rect x="700" y="508" width="40" height="18" fill="#7a7f7f" />
        <rect x="712" y="498" width="16" height="10" fill="#5e6363" />
        <path d="M748 522l20 -16" stroke="#9aa3a6" strokeWidth="4" strokeLinecap="round" />
        <PlayingCardProp x={598} y={522} rotate={84} s={0.9} />
        <PlayingCardProp x={772} y={520} rotate={-80} s={0.9} red />
      </g>

      {/* Night window behind Reed */}
      <g>
        <rect x="846" y="214" width="148" height="214" fill="#5c3b2b" />
        <rect x="856" y="224" width="128" height="194" fill="url(#night-glass)" />
        <circle cx="948" cy="270" r="18" fill="#f1e2bb" opacity=".9" />
        <Glow x={948} y={270} r={70} strength={0.25} />
        <g className="st-rain">
          {Array.from({ length: 16 }, (_, i) => {
            const r = scatter(400 + i);
            return (
              <path
                key={i}
                d={`M${860 + r() * 120} ${226 + r() * 150}l-3 16`}
                stroke="#cfe6ea"
                strokeOpacity=".35"
                strokeWidth="1.2"
                style={{ animationDelay: `${-r() * 2}s`, animationDuration: `${1.4 + r()}s` }}
              />
            );
          })}
        </g>
        <path d="M920 224V418M856 320H984" stroke="#5c3b2b" strokeWidth="6" />
        <Curtain x={826} y={200} w={46} h={250} fold={16} color={LACQUER} className="st-curtain" />
        <Curtain x={968} y={200} w={46} h={250} fold={16} color={LACQUER} flip className="st-curtain" />
        <rect x="818" y="194" width="204" height="10" rx="5" fill={BRASS} />
      </g>

      {/* Vanishing cabinet */}
      <g>
        <rect x="1036" y="290" width="118" height="314" fill={PEACOCK} />
        <rect x="1036" y="290" width="118" height="314" fill="none" stroke={BRASS} strokeWidth="3" />
        <path d="M1046 300H1144V594H1046Z" fill="#0f2b35" />
        <path d="M1144 300L1176 312V582L1144 594Z" fill={PEACOCK_MID} stroke={BRASS} strokeWidth="2" />
        {[[1070, 340], [1118, 380], [1080, 450], [1124, 520], [1064, 560]].map(([x, y], i) => (
          <path
            key={i}
            className="st-twinkle"
            style={{ animationDelay: `${-i * 0.6}s` }}
            d={`M${x} ${y - 7}L${x + 2} ${y - 2}L${x + 7} ${y}L${x + 2} ${y + 2}L${x} ${y + 7}L${x - 2} ${y + 2}L${x - 7} ${y}L${x - 2} ${y - 2}Z`}
            fill={BRASS}
          />
        ))}
        <path d="M1028 290L1095 262L1162 290Z" fill={LACQUER_DARK} stroke={BRASS} strokeWidth="2" />
      </g>

      {/* Pendulum clock */}
      <g>
        <rect x="1188" y="222" width="52" height="210" rx="4" fill="#5c3b2b" />
        <circle cx="1214" cy="258" r="20" fill={BONE} stroke={BRASS} strokeWidth="3" />
        <path d="M1214 244V258L1224 264" stroke={INK} strokeWidth="2" fill="none" />
        <rect x="1198" y="290" width="32" height="130" fill="#24160f" />
        <g className="st-pendulum">
          <path d="M1214 292V390" stroke={BRASS} strokeWidth="2" />
          <circle cx="1214" cy="396" r="9" fill={BRASS} />
        </g>
      </g>

      {/* Pendant lamps */}
      {[470, 1110].map((x) => (
        <g key={x}>
          <g className="st-sway" style={{ transformOrigin: `${x}px 48px` }}>
            <path d={`M${x} 48V170`} stroke="#14262c" strokeWidth="2" />
            <path d={`M${x - 36} 200L${x - 12} 166H${x + 12}L${x + 36} 200Z`} fill="#2f6b62" />
            <path d={`M${x - 36} 200L${x - 12} 166H${x - 2}L${x - 16} 200Z`} fill="#fff" opacity=".1" />
            <path d={`M${x - 37} 200H${x + 37}`} stroke={BRASS} strokeWidth="3" strokeLinecap="round" />
            <rect x={x - 5} y="158" width="10" height="9" fill={BRASS} />
            <circle cx={x} cy="202" r="7" fill="#fff1c4" />
            <Glow x={x} y={204} r={110} tone="warm" strength={0.55} className="st-lamp" />
            <Beam x={x} y={202} length={402} spread={190} strength={0.15} tone="warm" />
          </g>
          <Motes x={x - 150} y={240} w={300} h={340} count={18} seed={x} />
        </g>
      ))}

      <rect width="1280" height={F} fill="url(#room-shade)" />
      {/* Floor */}
      <rect y={F} width="1280" height="116" fill="#3a2419" />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M0 ${F + 10 + i * 20}H1280`} stroke="#000" strokeOpacity=".25" />
      ))}
      <path d={`M0 ${F}H1280`} stroke="#6a4632" strokeWidth="3" />
      <rect x="520" y={F} width="420" height="12" fill={LACQUER_DARK} />
      <rect x="520" y={F} width="420" height="3" fill={BRASS} opacity=".7" />
      <ellipse cx="470" cy={F + 6} rx="190" ry="14" fill="url(#glow-warm)" opacity=".35" />
      <ellipse cx="1110" cy={F + 6} rx="190" ry="14" fill="url(#glow-warm)" opacity=".35" />
      <rect y={F + 40} width="1280" height="76" fill="url(#vignette-floor)" />
    </g>
  ) }];
}

/* ───────────────────────────── Lyric Theatre stage ───────────────────────────── */
export function TheatreSet(): ScenePart[] {
  const F = 638;
  return [{ depth: 1, node: (
    <g>
      <defs>
        <linearGradient id="cyclorama" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0a1d27" />
          <stop offset=".7" stopColor="#163e4d" />
          <stop offset="1" stopColor="#265360" />
        </linearGradient>
        <linearGradient id="gilt" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={BRASS_DARK} />
          <stop offset=".5" stopColor={BRASS} />
          <stop offset="1" stopColor={BRASS_DARK} />
        </linearGradient>
      </defs>
      <rect width="1440" height="810" fill="#071419" />
      <rect x="80" y="120" width="1280" height={F - 120} fill="url(#cyclorama)" />
      {Array.from({ length: 60 }, (_, i) => {
        const r = scatter(700 + i);
        return (
          <circle
            key={i}
            className={i % 3 ? undefined : 'st-twinkle'}
            cx={100 + r() * 1240}
            cy={160 + r() * 380}
            r={0.8 + r() * 1.8}
            fill={BRASS}
            opacity={0.25 + r() * 0.5}
            style={{ animationDelay: `${-i * 0.4}s` }}
          />
        );
      })}
      {/* Painted crescent on wires */}
      <g className="st-sway-slow" style={{ transformOrigin: '720px 64px' }}>
        <path d="M720 64V196" stroke="#93a4a8" strokeOpacity=".5" />
        <path d="M760 210a74 74 0 1 0 0 120a58 58 0 1 1 0 -120z" fill={BRASS} transform="translate(-60 -10)" />
        <Glow x={680} y={270} r={160} strength={0.18} />
      </g>
      {[[360, 200], [520, 160], [930, 180], [1080, 230]].map(([x, len], i) => (
        <g key={x} className="st-sway" style={{ transformOrigin: `${x}px 64px`, animationDelay: `${-i * 1.3}s` }}>
          <path d={`M${x} 64V${64 + len}`} stroke="#93a4a8" strokeOpacity=".4" />
          <path
            d={`M${x} ${64 + len - 14}L${x + 5} ${64 + len - 4}L${x + 15} ${64 + len}L${x + 5} ${64 + len + 4}L${x} ${64 + len + 14}L${x - 5} ${64 + len + 4}L${x - 15} ${64 + len}L${x - 5} ${64 + len - 4}Z`}
            fill="#e8d7a8"
          />
        </g>
      ))}

      {/* Stage props */}
      <g>
        <g transform="translate(420 638)">
          <rect x="-58" y="-62" width="116" height="62" rx="4" fill={LACQUER_DARK} />
          <path d="M-58 -62Q0 -88 58 -62Z" fill={LACQUER} />
          {[-34, 34].map((x) => (
            <rect key={x} x={x - 5} y="-70" width="10" height="70" fill="#2a1a14" />
          ))}
          <rect x="-8" y="-42" width="16" height="14" fill={BRASS} />
          <text x="0" y="-12" textAnchor="middle" fontFamily="var(--font-display)" fontSize="11" letterSpacing="3" fill={BRASS}>
            ASTRAL
          </text>
        </g>
        <g transform="translate(590 638)">
          <path d="M-4 0V-70H4V0ZM-24 0L0 -16L24 0Z" fill="#2a1a14" />
          <ellipse cx="0" cy="-72" rx="40" ry="8" fill="#2a1a14" />
          <path d="M-40 -72Q-44 -40 -30 -32H30Q44 -40 40 -72Z" fill={LACQUER} opacity=".9" />
          <circle cx="0" cy="-96" r="22" fill="#b9e0e6" opacity=".55" />
          <circle cx="-7" cy="-103" r="6" fill="#fff" opacity=".6" />
          <Glow x={0} y={-96} r={70} tone="cool" strength={0.35} className="st-breathe" />
        </g>
        <g transform="translate(1124 638)">
          <path d="M-46 0L-30 -160M46 0L30 -160M0 -40V0" stroke="#5c3b2b" strokeWidth="6" />
          <rect x="-58" y="-170" width="116" height="122" fill="#d7cbb0" />
          <rect x="-50" y="-162" width="100" height="106" fill="none" stroke={LACQUER} strokeWidth="2" />
          <text x="0" y="-130" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="13" fontWeight="700" letterSpacing="2" fill={LACQUER}>
            格雷维克
          </text>
          <text x="0" y="-108" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="13" letterSpacing="2" fill="#3a2a22">
            本地资格赛
          </text>
          <path d="M-30 -92H30" stroke={BRASS} />
          <text x="0" y="-72" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fontStyle="italic" fill="#3a2a22">
            tonight
          </text>
        </g>
      </g>

      {/* Wings, backstage door */}
      <Curtain x={80} y={150} w={140} h={F - 150} fold={28} className="st-curtain" />
      <Curtain x={1220} y={150} w={140} h={F - 150} fold={28} flip className="st-curtain" />
      <g>
        <rect x="112" y="424" width="84" height="214" fill="#1a1012" />
        <rect x="118" y="430" width="72" height="208" fill="#2c3b3e" />
        <rect x="128" y="442" width="52" height="56" fill="#e2ad5e" opacity=".8" />
        <circle cx="180" cy="548" r="4" fill={BRASS} />
        <rect x="124" y="394" width="60" height="22" rx="3" fill="#0b2a26" />
        <text x="154" y="410" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="12" letterSpacing="3" fill={VERDIGRIS} className="st-neon">
          出口
        </text>
      </g>

      {/* Proscenium */}
      <path d="M0 64H1440V150H1360V810H1440V810H1360V150H80V810H0Z" fill="url(#gilt)" />
      <rect x="0" y="64" width="80" height="746" fill="#3a2a1a" />
      <rect x="1360" y="64" width="80" height="746" fill="#3a2a1a" />
      <rect x="66" y="64" width="14" height="746" fill="url(#gilt)" />
      <rect x="1360" y="64" width="14" height="746" fill="url(#gilt)" />
      <rect x="0" y="64" width="1440" height="80" fill="#3a2a1a" />
      <rect x="0" y="130" width="1440" height="14" fill="url(#gilt)" />
      {Array.from({ length: 18 }, (_, i) => (
        <path key={i} d={`M${40 + i * 80} 72l20 28l20 -28`} stroke={BRASS} strokeOpacity=".5" fill="none" strokeWidth="2" />
      ))}
      <g transform="translate(720 104)">
        <ellipse rx="56" ry="30" fill="#2a1a12" stroke={BRASS} strokeWidth="2" />
        <path d="M0 -18C6 -6 20 0 18 10C16 18 6 19 2 12L4 20H-4L-2 12C-6 19 -16 18 -18 10C-20 0 -6 -6 0 -18Z" fill={BRASS} />
      </g>
      {/* Valance */}
      <path
        d={`M80 144H1360V176${Array.from({ length: 16 }, () => 'q-40 30 -80 0').join('')}Z`}
        fill={LACQUER}
      />
      <path d={`M80 176${Array.from({ length: 16 }, () => 'q40 30 80 0').join('')}`} stroke={BRASS} strokeWidth="2" fill="none" />

      {/* Sweeping follow spots from the gallery */}
      <g className="st-sweep" style={{ transformOrigin: '300px 64px' }}>
        <Beam x={300} y={64} length={600} spread={120} strength={0.1} />
      </g>
      <g className="st-sweep st-sweep-reverse" style={{ transformOrigin: '1140px 64px' }}>
        <Beam x={1140} y={64} length={600} spread={120} strength={0.1} />
      </g>
      <Motes x={220} y={220} w={1000} h={400} count={26} seed={77} />

      {/* Stage floor, footlights, house */}
      <rect x="80" y={F} width="1280" height="64" fill="#3b261b" />
      {Array.from({ length: 4 }, (_, i) => (
        <path key={i} d={`M80 ${F + 12 + i * 14}H1360`} stroke="#000" strokeOpacity=".22" />
      ))}
      <path d={`M80 ${F}H1360`} stroke="#6a4632" strokeWidth="3" />
      <rect x="80" y={F + 64} width="1280" height="10" fill="url(#gilt)" />
      {Array.from({ length: 21 }, (_, i) => (
        <g key={i}>
          <circle cx={130 + i * 59} cy={F + 82} r="5" fill="#fff1c4" />
          <Glow x={130 + i * 59} y={F + 78} r={46} tone="warm" strength={0.32} />
        </g>
      ))}
      <rect x="0" y={F + 92} width="1440" height="90" fill="#06121a" />
      {Array.from({ length: 2 }, (_, row) =>
        Array.from({ length: 24 }, (_, i) => (
          <rect
            key={`${row}-${i}`}
            x={(row ? 30 : 0) + i * 62}
            y={F + 106 + row * 30}
            width="50"
            height="44"
            rx="14"
            fill={row ? '#050d12' : '#08161d'}
          />
        )),
      )}
      <ellipse cx="720" cy={F + 4} rx="620" ry="34" fill="url(#glow-warm)" opacity=".18" />
    </g>
  ) }];
}
