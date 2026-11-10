import { describe, expect, it } from 'vitest';
import {
  BASE_SCALE_RANGE,
  BASE_VIEWPORT,
  MENU_BASE_SIZE,
  baseMenuScale,
  effectiveMenuScale,
  fitMenuScale
} from '../src/shared/scale.js';

describe('baseMenuScale', () => {
  it('is 1 at the reference viewport', () => {
    expect(baseMenuScale(BASE_VIEWPORT.width, BASE_VIEWPORT.height)).toBe(1);
  });

  it('grows on larger viewports', () => {
    expect(baseMenuScale(1920, 1080)).toBe(1.45);
    expect(baseMenuScale(2560, 1440)).toBe(1.45);
    expect(baseMenuScale(1600, 900)).toBeCloseTo(1.25);
  });

  it('shrinks on smaller viewports', () => {
    expect(baseMenuScale(1024, 600)).toBe(0.85);
    expect(baseMenuScale(1100, 700)).toBeCloseTo(0.859375);
  });

  it('clamps to the supported range', () => {
    expect(baseMenuScale(100, 100)).toBe(BASE_SCALE_RANGE.min);
    expect(baseMenuScale(8000, 8000)).toBe(BASE_SCALE_RANGE.max);
  });

  it('uses the smaller axis', () => {
    expect(baseMenuScale(2560, 720)).toBe(1);
    expect(baseMenuScale(1280, 1440)).toBe(1);
  });

  it('falls back for invalid input', () => {
    expect(baseMenuScale(Number.NaN, Number.NaN)).toBe(1);
    expect(baseMenuScale(undefined, undefined)).toBe(1);
  });
});

describe('effectiveMenuScale', () => {
  it('multiplies the user scale by the viewport scale', () => {
    expect(effectiveMenuScale(100, 1280, 720)).toBe(1);
    expect(effectiveMenuScale(115, 1280, 720)).toBeCloseTo((720 - 32) / MENU_BASE_SIZE.height);
    expect(effectiveMenuScale(100, 2560, 1440)).toBe(1.45);
  });
});

describe('fitMenuScale', () => {
  it('keeps a scale that fits', () => {
    expect(fitMenuScale(1.2, 1920, 1080)).toBe(1.2);
  });

  it('caps the scale to the available height', () => {
    const expected = (720 - 32) / MENU_BASE_SIZE.height;
    expect(fitMenuScale(1.4, 1280, 720)).toBeCloseTo(expected);
  });

  it('caps the scale to the available width', () => {
    const expected = (960 - 32) / MENU_BASE_SIZE.width;
    expect(fitMenuScale(2, 960, 1440)).toBeCloseTo(expected);
  });

  it('has a lower bound', () => {
    expect(fitMenuScale(0.1, 100, 100)).toBe(0.5);
  });

  it('falls back for invalid viewports', () => {
    expect(fitMenuScale(1, Number.NaN, Number.NaN)).toBe(1);
  });

  it('is applied by effectiveMenuScale', () => {
    const expected = (720 - 32) / MENU_BASE_SIZE.height;
    expect(effectiveMenuScale(115, 1280, 720)).toBeCloseTo(expected);
  });
});
