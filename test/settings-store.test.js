import { describe, expect, it } from 'vitest';
import { Effect, Exit } from 'effect';
import { createSettingsStore, readSettings, writeSettings, SettingsError } from '../src/main/settings-store.js';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '../src/main/settings.js';
import { createFailingIo, createMemoryIo } from './helpers/memory-io.js';

const CONFIG_PATH = '/config/aimlockr/config.json';

describe('readSettings', () => {
  it('reads valid settings', () => {
    const io = createMemoryIo({ [CONFIG_PATH]: '{"version": 1, "fullscreen": false}' });
    expect(readSettings(CONFIG_PATH, io)).toEqual({
      settings: { ...DEFAULT_SETTINGS, fullscreen: false },
      error: null
    });
  });

  it('falls back to defaults when the file is missing', () => {
    const decoded = readSettings(CONFIG_PATH, createMemoryIo());
    expect(decoded.settings).toEqual(DEFAULT_SETTINGS);
    expect(decoded.error).toContain('unable to read');
  });

  it('falls back to defaults on a legacy config', () => {
    const io = createMemoryIo({ [CONFIG_PATH]: '{"fullscreen": false, "uncap_fps": false}' });
    const decoded = readSettings(CONFIG_PATH, io);
    expect(decoded.settings).toEqual(DEFAULT_SETTINGS);
    expect(decoded.error).toContain('unsupported settings version');
  });

  it('falls back to defaults on malformed json', () => {
    const io = createMemoryIo({ [CONFIG_PATH]: 'nope' });
    const decoded = readSettings(CONFIG_PATH, io);
    expect(decoded.settings).toEqual(DEFAULT_SETTINGS);
    expect(decoded.error).toContain('invalid JSON');
  });
});

describe('writeSettings', () => {
  it('creates the parent directory', () => {
    const io = createMemoryIo();
    writeSettings(CONFIG_PATH, DEFAULT_SETTINGS, io);
    expect(io.directories).toEqual(['/config/aimlockr']);
  });

  it('writes normalized json', () => {
    const io = createMemoryIo();
    writeSettings(CONFIG_PATH, { fullscreen: false }, io);
    expect(JSON.parse(io.files.get(CONFIG_PATH))).toEqual({ version: SETTINGS_VERSION, ...DEFAULT_SETTINGS, fullscreen: false });
  });

  it('returns the normalized settings', () => {
    const io = createMemoryIo();
    expect(writeSettings(CONFIG_PATH, { uncapFps: false }, io)).toEqual({ ...DEFAULT_SETTINGS, uncapFps: false });
  });

  it('does not write unknown keys', () => {
    const io = createMemoryIo();
    writeSettings(CONFIG_PATH, { fullscreen: true, backdoor: true }, io);
    expect(Object.keys(JSON.parse(io.files.get(CONFIG_PATH)))).toEqual(['version', 'fullscreen', 'uncapFps', 'gpuAcceleration', 'rawInput']);
  });
});

describe('createSettingsStore', () => {
  it('loads defaults when nothing is stored', async () => {
    const store = createSettingsStore(CONFIG_PATH, createMemoryIo());
    expect(await Effect.runPromise(store.load)).toEqual(DEFAULT_SETTINGS);
  });

  it('loads persisted settings', async () => {
    const io = createMemoryIo({ [CONFIG_PATH]: '{"version": 1, "fullscreen": false, "gpuAcceleration": false}' });
    const store = createSettingsStore(CONFIG_PATH, io);
    expect(await Effect.runPromise(store.load)).toEqual({ ...DEFAULT_SETTINGS, fullscreen: false, gpuAcceleration: false });
  });

  it('saves settings and returns them', async () => {
    const io = createMemoryIo();
    const store = createSettingsStore(CONFIG_PATH, io);
    const saved = await Effect.runPromise(store.save({ fullscreen: false }));
    expect(saved).toEqual({ ...DEFAULT_SETTINGS, fullscreen: false });
    expect(JSON.parse(io.files.get(CONFIG_PATH))).toEqual({ version: SETTINGS_VERSION, ...saved });
  });

  it('persists across a reload', async () => {
    const io = createMemoryIo();
    const first = createSettingsStore(CONFIG_PATH, io);
    await Effect.runPromise(first.save({ uncapFps: false }));
    const second = createSettingsStore(CONFIG_PATH, io);
    expect(await Effect.runPromise(second.load)).toEqual({ ...DEFAULT_SETTINGS, uncapFps: false });
  });

  it('fails with SettingsError when saving fails', async () => {
    const store = createSettingsStore(CONFIG_PATH, createFailingIo('read-only volume'));
    const exit = await Effect.runPromiseExit(store.save(DEFAULT_SETTINGS));
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) expect(String(exit.cause)).toContain('read-only volume');
  });

  it('exposes a SettingsError class', () => {
    const error = new SettingsError('boom', new Error('root'));
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SettingsError');
    expect(error.message).toBe('boom');
  });
});
