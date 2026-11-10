import { normalizeHexColor, DEFAULT_ACCENT } from './color.js';
import { DEFAULT_KEYBIND, normalizeKeybind } from './keybinds.js';
import { MOTION_SPEEDS, motionDuration } from './motion.js';

/**
 * @typedef {object} MenuSettings
 * @property {string} keybind
 * @property {boolean} closeOnOutsideClick
 * @property {boolean} openOnLaunch
 * @property {number} scale
 * @property {string} accent
 * @property {boolean} blur
 * @property {boolean} animations
 * @property {string} motion
 * @property {boolean} sounds
 * @property {number} soundVolume
 */

/** @typedef {keyof MenuSettings} MenuSettingKey */

/**
 * @typedef {object} DecodedMenuSettings
 * @property {MenuSettings} settings
 * @property {string | null} error
 */

export const MENU_SETTINGS_VERSION = 2;
export const SCALE_RANGE = Object.freeze({ min: 85, max: 115 });
export const SOUND_VOLUME_RANGE = Object.freeze({ min: 0, max: 100 });

/** @type {Readonly<MenuSettings>} */
export const DEFAULT_MENU_SETTINGS = Object.freeze({
  keybind: DEFAULT_KEYBIND,
  closeOnOutsideClick: true,
  openOnLaunch: false,
  scale: 100,
  accent: DEFAULT_ACCENT,
  blur: true,
  animations: true,
  motion: 'normal',
  sounds: false,
  soundVolume: 60
});

/** @type {Readonly<Record<number, Readonly<Partial<MenuSettings>>>>} */
export const LEGACY_MENU_DEFAULTS = Object.freeze({
  1: Object.freeze({ keybind: 'Insert' })
});

/** @type {ReadonlyArray<MenuSettingKey>} */
export const MENU_SETTING_KEYS = Object.freeze([
  'keybind',
  'closeOnOutsideClick',
  'openOnLaunch',
  'scale',
  'accent',
  'blur',
  'animations',
  'motion',
  'sounds',
  'soundVolume'
]);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @param {unknown} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
const readBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

/**
 * @param {unknown} value
 * @param {{ min: number, max: number }} range
 * @param {number} fallback
 * @returns {number}
 */
const readInteger = (value, range, fallback) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.round(Math.min(range.max, Math.max(range.min, value)));
};

/**
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
const readMotion = (value, fallback) =>
  typeof value === 'string' && MOTION_SPEEDS.includes(value) ? value : fallback;

/**
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>}
 */
const migrateMenuSettings = (raw) => {
  const legacy = LEGACY_MENU_DEFAULTS[Number(raw.version)];
  if (!legacy) return raw;
  /** @type {Record<string, unknown>} */
  const migrated = { ...raw, version: MENU_SETTINGS_VERSION };
  for (const key of MENU_SETTING_KEYS) {
    if (migrated[key] === legacy[key]) migrated[key] = DEFAULT_MENU_SETTINGS[key];
  }
  return migrated;
};

/**
 * @param {unknown} raw
 * @param {MenuSettings} [base]
 * @returns {MenuSettings}
 */
export const normalizeMenuSettings = (raw, base = DEFAULT_MENU_SETTINGS) => {
  const source = isRecord(raw) ? raw : {};
  return {
    keybind: normalizeKeybind(source.keybind, base.keybind),
    closeOnOutsideClick: readBoolean(source.closeOnOutsideClick, base.closeOnOutsideClick),
    openOnLaunch: readBoolean(source.openOnLaunch, base.openOnLaunch),
    scale: readInteger(source.scale, SCALE_RANGE, base.scale),
    accent: normalizeHexColor(source.accent, base.accent),
    blur: readBoolean(source.blur, base.blur),
    animations: readBoolean(source.animations, base.animations),
    motion: readMotion(source.motion, base.motion),
    sounds: readBoolean(source.sounds, base.sounds),
    soundVolume: readInteger(source.soundVolume, SOUND_VOLUME_RANGE, base.soundVolume)
  };
};

/**
 * @param {MenuSettings} menu
 * @returns {number}
 */
export const menuMotionDuration = (menu) => motionDuration(menu.animations, menu.motion);

/**
 * @param {string} text
 * @returns {{ value: unknown, error: string | null }}
 */
const parseJson = (text) => {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (error) {
    return { value: undefined, error: `invalid JSON: ${String(error)}` };
  }
};

/**
 * @param {string} text
 * @returns {DecodedMenuSettings}
 */
export const parseMenuSettings = (text) => {
  const parsed = parseJson(text);
  if (parsed.error) return { settings: { ...DEFAULT_MENU_SETTINGS }, error: parsed.error };
  if (!isRecord(parsed.value)) return { settings: { ...DEFAULT_MENU_SETTINGS }, error: 'expected a JSON object' };
  const migrated = migrateMenuSettings(parsed.value);
  if (migrated.version !== MENU_SETTINGS_VERSION) {
    return {
      settings: { ...DEFAULT_MENU_SETTINGS },
      error: `unsupported menu settings version: ${String(parsed.value.version)}`
    };
  }
  return { settings: normalizeMenuSettings(migrated), error: null };
};

/**
 * @param {Partial<MenuSettings>} menu
 * @returns {string}
 */
export const serializeMenuSettings = (menu) =>
  `${JSON.stringify({ version: MENU_SETTINGS_VERSION, ...normalizeMenuSettings(menu) }, null, 2)}\n`;

/**
 * @param {MenuSettings} menu
 * @returns {MenuSettings}
 */
export const copyMenuSettings = (menu) => normalizeMenuSettings(menu, menu);
