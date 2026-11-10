import { describe, expect, it } from 'vitest';
import {
  WINDOW_PREFERENCES,
  WINDOW_SIZE,
  WINDOW_TITLE,
  windowOptions
} from '../src/main/window-options.js';

describe('WINDOW_SIZE', () => {
  it('is a sane default size', () => {
    expect(WINDOW_SIZE).toEqual({ width: 1280, height: 720, minWidth: 960, minHeight: 540 });
  });
});

describe('WINDOW_PREFERENCES', () => {
  it('isolates the renderer', () => {
    expect(WINDOW_PREFERENCES.contextIsolation).toBe(true);
    expect(WINDOW_PREFERENCES.nodeIntegration).toBe(false);
    expect(WINDOW_PREFERENCES.sandbox).toBe(true);
  });

  it('disables background throttling so the game keeps rendering', () => {
    expect(WINDOW_PREFERENCES.backgroundThrottling).toBe(false);
  });
});

describe('windowOptions', () => {
  it('never asks for fullscreen at construction', () => {
    expect(windowOptions()).not.toHaveProperty('fullscreen');
  });

  it('applies the default size and minimums', () => {
    const options = windowOptions();
    expect(options.width).toBe(WINDOW_SIZE.width);
    expect(options.height).toBe(WINDOW_SIZE.height);
    expect(options.minWidth).toBe(WINDOW_SIZE.minWidth);
    expect(options.minHeight).toBe(WINDOW_SIZE.minHeight);
  });

  it('sets the title', () => {
    expect(windowOptions().title).toBe(WINDOW_TITLE);
  });

  it('hides the menu bar', () => {
    expect(windowOptions().autoHideMenuBar).toBe(true);
  });

  it('paints black before the page loads', () => {
    expect(windowOptions().backgroundColor).toBe('#000000');
  });

  it('starts hidden so the window only appears once ready', () => {
    expect(windowOptions().show).toBe(false);
  });

  it('copies secure web preferences', () => {
    expect(windowOptions().webPreferences).toEqual(WINDOW_PREFERENCES);
  });

  it('returns independent web preferences per call', () => {
    const first = windowOptions();
    first.webPreferences.sandbox = false;
    expect(windowOptions().webPreferences.sandbox).toBe(true);
  });

  it('does not set a preload by default', () => {
    expect(windowOptions().webPreferences).not.toHaveProperty('preload');
  });

  it('sets the menu preload when provided', () => {
    const options = windowOptions({ preload: 'C:\\app\\dist\\preload\\index.cjs' });
    expect(options.webPreferences.preload).toBe('C:\\app\\dist\\preload\\index.cjs');
  });

  it('keeps secure defaults alongside the preload', () => {
    const options = windowOptions({ preload: '/app/preload.cjs' });
    expect(options.webPreferences.contextIsolation).toBe(true);
    expect(options.webPreferences.sandbox).toBe(true);
    expect(options.webPreferences.nodeIntegration).toBe(false);
  });

  it('does not share preload options between calls', () => {
    const first = windowOptions({ preload: '/first.cjs' });
    const second = windowOptions({ preload: '/second.cjs' });
    expect(first.webPreferences.preload).toBe('/first.cjs');
    expect(second.webPreferences.preload).toBe('/second.cjs');
  });
});
