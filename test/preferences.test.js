import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/shared/launch-settings.js';
import { DEFAULT_MENU_SETTINGS } from '../src/shared/menu-settings.js';
import { DEFAULT_KEYBIND } from '../src/shared/keybinds.js';
import {
  createPreferences,
  mergeLaunchSettings,
  mergeMenuSettings
} from '../src/main/preferences.js';

const make = (overrides = {}) => {
  const savedLaunch = [];
  const savedMenu = [];
  const fullscreen = [];
  const errors = [];
  const preferences = createPreferences({
    launch: DEFAULT_SETTINGS,
    menu: DEFAULT_MENU_SETTINGS,
    saveLaunch: async (settings) => {
      savedLaunch.push(settings);
    },
    saveMenu: async (settings) => {
      savedMenu.push(settings);
    },
    applyFullscreen: (flag) => fullscreen.push(flag),
    onError: (error) => errors.push(String(error)),
    app: { version: '1.2.3', platform: 'win32', electron: '44.0.0' },
    ...overrides
  });
  return { preferences, savedLaunch, savedMenu, fullscreen, errors };
};

describe('mergeLaunchSettings', () => {
  it('merges partial patches', () => {
    expect(mergeLaunchSettings({ fullscreen: false }, DEFAULT_SETTINGS)).toEqual({
      ...DEFAULT_SETTINGS,
      fullscreen: false
    });
  });

  it('ignores invalid values', () => {
    expect(mergeLaunchSettings({ uncapFps: 'no' }, DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('mergeMenuSettings', () => {
  it('merges partial patches', () => {
    expect(mergeMenuSettings({ scale: 90 }, DEFAULT_MENU_SETTINGS)).toEqual({
      ...DEFAULT_MENU_SETTINGS,
      scale: 90
    });
  });

  it('normalizes values', () => {
    expect(mergeMenuSettings({ scale: 999, accent: '#ABC' }, DEFAULT_MENU_SETTINGS)).toEqual({
      ...DEFAULT_MENU_SETTINGS,
      scale: 115,
      accent: '#aabbcc'
    });
  });
});

describe('createPreferences snapshot', () => {
  it('returns the initial state', () => {
    const { preferences } = make();
    expect(preferences.snapshot()).toEqual({
      launch: DEFAULT_SETTINGS,
      appliedLaunch: DEFAULT_SETTINGS,
      menu: DEFAULT_MENU_SETTINGS,
      app: { name: 'aimlockr', version: '1.2.3', platform: 'win32', electron: '44.0.0' },
      restartRequired: []
    });
  });

  it('returns copies', () => {
    const { preferences } = make();
    const snapshot = preferences.snapshot();
    snapshot.launch.fullscreen = false;
    snapshot.menu.scale = 20;
    expect(preferences.snapshot().launch.fullscreen).toBe(true);
    expect(preferences.snapshot().menu.scale).toBe(100);
  });

  it('fills missing app info', () => {
    const { preferences } = make({ app: {} });
    expect(preferences.snapshot().app).toEqual({
      name: 'aimlockr',
      version: '0.0.0',
      platform: 'unknown',
      electron: ''
    });
  });

  it('computes the restart list from applied settings', () => {
    const { preferences } = make({ appliedLaunch: { ...DEFAULT_SETTINGS, uncapFps: false } });
    expect(preferences.snapshot().restartRequired).toEqual(['uncapFps']);
  });
});

describe('updateLaunch', () => {
  it('merges, persists and returns a snapshot', async () => {
    const { preferences, savedLaunch } = make();
    const snapshot = await preferences.updateLaunch({ fullscreen: false });
    expect(snapshot.launch.fullscreen).toBe(false);
    expect(savedLaunch).toEqual([{ ...DEFAULT_SETTINGS, fullscreen: false }]);
  });

  it('applies fullscreen immediately without requiring a restart', async () => {
    const { preferences, fullscreen } = make();
    const snapshot = await preferences.updateLaunch({ fullscreen: false });
    expect(fullscreen).toEqual([false]);
    expect(snapshot.appliedLaunch.fullscreen).toBe(false);
    expect(snapshot.restartRequired).toEqual([]);
  });

  it('does not call fullscreen for an unchanged value', async () => {
    const { preferences, fullscreen } = make();
    await preferences.updateLaunch({ fullscreen: true });
    expect(fullscreen).toEqual([]);
  });

  it('marks process flags as requiring a restart', async () => {
    const { preferences } = make();
    const snapshot = await preferences.updateLaunch({ uncapFps: false, gpuAcceleration: false, rawInput: false });
    expect(snapshot.restartRequired).toEqual(['uncapFps', 'gpuAcceleration', 'rawInput']);
  });

  it('clears the restart list when values return to the applied state', async () => {
    const { preferences } = make();
    await preferences.updateLaunch({ uncapFps: false });
    const snapshot = await preferences.updateLaunch({ uncapFps: true });
    expect(snapshot.restartRequired).toEqual([]);
  });

  it('ignores invalid patches', async () => {
    const { preferences, savedLaunch } = make();
    const snapshot = await preferences.updateLaunch(null);
    expect(snapshot.launch).toEqual(DEFAULT_SETTINGS);
    expect(savedLaunch).toEqual([DEFAULT_SETTINGS]);
  });

  it('keeps state when saving fails and reports the error', async () => {
    const { preferences, errors } = make({
      saveLaunch: async () => {
        throw new Error('read-only');
      }
    });
    const snapshot = await preferences.updateLaunch({ fullscreen: false });
    expect(snapshot.launch.fullscreen).toBe(false);
    expect(errors[0]).toContain('read-only');
  });

  it('reports fullscreen application errors', async () => {
    const { preferences, errors } = make({
      applyFullscreen: () => {
        throw new Error('no display');
      }
    });
    const snapshot = await preferences.updateLaunch({ fullscreen: false });
    expect(snapshot.launch.fullscreen).toBe(false);
    expect(errors[0]).toContain('no display');
  });

  it('honours an applied fullscreen value', async () => {
    const { preferences, fullscreen } = make({ appliedLaunch: { ...DEFAULT_SETTINGS, fullscreen: false } });
    const snapshot = await preferences.updateLaunch({ fullscreen: true });
    expect(fullscreen).toEqual([true]);
    expect(snapshot.restartRequired).toEqual([]);
  });
});

describe('updateMenu', () => {
  it('merges and persists', async () => {
    const { preferences, savedMenu } = make();
    const snapshot = await preferences.updateMenu({ scale: 92, accent: '#abcdef' });
    expect(snapshot.menu).toEqual({ ...DEFAULT_MENU_SETTINGS, scale: 92, accent: '#abcdef' });
    expect(savedMenu).toEqual([snapshot.menu]);
  });

  it('normalizes patches', async () => {
    const { preferences } = make();
    const snapshot = await preferences.updateMenu({ scale: 500, keybind: 'Escape', accent: 'nope' });
    expect(snapshot.menu.scale).toBe(115);
    expect(snapshot.menu.keybind).toBe(DEFAULT_KEYBIND);
    expect(snapshot.menu.accent).toBe('#4e83ff');
  });

  it('keeps state when saving fails and reports the error', async () => {
    const { preferences, errors } = make({
      saveMenu: async () => {
        throw new Error('disk full');
      }
    });
    const snapshot = await preferences.updateMenu({ sounds: true });
    expect(snapshot.menu.sounds).toBe(true);
    expect(errors[0]).toContain('disk full');
  });
});

describe('resetMenu', () => {
  it('restores defaults and persists them', async () => {
    const { preferences, savedMenu } = make();
    await preferences.updateMenu({ scale: 90, sounds: true });
    const snapshot = await preferences.resetMenu();
    expect(snapshot.menu).toEqual(DEFAULT_MENU_SETTINGS);
    expect(savedMenu.at(-1)).toEqual(DEFAULT_MENU_SETTINGS);
  });
});

describe('save ordering', () => {
  it('serializes rapid writes', async () => {
    const order = [];
    const { preferences } = make({
      saveMenu: async (settings) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(settings.scale);
      }
    });
    const first = preferences.updateMenu({ scale: 90 });
    const second = preferences.updateMenu({ scale: 95 });
    await Promise.all([first, second]);
    expect(order).toEqual([90, 95]);
  });

  it('continues saving after a failed write', async () => {
    let calls = 0;
    const saved = [];
    const { preferences } = make({
      saveMenu: async (settings) => {
        calls += 1;
        if (calls === 1) throw new Error('first write failed');
        saved.push(settings.scale);
      }
    });
    await preferences.updateMenu({ scale: 90 });
    await preferences.updateMenu({ scale: 95 });
    expect(saved).toEqual([95]);
  });
});

describe('error reporting', () => {
  it('uses the default logger', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const preferences = createPreferences({
      launch: DEFAULT_SETTINGS,
      menu: DEFAULT_MENU_SETTINGS,
      saveMenu: async () => {
        throw new Error('nope');
      }
    });
    await preferences.updateMenu({ scale: 90 });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nope'));
    warn.mockRestore();
  });
});
