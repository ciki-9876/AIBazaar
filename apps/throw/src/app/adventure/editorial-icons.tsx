import type { SVGProps } from 'react';

export type EditorialIconName =
  | 'map'
  | 'cards'
  | 'bag'
  | 'ticket'
  | 'wand'
  | 'sound'
  | 'chapter'
  | 'close'
  | 'play'
  | 'return';

/** Original single-ink pictograms for the magician's printed programme. */
export function EditorialIcon({
  name,
  className = '',
  ...props
}: SVGProps<SVGSVGElement> & { name: EditorialIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`rg-editorial-icon ${className}`}
      {...props}
    >
      {name === 'map' && (
        <>
          <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z" />
          <path d="M9 3v16M15 5v16m-9-9 3-2 3 3 6-5" />
          <circle cx="18" cy="8" r="1" />
        </>
      )}
      {name === 'cards' && (
        <>
          <rect x="8" y="4" width="12" height="17" rx="1.7" />
          <path d="m8 4-3-1-3 15 6 1m6-11-3 4 3 4 3-4Z" />
          <path d="M10.5 6.5h1m5 12h1" />
        </>
      )}
      {name === 'bag' && (
        <>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 12h18M8 10v5m8-5v5" />
        </>
      )}
      {name === 'ticket' && (
        <>
          <path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4Z" />
          <path d="M16 6v2m0 3v2m0 3v2m-8-9-2 3 2 3 2-3Z" />
        </>
      )}
      {name === 'wand' && (
        <>
          <path d="m4 19 11-11 3 3L7 22Zm9-9 3 3M6 3v4M4 5h4m12-2v4m-2-2h4M3 12v3m-1-1.5h3" />
          <path d="m15 8 2-2 3 3-2 2" />
        </>
      )}
      {name === 'sound' && (
        <>
          <path d="M3 9h4l5-4v14l-5-4H3Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </>
      )}
      {name === 'chapter' && (
        <>
          <path d="M4 3h14a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2Zm0 14h16M8 7h8m-8 4h6" />
          <path d="M7 17v4" />
        </>
      )}
      {name === 'close' && <path d="m6 6 12 12M18 6 6 18" />}
      {name === 'play' && <path d="m8 4 12 8-12 8Z" fill="currentColor" />}
      {name === 'return' && <path d="m9 5-6 6 6 6m-6-6h11a6 6 0 0 1 6 6v3" />}
    </svg>
  );
}
