import { Effect } from 'effect';
import { DEFAULT_MENU_SETTINGS } from '../shared/menu-settings.js';
import { KIRKA_URL, wireNavigation } from './links.js';
import { registerIpc } from './ipc.js';
import { createPreferences } from './preferences.js';
import { enableRawInput } from './raw-input.js';
import { applySwitches, buildSwitches } from './switches.js';
import { windowOptions } from './window-options.js';

/** @typedef {import('./host.js').Host} Host */
/** @typedef {import('./host.js').Window} Window */
/** @typedef {import('../shared/launch-settings.js').Settings} Settings */
/** @typedef {import('./settings-store.js').SettingsStore} SettingsStore */
/** @typedef {import('./menu-settings-store.js').MenuSettingsStore} MenuSettingsStore */

/**
 * @typedef {object} AppDependencies
 * @property {Host} host
 * @property {SettingsStore} store
 * @property {MenuSettingsStore} [menuStore]
 * @property {string | null} [uiScript]
 * @property {string} [preloadPath]
 */

/** @type {MenuSettingsStore} */
const memoryMenuStore = {
  load: Effect.succeed({ ...DEFAULT_MENU_SETTINGS }),
  save: (settings) => Effect.succeed(settings)
};

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
 * @param {import('./host.js').WebContents} webContents
 * @param {string | null | undefined} uiScript
 * @returns {void}
 */
const injectMenu = (webContents, uiScript) => {
  if (!uiScript) return;
  webContents.executeJavaScript(uiScript).catch((error) => {
    console.warn(`[aimlockr] unable to inject the menu: ${String(error)}`);
  });
};

/**
 * @param {Host} host
 * @param {Window} window
 * @param {Settings} settings
 * @param {{
 *   uiScript?: string | null,
 *   disposeIpc: () => void
 * }} runtime
 * @returns {void}
 */
const wireWindow = (host, window, settings, runtime) => {
  wireNavigation(window.webContents, (url) => {
    void host.openExternal(url);
  });
  window.webContents.on('dom-ready', () => {
    if (settings.rawInput && host.platform === 'win32') void enableRawInput(window.webContents);
    injectMenu(window.webContents, runtime.uiScript);
  });
  window.once('ready-to-show', () => enterFullscreen(window, settings));
  window.once('closed', () => runtime.disposeIpc());
  host.on('second-instance', () => activate(window));
  host.on('window-all-closed', () => {
    if (host.platform !== 'darwin') host.quit();
  });
};

/**
 * @param {AppDependencies} dependencies
 * @returns {Effect.Effect<void, unknown, never>}
 */
export const launch = ({ host, store, menuStore = memoryMenuStore, uiScript = null, preloadPath }) =>
  Effect.gen(function* () {
    const settings = yield* store.load;
    const menu = yield* menuStore.load;
    yield* store.save(settings).pipe(Effect.catch((error) => Effect.logWarning(`[aimlockr] ${error.message}`)));
    if (menuStore !== memoryMenuStore) {
      yield* menuStore.save(menu).pipe(Effect.catch((error) => Effect.logWarning(`[aimlockr] ${error.message}`)));
    }
    applySwitches(host.commandLine, buildSwitches(settings, host.platform));

    if (!host.requestSingleInstanceLock()) return yield* quit(host);

    yield* Effect.promise(() => host.whenReady());
    host.clearApplicationMenu();

    const window = host.createWindow(windowOptions({ preload: preloadPath }));
    const preferences = createPreferences({
      launch: settings,
      menu,
      saveLaunch: (next) => Effect.runPromise(store.save(next)),
      saveMenu: (next) => Effect.runPromise(menuStore.save(next)),
      applyFullscreen: (flag) => {
        if (!window.isDestroyed()) window.setFullScreen(flag);
      },
      app: { version: host.version, platform: host.platform, electron: host.electronVersion }
    });
    const disposeIpc = registerIpc({
      ipcMain: host.ipcMain,
      preferences,
      relaunch: host.relaunch,
      quit: host.quit,
      openExternal: host.openExternal
    });
    wireWindow(host, window, settings, { uiScript, disposeIpc });
    window.loadURL(KIRKA_URL);
    window.show();
  });
