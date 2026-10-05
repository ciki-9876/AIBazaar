import ThrowTable from "./throw-table";
import "./throw.css";

export const metadata = {
  title: "甩牌试验场 · 万灯城",
  description: "自动抽牌，攒出组合，亲手把扑克牌甩向对手。",
};
export default function ThrowPage() {
  return <ThrowTable />;
}
