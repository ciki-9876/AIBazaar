import ArenaExperience from '../../arena-experience';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'F9 · 绘本伙伴 A+B' };
export default function StorybookArena() {
  return <ArenaExperience presentation="2d" initialSkin="storybook" />;
}
