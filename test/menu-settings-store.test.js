import { describe, expect, it } from 'vitest';
import { Effect, Exit } from 'effect';
import {
  MenuSettingsError,
  createMenuSettingsStore,
  readMenuSettings,
  writeMenuSettings
} from '../src/main/menu-settings-store.js';
import { DEFAULT_MENU_SETTINGS, MENU_SETTINGS_VERSION } from '../src/shared/menu-settings.js';
import { createFailingIo, createMemoryIo } from './helpers/memory-io.js';

const MENU_PATH = '/config/aimlockr/menu.json';

describe('readMenuSettings', () => {
  it('reads valid settings', () => {
    const io = createMemoryIo({
      [MENU_PATH]: `{"version": ${MENU_SETTINGS_VERSION}, "scale": 92, "sounds": true}`
    });
    expect(readMenuSettings(MENU_PATH, io)).toEqual({
      settings: { ...DEFAULT_MENU_SETTINGS, scale: 92, sounds: true },
      error: null
    });
  });

  it('migrates a version 1 file to the current keybind default', () => {
    const io = createMemoryIo({
      [MENU_PATH]: '{"version": 1, "keybind": "Insert", "scale": 92, "accent": "#abcdef"}'
    });
    expect(readMenuSettings(MENU_PATH, io)).toEqual({
      settings: { ...DEFAULT_MENU_SETTINGS, scale: 92, accent: '#abcdef' },
      error: null
    });
  });

  it('keeps a version 1 keybind that is not the legacy default', () => {
    const io = createMemoryIo({ [MENU_PATH]: '{"version": 1, "keybind": "PageDown"}' });
    expect(readMenuSettings(MENU_PATH, io).settings.keybind).toBe('PageDown');
  });

  it('falls back when the file is missing', () => {
    const decoded = readMenuSettings(MENU_PATH, createMemoryIo());
    expect(decoded.settings).toEqual(DEFAULT_MENU_SETTINGS);
    expect(decoded.error).toContain('unable to read');
  });

  it('falls back on malformed json', () => {
    const decoded = readMenuSettings(MENU_PATH, createMemoryIo({ [MENU_PATH]: 'nope' }));
    expect(decoded.settings).toEqual(DEFAULT_MENU_SETTINGS);
    expect(decoded.error).toContain('invalid JSON');
  });

  it('falls back on an unsupported version', () => {
    const decoded = readMenuSettings(MENU_PATH, createMemoryIo({ [MENU_PATH]: '{"version": 99}' }));
    expect(decoded.settings).toEqual(DEFAULT_MENU_SETTINGS);
    expect(decoded.error).toContain('unsupported menu settings version');
  });
});

describe('writeMenuSettings', () => {
  it('creates the parent directory', () => {
    const io = createMemoryIo();
    writeMenuSettings(MENU_PATH, DEFAULT_MENU_SETTINGS, io);
    expect(io.directories).toEqual(['/config/aimlockr']);
  });

  it('writes the current version and the right shift default', () => {
    const io = createMemoryIo();
    writeMenuSettings(MENU_PATH, {}, io);
    const parsed = JSON.parse(io.files.get(MENU_PATH));
    expect(parsed.version).toBe(MENU_SETTINGS_VERSION);
    expect(parsed.keybind).toBe('ShiftRight');
  });

  it('writes normalized json', () => {
    const io = createMemoryIo();
    writeMenuSettings(MENU_PATH, { scale: 500, accent: 'ABC' }, io);
    expect(JSON.parse(io.files.get(MENU_PATH))).toEqual({
      version: MENU_SETTINGS_VERSION,
      ...DEFAULT_MENU_SETTINGS,
      scale: 115,
      accent: '#aabbcc'
    });
  });

  it('returns the normalized settings', () => {
    const io = createMemoryIo();
    expect(writeMenuSettings(MENU_PATH, { scale: 90 }, io)).toEqual({ ...DEFAULT_MENU_SETTINGS, scale: 90 });
  });

  it('drops unknown keys', () => {
    const io = createMemoryIo();
    writeMenuSettings(MENU_PATH, { telemetry: true }, io);
    expect(Object.keys(JSON.parse(io.files.get(MENU_PATH)))).not.toContain('telemetry');
  });
});

describe('createMenuSettingsStore', () => {
  it('loads defaults when nothing is stored', async () => {
    const store = createMenuSettingsStore(MENU_PATH, createMemoryIo());
    expect(await Effect.runPromise(store.load)).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it('loads persisted settings', async () => {
    const io = createMemoryIo({
      [MENU_PATH]: `{"version": ${MENU_SETTINGS_VERSION}, "scale": 90, "animations": false}`
    });
    const store = createMenuSettingsStore(MENU_PATH, io);
    expect(await Effect.runPromise(store.load)).toEqual({
      ...DEFAULT_MENU_SETTINGS,
      scale: 90,
      animations: false
    });
  });

  it('saves settings and returns them', async () => {
    const io = createMemoryIo();
    const store = createMenuSettingsStore(MENU_PATH, io);
    const saved = await Effect.runPromise(store.save({ scale: 95, sounds: true }));
    expect(saved).toEqual({ ...DEFAULT_MENU_SETTINGS, scale: 95, sounds: true });
    expect(JSON.parse(io.files.get(MENU_PATH))).toEqual({ version: MENU_SETTINGS_VERSION, ...saved });
  });

  it('persists across a reload', async () => {
    const io = createMemoryIo();
    const first = createMenuSettingsStore(MENU_PATH, io);
    await Effect.runPromise(first.save({ accent: '#abcdef' }));
    const second = createMenuSettingsStore(MENU_PATH, io);
    expect(await Effect.runPromise(second.load)).toEqual({ ...DEFAULT_MENU_SETTINGS, accent: '#abcdef' });
  });

  it('fails with MenuSettingsError when saving fails', async () => {
    const store = createMenuSettingsStore(MENU_PATH, createFailingIo('read-only volume'));
    const exit = await Effect.runPromiseExit(store.save(DEFAULT_MENU_SETTINGS));
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) expect(String(exit.cause)).toContain('read-only volume');
  });

  it('exposes a MenuSettingsError class', () => {
    const error = new MenuSettingsError('boom', new Error('root'));
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MenuSettingsError');
    expect(error.message).toBe('boom');
  });
});
