'use client';
import { useEffect, type RefObject } from 'react';
import { advanceReplay, replayFrameIndex } from '@/lib/cards/playback';

export function useArenaPlayback({
  playing,
  speed,
  duration,
  count,
  clock,
  onFrame,
  onComplete,
}: {
  playing: boolean;
  speed: number;
  duration: number;
  count: number;
  clock: RefObject<number>;
  onFrame: (index: number) => void;
  onComplete: () => void;
}) {
  useEffect(() => {
    if (!playing) return;
    let handle = 0,
      previous = performance.now();
    const tick = (now: number) => {
      clock.current = advanceReplay(
        clock.current,
        now - previous,
        speed,
        duration,
      );
      previous = now;
      onFrame(replayFrameIndex(clock.current, count));
      if (clock.current < duration) handle = requestAnimationFrame(tick);
      else onComplete();
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing, speed, duration, count, clock, onFrame, onComplete]);
}
