import { BONE, BRASS, BRASS_DARK, HARBOR, INK, LACQUER_DARK, LIMELIGHT, MIST, PEACOCK, PEACOCK_MID, SALT, TIMBER, TIMBER_LIGHT, VERDIGRIS } from './palette';
import { Beam, Bulbs, Curtain, Glow, Pane, PlayingCardProp, TopHat } from './scene-kit';
import type { ScenePart } from './sets';
import { LODGING_ENTRANCES } from '../../lib/adventure/lodgings';
import { PortDoor, PortFloor, PortRoom, PortSign } from './sets-westport';

type HomeCity = 'graywick' | 'bridgeport' | 'westport' | 'millbrook';
const HOMES: Record<HomeCity, { name: string; subtitle: string; wall: string }> = {
  millbrook: { name: '北方织工 · 剧团之家', subtitle: '三个人把曲子吹完，一家人把晚饭吃完', wall: TIMBER },
  graywick: { name: '里德街 · 剧团会所', subtitle: '小镇的茶永远多泡一杯', wall: PEACOCK_MID },
  bridgeport: { name: '雨巷 · 巡演公寓', subtitle: '楼下的喧闹，楼上的一家人', wall: TIMBER },
  westport: { name: '潮汐 · 剧团驻地', subtitle: '灯亮着，就有人等你回家', wall: PEACOCK },
};
const LODGING_NAMES: Record<string, string> = {
  'mb-loft': '霍尔特太太的茶室楼上', 'mb-weavers': '织工合作社排练楼', 'mb-spindle': '纺锤剧院驻演楼',
  'gw-workshop': '里德工坊阁楼', 'gw-theatre': '抒情剧院后台',
  attic: '醉鹅楼上的阁楼', boarding: '霍普太太的寄宿房', suite: '剧院楼上的套间',
  'wp-friend': '旧灯塔看守屋', 'wp-netloft': '盐风晒网阁', 'wp-warehouse': '六码头排练仓', 'wp-radio-suite': '广播塔驻演公寓',
};

