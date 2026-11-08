import { Effect } from 'effect';
import { KIRKA_URL, wireNavigation } from './links.js';
import { applySwitches, buildSwitches } from './switches.js';
import { windowOptions } from './window-options.js';

/** @typedef {import('./host.js').Host} Host */
/** @typedef {import('./host.js').Window} Window */
/** @typedef {import('./settings.js').Settings} Settings */
/** @typedef {import('./settings-store.js').SettingsStore} SettingsStore */

/**
 * @typedef {object} AppDependencies
 * @property {Host} host
 * @property {SettingsStore} store
 */

/**
 * @param {Window} window
 * @returns {void}
 */
const activate = (window) => {
  if (window.isDestroyed()) return;
  window.show();
  window.focus();
};

/**
 * @param {Window} window
 * @param {Settings} settings
 * @returns {void}
 */
const enterFullscreen = (window, settings) => {
  if (window.isDestroyed()) return;
  if (settings.fullscreen) window.setFullScreen(true);
  window.focus();
};

/**
 * @param {Host} host
 * @returns {Effect.Effect<void>}
 */
const quit = (host) => Effect.sync(() => host.quit());

/**
 * @param {Host} host
 * @param {Window} window
 * @param {Settings} settings
 * @returns {void}
 */
const wireWindow = (host, window, settings) => {
  wireNavigation(window.webContents, (url) => {
    void host.openExternal(url);
  });
  window.once('ready-to-show', () => enterFullscreen(window, settings));
  host.on('second-instance', () => activate(window));
  host.on('window-all-closed', () => {
    if (host.platform !== 'darwin') host.quit();
  });
};

/**
 * @param {AppDependencies} dependencies
 * @returns {Effect.Effect<void, unknown, never>}
 */
export const launch = ({ host, store }) =>
  Effect.gen(function* () {
    const settings = yield* store.load;
    yield* store.save(settings).pipe(Effect.catch((error) => Effect.logWarning(`[aimlockr] ${error.message}`)));
    applySwitches(host.commandLine, buildSwitches(settings));

    if (!host.requestSingleInstanceLock()) return yield* quit(host);

    yield* Effect.promise(() => host.whenReady());

    const window = host.createWindow(windowOptions());
    wireWindow(host, window, settings);
    window.loadURL(KIRKA_URL);
    window.show();
  });
