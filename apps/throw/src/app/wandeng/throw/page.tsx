import ThrowTable from './throw-table';
import './throw.css';
import './throw-workbench.css';

export const metadata = {
  title: '甩牌对决',
  description: '自动抽牌，攒出组合，亲手把扑克牌甩向对手。',
};
export default function ThrowPage() {
  return <ThrowTable />;
}
