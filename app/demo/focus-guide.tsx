'use client';
/* oxlint-disable react/react-compiler -- Measure the spotlight target after layout and on resize. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
export type GuideStep = {
  target: string;
  title: string;
  body: string;
  next?: string;
};
/** Controlled focus guide. Callers pause their clock while mounted; it never changes playback preference. */
export default function FocusGuide({
  step,
  index = 0,
  total = 1,
  onNext,
  onClose,
  paused = false,
}: {
  step: GuideStep;
  index?: number;
  total?: number;
  onNext: () => void;
  onClose?: () => void;
  paused?: boolean;
}) {
  const [box, setBox] = useState<DOMRect | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const target = document.querySelector<HTMLElement>(step.target);
    target?.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'instant',
    });
    const measure = () => setBox(target?.getBoundingClientRect() ?? null);
    measure();
    const observer = new ResizeObserver(measure);
    if (target) observer.observe(target);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    dialog.current
      ?.querySelector<HTMLButtonElement>('.ed-primary')
      ?.focus({ preventScroll: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      previous?.focus({ preventScroll: true });
    };
  }, [step.target]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="presentation"
      className="focus-guide-overlay"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onClose) {
          e.preventDefault();
          onClose();
        }
        if (e.key === 'Tab') {
          const buttons =
            dialog.current?.querySelectorAll<HTMLButtonElement>('button');
          if (!buttons?.length) return;
          const first = buttons[0],
            last = buttons[buttons.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      {box && (
        <div
          className="focus-guide-ring"
          style={{
            left: box.left - 5,
            top: box.top - 5,
            width: box.width + 10,
            height: box.height + 10,
          }}
        />
      )}
      <dialog
        open
        ref={dialog}
        className={
          'focus-guide-dialog ' +
          (box && box.top > window.innerHeight / 2
            ? 'guide-top'
            : 'guide-bottom')
        }
        aria-modal="true"
        aria-labelledby="focus-guide-title"
      >
        <small>
          {paused ? '战斗已暂停' : '操作引导'}
          {total > 1 && ` · ${index + 1}/${total}`}
        </small>
        <h2 id="focus-guide-title">{step.title}</h2>
        <p>{step.body}</p>
        <div>
          {onClose && <button onClick={onClose}>稍后再看</button>}
          <button className="ed-primary" onClick={onNext}>
            {step.next ?? '明白了'}
          </button>
        </div>
      </dialog>
    </div>,
    document.body,
  );
}
export function ContextHint({ step }: { step: GuideStep }) {
  const [open, setOpen] = useState(true);
  return open ? (
    <FocusGuide
      step={step}
      onNext={() => setOpen(false)}
      onClose={() => setOpen(false)}
    />
  ) : (
    <button
      aria-label="重看本步引导"
      className="tutorial-help"
      onClick={() => setOpen(true)}
    >
      ?
    </button>
  );
}
