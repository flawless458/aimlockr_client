import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KEYBIND,
  formatKeybind,
  isModifierOnly,
  isSupportedKeybind,
  normalizeKeybind,
  readKeybind
} from '../src/shared/keybinds.js';

describe('DEFAULT_KEYBIND', () => {
  it('binds the menu to the right shift key', () => {
    expect(DEFAULT_KEYBIND).toBe('ShiftRight');
    expect(isSupportedKeybind(DEFAULT_KEYBIND)).toBe(true);
  });
});

describe('isSupportedKeybind', () => {
  it.each([
    'Insert',
    'Delete',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    'F1',
    'F12',
    'KeyK',
    'Digit4',
    'Numpad7',
    'Tab',
    'Backquote',
    'ShiftLeft',
    'ShiftRight',
    'ControlLeft',
    'ControlRight',
    'AltLeft',
    'AltRight'
  ])('accepts %s', (code) => {
    expect(isSupportedKeybind(code)).toBe(true);
  });

  it.each(['Escape', 'Space', 'Enter', 'F13', 'Keya', 'Digit12', 'MetaLeft', '', 42, null, undefined])(
    'rejects %s',
    (code) => {
      expect(isSupportedKeybind(code)).toBe(false);
    }
  );
});

describe('normalizeKeybind', () => {
  it('keeps supported codes', () => {
    expect(normalizeKeybind('F8')).toBe('F8');
    expect(normalizeKeybind('ShiftRight')).toBe('ShiftRight');
  });

  it('falls back to the default', () => {
    expect(normalizeKeybind('Escape')).toBe(DEFAULT_KEYBIND);
    expect(normalizeKeybind(null)).toBe(DEFAULT_KEYBIND);
  });

  it('accepts a custom fallback', () => {
    expect(normalizeKeybind('Escape', 'PageDown')).toBe('PageDown');
  });

  it('falls back to the default for an invalid custom fallback', () => {
    expect(normalizeKeybind('Escape', 'Escape')).toBe(DEFAULT_KEYBIND);
  });
});

describe('formatKeybind', () => {
  it.each([
    ['KeyK', 'K'],
    ['Digit4', '4'],
    ['Numpad7', 'Num 7'],
    ['PageUp', 'Page Up'],
    ['PageDown', 'Page Down'],
    ['Insert', 'Insert'],
    ['Backquote', '`'],
    ['BracketLeft', '['],
    ['Semicolon', ';'],
    ['F9', 'F9'],
    ['ShiftRight', 'Right Shift'],
    ['ShiftLeft', 'Left Shift'],
    ['ControlRight', 'Right Ctrl'],
    ['AltLeft', 'Left Alt'],
    ['Something', 'Something']
  ])('formats %s as %s', (code, label) => {
    expect(formatKeybind(code)).toBe(label);
  });
});

describe('readKeybind', () => {
  it('reads a supported key', () => {
    expect(readKeybind({ code: 'KeyK' })).toEqual({ keybind: 'KeyK', canceled: false });
  });

  it('reads a modifier key', () => {
    expect(readKeybind({ code: 'ShiftRight' })).toEqual({ keybind: 'ShiftRight', canceled: false });
    expect(readKeybind({ code: 'ShiftLeft' })).toEqual({ keybind: 'ShiftLeft', canceled: false });
  });

  it('cancels on escape', () => {
    expect(readKeybind({ code: 'Escape' })).toEqual({ keybind: null, canceled: true });
  });

  it('reports unsupported keys', () => {
    expect(readKeybind({ code: 'Space' })).toEqual({ keybind: null, canceled: false });
    expect(readKeybind({ code: 'MetaRight' })).toEqual({ keybind: null, canceled: false });
    expect(readKeybind({})).toEqual({ keybind: null, canceled: false });
  });
});

describe('isModifierOnly', () => {
  it('recognizes modifiers', () => {
    expect(isModifierOnly('ShiftLeft')).toBe(true);
    expect(isModifierOnly('ShiftRight')).toBe(true);
    expect(isModifierOnly('MetaRight')).toBe(true);
    expect(isModifierOnly('KeyK')).toBe(false);
  });
});
