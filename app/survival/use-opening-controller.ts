'use client';
import { advanceDialogue, dialogueCue } from '@/lib/survival-opening';
import { afterlightLine } from '@/lib/survival-afterlight';
import { guidePaused } from '@/lib/survival-guidance';
import { racePaused } from '@/lib/survival-race';
import {
  createSeasonOpening,
  openingAction,
  ROBOT_LINES,
  stepOpeningDialogue,
  type OpeningAction,
} from '@/lib/survival-opening';
import {
  presentationFrame,
  retargetPresentation,
} from '@/lib/survival-presentation';
import { STEP, type Point } from '@/lib/survival-room';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type SystemTab } from './lift-system';
import { OpeningAudio } from './opening-audio';
import { useOpeningCheckpoint } from './use-opening-checkpoint';

/** Simulation, input, pause and terminal orchestration; UI is rendered by OpeningDemo. */
export function useOpeningController() {
  const [state, setState] = useState(createSeasonOpening),
    opening = useRef(state),
    world = useRef(state.room);
  const presentation = useRef(presentationFrame(state.room));
  const [designSystem, setDesignSystem] = useState(false);
  const [saved, setSaved, replaceCheckpoint] = useOpeningCheckpoint(opening);
  const [upgradeShow, setUpgradeShow] = useState<number | null>(null);
  const upgradeActive = useRef(false);
  useEffect(() => {
    upgradeActive.current = upgradeShow !== null;
  }, [upgradeShow]);
  const [consoleTab, setConsoleTab] = useState<SystemTab>('upgrade');
  const [gm, setGM] = useState(false);
  const [terminal, setTerminal] = useState(false),
    terminalRef = useRef(false);
  const [ready, setReady] = useState(false),
    [paused, setPaused] = useState(false),
    pauseRef = useRef(false);
  const [reduced, setReduced] = useState(false),
    [muted, setMuted] = useState(false),
    [generation, setGeneration] = useState(0);
  const keys = useRef(new Set<string>()),
    audio = useRef<OpeningAudio | null>(null),
    pauseDialog = useRef<HTMLDialogElement>(null);
  const [autoDialogue, setAutoDialogue] = useState(false);
  const playback = useRef({ auto: false, dismissed: null as string | null });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const commit = useCallback((next: typeof state) => {
    opening.current = next;
    world.current = next.room;
    presentation.current = retargetPresentation(
      presentation.current,
      next.room,
    );
    setState(next);
  }, []);
  const act = useCallback(
    (a: OpeningAction) => {
      if (!pauseRef.current || a.type === 'ack-guide') {
        const before = opening.current,
          next = openingAction(before, a);
        if (next.room.seed !== before.room.seed) {
          setReady(false);
          audio.current?.stopMusic();
        }
        if (
          (next.afterlight.breadEaten && !before.afterlight.breadEaten) ||
          (before.stage === 'home' && next.stage === 'second-departing')
        ) {
          // The meal ends on the main view so the newly revealed needs are seen.
          terminalRef.current = false;
          setTerminal(false);
          keys.current.clear();
          audio.current?.voice();
        }
        if (
          (a.type === 'feed-core' && next !== before) ||
          ((a.type === 'upgrade-lift' || a.type === 'feed-lift') &&
            !next.race &&
            next.room.liftLevel !== before.room.liftLevel)
        ) {
          terminalRef.current = false;
          setTerminal(false);
          keys.current.clear();
          setUpgradeShow(a.type === 'feed-core' ? 1 : 2);
          audio.current?.upgrade();
        }
        commit(next);
        if (
          next.race &&
          next.race.scene !== 'live' &&
          next.race.scene !== before.race?.scene
        ) {
          terminalRef.current = false;
          setTerminal(false);
          keys.current.clear();
          audio.current?.programme(next.race.scene);
        }
        if (
          (a.type === 'upgrade-race' || a.type === 'feed-lift') &&
          next.room.liftLevel !== before.room.liftLevel
        ) {
          terminalRef.current = false;
          setTerminal(false);
          keys.current.clear();
          setUpgradeShow(next.room.liftLevel!);
          audio.current?.upgrade();
        }
      }
    },
    [commit],
  );
  const changeTerminal = useCallback((value: boolean) => {
    terminalRef.current = value;

    keys.current.clear();
    setTerminal(value);
  }, []);
  const openTerminal = useCallback(() => {
    const s = opening.current;
    if (
      pauseRef.current ||
      guidePaused(opening.current.guidance) ||
      racePaused(opening.current.race)
    )
      return;
    if (s.stage === 'home' && s.homecoming.scene === 'mouth') {
      act({ type: 'open-mouth' });
      setConsoleTab('upgrade');
      changeTerminal(true);
    } else if (
      s.stage === 'expedition' ||
      (s.stage === 'home' && s.homecoming.scene === 'complete')
    ) {
      setConsoleTab(
        s.stage === 'expedition' ||
          ['safe', 'eat-food', 'equip-module'].includes(s.afterlight.phase)
          ? 'inventory'
          : 'upgrade',
      );
      changeTerminal(true);
    }
  }, [act, changeTerminal]);
  const door = useCallback(() => {
    if (
      pauseRef.current ||
      terminalRef.current ||
      guidePaused(opening.current.guidance)
    )
      return;
    const s = opening.current;
    act({ type: 'open-door' });
    if (s.stage === 'home' && opening.current.lift.choosingFloor) {
      setConsoleTab('floors');
      changeTerminal(true);
    }
  }, [act, changeTerminal]);
  const setPause = useCallback((value: boolean) => {
    pauseRef.current = value;
    keys.current.clear();
    setPaused(value);
    audio.current?.pause(value);
  }, []);
  const restart = () => {
    changeTerminal(false);
    audio.current?.close();
    audio.current?.start();
    audio.current?.mute(muted);
    setReady(false);
    const next = openingAction(createSeasonOpening(), { type: 'enter' });
    replaceCheckpoint(next);
    commit(next);
    setPause(false);
    setGeneration((n) => n + 1);
  };
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const frame = requestAnimationFrame(() => setReduced(media.matches));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    audio.current = new OpeningAudio();
    return () => {
      audio.current?.close();
    };
  }, []);
  const pauseVisible = paused;
  useEffect(() => {
    if (!pauseVisible || gm || designSystem) return;
    const panel = pauseDialog.current;
    const previous = document.activeElement as HTMLElement | null;
    panel?.showModal();
    panel?.querySelector('button')?.focus();
    return () => {
      panel?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [pauseVisible, gm, designSystem]);
  useEffect(() => {
    if (!ready) return;
    let frame = 0,
      previous = 0,
      accumulator = 0;
    const update = (time: number) => {
      const dt = previous ? Math.min(0.1, (time - previous) / 1000) : 0;
      previous = time;
      if (
        !pauseRef.current &&
        !upgradeActive.current &&
        !document.hidden &&
        (!terminalRef.current ||
          (opening.current.stage === 'home' &&
            !opening.current.race &&
            !opening.current.season))
      ) {
        accumulator += dt;
        while (accumulator >= STEP) {
          const before = opening.current;
          const next = stepOpeningDialogue(
            before,
            {
              interact: keys.current.has('KeyE'),
              x:
                Number(
                  keys.current.has('KeyD') || keys.current.has('ArrowRight'),
                ) -
                Number(
                  keys.current.has('KeyA') || keys.current.has('ArrowLeft'),
                ),
              z:
                Number(
                  keys.current.has('KeyS') || keys.current.has('ArrowDown'),
                ) -
                Number(keys.current.has('KeyW') || keys.current.has('ArrowUp')),
            },
            playback.current.auto,
            playback.current.dismissed,
          );
          if (
            next.afterlight.phase !== before.afterlight.phase &&
            afterlightLine(next.afterlight)
          )
            audio.current?.voice();
          for (const fx of next.room.effects)
            if (!before.room.effects.some((old) => old.id === fx.id))
              audio.current?.skill(fx.kind);
          if (next.afterlight.tracesSeen && !before.afterlight.tracesSeen)
            audio.current?.growl();
          if (
            next.race?.scene !== before.race?.scene &&
            next.race?.scene &&
            next.race.scene !== 'live'
          ) {
            changeTerminal(false);
            audio.current?.programme(next.race.scene);
          }
          if (
            next.race?.events.at(-1)?.id !== before.race?.events.at(-1)?.id &&
            next.race?.events.at(-1)?.kind === 'passes'
          )
            audio.current?.programme('passes');
          if (
            next.stage === 'home' &&
            before.stage !== 'home' &&
            next.afterlight.phase === 'report' &&
            !racePaused(next.race)
          ) {
            setConsoleTab('tasks');
            changeTerminal(true);
          }
          if (next.stage === 'rustle' && before.stage !== 'rustle')
            audio.current?.growl();
          if (
            next.stage === 'home' &&
            next.homecoming.scene !== before.homecoming.scene
          ) {
            if (next.homecoming.scene === 'scare') audio.current?.thunder();
            if (next.homecoming.scene === 'welcome') audio.current?.warmMusic();
            if (ROBOT_LINES[next.homecoming.scene]) audio.current?.voice();
            if (next.homecoming.scene === 'thanks') changeTerminal(false);
            if (
              next.homecoming.scene === 'complete' &&
              next.afterlight.phase === 'report'
            )
              changeTerminal(true);
          }
          presentation.current.previous = before.room;
          presentation.current.current = next.room;
          opening.current = next;
          world.current = next.room;
          accumulator -= STEP;
          if (next !== before) setState(next);
        }
        presentation.current.alpha = accumulator / STEP;
      } else accumulator = 0;
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [ready, changeTerminal]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        opening.current.season?.phase === 'victory' ||
        opening.current.season?.phase === 'defeat'
      )
        return;
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if ((e.target as HTMLElement).closest('.f9-design-system, .gm-panel'))
        return;
      if (terminalRef.current) return;
      if (racePaused(opening.current.race)) {
        if (e.code === 'Escape' && !e.repeat) {
          e.preventDefault();
          setPause(!pauseRef.current);
        }
        return;
      }
      if (guidePaused(opening.current.guidance)) {
        if (e.code === 'Escape') e.preventDefault();
        return;
      }
      if (
        (e.code === 'KeyF' && opening.current.stage === 'home') ||
        (e.code === 'KeyB' && opening.current.stage === 'expedition')
      ) {
        e.preventDefault();
        openTerminal();
        return;
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        if (!e.repeat) setPause(!pauseRef.current);
        return;
      }
      if (pauseRef.current || guidePaused(opening.current.guidance)) return;
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
        ].includes(e.code)
      ) {
        e.preventDefault();
        keys.current.add(e.code);
      }
      if (e.code === 'KeyE' && !e.repeat) {
        e.preventDefault();
        keys.current.add('KeyE');
        if (opening.current.stage === 'equip-light')
          act({ type: 'equip-light' });
        else if (
          opening.current.stage === 'home' &&
          opening.current.afterlight.phase === 'recover-opening'
        )
          door();
        else if (
          opening.current.stage === 'home' &&
          opening.current.homecoming.scene === 'complete'
        )
          door();
        else if (
          ['aftermath', 'return', 'expedition'].includes(opening.current.stage)
        )
          act({ type: 'return' });
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => {
      keys.current.clear();
      if (guidePaused(opening.current.guidance)) return;
      if (opening.current.stage !== 'waiting') setPause(true);
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [act, setPause, openTerminal, door]);
  const move = useCallback(
    (point: Point) => act({ type: 'move', to: point }),
    [act],
  );
  const edgeSpawns = useCallback(
    (points: Point[]) => act({ type: 'edge-spawns', points }),
    [act],
  );

  const controls = {
    auto: autoDialogue,
    toggle: () => {
      playback.current.auto = !autoDialogue;
      setAutoDialogue(!autoDialogue);
      commit({ ...opening.current, dialogueAuto: !autoDialogue });
    },
    skip: () => {
      if (pauseRef.current) return;
      const current = dialogueCue(opening.current);
      playback.current.dismissed = current?.key || null;
      setDismissed(current?.key || null);
      const before = opening.current;
      const next = advanceDialogue(before);
      if (
        before.homecoming.scene === 'upgrade' &&
        next.homecoming.scene !== 'upgrade'
      )
        changeTerminal(false);
      commit(next);
    },
  };
  const resetDialogue = () => {
    playback.current.dismissed = null;
    setDismissed(null);
  };
  return {
    state,
    opening,
    world,
    presentation,
    designSystem,
    setDesignSystem,
    saved,
    setSaved,
    upgradeShow,
    setUpgradeShow,
    consoleTab,
    setConsoleTab,
    gm,
    setGM,
    terminal,
    ready,
    setReady,
    paused,
    pauseRef,
    reduced,
    setReduced,
    muted,
    setMuted,
    generation,
    setGeneration,
    keys,
    audio,
    pauseDialog,
    autoDialogue,
    setAutoDialogue,
    dismissed,
    controls,
    resetDialogue,
    commit,
    act,
    changeTerminal,
    openTerminal,
    door,
    setPause,
    restart,
    pauseVisible,
    move,
    edgeSpawns,
  };
}
