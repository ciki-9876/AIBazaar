import MagicianAdventure from '../../../adventure/magician-adventure';
import '../../../wandeng/throw/throw.css';
import '../../../wandeng/throw/throw-workbench.css';
import '../../../adventure/adventure.css';

export const metadata = { title: '最后一张王牌 · SVG 试演' };
export default function VectorPlayPage() {
  return <MagicianAdventure artMode="vector" />;
}
