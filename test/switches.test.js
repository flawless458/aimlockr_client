import { describe, expect, it } from 'vitest';
import {
  ALWAYS_ON_SWITCHES,
  DISABLE_GPU_SWITCH,
  UNCAPPED_FPS_SWITCHES,
  WINDOWS_SWITCHES,
  applySwitches,
  buildSwitches
} from '../src/main/switches.js';

const settings = { fullscreen: true, uncapFps: true, gpuAcceleration: true, rawInput: true };
const names = (switches) => switches.map((entry) => entry.name);
const asRecord = (switches) => Object.fromEntries(switches.map((entry) => [entry.name, entry.value]));

describe('buildSwitches', () => {
  it('uncaps fps by default', () => {
    expect(names(buildSwitches(settings, 'win32'))).toEqual(expect.arrayContaining(names(UNCAPPED_FPS_SWITCHES)));
  });

  it('includes every uncap switch', () => {
    const record = asRecord(buildSwitches(settings, 'win32'));
    expect(record['disable-frame-rate-limit']).toBeUndefined();
    expect(record['disable-gpu-vsync']).toBeUndefined();
    expect(record['max-gum-fps']).toBe('9999');
  });

  it('drops uncap switches when fps capping is enabled', () => {
    const switches = buildSwitches({ ...settings, uncapFps: false }, 'win32');
    for (const name of names(UNCAPPED_FPS_SWITCHES)) expect(names(switches)).not.toContain(name);
  });

  it('disables gpu only when acceleration is off', () => {
    expect(names(buildSwitches(settings, 'win32'))).not.toContain(DISABLE_GPU_SWITCH.name);
    expect(names(buildSwitches({ ...settings, gpuAcceleration: false }, 'win32'))).toContain(DISABLE_GPU_SWITCH.name);
  });

  it('keeps the KCC always-on switches regardless of settings', () => {
    for (const value of [settings, { ...settings, uncapFps: false, gpuAcceleration: false }]) {
      expect(names(buildSwitches(value, 'win32'))).toEqual(expect.arrayContaining(names(ALWAYS_ON_SWITCHES)));
    }
  });

  it('applies the Windows switches on Windows', () => {
    expect(names(buildSwitches(settings, 'win32'))).toEqual(expect.arrayContaining(names(WINDOWS_SWITCHES)));
  });

  it('skips the Windows switches elsewhere', () => {
    for (const platform of ['darwin', 'linux']) {
      expect(names(buildSwitches(settings, platform))).not.toEqual(expect.arrayContaining(names(WINDOWS_SWITCHES)));
    }
  });

  it('never disables direct composition', () => {
    for (const platform of ['win32', 'darwin', 'linux']) {
      expect(names(buildSwitches(settings, platform))).not.toContain('disable-direct-composition');
    }
  });

  it('uses d3d11 through ANGLE on Windows', () => {
    expect(asRecord(buildSwitches(settings, 'win32'))['use-angle']).toBe('d3d11');
  });

  it('disables the native Windows occlusion calculation', () => {
    expect(asRecord(buildSwitches(settings, 'win32'))['disable-features'])
      .toBe('CalculateNativeWinOcclusion,HardwareMediaKeyHandling');
  });

  it('keeps a stable order', () => {
    expect(names(buildSwitches({ ...settings, gpuAcceleration: false }, 'win32'))).toEqual([
      'disable-frame-rate-limit',
      'disable-gpu-vsync',
      'max-gum-fps',
      'disable-gpu',
      ...names(ALWAYS_ON_SWITCHES),
      ...names(WINDOWS_SWITCHES)
    ]);
  });

  it('sets the KCC navigation and autoplay values', () => {
    const record = asRecord(buildSwitches(settings, 'win32'));
    expect(record['autoplay-policy']).toBe('no-user-gesture-required');
    expect(record['overscroll-history-navigation']).toBe('0');
    expect(record['pull-to-refresh']).toBe('0');
  });

  it('applies defaults when settings are partial', () => {
    expect(names(buildSwitches({ uncapFps: false }, 'win32'))).not.toContain('disable-frame-rate-limit');
  });

  it('returns fresh switch objects', () => {
    const first = buildSwitches(settings, 'win32');
    first[0].name = 'mutated';
    const second = buildSwitches(settings, 'win32');
    expect(second[0].name).toBe('disable-frame-rate-limit');
  });

  it('omits the Windows switches when no platform is given', () => {
    expect(names(buildSwitches(settings))).not.toContain('use-angle');
  });
});

describe('applySwitches', () => {
  it('calls appendSwitch for every switch', () => {
    const calls = [];
    const switches = buildSwitches(settings, 'win32');
    applySwitches({ appendSwitch: (name, value) => calls.push([name, value]) }, switches);
    expect(calls).toHaveLength(switches.length);
  });

  it('passes values through', () => {
    const calls = [];
    applySwitches({ appendSwitch: (name, value) => calls.push([name, value]) }, [
      { name: 'max-gum-fps', value: '9999' },
      { name: 'disable-gpu' }
    ]);
    expect(calls).toEqual([
      ['max-gum-fps', '9999'],
      ['disable-gpu', undefined]
    ]);
  });

  it('does nothing for an empty list', () => {
    const calls = [];
    applySwitches({ appendSwitch: (name) => calls.push(name) }, []);
    expect(calls).toEqual([]);
  });
});
