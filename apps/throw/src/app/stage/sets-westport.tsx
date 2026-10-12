import type { ReactNode } from 'react';
import { BONE, BRASS, BRASS_DARK, HARBOR, INK, LACQUER, LACQUER_DARK, LIMELIGHT, MIST, PEACOCK, PEACOCK_MID, PLUM, SALT, TIMBER, TIMBER_LIGHT, VERDIGRIS } from './palette';
import { Beam, Bench, Bulbs, Curtain, Frame, Glow, Motes, Pane, PlayingCardProp, StreetLamp, TopHat } from './scene-kit';
import type { ScenePart } from './sets';

export function PortSign({ x, y, w, title, subtitle }: { x: number; y: number; w: number; title: string; subtitle?: string }) {
  return <g><rect x={x} y={y} width={w} height={subtitle ? 66 : 40} rx="3" fill={INK} stroke={BRASS} strokeWidth="2" />
    <text x={x + w / 2} y={y + 27} textAnchor="middle" fill={BONE} fontFamily="var(--font-display)" fontSize="18" letterSpacing="2">{title}</text>
    {subtitle && <text x={x + w / 2} y={y + 51} textAnchor="middle" fill={BRASS} fontFamily="var(--font-ui)" fontSize="11" letterSpacing="2">{subtitle}</text>}
  </g>;
}
export function PortDoor({ x, floor, color = PEACOCK, wide = false }: { x: number; floor: number; color?: string; wide?: boolean }) {
  const w = wide ? 112 : 80;
  return <g><rect x={x - w / 2 - 7} y={floor - 219} width={w + 14} height="219" fill={SALT} />
    <rect x={x - w / 2} y={floor - 212} width={w} height="212" fill={color} />
    <rect x={x - w / 2 + 9} y={floor - 199} width={w - 18} height="82" fill={LIMELIGHT} opacity=".7" />
    <path d={`M${x} ${floor - 199}v82M${x - w / 2 + 9} ${floor - 160}h${w - 18}`} stroke={SALT} strokeWidth="3" />
    <rect x={x - w / 2 + 9} y={floor - 100} width={w - 18} height="76" fill="none" stroke={SALT} strokeOpacity=".35" strokeWidth="2" />
    <circle cx={x + w / 2 - 12} cy={floor - 103} r="4" fill={BRASS} />
    {wide && <path d={`M${x} ${floor - 112}V${floor}`} stroke={SALT} strokeWidth="3" />}
  </g>;
}
export function PortFloor({ width, floor, stone = false }: { width: number; floor: number; stone?: boolean }) {
  return <g><rect y={floor} width={width} height="230" fill={stone ? PEACOCK_MID : TIMBER} />
    {Array.from({ length: 8 }, (_, i) => <g key={i}><path d={`M0 ${floor + i * 27}H${width}`} stroke={INK} opacity=".45" strokeWidth="2" />
      {Array.from({ length: Math.ceil(width / 180) }, (_, j) => <path key={j} d={`M${j * 180 + (i % 2) * 90} ${floor + i * 27}v27`} stroke={INK} opacity=".2" />)}</g>)}
    <path d={`M0 ${floor}H${width}`} stroke={stone ? SALT : TIMBER_LIGHT} strokeWidth="4" />
    <rect y={floor + 80} width={width} height="180" fill="url(#vignette-floor)" />
  </g>;
}
function Gull({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}><path className="st-port-gull" d="M-18 3Q-10-8 0 0Q10-8 18 3" fill="none" stroke={BONE} strokeWidth="2.5" /></g>;
}
function HarborFar({ width, floor }: { width: number; floor: number }) {
  return <g><rect width={width} height={floor + 60} fill={HARBOR} />
    <circle cx="1950" cy="330" r="42" fill={LIMELIGHT} opacity=".6" />
    {[90, 740, 1250, 1990].map((x, i) => <g key={x} opacity={.35 + i * .08}>
      <path d={`M${x} ${floor - 80}v-280h12v280M${x - 74} ${floor - 324}h264l-186 62M${x + 190} ${floor - 324}v120`} stroke={SALT} strokeWidth="7" fill="none" />
      <rect x={x + 176} y={floor - 206} width="28" height="36" fill={MIST} />
    </g>)}
    <path d={`M0 ${floor - 78}H${width}V${floor + 70}H0Z`} fill={MIST} opacity=".32" />
    {[250, 830, 1490, 2120].map((x, i) => <g key={x} transform={`translate(${x} ${floor - 55 - i % 2 * 32})`} opacity=".65">
      <path d="M-125-18H125L90 18H-91Z" fill={INK} /><rect x="-25" y="-70" width="92" height="52" fill={PEACOCK_MID} />
      <path d="M0-18V-196M-70-18L0-186 105-18" fill="none" stroke={SALT} strokeWidth="3" />
      <rect x="-14" y="-61" width="10" height="12" fill={LIMELIGHT} /><rect x="12" y="-61" width="10" height="12" fill={LIMELIGHT} />
    </g>)}
    {Array.from({ length: 22 }, (_, i) => <path key={i} className="st-port-water" d={`M${i * 131} ${floor - 27 + i % 4 * 18}h${36 + i % 3 * 18}`} stroke={SALT} strokeOpacity=".24" strokeWidth="2" style={{ animationDelay: `${i * -.23}s` }} />)}
    <Gull x={560} y={342} /><Gull x={1330} y={280} size={.7} /><Gull x={2210} y={410} size={.85} />
  </g>;
}

