'use client';
import { useState } from 'react';
type Props = {
  arrival?: boolean;
  systemsUnlocked?: boolean;
  floor: number;
  day: number;
  used: boolean;
  level: number;
  onTable: () => void;
  onIdentify: () => void;
  onDoor: () => void;
  onBed: () => void;
  onTerminal: () => void;
};
export default function ElevatorRoom(p: Props) {
  const [observation, setObservation] = useState('');
  const inspect = (text: string, action: () => void) =>
    p.arrival ? setObservation(text) : action();
  return (
    <section
      className={'ed-room' + (p.arrival ? ' ed-room-arrival' : '')}
      aria-label="电梯房间"
    >
      <svg
        className="ed-room-architecture"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="wall" x2="0" y2="1">
            <stop stopColor="#242c29" />
            <stop offset="1" stopColor="#0c1515" />
          </linearGradient>
          <linearGradient id="floor" x2="0" y2="1">
            <stop stopColor="#101a19" />
            <stop offset="1" stopColor="#383b31" />
          </linearGradient>
          <radialGradient id="light">
            <stop stopColor="#ede1b0" stopOpacity=".15" />
            <stop offset="1" stopColor="#dcd4a3" stopOpacity="0" />
          </radialGradient>
          <pattern
            id="lines"
            width="140"
            height="1000"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 0V1000" stroke="#7d8773" strokeOpacity=".12" />
          </pattern>
        </defs>
        <path fill="url(#wall)" d="M0 0H1600V1000H0z" />
        <path
          fill="#141e1d"
          d="M0 0L240 170V730L0 1000zM1600 0L1360 170V730L1600 1000z"
        />
        <path fill="url(#floor)" d="M240 730H1360L1600 1000H0z" />
        <path fill="#121918" d="M0 0H1600L1360 170H240z" />
        <path
          d="M240 170H1360V730H240z"
          fill="url(#lines)"
          stroke="#8c9880"
          strokeOpacity=".15"
        />
        <path
          d="M240 740H1360M0 824L240 670M1600 824L1360 670M400 1000L610 730M1200 1000L990 730M0 940H1600"
          stroke="#788471"
          strokeOpacity=".18"
          fill="none"
        />
        <path d="M620 118H980" stroke="#f8ebbb" strokeWidth="7" />
        <path
          d="M600 132H1000"
          stroke="#9eaa89"
          strokeOpacity=".2"
          strokeWidth="18"
        />
        <ellipse cx="800" cy="340" rx="540" ry="400" fill="url(#light)" />
        <path
          d="M277 400H400M277 410H400M277 420H400M277 430H400"
          stroke="#050b0b"
          strokeWidth="4"
        />
        <text
          x="292"
          y="305"
          fill="#6d7866"
          fontFamily="monospace"
          fontSize="14"
          letterSpacing="5"
        >
          SUBJECT 000
        </text>
        <text
          x="1230"
          y="680"
          fill="#5e6b5b"
          fontFamily="monospace"
          fontSize="12"
          transform="rotate(-90 1230 680)"
        >
          LIFE SUPPORT / KEEP DOOR SEALED
        </text>
      </svg>
      <div className="ed-room-grain" />
      <button
        className="ed-room-object ed-room-identify"
        onClick={() =>
          inspect('金属台面冰凉，一盏小灯静静亮着。', p.onIdentify)
        }
        aria-label={p.arrival ? '观察金属台' : '电梯商店'}
      >
        <i>⌑</i>
        <span className="ed-object-label">
          {p.arrival ? (
            '金属台'
          ) : (
            <>
              电梯商店
              <small>消耗品与收购</small>
            </>
          )}
        </span>
      </button>
      {!p.arrival && (
        <div className="ed-room-whisper">
          <span>
            第 {String(p.day).padStart(2, '0')} 天 · 电梯 Lv.{p.level}
          </span>
          <h1>门还没有打开。</h1>
          <p>
            {p.used
              ? '今天带回的东西，都在这里了。'
              : '门外有九十九个和你一样的人。'}
            <br />
            头顶的灯，仍在替你亮着。
          </p>
        </div>
      )}
      <button
        className="ed-room-object ed-room-door"
        onClick={p.onDoor}
        aria-label={p.arrival ? '看看门外' : '点击电梯门，选择楼层'}
      >
        <span className="ed-door-indicator">
          ↑ {String(p.floor).padStart(2, '0')}
        </span>
        <i className="ed-door-left" />
        <i className="ed-door-right" />
        <span className="ed-object-label">
          {p.arrival ? (
            '看看门外'
          ) : (
            <>
              选择楼层 <small>{p.used ? '明日再出发' : '门外的世界'}</small>
            </>
          )}
        </span>
      </button>
      {(p.arrival || p.systemsUnlocked) && (
        <button
          className="ed-room-object ed-room-terminal"
          onClick={() =>
            inspect('屏幕上只有一颗缓慢闪动的光点。', p.onTerminal)
          }
          aria-label={p.arrival ? '观察屏幕' : '点击墙上终端，打开电梯系统'}
        >
          <span className="ed-terminal-glass">
            {!p.arrival && (
              <>
                <small>SURVIVOR PROTOCOL</small>
                <b>100</b>
                <span>你的信号仍在线</span>
                <i>● SYSTEM READY</i>
              </>
            )}
            {p.arrival && (
              <i className="ed-arrival-signal" aria-hidden="true">
                ●
              </i>
            )}
          </span>
          <span className="ed-room-slot" />
          <span className="ed-object-label">
            {p.arrival ? (
              '屏幕'
            ) : (
              <>
                电梯系统 <small>改造 / 幸存者 / 日志</small>
              </>
            )}
          </span>
        </button>
      )}
      <button
        className="ed-room-object ed-room-bed"
        onClick={() => inspect('床铺还留着余温。', p.onBed)}
        aria-label={p.arrival ? '观察床铺' : '点击床，睡到明天'}
      >
        <svg viewBox="0 0 500 290" aria-hidden="true">
          <path
            d="M32 60L300 40L483 170L185 228z"
            fill="#364039"
            stroke="#6c7666"
          />
          <path
            d="M32 60V110L185 276V228M483 170V221L185 276V228"
            fill="#101917"
            stroke="#556355"
          />
          <path d="M55 58L290 42L340 80L99 106z" fill="#b5b49a" />
          <path d="M108 113L343 88L457 168L192 219z" fill="#697365" />
          <path
            d="M170 108L205 211M210 103L248 201M250 99L288 191"
            stroke="#86917d"
            strokeOpacity=".3"
          />
        </svg>
        <span className="ed-object-label">
          {p.arrival ? (
            '床铺'
          ) : (
            <>
              睡觉 <small>暂时把世界关在门外</small>
            </>
          )}
        </span>
      </button>
      <button
        className="ed-room-object ed-room-table"
        onClick={() =>
          inspect('桌上放着几件旧物，像是有人替你准备好了。', p.onTable)
        }
        aria-label={p.arrival ? '观察桌面' : '点击桌面，整理行装与构筑'}
      >
        <svg viewBox="0 0 500 340" aria-hidden="true">
          <path
            d="M70 70L335 40L469 155L183 205z"
            fill="#716b50"
            stroke="#a99a6c"
          />
          <path d="M70 70V86L183 223L469 170V155L183 205z" fill="#373e32" />
          <path
            d="M85 95V218M188 222V325M450 175V265"
            stroke="#28332d"
            strokeWidth="13"
          />
          <path d="M150 111L205 89L248 125L190 150z" fill="#aaa080" />
          <path d="M226 156L305 121" stroke="#c4c7b1" strokeWidth="8" />
          <path d="M305 121L333 110" stroke="#1b2622" strokeWidth="12" />
          <ellipse cx="326" cy="81" rx="17" ry="19" fill="#855347" />
          <path d="M326 64L330 56" stroke="#839060" strokeWidth="3" />
          <path d="M365 126L382 121L389 140L373 147z" fill="#b29d59" />
          <path d="M143 62V11" stroke="#26352b" strokeWidth="6" />
          <path d="M122 10Q146 -15 169 10L164 27H122z" fill="#d1c590" />
        </svg>
        <span className="ed-object-label">
          {p.arrival ? (
            '桌面'
          ) : (
            <>
              行装与构筑 <small>看看你还有什么</small>
            </>
          )}
        </span>
      </button>
      {p.arrival && (
        <output className="ed-arrival-observation" aria-live="polite">
          {observation}
        </output>
      )}
    </section>
  );
}
