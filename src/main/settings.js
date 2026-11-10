/**
 * @typedef {object} Settings
 * @property {boolean} fullscreen
 * @property {boolean} uncapFps
 * @property {boolean} gpuAcceleration
 * @property {boolean} directComposition
 */

/** @typedef {keyof Settings} SettingKey */

/**
 * @typedef {object} DecodedSettings
 * @property {Settings} settings
 * @property {string | null} error
 */

export const SETTINGS_VERSION = 1;

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({
  fullscreen: true,
  uncapFps: true,
  gpuAcceleration: true,
  directComposition: false
});

/** @type {ReadonlyArray<SettingKey>} */
export const SETTING_KEYS = Object.freeze(['fullscreen', 'uncapFps', 'gpuAcceleration', 'directComposition']);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @param {string} error
 * @returns {DecodedSettings}
 */
const fallback = (error) => ({ settings: { ...DEFAULT_SETTINGS }, error });

/**
 * @param {unknown} raw
 * @param {Settings} [base]
 * @returns {Settings}
 */
export const normalizeSettings = (raw, base = DEFAULT_SETTINGS) => {
  const source = isRecord(raw) ? raw : {};
  /** @type {Settings} */
  const settings = { ...base };
  for (const key of SETTING_KEYS) {
    const value = source[key];
    if (typeof value === 'boolean') settings[key] = value;
  }
  return settings;
};

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
 * @returns {DecodedSettings}
 */
export const parseSettings = (text) => {
  const parsed = parseJson(text);
  if (parsed.error) return fallback(parsed.error);
  if (!isRecord(parsed.value)) return fallback('expected a JSON object');
  if (parsed.value.version !== SETTINGS_VERSION) return fallback(`unsupported settings version: ${String(parsed.value.version)}`);
  return { settings: normalizeSettings(parsed.value), error: null };
};

/**
 * @param {Partial<Settings>} settings
 * @returns {string}
 */
export const serializeSettings = (settings) =>
  `${JSON.stringify({ version: SETTINGS_VERSION, ...normalizeSettings(settings) }, null, 2)}\n`;
