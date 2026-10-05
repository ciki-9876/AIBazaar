import type { HeartDemonKind } from '../../../lib/cards/healing-catalog';

export function HealerArt({ teacher = false }: { teacher?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 80"
      className="wh-healer-art"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path
        fill="#35483f"
        d="M22 4h22v4h8v8h4v20h-8v8h4v12h4v16H8V56h4V44h8v-8h-8V16h4V8h6z"
      />
      <path
        fill={teacher ? '#c6c5ad' : '#785947'}
        d="M22 8h22v4h8v16H16V16h6zM12 28h8v8h-8zM44 28h8v8h-8z"
      />
      <path fill="#ebcba0" d="M24 20h20v4h4v16h-8v4H28v-4h-8V24h4z" />
      <path fill="#3b473d" d="M26 28h4v4h-4zM38 28h4v4h-4z" />
      <path fill="#bc7d73" d="M22 34h6v4h-6zM40 34h6v4h-6zM30 38h8v2h-8z" />
      <path
        fill={teacher ? '#b8ad8d' : '#9aba97'}
        d="M20 44h26v4h4v20H12V56h4V48h4z"
      />
      <path fill="#ece1b4" d="M26 44h12v8H26zM14 66h36v4H14z" />
      <path fill="#4e6452" d="M22 72h10v8H20v-4h2zM36 72h10v4h2v4H36z" />
      <path fill="#856a44" d="M32 51h20v5h4v12H30V56h2z" />
      <path fill="#edce80" d="M34 55h14v9H34z" />
      <path fill="#67543d" d="M40 56h4v6h-4z" />
      <path fill="#ecbf8b" d="M12 53h8v8h-8zM46 56h8v6h-8z" />
      {teacher && <path fill="#ede2c5" d="M28 37h12v8H28zM24 42h20v4H24z" />}
    </svg>
  );
}

export function DemonArt({
  kind,
  color,
}: {
  kind: HeartDemonKind;
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={`wh-demon-art wh-art-${kind}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path fill="#283c35" opacity=".35" d="M20 84h56v4H20zM12 80h72v4H12z" />
      {kind === 'whisper' && (
        <>
          <path
            fill="#374a47"
            d="M24 20h12v-8h24v8h12v12h8v16h-8v28H24V48h-8V32h8zM24 76h12v8H24zM60 76h12v8H60z"
          />
          <path
            fill={color}
            d="M28 24h12v-8h16v8h12v12h8v8h-8v28H28V44h-8v-8h8z"
          />
          <path fill="#bac9d4" d="M32 28h8V20h12v8H40v8h-8z" />
          <path
            fill="#374a47"
            d="M32 40h8v12h-8zM56 40h8v12h-8zM40 64h16v4H40z"
          />
          <path fill="#e8d6c7" d="M30 54h12v4H30zM54 54h12v4H54z" />
          <path fill="#61727d" d="M12 18h8v8h-8zM78 16h8v8h-8zM8 54h8v8H8z" />
        </>
      )}
      {kind === 'thorn' && (
        <>
          <path
            fill="#35453c"
            d="M44 8h8v16h12V12h8v24h12v8H72v12h16v8H72v16H24V64H8v-8h16V44H12v-8h12V16h8v16h12z"
          />
          <path
            fill={color}
            d="M36 32h24v8h8v32H28V44h8zM20 24h8v12h-8zM72 28h8v12h-8zM44 16h8v16h-8z"
          />
          <path fill="#cbd4ab" d="M32 42h8v26h-8z" />
          <path
            fill="#35453c"
            d="M36 44h8v8h-8zM52 44h8v8h-8zM42 60h12v4H42z"
          />
          <path fill="#b5c694" d="M28 76h16v8H28zM52 76h16v8H52z" />
        </>
      )}
      {kind === 'burden' && (
        <>
          <path
            fill="#4b493e"
            d="M24 8h40v8h12v32h8v24h-8v8H20v-8h-8V44h8V16h4z"
          />
          <path fill={color} d="M28 12h32v8h12v28H24V20h4z" />
          <path
            fill="#927d64"
            d="M28 24h40v4H28zM28 36h40v4H28zM36 12h4v36h-4z"
          />
          <path fill="#d4c3a0" d="M24 48h48v8h8v12h-8v8H24v-8h-8V56h8z" />
          <path
            fill="#4b493e"
            d="M30 56h8v8h-8zM56 56h8v8h-8zM40 68h16v4H40z"
          />
          <path fill="#4b493e" d="M22 78h16v6H22zM58 78h16v6H58z" />
        </>
      )}
      {kind === 'echo' && (
        <>
          <path
            fill="#4c454b"
            d="M32 12h32v8h12v16h8v24h-8v20H20V60h-8V36h8V20h12z"
          />
          <path
            fill={color}
            d="M36 16h24v8h12v16h8v16h-8v20H24V56h-8V40h8V24h12z"
          />
          <path fill="#dfbcc4" d="M32 28h8v36h-8zM40 20h16v8H40z" />
          <path
            fill="#4c454b"
            d="M36 38h8v8h-8zM56 38h8v8h-8zM42 54h18v4H42z"
          />
          <path fill="#6d6168" d="M40 64h24v8H40z" />
          <path
            fill="#f0ddb1"
            d="M54 58h4v10h-8v-4h4zM30 80h8v4h-8zM60 80h8v4h-8z"
          />
        </>
      )}
      {kind === 'clock' && (
        <>
          <path
            fill="#5c513e"
            d="M24 12h16V8h16v4h16v8h8v48h-8v12H24V68h-8V20h8z"
          />
          <path fill={color} d="M28 16h40v8h8v40h-8v12H28V64h-8V24h8z" />
          <path fill="#f1deb0" d="M32 24h32v8h8v24h-8v8H32v-8h-8V32h8z" />
          <path
            fill="#67543d"
            d="M46 28h4v16h12v4H46zM30 44h4v4h-4zM64 44h4v4h-4zM46 56h4v4h-4z"
          />
          <path fill="#665d45" d="M28 76h12v8H28zM56 76h12v8H56z" />
          <path fill="#e3a28c" d="M32 52h8v4h-8zM56 52h8v4h-8z" />
        </>
      )}
      {kind === 'night' && (
        <>
          <path
            fill="#333d49"
            d="M24 8h12v8h24V8h12v20h8v8h8v40H76v8H20v-8H8V36h8v-8h8z"
          />
          <path
            fill={color}
            d="M28 16h8v8h24v-8h8v16h8v8h8v32H72v8H24v-8H12V40h8v-8h8z"
          />
          <path fill="#b6b9cc" d="M28 32h8v36h-8zM36 28h20v8H36z" />
          <path
            fill="#333d49"
            d="M32 42h12v12H32zM56 42h12v12H56zM40 64h20v4H40z"
          />
          <path fill="#e5d6a3" d="M36 46h4v4h-4zM60 46h4v4h-4z" />
          <path fill="#647282" d="M8 12h8v8H8zM80 16h8v8h-8zM4 52h8v8H4z" />
        </>
      )}
    </svg>
  );
}
