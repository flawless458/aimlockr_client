export const IPC_CHANNELS = Object.freeze({
  load: 'aimlockr:preferences:load',
  updateLaunch: 'aimlockr:preferences:update-launch',
  updateMenu: 'aimlockr:preferences:update-menu',
  resetMenu: 'aimlockr:preferences:reset-menu',
  relaunch: 'aimlockr:app:relaunch',
  quit: 'aimlockr:app:quit',
  openExternal: 'aimlockr:shell:open-external'
});

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export const isHttpUrl = (value) => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};
