/** @typedef {import('./window-options.js').WindowOptions} WindowOptions */

/**
 * @typedef {object} CommandLine
 * @property {(name: string, value?: string) => void} appendSwitch
 */

/**
 * @typedef {object} WebContents
 * @property {(handler: (details: { url: string }) => { action: 'allow' | 'deny' }) => void} setWindowOpenHandler
 * @property {(event: 'will-navigate' | 'dom-ready', listener: (event: { preventDefault: () => void }, url: string) => void) => void} on
 * @property {(code: string) => Promise<unknown>} executeJavaScript
 */

/**
 * @typedef {object} Window
 * @property {(url: string) => void} loadURL
 * @property {WebContents} webContents
 * @property {() => void} show
 * @property {() => void} focus
 * @property {(flag: boolean) => void} setFullScreen
 * @property {() => boolean} isDestroyed
 * @property {(event: 'ready-to-show' | 'closed', listener: () => void) => void} once
 */

/**
 * @typedef {object} IpcMain
 * @property {(channel: string, listener: (event: unknown, payload: unknown) => unknown) => void} handle
 * @property {(channel: string) => void} removeHandler
 */

/**
 * @typedef {object} Host
 * @property {CommandLine} commandLine
 * @property {IpcMain} ipcMain
 * @property {string} platform
 * @property {string} version
 * @property {string} electronVersion
 * @property {() => Promise<void>} whenReady
 * @property {() => boolean} requestSingleInstanceLock
 * @property {(event: string, listener: () => void) => void} on
 * @property {(options: WindowOptions) => Window} createWindow
 * @property {() => void} clearApplicationMenu
 * @property {(url: string) => Promise<unknown>} openExternal
 * @property {() => void} relaunch
 * @property {() => void} quit
 */
