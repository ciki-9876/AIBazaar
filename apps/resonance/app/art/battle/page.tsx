import HealingDemo from '../../../src/app/wandeng/rhythm/healing-demo';
import '../../../src/app/wandeng/theme.css';
import '../../../src/app/wandeng/rhythm/rhythm.css';
import '../../../src/app/wandeng/rhythm/healing.css';
import '../../../src/presentation/battle-art.css';

export const metadata = { title: '夏日像素 · 心景演奏 · 听风之旅' };
export default function Page() {
  return <HealingDemo presentation="summer" />;
}
