import { hash, rng } from './design-model.ts';
import { FIELD_NODES } from './field-items.ts';
export function floorRoute(seed: number, floor: number, introductory = false) {
  if (floor === 1 && introductory)
    return ['search', 'patrol', 'pressure', 'antechamber', 'guardian'];
  // Search before the first workshop gives a normal acquisition route.
  const first =
    floor === 1
      ? 'pressure'
      : floor === 2
        ? 'purify'
        : FIELD_NODES[(floor - 3) % 6];
  const alternatives = FIELD_NODES.filter((x) => x !== first);
  const second =
    alternatives[hash(`${seed}/${floor}/route-v4`) % alternatives.length];
  const r = rng(hash(`${seed}/${floor}/route-v4-order`));
  const extra = ['event', 'puzzle', 'cache', 'bargain', 'hazard']
    .map((value) => ({ value, order: r() }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.value)
    .slice(0, 1 + Math.floor(r() * 3));
  const middle = [second, 'rest', ...extra]
    .map((value) => ({ value, order: r() }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.value);
  return [
    'search',
    first,
    'patrol',
    'merchant',
    ...middle.slice(0, 2),
    'elite',
    ...middle.slice(2),
    'guardian',
  ];
}
const SCENES: Record<string, string[]> = {
  月面金库: [
    '失重保险柜',
    '真空闸门',
    '月尘账本',
    '宇航服贩子',
    '陨石遮蔽处',
    '氧气泄漏区',
    '金库审计员',
  ],
  漂浮皇宫: [
    '悬空贡库',
    '无火宫灯',
    '倒写诏书',
    '面具货郎',
    '御花园浮亭',
    '断裂玉阶',
    '无面禁军',
  ],
  倒置医院: [
    '悬吊药房',
    '回声病房',
    '反向心电仪',
    '轮椅药商',
    '输液休息室',
    '消毒隔离带',
    '夜班院长',
  ],
  鲸腹车站: [
    '潮汐行李架',
    '心跳广播',
    '失踪时刻表',
    '贝壳售货员',
    '避浪候车室',
    '胃酸铁轨',
    '末班检票员',
  ],
  玻璃雨林: [
    '透明树洞',
    '齿轮雨幕',
    '叶脉阵列',
    '蘑菇换物摊',
    '干燥树冠',
    '碎玻璃河',
    '根系看守',
  ],
  记忆银行: [
    '梦境保险柜',
    '遗忘柜台',
    '利息账目',
    '回忆掮客',
    '空白等候区',
    '记忆抽税站',
    '记忆清算师',
  ],
  深海剧院: [
    '后台道具库',
    '无声独唱',
    '音阶密码锁',
    '潜水服商人',
    '幕布气泡',
    '深海暗流',
    '谢幕指挥家',
  ],
  无昼机房: [
    '停机备件库',
    '拒绝停机的广播',
    '逻辑继电器',
    '维修机器人',
    '冷却风道',
    '过载电缆',
    '永动监工',
  ],
  纸折战场: [
    '纸箱军需站',
    '折纸传令兵',
    '折痕密文',
    '纸甲军需商',
    '纸鹤掩体',
    '燃烧折线',
    '纸铠将军',
  ],
  云端旧街: [
    '逆雨杂货铺',
    '变号门牌',
    '错位地址',
    '云上摊贩',
    '旧屋檐下',
    '风蚀天桥',
    '街区收租人',
  ],
  黑日果园: [
    '星空果筐',
    '迟到的果农',
    '果核时钟',
    '夜行果商',
    '树影长椅',
    '黑日曝晒带',
    '黑日园丁',
  ],
  梦境邮局: [
    '无人领取的包裹',
    '未来来信',
    '投递编号',
    '邮票收藏者',
    '信封休息间',
    '信纸风暴',
    '末日邮差',
  ],
};
export function sceneTitle(theme: string, node: string) {
  if (node === 'antechamber') return '守卫前室';
  if (node === 'patrol') return `${theme} · 外围巡逻者`;
  if (node === 'elite') return `${theme} · 核心看守`;
  if (node === 'cache') return `${theme} · 遗留急救箱`;
  if (node === 'bargain') return `${theme} · 体力交易所`;
  const row = SCENES[theme] ?? SCENES['月面金库'];
  return (
    row[
      [
        'search',
        'event',
        'puzzle',
        'merchant',
        'rest',
        'hazard',
        'guardian',
      ].indexOf(node)
    ] ?? '撤离出口'
  );
}
export function eventSpec(
  seed: number,
  floor: number,
  node: number,
  theme: string,
) {
  const kind = hash(`${seed}/${floor}/${node}/event`) % 3;
  return {
    title: sceneTitle(theme, 'event'),
    kind,
    text: [
      `「${sceneTitle(theme, 'event')}」被黑暗封住。它要求一束真实的火光，否则你只能绕行。`,
      `「${sceneTitle(theme, 'event')}」不断重复你的名字。接通它的电源，或顶着回声穿过。`,
      `「${sceneTitle(theme, 'event')}」正在倒转重力。投币修复装置以稳定通道，或沿墙慢慢爬过去。`,
    ][kind],
    safeCost: [6, 6, 4][kind],
    alt: [
      '消耗打火机，恢复 8 精力',
      '消耗 2 电力，恢复 12 精力',
      '消耗 2 金币，恢复 6 精力',
    ][kind],
  };
}
export function puzzleSpec(seed: number, floor: number, node: number) {
  const n = hash(`${seed}/${floor}/${node}/puzzle-v2`),
    a = (n % 6) + 2,
    b = (n % 3) + 2,
    kind = n % 3;
  const answer = kind === 0 ? a + 3 * b : kind === 1 ? a * 8 : a + b;
  return {
    text:
      kind === 0
        ? '门锁旁的铜牌磨得发亮，最后一格数字却被刮去了。门后传来风穿过走廊的声音。'
        : kind === 1
          ? '门边的信号灯重复着一段未完的节拍。接收器静静亮着，等待下一次回应。'
          : '两只旧砝码压住了门闩，另一端的托盘空着。钢索绷紧，门后似乎就是出口。',
    hint:
      kind === 0
        ? `补全等差铭牌：${a}、${a + b}、${a + 2 * b}、？。`
        : kind === 1
          ? `续上倍增信号：${a}、${a * 2}、${a * 4}、？。`
          : `平衡门闩。砝码重 ${a} 和 ${b}，另一端需要同等总重量。`,
    answer,
    options: [answer, answer + 2, answer - 1].sort((x, y) => x - y),
  };
}
