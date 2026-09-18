import type { Metadata } from 'next';
import '../demo/demo.css';
import './current.css';
export const metadata: Metadata = {
  title: 'F9 · 实体工具与卡牌手册',
  description: '12件实体、6类现场机关与三路战斗构筑。',
};
export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
