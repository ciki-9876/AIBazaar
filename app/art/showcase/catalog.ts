export const STUDIES = [
  {
    id: 'myth',
    number: '01',
    name: '冥河庭院',
    en: 'THE CHTHONIC COURT',
    genre: '手绘漫画 · 神话遗迹',
    color: '#e7b36c',
    description: '石阶上的余烬，照亮一道尚未关闭的门。',
    details: ['墨线与分层明暗', '手绘地表与破损石雕', '朱红、象牙白与冷翡翠'],
    note: '受《哈迪斯》的图形语言启发；全部建筑与物件均为实时 3D。',
  },
  {
    id: 'industrial',
    number: '02',
    name: '深井泵站',
    en: 'BELOW THE WATERLINE',
    genre: '电影感工业 · 潮湿旧楼',
    color: '#75c7cf',
    description: '最后一台循环泵，仍在地下十九层呼吸。',
    details: [
      '实拍表面与分区粗糙度',
      '金属倒角、法兰与紧固件',
      '冷光、暖钨丝与积水反射',
    ],
    note: '以电梯生存题材为基础，观察材料、体积与暗部的可读性。',
  },
  {
    id: 'garden',
    number: '03',
    name: '雨后温室',
    en: 'A SMALL PLACE TO GROW',
    genre: '精细微缩 · 温暖的废土',
    color: '#bdd493',
    description: '有人在停摆的城市里，养活了这一小片春天。',
    details: ['釉面陶瓷与旧黄铜', '温室骨架、玻璃与植物', '柔软阴影与微缩尺度'],
    note: '用温暖的材质和精细轮廓，测试“安全之家”与危险楼层的反差。',
  },
] as const;
export type StudyId = (typeof STUDIES)[number]['id'];
export type CameraView = 'scene' | 'detail' | 'game';
export type ViewerOptions = {
  study: StudyId;
  view: CameraView;
  motion: boolean;
  neutral: boolean;
  reset: number;
  burst: number;
};
