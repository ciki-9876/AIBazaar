import type { Metadata } from 'next';
import './art.css';
export const metadata: Metadata = {
  title: 'F9 · 美术方向试验',
  description: '炭笔剖面与工业异象，两种战斗表现与完整美术设计。',
};
export default function ArtLayout({ children }: { children: React.ReactNode }) {
  return children;
}