function CompanyDesk({ floor }: { floor: number }) {
  return <g><rect x="234" y={floor - 74} width="146" height="12" fill={TIMBER_LIGHT} />
    <path d={`M245 ${floor}v-62m124 62v-62`} stroke={TIMBER_LIGHT} strokeWidth="8" />
    <path d={`M260 ${floor - 75}v-31h40v31Z`} fill={BONE} /><path d={`M270 ${floor - 99}h20m-20 8h15`} stroke={TIMBER} strokeWidth="2" />
    <circle cx="340" cy={floor - 85} r="10" fill={BRASS} />
  </g>;
}
function TeaTable({ x, floor }: { x: number; floor: number }) {
  return <g><path d={`M${x - 48} ${floor}v-64h96v64`} fill="none" stroke={TIMBER_LIGHT} strokeWidth="7" />
    <rect x={x - 61} y={floor - 73} width="122" height="12" fill={TIMBER_LIGHT} />
    <path d={`M${x - 10} ${floor - 75}v-25q10-15 20 0v25Z`} fill={BONE} />
    <path d={`M${x + 10} ${floor - 96}q20-10 10 10l-10 5`} fill="none" stroke={BONE} strokeWidth="4" />
    {[-38, 38].map((d) => <rect key={d} x={x + d - 7} y={floor - 85} width="14" height="11" rx="2" fill={BONE} />)}
    <path className="st-home-steam" d={`M${x} ${floor - 113}q-7-9 0-17q7-8 0-15`} stroke={LIMELIGHT} strokeWidth="2" fill="none" opacity=".35" />
  </g>;
}
function Bed({ x, floor, color = LACQUER_DARK }: { x: number; floor: number; color?: string }) {
  return <g><path d={`M${x} ${floor}v-96m160 96v-75`} stroke={BRASS_DARK} strokeWidth="7" />
    <rect x={x} y={floor - 73} width="160" height="50" fill={color} /><rect x={x + 7} y={floor - 85} width="44" height="25" rx="9" fill={BONE} />
    <path d={`M${x + 62} ${floor - 69}v44m15-44v44m15-44v44`} stroke={BRASS} strokeOpacity=".3" strokeWidth="3" />
  </g>;
}
function HomeSet(city: HomeCity, lodgingId?: string): ScenePart[] {
  const F = 638, W = 1440, home = HOMES[city];
  const deluxe = ['gw-theatre', 'suite', 'wp-radio-suite', 'mb-spindle'].includes(lodgingId ?? '');
  const rehearsal = deluxe || ['boarding', 'wp-warehouse', 'mb-weavers'].includes(lodgingId ?? '');
  return [{ depth: 1, node: <PortRoom width={W} floor={F} wall={home.wall}>
    <PortSign x={390} y={93} w={660} title={LODGING_NAMES[lodgingId ?? ''] ?? home.name} subtitle={home.subtitle} />
    {city === 'graywick' && <>
      <path d="M220 80L710 15L1260 80M310 68v292m800-292v292" stroke={TIMBER_LIGHT} strokeWidth="16" fill="none" />
      <Pane x={1030} y={204} w={175} h={218} frame={TIMBER_LIGHT} curtain={LACQUER_DARK} />
      <rect x="402" y="241" width="224" height="130" fill={TIMBER} stroke={BRASS_DARK} strokeWidth="6" />
      <TopHat x={445} y={349} /><PlayingCardProp x={535} y={300} rotate={12} />
      <path d="M419 355h55m-49 0v9m42-9v9" stroke={BRASS_DARK} strokeWidth="4" fill="none" /><circle cx="535" cy="288" r="3" fill={BRASS} />
      <path d="M480 260h118m-118 22h94m-94 20h100" stroke={SALT} strokeWidth="3" />
      <rect x="1080" y="505" width="191" height="133" fill={TIMBER} stroke={TIMBER_LIGHT} strokeWidth="5" /><text x="1174" y="569" textAnchor="middle" fontSize="20" fill={BRASS}>REED & CO.</text>
    </>}
    {city === 'bridgeport' && <>
      <Pane x={432} y={205} w={228} h={207} frame={SALT} lit={false} glass={HARBOR} curtain={LACQUER_DARK} />
      <path className="st-home-rain" d="M450 218l-10 34m60-12-10 38m95-66-10 38m42 13-10 36m-150 37-10 34m92-20-10 35" stroke={SALT} strokeWidth="2" opacity=".5" />
      <rect x="778" y="230" width="404" height="100" fill={INK} stroke={TIMBER_LIGHT} strokeWidth="6" />
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={792 + i * 27} y={244 + i % 3 * 7} width="18" height={74 - i % 3 * 7} rx="2" fill={[VERDIGRIS, BONE, LACQUER_DARK, BRASS_DARK][i % 4]} />)}
      <rect x="793" y="431" width="234" height="207" fill={TIMBER_LIGHT} /><rect x="819" y="475" width="181" height="163" fill={INK} />
      <Glow x={910} y={600} r={150} tone="warm" strength={.35} /><path d="M850 630Q827 583 872 550Q860 593 900 605Q930 544 961 568Q936 601 972 630Z" fill={BRASS} className="st-home-fire" />
    </>}
    {city === 'millbrook' && <><Pane x={450} y={205} w={240} h={208} frame={TIMBER_LIGHT} glass={MIST} curtain={LACQUER_DARK} /><rect x='900' y='237' width='304' height='117' fill={BONE} stroke={TIMBER_LIGHT} strokeWidth='8'/>{['伊莱','伙伴','下一位'].map((text,i)=><text key={text} x={950+i*90} y='302' fill={TIMBER} fontSize='15'>{text}</text>)}<path d='M435 440h276m-255 0v45m-25-10h255' stroke={BRASS_DARK} strokeWidth='9'/><path d='M451 442v35m20-35v35m20-35v35m20-35v35m20-35v35m20-35v35m20-35v35' stroke={BONE} strokeWidth='2'/></>}
    {city === 'westport' && <>
      <Pane x={426} y={207} w={420} h={227} frame={SALT} glass={HARBOR} lit={false} />
      <path d="M430 354h410m-392 29h103m158 18h101" stroke={MIST} strokeWidth="4" />
      <path d="M511 354v-115l100 104h-185Z" fill={BONE} opacity=".24" />
      <circle cx="1044" cy="280" r="66" fill="none" stroke={BRASS_DARK} strokeWidth="15" />
      <path d="M978 280h132m-66-66v132m-45-111 90 90m-90 0 90-90" stroke={BRASS_DARK} strokeWidth="5" />
      <path d="M900 188q170 80 350 0M900 215q170 80 350 0M900 242q170 80 350 0" stroke={SALT} strokeOpacity=".25" strokeWidth="2" fill="none" />
      <rect x="1160" y="519" width="155" height="119" fill={TIMBER} stroke={TIMBER_LIGHT} strokeWidth="5" /><path d="M1170 530l135 96m-135 0 135-96" stroke={TIMBER_LIGHT} strokeWidth="5" />
    </>}
    <CompanyDesk floor={F} /><TeaTable x={768} floor={F} /><Bed x={438} floor={F} color={city === 'westport' ? VERDIGRIS : LACQUER_DARK} />
    {rehearsal && <g><rect x="1072" y="396" width="198" height="14" fill={BRASS_DARK} /><rect x="1100" y="410" width="139" height="86" fill={PEACOCK_MID} stroke={BRASS} strokeWidth="3" />
      <text x="1169" y="443" textAnchor="middle" fill={BONE} fontSize="14">今日排练</text><path d="M1120 460h100m-100 17h78" stroke={SALT} strokeWidth="2" /></g>}
    {deluxe && <><Curtain x={375} y={182} w={51} h={257} /><Curtain x={848} y={182} w={51} h={257} flip /><Bulbs x1={400} x2={1060} y={82} gap={33} /></>}
    <Beam x={750} y={86} length={F - 86} spread={300} tone="warm" strength={.14} />
  </PortRoom> }];
}
export const GraywickHomeSet = (lodgingId?: string) => HomeSet('graywick', lodgingId);
export const BridgeportHomeSet = (lodgingId?: string) => HomeSet('bridgeport', lodgingId);
export const MillbrookHomeSet = (lodgingId?: string) => HomeSet('millbrook', lodgingId);
export const WestportHomeSet = (lodgingId?: string) => HomeSet('westport', lodgingId);

