'use client';
import { useEffect, useRef, useState } from 'react';
import { GUIDE_COPY, type Guidance } from '@/lib/survival-guidance';
import DialogueBubble, { type DialogueControls } from './dialogue';

function RobotHead() {
  return (
    <svg
      className="guide-robot"
      viewBox="0 0 64 64"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path fill="#a4c2a4" d="M29 2h6v10h-6zM25 1h14v4H25z" />
      <path fill="#aa8b50" d="M5 13h54v43H5zM1 25h4v18H1zM59 25h4v18h-4z" />
      <path fill="#122323" d="M9 17h46v35H9z" />
      <path
        fill="#b5d4b6"
        d="M17 25h9v10h-9zM38 25h9v10h-9zM26 42h5v4h-5zM33 42h5v4h-5zM30 46h5v3h-5z"
      />
      <path fill="#506767" d="M9 17h46v3H9zM9 20h3v32H9z" />
    </svg>
  );
}
export default function TutorialGuide({
  guidance,
  acknowledge,
  dialogue,
}: {
  guidance: Guidance;
  acknowledge: () => void;
  dialogue: DialogueControls;
}) {
  const active = guidance.active!;
  const copy = GUIDE_COPY[active.id];
  const dialog = useRef<HTMLDialogElement>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [read, setRead] = useState(false);
  useEffect(() => {
    const panel = dialog.current;
    if (copy.strong) panel?.showModal();
    const update = () => {
      const node = document.querySelector(
        `[data-guide-target="${copy.target}"]`,
      );
      const r = node?.getBoundingClientRect();
      setPoint(r ? { x: r.left + r.width / 2, y: r.bottom + 5 } : null);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      panel?.close();
      window.removeEventListener('resize', update);
    };
  }, [copy]);
  const content = (
    <>
      <RobotHead />
      <div>
        <h3>{copy.title}</h3>
        {!read && (
          <DialogueBubble
            text={
              active.id === 'aid' && !guidance.aidGiven
                ? '我留了面包和瓶装水。先在背包腾出两格。这份备用补给只给一次，剩下的要靠你自己。'
                : copy.text
            }
            controls={{
              ...dialogue,
              skip: () =>
                active.id === 'ascent' ? setRead(true) : acknowledge(),
            }}
            className="guide-dialogue"
          />
        )}
        {copy.strong ? (
          <button onClick={acknowledge}>
            {active.id === 'ascent' ? '确认，前往第三层' : '明白了'}
          </button>
        ) : (
          <progress
            aria-label="提示剩余时间"
            max={300}
            value={active.remaining}
          />
        )}
      </div>
    </>
  );
  const position = point
    ? {
        left: Math.max(16, Math.min(point.x - 270, window.innerWidth - 450)),
        top: point.y + 32,
      }
    : undefined;
  return copy.strong ? (
    <dialog
      ref={dialog}
      className={`tutorial-guide strong ${point ? 'anchored' : ''}`}
      style={position}
      aria-label={copy.title}
      onCancel={(e) => e.preventDefault()}
    >
      {point && (
        <i
          className="guide-pointer"
          style={{ left: point.x - (position?.left || 0) }}
        />
      )}
      {content}
    </dialog>
  ) : (
    <output className="tutorial-guide weak anchored" style={position}>
      {point && (
        <i
          className="guide-pointer"
          style={{ left: point.x - (position?.left || 0) }}
        />
      )}
      {content}
    </output>
  );
}
