import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACCENT,
  clampNumber,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  hsvToRgb,
  isHexColor,
  mixHex,
  normalizeHexColor,
  rgbToHex,
  withAlpha
} from '../src/shared/color.js';

describe('isHexColor', () => {
  it.each(['#fff', '#ffffff', 'abc', 'A1B2C3', '#4e83ff'])('accepts %s', (value) => {
    expect(isHexColor(value)).toBe(true);
  });

  it.each(['', '#', '#ffff', '#gggggg', 'rgb(0,0,0)', 42, null, undefined])('rejects %s', (value) => {
    expect(isHexColor(value)).toBe(false);
  });
});

describe('normalizeHexColor', () => {
  it('expands short hex', () => {
    expect(normalizeHexColor('#abc')).toBe('#aabbcc');
    expect(normalizeHexColor('abc')).toBe('#aabbcc');
  });

  it('lowercases six digit hex and adds a hash', () => {
    expect(normalizeHexColor('4E83FF')).toBe('#4e83ff');
    expect(normalizeHexColor('#4E83FF')).toBe('#4e83ff');
  });

  it('falls back for invalid input', () => {
    expect(normalizeHexColor('nope')).toBe(DEFAULT_ACCENT);
    expect(normalizeHexColor(undefined, '#ABCDEF')).toBe('#abcdef');
  });

  it('falls back to the default when the fallback is invalid', () => {
    expect(normalizeHexColor('nope', 'zzz')).toBe(DEFAULT_ACCENT);
  });
});

describe('hexToRgb', () => {
  it('parses six digit hex', () => {
    expect(hexToRgb('#4e83ff')).toEqual({ r: 78, g: 131, b: 255 });
  });

  it('parses short hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('returns null for invalid input', () => {
    expect(hexToRgb('nope')).toBeNull();
  });
});

describe('rgbToHex', () => {
  it('formats and clamps channels', () => {
    expect(rgbToHex({ r: 78, g: 131, b: 255 })).toBe('#4e83ff');
    expect(rgbToHex({ r: -20, g: 300, b: 12.6 })).toBe('#00ff0d');
  });
});

describe('hexToHsv', () => {
  it('parses red', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
  });

  it('parses white and black', () => {
    expect(hexToHsv('#ffffff')).toEqual({ h: 0, s: 0, v: 1 });
    expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
  });

  it('parses blue', () => {
    expect(hexToHsv('#0000ff')).toEqual({ h: 240, s: 1, v: 1 });
  });

  it('falls back to the default accent for invalid input', () => {
    expect(hexToHsv('invalid')).toEqual(hexToHsv(DEFAULT_ACCENT));
  });
});

describe('hsvToRgb / hsvToHex', () => {
  it.each([
    ['#ff0000', { h: 0, s: 1, v: 1 }],
    ['#00ff00', { h: 120, s: 1, v: 1 }],
    ['#0000ff', { h: 240, s: 1, v: 1 }],
    ['#ffffff', { h: 200, s: 0, v: 1 }],
    ['#000000', { h: 120, s: 1, v: 0 }]
  ])('converts %s', (hex, hsv) => {
    expect(hsvToHex(hsv)).toBe(hex);
  });

  it('clamps saturation and value', () => {
    expect(hsvToRgb({ h: 0, s: 4, v: 2 })).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('wraps hue values', () => {
    expect(hsvToHex({ h: -120, s: 1, v: 1 })).toBe('#0000ff');
    expect(hsvToHex({ h: 480, s: 1, v: 1 })).toBe('#00ff00');
  });

  it('round trips palette colors', () => {
    for (const hex of ['#4e83ff', '#ff5d8f', '#f5c451', '#57d68d', '#e5e7eb']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });
});

describe('clampNumber', () => {
  it('clamps within bounds', () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-5, 0, 10)).toBe(0);
    expect(clampNumber(15, 0, 10)).toBe(10);
  });
});

describe('withAlpha', () => {
  it('renders rgba', () => {
    expect(withAlpha('#4e83ff', 0.5)).toBe('rgba(78, 131, 255, 0.5)');
  });

  it('clamps alpha', () => {
    expect(withAlpha('#000000', 2)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('#ffffff', -1)).toBe('rgba(255, 255, 255, 0)');
  });

  it('uses the default for invalid colors', () => {
    expect(withAlpha('zzz', 1)).toBe('rgba(78, 131, 255, 1)');
  });
});

describe('mixHex', () => {
  it('mixes toward the target', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('clamps the ratio', () => {
    expect(mixHex('#000000', '#ffffff', -1)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 5)).toBe('#ffffff');
  });
});
