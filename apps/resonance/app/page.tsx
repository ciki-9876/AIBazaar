import HealingDemo from '../src/app/wandeng/rhythm/healing-demo';
import '../src/app/wandeng/theme.css';
import '../src/app/wandeng/rhythm/rhythm.css';
import '../src/app/wandeng/rhythm/healing.css';

export const metadata = {
  title: '听风之旅 · 共鸣治愈师',
  description: '以音乐驱散心魔，陪沿途的人重新找回自己的声音。',
};
export default function Page() {
  return <HealingDemo />;
}
