import type { ReactNode } from 'react';
import { Beam, Bulbs, Curtain, Frame, Glow, Motes, Pane, PlayingCardProp, StreetLamp, scatter } from './scene-kit';
import { Skyline, type ScenePart } from './sets';
import { BONE, BRASS, BRASS_DARK, INK, LACQUER, LACQUER_DARK, PEACOCK_MID, VERDIGRIS } from './palette';

/**
 * Act two · Bridgeport. Same kit and palette as Graywick, a different hour:
 * an overcast Thursday morning with drizzle, so the town reads paler and
 * cooler while lamps and shopfronts keep the warm accents.
 */

const Rain = ({ x, y, w, h, count, seed, opacity = 0.32 }: { x: number; y: number; w: number; h: number; count: number; seed: number; opacity?: number }) => {
  const r = scatter(seed);
  return (
    <g className="st-rain">
      {Array.from({ length: count }, (_, i) => (
        <path
          key={i}
          d={`M${x + r() * w} ${y + r() * h}l-4 20`}
          stroke="#d7ecee"
          strokeOpacity={opacity}
          strokeWidth="1.2"
          style={{ animationDelay: `${-r() * 2}s`, animationDuration: `${1.1 + r() * 0.9}s` }}
        />
      ))}
    </g>
  );
};

/** Bunting: little triangles on a sagging string. */
const Bunting = ({ x1, x2, y, sag = 26, colors = [LACQUER, BRASS, VERDIGRIS, BONE] }: { x1: number; x2: number; y: number; sag?: number; colors?: string[] }) => {
  const n = Math.floor((x2 - x1) / 26);
  return (
    <g className="st-sway-slow" style={{ transformOrigin: `${(x1 + x2) / 2}px ${y}px` }}>
      <path d={`M${x1} ${y}Q${(x1 + x2) / 2} ${y + sag * 2} ${x2} ${y}`} stroke="#2a3a3e" strokeWidth="1.4" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const px = x1 + (x2 - x1) * t;
        const py = y + sag * 2 * 2 * t * (1 - t);
        return <path key={i} d={`M${px - 8} ${py}L${px + 8} ${py}L${px} ${py + 16}Z`} fill={colors[i % colors.length]} opacity=".92" />;
      })}
    </g>
  );
};

/** Market stall with striped canopy, goods on the counter. */
const Stall = ({ x, w, floor, stripe, goods }: { x: number; w: number; floor: number; stripe: string; goods: ReactNode }) => (
  <g>
    <path d={`M${x + 6} ${floor}V${floor - 150}M${x + w - 6} ${floor}V${floor - 150}`} stroke="#3a2a1e" strokeWidth="6" />
    <path d={`M${x - 12} ${floor - 150}L${x + w + 12} ${floor - 150}L${x + w} ${floor - 186}L${x} ${floor - 186}Z`} fill={BONE} />
    {Array.from({ length: 6 }, (_, i) => {
      const step = (w + 24) / 6;
      return <path key={i} d={`M${x - 12 + i * step} ${floor - 150}h${step / 2}l${-step / 2 * 0.2} -36h${-step / 2 * 0.8}z`} fill={stripe} />;
    })}
    <path d={`M${x - 12} ${floor - 150}${Array.from({ length: 8 }, () => `q${(w + 24) / 16} 10 ${(w + 24) / 8} 0`).join('')}`} fill={stripe} />
    <rect x={x} y={floor - 66} width={w} height="66" fill="#5a3e2a" />
    <rect x={x} y={floor - 70} width={w} height="8" fill="#7a5638" />
    {goods}
  </g>
);

