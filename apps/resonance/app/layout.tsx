import '../src/app/globals.css';
export const metadata = { title: '万灯城 · 共鸣卡牌' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
