import type { HomecomingScene } from './survival-opening.ts';
const ease = (t: number) => {
  const n = Math.max(0, Math.min(1, t));
  return n * n * (3 - 2 * n);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Physical cabin-local coordinates; no frame-rate-dependent accumulated camera drift. */
export function homecomingCamera(
  scene: HomecomingScene,
  tick: number,
  reduced = false,
) {
  let x = 0,
    y = 1.58,
    z = 0.22,
    yaw = 0,
    pitch = -0.12,
    roll = 0;
  if (scene === 'look-right') yaw = mix(0, -0.92, ease(tick / 60));
  else if (scene === 'look-left') yaw = mix(-0.92, 1.22, ease(tick / 60));
  else if (!['rest', 'complete'].includes(scene)) yaw = 1.22;
  if (scene === 'approach') {
    const t = ease(tick / 75);
    x = mix(0, 0.06, t);
    y = mix(1.58, 1.52, t);
    z = mix(0.22, -0.1, t);
    yaw = mix(1.22, 1.32, t);
    pitch = mix(-0.12, -0.18, t);
  }
  const later = [
    'scare',
    'plead',
    'welcome',
    'logo',
    'ai-thought',
    'warning',
    'silence',
    'threat',
    'ellipsis',
    'settlement',
    'request',
    'mouth',
    'feed',
    'upgrade',
    'thanks',
    'lights',
  ];
  if (later.includes(scene)) {
    x = 0.06;
    y = 1.52;
    z = -0.1;
    yaw = 1.32;
    pitch = -0.18;
  }
  if (scene === 'scare') {
    const t = reduced ? 0.35 : ease(tick / 9);
    x = mix(0.06, 0.1, t);
    y = mix(1.52, 1.62, t);
    z = mix(-0.1, 0.22, t);
    pitch = -0.18 + 0.14 * t;
    if (!reduced) {
      roll = Math.sin(tick * 1.2) * 0.045 * Math.exp(-tick / 23);
      yaw += Math.sin(tick * 0.81) * 0.03 * Math.exp(-tick / 22);
    }
  }
  if (scene === 'plead') {
    const t = ease(tick / 100);
    x = mix(0.1, 0.06, t);
    y = mix(1.62, 1.52, t);
    z = mix(0.22, -0.1, t);
    pitch = mix(-0.04, -0.18, t);
  }
  if (scene === 'lights') {
    const t = ease(tick / 90);
    x = mix(0.06, 0, t);
    y = mix(1.52, 1.58, t);
    z = mix(-0.1, 0.22, t);
    yaw = mix(1.32, 0, t);
    pitch = mix(-0.18, 0.16, t);
  }
  return { x, y, z, yaw, pitch, roll };
}
