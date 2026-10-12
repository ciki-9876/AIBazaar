import {
  BONE,
  BRASS,
  BRASS_DARK,
  INK,
  LACQUER_DARK,
  LIMELIGHT,
  MIST,
  PEACOCK,
  SALT,
  TIMBER,
  TIMBER_LIGHT,
} from './palette';
import {
  Beam,
  Bulbs,
  Curtain,
  Glow,
  Pane,
  StreetLamp,
  TopHat,
} from './scene-kit';
import { PortDoor, PortFloor, PortRoom, PortSign } from './sets-westport';
import type { ScenePart } from './sets';
const BRICK = '#70483c',
  CLAY = '#98735a',
  LEAF = '#bb863e';
function Clock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="34" fill={BONE} stroke={BRASS_DARK} strokeWidth="5" />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          transform={`rotate(${i * 30})`}
          d="M0-26v4"
          stroke={INK}
          strokeWidth="2"
        />
      ))}
      <path
        className="st-mill-minute"
        d="M0 7V-24"
        stroke={INK}
        strokeWidth="3"
      />
      <path
        className="st-mill-hour"
        d="M-5 0H17"
        stroke={INK}
        strokeWidth="4"
      />
      <circle r="4" fill={BRASS} />
    </g>
  );
}
function Facade({
  x,
  w,
  roof,
  title,
  brick = BRICK,
}: {
  x: number;
  w: number;
  roof: number;
  title: string;
  brick?: string;
}) {
  const f = 875;
  return (
    <g>
      <rect x={x - w / 2} y={roof} width={w} height={f - roof} fill={brick} />
      <path
        d={`M${x - w / 2 - 8} ${roof}h${w + 16}v-20H${x - w / 2 - 8}Z`}
        fill={SALT}
      />
      {Array.from({ length: Math.floor((f - roof) / 26) }, (_, i) => (
        <path
          key={i}
          d={`M${x - w / 2} ${roof + 26 * i}h${w}m-${w - 20 - (i % 2) * 30} 0v26`}
          stroke={INK}
          strokeOpacity=".18"
          strokeWidth="2"
        />
      ))}
      {[-95, 55].map((d) => (
        <Pane
          key={d}
          x={x + d}
          y={roof + 48}
          w={55}
          h={110}
          frame={SALT}
          curtain={LACQUER_DARK}
        />
      ))}
      <PortSign x={x - w / 2 + 16} y={f - 275} w={w - 32} title={title} />
      <PortDoor x={x} floor={f} color={PEACOCK} />
    </g>
  );
}
function AutumnSky({ width = 4000 }: { width?: number }) {
  return (
    <g>
      <rect width={width} height="875" fill="#293e40" />
      <circle cx="1230" cy="282" r="65" fill={LIMELIGHT} opacity=".48" />
      {Array.from({ length: 18 }, (_, i) => (
        <g key={i} opacity={0.25 + (i % 4) * 0.07}>
          <rect
            x={i * 245}
            y={390 + (i % 5) * 48}
            width={150 + (i % 3) * 30}
            height="485"
            fill={i % 2 ? MIST : CLAY}
          />
          <path
            d={`M${i * 245 - 6} ${390 + (i % 5) * 48}l83-55 90 55Z`}
            fill={INK}
          />
          {i % 3 === 0 && (
            <rect
              x={i * 245 + 95}
              y={245 + (i % 4) * 24}
              width="23"
              height="300"
              fill={TIMBER}
            />
          )}
        </g>
      ))}
      <path
        className="st-mill-birds"
        d="M340 290q12-17 24 0q12-17 24 0m48 30q10-14 20 0q10-14 20 0"
        stroke={BONE}
        fill="none"
        strokeWidth="2"
      />
    </g>
  );
}
export function MillbrookSet(): ScenePart[] {
  return [
    { depth: 0.12, node: <AutumnSky /> },
    {
      depth: 0.55,
      node: (
        <g opacity=".55">
          {[50, 320, 850, 1250, 1780, 2190, 2550, 3000, 3460].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y={480 + (i % 3) * 35}
                width={190 + (i % 2) * 45}
                height="390"
                fill={i % 2 ? TIMBER : CLAY}
              />
              {[0, 1, 2].map((n) => (
                <rect
                  key={n}
                  x={x + 25 + n * 54}
                  y={530 + (i % 3) * 35}
                  width="25"
                  height="48"
                  fill={LIMELIGHT}
                  opacity=".3"
                />
              ))}
            </g>
          ))}
        </g>
      ),
    },
    {
      depth: 1,
      node: (
        <>
          <g>
            <rect x="38" y="744" width="258" height="124" rx="24" fill={BONE} />
            <rect x="38" y="804" width="258" height="57" fill={PEACOCK} />
            {[59, 114, 169, 224].map((x) => (
              <rect
                key={x}
                x={x}
                y="756"
                width="42"
                height="38"
                rx="3"
                fill={INK}
              />
            ))}
            <text
              x="170"
              y="839"
              fill={BRASS}
              textAnchor="middle"
              fontSize="16"
            >
              GRAND TOUR
            </text>
            {[85, 253].map((x) => (
              <g key={x}>
                <circle cx={x} cy="866" r="25" fill={INK} />
                <circle cx={x} cy="866" r="9" fill={BRASS} />
              </g>
            ))}
          </g>
          <Facade
            x={620}
            w={410}
            roof={333}
            title="SPINDLE · 三人剧团联赛"
            brick={CLAY}
          />
          <path d="M415 333l205-96 205 96Z" fill={PEACOCK} />
          <Clock x={620} y={343} />
          <Bulbs x1={452} x2={788} y={573} gap={24} />
          <Facade x={1080} w={342} roof={406} title="SHUTTLE & TEA" />
          <path d="M908 642h344l-20 16H928Z" fill={LACQUER_DARK} />
          <Facade
            x={1550}
            w={382}
            roof={287}
            title="MILL No. 4 · 老纺织厂"
            brick={TIMBER}
          />
          <rect x="1655" y="165" width="38" height="180" fill={BRICK} />
          <path d="M1650 165h48" stroke={SALT} strokeWidth="8" />
          <g className="st-mill-smoke" fill={SALT} opacity=".2">
            <circle cx="1674" cy="135" r="22" />
            <circle cx="1681" cy="104" r="30" />
            <circle cx="1700" cy="68" r="32" />
          </g>
          <Facade
            x={2000}
            w={340}
            roof={433}
            title="PRECISION · 纺锤精工"
            brick={PEACOCK}
          />
          <TopHat x={1880} y={756} s={0.6} />
          <g>
            <rect x="2185" y="665" width="353" height="210" fill={TIMBER} />
            <path d="M2170 665l190-135 193 135Z" fill={LACQUER_DARK} />
            <PortDoor x={2360} floor={875} color={TIMBER} />
            <PortSign x={2210} y={568} w={300} title="BRASS & BONFIRE" />
          </g>
          {[360, 878, 1290, 1767, 2144].map((x) => (
            <g key={x}>
              <StreetLamp x={x} floor={873} height={245} />
              <Glow x={x} y={665} r={150} tone="warm" strength={0.18} />
            </g>
          ))}
          <PortFloor width={4000} floor={875} stone />
          {Array.from({ length: 30 }, (_, i) => (
            <path
              key={i}
              className="st-mill-leaf"
              style={{ animationDelay: `${(i % 7) * -1}s` }}
              d={`M${330 + i * 115} ${903 + (i % 4) * 10}q10-18 18-7q-6 14-18 7Z`}
              fill={LEAF}
              opacity=".6"
            />
          ))}
        </>
      ),
    },
  ];
}
export function MillhallSet(): ScenePart[] {
  return [
    {
      depth: 1,
      node: (
        <PortRoom width={1600} floor={638} wall={TIMBER}>
          <PortSign
            x={440}
            y={92}
            w={790}
            title="SPINDLE LEAGUE · 名字并列，轮流登台"
            subtitle="首发 / 第二棒 / 第三棒 · 5 秒中场休息"
          />
          <PortDoor x={130} floor={638} />
          <rect
            x="389"
            y="273"
            width="252"
            height="162"
            fill={BONE}
            stroke={BRASS_DARK}
            strokeWidth="8"
          />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <text x="410" y={312 + i * 43} fill={TIMBER} fontSize="16">
                第 {i + 1} 棒
              </text>
              <path
                d={`M490 ${305 + i * 43}h123`}
                stroke={TIMBER_LIGHT}
                strokeWidth="3"
              />
            </g>
          ))}
          <rect
            x="717"
            y="223"
            width="269"
            height="210"
            fill={PEACOCK}
            stroke={BRASS_DARK}
            strokeWidth="8"
          />
          <text x="852" y="266" textAnchor="middle" fill={BRASS} fontSize="24">
            四十年 · 纺锤剧团
          </text>
          {['伊迪丝', '奥斯瓦尔德', '阿瑟·霍尔特'].map((name, i) => (
            <text
              key={name}
              x="850"
              y={316 + i * 35}
              fill={BONE}
              textAnchor="middle"
              fontSize="17"
            >
              {name}
            </text>
          ))}
          <Curtain x={1035} y={183} w={76} h={298} />
          <Curtain x={1368} y={183} w={76} h={298} flip />
          <rect x="1108" y="183" width="260" height="298" fill={INK} />
          <Clock x={1250} y={320} />
          <Bulbs x1={1050} x2={1430} y={172} gap={26} />
          <Beam
            x={1250}
            y={185}
            length={453}
            spread={230}
            tone="warm"
            strength={0.15}
          />
        </PortRoom>
      ),
    },
  ];
}
export function MillpubSet(): ScenePart[] {
  return [
    {
      depth: 1,
      node: (
        <PortRoom width={1600} floor={638} wall={BRICK}>
          <PortDoor x={130} floor={638} color={LACQUER_DARK} />
          <PortSign
            x={390}
            y={93}
            w={820}
            title="SHUTTLE & TEA · 梭子与茶"
            subtitle="这里的人欠彼此一顿饭，所以没人搬走"
          />
          <Pane
            x={470}
            y={204}
            w={191}
            h={193}
            frame={TIMBER_LIGHT}
            curtain={LACQUER_DARK}
          />
          <rect
            x="350"
            y="252"
            width="104"
            height="132"
            fill={BONE}
            stroke={TIMBER_LIGHT}
            strokeWidth="8"
          />
          <text x="402" y="298" textAnchor="middle" fill={TIMBER} fontSize="15">
            招募
          </text>
          <rect x="880" y="332" width="219" height="306" fill={CLAY} />
          <rect x="914" y="444" width="151" height="194" fill={INK} />
          <Glow x={987} y={603} r={150} tone="warm" strength={0.38} />
          <path
            className="st-home-fire"
            d="M938 637q-28-45 15-88q-6 31 28 52q8-68 45-57q-17 42 17 93Z"
            fill={BRASS}
          />
          {[770, 1250].map((x) => (
            <g key={x}>
              <rect
                x={x - 56}
                y="565"
                width="112"
                height="12"
                fill={TIMBER_LIGHT}
              />
              <path
                d={`M${x - 42} 577v61m84-61v61`}
                stroke={TIMBER_LIGHT}
                strokeWidth="7"
              />
              <path d={`M${x - 10} 545h20v20h-20Z`} fill={BONE} />
            </g>
          ))}
        </PortRoom>
      ),
    },
  ];
}
export function MillSet(): ScenePart[] {
  return [
    {
      depth: 1,
      node: (
        <PortRoom width={1600} floor={638} wall={PEACOCK}>
          <PortDoor x={130} floor={638} />
          <PortSign
            x={440}
            y={92}
            w={760}
            title="BACKSTAGE · 证据留在灯灭以后"
          />
          {[350, 650, 950, 1250].map((x) => (
            <g key={x}>
              <path d={`M${x} 181v242`} stroke={BRASS_DARK} strokeWidth="7" />
              <rect
                x={x - 90}
                y="421"
                width="180"
                height="28"
                fill={TIMBER_LIGHT}
              />
              <rect
                x={x - 80}
                y="449"
                width="160"
                height="126"
                fill={TIMBER}
                stroke={BRASS_DARK}
                strokeWidth="4"
              />
              {[0, 1, 2, 3, 4].map((n) => (
                <path
                  key={n}
                  d={`M${x - 61 + n * 30} 455v114`}
                  stroke={BRASS}
                  strokeOpacity=".5"
                />
              ))}
            </g>
          ))}
          <path
            d="M350 213h112l28 40 27-21h103"
            stroke={SALT}
            strokeWidth="5"
            fill="none"
          />
          <path
            d="M463 219l16 22m17-1 11-8"
            stroke={LACQUER_DARK}
            strokeWidth="4"
          />
          <rect x="716" y="560" width="70" height="22" fill={BONE} />
          <text x="751" y="576" textAnchor="middle" fontSize="12" fill={TIMBER}>
            £5 · 账本
          </text>
          <rect
            x="1050"
            y="582"
            width="115"
            height="56"
            fill={INK}
            stroke={BRASS_DARK}
            strokeWidth="3"
          />
          <Beam
            x={1380}
            y={153}
            length={485}
            spread={210}
            tone="warm"
            strength={0.13}
          />
        </PortRoom>
      ),
    },
  ];
}
export function MillshopSet(): ScenePart[] {
  return [
    {
      depth: 1,
      node: (
        <PortRoom width={1280} floor={638} wall={TIMBER}>
          <PortDoor x={130} floor={638} />
          <PortSign
            x={390}
            y={95}
            w={650}
            title="PRECISION · 同一种物件，更准的手艺"
            subtitle="银级校准 / 金级精制 + 同款材料"
          />
          {[240, 345].map((y) => (
            <g key={y}>
              <rect
                x="333"
                y={y}
                width="398"
                height="115"
                fill={PEACOCK}
                stroke={TIMBER_LIGHT}
                strokeWidth="8"
              />
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <rect
                    x={355 + i * 91}
                    y={y + 29}
                    width="63"
                    height="65"
                    rx="8"
                    fill={TIMBER}
                    stroke={BRASS}
                    strokeWidth="2"
                  />
                  <circle
                    cx={386 + i * 91}
                    cy={y + 56}
                    r="10"
                    fill={i % 2 ? SALT : BRASS}
                  />
                </g>
              ))}
            </g>
          ))}
          <rect x="917" y="560" width="253" height="19" fill={TIMBER_LIGHT} />
          <path d="M934 579v59m219-59v59" stroke={BRASS_DARK} strokeWidth="9" />
          <path d="M975 535l50-32m17 41 19-63" stroke={SALT} strokeWidth="7" />
          <Glow x={1050} y={523} r={135} tone="warm" strength={0.2} />
        </PortRoom>
      ),
    },
  ];
}
export function MillsquareSet(): ScenePart[] {
  return [
    { depth: 0.2, node: <AutumnSky width={1600} /> },
    {
      depth: 1,
      node: (
        <>
          <rect width="1600" height="638" fill={PEACOCK} opacity=".45" />
          <PortDoor x={130} floor={638} />
          <PortSign
            x={410}
            y={120}
            w={835}
            title="BRASS & BONFIRE · 铜管广场"
            subtitle="第三声部 / 篝火之夜 / 午夜钟声"
          />
          <path d="M347 434l233-110 233 110Z" fill={LACQUER_DARK} />
          <rect x="380" y="434" width="400" height="204" fill={TIMBER} />
          {[414, 740].map((x) => (
            <rect
              key={x}
              x={x}
              y="433"
              width="14"
              height="205"
              fill={BRASS_DARK}
            />
          ))}
          <path d="M475 579q37-48 95-26l45-55 35 30-54 66h-80Z" fill={BRASS} />
          <path d="M1050 638l42-102 46 102Z" fill={TIMBER_LIGHT} />
          <Glow x={1090} y={551} r={180} tone="warm" strength={0.4} />
          <path
            className="st-home-fire"
            d="M1034 600q-17-53 21-95q-3 49 32 60q16-80 42-70q-11 67 21 105Z"
            fill={BRASS}
          />
          <rect x="1352" y="427" width="62" height="159" fill={TIMBER_LIGHT} />
          <Clock x={1384} y={417} />
          <Bulbs x1={382} x2={778} y={428} gap={26} />
          <PortFloor width={1600} floor={638} stone />
        </>
      ),
    },
  ];
}
