import OutlineEditor from '../../src/outline/outline-editor';
import outline from '../../src/outline/outline.json';
import { validateOutline } from '../../src/outline/outline-model';
import '../../src/outline/outline.css';

export const metadata = {
  title: '大纲编排 · 听风之旅',
  description: '一起维护世界、人物、章节和待讨论的问题。',
};
export default function Page() {
  return <OutlineEditor initial={validateOutline(outline)} />;
}
