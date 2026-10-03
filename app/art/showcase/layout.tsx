import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'F9 · 三种世界的质感',
  description:
    '手绘神话、工业泵站与微缩温室，三个可旋转观察的实时三维美术场景。',
};
export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
