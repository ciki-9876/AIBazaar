import WandengExperience from './wandeng-experience';
import './theme.css';
// Visual presentation is independent of the shared battle rules.
// Pixel materials and local Chinese bitmap typography are the current art direction.

export const metadata = {
  title: '万灯城的归物师 · 一封给旧物的信',
  description: '听见旧物的声音，带它们走一段有归处的旅途。',
};

export default function WandengPage() {
  return <WandengExperience />;
}
