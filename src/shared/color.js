const HEX_PATTERN = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const SHORT_HEX_PATTERN = /^#?[0-9a-f]{3}$/i;

export const DEFAULT_ACCENT = '#4e83ff';

/**
 * @typedef {object} Rgb
 * @property {number} r
 * @property {number} g
 * @property {number} b
 */

/**
 * @typedef {object} Hsv
 * @property {number} h
 * @property {number} s
 * @property {number} v
 */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export const isHexColor = (value) => typeof value === 'string' && HEX_PATTERN.test(value);

/**
 * @param {string} hex
 * @returns {string}
 */
const expandShortHex = (hex) => {
  const value = hex.replace('#', '');
  return `#${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}`;
};

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
export const normalizeHexColor = (value, fallback = DEFAULT_ACCENT) => {
  if (!isHexColor(value)) return normalizeHexColor(fallback, DEFAULT_ACCENT);
  const expanded = SHORT_HEX_PATTERN.test(value) ? expandShortHex(value) : value;
  return expanded.startsWith('#') ? expanded.toLowerCase() : `#${expanded.toLowerCase()}`;
};

/**
 * @param {string} hex
 * @returns {Rgb | null}
 */
export const hexToRgb = (hex) => {
  if (!isHexColor(hex)) return null;
  const normalized = normalizeHexColor(hex).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
};

/**
 * @param {Rgb} rgb
 * @returns {string}
 */
export const rgbToHex = ({ r, g, b }) => {
  /** @param {number} value */
  const channel = (value) => Math.round(clampNumber(value, 0, 255)).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
};

/**
 * @param {string} hex
 * @returns {Hsv}
 */
export const hexToHsv = (hex) => {
  const rgb = hexToRgb(hex) ?? /** @type {Rgb} */ (hexToRgb(DEFAULT_ACCENT));
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
};

/**
 * @param {Hsv} hsv
 * @returns {Rgb}
 */
export const hsvToRgb = ({ h, s, v }) => {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clampNumber(s, 0, 1);
  const value = clampNumber(v, 0, 1);
  const chroma = value * saturation;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const match = value - chroma;
  const [r, g, b] =
    section < 1 ? [chroma, x, 0] :
    section < 2 ? [x, chroma, 0] :
    section < 3 ? [0, chroma, x] :
    section < 4 ? [0, x, chroma] :
    section < 5 ? [x, 0, chroma] :
    [chroma, 0, x];
  return { r: Math.round((r + match) * 255), g: Math.round((g + match) * 255), b: Math.round((b + match) * 255) };
};

/**
 * @param {Hsv} hsv
 * @returns {string}
 */
export const hsvToHex = (hsv) => rgbToHex(hsvToRgb(hsv));

/**
 * @param {string} hex
 * @param {number} alpha
 * @returns {string}
 */
export const withAlpha = (hex, alpha) => {
  const rgb = hexToRgb(hex) ?? /** @type {Rgb} */ (hexToRgb(DEFAULT_ACCENT));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampNumber(alpha, 0, 1)})`;
};

/**
 * @param {string} from
 * @param {string} to
 * @param {number} amount
 * @returns {string}
 */
export const mixHex = (from, to, amount) => {
  const first = hexToRgb(from) ?? /** @type {Rgb} */ (hexToRgb(DEFAULT_ACCENT));
  const second = hexToRgb(to) ?? first;
  const ratio = clampNumber(amount, 0, 1);
  return rgbToHex({
    r: first.r + (second.r - first.r) * ratio,
    g: first.g + (second.g - first.g) * ratio,
    b: first.b + (second.b - first.b) * ratio
  });
};
