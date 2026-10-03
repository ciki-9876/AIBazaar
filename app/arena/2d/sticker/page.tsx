import ArenaExperience from '../../arena-experience';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'F9 · 贴纸伙伴 A+G' };
export default function StickerArena() {
  return <ArenaExperience presentation="2d" initialSkin="sticker" />;
}
