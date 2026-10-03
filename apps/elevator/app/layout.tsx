import '../../../app/globals.css';
export const metadata = { title: '安泊 · 电梯求生' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
