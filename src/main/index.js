import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { Cause, Effect } from 'effect';
import { APP_USER_MODEL_ID, createElectronHost } from './electron-host.js';
import { launch } from './program.js';
import { createMenuSettingsStore } from './menu-settings-store.js';
import { createSettingsStore } from './settings-store.js';
import { resolveMenuSettingsPath, resolveSettingsPath } from './settings-path.js';

const host = createElectronHost();
const store = createSettingsStore(resolveSettingsPath());
const menuStore = createMenuSettingsStore(resolveMenuSettingsPath());
const appRoot = app.getAppPath();
const preloadPath = join(appRoot, 'dist', 'preload', 'index.cjs');

/**
 * @param {string} path
 * @returns {string | null}
 */
const readAsset = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    console.warn(`[aimlockr] unable to read ${path}: ${String(error)}`);
    return null;
  }
};

const uiScript = readAsset(join(appRoot, 'dist', 'ui', 'menu.js'));

app.setAppUserModelId(APP_USER_MODEL_ID);

/**
 * @param {Cause.Cause<unknown>} cause
 * @returns {Effect.Effect<void>}
 */
const reportFailure = (cause) =>
  Effect.sync(() => {
    console.error('[aimlockr] failed to start:', Cause.pretty(cause));
    host.quit();
  });

Effect.runPromise(
  launch({ host, store, menuStore, uiScript, preloadPath }).pipe(Effect.catchCause(reportFailure))
);
