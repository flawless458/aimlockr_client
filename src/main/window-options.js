/** @typedef {import('../shared/launch-settings.js').Settings} Settings */
/**
 * @typedef {object} WindowPreferences
 * @property {boolean} contextIsolation
 * @property {boolean} nodeIntegration
 * @property {boolean} sandbox
 * @property {boolean} spellcheck
 * @property {boolean} backgroundThrottling
 * @property {string} [preload]
 */

/**
 * @typedef {object} WindowOptions
 * @property {number} width
 * @property {number} height
 * @property {number} minWidth
 * @property {number} minHeight
 * @property {string} title
 * @property {boolean} autoHideMenuBar
 * @property {string} backgroundColor
 * @property {boolean} show
 * @property {WindowPreferences} webPreferences
 */

/**
 * @typedef {object} WindowOptionInput
 * @property {string} [preload]
 */

export const WINDOW_TITLE = 'aimlockr';
export const WINDOW_SIZE = Object.freeze({ width: 1280, height: 720, minWidth: 960, minHeight: 540 });

/** @type {WindowPreferences} */
export const WINDOW_PREFERENCES = Object.freeze({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: false,
  backgroundThrottling: false
});

/**
 * @param {WindowOptionInput} [input]
 * @returns {WindowOptions}
 */
export const windowOptions = ({ preload } = {}) => ({
  ...WINDOW_SIZE,
  title: WINDOW_TITLE,
  autoHideMenuBar: true,
  backgroundColor: '#000000',
  show: false,
  webPreferences: {
    ...WINDOW_PREFERENCES,
    ...(preload ? { preload } : {})
  }
});
