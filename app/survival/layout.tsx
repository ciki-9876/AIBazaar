import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'F9 · 梦中的荒原',
  description: '在电梯里醒来，走进门外的荒原。',
};
export default function SurvivalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
