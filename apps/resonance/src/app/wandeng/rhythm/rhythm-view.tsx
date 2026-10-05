'use client';
import Image from 'next/image';
import { Art } from '../wandeng-cards';
import { EffectNumber } from '../wandeng-symbols';
import { sitePath } from '../../../lib/site-path';
import type {
  RhythmDefinition,
  RhythmStat,
} from '../../../lib/cards/rhythm-catalog';

const statColor: Record<RhythmStat, string> = {
  damage: '#e9eef4',
  burn: '#ffac56',
  poison: '#6cbd8c',
  heal: '#c0ee83',
  boost: '#f8d57b',
  guard: '#f8d57b',
};
const statMeaning: Record<RhythmStat, string> = {
  damage: '直伤',
  burn: '灼烧',
  poison: '毒',
  heal: '治疗',
  boost: '强化',
  guard: '减伤百分比',
};
export function Numbers({ def }: { def: RhythmDefinition }) {
  return (
    <div className="wr-numbers">
      {Object.entries(def.stats).map(([kind, value]) => (
        <b
          className="wr-number"
          key={kind}
          style={{ color: statColor[kind as RhythmStat] }}
          aria-label={`${statMeaning[kind as RhythmStat]} ${value}`}
          title={`${statMeaning[kind as RhythmStat]} ${value}`}
        >
          <EffectNumber
            kind={
              kind === 'poison'
                ? 'corrode'
                : kind === 'boost' || kind === 'guard'
                  ? 'shield'
                  : (kind as 'damage' | 'burn' | 'heal')
            }
          >
            {value}
          </EffectNumber>
        </b>
      ))}
    </div>
  );
}
export function Picture({ def }: { def: RhythmDefinition }) {
  return (
    <div className="wr-picture">
      {def.art.training ? (
        <Image
          src={sitePath(`/art-assets/wandeng/training/${def.art.training}.png`)}
          alt=""
          width={240}
          height={240}
          unoptimized
          draggable={false}
        />
      ) : (
        <Art tile={def.art.tile ?? 0} />
      )}
    </div>
  );
}
