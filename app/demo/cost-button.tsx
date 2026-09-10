import type { ButtonHTMLAttributes } from 'react';
import { Coins } from 'lucide-react';
export default function CostButton({
  cost,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { cost: number }) {
  return (
    <span className="ed-cost-control">
      <button {...props}>{children}</button>
      {cost > 0 && (
        <small>
          <Coins size={12} />
          {cost} 金币
        </small>
      )}
    </span>
  );
}
