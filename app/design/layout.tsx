import type { Metadata } from 'next';
import './design.css';
import './detail.css';
import './v03.css';
import './v04.css';
export const metadata: Metadata = {
  title: 'f9 · 电梯幸存者 / 设计验收台',
  description: '电梯幸存者的系统原型、产品规则与逐模块验收。',
};
export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
