// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@solidjs/testing-library';
import { DEFAULT_SETTINGS, restartRequiredKeys } from '../../src/shared/launch-settings.js';
import { DEFAULT_MENU_SETTINGS, normalizeMenuSettings } from '../../src/shared/menu-settings.js';
import { installStyles, mountMenu } from '../../src/ui/boot.jsx';

const createApi = (overrides = {}) => {
  let snapshot = {
    launch: { ...DEFAULT_SETTINGS },
    appliedLaunch: { ...DEFAULT_SETTINGS },
    menu: { ...DEFAULT_MENU_SETTINGS },
    app: { name: 'aimlockr', version: '1.0.0', platform: 'win32', electron: '44.0.0' },
    restartRequired: [],
    ...overrides
  };
  const copy = () => structuredClone(snapshot);
  return {
    load: vi.fn(async () => copy()),
    updateLaunch: vi.fn(async (patch) => {
      snapshot.launch = { ...snapshot.launch, ...patch };
      snapshot.appliedLaunch = { ...snapshot.appliedLaunch, fullscreen: snapshot.launch.fullscreen };
      snapshot.restartRequired = restartRequiredKeys(snapshot.launch, snapshot.appliedLaunch);
      return copy();
    }),
    updateMenu: vi.fn(async (patch) => {
      snapshot.menu = normalizeMenuSettings(patch, snapshot.menu);
      return copy();
    }),
    resetMenu: vi.fn(async () => {
      snapshot.menu = { ...DEFAULT_MENU_SETTINGS };
      return copy();
    }),
    relaunch: vi.fn(async () => true),
    quit: vi.fn(async () => true),
    openExternal: vi.fn(async () => true)
  };
};

let mounted = null;
let api = null;

const mount = async (overrides = {}) => {
  api = createApi(overrides);
  window.aimlockr = api;
  mounted = mountMenu({ styles: '.aimlockr-root { color: red; }', windowObject: window, documentObject: document });
  await vi.waitFor(() => expect(mounted.controller.state.status).toBe('ready'));
  return mounted;
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.getElementById('aimlockr-menu-styles')?.remove();
  delete window.__aimlockrMenuMounted;
  delete window.aimlockr;
  document.exitPointerLock = vi.fn();
  window.requestAnimationFrame = (callback) => {
    callback(0);
    return 1;
  };
});

afterEach(() => {
  mounted?.dispose();
  mounted = null;
  api = null;
  delete window.aimlockr;
});

describe('mountMenu', () => {
  it('mounts the menu host and styles', async () => {
    const result = await mount();
    const host = document.getElementById('aimlockr-menu-root');
    expect(result.host).toBe(host);
    expect(host.querySelector('.aimlockr-root')).toBeTruthy();
    expect(host.querySelector('.menu-shell')).toBeTruthy();
    expect(document.getElementById('aimlockr-menu-styles').textContent).toContain('.aimlockr-root');
  });

  it('loads preferences into the UI', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, scale: 92 } });
    expect(api.load).toHaveBeenCalledTimes(1);
    expect(mounted.controller.state.menu.scale).toBe(92);
  });

  it('does not mount twice', async () => {
    await mount();
    expect(mountMenu({ windowObject: window, documentObject: document })).toBeNull();
  });

  it('falls back to the offline api without a bridge', async () => {
    delete window.aimlockr;
    mounted = mountMenu({ windowObject: window, documentObject: document });
    await vi.waitFor(() => expect(mounted.controller.state.status).toBe('ready'));
    expect(mounted.controller.state.launch).toEqual(DEFAULT_SETTINGS);
  });

  it('opens on launch', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    expect(mounted.controller.state.open).toBe(true);
  });

  it('removes the host on dispose', async () => {
    await mount();
    const host = mounted.host;
    mounted.dispose();
    expect(document.getElementById('aimlockr-menu-root')).toBeNull();
    expect(host.isConnected).toBe(false);
    expect(window.__aimlockrMenuMounted).toBe(false);
  });
});

