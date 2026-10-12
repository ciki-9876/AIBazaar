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
  '艾格尼丝', '罗茜', '巴兹尔', '派克警长', '诺拉', '西奥', '莫莉', '布兰尼根', '基特', '维尔',
  '旧剧院街', '集市街', '醉鹅', '桥头', '醉鹅地窖', '剧院侧幕',
  '米尔布鲁克', '霍尔特', '伊迪丝', '奥斯瓦尔德', '皮普', '纺锤剧团', '三人剧团联赛', '重新来过', '篝火之夜', '十一月五日', '同款材料', '银级校准', '金级精制',
  '韦斯特港', '奥罗拉', '世界大剧院',
  '第一张参赛证', '参赛证', '邀请函', '第一课', '巡回赛',
  '布里奇波特公开赛', '公开赛小组赛', '世界冠军赛', '街头演出',
  '早场', '决赛', '主厅', '三件旧物',
  '火怕盾', '闷火', '手牌', '单张', '对子', '顺子', '同花', '黑桃', '红心', '梅花', '方块',
  '护盾', '灼烧', '剧毒', '治疗', '直伤', '快抽', '15 秒', '15秒', '冷却', '抽 5 张', '禁手', '三局两胜',
  '巡演箱', '背包', '道具', '遗物', '布阵', '牌匣', '卡牌', '演出费', '招募告示板', '姐妹的赌约',
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
