'use client';
import { useCallback, useEffect, useState, type RefObject } from 'react';
import {
  OPENING_SAVE_KEY,
  readOpeningCheckpoint,
  serializeOpeningCheckpoint,
} from '@/lib/survival-checkpoint';
import type { OpeningState } from '@/lib/survival-opening';

export function useOpeningCheckpoint(opening: RefObject<OpeningState>) {
  const [saved, setSaved] = useState<OpeningState | null>(null);
  const replaceCheckpoint = useCallback((next: OpeningState) => {
    setSaved(null);
    try {
      localStorage.setItem(OPENING_SAVE_KEY, serializeOpeningCheckpoint(next));
    } catch {
      /* The new live season remains playable if storage is unavailable. */
    }
  }, []);
  useEffect(() => {
    let lastSaved: OpeningState | null = null;
    const checkSave = requestAnimationFrame(() => {
      try {
        const data = localStorage.getItem(OPENING_SAVE_KEY);
        if (data) setSaved(readOpeningCheckpoint(data));
      } catch {
        /* Private storage leaves the live session playable. */
      }
    });
    const persist = () => {
      const current = opening.current;
      if (current.stage === 'waiting' || current === lastSaved) return;
      try {
        localStorage.setItem(
          OPENING_SAVE_KEY,
          serializeOpeningCheckpoint(current),
        );
        lastSaved = current;
      } catch {
        /* Retry on the next checkpoint if storage becomes available. */
      }
    };
    const interval = window.setInterval(persist, 2500);
    window.addEventListener('pagehide', persist);
    return () => {
      cancelAnimationFrame(checkSave);
      clearInterval(interval);
      window.removeEventListener('pagehide', persist);
    };
  }, [opening]);
  return [saved, setSaved, replaceCheckpoint] as const;
}
