import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/shared/launch-settings.js';
import { DEFAULT_MENU_SETTINGS } from '../../src/shared/menu-settings.js';
import { createMenuController, normalizeSnapshot } from '../../src/ui/controller.js';

const app = { name: 'aimlockr', version: '1.0.0', platform: 'win32', electron: '44.0.0' };

const fixture = (overrides = {}) => ({
  launch: { ...DEFAULT_SETTINGS },
  appliedLaunch: { ...DEFAULT_SETTINGS },
  menu: { ...DEFAULT_MENU_SETTINGS },
  app: { ...app },
  restartRequired: [],
  ...overrides
});

const createApi = (initial = fixture()) => {
  let snapshot = structuredClone(initial);
  return {
    snapshot: () => structuredClone(snapshot),
    load: vi.fn(async () => structuredClone(snapshot)),
    updateLaunch: vi.fn(async (patch) => {
      snapshot.launch = { ...snapshot.launch, ...patch };
      snapshot.appliedLaunch = { ...snapshot.appliedLaunch, fullscreen: snapshot.launch.fullscreen };
      return structuredClone(snapshot);
    }),
    updateMenu: vi.fn(async (patch) => {
      snapshot.menu = { ...snapshot.menu, ...patch };
      return structuredClone(snapshot);
    }),
    resetMenu: vi.fn(async () => {
      snapshot.menu = { ...DEFAULT_MENU_SETTINGS };
      return structuredClone(snapshot);
    }),
    relaunch: vi.fn(async () => true),
    quit: vi.fn(async () => true),
    openExternal: vi.fn(async () => true)
  };
};

describe('normalizeSnapshot', () => {
  it('fills defaults for empty input', () => {
    const snapshot = normalizeSnapshot(null);
    expect(snapshot.launch).toEqual(DEFAULT_SETTINGS);
    expect(snapshot.menu).toEqual(DEFAULT_MENU_SETTINGS);
    expect(snapshot.app).toEqual({ name: 'aimlockr', version: '0.0.0', platform: 'unknown', electron: '' });
    expect(snapshot.restartRequired).toEqual([]);
  });

  it('normalizes launch and menu values', () => {
    const snapshot = normalizeSnapshot({
      launch: { fullscreen: false, uncapFps: 'no' },
      menu: { scale: 500, keybind: 'Escape', accent: 'ABC' },
      app: { version: 42 }
    });
    expect(snapshot.launch).toEqual({ ...DEFAULT_SETTINGS, fullscreen: false });
    expect(snapshot.menu.scale).toBe(115);
    expect(snapshot.menu.keybind).toBe(DEFAULT_MENU_SETTINGS.keybind);
    expect(snapshot.menu.accent).toBe('#aabbcc');
    expect(snapshot.app.version).toBe('0.0.0');
  });

  it('derives restart requirements from applied settings', () => {
    const snapshot = normalizeSnapshot({
      launch: { ...DEFAULT_SETTINGS, uncapFps: false },
      appliedLaunch: DEFAULT_SETTINGS
    });
    expect(snapshot.restartRequired).toEqual(['uncapFps']);
  });
});

describe('start', () => {
  it('loads preferences and becomes ready', async () => {
    const api = createApi(fixture({ menu: { ...DEFAULT_MENU_SETTINGS, scale: 92 } }));
    const controller = createMenuController(api);
    expect(controller.state.status).toBe('loading');
    await controller.start();
    expect(api.load).toHaveBeenCalledTimes(1);
    expect(controller.state.status).toBe('ready');
    expect(controller.state.menu.scale).toBe(92);
  });

  it('opens on launch when configured', async () => {
    const onOpenChange = vi.fn();
    const api = createApi(fixture({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } }));
    const controller = createMenuController(api, { onOpenChange });
    await controller.start();
    expect(controller.state.open).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('only starts once', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    await controller.start();
    expect(api.load).toHaveBeenCalledTimes(1);
  });

  it('reports load failures and stays usable', async () => {
    const api = createApi();
    api.load.mockRejectedValueOnce(new Error('bridge offline'));
    const controller = createMenuController(api);
    await controller.start();
    expect(controller.state.status).toBe('ready');
    expect(controller.state.error).toBe('bridge offline');
    expect(controller.state.launch).toEqual(DEFAULT_SETTINGS);
  });
});

