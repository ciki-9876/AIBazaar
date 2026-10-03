export const RENDER_STYLES = [
  {
    id: 'cel',
    title: '赛璐璐',
    en: 'CEL ANIMATION',
    color: '#edaf61',
    mark: '01',
    note: '收拢明暗层次，保留饱满色块。',
    process: '色阶分层 / 保边柔化 / 深色轮廓',
    limit: '接近动画调色，不能凭后处理重新绘制脸部或手绘高光。',
  },
  {
    id: 'comic',
    title: '漫画网点',
    en: 'GRAPHIC NOVEL',
    color: '#87bab3',
    mark: '02',
    note: '让阴影成为印刷网点，让形体靠线条说话。',
    process: '黑白分色 / 半色调网点 / 墨线',
    limit: '颜色信息会丢失；正式战斗必须保留敌我、路线和状态的独立标记。',
  },
  {
    id: 'ink',
    title: '宣纸水墨',
    en: 'INK WASH',
    color: '#b7c2a4',
    mark: '03',
    note: '留白托住形体，墨色沿着轮廓渗开。',
    process: '墨色浓淡 / 纸纤维 / 边缘洇染',
    limit: '是实时水墨化画面，不能替代画师组织笔势与留白。',
  },
  {
    id: 'woodcut',
    title: '复古版画',
    en: 'WOODCUT PRINT',
    color: '#e87e5f',
    mark: '04',
    note: '象牙纸、炭黑与朱砂，留下刻刀的方向。',
    process: '限色套印 / 交叉刻线 / 纸张颗粒',
    limit: '密集器械与卡牌小字会受刻线影响，需近看并保留文字层。',
  },
  {
    id: 'neon',
    title: '霓虹扫描',
    en: 'NEON SCAN',
    color: '#a5a0e9',
    mark: '05',
    note: '撤去实体色彩，让边缘像异常信号一样发光。',
    process: '双色边缘 / 柔光扩散 / 暗部压缩',
    limit: '它强调结构和能量感，弱化皮革、纸张等真实材质。',
  },
] as const;
export type RenderStyleId = (typeof RENDER_STYLES)[number]['id'];
export type RenderStyleSettings = {
  style: RenderStyleId;
  strength: number;
  compare: boolean;
  split: number;
  original: boolean;
};
