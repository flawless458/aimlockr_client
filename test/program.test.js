import { describe, expect, it } from 'vitest';
import { Effect, Exit } from 'effect';
import { launch } from '../src/main/program.js';
import { DEFAULT_SETTINGS } from '../src/main/settings.js';
import { KIRKA_URL } from '../src/main/links.js';
import { createFakeHost } from './helpers/fake-host.js';

const createStore = (settings = DEFAULT_SETTINGS) => ({
  load: Effect.succeed(settings),
  save: (next) => Effect.succeed(next)
});

const createRecordingStore = (settings = DEFAULT_SETTINGS) => {
  const saved = [];
  return {
    saved,
    load: Effect.succeed(settings),
    save: (next) => Effect.sync(() => {
      saved.push(next);
      return next;
    })
  };
};

const run = (fake, settings) => Effect.runPromise(launch({ host: fake.host, store: createStore(settings) }));

const switchNames = (fake) => fake.switches.map((entry) => entry.name);

describe('launch', () => {
  it('applies the uncapped fps switches', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(switchNames(fake)).toEqual(
      expect.arrayContaining(['disable-frame-rate-limit', 'disable-gpu-vsync', 'max-gum-fps'])
    );
  });

  it('does not disable the gpu by default', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(switchNames(fake)).not.toContain('disable-gpu');
  });

  it('disables the gpu when the setting is off', async () => {
    const fake = createFakeHost();
    await run(fake, { ...DEFAULT_SETTINGS, gpuAcceleration: false });
    expect(switchNames(fake)).toContain('disable-gpu');
  });

  it('skips uncap switches when the setting is off', async () => {
    const fake = createFakeHost();
    await run(fake, { ...DEFAULT_SETTINGS, uncapFps: false });
    expect(switchNames(fake)).not.toContain('disable-frame-rate-limit');
    expect(switchNames(fake)).not.toContain('disable-gpu-vsync');
    expect(switchNames(fake)).not.toContain('max-gum-fps');
  });

  it('applies switches before creating the window', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.calls.indexOf('switch:disable-frame-rate-limit')).toBeLessThan(fake.calls.indexOf('createWindow'));
  });

  it('waits for app readiness before creating the window', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.calls.indexOf('whenReady')).toBeLessThan(fake.calls.indexOf('createWindow'));
  });

  it('persists the loaded settings on startup', async () => {
    const fake = createFakeHost();
    const store = createRecordingStore({ ...DEFAULT_SETTINGS, fullscreen: false });
    await Effect.runPromise(launch({ host: fake.host, store }));
    expect(store.saved).toEqual([{ ...DEFAULT_SETTINGS, fullscreen: false }]);
  });

  it('keeps launching when settings cannot be saved', async () => {
    const fake = createFakeHost();
    const store = {
      load: Effect.succeed(DEFAULT_SETTINGS),
      save: () => Effect.fail(new Error('read-only'))
    };
    await Effect.runPromise(launch({ host: fake.host, store }));
    expect(fake.windows).toHaveLength(1);
    expect(fake.lastWindow().window.loadedUrls).toEqual([KIRKA_URL]);
  });

  it('creates exactly one window', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.windows).toHaveLength(1);
  });

  it('shows the window without waiting for the first paint', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.lastWindow().window.shown).toBe(1);
    expect(fake.calls.indexOf('loadURL')).toBeLessThan(fake.calls.indexOf('show'));
  });

  it('enters fullscreen on ready-to-show', async () => {
    const fake = createFakeHost();
    await run(fake);
    fake.lastWindow().window.emit('ready-to-show');
    expect(fake.lastWindow().window.fullscreenCalls).toEqual([true]);
  });

  it('stays windowed when fullscreen is disabled', async () => {
    const fake = createFakeHost();
    await run(fake, { ...DEFAULT_SETTINGS, fullscreen: false });
    fake.lastWindow().window.emit('ready-to-show');
    expect(fake.lastWindow().window.fullscreenCalls).toEqual([]);
  });

  it('waits for app readiness before loading the game', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.calls.indexOf('whenReady')).toBeLessThan(fake.calls.indexOf('loadURL'));
  });

  it('loads kirka.io', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.lastWindow().window.loadedUrls).toEqual([KIRKA_URL]);
  });

  it('quits and creates no window without the single instance lock', async () => {
    const fake = createFakeHost({ singleInstance: false });
    await run(fake);
    expect(fake.windows).toHaveLength(0);
    expect(fake.calls).toContain('quit');
  });

  it('registers second-instance and window-all-closed handlers', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.calls).toContain('on:second-instance');
    expect(fake.calls).toContain('on:window-all-closed');
  });

  it('focuses the window on ready-to-show', async () => {
    const fake = createFakeHost();
    await run(fake);
    fake.lastWindow().window.emit('ready-to-show');
    expect(fake.lastWindow().window.focused).toBe(1);
  });

  it('does not touch a destroyed window on ready-to-show', async () => {
    const fake = createFakeHost();
    await run(fake);
    fake.lastWindow().window.destroyed = true;
    fake.lastWindow().window.emit('ready-to-show');
    expect(fake.lastWindow().window.focused).toBe(0);
    expect(fake.lastWindow().window.fullscreenCalls).toEqual([]);
  });

  it('shows an existing window on second-instance', async () => {
    const fake = createFakeHost();
    await run(fake);
    fake.emit('second-instance');
    expect(fake.lastWindow().window.shown).toBe(2);
    expect(fake.lastWindow().window.focused).toBe(1);
  });

  it('quits on window-all-closed outside macOS', async () => {
    const fake = createFakeHost({ platform: 'win32' });
    await run(fake);
    fake.emit('window-all-closed');
    expect(fake.calls).toContain('quit');
  });

  it('stays alive on window-all-closed on macOS', async () => {
    const fake = createFakeHost({ platform: 'darwin' });
    await run(fake);
    fake.emit('window-all-closed');
    expect(fake.calls).not.toContain('quit');
  });

  it('opens external popups in the browser', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.lastWindow().window.webContents.open('https://discord.gg/kirka')).toEqual({ action: 'deny' });
    expect(fake.opened).toEqual(['https://discord.gg/kirka']);
  });

  it('blocks external navigation', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.lastWindow().window.webContents.navigate('https://example.org')).toBe(true);
    expect(fake.opened).toEqual(['https://example.org']);
  });

  it('allows kirka navigation', async () => {
    const fake = createFakeHost();
    await run(fake);
    expect(fake.lastWindow().window.webContents.navigate('https://kirka.io/game')).toBe(false);
    expect(fake.opened).toEqual([]);
  });

  it('defers the window and load until the app is ready', async () => {
    const fake = createFakeHost({ deferredReady: true });
    const pending = run(fake);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fake.windows).toHaveLength(0);
    fake.resolveReady();
    await pending;
    expect(fake.lastWindow().window.loadedUrls).toEqual([KIRKA_URL]);
  });

  it('fails when readiness fails', async () => {
    const fake = createFakeHost({ readyError: new Error('no display') });
    const exit = await Effect.runPromiseExit(launch({ host: fake.host, store: createStore() }));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(fake.windows).toHaveLength(0);
  });
});
