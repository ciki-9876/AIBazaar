import '../src/app/globals.css';

export const metadata = { title: '甩牌对决' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
