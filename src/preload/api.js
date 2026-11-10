import { IPC_CHANNELS } from '../shared/ipc.js';

/**
 * @typedef {object} IpcRendererLike
 * @property {(channel: string, payload?: unknown) => Promise<any>} invoke
 */

/**
 * @param {IpcRendererLike} ipcRenderer
 * @returns {import('../shared/api-contract.js').DesktopApi}
 */
export const createDesktopApi = (ipcRenderer) => ({
  load: () => ipcRenderer.invoke(IPC_CHANNELS.load),
  updateLaunch: (patch) => ipcRenderer.invoke(IPC_CHANNELS.updateLaunch, patch),
  updateMenu: (patch) => ipcRenderer.invoke(IPC_CHANNELS.updateMenu, patch),
  resetMenu: () => ipcRenderer.invoke(IPC_CHANNELS.resetMenu),
  relaunch: () => ipcRenderer.invoke(IPC_CHANNELS.relaunch),
  quit: () => ipcRenderer.invoke(IPC_CHANNELS.quit),
  openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.openExternal, url)
});
