import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'F9 · 安泊电梯求生',
  description:
    '穿过电梯，探索异常世界。搜集物资，平安归来。',
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
