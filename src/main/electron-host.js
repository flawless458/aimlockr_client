import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';

/** @typedef {import('./host.js').Host} Host */
/** @typedef {import('./host.js').Window} Window */
/** @typedef {import('./window-options.js').WindowOptions} WindowOptions */

export const APP_USER_MODEL_ID = 'com.aimlockr.client';

/** @returns {Host} */
export const createElectronHost = () => ({
  commandLine: app.commandLine,
  ipcMain: {
    handle: (channel, listener) => ipcMain.handle(channel, listener),
    removeHandler: (channel) => ipcMain.removeHandler(channel)
  },
  platform: process.platform,
  version: app.getVersion(),
  electronVersion: process.versions.electron ?? '',
  whenReady: () => app.whenReady(),
  requestSingleInstanceLock: () => app.requestSingleInstanceLock(),
  on: (event, listener) => {
    /** @type {{ on: (event: string, listener: () => void) => void }} */ (/** @type {unknown} */ (app)).on(event, listener);
  },
  createWindow: (options) => /** @type {Window} */ (/** @type {unknown} */ (new BrowserWindow(options))),
  clearApplicationMenu: () => Menu.setApplicationMenu(null),
  openExternal: (url) => shell.openExternal(url),
  relaunch: () => {
    app.relaunch();
    app.exit(0);
  },
  quit: () => app.quit()
});
