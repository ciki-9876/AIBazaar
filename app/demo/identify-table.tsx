'use client';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Sparkles, Package, ArrowDown } from 'lucide-react';
import { itemName, RARITY } from '@/lib/demo-engine';
import type { Item } from '@/lib/demo-engine';
import CardDetail from './card-detail';
const COLORS = ['#91979b', '#579dec', '#e4ce5c', '#aa8035', '#ef575b'];
const ORIGIN = {
  bag: '背包',
  safe: '安全容器',
  warehouse: '仓库',
  board: '上阵区',
};
export default function IdentifyTable({
  items,
  onScan,
  initialUid,
}: {
  items: Item[];
  onScan: (uid: string) => Item | null;
  initialUid?: string;
}) {
  const [chosen, setChosen] = useState<Item | null>(
    () =>
      items.find((x) => x.uid === initialUid && x.type === 'physical') ?? null,
  );
  const [phase, setPhase] = useState<
    'idle' | 'flying' | 'ready' | 'scanning' | 'done'
  >(chosen ? 'ready' : 'idle');
  const [tier, setTier] = useState(0),
    [pulse, setPulse] = useState(0);
  const [flight, setFlight] = useState<{
    x: number;
    y: number;
    dx: number;
    dy: number;
  } | null>(null);
  const surface = useRef<HTMLDivElement>(null),
    result = useRef<Item | null>(null),
    busy = useRef(false);
  useEffect(() => {
    if (phase === 'flying') {
      const t = setTimeout(() => {
        setFlight(null);
        setPhase('ready');
        busy.current = false;
      }, 620);
      return () => clearTimeout(t);
    }
    if (phase === 'scanning') {
      const goal = result.current?.rarity ?? 0;
      let step = 0;
      const t = setInterval(() => {
        step++;
        setTier(Math.min(goal, step));
        setPulse(step);
        if (step >= goal + 2) {
          clearInterval(t);
          setChosen(result.current);
          setPhase('done');
          busy.current = false;
        }
      }, 650);
      return () => clearInterval(t);
    }
  }, [phase]);
  const choose = (item: Item, element: HTMLElement) => {
    if (busy.current) return;
    busy.current = true;
    const from = element.getBoundingClientRect(),
      to = surface.current!.getBoundingClientRect();
    setChosen(item);
    setTier(0);
    result.current = null;
    setFlight({
      x: from.left + from.width / 2,
      y: from.top + from.height / 2,
      dx: to.left + to.width / 2 - from.left - from.width / 2,
      dy: to.top + to.height / 2 - from.top - from.height / 2,
    });
    setPhase('flying');
  };
  const scan = () => {
    if (busy.current || !chosen || phase !== 'ready') return;
    busy.current = true;
    const actual = onScan(chosen.uid);
    if (!actual) {
      busy.current = false;
      setChosen(null);
      setPhase('idle');
      return;
    }
    result.current = actual;
    setTier(0);
    setPulse(0);
    setPhase('scanning');
  };
  const candidates = items.filter(
    (x) => x.type === 'physical' && x.uid !== chosen?.uid,
  );
  return (
    <section className="ed-identify-page">
      <header>
        <small>初始设施 · 免费鉴定</small>
        <h2>让未知之物显露本相</h2>
      </header>
      <div className="ed-identify-stage">
        <div
          className={`ed-identify-plinth ${phase}`}
          ref={surface}
          style={{ '--identify-color': COLORS[tier] } as CSSProperties}
        >
          <div key={pulse} className="ed-identify-aura" />
          <div className="ed-identify-ring" />
          {chosen ? (
            <>
              <Package size={44} />
              <strong>{itemName(chosen)}</strong>
              <small>
                {phase === 'done'
                  ? RARITY[chosen.rarity ?? 0].name
                  : phase === 'scanning'
                    ? '正在解析…'
                    : `来自${ORIGIN[chosen.zone]}`}
              </small>
            </>
          ) : (
            <>
              <ArrowDown size={32} />
              <span>从下方选择一件物品</span>
            </>
          )}
        </div>
        <button
          className="ed-primary"
          disabled={phase !== 'ready'}
          onClick={scan}
        >
          <Sparkles size={16} />
          {phase === 'scanning' ? '鉴定中…' : '鉴定'}
        </button>
        {phase === 'done' && chosen && (
          <div className="ed-identify-result">
            <p>鉴定完成，已放回{ORIGIN[chosen.zone]}。</p>
            <CardDetail
              card={{ ...chosen, at: 0, rarity: chosen.rarity ?? 0 }}
            />
            <button
              onClick={() => {
                setChosen(null);
                setPhase('idle');
                setTier(0);
              }}
            >
              鉴定下一件
            </button>
          </div>
        )}
      </div>
      <section className="ed-identify-candidates">
        <h3>
          可鉴定物品 <small>{candidates.length} 件</small>
        </h3>
        <div className="ed-identify-list">
          {candidates.map((item) => (
            <button
              key={item.uid}
              disabled={phase === 'flying' || phase === 'scanning'}
              onClick={(e) => choose(item, e.currentTarget)}
            >
              <Package size={24} />
              <strong>{itemName(item)}</strong>
              <small>
                {ORIGIN[item.zone]} · {item.volume} 格
              </small>
            </button>
          ))}
          {!candidates.length && (
            <p>暂时没有其他未鉴定物品，探索楼层后再来看看。</p>
          )}
        </div>
      </section>
      {flight && (
        <div
          className="ed-identify-flight"
          style={
            {
              left: flight.x,
              top: flight.y,
              '--flight-x': `${flight.dx}px`,
              '--flight-y': `${flight.dy}px`,
            } as CSSProperties
          }
        >
          <Package size={24} />
          <i />
        </div>
      )}
    </section>
  );
}
