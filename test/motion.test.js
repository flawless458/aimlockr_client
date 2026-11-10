import { describe, expect, it } from 'vitest';
import {
  BASE_MOTION_MS,
  MOTION_SPEED_FACTORS,
  MOTION_SPEEDS,
  motionDuration,
  normalizeMotionSpeed
} from '../src/shared/motion.js';

describe('normalizeMotionSpeed', () => {
  it.each(MOTION_SPEEDS)('keeps %s', (speed) => {
    expect(normalizeMotionSpeed(speed)).toBe(speed);
  });

  it.each(['ultra', '', null, undefined, 42])('falls back for %s', (value) => {
    expect(normalizeMotionSpeed(value)).toBe('normal');
  });
});

describe('motionDuration', () => {
  it('returns zero when animations are disabled', () => {
    expect(motionDuration(false, 'normal')).toBe(0);
    expect(motionDuration(false, 'relaxed')).toBe(0);
  });

  it('scales the base duration', () => {
    expect(motionDuration(true, 'fast')).toBe(Math.round(BASE_MOTION_MS * MOTION_SPEED_FACTORS.fast));
    expect(motionDuration(true, 'normal')).toBe(BASE_MOTION_MS);
    expect(motionDuration(true, 'relaxed')).toBe(Math.round(BASE_MOTION_MS * MOTION_SPEED_FACTORS.relaxed));
  });

  it('treats unknown speeds as normal', () => {
    expect(motionDuration(true, 'nope')).toBe(BASE_MOTION_MS);
  });
});
