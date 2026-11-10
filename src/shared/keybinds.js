const KEYBIND_PATTERN =
  /^(?:F(?:[1-9]|1[0-2])|Key[A-Z]|Digit[0-9]|Numpad[0-9]|Insert|Delete|Home|End|PageUp|PageDown|Pause|ScrollLock|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Tab|CapsLock|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight)$/;

/** @type {Readonly<Record<string, string>>} */
export const KEYBIND_LABELS = Object.freeze({
  Insert: 'Insert',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  Pause: 'Pause',
  ScrollLock: 'Scroll Lock',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Tab: 'Tab',
  CapsLock: 'Caps Lock',
  ShiftLeft: 'Left Shift',
  ShiftRight: 'Right Shift',
  ControlLeft: 'Left Ctrl',
  ControlRight: 'Right Ctrl',
  AltLeft: 'Left Alt',
  AltRight: 'Right Alt'
});

export const DEFAULT_KEYBIND = 'ShiftRight';

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export const isSupportedKeybind = (value) => typeof value === 'string' && KEYBIND_PATTERN.test(value);

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
export const normalizeKeybind = (value, fallback = DEFAULT_KEYBIND) => {
  if (isSupportedKeybind(value)) return value;
  return isSupportedKeybind(fallback) ? fallback : DEFAULT_KEYBIND;
};

/**
 * @param {string} code
 * @returns {string}
 */
export const formatKeybind = (code) => {
  if (KEYBIND_LABELS[code]) return KEYBIND_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
};

/**
 * @typedef {object} KeybindReading
 * @property {string | null} keybind
 * @property {boolean} canceled
 */

/**
 * @param {{ code?: string }} event
 * @returns {KeybindReading}
 */
export const readKeybind = (event) => {
  if (event.code === 'Escape') return { keybind: null, canceled: true };
  if (!isSupportedKeybind(event.code)) return { keybind: null, canceled: false };
  return { keybind: event.code, canceled: false };
};

/**
 * @param {string} code
 * @returns {boolean}
 */
export const isModifierOnly = (code) =>
  ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(code);
