'use client';
import { useEffect, useRef, useState } from 'react';
import type { OpeningState } from '@/lib/survival-opening';
export default function Vitals({ state }: { state: OpeningState }) {
  const previous = useRef({
    food: state.room.player.food,
    water: state.room.player.water,
    hp: state.room.player.hp,
  });
  const [displayed, setDisplayed] = useState(() => ({
    food: state.room.player.food,
    water: state.room.player.water,
    hp: state.room.player.hp,
  }));
  const [gains, setGains] = useState<
    { id: number; key: 'food' | 'water' | 'hp'; amount: number }[]
  >([]);
  const serial = useRef(0);
  useEffect(() => {
    const additions = (['food', 'water', 'hp'] as const).flatMap((key) => {
      const amount = state.room.player[key] - previous.current[key];
      return amount > 0.5
        ? [{ id: serial.current++, key, amount: Math.round(amount) }]
        : [];
    });
    const frame = requestAnimationFrame(() => {
      const values = {
        food: state.room.player.food,
        water: state.room.player.water,
        hp: state.room.player.hp,
      };
      previous.current = values;
      setDisplayed(values);
      if (additions.length) setGains((old) => [...old, ...additions]);
    });
    return () => cancelAnimationFrame(frame);
  }, [state.room.player]);
  if (!state.afterlight.breadEaten && !state.guidance.seen.includes('spirit'))
    return null;
  return (
    <aside
      className="opening-vitals"
      aria-label="生存状态"
      data-guide-target="needs"
    >
      {(
        [
          ['hp', '精神力'],
          ['food', '饱食'],
          ['water', '饮水'],
        ] as const
      )
        .filter(([key]) =>
          key === 'hp'
            ? !!state.season || state.guidance.seen.includes('spirit')
            : state.afterlight.breadEaten,
        )
        .map(([key, label]) => (
          <div
            key={key}
            className={state.room.player[key] < 50 ? 'low' : ''}
            data-guide-target={key === 'hp' ? 'spirit' : undefined}
          >
            <span>{label}</span>
            <i>
              <b style={{ width: `${displayed[key]}%` }} />
              {key !== 'hp' && (
                <em className="vital-threshold" title="50 · 警戒线" />
              )}
            </i>
            <small>{Math.ceil(state.room.player[key])}</small>
            {gains
              .filter((g) => g.key === key)
              .map((g) => (
                <output
                  key={g.id}
                  className="vital-gain"
                  onAnimationEnd={() =>
                    setGains((old) => old.filter((n) => n.id !== g.id))
                  }
                >
                  +{g.amount}{' '}
                  {key === 'food'
                    ? '饱食度'
                    : key === 'water'
                      ? '饮水值'
                      : '精神力'}
                </output>
              ))}
          </div>
        ))}
    </aside>
  );
}
