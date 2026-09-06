import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'f9 game · 午夜异物集市', description: '逛一场午夜集市，构筑你的异物行囊。原创物品构筑自动战斗游戏。' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN" className="dark"><body>{children}</body></html>}
