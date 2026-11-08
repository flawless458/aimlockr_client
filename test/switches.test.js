import { describe, expect, it } from 'vitest';
import {
  ALWAYS_ON_SWITCHES,
  DISABLE_GPU_SWITCH,
  UNCAPPED_FPS_SWITCHES,
  applySwitches,
  buildSwitches
} from '../src/main/switches.js';

const names = (switches) => switches.map((entry) => entry.name);
const asRecord = (switches) => Object.fromEntries(switches.map((entry) => [entry.name, entry.value]));

describe('buildSwitches', () => {
  it('uncaps fps by default', () => {
    expect(names(buildSwitches({ fullscreen: true, uncapFps: true, gpuAcceleration: true })))
      .toEqual(expect.arrayContaining(names(UNCAPPED_FPS_SWITCHES)));
  });

  it('includes every uncap switch', () => {
    const record = asRecord(buildSwitches({ fullscreen: true, uncapFps: true, gpuAcceleration: true }));
    expect(record['disable-frame-rate-limit']).toBeUndefined();
    expect(record['disable-gpu-vsync']).toBeUndefined();
    expect(record['max-gum-fps']).toBe('9999');
  });

  it('drops uncap switches when fps capping is enabled', () => {
    const switches = buildSwitches({ fullscreen: true, uncapFps: false, gpuAcceleration: true });
    for (const name of names(UNCAPPED_FPS_SWITCHES)) expect(names(switches)).not.toContain(name);
  });

  it('disables gpu only when acceleration is off', () => {
    expect(names(buildSwitches({ fullscreen: true, uncapFps: true, gpuAcceleration: true }))).not.toContain(DISABLE_GPU_SWITCH.name);
    expect(names(buildSwitches({ fullscreen: true, uncapFps: true, gpuAcceleration: false }))).toContain(DISABLE_GPU_SWITCH.name);
  });

  it('keeps always-on switches regardless of settings', () => {
    for (const settings of [
      { fullscreen: true, uncapFps: true, gpuAcceleration: true },
      { fullscreen: false, uncapFps: false, gpuAcceleration: false }
    ]) {
      expect(names(buildSwitches(settings))).toEqual(expect.arrayContaining(names(ALWAYS_ON_SWITCHES)));
    }
  });

  it('keeps a stable order', () => {
    expect(names(buildSwitches({ fullscreen: true, uncapFps: true, gpuAcceleration: false }))).toEqual([
      'disable-frame-rate-limit',
      'disable-gpu-vsync',
      'max-gum-fps',
      'disable-gpu',
      ...names(ALWAYS_ON_SWITCHES)
    ]);
  });

  it('sets no-user-gesture-required for autoplay', () => {
    const record = asRecord(buildSwitches({ fullscreen: true, uncapFps: true, gpuAcceleration: true }));
    expect(record['autoplay-policy']).toBe('no-user-gesture-required');
  });

  it('applies defaults when settings are partial', () => {
    expect(names(buildSwitches({ uncapFps: false }))).not.toContain('disable-frame-rate-limit');
  });

  it('returns fresh switch objects', () => {
    const first = buildSwitches({ fullscreen: true, uncapFps: true, gpuAcceleration: true });
    first[0].name = 'mutated';
    const second = buildSwitches({ fullscreen: true, uncapFps: true, gpuAcceleration: true });
    expect(second[0].name).toBe('disable-frame-rate-limit');
  });
});

describe('applySwitches', () => {
  it('calls appendSwitch for every switch', () => {
    const calls = [];
    const commandLine = { appendSwitch: (name, value) => calls.push([name, value]) };
    const switches = buildSwitches({ fullscreen: true, uncapFps: true, gpuAcceleration: true });
    applySwitches(commandLine, switches);
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
