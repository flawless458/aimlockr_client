import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Effect } from 'effect';
import {
  DEFAULT_MENU_SETTINGS,
  normalizeMenuSettings,
  parseMenuSettings,
  serializeMenuSettings
} from '../shared/menu-settings.js';

/** @typedef {import('../shared/menu-settings.js').MenuSettings} MenuSettings */
/** @typedef {import('../shared/menu-settings.js').DecodedMenuSettings} DecodedMenuSettings */

/**
 * @typedef {object} SettingsIo
 * @property {(path: string) => string} readFile
 * @property {(path: string, text: string) => void} writeFile
 * @property {(path: string) => void} makeDirectory
 */

/**
 * @typedef {object} MenuSettingsStore
 * @property {Effect.Effect<MenuSettings>} load
 * @property {(settings: MenuSettings) => Effect.Effect<MenuSettings, MenuSettingsError>} save
 */

export class MenuSettingsError extends Error {
  /**
   * @param {string} message
   * @param {unknown} [cause]
   */
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'MenuSettingsError';
  }
}

/** @type {SettingsIo} */
export const nodeSettingsIo = {
  readFile: (path) => readFileSync(path, 'utf8'),
  writeFile: (path, text) => writeFileSync(path, text, 'utf8'),
  makeDirectory: (path) => {
    mkdirSync(path, { recursive: true });
  }
};

/**
 * @param {string} path
 * @param {SettingsIo} io
 * @returns {DecodedMenuSettings}
 */
export const readMenuSettings = (path, io) => {
  try {
    return parseMenuSettings(io.readFile(path));
  } catch (error) {
    return {
      settings: { ...DEFAULT_MENU_SETTINGS },
      error: `unable to read ${path}: ${String(error)}`
    };
  }
};

/**
 * @param {string} path
 * @param {MenuSettings} settings
 * @param {SettingsIo} io
 * @returns {MenuSettings}
 */
export const writeMenuSettings = (path, settings, io) => {
  const normalized = normalizeMenuSettings(settings);
  io.makeDirectory(dirname(path));
  io.writeFile(path, serializeMenuSettings(normalized));
  return normalized;
};

/**
 * @param {string} path
 * @param {SettingsIo} [io]
 * @returns {MenuSettingsStore}
 */
export const createMenuSettingsStore = (path, io = nodeSettingsIo) => ({
  load: Effect.gen(function* () {
    const decoded = readMenuSettings(path, io);
    if (decoded.error) yield* Effect.logWarning(`[aimlockr] ${decoded.error}`);
    return decoded.settings;
  }),
  save: (settings) =>
    Effect.try({
      try: () => writeMenuSettings(path, settings, io),
      catch: (cause) => new MenuSettingsError(`unable to save menu settings to ${path}`, cause)
    })
});