describe('shortcuts', () => {
  it('opens and closes with the default keybind', async () => {
    await mount();
    expect(mounted.controller.state.open).toBe(false);
    fireEvent.keyDown(window, { code: 'ShiftRight' });
    expect(mounted.controller.state.open).toBe(true);
    expect(mounted.host.querySelector('.aimlockr-root').getAttribute('data-open')).toBe('true');
    expect(document.exitPointerLock).toHaveBeenCalled();
    fireEvent.keyDown(window, { code: 'ShiftRight' });
    expect(mounted.controller.state.open).toBe(false);
  });

  it('binds the menu to the right shift key by default', async () => {
    await mount();
    fireEvent.keyDown(window, { code: 'ShiftLeft' });
    expect(mounted.controller.state.open).toBe(false);
    fireEvent.keyDown(window, { code: 'Insert' });
    expect(mounted.controller.state.open).toBe(false);
    fireEvent.keyDown(window, { code: 'ShiftRight' });
    expect(mounted.controller.state.open).toBe(true);
  });

  it('opens while the game keeps a text field focused', async () => {
    await mount();
    const chat = document.createElement('input');
    chat.className = 'kirka-chat';
    document.body.append(chat);
    chat.focus();
    fireEvent.keyDown(chat, { code: 'ShiftRight' });
    expect(mounted.controller.state.open).toBe(true);
    fireEvent.keyDown(chat, { code: 'ShiftRight' });
    expect(mounted.controller.state.open).toBe(false);
    chat.remove();
  });

  it('ignores held down keys', async () => {
    await mount();
    fireEvent.keyDown(window, { code: 'ShiftRight', repeat: true });
    expect(mounted.controller.state.open).toBe(false);
    fireEvent.keyDown(window, { code: 'ShiftRight' });
    expect(mounted.controller.state.open).toBe(true);
    fireEvent.keyDown(window, { code: 'ShiftRight', repeat: true });
    expect(mounted.controller.state.open).toBe(true);
  });

  it('keeps the menu open when the keybind is typed into the search field', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, keybind: 'KeyK', openOnLaunch: true } });
    fireEvent.click(mounted.host.querySelector('button[aria-label="Search settings"]'));
    const input = mounted.host.querySelector('.search-input');
    input.focus();
    fireEvent.keyDown(input, { code: 'KeyK' });
    expect(mounted.controller.state.open).toBe(true);
  });

  it('closes with escape', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    fireEvent.keyDown(window, { code: 'Escape' });
    expect(mounted.controller.state.open).toBe(false);
  });

  it('honours a custom keybind', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, keybind: 'F8' } });
    fireEvent.keyDown(window, { code: 'ShiftRight' });
    expect(mounted.controller.state.open).toBe(false);
    fireEvent.keyDown(window, { code: 'F8' });
    expect(mounted.controller.state.open).toBe(true);
  });

  it('ignores the keybind while typing in the menu', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    fireEvent.click(mounted.host.querySelector('button[aria-label="Search settings"]'));
    const input = mounted.host.querySelector('.search-input');
    input.focus();
    fireEvent.keyDown(input, { code: 'ShiftRight' });
    expect(mounted.controller.state.open).toBe(true);
  });

  it('blocks game keyboard events while open', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    const gameHandler = vi.fn();
    window.addEventListener('keydown', gameHandler);
    const shell = mounted.host.querySelector('[data-menu-shell]');
    fireEvent.keyDown(shell, { code: 'KeyW' });
    expect(gameHandler).not.toHaveBeenCalled();
    gameHandler.mockClear();
    fireEvent.keyDown(document.body, { code: 'KeyW' });
    expect(gameHandler).not.toHaveBeenCalled();
    window.removeEventListener('keydown', gameHandler);
  });

  it('lets game keyboard events through while closed', async () => {
    await mount();
    const gameHandler = vi.fn();
    window.addEventListener('keydown', gameHandler);
    fireEvent.keyDown(document.body, { code: 'KeyW' });
    expect(gameHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', gameHandler);
  });

  it('keeps the menu open when escape clears the search', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    fireEvent.click(mounted.host.querySelector('button[aria-label="Search settings"]'));
    const input = mounted.host.querySelector('.search-input');
    fireEvent.input(input, { target: { value: 'scale' } });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    expect(mounted.controller.state.open).toBe(true);
    expect(mounted.controller.state.query).toBe('');
    expect(mounted.controller.state.searchOpen).toBe(true);
  });

  it('keeps the menu open while cancelling keybind capture', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    fireEvent.click(mounted.controller.state.tab === 'client' ? mounted.host.querySelectorAll('.nav-item')[1] : null);
    const trigger = await Promise.resolve(mounted.host.querySelector('.keybind-trigger'));
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });
    expect(mounted.controller.state.open).toBe(true);
    expect(trigger.textContent).toContain('Right Shift');
  });

  it('keeps the menu open when escape closes a select', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    fireEvent.click(mounted.host.querySelectorAll('.nav-item')[1]);
    await Promise.resolve();
    const trigger = mounted.host.querySelector('.select-trigger');
    fireEvent.click(trigger);
    expect(mounted.host.querySelector('.select-menu').classList.contains('is-open')).toBe(true);
    fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });
    expect(mounted.host.querySelector('.select-menu').classList.contains('is-open')).toBe(false);
    expect(mounted.controller.state.open).toBe(true);
  });

  it('closes a confirmation on escape without closing the menu', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    fireEvent.click(mounted.host.querySelector('button[aria-label="Open profile and quick settings"]'));
    fireEvent.click(mounted.host.querySelector('.account-row.is-danger'));
    expect(mounted.host.querySelector('.confirm-dialog')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(mounted.host.querySelector('.confirm-dialog')).toBeNull();
    expect(mounted.controller.state.open).toBe(true);
  });

  it('keeps the menu open when escape closes the account popover', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    fireEvent.click(mounted.host.querySelector('button[aria-label="Open profile and quick settings"]'));
    expect(mounted.host.querySelector('.account-popover')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(mounted.host.querySelector('.account-popover')).toBeNull();
    expect(mounted.controller.state.open).toBe(true);
  });

  it('stops responding after dispose', async () => {
    await mount();
    mounted.dispose();
    fireEvent.keyDown(window, { code: 'ShiftRight' });
    expect(mounted.controller.state.open).toBe(false);
  });
});

describe('scrim', () => {
  it('closes on outside click by default', async () => {
    await mount({ menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true } });
    fireEvent.click(mounted.host.querySelector('.menu-scrim'));
    expect(mounted.controller.state.open).toBe(false);
  });

  it('stays open when outside clicks are disabled', async () => {
    await mount({
      menu: { ...DEFAULT_MENU_SETTINGS, openOnLaunch: true, closeOnOutsideClick: false }
    });
    fireEvent.click(mounted.host.querySelector('.menu-scrim'));
    expect(mounted.controller.state.open).toBe(true);
  });
});

describe('installStyles', () => {
  it('updates an existing style element', () => {
    installStyles(document, '.one { color: red; }');
    installStyles(document, '.two { color: blue; }');
    const styles = document.querySelectorAll('#aimlockr-menu-styles');
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toBe('.two { color: blue; }');
  });

  it('does nothing for empty styles', () => {
    installStyles(document, '');
    expect(document.getElementById('aimlockr-menu-styles')).toBeNull();
  });
});
