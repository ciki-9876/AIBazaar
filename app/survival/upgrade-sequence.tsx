'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Lightbulb, DoorOpen } from 'lucide-react';
/** Presentation only: payment has already succeeded atomically before mounting. */
export default function UpgradeSequence({
  level,
  reduced,
  paused,
  done,
}: {
  level: 1 | 2;
  reduced: boolean;
  paused: boolean;
  done: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [time, setTime] = useState(0);
  const elapsed = useRef(0);
  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    return () => d.close();
  }, []);
  useEffect(() => {
    if (paused) return;
    let id = 0,
      previous = 0;
    const frame = (now: number) => {
      if (previous) elapsed.current += Math.min(50, now - previous);
      previous = now;
      setTime(elapsed.current / 1000);
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [paused]);
  const duration = reduced ? 1.5 : 6;
  const revealed = time >= duration;
  const phase =
    time < duration * 0.28
      ? '材料接入'
      : time < duration * 0.65
        ? '居所重构'
        : '连接新的世界';
  return (
    <dialog
      ref={dialog}
      className={`lift-upgrade-sequence ${revealed ? 'revealed' : ''} ${reduced ? 'reduced' : ''} ${paused ? 'paused' : ''}`}
      onCancel={(e) => e.preventDefault()}
      aria-label="电梯升级演出"
      style={{ '--upgrade-time': `${time}s` } as React.CSSProperties}
    >
      <div className="upgrade-rays" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <i key={i} style={{ '--ray': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="upgrade-orbits" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="upgrade-core">
        <ArrowUp size={58} />
        <span>{String(level).padStart(2, '0')}</span>
      </div>
      <p className="upgrade-phase">
        {revealed ? '安 泊 · 居 所 升 级' : phase}
      </p>
      <h2>
        {revealed
          ? '归途，延伸了'
          : `${Math.min(99, Math.floor((time / duration) * 100))}%`}
      </h2>
      <div className="upgrade-reveal-reward">
        {level === 1 ? <Lightbulb size={28} /> : <DoorOpen size={28} />}
        <div>
          <strong>
            {level === 1 ? '照明恢复 · 二层接通' : '第三层 · 听雨庭'}
          </strong>
          <p>
            {level === 1
              ? '黑暗里，有了一处属于你的光。'
              : '门的另一边，雨声正在靠近。'}
          </p>
        </div>
      </div>
      <button disabled={!revealed} onClick={done}>
        {revealed ? '继续旅程' : '正在接通…'}
      </button>
    </dialog>
  );
}
