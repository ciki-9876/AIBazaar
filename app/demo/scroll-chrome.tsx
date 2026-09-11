'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
type Bar = {
  id: string;
  el: HTMLElement;
  axis: 'x' | 'y';
  left: number;
  top: number;
  length: number;
  thumb: number;
  offset: number;
  max: number;
  value: number;
};
export default function ScrollChrome() {
  const [bars, setBars] = useState<Bar[]>([]),
    [mounted, setMounted] = useState(false);
  const drag = useRef<{ bar: Bar; start: number; value: number } | null>(null);
  useEffect(() => {
    let frame = 0,
      serial = 0;
    const ids = new WeakMap<HTMLElement, string>(),
      observed = new Set<Element>();
    const measure = () => {
      frame = 0;
      setMounted(true);
      if (document.querySelector('.ed-sleep-film')) {
        setBars([]);
        return;
      }
      const modal = document.querySelector(
        '[role="dialog"][data-state="open"]',
      );
      const next: Bar[] = [];
      document
        .querySelectorAll<HTMLElement>(
          '.elevator-demo, .elevator-demo *, .ed-dialog, .ed-dialog *',
        )
        .forEach((el) => {
          if (modal && !modal.contains(el)) return;
          const style = getComputedStyle(el),
            r = el.getBoundingClientRect();
          if (!r.width || !r.height || style.visibility === 'hidden') return;
          const x =
            ['auto', 'scroll'].includes(style.overflowX) &&
            el.scrollWidth > el.clientWidth + 1;
          const y =
            ['auto', 'scroll'].includes(style.overflowY) &&
            el.scrollHeight > el.clientHeight + 1;
          if (!x && !y) return;
          if (!observed.has(el)) {
            resize.observe(el);
            observed.add(el);
          }
          let left = Math.max(0, r.left),
            right = Math.min(innerWidth, r.right),
            top = Math.max(0, r.top),
            bottom = Math.min(innerHeight, r.bottom);
          for (
            let parent = el.parentElement;
            parent && parent !== document.body;
            parent = parent.parentElement
          ) {
            const ps = getComputedStyle(parent),
              pr = parent.getBoundingClientRect();
            if (ps.overflowX !== 'visible') {
              left = Math.max(left, pr.left);
              right = Math.min(right, pr.right);
            }
            if (ps.overflowY !== 'visible') {
              top = Math.max(top, pr.top);
              bottom = Math.min(bottom, pr.bottom);
            }
          }
          if (right - left < 20 || bottom - top < 20) return;
          let id = ids.get(el);
          if (!id) {
            id = 'f9-scroll-' + serial++;
            ids.set(el, id);
            if (!el.id) el.id = id;
          }
          for (const axis of ['x', 'y'] as const) {
            if (!(axis === 'x' ? x : y)) continue;
            const length = (axis === 'x' ? right - left : bottom - top) - 8;
            const total = axis === 'x' ? el.scrollWidth : el.scrollHeight,
              visible = axis === 'x' ? el.clientWidth : el.clientHeight;
            const value = axis === 'x' ? el.scrollLeft : el.scrollTop,
              max = total - visible,
              thumb = Math.min(
                length,
                Math.max(24, (length * visible) / total),
              );
            next.push({
              id: id + axis,
              el,
              axis,
              left: axis === 'x' ? left + 4 : right - 9,
              top: axis === 'x' ? bottom - 9 : top + 4,
              length,
              thumb,
              offset: ((length - thumb) * value) / max,
              max,
              value,
            });
          }
        });
      for (const el of observed)
        if (!el.isConnected) {
          resize.unobserve(el);
          observed.delete(el);
        }
      setBars(next);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule),
      mutation = new MutationObserver(schedule);
    const root = document.querySelector('.elevator-demo');
    if (root) {
      mutation.observe(root, { subtree: true, childList: true });
      resize.observe(root);
    }
    const portals = new MutationObserver(schedule);
    portals.observe(document.body, { childList: true });
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const delta = (d.bar.axis === 'x' ? e.clientX : e.clientY) - d.start;
      const value =
        d.value + (delta * d.bar.max) / Math.max(1, d.bar.length - d.bar.thumb);
      if (d.bar.axis === 'x') d.bar.el.scrollLeft = value;
      else d.bar.el.scrollTop = value;
    };
    const end = () => {
      drag.current = null;
    };
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      portals.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="ed-scroll-chrome">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={'ed-scroll-rail ' + bar.axis}
          style={{
            left: bar.left,
            top: bar.top,
            width: bar.axis === 'x' ? bar.length : 7,
            height: bar.axis === 'y' ? bar.length : 7,
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            const pos =
              bar.axis === 'x' ? e.clientX - r.left : e.clientY - r.top;
            const value =
              ((pos - bar.thumb / 2) * bar.max) /
              Math.max(1, bar.length - bar.thumb);
            if (bar.axis === 'x') bar.el.scrollLeft = value;
            else bar.el.scrollTop = value;
          }}
        >
          <div
            className="ed-scroll-thumb"
            role="scrollbar"
            tabIndex={0}
            aria-label={bar.axis === 'y' ? '垂直滚动' : '水平滚动'}
            aria-controls={bar.el.id}
            aria-orientation={bar.axis === 'x' ? 'horizontal' : 'vertical'}
            aria-valuemin={0}
            aria-valuemax={Math.round(bar.max)}
            aria-valuenow={Math.round(bar.value)}
            style={
              bar.axis === 'x'
                ? { left: bar.offset, width: bar.thumb }
                : { top: bar.offset, height: bar.thumb }
            }
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                bar,
                start: bar.axis === 'x' ? e.clientX : e.clientY,
                value: bar.value,
              };
            }}
            onKeyDown={(e) => {
              let value = bar.value;
              if (['ArrowDown', 'ArrowRight'].includes(e.key)) value += 40;
              else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) value -= 40;
              else if (e.key === 'PageDown') value += bar.length;
              else if (e.key === 'PageUp') value -= bar.length;
              else if (e.key === 'Home') value = 0;
              else if (e.key === 'End') value = bar.max;
              else return;
              e.preventDefault();
              if (bar.axis === 'x') bar.el.scrollLeft = value;
              else bar.el.scrollTop = value;
            }}
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}
