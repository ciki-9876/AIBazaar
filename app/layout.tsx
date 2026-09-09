import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'f9 game · 幸存者电梯 Demo 1.0',
  description:
    '在只能向上的电梯里生存。探索十层异常世界、搜刮撤离、建造基地，构筑三路卡牌。',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
