import { ACTS, BATTLES, CHARACTERS, MAPS, SHOWS } from './magician-world.ts';
import { ITEMS, RELICS } from '../cards/throw-loadout.ts';

/** Authored proper nouns and task terms. Matching never interprets dialogue as HTML. */
export const DIALOGUE_TERMS: readonly string[] = [...new Set([
  ...Object.entries(CHARACTERS).filter(([id]) => id !== 'narrator').map(([, character]) => character.name),
  ...Object.values(MAPS).map((map) => map.name),
  ...Object.values(MAPS).flatMap((map) => map.hotspots.map((spot) => spot.label)),
  ...Object.values(BATTLES).map((battle) => battle.title),
  ...ACTS.map((act) => act.title),
  ...SHOWS.map((show) => show.title),
  ...ITEMS.map((item) => item.name),
  ...RELICS.map((relic) => relic.name),
  '伊莱', '里德先生', '里德', '米娅', '菲利克斯', '朱诺', '霍布斯',
  '艾达', '比阿', '普赖斯姐妹', '斯坦', '多德太太', '多丽丝', '佩蒂格鲁',
  '艾格尼丝', '罗茜', '巴兹尔', '派克警长',
  '旧剧院街', '集市街', '醉鹅', '桥头', '醉鹅地窖', '剧院侧幕',
  '韦斯特港', '奥罗拉', '世界大剧院',
  '第一张参赛证', '参赛证', '邀请函', '第一课', '巡回赛',
  '布里奇波特公开赛', '公开赛小组赛', '世界冠军赛', '街头演出',
  '早场', '决赛', '主厅', '三件旧物',
  '火怕盾', '闷火',
])].filter((term) => term.length > 1).sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));

export type DialogueToken = { text: string; important: boolean };

/** Longest term wins; adjacent ordinary text stays one readable run. */
export function dialogueTokens(text: string, terms: readonly string[] = DIALOGUE_TERMS): DialogueToken[] {
  const dictionary = [...new Set(terms)].filter(Boolean).sort((a, b) => b.length - a.length);
  const tokens: DialogueToken[] = [];
  let plain = '';
  for (let index = 0; index < text.length;) {
    const term = dictionary.find((entry) => text.startsWith(entry, index));
    if (!term) {
      plain += text[index++];
      continue;
    }
    if (plain) tokens.push({ text: plain, important: false });
    plain = '';
    tokens.push({ text: term, important: true });
    index += term.length;
  }
  if (plain) tokens.push({ text: plain, important: false });
  return tokens;
}
