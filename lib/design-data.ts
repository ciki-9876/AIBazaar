export const DESIGN_VERSION = '0.2';
export const MODULES = [
  {
    id: 'overview',
    no: '00',
    title: '协议与核心循环',
    en: 'THE PREMISE',
    short: '从醒来到第一次归航',
    summary: '一百部电梯，一百位幸存者。你的选择只有向上，以及什么时候回家。',
  },
  {
    id: 'world',
    no: '01',
    title: '世界与楼层生成',
    en: 'WORLD GENERATION',
    short: '每一局，都是另一座世界',
    summary:
      '大模型负责想象世界，规则引擎负责让世界可玩。楼层内容在开局冻结，不因玩家选择而临时改写。',
  },
  {
    id: 'expedition',
    no: '02',
    title: '探索与撤离',
    en: 'SEARCH · FIGHT · EXTRACT',
    short: '带多少进去，带什么回来',
    summary:
      '推进主线换取通关资格，搜刮支线换取物资。撤离是一段需要支付成本的行动，不是即时取消按钮。',
  },
  {
    id: 'inventory',
    no: '03',
    title: '背包与实体鉴定',
    en: 'CARGO & IDENTIFICATION',
    short: '物品先属于世界，卡牌后属于你',
    summary:
      '补给、工具、未知战利品争夺同一个背包。电梯扫描和便携鉴定共享同一份不可重掷的鉴定结果。',
  },
  {
    id: 'cards',
    no: '04',
    title: '卡牌与增量养成',
    en: 'CARD PROGRESSION',
    short: '天生的稀有，后天的成长',
    summary:
      '稀有度在第一次鉴定时揭示，永久锁定；品质、强化和改造承担可培养的成长。旧投入可以部分回收。',
  },
  {
    id: 'base',
    no: '05',
    title: '电梯基地与生存',
    en: 'THE CABIN',
    short: '把困住你的地方，变成家',
    summary:
      '基地空间、补给、精力和电力相互制约。建设改变探索方式，同时保留资源枯竭时的应急退路。',
  },
  {
    id: 'combat',
    no: '06',
    title: '战斗与构筑衔接',
    en: 'COMBAT SYSTEM',
    short: '让每件卡牌按自己的时间行动',
    summary:
      '保留物品独立冷却、十格构筑和相邻联动。在楼层中明确区分搜刮、鉴定、换装和战斗的时机。',
  },
  {
    id: 'survivors',
    no: '07',
    title: '幸存者与共享楼层',
    en: 'A LIVING COMPETITION',
    short: '你走过的地方，别人也来过',
    summary:
      '九十九名机器人与玩家共享楼层和资源账本。细节可以延迟生成，已发生的资源消耗不能被抹掉。',
  },
  {
    id: 'ranking',
    no: '08',
    title: '结算与验收路线',
    en: 'RESULTS & DELIVERY',
    short: '向上走过的路，才是成绩',
    summary:
      '以最高已通关楼层结算。到达不等于通关，幸存不自动等于第一。用小规模闭环验证规则，再扩展到百层。',
  },
] as const;
export type ModuleId = (typeof MODULES)[number]['id'];
export const moduleHref = (id: string) =>
  id === 'overview' ? '/design/' : `/design/${id}/`;