/* ───────────────────────────── Bridgeport street ───────────────────────────── */
export function BridgeportSet(): ScenePart[] {
  const F = 875;
  const W = 2560;
  return [
    {
      depth: 1,
      node: (
        <>
          <defs>
            <linearGradient id="bp-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#13303b" />
              <stop offset=".38" stopColor="#2c5560" />
              <stop offset=".62" stopColor="#5b7f80" />
              <stop offset=".8" stopColor="#97ab9f" />
            </linearGradient>
            <pattern id="bp-bricks" width="28" height="14" patternUnits="userSpaceOnUse">
              <path d="M0 13.5H28M14 0V7M0 7H28M0 0V7" stroke="#000" strokeOpacity=".2" strokeWidth="1" />
            </pattern>
            <pattern id="bp-cobbles" width="34" height="16" patternUnits="userSpaceOnUse">
              <ellipse cx="9" cy="5" rx="8" ry="3.4" fill="#fff" opacity=".05" />
              <ellipse cx="26" cy="13" rx="8" ry="3.4" fill="#fff" opacity=".05" />
            </pattern>
            <linearGradient id="bp-mist" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#c7d6cf" stopOpacity="0" />
              <stop offset=".6" stopColor="#c7d6cf" stopOpacity=".16" />
              <stop offset="1" stopColor="#c7d6cf" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bp-river" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#3f6a6c" />
              <stop offset="1" stopColor="#173840" />
            </linearGradient>
          </defs>
          <rect width={W} height="1080" fill="url(#bp-sky)" />
        </>
      ),
    },
    {
      depth: 0.08,
      node: (
        <>
          <Glow x={1900} y={330} r={260} tone="warm" strength={0.14} />
          {[0, 1, 2].map((band) => (
            <g key={band} className="st-cloud" opacity={0.55 - band * 0.12} style={{ animationDelay: `${-band * 17}s` }}>
              {Array.from({ length: 9 }, (_, i) => {
                const r = scatter(30 + band * 11 + i);
                const x = i * 330 - 60 + r() * 80;
                const y = 230 + band * 60 + r() * 30;
                return <path key={i} d={`M${x} ${y}h${260 + r() * 80}q-40 -18 -96 -8q-60 -22 -124 0q-70 -10 -130 8z`} fill={band ? '#6d8a88' : '#4d6f72'} />;
              })}
            </g>
          ))}
        </>
      ),
    },
    {
      depth: 0.22,
      node: (
        <>
          {/* Downs beyond the town */}
          <path d={`M0 520Q300 440 640 500T1300 470T2000 500T2900 470V${F}H0Z`} fill="#4b6c6a" />
          <path d={`M0 560Q420 500 820 548T1700 530T2900 540V${F}H0Z`} fill="#3d5e5f" />
          {/* Church on the hill */}
          <g transform="translate(1520 470)">
            <rect x="-30" y="-40" width="60" height="44" fill="#2f4c4f" />
            <path d="M-36 -40L0 -64L36 -40Z" fill="#2f4c4f" />
            <rect x="-50" y="-92" width="24" height="96" fill="#2f4c4f" />
            <path d="M-50 -92L-38 -136L-26 -92Z" fill="#2f4c4f" />
            <circle cx="-38" cy="-74" r="5" fill="#e7cf8f" opacity=".55" />
          </g>
        </>
      ),
    },
    {
      depth: 0.45,
      node: (
        <>
          <Skyline seed={41} base={F} top={[470, 560]} color="#2b4a50" width={2900} windows={3} />
          {/* River and the iron bridge, seen past the parapet */}
          <rect x="420" y="700" width="760" height="176" fill="url(#bp-river)" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} className="st-fog" d={`M${440 + i * 80} ${740 + (i % 3) * 30}h40`} stroke="#9fc4c2" strokeOpacity=".35" strokeWidth="2" />
          ))}
          <g>
            <path d="M380 700Q800 540 1220 700" stroke="#22383e" strokeWidth="14" fill="none" />
            <path d="M380 700H1220" stroke="#22383e" strokeWidth="10" />
            {Array.from({ length: 13 }, (_, i) => {
              const x = 420 + i * 64;
              const t = (x - 380) / 840;
              const y = 700 - 640 * t * (1 - t) * 0.95;
              return <path key={i} d={`M${x} 700L${x} ${y}`} stroke="#22383e" strokeWidth="4" />;
            })}
            {Array.from({ length: 12 }, (_, i) => {
              const xa = 420 + i * 64,
                xb = xa + 64;
              const ya = 700 - 640 * ((xa - 380) / 840) * (1 - (xa - 380) / 840) * 0.95;
              return <path key={i} d={`M${xa} ${ya}L${xb} 700`} stroke="#22383e" strokeWidth="2.4" />;
            })}
            <rect x="370" y="700" width="40" height="176" fill="#2a3f44" />
            <rect x="1190" y="700" width="40" height="176" fill="#2a3f44" />
          </g>
        </>
      ),
    },
    {
      depth: 1,
      node: (
        <>
          <rect x="0" y="760" width={W} height="140" fill="url(#bp-mist)" className="st-fog" />

          {/* ── Bus stop and the Grand Tour coach ── */}
          <g>
            <path d="M296 875V690" stroke="#14262c" strokeWidth="5" />
            <circle cx="296" cy="682" r="20" fill={VERDIGRIS} stroke={BONE} strokeWidth="3" />
            <text x="296" y="687" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="12" fontWeight="700" fill={BONE}>
              巴士
            </text>
            <g className="st-bus">
              <path d="M-20 866V766Q-20 732 14 730L250 724V866Z" fill="#cfc6ae" />
              <path d="M-20 806H250V866H-20Z" fill={PEACOCK_MID} />
              <path d="M-20 802H250" stroke={BRASS} strokeWidth="3" />
              {[4, 64, 124, 184].map((x) => (
                <g key={x}>
                  <rect x={x} y="744" width="50" height="44" rx="5" fill="#16323a" />
                  <rect x={x + 2} y="762" width="46" height="26" rx="3" fill="#e2ad5e" opacity=".6" />
                </g>
              ))}
              <text x="120" y="842" textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" letterSpacing="4" fill={BONE}>
                GRAND TOUR
              </text>
              <path d="M250 740H262V866H250Z" fill="#a99f86" />
              <circle cx="244" cy="834" r="8" fill="#fff1c4" />
              {[40, 200].map((x) => (
                <g key={x}>
                  <circle cx={x} cy="866" r="25" fill="#0e1619" />
                  <circle cx={x} cy="866" r="11" fill="#4b5a5e" />
                  <circle cx={x} cy="866" r="3.4" fill={BRASS} />
                </g>
              ))}
            </g>
          </g>

          {/* ── Mrs Dodd's newspaper kiosk ── */}
          <g>
            <rect x="560" y="700" width="180" height="175" fill="#2f5a4a" />
            <rect x="560" y="700" width="180" height="175" fill="url(#bp-bricks)" opacity=".25" />
            <path d="M548 700L752 700L740 664L560 664Z" fill="#1f4236" />
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d={`M${552 + i * 25} 700h12l-3 -36h-10z`} fill={BONE} opacity=".85" />
            ))}
            <path d={`M548 700${Array.from({ length: 8 }, () => 'q12.75 10 25.5 0').join('')}`} fill="#1f4236" />
            <rect x="580" y="716" width="140" height="70" fill="#163b31" />
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <g key={`${row}${col}`}>
                  <rect x={586 + col * 34} y={722 + row * 21} width="28" height="18" fill="#e9e0cb" />
                  <path d={`M${589 + col * 34} ${727 + row * 21}h20M${589 + col * 34} ${732 + row * 21}h14`} stroke="#4a4a4a" strokeWidth="1.4" />
                </g>
              )),
            )}
            <rect x="572" y="800" width="156" height="75" fill="#22463b" />
            <rect x="580" y="806" width="140" height="10" fill={BRASS_DARK} />
            {/* Headline board */}
            <g transform="translate(790 875)">
              <path d="M-32 0L-20 -88H20L32 0" stroke="#2a1a14" strokeWidth="4" fill="none" />
              <rect x="-30" y="-92" width="60" height="64" fill="#f0e8d4" />
              <text x="0" y="-72" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="9" fontWeight="700" fill={LACQUER}>
                号外
              </text>
              <text x="0" y="-56" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="8.5" fill={INK}>
                格雷维克
              </text>
              <text x="0" y="-44" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="8.5" fill={INK}>
                来了个魔术师
              </text>
            </g>
            <rect x="590" y="632" width="120" height="26" rx="3" fill="#163b31" stroke={BRASS} strokeWidth="1.5" />
            <text x="650" y="650" textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" letterSpacing="3" fill={BRASS}>
              DODD’S NEWS
            </text>
          </g>

          {/* ── Bridgehead parapet and the old crate ── */}
          <g>
            <rect x="830" y="806" width="360" height="22" fill="#9b9682" />
            <rect x="830" y="828" width="360" height="47" fill="#7e796a" />
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d={`M${846 + i * 29} 806v-46q-8 -8 0 -16q8 8 0 16`} fill="#b4ae98" stroke="#7e796a" strokeWidth="1" />
            ))}
            <rect x="826" y="752" width="368" height="12" fill="#b4ae98" />
            <rect x="820" y="740" width="22" height="135" fill="#a39d88" />
            <rect x="1178" y="740" width="22" height="135" fill="#a39d88" />
            <g transform="translate(880 875)">
              <rect x="-26" y="-36" width="52" height="36" fill="#6d4b30" />
              <path d="M-26 -24H26M-26 -12H26M-18 -36V0M18 -36V0" stroke="#4a301c" strokeWidth="2" />
              <rect x="-30" y="-40" width="60" height="6" fill="#7d5a3c" />
            </g>
          </g>

          {/* ── The Drunken Goose ── */}
          <g>
            <rect x="992" y="470" width="276" height="405" fill="#e1d6bc" />
            <path d="M980 474L1130 380L1280 474Z" fill="#3a2a22" />
            <path d="M1000 474L1130 392L1260 474Z" fill="#e1d6bc" />
            {/* Timber frame */}
            {[992, 1060, 1130, 1200, 1262].map((x) => (
              <rect key={x} x={x - 4} y="474" width="9" height="401" fill="#3a2a22" />
            ))}
            {[560, 640, 700].map((y) => (
              <rect key={y} x="992" y={y} width="276" height="9" fill="#3a2a22" />
            ))}
            <path d="M992 560L1060 474M1060 560L992 474M1200 560L1268 474M1268 560L1200 474" stroke="#3a2a22" strokeWidth="6" />
            <path d="M1130 392V474M1080 430L1180 430" stroke="#3a2a22" strokeWidth="6" />
            <Pane x={1012} y={580} w={42} h={52} lit curtain={LACQUER_DARK} frame="#3a2a22" />
            <Pane x={1206} y={580} w={42} h={52} lit curtain={LACQUER_DARK} frame="#3a2a22" />
            {/* Bay windows */}
            {[1000, 1192].map((x) => (
              <g key={x}>
                <path d={`M${x} 720h68v110h-68z`} fill="#e7b465" />
                <path d={`M${x} 760h68`} stroke="#3a2a22" strokeWidth="3" />
                <path d={`M${x + 22} 720v110M${x + 46} 720v110`} stroke="#3a2a22" strokeWidth="3" />
                <path d={`M${x - 6} 714h80v8h-80zM${x - 6} 828h80v8h-80z`} fill="#3a2a22" />
                <Glow x={x + 34} y={780} r={70} tone="warm" strength={0.25} />
              </g>
            ))}
            {/* Door */}
            <rect x="1096" y="712" width="68" height="163" fill="#3a2a22" />
            <path d="M1102 875V744Q1130 714 1158 744V875Z" fill="#7a2a2e" />
            <path d="M1110 752Q1130 730 1150 752V770H1110Z" fill="#e9b965" />
            <circle cx="1150" cy="812" r="3.4" fill={BRASS} />
            {/* Hanging sign */}
            <g className="st-sway" style={{ transformOrigin: '1300px 600px' }}>
              <path d="M1268 600H1336" stroke="#14262c" strokeWidth="5" />
              <path d="M1290 600v14M1326 600v14" stroke="#14262c" strokeWidth="2" />
              <rect x="1278" y="612" width="60" height="70" rx="4" fill="#163b37" stroke={BRASS} strokeWidth="2" />
              <path d="M1293 664q-2 -20 14 -24q4 -12 14 -10q-6 4 -4 10q10 6 4 18q-6 8 -28 6z" fill={BONE} />
              <circle cx="1318" cy="633" r="1.6" fill={INK} />
              <path d="M1328 633l6 2l-6 2z" fill={BRASS} />
              <path d="M1306 628l2 -10h12l2 10z" fill="#141519" />
              <text x="1308" y="678" textAnchor="middle" fontFamily="var(--font-display)" fontSize="7.5" letterSpacing="1" fill={BRASS}>
                DRUNKEN GOOSE
              </text>
            </g>
            <rect x="1062" y="652" width="136" height="30" rx="3" fill="#163b37" stroke={BRASS} strokeWidth="1.5" />
            <text x="1130" y="673" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="15" letterSpacing="5" fill={BRASS}>
              醉鹅旅店
            </text>
            {/* Barrels */}
            <g transform="translate(1238 875)">
              <rect x="-18" y="-40" width="36" height="40" rx="8" fill="#6d4b30" />
              <path d="M-18 -30H18M-18 -10H18" stroke="#2a1a14" strokeWidth="3" />
            </g>
          </g>

          {/* ── Market square ── */}
          <g>
            <Bunting x1={1360} x2={1740} y={600} sag={22} />
            <Bunting x1={1380} x2={1700} y={640} sag={18} colors={[BONE, LACQUER, BRASS]} />
            <Stall
              x={1290}
              w={110}
              floor={F}
              stripe={LACQUER}
              goods={
                <g>
                  {[1304, 1324, 1344, 1364, 1384].map((x, i) => (
                    <circle key={x} cx={x} cy={F - 78} r="9" fill={['#c4472b', '#d78b2a', '#7fa046', '#c4472b', '#d6b23e'][i]} />
                  ))}
                  <text x="1345" y={F - 34} textAnchor="middle" fontFamily="var(--font-ui)" fontSize="11" fill={BONE}>
                    苹果 · 梨
                  </text>
                </g>
              }
            />
            {/* Busking stage */}
            <g>
              <rect x="1378" y="804" width="108" height="71" fill="#7a5638" />
              <rect x="1372" y="796" width="120" height="10" fill="#9a7048" />
              {[1392, 1430, 1468].map((x) => (
                <path key={x} d={`M${x} 806v69`} stroke="#5a3e2a" strokeWidth="3" />
              ))}
              {/* Chalkboard */}
              <g transform="translate(1430 796)">
                <path d="M-36 0L-26 -120M36 0L26 -120" stroke="#3a2a1e" strokeWidth="5" />
                <rect x="-40" y="-176" width="80" height="94" fill="#1c2a2a" stroke="#6d4b30" strokeWidth="5" />
                <text x="0" y="-154" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="10.5" fill={BONE}>
                  今日街头演出
                </text>
                {[0, 1, 2, 3].map((i) => (
                  <path key={i} d={`M-28 ${-138 + i * 13}h${36 + (i % 2) * 16}`} stroke={BONE} strokeOpacity=".6" strokeWidth="2" />
                ))}
                <text x="22" y="-92" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={BRASS}>
                  ♦♥
                </text>
              </g>
              {/* Juno's tin-can target */}
              <g transform="translate(1540 875)">
                <rect x="-10" y="-60" width="6" height="60" fill="#3a2a1e" />
                {[0, 1, 2].map((i) => (
                  <rect key={i} x={-22 + i * 13} y="-80" width="11" height="18" rx="2" fill="#9aa3a6" stroke="#6c7476" />
                ))}
                <rect x="-16" y="-96" width="11" height="16" rx="2" fill="#9aa3a6" stroke="#6c7476" />
                <PlayingCardProp x={-4} y={-86} rotate={30} s={0.55} red />
              </g>
            </g>
            <Stall
              x={1604}
              w={124}
              floor={F}
              stripe={PEACOCK_MID}
              goods={
                <g>
                  <rect x="1616" y={F - 92} width="46" height="22" rx="3" fill="#e9e0cb" />
                  <path d={`M1622 ${F - 84}h34`} stroke={LACQUER} strokeWidth="2" />
                  <rect x="1672" y={F - 96} width="44" height="26" rx="3" fill="#d6b23e" />
                  <text x="1666" y={F - 34} textAnchor="middle" fontFamily="var(--font-ui)" fontSize="11" fill={BONE}>
                    炸鱼 · 薯条
                  </text>
                </g>
              }
            />
          </g>

          {/* ── Hobbs's Curiosities ── */}
          <g>
            <rect x="1752" y="440" width="256" height="435" fill="#4a3a52" />
            <rect x="1752" y="440" width="256" height="435" fill="url(#bp-bricks)" />
            <path d="M1740 444H2020L2004 412H1756Z" fill="#2b2133" />
            <Pane x={1786} y={476} w={56} h={84} lit={false} frame="#cfc3a8" />
            <Pane x={1918} y={476} w={56} h={84} lit curtain={PEACOCK_MID} frame="#cfc3a8" />
            <rect x="1752" y="592" width="256" height="40" fill="#1f1a24" />
            <text x="1880" y="618" textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" letterSpacing="4" fill={BRASS}>
              HOBBS · CURIOS
            </text>
            {/* Cluttered bay */}
            <path d="M1766 650h86v170h-86z" fill="#c9954e" />
            <path d="M1766 650h86v170h-86z" fill="#000" opacity=".2" />
            <g>
              <circle cx="1790" cy="690" r="13" fill={BONE} stroke={BRASS_DARK} strokeWidth="3" />
              <path d="M1790 682v8l6 4" stroke={INK} strokeWidth="1.6" fill="none" />
              <path d="M1820 720q12 -30 24 0v30h-24z" fill="none" stroke={BRASS} strokeWidth="2" />
              <path d="M1824 722v28M1832 712v38M1840 722v28" stroke={BRASS} strokeWidth="1" />
              <circle cx="1786" cy="770" r="16" fill="#3d5f78" />
              <path d="M1770 770h32M1786 754q8 16 0 32" stroke="#9fc4c2" strokeWidth="1.2" fill="none" />
              <rect x="1812" y="772" width="28" height="36" rx="3" fill="#4f7f63" opacity=".9" />
              <path d="M1774 806h70" stroke="#5a3322" strokeWidth="6" />
            </g>
            <path d="M1766 650h86M1809 650v170M1766 735h86" stroke="#cfc3a8" strokeWidth="3" />
            {/* Door with bell */}
            <rect x="1864" y="650" width="78" height="225" fill="#cfc3a8" />
            <path d="M1872 875V700Q1903 668 1934 700V875Z" fill="#2b2133" />
            <path d="M1878 706Q1903 680 1928 706V740H1878Z" fill="#e9b965" opacity=".8" />
            <circle cx="1928" cy="800" r="3.4" fill={BRASS} />
            <path d="M1903 664v-10" stroke="#14262c" strokeWidth="2" />
            <path d="M1897 676q6 -14 12 0z" fill={BRASS} />
            {/* Hand-lettered sign */}
            <g transform="rotate(-4 1980 760)">
              <rect x="1952" y="730" width="50" height="64" fill="#e9e0cb" />
              <text x="1977" y="752" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="10" fontWeight="700" fill={LACQUER}>
                旧货
              </text>
              <text x="1977" y="768" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="10" fontWeight="700" fill={LACQUER}>
                不退
              </text>
              <text x="1977" y="786" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="8" fill={INK}>
                新货没有
              </text>
            </g>
          </g>

          {/* ── The Thursday Theatre ── */}
          <g>
            <rect x="2060" y="420" width="470" height="455" fill="#6b3c34" />
            <rect x="2060" y="420" width="470" height="455" fill="url(#bp-bricks)" />
            <path d="M2048 424H2542L2295 330Z" fill="#8e8a7b" />
            <path d="M2088 420L2295 344L2502 420Z" fill="#6b3c34" />
            <circle cx="2295" cy="392" r="22" fill={BONE} stroke={BRASS} strokeWidth="3" />
            <path d="M2295 378v14l9 6" stroke={INK} strokeWidth="2.4" fill="none" />
            {[2096, 2180, 2410, 2494].map((x) => (
              <rect key={x} x={x - 12} y="430" width="24" height="445" fill="#8e8a7b" opacity=".75" />
            ))}
            <Pane x={2140} y={470} w={56} h={90} lit curtain={LACQUER_DARK} frame="#cfc3a8" />
            <Pane x={2394} y={470} w={56} h={90} lit curtain={LACQUER_DARK} frame="#cfc3a8" />
            {/* Sign */}
            <rect x="2200" y="452" width="190" height="104" rx="6" fill="#1a1012" />
            <text x="2295" y="502" textAnchor="middle" fontFamily="var(--font-display)" fontSize="30" fontWeight="600" fill="#ffeab0" className="st-neon">
              THURSDAY’S
            </text>
            <text x="2295" y="536" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="14" letterSpacing="6" fill={BRASS}>
              周 四 剧 院
            </text>
            <Bulbs x1={2208} x2={2382} y={460} gap={14} r={2.6} />
            {/* Marquee */}
            <path d="M2130 610H2460L2440 664H2150Z" fill="#141c20" />
            <rect x="2130" y="598" width="330" height="14" fill={BRASS_DARK} />
            <text x="2295" y="645" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="19" letterSpacing="6" fill="#ffe6a6">
              布里奇波特公开赛
            </text>
            <Bulbs x1={2136} x2={2454} y={605} gap={14} r={3} />
            <Glow x={2295} y={720} r={220} tone="warm" strength={0.32} />
            {/* Doors */}
            <rect x="2238" y="672" width="114" height="203" fill="#9b9682" />
            {[2244, 2297].map((x) => (
              <g key={x}>
                <rect x={x} y="680" width="49" height="195" fill="#e6b665" />
                <rect x={x + 7} y="690" width="35" height="100" fill="#f2cf86" />
              </g>
            ))}
            {/* Posters: Juno and the Open */}
            <g transform="translate(2120 700)">
              <rect width="76" height="118" fill="#d8ccb0" />
              <rect x="6" y="6" width="64" height="60" fill="#c08a2e" />
              <circle cx="38" cy="36" r="16" fill="#2b2a33" />
              <path d="M24 30q14 -14 28 0z" fill="#3b3f46" />
              <text x="38" y="84" textAnchor="middle" fontFamily="var(--font-display)" fontSize="11" fontStyle="italic" fill="#3a2a22">
                Juno Bell
              </text>
              <text x="38" y="102" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="9" fill={LACQUER}>
                卫冕冠军
              </text>
            </g>
            <g transform="translate(2392 700)">
              <rect width="76" height="118" fill={LACQUER_DARK} />
              <path d="M38 22C46 36 62 42 60 56C58 66 46 68 40 60L44 74H32L36 60C30 68 18 66 16 56C14 42 30 36 38 22Z" fill={BRASS} />
              <text x="38" y="96" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="10" letterSpacing="2" fill={BONE}>
                每周四
              </text>
            </g>
          </g>

          {/* Lamps */}
          {[470, 960, 1250, 1740, 2050].map((x) => (
            <g key={x}>
              <StreetLamp x={x} floor={F} height={262} />
              <Glow x={x} y={F - 244} r={110} tone="warm" strength={0.35} className="st-lamp" />
              <Beam x={x} y={F - 232} length={232} spread={100} strength={0.08} tone="warm" />
            </g>
          ))}

          {/* Pavement, road and puddles */}
          <rect x="0" y={F} width={W} height="28" fill="#3d5254" />
          {Array.from({ length: 44 }, (_, i) => (
            <path key={i} d={`M${i * 60} ${F}v28`} stroke="#000" strokeOpacity=".22" />
          ))}
          <path d={`M0 ${F + 1}H${W}`} stroke="#6f8a88" strokeWidth="2" />
          <rect x="0" y={F + 28} width={W} height="12" fill="#22312f" />
          <rect x="0" y={F + 40} width={W} height="170" fill="#1a2b2c" />
          <rect x="0" y={F + 40} width={W} height="170" fill="url(#bp-cobbles)" />
          {[[620, 70], [1140, 110], [1500, 60], [2290, 120]].map(([x, w]) => (
            <g key={x}>
              <ellipse cx={x} cy={F + 82} rx={w} ry="10" fill="#6f9496" opacity=".35" />
              <ellipse cx={x} cy={F + 82} rx={w * 0.5} ry="4" fill="#f2cf86" opacity=".18" />
            </g>
          ))}
          <rect x="0" y={F + 120} width={W} height="90" fill="url(#vignette-floor)" />
          <Rain x={0} y={180} w={W} h={640} count={140} seed={2024} opacity={0.26} />
        </>
      ),
    },
  ];
}

