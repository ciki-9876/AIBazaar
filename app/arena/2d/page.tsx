import ArenaExperience from '../arena-experience';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'F9 · 伙伴对战',
  description: '布置收藏卡，观察三路自动交锋，回看结果并调整阵容。',
};

export default function Arena2DPage() {
  return <ArenaExperience presentation="2d" />;
}
