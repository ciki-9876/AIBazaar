import RhythmDemo from './rhythm-demo';
import '../theme.css';
import './rhythm.css';

export const metadata = {
  title: '共鸣试演 · 万灯城',
  description: '编排物灵的出场顺序，听一段旧物的合奏。',
};
export default function RhythmPage() {
  return <RhythmDemo />;
}