/* ───────────────────────────── The Drunken Goose ───────────────────────────── */
export function GooseSet(): ScenePart[] {
  const F = 638;
  const W = 1440;
  return [
    {
      depth: 1,
      node: (
        <g>
          <defs>
            <linearGradient id="goose-shade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={INK} stopOpacity=".6" />
              <stop offset=".45" stopColor={INK} stopOpacity="0" />
            </linearGradient>
            <pattern id="goose-paper" width="36" height="36" patternUnits="userSpaceOnUse">
              <rect width="36" height="36" fill="#5a2c2a" />
              <circle cx="18" cy="18" r="3" fill="#6e3a34" />
              <circle cx="0" cy="0" r="2" fill="#6e3a34" />
              <circle cx="36" cy="36" r="2" fill="#6e3a34" />
            </pattern>
          </defs>
          <rect width={W} height="810" fill="url(#goose-paper)" />
          {/* Panelled dado */}
          <rect y="440" width={W} height={F - 440} fill="#3c2418" />
          {Array.from({ length: 15 }, (_, i) => (
            <rect key={i} x={12 + i * 96} y="458" width="78" height="164" rx="2" fill="none" stroke="#5b3a28" strokeWidth="3" />
          ))}
          <rect y="434" width={W} height="8" fill={BRASS_DARK} />
          {/* Beams */}
          <rect width={W} height="70" fill="#24160f" />
          {[160, 520, 900, 1260].map((x) => (
            <rect key={x} x={x - 18} y="0" width="36" height="110" fill="#2e1d14" />
          ))}
          <rect y="66" width={W} height="10" fill="#3c2418" />

          {/* Exit door */}
          <rect x="84" y="404" width="92" height="234" fill="#3c2418" />
          <rect x="92" y="412" width="76" height="226" fill="#7a2a2e" />
          <path d="M100 420H160V488H100Z" fill="#9fc4c2" opacity=".5" />
          <circle cx="160" cy="540" r="4" fill={BRASS} />

          {/* Window with drizzle */}
          <g>
            <rect x="230" y="190" width="150" height="190" fill="#3c2418" />
            <rect x="240" y="200" width="130" height="170" fill="#5b7f80" />
            <Rain x={242} y={200} w={126} h={150} count={18} seed={88} opacity={0.5} />
            <path d="M305 200V370M240 285H370" stroke="#3c2418" strokeWidth="6" />
            <Curtain x={214} y={176} w={44} h={220} fold={14} color={LACQUER_DARK} className="st-curtain" />
            <Curtain x={352} y={176} w={44} h={220} fold={14} color={LACQUER_DARK} flip className="st-curtain" />
          </g>

          {/* Notice board: lost cats, bicycles for hire, and one driver for hire */}
          <g>
            <rect x="404" y="238" width="84" height="112" rx="3" fill="#6b4630" />
            <rect x="410" y="244" width="72" height="100" fill="#b98d5c" />
            {Array.from({ length: 18 }, (_, i) => {
              const r = scatter(400 + i);
              return <circle key={i} cx={412 + r() * 68} cy={248 + r() * 92} r=".9" fill="#8a6440" />;
            })}
            <g transform="rotate(-4 430 270)">
              <rect x="416" y="252" width="28" height="22" fill="#f0e8d4" />
              <path d="M420 259h20M420 264h16M420 269h18" stroke="#8a8170" strokeWidth="1.2" />
            </g>
            <g transform="rotate(5 462 266)">
              <rect x="450" y="254" width="26" height="26" fill="#e8d9a8" />
              <circle cx="463" cy="263" r="4" fill="none" stroke="#5a4a38" strokeWidth="1.2" />
              <path d="M455 273h16" stroke="#8a8170" strokeWidth="1.2" />
            </g>
            <g transform="rotate(-2 446 312)">
              <rect x="420" y="290" width="54" height="44" fill="#f0e8d4" />
              <text x="447" y="304" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="9" fill={LACQUER}>
                招 募
              </text>
              <path d="M426 312h42M426 318h36M426 324h40" stroke="#8a8170" strokeWidth="1.2" />
            </g>
            {[[430, 252], [463, 254], [447, 290]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={LACQUER} />
            ))}
          </g>

          {/* Pettigrew's table */}
          <g transform="translate(560 638)">
            <rect x="-60" y="-70" width="120" height="10" fill="#6b4630" />
            <path d="M-50 0V-60M50 0V-60" stroke="#3c2418" strokeWidth="8" />
            <rect x="-30" y="-92" width="14" height="22" rx="2" fill="#d6b23e" opacity=".85" />
            <rect x="-31" y="-96" width="16" height="6" fill="#f0e8d4" />
            <g transform="translate(16 -74) rotate(-8)">
              {[0, 1, 2].map((i) => (
                <rect key={i} x={i * 3} y={-i * 2} width="20" height="12" fill="#f0e8d4" stroke="#b9ad96" strokeWidth=".6" />
              ))}
              <text x="13" y="0" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="4" fill={LACQUER}>
                PETTIGREW
              </text>
            </g>
          </g>

          {/* Fireplace */}
          <g>
            <rect x="620" y="300" width="230" height="338" fill="#6e665a" />
            <rect x="606" y="292" width="258" height="18" fill="#8e8a7b" />
            <rect x="660" y="420" width="150" height="218" fill="#1a1210" />
            <path d="M660 420Q735 380 810 420" fill="#6e665a" />
            <g className="st-breathe" style={{ animationDuration: '1.6s' }}>
              <path d="M690 638q10 -60 30 -70q-6 30 16 46q4 -40 24 -54q-4 34 20 58q6 -16 10 -26q8 22 0 46z" fill="#d0772f" />
              <path d="M710 638q8 -36 22 -42q-2 20 12 30q4 -24 16 -30q0 22 12 42z" fill="#ffc874" />
            </g>
            <Glow x={735} y={600} r={170} tone="warm" strength={0.55} className="st-lamp" />
            <Frame x={680} y={180} w={110} h={88}>
              <rect x="680" y="180" width="110" height="88" fill="#9fb3a8" />
              <path d="M700 250q-4 -30 22 -36q8 -18 22 -14q-10 6 -6 14q16 10 6 28q-10 12 -44 8z" fill={BONE} />
              <circle cx="740" cy="210" r="2" fill={INK} />
              <path d="M752 210l8 3l-8 3z" fill={BRASS} />
            </Frame>
          </g>

          {/* Dartboard and chalk menu */}
          <g>
            <circle cx="930" cy="250" r="34" fill="#1f1a18" />
            {[28, 20, 12, 5].map((r, i) => (
              <circle key={r} cx="930" cy="250" r={r} fill={i % 2 ? '#2f6b62' : LACQUER_DARK} />
            ))}
            <path d="M930 216V284M896 250H964" stroke={BONE} strokeOpacity=".3" />
            <path d="M944 238l18 -10" stroke={BRASS} strokeWidth="2" />
            <rect x="990" y="170" width="140" height="170" fill="#1c2a2a" stroke="#6b4630" strokeWidth="6" />
            <text x="1060" y="200" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="14" fill={BONE}>
              今日供应
            </text>
            {['炸鱼 · 薯条', '豌豆泥', '牧羊人派', '罗茜的心情'].map((item, i) => (
              <text key={item} x="1004" y={230 + i * 26} fontFamily="var(--font-ui)" fontSize="12" fill={i === 3 ? '#ffb36b' : BONE} opacity=".85">
                {item}
              </text>
            ))}
          </g>

          {/* The sisters' table: tea for two */}
          <g transform="translate(930 638)">
            <rect x="-70" y="-70" width="140" height="10" fill="#6b4630" />
            <path d="M-60 0V-60M60 0V-60" stroke="#3c2418" strokeWidth="8" />
            <path d="M-20 -70v-14q0 -14 16 -14h14q16 0 16 14v14z" fill={BONE} />
            <path d="M26 -84q12 -2 14 8" stroke={BONE} strokeWidth="3" fill="none" />
            <circle cx="3" cy="-100" r="4" fill={BONE} />
            <rect x="-48" y="-80" width="16" height="10" rx="2" fill={BONE} />
            <rect x="36" y="-80" width="16" height="10" rx="2" fill={BONE} />
          </g>

          {/* The bar */}
          <g>
            <rect x="1110" y="380" width="300" height="258" fill="#4a2c1c" />
            <rect x="1100" y="372" width="320" height="16" fill="#7a5638" />
            {[1150, 1210, 1270, 1330].map((x) => (
              <g key={x}>
                <rect x={x - 4} y="336" width="8" height="40" fill={BRASS} />
                <rect x={x - 9} y="326" width="18" height="14" rx="3" fill={x % 120 === 30 ? LACQUER : '#2f6b62'} />
              </g>
            ))}
            {Array.from({ length: 4 }, (_, i) => (
              <rect key={i} x={1124 + i * 70} y="410" width="54" height="200" rx="3" fill="none" stroke="#6b4630" strokeWidth="3" />
            ))}
            <rect x="1110" y="140" width="300" height="10" fill="#6b4630" />
            <rect x="1110" y="230" width="300" height="10" fill="#6b4630" />
            {Array.from({ length: 12 }, (_, i) => {
              const r = scatter(140 + i);
              return (
                <g key={i}>
                  <rect x={1120 + i * 24} y={140 - 46 - r() * 12} width="14" height={46 + r() * 12} rx="3" fill={['#4f7f63', '#7a3a30', '#3d5f78', '#a8823e'][i % 4]} opacity=".9" />
                  <rect x={1120 + i * 24} y={230 - 34} width="14" height="34" rx="3" fill={['#a8823e', '#4f7f63', '#7a3a30'][i % 3]} opacity=".8" />
                </g>
              );
            })}
          </g>

          {/* Cellar hatch */}
          <g>
            <path d="M1250 638l12 -16h84l12 16z" fill="#2e1d14" />
            <rect x="1262" y="600" width="84" height="22" fill="#3c2418" />
            <path d="M1270 600v22M1290 600v22M1310 600v22M1330 600v22" stroke="#1a1210" strokeWidth="2" />
            <circle cx="1304" cy="590" r="6" fill="none" stroke={BRASS} strokeWidth="2" />
          </g>

          {/* Pendant lamps */}
          {[400, 1060].map((x) => (
            <g key={x}>
              <g className="st-sway" style={{ transformOrigin: `${x}px 76px` }}>
                <path d={`M${x} 76V170`} stroke="#14262c" strokeWidth="2" />
                <path d={`M${x - 30} 196L${x - 10} 166H${x + 10}L${x + 30} 196Z`} fill="#8a3b2e" />
                <circle cx={x} cy="198" r="6" fill="#fff1c4" />
                <Glow x={x} y={200} r={100} tone="warm" strength={0.5} className="st-lamp" />
                <Beam x={x} y={198} length={440} spread={170} strength={0.12} tone="warm" />
              </g>
              <Motes x={x - 130} y={240} w={260} h={360} count={14} seed={x} />
            </g>
          ))}

          <rect width={W} height={F} fill="url(#goose-shade)" />
          <rect y={F} width={W} height="172" fill="#3c2418" />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M0 ${F + 10 + i * 20}H${W}`} stroke="#000" strokeOpacity=".25" />
          ))}
          <path d={`M0 ${F}H${W}`} stroke="#6b4630" strokeWidth="3" />
          <ellipse cx="735" cy={F + 10} rx="260" ry="18" fill="url(#glow-warm)" opacity=".4" />
          <rect y={F + 80} width={W} height="92" fill="url(#vignette-floor)" />
        </g>
      ),
    },
  ];
}

/* ───────────────────────────── Hobbs's Curiosities ───────────────────────────── */
export function CuriosSet(): ScenePart[] {
  const F = 604;
  const W = 1280;
  const r = scatter(606);
  return [
    {
      depth: 1,
      node: (
        <g>
          <defs>
            <linearGradient id="curios-shade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={INK} stopOpacity=".7" />
              <stop offset=".5" stopColor={INK} stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width={W} height={F} fill="#2b2133" />
          <rect y="0" width={W} height="40" fill="#1a1420" />
          {/* Floor-to-ceiling shelves */}
          {[220, 470, 960].map((x, s) => (
            <g key={x}>
              <rect x={x} y="60" width="210" height={F - 60} fill="#3a2419" />
              <rect x={x + 8} y="68" width="194" height={F - 76} fill="#1e140f" />
              {[150, 240, 330, 420, 510].map((y) => (
                <rect key={y} x={x + 8} y={y} width="194" height="8" fill="#5c3b2b" />
              ))}
              {[150, 240, 330, 420, 510].map((y, row) =>
                Array.from({ length: 5 }, (_, i) => {
                  const kind = Math.floor(r() * 6);
                  const cx = x + 26 + i * 38;
                  const tint = [LACQUER, PEACOCK_MID, BRASS_DARK, '#5b6b46', '#7a3a30', '#3d5f78'][(i + row + s) % 6];
                  if (kind === 0) return <rect key={`${row}${i}`} x={cx - 9} y={y - 40} width="18" height="40" rx="3" fill={tint} opacity=".85" />;
                  if (kind === 1) return <circle key={`${row}${i}`} cx={cx} cy={y - 16} r="15" fill="none" stroke={BRASS} strokeWidth="2.4" />;
                  if (kind === 2)
                    return (
                      <g key={`${row}${i}`}>
                        <circle cx={cx} cy={y - 18} r="13" fill={BONE} stroke={BRASS_DARK} strokeWidth="3" />
                        <path d={`M${cx} ${y - 26}v8l6 4`} stroke={INK} strokeWidth="1.4" fill="none" />
                      </g>
                    );
                  if (kind === 3) return <path key={`${row}${i}`} d={`M${cx - 14} ${y}l14 -36l14 36z`} fill={tint} opacity=".8" />;
                  if (kind === 4) return <PlayingCardProp key={`${row}${i}`} x={cx} y={y - 16} rotate={(i - 2) * 8} s={0.95} red={i % 2 === 0} />;
                  return <rect key={`${row}${i}`} x={cx - 14} y={y - 22} width="28" height="22" fill={tint} opacity=".7" />;
                }),
              )}
            </g>
          ))}
          {/* Birdcage, gramophone, owl */}
          <g transform="translate(760 330)">
            <path d="M0 -150V-120" stroke="#14262c" strokeWidth="2" />
            <path d="M-34 0V-70Q0 -130 34 -70V0Z" fill="none" stroke={BRASS} strokeWidth="2.4" />
            {[-22, -11, 0, 11, 22].map((x) => (
              <path key={x} d={`M${x} 0V${-70 - (22 - Math.abs(x)) * 1.4}`} stroke={BRASS} strokeWidth="1" />
            ))}
            <rect x="-38" y="0" width="76" height="6" fill={BRASS_DARK} />
            <path d="M-8 -30q8 -16 18 -4q-4 10 -18 4z" fill="#d6b23e" />
          </g>
          <g transform="translate(1010 466) scale(.7)">
            <rect x="-40" y="-40" width="80" height="40" fill="#5c3b2b" />
            <path d="M0 -40V-60" stroke={BRASS} strokeWidth="4" />
            <path d="M0 -60Q20 -110 70 -126Q80 -100 40 -70Z" fill={BRASS} />
            <ellipse cx="0" cy="-42" rx="34" ry="5" fill="#1a1210" />
          </g>
          <g transform="translate(1180 160)">
            <path d="M-20 40Q-26 0 0 -10Q26 0 20 40Z" fill="#7a6248" />
            <circle cx="-8" cy="4" r="7" fill="#f2cf86" />
            <circle cx="8" cy="4" r="7" fill="#f2cf86" />
            <circle cx="-8" cy="4" r="3" fill={INK} />
            <circle cx="8" cy="4" r="3" fill={INK} />
            <path d="M-3 12l3 6l3 -6z" fill={BRASS} />
            <rect x="-24" y="40" width="48" height="8" fill="#3a2419" />
          </g>

          {/* Door */}
          <rect x="84" y="380" width="92" height="224" fill="#3a2419" />
          <rect x="92" y="388" width="76" height="216" fill="#2b2133" />
          <path d="M100 396H160V460H100Z" fill="#9fc4c2" opacity=".45" />
          <circle cx="160" cy="510" r="4" fill={BRASS} />
          <path d="M130 372v-12" stroke="#14262c" strokeWidth="2" />
          <path d="M123 386q7 -16 14 0z" fill={BRASS} />

          {/* Counter with till and bell */}
          <g>
            <rect x="780" y="476" width="400" height="128" fill="#5c3b2b" />
            <rect x="770" y="466" width="420" height="14" fill="#7a5638" />
            {Array.from({ length: 5 }, (_, i) => (
              <rect key={i} x={792 + i * 78} y="492" width="64" height="98" rx="2" fill="none" stroke="#3a2419" strokeWidth="3" />
            ))}
            <g transform="translate(1100 466)">
              <rect x="-36" y="-48" width="72" height="48" rx="4" fill={BRASS_DARK} />
              <rect x="-30" y="-64" width="60" height="18" rx="3" fill={BRASS} />
              {[-20, -6, 8, 22].map((x) => (
                <circle key={x} cx={x} cy="-28" r="4" fill={BONE} />
              ))}
              <text x="0" y="-51" textAnchor="middle" fontFamily="var(--font-display)" fontSize="10" fill={INK}>
                £ 0.00
              </text>
            </g>
            <g transform="translate(960 466)">
              <path d="M-12 0q12 -26 24 0z" fill={BRASS} />
              <circle cx="0" cy="-15" r="3" fill={BRASS} />
            </g>
            <g transform="translate(880 466) rotate(-6)">
              <rect x="-26" y="-34" width="52" height="34" fill="#e9e0cb" />
              <text x="0" y="-19" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="10" fontWeight="700" fill={LACQUER}>
                看就别摸
              </text>
              <text x="0" y="-6" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="8" fill={INK}>
                摸了就买
              </text>
            </g>
          </g>

          {/* Hanging lamps */}
          {[360, 860].map((x) => (
            <g key={x}>
              <g className="st-sway" style={{ transformOrigin: `${x}px 40px` }}>
                <path d={`M${x} 40V150`} stroke="#14262c" strokeWidth="2" />
                <path d={`M${x - 26} 176L${x - 8} 148H${x + 8}L${x + 26} 176Z`} fill="#4f7f63" />
                <circle cx={x} cy="178" r="6" fill="#fff1c4" />
                <Glow x={x} y={180} r={100} tone="warm" strength={0.5} className="st-lamp" />
                <Beam x={x} y={178} length={426} spread={160} strength={0.14} tone="warm" />
              </g>
              <Motes x={x - 120} y={210} w={240} h={360} count={14} seed={x + 7} />
            </g>
          ))}
          <rect width={W} height={F} fill="url(#curios-shade)" />
          <rect y={F} width={W} height="116" fill="#2a1a12" />
          {Array.from({ length: 6 }, (_, i) => (
            <path key={i} d={`M0 ${F + 10 + i * 20}H${W}`} stroke="#000" strokeOpacity=".25" />
          ))}
          <path d={`M0 ${F}H${W}`} stroke="#5c3b2b" strokeWidth="3" />
          <rect x="300" y={F} width="420" height="10" fill="#4b2a3a" />
          <rect y={F + 40} width={W} height="76" fill="url(#vignette-floor)" />
        </g>
      ),
    },
  ];
}

/* ───────────────────────────── The Thursday Theatre ───────────────────────────── */
export function ThursdaySet(): ScenePart[] {
  const F = 638;
  const W = 1800;
  return [
    {
      depth: 1,
      node: (
        <g>
          <defs>
            <linearGradient id="thursday-cyc" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#13303b" />
              <stop offset=".7" stopColor="#2c5560" />
              <stop offset="1" stopColor="#5b7f80" />
            </linearGradient>
            <linearGradient id="thursday-wood" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#5a3e2a" />
              <stop offset=".5" stopColor="#7a5638" />
              <stop offset="1" stopColor="#5a3e2a" />
            </linearGradient>
          </defs>
          <rect width={W} height="810" fill="#0b1a20" />
          {/* Foyer on the left: ticket booth */}
          <rect x="0" y="80" width="560" height={F - 80} fill="#3a2a2e" />
          <rect x="0" y="440" width="560" height={F - 440} fill="#2b1d20" />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={16 + i * 92} y="458" width="74" height="164" rx="2" fill="none" stroke="#4a3236" strokeWidth="3" />
          ))}
          <rect x="0" y="434" width="560" height="8" fill={BRASS_DARK} />
          {/* Exit door */}
          <rect x="94" y="404" width="92" height="234" fill="#2b1d20" />
          <rect x="102" y="412" width="76" height="226" fill="#6e2433" />
          <path d="M110 420H170V480H110Z" fill="#9fc4c2" opacity=".45" />
          <circle cx="170" cy="540" r="4" fill={BRASS} />
          <rect x="110" y="376" width="60" height="22" rx="3" fill="#0b2a26" />
          <text x="140" y="392" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="12" letterSpacing="3" fill={VERDIGRIS} className="st-neon">
            出口
          </text>
          {/* Booth */}
          <g>
            <rect x="320" y="300" width="230" height="338" fill="#6e2433" />
            <rect x="330" y="310" width="210" height="80" fill="#1a1012" />
            <text x="435" y="345" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="20" letterSpacing="8" fill="#ffeab0" className="st-neon">
              售票处
            </text>
            <text x="435" y="374" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" letterSpacing="4" fill={BRASS}>
              BOX OFFICE
            </text>
            <path d="M350 410h170v120h-170z" fill="#e9b965" opacity=".75" />
            <path d="M350 410h170v120h-170z" fill="none" stroke={BRASS} strokeWidth="3" />
            <path d="M435 410v120" stroke={BRASS} strokeWidth="2" />
            <rect x="380" y="512" width="110" height="18" rx="9" fill="#2b1d20" />
            <rect x="330" y="548" width="210" height="90" fill="#561a20" />
            <g transform="translate(468 560)">
              <rect width="70" height="40" fill="#e9e0cb" />
              <text x="35" y="16" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="9" fontWeight="700" fill={LACQUER}>
                规定就是规定
              </text>
              <text x="35" y="31" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="8" fill={INK}>
                （包括这一条）
              </text>
            </g>
            <Glow x={435} y={460} r={150} tone="warm" strength={0.35} />
          </g>

          {/* The hall: painted backcloth of the bridge */}
          <rect x="600" y="140" width={W - 640} height={F - 140} fill="url(#thursday-cyc)" />
          <path d={`M600 470Q900 410 1180 450T1760 430V${F}H600Z`} fill="#3d5e5f" opacity=".9" />
          <g opacity=".7">
            <path d="M820 520Q1180 380 1540 520" stroke="#22383e" strokeWidth="12" fill="none" />
            <path d="M820 520H1540" stroke="#22383e" strokeWidth="8" />
            {Array.from({ length: 12 }, (_, i) => {
              const x = 850 + i * 58;
              const t = (x - 820) / 720;
              return <path key={i} d={`M${x} 520V${520 - 560 * t * (1 - t)}`} stroke="#22383e" strokeWidth="3" />;
            })}
          </g>
          <Bunting x1={640} x2={1760} y={210} sag={30} />

          {/* Bracket board */}
          <g transform="translate(1596 638) scale(.9)">
            <path d="M-40 0L-30 -190M40 0L30 -190" stroke="#5c3b2b" strokeWidth="6" />
            <rect x="-62" y="-250" width="124" height="150" fill="#e9e0cb" />
            <text x="0" y="-228" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="11" fontWeight="700" fill={LACQUER}>
              公开赛对阵
            </text>
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <path d={`M-50 ${-208 + i * 22}h36v11`} stroke={INK} strokeWidth="1.4" fill="none" />
              </g>
            ))}
            <path d="M-14 -197h22v44h18M-14 -153h22" stroke={INK} strokeWidth="1.4" fill="none" />
            <text x="34" y="-150" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fill={BRASS}>
              ♛
            </text>
            <text x="0" y="-112" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="9" fill={INK}>
              决赛 · 今晚
            </text>
          </g>

          {/* Proscenium: painted wood, humbler than the Lyric */}
          <rect x="560" y="80" width="40" height="730" fill="url(#thursday-wood)" />
          <rect x={W - 40} y="80" width="40" height="730" fill="url(#thursday-wood)" />
          <rect x="560" y="80" width={W - 560} height="64" fill="url(#thursday-wood)" />
          <rect x="560" y="136" width={W - 560} height="8" fill={BRASS_DARK} />
          <text x={(560 + W) / 2} y="122" textAnchor="middle" fontFamily="var(--font-display)" fontSize="26" letterSpacing="8" fill={BRASS}>
            BRIDGEPORT OPEN
          </text>
          <path d={`M600 144H${W - 40}V170${Array.from({ length: 12 }, () => `q-${(W - 640) / 24} 26 -${(W - 640) / 12} 0`).join('')}Z`} fill={LACQUER} />
          <Curtain x={600} y={150} w={90} h={F - 150} fold={26} className="st-curtain" />
          <Curtain x={W - 130} y={150} w={90} h={F - 150} fold={26} flip className="st-curtain" />
          {/* Wings trunk (Hobbs's jar) */}
          <g transform="translate(1700 638)">
            <rect x="-34" y="-40" width="68" height="40" rx="4" fill="#6d4b30" />
            <rect x="-34" y="-44" width="68" height="10" rx="4" fill="#7d5a3c" />
            <rect x="-6" y="-30" width="12" height="10" fill={BRASS} />
          </g>

          {/* Gallery spots */}
          <g className="st-sweep" style={{ transformOrigin: '820px 80px' }}>
            <Beam x={820} y={80} length={560} spread={110} strength={0.09} />
          </g>
          <g className="st-sweep st-sweep-reverse" style={{ transformOrigin: '1560px 80px' }}>
            <Beam x={1560} y={80} length={560} spread={110} strength={0.09} />
          </g>
          <Motes x={640} y={220} w={1100} h={380} count={24} seed={1888} />

          {/* Stage floor, footlights, folding chairs */}
          <rect x="560" y={F} width={W - 560} height="58" fill="#4a3022" />
          {Array.from({ length: 4 }, (_, i) => (
            <path key={i} d={`M560 ${F + 12 + i * 13}H${W}`} stroke="#000" strokeOpacity=".22" />
          ))}
          <path d={`M560 ${F}H${W}`} stroke="#7a5638" strokeWidth="3" />
          <rect x="0" y={F} width="560" height="58" fill="#2b1d20" />
          <rect x="560" y={F + 58} width={W - 560} height="8" fill={BRASS_DARK} />
          {Array.from({ length: 17 }, (_, i) => (
            <g key={i}>
              <circle cx={610 + i * 70} cy={F + 76} r="4.6" fill="#fff1c4" />
              <Glow x={610 + i * 70} y={F + 72} r={40} tone="warm" strength={0.28} />
            </g>
          ))}
          <rect x="0" y={F + 86} width={W} height="90" fill="#06121a" />
          {Array.from({ length: 2 }, (_, row) =>
            Array.from({ length: 26 }, (_, i) => (
              <g key={`${row}-${i}`}>
                <path
                  d={`M${(row ? 34 : 6) + i * 70} ${F + 150 + row * 22}l6 -40h34l6 40`}
                  stroke={row ? '#0d1a20' : '#13252d'}
                  strokeWidth="4"
                  fill="none"
                />
                <rect x={(row ? 38 : 10) + i * 70} y={F + 108 + row * 22} width="38" height="8" rx="2" fill={row ? '#0d1a20' : '#13252d'} />
              </g>
            )),
          )}
          <ellipse cx="1180" cy={F + 4} rx="560" ry="30" fill="url(#glow-warm)" opacity=".18" />
        </g>
      ),
    },
  ];
}
