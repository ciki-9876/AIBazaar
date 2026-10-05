import MagicianAdventure from './magician-adventure';
import '../wandeng/throw/throw.css';
import '../wandeng/throw/throw-workbench.css';
import './adventure.css';

export const metadata = {
  title: '最后一张王牌 · 魔术师之旅',
  description:
    '从格雷维克的旧剧院街走向世界冠军。像素横版魔术冒险与主动甩牌对决。',
};
export default function AdventurePage() {
  return <MagicianAdventure />;
}
