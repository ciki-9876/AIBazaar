import '../../../app/globals.css';
import '../../../app/legacy-surface.css';
export const metadata = { title: 'F9 · 实验与旧原型' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="legacy-surface">{children}</body>
    </html>
  );
}