describe('navigation and search', () => {
  it('switches tabs and clears search', async () => {
    const controller = createMenuController(createApi());
    await controller.start();
    controller.setQuery('scale');
    controller.setTab('interface');
    expect(controller.state.tab).toBe('interface');
    expect(controller.state.query).toBe('');
    expect(controller.state.searchOpen).toBe(false);
    expect(controller.state.accountOpen).toBe(false);
  });

  it('closes the account popover when switching tabs', async () => {
    const controller = createMenuController(createApi());
    await controller.start();
    controller.setAccountOpen(true);
    controller.setTab('interface');
    expect(controller.state.accountOpen).toBe(false);
  });

  it('ignores unknown tabs', async () => {
    const controller = createMenuController(createApi());
    await controller.start();
    controller.setTab('unknown');
    expect(controller.state.tab).toBe('client');
  });

  it('opens search when querying', async () => {
    const controller = createMenuController(createApi());
    controller.setQuery('gpu');
    expect(controller.state.searchOpen).toBe(true);
    expect(controller.state.query).toBe('gpu');
  });

  it('clears the query when search closes', async () => {
    const controller = createMenuController(createApi());
    controller.setQuery('gpu');
    controller.setSearchOpen(false);
    expect(controller.state.searchOpen).toBe(false);
    expect(controller.state.query).toBe('');
  });

  it('toggles search', async () => {
    const controller = createMenuController(createApi());
    controller.setSearchOpen();
    expect(controller.state.searchOpen).toBe(true);
    controller.setSearchOpen();
    expect(controller.state.searchOpen).toBe(false);
  });
});

describe('open state', () => {
  it('toggles open and notifies', async () => {
    const onOpenChange = vi.fn();
    const controller = createMenuController(createApi(), { onOpenChange });
    controller.toggleOpen();
    expect(controller.state.open).toBe(true);
    controller.toggleOpen();
    expect(controller.state.open).toBe(false);
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('does not notify for an unchanged state', () => {
    const onOpenChange = vi.fn();
    const controller = createMenuController(createApi(), { onOpenChange });
    controller.setOpen(false);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('closes the account popover when the menu closes', () => {
    const controller = createMenuController(createApi());
    controller.setOpen(true);
    controller.setAccountOpen(true);
    controller.setOpen(false);
    expect(controller.state.accountOpen).toBe(false);
  });

  it('toggles the account popover', () => {
    const controller = createMenuController(createApi());
    controller.setAccountOpen();
    expect(controller.state.accountOpen).toBe(true);
    controller.setAccountOpen(false);
    expect(controller.state.accountOpen).toBe(false);
  });
});

describe('confirmation', () => {
  it('opens a confirmation and closes the account popover', () => {
    const controller = createMenuController(createApi());
    controller.setAccountOpen(true);
    controller.setConfirmation('quit');
    expect(controller.state.confirmation).toBe('quit');
    expect(controller.state.accountOpen).toBe(false);
  });

  it('ignores unknown confirmation actions', () => {
    const controller = createMenuController(createApi());
    controller.setConfirmation('quit');
    controller.setConfirmation('delete-everything');
    expect(controller.state.confirmation).toBe('quit');
  });

  it('closes the confirmation when the menu closes', () => {
    const controller = createMenuController(createApi());
    controller.setOpen(true);
    controller.setConfirmation('reset');
    controller.setOpen(false);
    expect(controller.state.confirmation).toBeNull();
  });

  it('resets through the confirmation', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    controller.setConfirmation('reset');
    await controller.confirmAction();
    expect(api.resetMenu).toHaveBeenCalled();
    expect(controller.state.confirmation).toBeNull();
  });

  it('quits through the confirmation', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    controller.setConfirmation('quit');
    await controller.confirmAction();
    expect(api.quit).toHaveBeenCalled();
    expect(controller.state.confirmation).toBeNull();
  });
});

describe('updateLaunch', () => {
  it('updates optimistically and applies the response', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    await controller.updateLaunch({ fullscreen: false });
    expect(api.updateLaunch).toHaveBeenCalledWith({ fullscreen: false });
    expect(controller.state.launch.fullscreen).toBe(false);
  });

  it('computes restart requirements optimistically', async () => {
    let resolve;
    const api = createApi();
    api.updateLaunch.mockImplementationOnce(
      () => new Promise((done) => {
        resolve = () => done(fixture({ launch: { ...DEFAULT_SETTINGS, uncapFps: false } }));
      })
    );
    const controller = createMenuController(api);
    await controller.start();
    const pending = controller.updateLaunch({ uncapFps: false });
    expect(controller.state.restartRequired).toEqual(['uncapFps']);
    resolve();
    await pending;
    expect(controller.state.restartRequired).toEqual(['uncapFps']);
  });

  it('rolls back and reports failures', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    api.updateLaunch.mockRejectedValueOnce(new Error('write failed'));
    await controller.updateLaunch({ fullscreen: false });
    expect(controller.state.launch.fullscreen).toBe(true);
    expect(controller.state.restartRequired).toEqual([]);
    expect(controller.state.error).toBe('write failed');
  });

  it('clears errors', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    api.updateLaunch.mockRejectedValueOnce(new Error('nope'));
    await controller.updateLaunch({ fullscreen: false });
    controller.clearError();
    expect(controller.state.error).toBeNull();
  });
});

