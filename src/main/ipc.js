import { IPC_CHANNELS, isHttpUrl } from '../shared/ipc.js';

/** @typedef {import('./preferences.js').PreferencesService} PreferencesService */

/**
 * @typedef {object} IpcMainLike
 * @property {(channel: string, listener: (event: unknown, payload: unknown) => unknown) => void} handle
 * @property {(channel: string) => void} removeHandler
 */

/**
 * @typedef {object} IpcDependencies
 * @property {IpcMainLike} ipcMain
 * @property {PreferencesService} preferences
 * @property {() => void} relaunch
 * @property {() => void} quit
 * @property {(url: string) => Promise<unknown> | unknown} openExternal
 */

/**
 * @param {IpcDependencies} dependencies
 * @returns {() => void}
 */
export const registerIpc = ({ ipcMain, preferences, relaunch, quit, openExternal }) => {
  /** @type {string[]} */
  const channels = [];

  /**
   * @param {string} channel
   * @param {(payload: unknown) => unknown} handler
   */
  const register = (channel, handler) => {
    ipcMain.handle(channel, (_event, payload) => Promise.resolve().then(() => handler(payload)));
    channels.push(channel);
  };

  register(IPC_CHANNELS.load, () => preferences.snapshot());
  register(IPC_CHANNELS.updateLaunch, (patch) => preferences.updateLaunch(patch));
  register(IPC_CHANNELS.updateMenu, (patch) => preferences.updateMenu(patch));
  register(IPC_CHANNELS.resetMenu, () => preferences.resetMenu());

  register(IPC_CHANNELS.relaunch, () => {
    relaunch();
    return true;
  });

  register(IPC_CHANNELS.quit, () => {
    quit();
    return true;
  });

  register(IPC_CHANNELS.openExternal, (payload) => {
    if (!isHttpUrl(payload)) throw new Error('unsupported external url');
    return Promise.resolve(openExternal(/** @type {string} */ (payload))).then(() => true);
  });

  return () => {
    for (const channel of channels) ipcMain.removeHandler(channel);
  };
};
