import { describe, expect, it } from 'vitest';
import { DEFAULT_ACCENT } from '../src/shared/color.js';
import { DEFAULT_KEYBIND } from '../src/shared/keybinds.js';
import {
  DEFAULT_MENU_SETTINGS,
  LEGACY_MENU_DEFAULTS,
  MENU_SETTING_KEYS,
  MENU_SETTINGS_VERSION,
  SCALE_RANGE,
  SOUND_VOLUME_RANGE,
  copyMenuSettings,
  menuMotionDuration,
  normalizeMenuSettings,
  parseMenuSettings,
  serializeMenuSettings
} from '../src/shared/menu-settings.js';

describe('DEFAULT_MENU_SETTINGS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_MENU_SETTINGS)).toBe(true);
  });

  it('ships sensible defaults', () => {
    expect(DEFAULT_MENU_SETTINGS).toEqual({
      keybind: 'ShiftRight',
      closeOnOutsideClick: true,
      openOnLaunch: false,
      scale: 100,
      accent: DEFAULT_ACCENT,
      blur: true,
      animations: true,
      motion: 'normal',
      sounds: false,
      soundVolume: 60
    });
  });
});

describe('LEGACY_MENU_DEFAULTS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(LEGACY_MENU_DEFAULTS)).toBe(true);
    expect(Object.isFrozen(LEGACY_MENU_DEFAULTS[1])).toBe(true);
  });

  it('describes the version 1 keybind default', () => {
    expect(LEGACY_MENU_DEFAULTS[1]).toEqual({ keybind: 'Insert' });
  });
});

describe('MENU_SETTING_KEYS', () => {
  it('lists every default key once', () => {
    expect([...MENU_SETTING_KEYS].sort()).toEqual(Object.keys(DEFAULT_MENU_SETTINGS).sort());
  });
});

