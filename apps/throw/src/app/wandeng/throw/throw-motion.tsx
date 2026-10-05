'use client';
import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import {
  rankText,
  SUITS,
  type PlayingCard,
} from '../../../lib/cards/throw-poker';
import {
  TICK_MS,
  ITEMS,
  type Shot,
  type ThrowDuel,
} from '../../../lib/cards/throw-duel';
import { Art } from '../wandeng-cards';

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
export function PokerFace({ card }: { card: PlayingCard }) {
  const suitColor = card.suit % 2 ? 'tp-suit-red' : 'tp-suit-black';
  return (
    <>
      <span className="tp-corner">
        <b>{rankText(card.rank)}</b>
        <i className={suitColor}>{SUITS[card.suit]}</i>
      </span>
      <span className="tp-corner tp-corner-bottom" aria-hidden="true">
        <b>{rankText(card.rank)}</b>
        <i className={suitColor}>{SUITS[card.suit]}</i>
      </span>
      <span className={`tp-suit ${suitColor}`}>{SUITS[card.suit]}</span>
      <span className="tp-points" aria-hidden="true">
        {card.rank}
      </span>
    </>
  );
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
  const element = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const origin = flight.origins[index],
    card = flight.shot.cards[index];
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    const from = flight.origins[index],
      target = flight.target;
    const dx = target.x + target.width / 2 - from.x - from.width / 2;
    const dy = target.y + target.height / 2 - from.y - from.height / 2;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const drift = (index - (flight.shot.cards.length - 1) / 2) * 9;
    const direction = Math.sign(dx) || (flight.shot.side === 0 ? 1 : -1);
    const tilt = reduced ? 0 : drift * 1.2;
    const delay = reduced ? 0 : index * 5;
    animation.current = node.animate(
      [
        {
          transform: 'translate(0,0) rotate(0deg) scale(1)',
          opacity: 1,
          offset: 0,
        },
        {
          transform: `translate(${dx * 0.2}px,${dy * 0.24 - 38 - Math.abs(drift) * 0.5}px) rotate(${direction * 22 + tilt}deg) scale(.92)`,
          opacity: 1,
          offset: 0.2,
        },
        {
          transform: `translate(${dx}px,${dy}px) rotate(${tilt * 0.3}deg) scale(.34)`,
          opacity: 1,
          offset: 1,
        },
      ],
      {
        duration:
          (flight.shot.hitTick - flight.shot.startTick) * TICK_MS - delay,
        delay,
        easing: 'cubic-bezier(.16,.66,.26,1)',
        fill: 'both',
      },
    );
    return () => {
      animation.current?.cancel();
    };
  }, [flight, index]);
  useLayoutEffect(() => {
    if (paused) animation.current?.pause();
    else animation.current?.play();
  }, [paused]);
  return (
    <div
      ref={element}
      aria-hidden="true"
      className={`tp-flying-card tp-card ${card.suit % 2 ? 'tp-red' : ''} tp-flying-${flight.shot.side} ${flight.shot.burn ? 'tp-flight-burn' : flight.shot.poison ? 'tp-flight-poison' : flight.shot.kind >= 4 ? 'tp-flight-epic' : ''}`}
      data-flying-uid={card.uid}
      data-shot={flight.shot.id}
      data-origin={`${origin.x},${origin.y}`}
      data-target={`${flight.target.x + flight.target.width / 2},${flight.target.y + flight.target.height / 2}`}
      data-flight-direction={flight.shot.side === 0 ? 'right' : 'left'}
      style={{
        left: origin.x,
        top: origin.y,
        width: origin.width,
        height: origin.height,
      }}
    >
      <PokerFace card={card} />
    </div>
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

/** A single focal celebration joins hand choices, old-object procs and impact. */
export function ThrowSpectacle({ duel }: { duel: ThrowDuel }) {
  const event = duel.events
    .filter((entry) => entry.type === 'launch' && duel.tick - entry.tick < 22)
    .at(-1);
  if (!event) return null;
  const effects = duel.events.filter(
    (entry) =>
      entry.type === 'effect' &&
      entry.side === event.side &&
      entry.tick === event.tick &&
      entry.kind !== 'link',
  );
  if (!(event.combo ?? 0) && !effects.length) return null;
  const epic = (event.combo ?? 0) >= 4;
  const tone = effects.some((entry) => entry.kind === 'burn')
    ? 'burn'
    : effects.some((entry) => entry.kind === 'poison')
      ? 'poison'
      : effects.some((entry) => entry.kind === 'shield')
        ? 'shield'
        : 'gold';
  const tiles = [
    ...new Set(
      effects
        .map(
          (entry) =>
            ITEMS.find((item) => entry.source === 'item:' + item.id)?.tile,
        )
        .filter((tile) => tile !== undefined),
    ),
  ].slice(0, 4);
  return (
    <div
      key={event.id}
      aria-hidden="true"
      className={`tp-spectacle tp-spectacle-${tone} ${epic ? 'tp-spectacle-epic' : ''}`}
      data-spectacle-id={event.id}
      data-side={event.side}
    >
      <div className="tp-spectacle-wave" />
      <div className="tp-spectacle-wave tp-wave-second" />
      <div className="tp-spectacle-streak" />
      <div className="tp-spectacle-streak tp-streak-second" />
      <div className="tp-spectacle-body">
        <small>{event.side === 0 ? '你的连击' : '对手连击'}</small>
        <strong>
          {(event.combo ?? 0) > 0
            ? event.text.split(' · ')[0]
            : effects[0]?.text}
        </strong>
        <div className="tp-spectacle-score">
          {event.value}
          <span>直伤</span>
        </div>
        <div className="tp-spectacle-objects">
          {tiles.map((tile) => (
            <Art key={tile} tile={tile} />
          ))}
        </div>
        <div className="tp-spectacle-effects">
          {effects.slice(0, 5).map((entry) => (
            <span key={entry.id}>
              {entry.text}
              {entry.kind === 'slow'
                ? ` ${entry.value / 1000}s`
                : entry.kind === 'pierce' || entry.kind === 'leech'
                  ? ` ${entry.value}%`
                  : entry.value > 0
                    ? ' +' + entry.value
                    : ''}
            </span>
          ))}
        </div>
      </div>
      {Array.from({ length: 12 }, (_, index) => (
        <i
          className="tp-spectacle-spark"
          key={index}
          style={
            {
              '--spark-angle': `${index * 30}deg`,
              '--spark-distance': `${80 + (index % 3) * 24}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
