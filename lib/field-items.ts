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
    benefit: '电力 +3',
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
    use: '稳压后隔离接口，利用安全气室恢复精力。',
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
      text: '承重梁深处传来金属碰撞声。上一支队伍把零件藏进夹层，只留下几枚不同的铆钉作为记号。',
      mode: 'point',
      answer: variant,
      options: ['左侧细缝', '中央细缝', '右侧细缝'],
      hint: `取出夹层零件，保全承重梁。${['左', '中', '右'][variant]}侧的空心铆钉旁留着拆卸痕迹。`,
    },
    relay: {
      text: '继电柜在黑暗里断续闪烁。残余电流还记得停机前的节拍，等待有人将它重新接回线路。',
      mode: 'sequence',
      answer: [201, 12, 120][variant],
      options: ['蓝', '红', '黄'],
      hint: `恢复供能脉冲。记录灯依次闪过：${['黄 → 蓝 → 红', '蓝 → 红 → 黄', '红 → 黄 → 蓝'][variant]}。`,
    },
    balance: {
      text: '载台悬在断桥之间，钢索被拉得吱呀作响。旧配重歪在一侧，桥对面的牵引装置仍然完好。',
      mode: 'balance',
      answer: (3 + variant) * 2,
      options: [],
      hint: `让载台恢复水平。左臂长2、负载${3 + variant}；右臂长1。`,
    },
    pressure: {
      text: '热汽从门缝里嘶嘶冒出，老旧的气室正在颤抖。只有让压力回到绿区，才能靠近裂口，或在隔音舱里喘口气。',
      mode: 'valves',
      answer: [3, 5, 6][variant],
      options: ['阀门 1', '阀门 2', '阀门 4'],
      hint: `将释放量调至 ${[3, 5, 6][variant]}，让气室恢复安全。阀门铭牌：1、2、4。`,
    },
    chemistry: {
      text: '实验台上还亮着一盏小灯。浑浊的样本里浮着金属薄片，另一端的菌群正缓慢苏醒。',
      mode: 'mixture',
      answer: 3,
      options: [],
      hint: `调出稳定溶液。铭牌水与试剂比例为 ${2 + variant}:1，容器内已有 ${(2 + variant) * 3} 份水。`,
    },
    purify: {
      text: '井底的水带着刺鼻气味，分馏塔却仍有余温。清理旧管路后，这里或许能留下一壶净水，还有一些可回收的蒸汽。',
      mode: 'sequence',
      answer: 120,
      options: ['冷凝', '沉淀', '加热'],
      hint: '恢复分馏循环。褪色的工艺铭牌上依次画着：沉淀池、加热炉、冷凝管。',
    },
  };
  return {
    ...rows[node],
    condition: {
      salvage: '夹层打开后',
      relay: '线路接通后',
      balance: '载台平衡后',
      pressure: '气室稳压后',
      chemistry: '溶液稳定后',
      purify: '循环恢复后',
    }[node],
    kind: node,
    title: FIELD_TITLES[node],
    tools: Object.entries(OBJECTS)
      .filter(([, x]) => x.node === node)
      .map(([id]) => id),
    key: node,
  };
}
