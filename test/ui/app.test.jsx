// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { DEFAULT_SETTINGS, restartRequiredKeys } from '../../src/shared/launch-settings.js';
import { DEFAULT_MENU_SETTINGS, normalizeMenuSettings } from '../../src/shared/menu-settings.js';
import { App } from '../../src/ui/App.jsx';
import { createMenuController } from '../../src/ui/controller.js';

const app = { name: 'aimlockr', version: '1.0.0', platform: 'win32', electron: '44.0.0' };

const createApi = (overrides = {}) => {
  let snapshot = {
    launch: { ...DEFAULT_SETTINGS },
    appliedLaunch: { ...DEFAULT_SETTINGS },
    menu: { ...DEFAULT_MENU_SETTINGS },
    app: { ...app },
    restartRequired: [],
    ...overrides
  };
  const copy = () => structuredClone(snapshot);
  return {
    snapshot: () => copy(),
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

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 });
});

const setup = async (overrides = {}) => {
  const api = createApi(overrides);
  const controller = createMenuController(api);
  await controller.start();
  render(() => <App controller={controller} />);
  return { api, controller };
};

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const expectRowLabel = (label) => {
  expect([...document.querySelectorAll('.row-label')].some((element) => element.textContent === label)).toBe(true);
};

describe('client tab', () => {
  it('renders the four client toggles', async () => {
    await setup();
    expect(screen.getByRole('switch', { name: 'Fullscreen' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'GPU Acceleration' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Uncap FPS' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Real Raw Input' })).toBeTruthy();
  });

  it('reflects stored toggle values', async () => {
    await setup({ launch: { ...DEFAULT_SETTINGS, fullscreen: false } });
    expect(screen.getByRole('switch', { name: 'Fullscreen' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('switch', { name: 'Uncap FPS' }).getAttribute('aria-checked')).toBe('true');
  });

  it('removes non-setting status rows', async () => {
    await setup();
    expect(screen.queryByText('Frame Pacing')).toBeNull();
    expect(screen.queryByText('Restart Client')).toBeNull();
    expect(screen.queryByText('Quit Client')).toBeNull();
    expect(screen.queryByText('Version')).toBeNull();
  });

  it('persists a fullscreen change', async () => {
    const { api, controller } = await setup();
    fireEvent.click(screen.getByRole('switch', { name: 'Fullscreen' }));
    await waitFor(() => expect(api.updateLaunch).toHaveBeenCalledWith({ fullscreen: false }));
    expect(controller.state.launch.fullscreen).toBe(false);
    expect(screen.getByRole('switch', { name: 'Fullscreen' }).getAttribute('aria-checked')).toBe('false');
  });

  it('shows a restart chip for process flags', async () => {
    await setup();
    fireEvent.click(screen.getByRole('switch', { name: 'Uncap FPS' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restart' })).toBeTruthy());
  });

  it('does not show a restart chip for fullscreen', async () => {
    await setup();
    fireEvent.click(screen.getByRole('switch', { name: 'Fullscreen' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Restart' })).toBeNull());
  });

  it('disables raw input outside Windows', async () => {
    await setup({ app: { ...app, platform: 'linux' } });
    expect(screen.getByRole('switch', { name: 'Real Raw Input' }).disabled).toBe(true);
  });

  it('restarts from the toolbar chip', async () => {
    const { api } = await setup();
    fireEvent.click(screen.getByRole('switch', { name: 'Uncap FPS' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restart' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    await waitFor(() => expect(api.relaunch).toHaveBeenCalled());
  });

  it('does not render preset or breadcrumb chrome', async () => {
    await setup();
    expect(screen.queryByText('QUICK PRESETS')).toBeNull();
    expect(screen.queryByText('Settings')).toBeNull();
    expect(document.querySelector('.toolbar-page')).toBeNull();
  });
});

describe('row tooltips', () => {
  it('shows the note only after a five second hover', async () => {
    await setup();
    vi.useFakeTimers();
    const row = screen.getByText('Fullscreen').closest('.setting-row');
    fireEvent.mouseEnter(row);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await vi.advanceTimersByTimeAsync(4999);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(screen.getByRole('tooltip').textContent).toContain('Fullscreen applies immediately');
    fireEvent.mouseLeave(row);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('cancels the delay when the pointer leaves early', async () => {
    await setup();
    vi.useFakeTimers();
    const row = screen.getByText('Fullscreen').closest('.setting-row');
    fireEvent.mouseEnter(row);
    await vi.advanceTimersByTimeAsync(3000);
    fireEvent.mouseLeave(row);
    await vi.advanceTimersByTimeAsync(5000);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('uses the dynamic disabled note for sound volume', async () => {
    await setup();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    const row = (await screen.findByText('Sound Volume')).closest('.setting-row');
    fireEvent.mouseEnter(row);
    await vi.advanceTimersByTimeAsync(5000);
    expect(screen.getByRole('tooltip').textContent).toContain('Enable sounds');
  });
});

describe('interface tab', () => {
  it('switches to the interface tab', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    await waitFor(() => expect(screen.getByText('Menu Keybind')).toBeTruthy());
    expect(screen.queryByText('Fullscreen')).toBeNull();
    expect(screen.getByText('Accent Color')).toBeTruthy();
    expect(screen.getByText('Interface Sounds')).toBeTruthy();
  });

  it('persists a menu toggle', async () => {
    const { api, controller } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    fireEvent.click(await screen.findByRole('switch', { name: 'Backdrop Blur' }));
    await waitFor(() => expect(api.updateMenu).toHaveBeenCalledWith({ blur: false }));
    expect(controller.state.menu.blur).toBe(false);
  });

  it('captures a new keybind', async () => {
    const { api, controller } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    const trigger = await screen.findByRole('button', { name: /Menu Keybind/ });
    fireEvent.click(trigger);
    fireEvent.keyDown(window, { code: 'KeyK' });
    await waitFor(() => expect(api.updateMenu).toHaveBeenCalledWith({ keybind: 'KeyK' }));
    expect(controller.state.menu.keybind).toBe('KeyK');
    expect(screen.getByRole('button', { name: /Menu Keybind/ }).textContent.trim()).toBe('K');
  });

  it('captures a modifier keybind', async () => {
    const { api, controller } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    const trigger = await screen.findByRole('button', { name: /Menu Keybind/ });
    expect(trigger.textContent.trim()).toBe('Right Shift');
    fireEvent.click(trigger);
    fireEvent.keyDown(window, { code: 'ShiftLeft' });
    await waitFor(() => expect(api.updateMenu).toHaveBeenCalledWith({ keybind: 'ShiftLeft' }));
    expect(controller.state.menu.keybind).toBe('ShiftLeft');
    expect(screen.getByRole('button', { name: /Menu Keybind/ }).textContent.trim()).toBe('Left Shift');
  });

  it('cancels keybind capture with escape', async () => {
    const { api } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    fireEvent.click(await screen.findByRole('button', { name: /Menu Keybind/ }));
    fireEvent.keyDown(window, { code: 'Escape' });
    expect(api.updateMenu).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Menu Keybind/ }).textContent.trim()).toBe('Right Shift');
  });

  it('persists a select change', async () => {
    const { api } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Motion Speed' }));
    fireEvent.click(screen.getByRole('option', { name: 'Fast' }));
    await waitFor(() => expect(api.updateMenu).toHaveBeenCalledWith({ motion: 'fast' }));
  });

  it('previews and commits the menu scale', async () => {
    const { api, controller } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    const slider = await screen.findByRole('slider', { name: 'Menu Scale' });
    fireEvent.input(slider, { target: { value: '90' } });
    expect(controller.scalePreview()).toBe(90);
    expect(document.querySelector('.aimlockr-root').style.getPropertyValue('--menu-scale')).toBe('0.9');
    fireEvent.change(slider, { target: { value: '90' } });
    await waitFor(() => expect(api.updateMenu).toHaveBeenCalledWith({ scale: 90 }));
    expect(controller.state.menu.scale).toBe(90);
  });

  it('changes the accent color from a preset', async () => {
    const { api } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Accent Color' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use #ff5d8f' }));
    await waitFor(() => expect(api.updateMenu).toHaveBeenCalledWith({ accent: '#ff5d8f' }));
  });

  it('applies a hex color', async () => {
    const { api } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Accent Color' }));
    const input = screen.getByRole('textbox', { name: 'Hex color' });
    fireEvent.input(input, { target: { value: '#00FFAA' } });
    fireEvent.blur(input);
    await waitFor(() => expect(api.updateMenu).toHaveBeenCalledWith({ accent: '#00ffaa' }));
  });

  it('confirms before resetting the interface', async () => {
    const { api } = await setup({ menu: { ...DEFAULT_MENU_SETTINGS, scale: 90 } });
    fireEvent.click(screen.getByRole('button', { name: 'Open profile and quick settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Reset interface/ }));
    expect(api.resetMenu).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Reset interface?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset', exact: true }));
    await waitFor(() => expect(api.resetMenu).toHaveBeenCalled());
  });

  it('cancels an interface reset', async () => {
    const { api } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Open profile and quick settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Reset interface/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.resetMenu).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('search', () => {
  it('filters settings live', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search settings' }));
    const input = screen.getByPlaceholderText('Search settings');
    fireEvent.input(input, { target: { value: 'raw' } });
    expectRowLabel('Real Raw Input');
    expect(screen.queryByText('Fullscreen')).toBeNull();
    expect(screen.queryByText('DISPLAY')).toBeNull();
  });

  it('shows an empty state with no matches', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search settings' }));
    fireEvent.input(screen.getByPlaceholderText('Search settings'), { target: { value: 'zzz' } });
    expect(screen.getByText('No settings found')).toBeTruthy();
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });

  it('clears search on escape', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search settings' }));
    const input = screen.getByPlaceholderText('Search settings');
    fireEvent.input(input, { target: { value: 'gpu' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
  });

  it('closes search from the clear button', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close search' }));
    expect(screen.queryByPlaceholderText('Search settings')).toBeNull();
  });

  it('searches the interface tab', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search settings' }));
    fireEvent.input(screen.getByPlaceholderText('Search settings'), { target: { value: 'accent' } });
    expectRowLabel('Accent Color');
    expect(screen.queryByText('Menu Keybind')).toBeNull();
  });

  it('clears the active tab and highlights matches during global search', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search settings' }));
    fireEvent.input(screen.getByPlaceholderText('Search settings'), { target: { value: 'scale' } });
    expect(document.querySelector('.nav-item.is-active')).toBeNull();
    expect(document.querySelector('.search-match').textContent).toBe('Scale');
    expect(document.querySelector('.search-input').value).toBe('scale');
    expect(document.querySelector('.search-summary').getAttribute('aria-live')).toBe('polite');
  });

  it('shows a result count and tab context', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search settings' }));
    fireEvent.input(screen.getByPlaceholderText('Search settings'), { target: { value: 'scale' } });
    expect(screen.getByText('1 result')).toBeTruthy();
    expectRowLabel('Menu Scale');
    expect(document.querySelector('.section-tab').textContent).toBe('Interface');
    expect(document.querySelector('.aimlockr-root').getAttribute('data-searching')).toBe('true');
  });

  it('searches across tabs', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search settings' }));
    fireEvent.input(screen.getByPlaceholderText('Search settings'), { target: { value: 'scale' } });
    expectRowLabel('Menu Scale');
    expect(screen.queryByText('No settings found')).toBeNull();
  });
});

describe('account popover', () => {
  it('opens a compact action popover', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Open profile and quick settings' }));
    const dialog = screen.getByRole('dialog', { name: 'Profile and quick settings' });
    expect(within(dialog).getByText('Player')).toBeTruthy();
    expect(within(dialog).getByText('Interface settings')).toBeTruthy();
    expect(within(dialog).getByText('Reset interface')).toBeTruthy();
    expect(within(dialog).getByText('Restart client')).toBeTruthy();
    expect(within(dialog).getByText('Quit client')).toBeTruthy();
    expect(dialog.textContent).toContain('v1.0.0');
  });

  it('navigates to the interface tab', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Open profile and quick settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Interface settings/ }));
    await waitFor(() => expect(screen.getByText('Menu Keybind')).toBeTruthy());
  });

  it('restarts from the popover', async () => {
    const { api } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Open profile and quick settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Restart client/ }));
    await waitFor(() => expect(api.relaunch).toHaveBeenCalled());
  });

  it('confirms before quitting from the popover', async () => {
    const { api } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Open profile and quick settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Quit client/ }));
    expect(api.quit).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Quit client?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Quit', exact: true }));
    await waitFor(() => expect(api.quit).toHaveBeenCalled());
  });
});

describe('error state', () => {
  it('shows and dismisses a toast', async () => {
    const api = createApi();
    api.load.mockRejectedValueOnce(new Error('bridge offline'));
    const controller = createMenuController(api);
    await controller.start();
    render(() => <App controller={controller} />);
    expect(screen.getByRole('alert').textContent).toContain('bridge offline');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a loading state first', () => {
    const controller = createMenuController(createApi());
    render(() => <App controller={controller} />);
    expect(screen.getByText('Loading preferences')).toBeTruthy();
  });
});
