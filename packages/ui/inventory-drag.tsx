'use client';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
} from 'react';

export type DragSource = {
  id: string;
  data: DOMStringMap;
  x: number;
  y: number;
};
export type DropBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type DropTarget<T> = { value: T; bounds: DropBounds };
type Props<T> = {
  children: ReactNode;
  className?: string;
  resolve: (
    root: HTMLDivElement,
    source: DragSource,
    x: number,
    y: number,
  ) => DropTarget<T> | null;
  canDrop: (source: DragSource, target: T) => boolean;
  onDrop: (source: DragSource, target: T) => void;
  renderGhost: (source: DragSource, valid: boolean) => ReactNode;
  ghostClassName?: string;
  highlightClassName?: string;
};

/** Pointer capture, drag threshold and click suppression shared with the elevator inventory. */
export default function InventoryDrag<T>({
  children,
  className = 'inventory-drag-root',
  resolve,
  canDrop,
  onDrop,
  renderGhost,
  ghostClassName = 'inventory-drag-ghost',
  highlightClassName = 'inventory-drop-highlight',
}: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef<{
    source: DragSource;
    active: boolean;
    pointer: number;
  } | null>(null);
  const suppress = useRef(false);
  const [ghost, setGhost] = useState<{
    source: DragSource;
    x: number;
    y: number;
    valid: boolean;
    target: DropTarget<T> | null;
  } | null>(null);
  useEffect(() => {
    const reset = () => {
      const pointer = pending.current?.pointer;
      suppress.current = pending.current?.active ?? false;
      pending.current = null;
      if (pointer !== undefined && root.current?.hasPointerCapture(pointer))
        root.current.releasePointerCapture(pointer);
      setGhost(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') reset();
    };
    window.addEventListener('blur', reset);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('blur', reset);
      window.removeEventListener('keydown', escape);
    };
  }, []);
  const down = (event: PointerEvent<HTMLDivElement>) => {
    const element = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-drag-uid]',
    );
    if (!element || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppress.current = false;
    pending.current = {
      source: {
        id: element.dataset.dragUid!,
        data: Object.fromEntries(Object.entries(element.dataset)),
        x: event.clientX,
        y: event.clientY,
      },
      active: false,
      pointer: event.pointerId,
    };
  };
  return (
    <div
      ref={root}
      className={className}
      data-inventory-drag-active={!!ghost}
      onPointerDownCapture={down}
      onPointerMoveCapture={(event) => {
        const drag = pending.current;
        if (!drag || drag.pointer !== event.pointerId) return;
        event.stopPropagation();
        if (
          !drag.active &&
          Math.hypot(
            event.clientX - drag.source.x,
            event.clientY - drag.source.y,
          ) < 5
        )
          return;
        if (!drag.active) {
          drag.active = true;
          root.current!.setPointerCapture(event.pointerId);
        }
        const target = resolve(
          root.current!,
          drag.source,
          event.clientX,
          event.clientY,
        );
        setGhost({
          source: drag.source,
          x: event.clientX,
          y: event.clientY,
          valid: !!target && canDrop(drag.source, target.value),
          target,
        });
      }}
      onPointerUpCapture={(event) => {
        const drag = pending.current;
        if (!drag || drag.pointer !== event.pointerId) return;
        event.stopPropagation();
        if (drag.active) {
          suppress.current = true;
          const target = resolve(
            root.current!,
            drag.source,
            event.clientX,
            event.clientY,
          );
          if (target && canDrop(drag.source, target.value))
            onDrop(drag.source, target.value);
        }
        pending.current = null;
        if (root.current!.hasPointerCapture(event.pointerId))
          root.current!.releasePointerCapture(event.pointerId);
        setGhost(null);
      }}
      onPointerCancelCapture={() => {
        pending.current = null;
        setGhost(null);
      }}
      onLostPointerCapture={() => {
        pending.current = null;
        setGhost(null);
      }}
      onClickCapture={(event) => {
        if (suppress.current) {
          event.stopPropagation();
          event.preventDefault();
          suppress.current = false;
        }
      }}
    >
      {children}
      {ghost?.target && (
        <div
          className={`${highlightClassName} ${ghost.valid ? 'valid' : 'invalid'}`}
          aria-hidden="true"
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 10000,
            left: ghost.target.bounds.x,
            top: ghost.target.bounds.y,
            width: ghost.target.bounds.width,
            height: ghost.target.bounds.height,
          }}
        />
      )}
      {ghost && (
        <div
          className={`${ghostClassName} ${ghost.valid ? 'valid' : 'invalid'}`}
          aria-hidden="true"
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 10001,
            left: ghost.x + 12,
            top: ghost.y + 12,
          }}
        >
          {renderGhost(ghost.source, ghost.valid)}
        </div>
      )}
    </div>
  );
}
