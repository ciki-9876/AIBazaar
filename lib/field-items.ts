import { hash } from './design-model.ts';

export const FIELD_NODES = [
  'salvage',
  'relay',
  'balance',
  'pressure',
  'chemistry',
  'purify',
] as const;
export type FieldNode = (typeof FIELD_NODES)[number];
export type ObjectEffect =
  | 'salvage'
  | 'gold'
  | 'power'
  | 'vitality'
  | 'route'
  | 'credit'
  | 'barrier'
  | 'rest'
  | 'etch'
  | 'research'
  | 'pump'
  | 'water';
export const OBJECTS: Record<
  string,
  {
    name: string;
    node: FieldNode;
    verb: string;
    effect: ObjectEffect;
    consumed: boolean;
    benefit: string;
    use: string;
  }
> = {
  nailer: {
    name: '破门钉枪',
    node: 'salvage',
    verb: '固定承重缝',
    effect: 'salvage',
    consumed: false,
    benefit: '金币 +2；下场所选路线屏障 +12',
    use: '固定松动的承重结构，安全拆出夹层零件。',
  },
  gapblade: {
    name: '猎隙刃',
    node: 'salvage',
    verb: '沿薄缝切开',
    effect: 'gold',
    consumed: false,
    benefit: '金币 +4',
    use: '沿薄缝取出完好零件；不会留下防御加固。',
  },
  fuse: {
    name: '引信线',
    node: 'relay',
    verb: '接通回收线路',
    effect: 'power',
    consumed: false,
    benefit: '电力 +3（不是鉴定电荷）',
    use: '按信号次序连接断路，将余电送回电梯。',
  },
  catalyst: {
    name: '催化管',
    node: 'relay',
    verb: '同步供能脉冲',
    effect: 'vitality',
    consumed: false,
    benefit: '下场宿主生命上限 +16',
    use: '催化反应输出同步脉冲；储能仅支持下一场战斗。',
  },
  springbow: {
    name: '弹簧绞盘',
    node: 'balance',
    verb: '架设牵引索',
    effect: 'route',
    consumed: false,
    benefit: '接下来3段路程各少耗2精力',
    use: '调平载台并架索；回收前一直保留牵引路线。',
  },
  counterweight: {
    name: '配重锤',
    node: 'balance',
    verb: '记录校准参数',
    effect: 'credit',
    consumed: false,
    benefit: '基地升级抵扣 +2金币（最多积存4）',
    use: '测出机械误差，把校准结果带回电梯，降低下次升级成本。',
  },
  sealant: {
    name: '补漏胶',
    node: 'pressure',
    verb: '封住裂口',
    effect: 'barrier',
    consumed: true,
    benefit: '下场所选路线屏障 +24；消耗本体',
    use: '关闭泄压阀后永久封住裂口。本体用尽，不能再转化。',
  },
  rubber: {
    name: '缓冲垫',
    node: 'pressure',
    verb: '隔离高压接口',
    effect: 'rest',
    consumed: false,
    benefit: '精力 +12',
    use: '按泄压顺序隔离接口，利用安全气室恢复精力。',
  },
  acid: {
    name: '蚀液喷壶',
    node: 'chemistry',
    verb: '溶出金属镀层',
    effect: 'etch',
    consumed: true,
    benefit: '金币 +6；消耗本体',
    use: '配出除垢比例，回收高价值镀层；试剂用尽，不能再转化。',
  },
  culture: {
    name: '培养皿',
    node: 'chemistry',
    verb: '保存适应性菌种',
    effect: 'research',
    consumed: false,
    benefit: '永久宿主生命上限 +2（本局累计最多+10）',
    use: '控制培养比例以保存菌种。每层实验仅能记录一次。',
  },
  recoil: {
    name: '回压泵',
    node: 'purify',
    verb: '回收蒸汽压力',
    effect: 'pump',
    consumed: false,
    benefit: '电力 +2；下场所选路线屏障 +8',
    use: '调整分馏顺序，回收多余蒸汽供电并给屏障预充。',
  },
  distiller: {
    name: '蒸馏器',
    node: 'purify',
    verb: '收集清洁冷凝水',
    effect: 'water',
    consumed: false,
    benefit: '精力 +20',
    use: '先分离沉淀，再加热冷凝；现场饮用，不额外复制补给。',
  },
};
export const FIELD_TITLES: Record<FieldNode, string> = {
  salvage: '承重夹层',
  relay: '断续继电站',
  balance: '悬空载台',
  pressure: '泄压气室',
  chemistry: '反应实验台',
  purify: '污染分馏井',
};
export function isFieldNode(node: string): node is FieldNode {
  return FIELD_NODES.includes(node as FieldNode);
}
export function fieldTask(seed: number, floor: number, node: FieldNode) {
  const variant = hash(`${seed}/${floor}/${node}/objects-v1`) % 3;
  const rows = {
    salvage: {
      text: `夹层有三处标记：${['左', '中', '右'][variant]}侧标着空心铆钉。先沿空心铆钉的细缝作业，避免切断承重梁。`,
      mode: 'point',
      answer: variant,
      options: ['左侧细缝', '中央细缝', '右侧细缝'],
      hint: '承重梁不能拆；选择空心铆钉对应的位置。',
    },
    relay: {
      text: `继电灯记录的顺序是 ${['黄 → 蓝 → 红', '蓝 → 红 → 黄', '红 → 黄 → 蓝'][variant]}。按同样顺序接入三个端子。`,
      mode: 'sequence',
      answer: [201, 12, 120][variant],
      options: ['蓝', '红', '黄'],
      hint: '按三次按钮组成顺序；提交前可以撤销。',
    },
    balance: {
      text: `左臂长2，悬挂${3 + variant}单位负载；右臂长1。把右侧配重调到让两边力矩相等。`,
      mode: 'balance',
      answer: (3 + variant) * 2,
      options: [],
      hint: '力矩 = 重量 × 臂长。',
    },
    pressure: {
      text: `压力表安全释放量是${[3, 5, 6][variant]}。三个阀门分别释放1、2、4单位；选中一组，合计恰好达标。`,
      mode: 'valves',
      answer: [3, 5, 6][variant],
      options: ['阀门 1', '阀门 2', '阀门 4'],
      hint: '总量恰好等于压力表读数。',
    },
    chemistry: {
      text: `这批样本每${2 + variant}份水需要1份试剂。已有${(2 + variant) * 3}份水，应加入几份试剂？`,
      mode: 'mixture',
      answer: 3,
      options: [],
      hint: '按铭牌比例配制；工具决定产物是镀层还是适应性菌种。',
    },
    purify: {
      text: '原水混有泥沙与挥发性杂质。工艺铭牌：先沉淀去泥，再加热分离，最后冷凝收集。按次序设置三道工序。',
      mode: 'sequence',
      answer: 120,
      options: ['冷凝', '沉淀', '加热'],
      hint: '铭牌给出了完整工艺顺序，不需要猜测。',
    },
  };
  return {
    ...rows[node],
    kind: node,
    title: FIELD_TITLES[node],
    tools: Object.entries(OBJECTS)
      .filter(([, x]) => x.node === node)
      .map(([id]) => id),
    key: node,
  };
}
