'use client';
/* oxlint-disable react/react-compiler -- Measure the spotlight target after layout and on resize. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
export type GuideStep = {
  target: string;
  overview?: boolean;
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
  const [position, setPosition] = useState({
    left: 16,
    top: 16,
    width: 360,
    height: 220,
  });
  useEffect(() => {
    if (step.overview) return;
    const previous = document.activeElement as HTMLElement | null;
    const target = document.querySelector<HTMLElement>(step.target);
    if (!step.overview)
      target?.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'instant',
      });
    const measure = () => {
      const raw = target?.getBoundingClientRect();
      if (!raw) return;
      const r = {
        left: Math.max(12, raw.left),
        top: Math.max(12, raw.top),
        right: Math.min(innerWidth - 12, raw.right),
        bottom: Math.min(innerHeight - 12, raw.bottom),
      };
      const w = Math.min(360, innerWidth - 32),
        h = dialog.current?.offsetHeight ?? 220,
        gap = 22;
      const cx = (r.left + r.right) / 2,
        cy = (r.top + r.bottom) / 2;
      const candidates = [
        [r.right + gap, cy - h / 2],
        [r.left - gap - w, cy - h / 2],
        [cx - w / 2, r.top - gap - h],
        [cx - w / 2, r.bottom + gap],
      ].map(([left, top]) => ({
        left: Math.max(16, Math.min(innerWidth - w - 16, left)),
        top: Math.max(16, Math.min(innerHeight - h - 16, top)),
      }));
      const score = (p: { left: number; top: number }) =>
        Math.max(0, Math.min(p.left + w, r.right) - Math.max(p.left, r.left)) *
          Math.max(0, Math.min(p.top + h, r.bottom) - Math.max(p.top, r.top)) *
          100 +
        Math.hypot(p.left + w / 2 - cx, p.top + h / 2 - cy);
      candidates.sort((a, b) => score(a) - score(b));
      setBox(
        new DOMRect(
          r.left,
          r.top,
          Math.max(1, r.right - r.left),
          Math.max(1, r.bottom - r.top),
        ),
      );
      setPosition({ ...candidates[0], width: w, height: h });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (target) observer.observe(target);
    if (dialog.current) observer.observe(dialog.current);
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
  }, [step.target, step.overview]);
  if (typeof document === 'undefined') return null;
  if (step.overview)
    return (
      <aside className="guide-overview-note" aria-label="房间介绍">
        <div>
          <h2>{step.title}</h2>
          <p>{step.body}</p>
        </div>
        <button className="ed-primary" onClick={onNext}>
          {step.next ?? '明白了'}
        </button>
      </aside>
    );
  return createPortal(
    <div
      role="presentation"
      className={
        'focus-guide-overlay' + (step.overview ? ' guide-overview' : '')
      }
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
      {box && !step.overview && (
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
      {box && !step.overview && (
        <svg className="focus-guide-connector" aria-hidden="true">
          <defs>
            <marker
              id="guide-arrow"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path
                d="M0 0 L8 4 L0 8"
                fill="none"
                stroke="#f1d27e"
                strokeWidth="1.5"
              />
            </marker>
          </defs>
          {(() => {
            const cx = position.left + position.width / 2,
              cy = position.top + position.height / 2;
            const tx = Math.max(box.left, Math.min(box.right, cx)),
              ty = Math.max(box.top, Math.min(box.bottom, cy));
            const sx = Math.max(
                position.left,
                Math.min(position.left + position.width, tx),
              ),
              sy = Math.max(
                position.top,
                Math.min(position.top + position.height, ty),
              );
            return (
              <>
                <path
                  d={`M${sx} ${sy} L${tx} ${ty}`}
                  stroke="#f1d27e"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#guide-arrow)"
                />
                <circle cx={tx} cy={ty} r="4" fill="#f1d27e" />
              </>
            );
          })()}
        </svg>
      )}
      <dialog
        open
        ref={dialog}
        className="focus-guide-dialog anchored-guide"
        style={{
          left: position.left,
          top: position.top,
          width: position.width,
          transform: 'none',
          bottom: 'auto',
        }}
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
export function ContextHint({
  step,
  mandatory = false,
}: {
  step: GuideStep;
  mandatory?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return open ? (
    <FocusGuide
      step={step}
      onNext={() => setOpen(false)}
      onClose={mandatory ? undefined : () => setOpen(false)}
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