/** All interactive façades are orthographic and registered at their actual door x. */
export function WestportSet(): ScenePart[] {
  const F = 875, W = 2560;
  return [{ depth: .12, node: <HarborFar width={W} floor={F - 30} /> }, { depth: .5, node: <g opacity=".55">
    {[40, 330, 810, 1230, 1590, 2070, 2370].map((x, i) => <g key={x}><rect x={x} y={440 + i % 3 * 65} width={160 + i % 2 * 80} height="400" fill={i % 2 ? MIST : PEACOCK_MID} />
      <path d={`M${x - 4} ${440 + i % 3 * 65}l90-65 96 65Z`} fill={INK} />
      {[0, 1, 2].map((n) => <rect key={n} x={x + 25 + n * 42} y={477 + i % 3 * 65} width="17" height="37" fill={SALT} opacity=".4" />)}</g>)}
  </g> }, { depth: 1, node: <>
    <rect x="0" y="837" width={W} height="38" fill={SALT} />
    <g><path d="M42 868V753Q42 726 74 726H260Q284 726 284 754V868Z" fill={BONE} /><rect x="42" y="800" width="242" height="68" fill={PEACOCK_MID} />
      {[68, 121, 174, 227].map((x) => <rect key={x} x={x} y="742" width="39" height="46" rx="4" fill={HARBOR} />)}
      <text x="165" y="836" fill={BONE} textAnchor="middle" fontSize="15" letterSpacing="2">GRAND TOUR</text>
      {[90, 242].map((x) => <g key={x}><circle cx={x} cy="867" r="23" fill={INK} /><circle cx={x} cy="867" r="9" fill={BRASS} /></g>)}
    </g>
    {/* Crown League: broad brass marquee and symmetrical stone piers. */}
    <rect x="445" y="358" width="386" height="517" fill={SALT} />
    <path d="M427 371H848L793 326H482Z" fill={PEACOCK} />
    {[468, 776].map((x) => <rect key={x} x={x} y="378" width="33" height="497" fill={BONE} opacity=".48" />)}
    <Pane x={540} y={405} w={65} h={102} frame={BRASS} curtain={LACQUER_DARK} />
    <Pane x={675} y={405} w={65} h={102} frame={BRASS} curtain={LACQUER_DARK} />
    <PortSign x={481} y={528} w={316} title="CROWN LEAGUE" subtitle="西 港 · 职 业 联 赛" />
    <path d="M472 598H807L785 650H494Z" fill={LACQUER_DARK} /><Bulbs x1={480} x2={800} y={604} gap={18} />
    <text x="640" y="632" textAnchor="middle" fill={LIMELIGHT} fontSize="15" letterSpacing="4">本季 · 三场主赛</text>
    <PortDoor x={620} floor={F} wide /><Glow x={620} y={760} r={190} strength={.22} tone="warm" />
    <Frame x={710} y={695} w={68} h={110}><text x="744" y="732" textAnchor="middle" fill={BRASS} fontSize="26">♠</text><text x="744" y="766" textAnchor="middle" fill={BONE} fontSize="10">职业资格</text></Frame>
    {/* Radio house has its own aerial and readable illuminated booth. */}
    <rect x="863" y="449" width="348" height="426" fill={PEACOCK} />
    <path d="M865 447H1209V428H865Z" fill={SALT} /><path d="M1040 428V280m-63 55h126m-101-25h77m-54-23h29" stroke={SALT} strokeWidth="5" />
    <circle cx="1040" cy="274" r="5" fill={LACQUER} className="st-neon" />
    <Pane x={895} y={483} w={100} h={89} frame={SALT} lit /><Pane x={1065} y={483} w={110} h={89} frame={SALT} lit />
    <PortSign x={900} y={590} w={270} title="W.P. RADIO" subtitle="潮汐广播 · ON AIR" /><PortDoor x={1040} floor={F} color={LACQUER_DARK} />
    {/* Subway access stays level with the walk plane; descent happens after entering. */}
    <path d="M1261 875V674Q1380 565 1499 674V875Z" fill={SALT} /><path d="M1281 875V687Q1380 596 1479 687V875Z" fill={INK} />
    <circle cx="1380" cy="599" r="38" fill={LACQUER_DARK} stroke={BONE} strokeWidth="5" />
    <rect x="1330" y="587" width="100" height="24" fill={PEACOCK} /><text x="1380" y="604" textAnchor="middle" fontSize="13" fill={BONE}>SUBWAY</text>
    <path d="M1300 705h160m-160 23h160m-160 23h160" stroke={SALT} strokeWidth="7" opacity=".35" />
    <PortDoor x={1380} floor={F} color={INK} />
    {/* Workshop glazing visibly sits in front of its shelves. */}
    <rect x="1560" y="492" width="358" height="383" fill={TIMBER} /><rect x="1572" y="507" width="334" height="368" fill={PEACOCK_MID} />
    <PortSign x={1583} y={545} w={312} title="FINCH · FIELD REPAIRS" subtitle="修理 · 调校 · 不修运气" />
    <rect x="1588" y="655" width="97" height="164" fill={BRASS_DARK} />
    <TopHat x={1630} y={733} s={.8} /><PlayingCardProp x={1650} y={777} rotate={-8} s={.6} />
    <rect x="1588" y="655" width="97" height="164" fill={BONE} opacity=".11" /><path d="M1637 655v164m-49-74h97" stroke={SALT} strokeWidth="4" />
    <PortDoor x={1750} floor={F} /><rect x="1830" y="682" width="52" height="95" fill={BONE} /><text x="1856" y="719" textAnchor="middle" fill={INK} fontSize="13">开门</text>
    {/* Salt Wind pub: oxidised copper awning, weatherboard upper storey. */}
    <rect x="1940" y="470" width="253" height="405" fill={TIMBER_LIGHT} />
    {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M1940 ${487 + i * 18}h253`} stroke={TIMBER} strokeWidth="2" />)}
    <Pane x={1970} y={500} w={68} h={85} curtain={LACQUER_DARK} /><Pane x={2091} y={500} w={68} h={85} curtain={LACQUER_DARK} />
    <PortSign x={1956} y={591} w={221} title="THE SALT WIND" /><path d="M1940 637h253l-18 28h-217Z" fill={VERDIGRIS} />
    <PortDoor x={2040} floor={F} color={TIMBER} /><Pane x={2111} y={688} w={60} h={120} frame={SALT} />
    {/* Dock gate and narrow company office are distinct physical destinations. */}
    <path d="M2240 875V660H2404V875M2250 698h144" fill="none" stroke={SALT} strokeWidth="9" />
    <PortSign x={2233} y={639} w={167} title="码头 · 03" /><path d="M2260 862V726m44 136V726m44 136V726" stroke={TIMBER_LIGHT} strokeWidth="5" />
    <rect x="2404" y="511" width="156" height="364" fill={PEACOCK} /><Pane x={2426} y={544} w={99} h={86} frame={BRASS} />
    <PortSign x={2412} y={635} w={139} title="港务值班室" /><PortDoor x={2460} floor={F} color={LACQUER_DARK} />
    {[330, 844, 1522, 2210].map((x) => <g key={x}><StreetLamp x={x} floor={F} height={232} /><Glow x={x} y={F - 215} r={112} tone="warm" strength={.24} /></g>)}
    <PortFloor width={W} floor={F} stone /><Motes seed={311} x={0} y={370} w={W} h={440} count={28} />
  </> }];
}

export function PortRoom({ width, floor, wall = PEACOCK, children }: { width: number; floor: number; wall?: string; children: ReactNode }) {
  return <><rect width={width} height={floor} fill={wall} /><rect y={floor - 170} width={width} height="170" fill={INK} opacity=".35" />
    {Array.from({ length: Math.ceil(width / 110) }, (_, i) => <rect key={i} x={i * 110 + 8} y={floor - 158} width="94" height="145" rx="2" fill="none" stroke={SALT} strokeOpacity=".15" strokeWidth="3" />)}
    <path d={`M0 ${floor - 173}H${width}`} stroke={BRASS_DARK} strokeWidth="7" />
    {children}<PortDoor x={130} floor={floor} color={LACQUER_DARK} /><PortFloor width={width} floor={floor} />
    <Motes seed={width + floor} x={240} y={120} w={width - 300} h={floor - 180} count={22} /></>;
}
function Desk({ x, floor, w = 130 }: { x: number; floor: number; w?: number }) {
  return <g><path d={`M${x + 10} ${floor}v-70h${w - 20}v70`} fill="none" stroke={TIMBER_LIGHT} strokeWidth="9" /><rect x={x} y={floor - 77} width={w} height="13" fill={TIMBER_LIGHT} /><rect x={x + 12} y={floor - 83} width="34" height="6" fill={BONE} /><circle cx={x + w - 24} cy={floor - 88} r="10" fill={BRASS} /></g>;
}
export function LeagueSet(): ScenePart[] {
  const F = 638, W = 1800;
  return [{ depth: 1, node: <PortRoom width={W} floor={F} wall={PLUM}>
    <rect x="290" y="80" width="970" height="465" fill={INK} /><Curtain x={270} y={80} w={150} h={465} /><Curtain x={1120} y={80} w={160} h={465} flip />
    <path d="M410 80H1130V127Q760 180 410 127Z" fill={LACQUER_DARK} /><PortSign x={528} y={158} w={468} title="WESTPORT · PROFESSIONAL LEAGUE" subtitle="凭本事登台 · 凭节目留下" />
    <circle cx="760" cy="346" r="78" fill="none" stroke={BRASS_DARK} strokeWidth="4" /><text x="760" y="373" textAnchor="middle" fontSize="100" fill={BRASS}>♠</text>
    <Bulbs x1={430} x2={1110} y={532} gap={28} /><Beam x={760} y={140} length={F - 140} spread={210} strength={.2} /><Glow x={760} y={470} r={220} strength={.1} />
    <rect x="1300" y="115" width="354" height="287" fill={INK} stroke={BRASS_DARK} strokeWidth="7" />
    <text x="1477" y="173" textAnchor="middle" fill={LIMELIGHT} fontSize="26">WESTPORT</text>
    <text x="1477" y="260" textAnchor="middle" fill={BRASS} fontSize="80">♠</text>
    <text x="1477" y="338" textAnchor="middle" fill={BONE} fontSize="19">职业选手 · 登记处</text>
    {/* The actionable noticeboard is centred on the league-bill hotspot (x420). */}
    <path d="M348 638V563m144 75v-75" stroke={TIMBER_LIGHT} strokeWidth="9" />
    <rect x="327" y="373" width="186" height="193" fill={TIMBER} stroke={BRASS_DARK} strokeWidth="7" />
    <text x="420" y="405" textAnchor="middle" fill={LIMELIGHT} fontSize="19">联赛公报</text>
    {['01  港口预选', '02  广播复赛', '03  西港总决赛'].map((text, i) => <g key={text}><rect x="342" y={423 + i * 44} width="156" height="32" fill={BONE} /><text x="352" y={445 + i * 44} fill={INK} fontSize="13">{text}</text></g>)}
    <Desk x={1440} floor={F} w={180} />
  </PortRoom> }];
}
export function RadioSet(): ScenePart[] {
  const F = 638, W = 1440;
  return [{ depth: 1, node: <PortRoom width={W} floor={F}>
    <rect x="300" y="180" width="620" height="287" fill={INK} stroke={SALT} strokeWidth="10" />
    <rect x="315" y="195" width="590" height="256" fill={HARBOR} />
    <rect x="359" y="256" width="530" height="135" fill={PEACOCK_MID} />
    {Array.from({ length: 14 }, (_, i) => <g key={i}><rect x={372 + i * 35} y={275 + i % 3 * 6} width="20" height="54" fill={INK} /><circle cx={382 + i * 35} cy="352" r="7" fill={BRASS} /><path d={`M${376 + i * 35} 378h12`} stroke={VERDIGRIS} strokeWidth="3" /></g>)}
    <rect x="315" y="195" width="590" height="256" fill={BONE} opacity=".06" /><path d="M610 190v270m-250-50 170-210" stroke={SALT} strokeWidth="5" opacity=".45" />
    <PortSign x={450} y={86} w={350} title="ON AIR · 潮汐之声" subtitle="请勿对着话筒说‘试试’" />
    <circle cx="431" cy="111" r="9" fill={LACQUER} className="st-neon" />
    <Desk x={405} floor={F} w={285} /><path d="M1020 638v-133q0-25 25-25h27" fill="none" stroke={SALT} strokeWidth="5" />
    <rect x="1063" y="456" width="25" height="53" rx="12" fill={BRASS} /><path d="M1070 465v34m7-34v34" stroke={INK} strokeWidth="3" />
    <path d="M995 638h50" stroke={INK} strokeWidth="6" /><Curtain x={1170} y={94} w={220} h={455} color={PEACOCK_MID} shade={INK} />
    <Beam x={1060} y={99} length={F - 99} spread={165} strength={.15} />
  </PortRoom> }];
}
export function DocksSet(): ScenePart[] {
  const F = 638, W = 1800;
  return [{ depth: .15, node: <HarborFar width={W} floor={F - 24} /> }, { depth: 1, node: <>
    <path d="M0 638V390H225V638" fill={PEACOCK} /><PortDoor x={130} floor={F} />
    <path d="M310 546h1290v15H310Z" fill={TIMBER} /><path d="M350 553v85m250-85v85m260-85v85m280-85v85m250-85v85" stroke={TIMBER_LIGHT} strokeWidth="12" />
    <path d="M350 539Q475 590 600 539Q730 590 860 539Q1000 590 1140 539Q1265 590 1390 539Q1495 590 1600 539" fill="none" stroke={BONE} strokeWidth="5" opacity=".7" />
    <rect x="1470" y="497" width="145" height="141" fill={TIMBER} stroke={TIMBER_LIGHT} strokeWidth="6" /><path d="M1480 507l125 121m-125 0 125-121" stroke={TIMBER_LIGHT} strokeWidth="5" />
    <rect x="1530" y="451" width="87" height="43" fill={TIMBER_LIGHT} /><circle cx="320" cy="568" r="31" fill="none" stroke={BRASS_DARK} strokeWidth="11" />
    <rect x="1484" y="363" width="132" height="122" fill={BONE} stroke={BRASS_DARK} strokeWidth="5" /><text x="1550" y="393" textAnchor="middle" fill={INK} fontSize="15">海边七日档期</text>
    <path d="M1500 410h100m-100 19h100m-100 19h100m-100 19h100m-72-65v75m35-75v75" stroke={TIMBER_LIGHT} strokeWidth="2" />
    <path d="M335 305v333m370-333v333" stroke={SALT} strokeWidth="7" /><PortSign x={325} y={239} w={390} title="PIER 03 · 旧栈桥" subtitle="请把行李与脾气一并带走" />
    {[295, 1710].map((x) => <g key={x}><StreetLamp x={x} floor={F} /><Glow x={x} y={F - 214} r={140} tone="warm" strength={.3} /></g>)}
    <PortFloor width={W} floor={F} /><Gull x={1380} y={177} />
  </> }];
}
export function SubwaySet(): ScenePart[] {
  const F = 638, W = 1800;
  return [{ depth: 1, node: <>
    <rect width={W} height={F} fill={INK} />
    {Array.from({ length: 7 }, (_, i) => <g key={i}><path d={`M${240 + i * 260} ${F}V262Q${360 + i * 260} 120 ${480 + i * 260} 262V${F}`} fill={PEACOCK} stroke={MIST} strokeWidth="18" />
      <path d={`M${252 + i * 260} 465h208m-208-31h208m-208-31h208`} stroke={SALT} strokeWidth="2" opacity=".17" /></g>)}
    <rect x="300" y="351" width="1260" height="173" fill={MIST} /><rect x="300" y="450" width="1260" height="72" fill={PEACOCK_MID} />
    {Array.from({ length: 10 }, (_, i) => <rect key={i} x={326 + i * 120} y="368" width="77" height="66" rx="5" fill={INK} />)}
    <path d="M300 447h1260" stroke={BRASS} strokeWidth="3" /><PortDoor x={130} floor={F} />
    <PortSign x={558} y={161} w={498} title="WESTPORT CENTRAL" subtitle="每一次晚点，都是一场即兴演出" />
    {[470, 1240, 1670].map((x) => <g key={x}><path d={`M${x} 90v150`} stroke={INK} strokeWidth="5" /><path d={`M${x - 35} 254h70l-19-24h-32Z`} fill={SALT} /><Glow x={x} y={254} r={140} strength={.18} /><Beam x={x} y={254} length={F - 254} spread={140} strength={.1} /></g>)}
    <Bench x={365} floor={F} width={160} /><Bench x={1390} floor={F} width={170} /><PortFloor width={W} floor={F} stone />
    <path d={`M0 ${F + 4}H${W}`} stroke={BRASS} strokeWidth="5" />
  </> }];
}
export function WestshopSet(): ScenePart[] {
  const F = 604, W = 1280;
  return [{ depth: 1, node: <PortRoom width={W} floor={F} wall={PEACOCK_MID}>
    <rect x="325" y="175" width="720" height="255" fill={TIMBER} stroke={TIMBER_LIGHT} strokeWidth="8" />
    {Array.from({ length: 14 }, (_, i) => <g key={i}><circle cx={350 + i * 47} cy="196" r="3" fill={BRASS} /><path d={`M${350 + i * 47} 199v${36 + i % 3 * 22}`} stroke={SALT} strokeWidth="5" />
      {i % 3 === 0 ? <circle cx={350 + i * 47} cy={247 + i % 3 * 22} r="9" fill="none" stroke={SALT} strokeWidth="4" />
        : i % 3 === 1 ? <path d={`M${335 + i * 47} 257h30v11h-30Z`} fill={SALT} />
          : <path d={`M${350 + i * 47} 269l-9 26m9-26 9 26m-9-26-7-10m7 10 7-10`} stroke={SALT} strokeWidth="4" fill="none" />}
    </g>)}
    <rect x="316" y="335" width="739" height="12" fill={TIMBER_LIGHT} /><TopHat x={390} y={335} /><PlayingCardProp x={680} y={323} rotate={-14} s={.75} />
    {[480, 540, 850, 910].map((x) => <g key={x}><rect x={x} y="283" width="35" height="50" rx="4" fill={x % 3 ? VERDIGRIS : BRASS} /><rect x={x + 8} y="275" width="19" height="12" fill={INK} /></g>)}
    <Desk x={465} floor={F} w={300} /><PortSign x={348} y={90} w={630} title="FINCH · WORKSHOP" subtitle="能修的先修，修不好的拆开看看" />
    <rect x="1050" y="420" width="120" height="184" fill={TIMBER} stroke={TIMBER_LIGHT} strokeWidth="5" />
    {[448, 496, 544].map((y) => <g key={y}><path d={`M1055 ${y + 26}h110`} stroke={TIMBER_LIGHT} strokeWidth="3" /><path d={`M1094 ${y}h30`} stroke={BRASS} strokeWidth="5" /></g>)}
    <Beam x={645} y={100} length={F - 100} spread={240} strength={.12} />
  </PortRoom> }];
}
export function WestpubSet(): ScenePart[] {
  const F = 638, W = 1440;
  return [{ depth: 1, node: <PortRoom width={W} floor={F} wall={TIMBER}>
    <Pane x={235} y={162} w={115} h={189} frame={SALT} glass={HARBOR} lit={false} />
    <rect x="375" y="249" width="132" height="174" fill={BRASS_DARK} stroke={TIMBER_LIGHT} strokeWidth="8" />
    <rect x="390" y="266" width="101" height="140" fill={BONE} /><text x="440" y="299" textAnchor="middle" fill={LACQUER} fontSize="17">招 募</text>
    <path d="M402 321h76m-76 14h62m-62 14h70m-70 24h43" stroke={TIMBER} strokeWidth="3" /><circle cx="440" cy="271" r="4" fill={LACQUER} />
    <circle cx="751" cy="252" r="96" fill="none" stroke={TIMBER_LIGHT} strokeWidth="15" />
    {Array.from({ length: 8 }, (_, i) => <path key={i} d="M751 138v228" transform={`rotate(${i * 45} 751 252)`} stroke={BRASS_DARK} strokeWidth="5" />)}
    <circle cx="751" cy="252" r="19" fill={BRASS} /><PortSign x={1007} y={111} w={344} title="THE SALT WIND" subtitle="今日鲜鱼 · 昨日笑话" />
    <rect x="1000" y="538" width="375" height="100" fill={TIMBER_LIGHT} /><rect x="991" y="526" width="393" height="17" fill={BRASS_DARK} />
    {[1035, 1140, 1245].map((x) => <rect key={x} x={x} y="555" width="84" height="71" fill="none" stroke={TIMBER} strokeWidth="3" />)}
    {[1040, 1130, 1220, 1310].map((x) => <g key={x}><rect x={x} y="284" width="20" height="76" fill={VERDIGRIS} /><rect x={x + 5} y="267" width="10" height="20" fill={VERDIGRIS} /><path d={`M${x - 8} 369h44`} stroke={TIMBER_LIGHT} strokeWidth="10" /></g>)}
    <Desk x={540} floor={F} w={135} /><Desk x={858} floor={F} w={116} />
    <Beam x={750} y={85} length={F - 85} spread={270} strength={.12} tone="warm" /><Glow x={751} y={250} r={200} tone="warm" strength={.15} />
  </PortRoom> }];
}
