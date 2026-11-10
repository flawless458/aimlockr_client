import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import {
  APP_DIRECTORY,
  CONFIG_FILENAME,
  MENU_CONFIG_FILENAME,
  baseConfigDirectory,
  resolveMenuSettingsPath,
  resolveSettingsPath
} from '../src/main/settings-path.js';

describe('baseConfigDirectory', () => {
  it('uses APPDATA on Windows', () => {
    expect(baseConfigDirectory({ platform: 'win32', env: { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' }, home: 'C:\\Users\\me' }))
      .toBe('C:\\Users\\me\\AppData\\Roaming');
  });

  it('falls back to AppData/Roaming on Windows without APPDATA', () => {
    expect(baseConfigDirectory({ platform: 'win32', env: {}, home: 'C:\\Users\\me' }))
      .toBe(join('C:\\Users\\me', 'AppData', 'Roaming'));
  });

  it('prefers XDG_CONFIG_HOME on Linux', () => {
    expect(baseConfigDirectory({ platform: 'linux', env: { XDG_CONFIG_HOME: '/tmp/config' }, home: '/home/me' }))
      .toBe('/tmp/config');
  });

  it('falls back to ~/.config on Linux', () => {
    expect(baseConfigDirectory({ platform: 'linux', env: {}, home: '/home/me' })).toBe(join('/home/me', '.config'));
  });

  it('falls back to ~/.config on macOS', () => {
    expect(baseConfigDirectory({ platform: 'darwin', env: {}, home: '/Users/me' })).toBe(join('/Users/me', '.config'));
  });
});

describe('resolveSettingsPath', () => {
  it('builds the Windows config path', () => {
    const path = resolveSettingsPath({ platform: 'win32', env: { APPDATA: 'C:\\AppData' }, home: 'C:\\Users\\me' });
    expect(path).toBe(join('C:\\AppData', APP_DIRECTORY, CONFIG_FILENAME));
  });

  it('builds the Linux config path', () => {
    const path = resolveSettingsPath({ platform: 'linux', env: { XDG_CONFIG_HOME: '/cfg' }, home: '/home/me' });
    expect(path).toBe(join('/cfg', APP_DIRECTORY, CONFIG_FILENAME));
  });

  it('ends with aimlockr/config.json', () => {
    expect(resolveSettingsPath({ platform: 'win32', env: { APPDATA: 'C:\\AppData' } }).endsWith(join('aimlockr', 'config.json')))
      .toBe(true);
  });
});

describe('resolveMenuSettingsPath', () => {
  it('builds the Windows menu path', () => {
    const path = resolveMenuSettingsPath({ platform: 'win32', env: { APPDATA: 'C:\\AppData' }, home: 'C:\\Users\\me' });
    expect(path).toBe(join('C:\\AppData', APP_DIRECTORY, MENU_CONFIG_FILENAME));
  });

  it('builds the Linux menu path', () => {
    const path = resolveMenuSettingsPath({ platform: 'linux', env: { XDG_CONFIG_HOME: '/cfg' }, home: '/home/me' });
    expect(path).toBe(join('/cfg', APP_DIRECTORY, 'menu.json'));
  });

  it('places menu.json next to config.json', () => {
    const options = { platform: 'win32', env: { APPDATA: 'C:\\AppData' }, home: 'C:\\Users\\me' };
    expect(resolveMenuSettingsPath(options)).toBe(join(join('C:\\AppData', APP_DIRECTORY), 'menu.json'));
    expect(resolveSettingsPath(options)).toBe(join(join('C:\\AppData', APP_DIRECTORY), 'config.json'));
  });
});
