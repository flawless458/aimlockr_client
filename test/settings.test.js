import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  SETTING_KEYS,
  normalizeSettings,
  parseSettings,
  serializeSettings
} from '../src/main/settings.js';

describe('DEFAULT_SETTINGS', () => {
  it('launches fullscreen', () => {
    expect(DEFAULT_SETTINGS.fullscreen).toBe(true);
  });

  it('uncaps fps', () => {
    expect(DEFAULT_SETTINGS.uncapFps).toBe(true);
  });

  it('keeps gpu acceleration on', () => {
    expect(DEFAULT_SETTINGS.gpuAcceleration).toBe(true);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true);
  });
});

describe('SETTING_KEYS', () => {
  it('lists every default key exactly once', () => {
    expect([...SETTING_KEYS].sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });
});

describe('normalizeSettings', () => {
  it('returns defaults for an empty object', () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid booleans', () => {
    expect(normalizeSettings({ fullscreen: false, uncapFps: false, gpuAcceleration: false, directComposition: true })).toEqual({
      fullscreen: false,
      uncapFps: false,
      gpuAcceleration: false,
      directComposition: true
    });
  });

  it('merges partial input over defaults', () => {
    expect(normalizeSettings({ fullscreen: false })).toEqual({ ...DEFAULT_SETTINGS, fullscreen: false });
  });

  it('ignores unknown keys', () => {
    expect(normalizeSettings({ frameCap: 240, fullscreen: false })).toEqual({ ...DEFAULT_SETTINGS, fullscreen: false });
  });

  it.each([
    ['string', 'true'],
    ['number', 1],
    ['null', null],
    ['array', []],
    ['object', {}]
  ])('ignores a %s value', (_label, value) => {
    expect(normalizeSettings({ fullscreen: value })).toEqual({ ...DEFAULT_SETTINGS, fullscreen: true });
  });

  it('falls back to the provided base', () => {
    const base = { fullscreen: false, uncapFps: false, gpuAcceleration: false, directComposition: true };
    expect(normalizeSettings({}, base)).toEqual(base);
  });

  it('does not mutate the base', () => {
    const base = { ...DEFAULT_SETTINGS };
    normalizeSettings({ fullscreen: false }, base);
    expect(base).toEqual(DEFAULT_SETTINGS);
  });

  it('handles null input', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('handles array input', () => {
    expect(normalizeSettings([true, false])).toEqual(DEFAULT_SETTINGS);
  });

  it('handles string input', () => {
    expect(normalizeSettings('fullscreen')).toEqual(DEFAULT_SETTINGS);
  });

  it('returns a fresh copy of defaults', () => {
    const settings = normalizeSettings({});
    settings.fullscreen = false;
    expect(DEFAULT_SETTINGS.fullscreen).toBe(true);
  });
});

describe('parseSettings', () => {
  it('decodes a full object', () => {
    const text = JSON.stringify({ version: SETTINGS_VERSION, fullscreen: false, uncapFps: false, gpuAcceleration: false, directComposition: true });
    expect(parseSettings(text)).toEqual({
      settings: { fullscreen: false, uncapFps: false, gpuAcceleration: false, directComposition: true },
      error: null
    });
  });

  it('fills missing keys with defaults', () => {
    expect(parseSettings('{"version": 1, "uncapFps": false}')).toEqual({
      settings: { ...DEFAULT_SETTINGS, uncapFps: false },
      error: null
    });
  });

  it('reports invalid JSON and falls back to defaults', () => {
    const decoded = parseSettings('{ nope');
    expect(decoded.settings).toEqual(DEFAULT_SETTINGS);
    expect(decoded.error).toContain('invalid JSON');
  });

  it('reports an empty file', () => {
    expect(parseSettings('').error).toContain('invalid JSON');
  });

  it('rejects an array', () => {
    expect(parseSettings('[true]')).toEqual({ settings: DEFAULT_SETTINGS, error: 'expected a JSON object' });
  });

  it('rejects a JSON string', () => {
    expect(parseSettings('"fullscreen"')).toEqual({ settings: DEFAULT_SETTINGS, error: 'expected a JSON object' });
  });

  it('rejects JSON null', () => {
    expect(parseSettings('null')).toEqual({ settings: DEFAULT_SETTINGS, error: 'expected a JSON object' });
  });

  it('rejects a file without a version', () => {
    const decoded = parseSettings('{"fullscreen": false}');
    expect(decoded.settings).toEqual(DEFAULT_SETTINGS);
    expect(decoded.error).toContain('unsupported settings version');
  });

  it('rejects the legacy snake_case config', () => {
    const decoded = parseSettings('{"fullscreen": false, "gpu_acceleration": true, "uncap_fps": true}');
    expect(decoded.settings).toEqual(DEFAULT_SETTINGS);
    expect(decoded.error).toContain('unsupported settings version');
  });

  it('rejects a future version', () => {
    const decoded = parseSettings(JSON.stringify({ version: SETTINGS_VERSION + 1, fullscreen: false }));
    expect(decoded.settings).toEqual(DEFAULT_SETTINGS);
    expect(decoded.error).toContain(`unsupported settings version`);
  });

  it('ignores invalid values inside a valid object', () => {
    expect(parseSettings('{"version": 1, "fullscreen": "yes"}').settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('serializeSettings', () => {
  it('writes normalized settings with two spaces and a trailing newline', () => {
    expect(serializeSettings({ fullscreen: false })).toBe(
      `{\n  "version": 1,\n  "fullscreen": false,\n  "uncapFps": true,\n  "gpuAcceleration": true,\n  "directComposition": false\n}\n`
    );
  });

  it('drops unknown keys', () => {
    expect(JSON.parse(serializeSettings({ fullscreen: true, extra: 1 }))).toEqual({ version: SETTINGS_VERSION, ...DEFAULT_SETTINGS });
  });

  it('round trips through parseSettings', () => {
    const input = { fullscreen: false, uncapFps: false, gpuAcceleration: false, directComposition: true };
    expect(parseSettings(serializeSettings(input))).toEqual({ settings: input, error: null });
  });
});
