import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * @typedef {object} PathOptions
 * @property {Record<string, string | undefined>} [env]
 * @property {string} [platform]
 * @property {string} [home]
 */

export const APP_DIRECTORY = 'aimlockr';
export const CONFIG_FILENAME = 'config.json';
export const MENU_CONFIG_FILENAME = 'menu.json';

/**
 * @param {PathOptions} [options]
 * @returns {string}
 */
export const baseConfigDirectory = ({ env = process.env, platform = process.platform, home = homedir() } = {}) => {
  if (platform === 'win32') return env.APPDATA || join(home, 'AppData', 'Roaming');
  return env.XDG_CONFIG_HOME || join(home, '.config');
};

/**
 * @param {PathOptions} [options]
 * @returns {string}
 */
export const resolveSettingsPath = (options = {}) =>
  join(baseConfigDirectory(options), APP_DIRECTORY, CONFIG_FILENAME);

/**
 * @param {PathOptions} [options]
 * @returns {string}
 */
export const resolveMenuSettingsPath = (options = {}) =>
  join(baseConfigDirectory(options), APP_DIRECTORY, MENU_CONFIG_FILENAME);