describe('normalizeMenuSettings', () => {
  it('returns defaults for an empty object', () => {
    expect(normalizeMenuSettings({})).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it('keeps valid values', () => {
    const menu = normalizeMenuSettings({
      keybind: 'F8',
      closeOnOutsideClick: false,
      openOnLaunch: true,
      scale: 110,
      accent: '#FF00AA',
      blur: false,
      animations: false,
      motion: 'fast',
      sounds: true,
      soundVolume: 30
    });
    expect(menu).toEqual({
      keybind: 'F8',
      closeOnOutsideClick: false,
      openOnLaunch: true,
      scale: 110,
      accent: '#ff00aa',
      blur: false,
      animations: false,
      motion: 'fast',
      sounds: true,
      soundVolume: 30
    });
  });

  it('merges partial input over a base', () => {
    const base = { ...DEFAULT_MENU_SETTINGS, scale: 95, accent: '#123456' };
    expect(normalizeMenuSettings({ sounds: true }, base)).toEqual({ ...base, sounds: true });
  });

  it('keeps base values for invalid partial updates', () => {
    const base = { ...DEFAULT_MENU_SETTINGS, motion: 'relaxed', keybind: 'F8', accent: '#123456' };
    expect(normalizeMenuSettings({ motion: 'warp', keybind: 'Escape', accent: 'zzz' }, base)).toEqual(base);
  });

  it('does not mutate the base', () => {
    const base = { ...DEFAULT_MENU_SETTINGS };
    normalizeMenuSettings({ scale: 90 }, base);
    expect(base).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it('ignores unknown keys', () => {
    expect(normalizeMenuSettings({ telemetry: true })).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it.each([
    ['string', 'true'],
    ['number', 1],
    ['null', null],
    ['array', []],
    ['object', {}]
  ])('ignores a %s boolean', (_label, value) => {
    expect(normalizeMenuSettings({ blur: value })).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it('rounds and clamps scale', () => {
    expect(normalizeMenuSettings({ scale: 100.6 }).scale).toBe(101);
    expect(normalizeMenuSettings({ scale: 1 }).scale).toBe(SCALE_RANGE.min);
    expect(normalizeMenuSettings({ scale: 999 }).scale).toBe(SCALE_RANGE.max);
  });

  it('rounds and clamps volume', () => {
    expect(normalizeMenuSettings({ soundVolume: 33.4 }).soundVolume).toBe(33);
    expect(normalizeMenuSettings({ soundVolume: -10 }).soundVolume).toBe(SOUND_VOLUME_RANGE.min);
    expect(normalizeMenuSettings({ soundVolume: 140 }).soundVolume).toBe(SOUND_VOLUME_RANGE.max);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['string', '100'],
    ['null', null]
  ])('falls back for a %s scale', (_label, value) => {
    expect(normalizeMenuSettings({ scale: value }).scale).toBe(100);
  });

  it('normalizes invalid nested values', () => {
    const menu = normalizeMenuSettings({ accent: 'nope', keybind: 'Escape', motion: 'warp' });
    expect(menu.accent).toBe(DEFAULT_ACCENT);
    expect(menu.keybind).toBe(DEFAULT_KEYBIND);
    expect(menu.motion).toBe('normal');
  });
});

describe('menuMotionDuration', () => {
  it('uses the animation and speed settings', () => {
    expect(menuMotionDuration({ ...DEFAULT_MENU_SETTINGS, animations: false })).toBe(0);
    expect(menuMotionDuration({ ...DEFAULT_MENU_SETTINGS, motion: 'fast' })).toBe(154);
  });
});

describe('parseMenuSettings', () => {
  const valid = `{"version": ${MENU_SETTINGS_VERSION}, "scale": 105, "accent": "#00ff00"}`;

  it('parses valid settings', () => {
    expect(parseMenuSettings(valid)).toEqual({
      settings: { ...DEFAULT_MENU_SETTINGS, scale: 105, accent: '#00ff00' },
      error: null
    });
  });

  it('rejects malformed json', () => {
    const result = parseMenuSettings('nope');
    expect(result.settings).toEqual(DEFAULT_MENU_SETTINGS);
    expect(result.error).toContain('invalid JSON');
  });

  it('rejects non-objects', () => {
    const result = parseMenuSettings('[]');
    expect(result.error).toBe('expected a JSON object');
  });

  it('rejects unsupported versions', () => {
    const result = parseMenuSettings('{"version": 3}');
    expect(result.error).toContain('unsupported menu settings version');
    expect(result.settings).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it('rejects a missing version', () => {
    const result = parseMenuSettings('{"scale": 105}');
    expect(result.error).toContain('unsupported menu settings version');
    expect(result.settings).toEqual(DEFAULT_MENU_SETTINGS);
  });
});

describe('parseMenuSettings version 1', () => {
  it('moves the legacy keybind default to the current one', () => {
    const result = parseMenuSettings('{"version": 1, "keybind": "Insert", "scale": 92}');
    expect(result.error).toBeNull();
    expect(result.settings).toEqual({ ...DEFAULT_MENU_SETTINGS, scale: 92 });
    expect(result.settings.keybind).toBe(DEFAULT_KEYBIND);
  });

  it('keeps a keybind the player picked on purpose', () => {
    const result = parseMenuSettings('{"version": 1, "keybind": "F8"}');
    expect(result.settings.keybind).toBe('F8');
  });

  it('keeps every other stored value', () => {
    const result = parseMenuSettings(
      '{"version": 1, "keybind": "Insert", "accent": "#abcdef", "blur": false, "motion": "fast", "sounds": true}'
    );
    expect(result.settings).toEqual({
      ...DEFAULT_MENU_SETTINGS,
      accent: '#abcdef',
      blur: false,
      motion: 'fast',
      sounds: true
    });
  });

  it('normalizes invalid values while migrating', () => {
    const result = parseMenuSettings('{"version": 1, "keybind": "Escape", "scale": 900}');
    expect(result.settings.keybind).toBe(DEFAULT_KEYBIND);
    expect(result.settings.scale).toBe(SCALE_RANGE.max);
  });

  it('ignores unknown keys', () => {
    const result = parseMenuSettings('{"version": 1, "telemetry": true}');
    expect(result.settings).toEqual(DEFAULT_MENU_SETTINGS);
  });
});

describe('serializeMenuSettings', () => {
  it('writes a versioned document', () => {
    const parsed = JSON.parse(serializeMenuSettings({ scale: 105 }));
    expect(parsed.version).toBe(MENU_SETTINGS_VERSION);
    expect(parsed.scale).toBe(105);
    expect(parsed.keybind).toBe(DEFAULT_KEYBIND);
  });

  it('does not write unknown keys', () => {
    const parsed = JSON.parse(serializeMenuSettings({ scale: 100, telemetry: true }));
    expect(Object.keys(parsed)).toEqual(['version', ...MENU_SETTING_KEYS]);
  });

  it('round trips', () => {
    const menu = { ...DEFAULT_MENU_SETTINGS, scale: 92, accent: '#abcdef', sounds: true };
    const parsed = parseMenuSettings(serializeMenuSettings(menu));
    expect(parsed.settings).toEqual(menu);
    expect(parsed.error).toBeNull();
  });
});

describe('copyMenuSettings', () => {
  it('normalizes and copies', () => {
    const source = { ...DEFAULT_MENU_SETTINGS, scale: 98 };
    const copy = copyMenuSettings(source);
    expect(copy).toEqual(source);
    expect(copy).not.toBe(source);
  });
});
