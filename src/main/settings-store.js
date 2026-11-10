import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Effect } from 'effect';
import { DEFAULT_SETTINGS, normalizeSettings, parseSettings, serializeSettings } from './settings.js';

/** @typedef {import('../shared/launch-settings.js').Settings} Settings */
/** @typedef {import('../shared/launch-settings.js').DecodedSettings} DecodedSettings */

/**
 * @typedef {object} SettingsIo
 * @property {(path: string) => string} readFile
 * @property {(path: string, text: string) => void} writeFile
 * @property {(path: string) => void} makeDirectory
 */

/**
 * @typedef {object} SettingsStore
 * @property {Effect.Effect<Settings>} load
 * @property {(settings: Settings) => Effect.Effect<Settings, SettingsError>} save
 */

export class SettingsError extends Error {
  /**
   * @param {string} message
   * @param {unknown} [cause]
   */
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'SettingsError';
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
 * @returns {DecodedSettings}
 */
export const readSettings = (path, io) => {
  try {
    return parseSettings(io.readFile(path));
  } catch (error) {
    return { settings: { ...DEFAULT_SETTINGS }, error: `unable to read ${path}: ${String(error)}` };
  }
};

/**
 * @param {string} path
 * @param {Settings} settings
 * @param {SettingsIo} io
 * @returns {Settings}
 */
export const writeSettings = (path, settings, io) => {
  const normalized = normalizeSettings(settings);
  io.makeDirectory(dirname(path));
  io.writeFile(path, serializeSettings(normalized));
  return normalized;
};

/**
 * @param {string} path
 * @param {SettingsIo} [io]
 * @returns {SettingsStore}
 */
export const createSettingsStore = (path, io = nodeSettingsIo) => ({
  load: Effect.gen(function* () {
    const decoded = readSettings(path, io);
    if (decoded.error) yield* Effect.logWarning(`[aimlockr] ${decoded.error}`);
    return decoded.settings;
  }),
  save: (settings) =>
    Effect.try({
      try: () => writeSettings(path, settings, io),
      catch: (cause) => new SettingsError(`unable to save settings to ${path}`, cause)
    })
});