export function BusInteriorSet(): ScenePart[] {
  const F = 604, W = 1280;
  return [{ depth: 1, node: <>
    <rect width={W} height={F} fill={PEACOCK} /><path d="M0 100Q640-24 1280 100V142H0Z" fill={SALT} />
    <path d="M0 175H1280" stroke={BRASS_DARK} strokeWidth="15" />
    {[340, 575, 810, 1045].map((x) => <g key={x}>
      <Pane x={x} y={197} w={185} h={153} frame={SALT} glass={HARBOR} lit={false} />
      <path d={`M${x + 8} 297h169m-165 19h110`} stroke={MIST} strokeWidth="3" /><Curtain x={x - 18} y={190} w={24} h={174} color={LACQUER_DARK} shade={INK} />
      <rect x={x - 8} y="436" width="131" height="143" rx="14" fill={LACQUER_DARK} /><rect x={x - 13} y="564" width="155" height="22" rx="8" fill={TIMBER_LIGHT} />
      <path d={`M${x + 2} 454v102m40-102v102m40-102v102`} stroke={BRASS_DARK} strokeWidth="2" opacity=".5" />
      <path d={`M${x} 586v18m130-18v18`} stroke={INK} strokeWidth="8" />
    </g>)}
    <path d="M296 114H1240" stroke={INK} strokeWidth="7" />
    {[410, 650, 900, 1160].map((x) => <path key={x} d={`M${x} 114v26q-20 34 0 34q20 0 0-34`} stroke={BRASS} strokeWidth="4" fill="none" />)}
    <PortDoor x={130} floor={F} /><PortSign x={440} y={51} w={526} title="GRAND TOUR · 巡演巴士" subtitle="车票之外，欢迎携带梦想与一只小箱子" />
    <CompanyDesk floor={F} /><TopHat x={260} y={517} s={.65} />
    <rect x="1070" y="383" width="90" height="38" rx="5" fill={TIMBER_LIGHT} stroke={BRASS} strokeWidth="2" /><path d="M1100 383v38m27-38v38" stroke={BRASS} strokeWidth="4" />
    <path d="M1025 425h185m-175 0v-22m162 22v-22" fill="none" stroke={BRASS_DARK} strokeWidth="7" />
    <Glow x={670} y={170} r={400} tone="warm" strength={.15} /><PortFloor width={W} floor={F} />
  </> }];
}

/** Every lease is anchored to a separate facade and door, sharing the same world coordinates as its hotspot. */
export function LodgingAnnex({ city }: { city: HomeCity }) {
  const act = city === 'graywick' ? 1 : city === 'bridgeport' ? 2 : city === 'westport' ? 3 : 4;
  const from = city === 'graywick' ? 1944 : 2560, F = 875;
  const entries = LODGING_ENTRANCES[act];
  const width = entries.at(-1)!.x + 180 - from;
  return <g>
    <rect x={from} y="0" width={width} height={F} fill={INK} />
    {entries.map((entry, index) => {
      const x = entry.x, w = 352, roof = 340 - index % 3 * 40;
      const wall = [PEACOCK_MID, TIMBER, HARBOR, PEACOCK][index % 4];
      const lighthouse = entry.lodgingId === 'wp-friend';
      return <g key={entry.id}>
        {lighthouse && <g><path d={`M${x - 43} ${roof}l12-148h62l12 148Z`} fill={SALT} /><rect x={x - 42} y={roof - 175} width="84" height="38" fill={BRASS} stroke={INK} strokeWidth="8" /><path d={`M${x - 56} ${roof - 179}l56-39 56 39Z`} fill={LACQUER_DARK} /></g>}
        <rect x={x - w / 2} y={roof} width={w} height={F - roof} fill={wall} />
        <path d={`M${x - w / 2 - 2} ${roof}h${w + 4}v-18h-${w + 4}Z`} fill={SALT} />
        <Pane x={x - 116} y={roof + 40} w={72} h={130} frame={SALT} curtain={LACQUER_DARK} />
        <Pane x={x + 44} y={roof + 40} w={72} h={130} frame={SALT} curtain={LACQUER_DARK} />
        <PortSign x={x - 150} y={570} w={300} title={entry.label} subtitle={index === 0 && act === 3 ? '阿尔弗雷德 · 来客请叩门' : '剧团根据地 · 管家接待'} />
        <PortDoor x={x} floor={F} color={index % 2 ? PEACOCK : LACQUER_DARK} />
        <Glow x={x} y={755} r={140} tone="warm" strength={.18} />
      </g>;
    })}
    <rect x={from} y={F} width={width} height="28" fill={SALT} /><rect x={from} y={F + 28} width={width} height="180" fill={INK} />
    {Array.from({ length: Math.ceil(width / 54) }, (_, i) => <path key={i} d={`M${from + i * 54} ${F}v28`} stroke={INK} strokeOpacity=".25" />)}
  </g>;
}
