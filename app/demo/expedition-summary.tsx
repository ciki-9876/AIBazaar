import { PackageOpen } from 'lucide-react';
import { itemName, type Run } from '@/lib/demo-engine';
export default function ExpeditionSummary({ run }: { run: Run }) {
  const ledger = run.expedition;
  if (!ledger) return <p>旧存档未记录本次探索收支；从下次出发开始记录。</p>;
  const names: Record<string, string> = {
    stamina: '精力',
    material: '金币',
    power: '电力',
    quota: '生命',
    supply: '补给',
    scanner: '鉴定仪',
  };
  return (
    <section className="expedition-summary">
      <h2>
        <PackageOpen />
        本次探索
      </h2>
      <ul>
        {ledger.acquired.map((x) => (
          <li
            key={x.uid}
            className={`rarity-${x.id === 'scanner' || x.id === 'relic' ? 3 : (run.items.find((i) => i.uid === x.uid)?.rarity ?? x.rarity ?? 0)}`}
          >
            <span>
              {itemName(x)}
              <small>
                {run.items.find((i) => i.uid === x.uid)?.zone === 'board'
                  ? '已上阵'
                  : run.items.find((i) => i.uid === x.uid)?.type === 'physical'
                    ? '待鉴定'
                    : !run.items.some((i) => i.uid === x.uid)
                      ? '已使用'
                      : x.type === 'card'
                        ? '卡牌'
                        : ''}
              </small>
            </span>
            <b>×{x.amount}</b>
          </li>
        ))}
      </ul>
      <div className="expedition-resources">
        {Object.entries(names)
          .filter(([k]) => ledger.gained[k] || ledger.spent[k])
          .map(([key, label]) => (
            <p key={key}>
              <span>{label}</span>
              <strong>+{ledger.gained[key] ?? 0}</strong>
              <span>−{ledger.spent[key] ?? 0}</span>
            </p>
          ))}
      </div>
      {ledger.active && (
        <small>返回还需 8 精力；首次提交另获 5 金币、2 补给。</small>
      )}
    </section>
  );
}
