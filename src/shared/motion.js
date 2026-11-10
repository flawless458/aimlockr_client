export const MOTION_SPEEDS = Object.freeze(['fast', 'normal', 'relaxed']);

/** @type {Readonly<Record<string, string>>} */
export const MOTION_SPEED_LABELS = Object.freeze({
  fast: 'Fast',
  normal: 'Normal',
  relaxed: 'Relaxed'
});

/** @type {Readonly<Record<string, number>>} */
export const MOTION_SPEED_FACTORS = Object.freeze({
  fast: 0.7,
  normal: 1,
  relaxed: 1.45
});

export const BASE_MOTION_MS = 220;

/**
 * @param {unknown} value
 * @returns {string}
 */
export const normalizeMotionSpeed = (value) =>
  typeof value === 'string' && MOTION_SPEEDS.includes(value) ? value : 'normal';

/**
 * @param {boolean} animations
 * @param {string} speed
 * @returns {number}
 */
export const motionDuration = (animations, speed) => {
  if (!animations) return 0;
  const factor = MOTION_SPEED_FACTORS[normalizeMotionSpeed(speed)] ?? 1;
  return Math.round(BASE_MOTION_MS * factor);
};
