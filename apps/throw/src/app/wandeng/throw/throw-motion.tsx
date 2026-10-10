'use client';
import { useLayoutEffect, useRef } from 'react';
import { TICK_MS, type Shot } from '../../../lib/cards/throw-duel';
import { CardFace } from '../../stage/card-art';

export type CardRect = { x: number; y: number; width: number; height: number };
export type TableGeometry = {
  cards: Record<string, CardRect>;
  hosts: [CardRect, CardRect];
  decks: [CardRect, CardRect];
};
export type VisualShot = { shot: Shot; origins: CardRect[]; target: CardRect };
const rect = (element: Element | null): CardRect => {
  const bounds = element?.getBoundingClientRect();
  return bounds
    ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    : { x: 0, y: 0, width: 48, height: 64 };
};
export function captureTableGeometry(): TableGeometry {
  const cards: Record<string, CardRect> = {};
  document
    .querySelectorAll<HTMLElement>('.tp-battle [data-card-id]')
    .forEach((element) => {
      cards[element.dataset.cardId!] = rect(element);
    });
  return {
    cards,
    hosts: [
      rect(document.querySelector('[data-host="0"]')),
      rect(document.querySelector('[data-host="1"]')),
    ],
    decks: [
      rect(document.querySelector('[data-deck="0"]')),
      rect(document.querySelector('[data-deck="1"]')),
    ],
  };
}
export function makeVisualShot(
  shot: Shot,
  geometry: TableGeometry,
): VisualShot {
  return {
    shot,
    origins: shot.cards.map(
      (card) => geometry.cards[card.uid] ?? geometry.decks[shot.side],
    ),
    target: geometry.hosts[shot.side === 0 ? 1 : 0],
  };
}
/** Sample a thrown card along a lifted quadratic arc with a flick spin. */
function flightFrames(
  from: CardRect,
  target: CardRect,
  index: number,
  count: number,
  side: 0 | 1,
  reduced: boolean,
) {
  const dx = target.x + target.width / 2 - from.x - from.width / 2;
  const dy = target.y + target.height * 0.42 - from.y - from.height / 2;
  const spread = (index - (count - 1) / 2) * 14;
  const lift = reduced ? 0 : -Math.min(260, 90 + Math.abs(dx) * 0.22) + Math.abs(spread) * 0.6;
  const cx = dx * 0.45 + spread * 2.2;
  const cy = Math.min(0, dy) + lift;
  const direction = Math.sign(dx) || (side === 0 ? 1 : -1);
  const spin = reduced ? 0 : direction * (300 + (index % 3) * 60);
  const frames: Keyframe[] = [];
  const steps = reduced ? 1 : 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = 2 * u * t * cx + t * t * dx;
    const y = 2 * u * t * cy + t * t * dy;
    // Ease the spin: quick release, settling into the target.
    const turn = spin * (1 - Math.pow(1 - t, 2.2));
    const scale = 1 - 0.5 * t + 0.12 * Math.sin(t * Math.PI);
    frames.push({
      transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${turn.toFixed(1)}deg) scale(${scale.toFixed(3)})`,
      opacity: t > 0.94 ? 0.2 : 1,
      offset: t,
    });
  }
  return frames;
}
function FlyingCard({
  flight,
  index,
  paused,
}: {
  flight: VisualShot;
  index: number;
  paused: boolean;
}) {
  const card = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  const origin = flight.origins[index],
    playing = flight.shot.cards[index];
  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frames = flightFrames(
      flight.origins[index],
      flight.target,
      index,
      flight.shot.cards.length,
      flight.shot.side,
      reduced,
    );
    const delay = reduced ? 0 : index * 22;
    const duration = Math.max(
      120,
      (flight.shot.hitTick - flight.shot.startTick) * TICK_MS - delay,
    );
    const timing: KeyframeAnimationOptions = {
      duration,
      delay,
      easing: 'cubic-bezier(.3,.05,.45,1)',
      fill: 'both',
    };
    animations.current = [
      card.current!.animate(frames, timing),
      ...(trail.current && !reduced
        ? [trail.current.animate(frames, { ...timing, delay: delay + 34 })]
        : []),
    ];
    return () => animations.current.forEach((animation) => animation.cancel());
  }, [flight, index]);
  useLayoutEffect(() => {
    animations.current.forEach((animation) =>
      paused ? animation.pause() : animation.play(),
    );
  }, [paused]);
  const tone = flight.shot.burn
    ? 'tp-flight-burn'
    : flight.shot.poison
      ? 'tp-flight-poison'
      : flight.shot.kind >= 4
        ? 'tp-flight-epic'
        : '';
  const box = {
    left: origin.x,
    top: origin.y,
    width: origin.width,
    height: origin.height,
  };
  return (
    <>
      <div ref={trail} aria-hidden="true" className={`tp-flying-trail ${tone}`} style={box} />
      <div
        ref={card}
        aria-hidden="true"
        className={`tp-flying-card ${tone} tp-flying-${flight.shot.side}`}
        data-flying-uid={playing.uid}
        data-shot={flight.shot.id}
        data-origin={`${origin.x},${origin.y}`}
        data-target={`${flight.target.x + flight.target.width / 2},${flight.target.y + flight.target.height / 2}`}
        data-flight-direction={flight.shot.side === 0 ? 'right' : 'left'}
        style={box}
      >
        <CardFace card={playing} />
      </div>
    </>
  );
}
export function FlightLayer({
  flights,
  paused,
}: {
  flights: VisualShot[];
  paused: boolean;
}) {
  return (
    <div className="tp-flight-layer">
      {flights.flatMap((flight) =>
        flight.shot.cards.map((card, index) => (
          <FlyingCard
            key={`${flight.shot.id}/${card.uid}`}
            flight={flight}
            index={index}
            paused={paused}
          />
        )),
      )}
    </div>
  );
}
