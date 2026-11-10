import { contextBridge, ipcRenderer } from 'electron';
import { createDesktopApi } from './api.js';

/**
 * @param {{ isMainFrame?: boolean }} processInfo
 * @returns {boolean}
 */
export const isMainFrame = (processInfo) => processInfo.isMainFrame !== false;

/**
 * @param {{ exposeInMainWorld: (name: string, api: unknown) => void }} bridge
 * @param {import('../shared/api-contract.js').DesktopApi} api
 * @param {Record<string, unknown> | Window} globalObject
 * @returns {boolean}
 */
export const installDesktopApi = (bridge, api, globalObject) => {
  if (/** @type {Record<string, unknown>} */ (globalObject).aimlockr) return false;
  bridge.exposeInMainWorld('aimlockr', api);
  return true;
};

if (isMainFrame(process)) {
  try {
    installDesktopApi(contextBridge, createDesktopApi(ipcRenderer), window);
  } catch (error) {
    console.error(`[aimlockr] unable to expose the desktop api: ${String(error)}`);
  }
}