describe('updateMenu', () => {
  it('updates optimistically and applies the response', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    await controller.updateMenu({ scale: 90, sounds: true });
    expect(controller.state.menu.scale).toBe(90);
    expect(controller.state.menu.sounds).toBe(true);
  });

  it('normalizes optimistic values', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    await controller.updateMenu({ scale: 999, accent: 'ABC' });
    expect(controller.state.menu.scale).toBe(115);
    expect(controller.state.menu.accent).toBe('#aabbcc');
  });

  it('clears the scale preview when committing a scale', async () => {
    const controller = createMenuController(createApi());
    await controller.start();
    controller.setScalePreview(90);
    await controller.updateMenu({ scale: 92 });
    expect(controller.scalePreview()).toBeNull();
  });

  it('keeps the preview for unrelated updates', async () => {
    const controller = createMenuController(createApi());
    await controller.start();
    controller.setScalePreview(90);
    await controller.updateMenu({ sounds: true });
    expect(controller.scalePreview()).toBe(90);
  });

  it('rolls back and reports failures', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    api.updateMenu.mockRejectedValueOnce(new Error('write failed'));
    await controller.updateMenu({ scale: 90 });
    expect(controller.state.menu.scale).toBe(100);
    expect(controller.state.error).toBe('write failed');
  });

  it('handles invalid patches without throwing', async () => {
    const controller = createMenuController(createApi());
    await controller.start();
    await controller.updateMenu(null);
    expect(controller.state.menu).toEqual(DEFAULT_MENU_SETTINGS);
  });
});

describe('resetMenu', () => {
  it('restores defaults and applies the response', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    await controller.updateMenu({ scale: 90 });
    await controller.resetMenu();
    expect(api.resetMenu).toHaveBeenCalled();
    expect(controller.state.menu).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it('rolls back on failure', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.start();
    await controller.updateMenu({ scale: 90 });
    api.resetMenu.mockRejectedValueOnce(new Error('nope'));
    await controller.resetMenu();
    expect(controller.state.menu.scale).toBe(90);
    expect(controller.state.error).toBe('nope');
  });
});

describe('app actions', () => {
  it('relaunches', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.relaunch();
    expect(api.relaunch).toHaveBeenCalled();
  });

  it('quits', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.quit();
    expect(api.quit).toHaveBeenCalled();
  });

  it('opens external urls', async () => {
    const api = createApi();
    const controller = createMenuController(api);
    await controller.openExternal('https://kirka.io');
    expect(api.openExternal).toHaveBeenCalledWith('https://kirka.io');
  });

  it('reports action failures', async () => {
    const api = createApi();
    api.quit.mockRejectedValueOnce(new Error('quit failed'));
    const controller = createMenuController(api);
    await controller.quit();
    expect(controller.state.error).toBe('quit failed');
  });
});
