import { useId, type CSSProperties } from 'react';
import type {
  RhythmDefinition,
  RhythmKind,
  RhythmStat,
} from '../lib/cards/rhythm-catalog';
import type { HeartDemonKind } from '../lib/cards/healing-catalog';
import { sitePath } from '../lib/site-path';

export type ArtDirection = 'summer' | 'storybook';
export const presentationAsset = (file: string) =>
  sitePath(`/art-assets/wandeng/presentation-v1/${file}.png`);
const items: Record<RhythmKind, number> = {
  furnace: 0,
  tea: 1,
  match: 2,
  needle: 3,
  mirror: 4,
  bell: 5,
  projector: 6,
  lamp: 7,
  herb: 8,
  music: 9,
  umbrella: 10,
};
const demons: Record<HeartDemonKind, number> = {
  whisper: 12,
  thorn: 13,
  burden: 14,
  echo: 15,
  clock: 16,
  night: 17,
};
export function AtlasArt({
  direction,
  index,
  hero = false,
  className = '',
}: {
  direction: ArtDirection;
  index: number;
  hero?: boolean;
  className?: string;
}) {
  const columns = hero ? 4 : 6,
    rows = hero ? 2 : 3;
  const cell = 1774 / columns;
  const clip = useId();
  const x = (index % columns) * cell,
    y = Math.floor(index / columns) * cell;
  return (
    <svg
      className={`pa-sprite ${className}`}
      viewBox={`${(index % columns) * cell} ${Math.floor(index / columns) * cell} ${cell} ${cell}`}
      aria-hidden="true"
      style={
        {
          imageRendering: direction === 'summer' ? 'pixelated' : 'auto',
        } as CSSProperties
      }
    >
      <defs>
        <clipPath id={clip}>
          <rect x={x} y={y} width={cell} height={cell} />
        </clipPath>
      </defs>
      <image
        clipPath={`url(#${clip})`}
        href={presentationAsset(
          hero ? 'summer-hero' : `${direction}-battle-atlas`,
        )}
        width="1774"
        height={cell * rows}
      />
    </svg>
  );
}
export function PresentationCardArt({
  def,
  direction,
}: {
  def: RhythmDefinition;
  direction: ArtDirection;
}) {
  return (
    <div className="wr-picture pa-card-art">
      <AtlasArt direction={direction} index={items[def.kind]} />
    </div>
  );
}
export function PresentationDemonArt({
  kind,
  direction,
}: {
  kind: HeartDemonKind;
  direction: ArtDirection;
}) {
  return (
    <AtlasArt
      direction={direction}
      index={demons[kind]}
      className="pa-demon-art"
    />
  );
}
export function PresentationHealerArt({
  direction,
  teacher = false,
}: {
  direction: ArtDirection;
  teacher?: boolean;
}) {
  const clip = useId();
  if (teacher)
    return (
      <AtlasArt direction={direction} index={11} className="pa-healer-art" />
    );
  if (direction === 'summer')
    return (
      <AtlasArt
        direction={direction}
        hero
        index={4}
        className="pa-healer-art"
      />
    );
  return (
    <svg
      className="pa-healer-art pa-portrait-crop"
      viewBox="240 0 530 600"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clip}>
          <rect x="240" y="0" width="530" height="600" />
        </clipPath>
      </defs>
      <image
        clipPath={`url(#${clip})`}
        href={presentationAsset('storybook-hero-v2')}
        width="1024"
        height="1536"
      />
    </svg>
  );
}

export function PresentationEffectIcon({
  kind,
  direction,
}: {
  kind: RhythmStat;
  direction: ArtDirection;
}) {
  const paths: Record<RhythmStat, string> = {
    damage: 'M5 20l4-4m-2-4l5 5m-2-4L20 3l1 5-8 8M4 21l-1-1 3-3 2 2z',
    burn: 'M12 2c2 6 7 7 7 13a7 7 0 01-14 0c0-3 2-5 4-7 0 4 2 4 3 5 2-4 2-7 0-11z',
    poison: 'M4 10a8 8 0 1116 0v4l-4 3v4H8v-4l-4-3zM8 9v3m8-3v3m-5 6v3m3-3v3',
    heal: 'M12 20S2 14 2 8a5 5 0 0110-1 5 5 0 0110 1c0 6-10 12-10 12z',
    guard: 'M12 2l9 4v7c0 5-9 9-9 9s-9-4-9-9V6zM8 12l3 3 6-7',
    boost: 'M12 2l3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="pa-effect-icon"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={direction === 'summer' ? 3 : 1.8}
      strokeLinecap={direction === 'summer' ? 'square' : 'round'}
      strokeLinejoin={direction === 'summer' ? 'miter' : 'round'}
      shapeRendering={
        direction === 'summer' ? 'crispEdges' : 'geometricPrecision'
      }
    >
      <path d={paths[kind]} />
    </svg>
  );
}
export function PresentationNumbers({
  def,
  direction,
}: {
  def: RhythmDefinition;
  direction: ArtDirection;
}) {
  const colors: Record<RhythmStat, string> = {
    damage: '#eef4f2',
    burn: '#ffbd70',
    poison: '#86cea4',
    heal: '#c7ed96',
    guard: '#f3d780',
    boost: '#f3d780',
  };
  const meanings: Record<RhythmStat, string> = {
    damage: '直伤',
    burn: '灼烧',
    poison: '毒',
    heal: '治疗',
    guard: '减伤百分比',
    boost: '强化',
  };
  return (
    <div className="wr-numbers pa-numbers">
      {Object.entries(def.stats).map(([kind, value]) => (
        <b
          key={kind}
          className="wr-number pa-number"
          style={{ color: colors[kind as RhythmStat] }}
          aria-label={`${meanings[kind as RhythmStat]} ${value}`}
          title={`${meanings[kind as RhythmStat]} ${value}`}
        >
          <PresentationEffectIcon
            kind={kind as RhythmStat}
            direction={direction}
          />
          <span>{value}</span>
        </b>
      ))}
    </div>
  );
}
