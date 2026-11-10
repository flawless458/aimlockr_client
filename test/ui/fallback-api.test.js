import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/shared/launch-settings.js';
import { DEFAULT_MENU_SETTINGS } from '../../src/shared/menu-settings.js';
import { createFallbackApi } from '../../src/ui/fallback-api.js';

describe('createFallbackApi', () => {
  it('loads defaults', async () => {
    const api = createFallbackApi({});
    const snapshot = await api.load();
    expect(snapshot.launch).toEqual(DEFAULT_SETTINGS);
    expect(snapshot.appliedLaunch).toEqual(DEFAULT_SETTINGS);
    expect(snapshot.menu).toEqual(DEFAULT_MENU_SETTINGS);
    expect(snapshot.app.version).toBe('dev');
    expect(snapshot.restartRequired).toEqual([]);
  });

  it('returns independent snapshots', async () => {
    const api = createFallbackApi({});
    const first = await api.load();
    first.launch.fullscreen = false;
    first.menu.scale = 10;
    const second = await api.load();
    expect(second.launch.fullscreen).toBe(true);
    expect(second.menu.scale).toBe(100);
  });

  it('updates launch settings locally', async () => {
    const api = createFallbackApi({});
    const snapshot = await api.updateLaunch({ fullscreen: false, uncapFps: false });
    expect(snapshot.launch.fullscreen).toBe(false);
    expect(snapshot.launch.uncapFps).toBe(false);
    expect(snapshot.appliedLaunch.fullscreen).toBe(false);
    expect(snapshot.restartRequired).toEqual(['uncapFps']);
  });

  it('clears restart requirements when reverted', async () => {
    const api = createFallbackApi({});
    await api.updateLaunch({ uncapFps: false });
    const snapshot = await api.updateLaunch({ uncapFps: true });
    expect(snapshot.restartRequired).toEqual([]);
  });

  it('updates menu settings with normalization', async () => {
    const api = createFallbackApi({});
    const snapshot = await api.updateMenu({ scale: 500, accent: 'ABC', motion: 'warp' });
    expect(snapshot.menu.scale).toBe(115);
    expect(snapshot.menu.accent).toBe('#aabbcc');
    expect(snapshot.menu.motion).toBe('normal');
  });

  it('resets menu settings', async () => {
    const api = createFallbackApi({});
    await api.updateMenu({ scale: 90, sounds: true });
    const snapshot = await api.resetMenu();
    expect(snapshot.menu).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it('opens links through the window object', async () => {
    const open = vi.fn();
    const api = createFallbackApi({ open });
    await api.openExternal('https://kirka.io');
    expect(open).toHaveBeenCalledWith('https://kirka.io', '_blank', 'noopener');
  });

  it('does not throw without a window object', async () => {
    const api = createFallbackApi(null);
    await expect(api.openExternal('https://kirka.io')).resolves.toBe(true);
  });

  it('has no-op relaunch and quit', async () => {
    const api = createFallbackApi({});
    await expect(api.relaunch()).resolves.toBe(false);
    await expect(api.quit()).resolves.toBe(false);
  });
});
