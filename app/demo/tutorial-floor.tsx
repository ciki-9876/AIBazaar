'use client';
import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Backpack,
  Leaf,
  ScanLine,
  Shield,
  Swords,
  RotateCw,
  Check,
  Wind,
} from 'lucide-react';
import { currentFloor, currentNode } from '@/lib/demo-engine';
import { itemName, travelCost } from '@/lib/demo-engine';
import type { Run, Action } from '@/lib/demo-engine';
import {
  PIPE_SHAPES,
  rotatedPipe,
  pipeFlow,
  pipeConnected,
  initialPipes,
} from '@/lib/tutorial-pipes';
import { describeCard } from '@/lib/card-description';
import CardDetail from './card-detail';
import { ContextHint } from './focus-guide';
type Props = {
  run: Run;
  onAction: (a: Action) => unknown;
  intel: () => ReactNode;
};
export function CostIcons({
  supply = 0,
  energy = 0,
}: {
  supply?: number;
  energy?: number;
}) {
  return (
    <span className="tutorial-costs">
      {supply > 0 && (
        <span title="补给" aria-label={`消耗${supply}补给`}>
          <Backpack size={17} />
          {supply}
        </span>
      )}
      {energy > 0 && (
        <span title="精力" aria-label={`消耗${energy}精力`}>
          <Leaf size={17} />
          {energy}
        </span>
      )}
    </span>
  );
}
function Cache({ run, onAction }: Pick<Props, 'run' | 'onAction'>) {
  const stock = currentFloor(run).stock;
  const gun = run.items.find((x) => x.uid === 'tutorial-nailer');
  const scanner = run.items.find(
    (x) => x.uid === 'tutorial-scanner' && ['bag', 'safe'].includes(x.zone),
  );
  const pad = run.items.find(
    (x) => x.uid === 'tutorial-rubber' && ['bag', 'safe'].includes(x.zone),
  );
  const stage = stock.length
    ? 'loot'
    : gun?.type === 'physical'
      ? 'scan'
      : gun?.zone !== 'board'
        ? 'equip'
        : 'ready';
  const hints = {
    loot: {
      target: '.tutorial-loot article',
      title: '战后的收获',
      body: '拿走两件实体和鉴定器。实体可以转化为战斗卡，也能留作现场工具。',
      next: '收下战利品',
    },
    scan: {
      target: '.tutorial-scan',
      title: '把物品变成卡牌',
      body: '鉴定器有1次电荷。先鉴定钉枪；缓冲垫留着，下一间会用到。电荷与电力不同。',
      next: '试试鉴定',
    },
    equip: {
      target: '.tutorial-equip-action',
      title: '让新武器加入战斗',
      body: '钉枪每6秒发动一次，前两次还有额外伤害。点击装备，它会进入连续的两个空格。',
      next: '试试装备',
    },
    ready: {
      target: '.tutorial-gain',
      title: '武器增加了',
      body: '现在刀和钉枪会分别自动攻击。物品只有完成上阵，才会在下一战生效。',
      next: '继续探索',
    },
  };
  return (
    <section className="tutorial-cache">
      <ContextHint key={stage} step={hints[stage]} />
      {stock.length > 0 && (
        <div className="tutorial-loot">
          {stock.map((x) => (
            <article key={x.uid}>
              {x.id === 'scanner' ? (
                <ScanLine />
              ) : x.id === 'rubber' ? (
                <Shield />
              ) : (
                <Swords />
              )}
              <strong>{itemName(x)}</strong>
              <small>
                {x.id === 'scanner'
                  ? '1次鉴定'
                  : x.id === 'rubber'
                    ? '可鉴定 · 隔热工具'
                    : '可鉴定 · 武器'}
              </small>
              <button onClick={() => onAction({ type: 'pickup', id: x.uid })}>
                拾取
              </button>
            </article>
          ))}
        </div>
      )}
      {gun?.type === 'physical' && scanner && (
        <div className="tutorial-scan">
          <ScanLine size={32} />
          <span>
            鉴定器 <b>{run.charges}</b> 电荷
          </span>
          <button
            className="ed-primary"
            onClick={() => onAction({ type: 'scan', id: gun.uid })}
          >
            鉴定钉枪 <ScanLine size={17} /> 1
          </button>
        </div>
      )}
      {gun?.type === 'card' && (
        <article className="tutorial-new-card">
          <h2>{itemName(gun)}</h2>
          <div className="tutorial-card-current">
            {describeCard({
              ...gun,
              at: gun.at ?? 3,
              rarity: gun.rarity ?? 0,
            }).abilities.map((ability) => (
              <p key={ability.when}>
                <b>{ability.when}</b>
                {ability.text}
              </p>
            ))}
          </div>
          <details>
            <summary>完整卡牌</summary>
            <CardDetail
              card={{ ...gun, at: gun.at ?? 3, rarity: gun.rarity ?? 0 }}
            />
          </details>
          {gun.zone !== 'board' && (
            <button
              className="ed-primary tutorial-equip-action"
              onClick={() => onAction({ type: 'equip', id: gun.uid })}
            >
              装备到空位 <Swords size={18} />
            </button>
          )}
        </article>
      )}
      {stage === 'ready' && (
        <div className="tutorial-gain">
          <Swords />
          <strong>战力提升 · 武器 1 → 2</strong>
          <span>
            新增：
            {
              describeCard({
                ...gun!,
                at: gun!.at ?? 3,
                rarity: gun!.rarity ?? 0,
              }).effects[0].text
            }
          </span>
        </div>
      )}
      {pad && (
        <p className="tutorial-kept">
          <Shield size={18} /> 缓冲垫已收好 · 下一间使用
        </p>
      )}
      {stage === 'ready' && pad && (
        <button
          className="ed-primary"
          onClick={() => onAction({ type: 'next-node' })}
        >
          前往气室 <ArrowRight size={18} />
          <CostIcons energy={travelCost(run)} />
        </button>
      )}
    </section>
  );
}
function PipeRoom({ run, onAction }: Pick<Props, 'run' | 'onAction'>) {
  const [installed, setInstalled] = useState(false);
  const [turns, setTurns] = useState(() => initialPipes(run.seed));
  const wet = pipeFlow(turns),
    solved = pipeConnected(turns);
  const done = currentFloor(run).workResolved?.includes('pressure');
  if (done)
    return (
      <button
        className="ed-primary"
        onClick={() => onAction({ type: 'field-work', choice: -2 })}
      >
        穿过已畅通的气室 <ArrowRight />
      </button>
    );
  return (
    <section className="tutorial-pipes">
      <ContextHint
        key={installed ? 'pipes' : 'pad'}
        step={
          installed
            ? {
                target: '.pipe-grid button:not(:disabled)',
                title: '给蒸汽一条出路',
                body: '点击管道旋转，把左上入口连到右下出口。亮起的管道表示蒸汽已流到这里。没有倒计时，调整不消耗资源。',
                next: '开始接管',
              }
            : {
                target: '.pipe-tool',
                title: '刚才的道具派上用场了',
                body: '管道很烫。垫上刚拾取的缓冲垫，就能安全转动接口。完成后会收回缓冲垫。',
                next: '装上缓冲垫',
              }
        }
      />
      <div className="pipe-toolbar">
        <button
          className={'pipe-tool ' + (installed ? 'installed' : '')}
          disabled={installed}
          onClick={() => setInstalled(true)}
        >
          <Shield />
          {installed ? '已隔热' : '垫上缓冲垫'}
          {installed && <Check />}
        </button>
        <span title="完成后恢复12精力">
          <Leaf /> +12
        </span>
      </div>
      <fieldset
        className="pipe-board"
        aria-label="泄压管道，入口左上，出口右下"
      >
        <span className="pipe-inlet">
          <Wind size={18} /> 入口 →
        </span>
        <div className="pipe-grid">
          {PIPE_SHAPES.map((shape, i) => {
            const mask = rotatedPipe(shape, turns[i]);
            return (
              <button
                key={i}
                disabled={!shape || !installed}
                className={
                  (wet.has(i) ? 'wet ' : '') + (!shape ? 'pipe-empty' : '')
                }
                aria-label={`管道${i + 1}，${[1, 2, 4, 8]
                  .filter((b) => mask & b)
                  .map(
                    (b) =>
                      (
                        ({ 1: '上', 2: '右', 4: '下', 8: '左' }) as Record<
                          number,
                          string
                        >
                      )[b],
                  )
                  .join('和')}接口，点击旋转`}
                onClick={() =>
                  setTurns((t) => t.map((v, j) => (j === i ? (v + 1) % 4 : v)))
                }
              >
                {shape > 0 && (
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    {[
                      [1, 50, 0],
                      [2, 100, 50],
                      [4, 50, 100],
                      [8, 0, 50],
                    ]
                      .filter(([bit]) => mask & bit)
                      .map(([bit, x, y]) => (
                        <path
                          key={bit}
                          d={`M50 50 L${x} ${y}`}
                          className="pipe-line"
                        />
                      ))}
                    <circle cx="50" cy="50" r="9" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <span className={'pipe-outlet ' + (solved ? 'connected' : '')}>
          → {solved ? '已接通' : '出口'} <Wind size={18} />
        </span>
      </fieldset>
      <div className="pipe-footer">
        <button onClick={() => setTurns(initialPipes(run.seed))}>
          <RotateCw size={18} /> 重置
        </button>
        <button
          className="ed-primary"
          disabled={!solved || !installed}
          onClick={() =>
            onAction({ type: 'pipe-work', id: 'tutorial-rubber', turns })
          }
        >
          {solved ? '打开泄压口' : '接通后泄压'} <Wind size={18} />
          <CostIcons energy={5} />
        </button>
      </div>
    </section>
  );
}
export default function TutorialFloor({ run, onAction, intel }: Props) {
  const node = currentNode(run);
  const steps = [
    ['patrol', '遭遇'],
    ['search', '收获'],
    ['pressure', '泄压'],
    ['antechamber', '守卫前室'],
    ['guardian', '守卫'],
    ['exit', '归返'],
  ];
  return (
    <div className="tutorial-floor">
      {run.notice.startsWith('蒸汽顺着') && (
        <output className="tutorial-receipt">
          <Check size={18} />
          泄压完成 · 缓冲垫已收回{' '}
          <span>
            <Leaf size={17} />
            {run.stamina}
          </span>
        </output>
      )}
      <nav className="tutorial-route" aria-label="引导关进度">
        {steps.map(([id, label], i) => (
          <span
            key={id}
            className={id === node ? 'active' : i < run.node ? 'done' : ''}
          >
            <b>{i < run.node ? '✓' : i + 1}</b>
            {label}
          </span>
        ))}
      </nav>
      <section className="tutorial-scene ed-panel">
        <header>
          <small>01F · {run.node + 1}/6</small>
          <h1>
            {
              (
                {
                  patrol: '门后的巡逻者',
                  search: '遗落的物资箱',
                  pressure: '泄压气室',
                  antechamber: '守卫前室',
                  guardian: '归返信标前',
                  exit: '电梯在等你',
                } as Record<string, string>
              )[node]
            }
          </h1>
        </header>
        {node === 'patrol' ? (
          <div className="tutorial-first-fight">
            <Swords size={68} />
            <p>巡逻者挡住去路。你握紧了手里的刀。</p>
            <button
              className="ed-primary"
              onClick={() => onAction({ type: 'fight' })}
            >
              迎战 <Swords size={18} />
            </button>
          </div>
        ) : node === 'search' ? (
          run.interaction === 'search' ? (
            <Cache run={run} onAction={onAction} />
          ) : (
            <div className="tutorial-first-fight">
              <Backpack size={68} />
              <p>门后留着一只完好的物资箱。</p>
              <button
                className="ed-primary"
                onClick={() => onAction({ type: 'search' })}
              >
                打开箱子 <CostIcons energy={10} />
              </button>
            </div>
          )
        ) : node === 'pressure' ? (
          <PipeRoom run={run} onAction={onAction} />
        ) : node === 'antechamber' || node === 'guardian' ? (
          <>
            {intel()}
            <button
              className="ed-primary"
              onClick={() =>
                onAction({
                  type: node === 'antechamber' ? 'approach-guardian' : 'fight',
                })
              }
            >
              {node === 'antechamber' ? '推开内门' : '挑战守卫'} <ArrowRight />
              {node === 'antechamber' && <CostIcons energy={3} />}
            </button>
          </>
        ) : (
          <div className="tutorial-first-fight">
            <Check size={68} />
            <p>信标亮了。带上你的收获回家。</p>
            <button
              className="ed-primary"
              onClick={() => onAction({ type: 'extract' })}
            >
              返回电梯 <CostIcons energy={8} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
