import { normalizeSettings } from './settings.js';

/** @typedef {import('../shared/launch-settings.js').Settings} Settings */

/**
 * @typedef {object} Switch
 * @property {string} name
 * @property {string} [value]
 */

/** @type {ReadonlyArray<Switch>} */
export const ALWAYS_ON_SWITCHES = Object.freeze([
  { name: 'disable-background-timer-throttling' },
  { name: 'disable-renderer-backgrounding' },
  { name: 'disable-backgrounding-occluded-windows' },
  { name: 'autoplay-policy', value: 'no-user-gesture-required' },
  { name: 'overscroll-history-navigation', value: '0' },
  { name: 'pull-to-refresh', value: '0' },
  { name: 'ignore-gpu-blocklist' }
]);

/** @type {ReadonlyArray<Switch>} */
export const WINDOWS_SWITCHES = Object.freeze([
  { name: 'use-angle', value: 'd3d11' },
  { name: 'disable-features', value: 'CalculateNativeWinOcclusion,HardwareMediaKeyHandling' }
]);

/** @type {ReadonlyArray<Switch>} */
export const UNCAPPED_FPS_SWITCHES = Object.freeze([
  { name: 'disable-frame-rate-limit' },
  { name: 'disable-gpu-vsync' },
  { name: 'max-gum-fps', value: '9999' }
]);

/** @type {Switch} */
export const DISABLE_GPU_SWITCH = Object.freeze({ name: 'disable-gpu' });

/**
 * @param {Settings} settings
 * @param {string} [platform]
 * @returns {Switch[]}
 */
export const buildSwitches = (settings, platform = '') => {
  const normalized = normalizeSettings(settings);
  return [
    ...(normalized.uncapFps ? UNCAPPED_FPS_SWITCHES : []),
    ...(normalized.gpuAcceleration ? [] : [DISABLE_GPU_SWITCH]),
    ...ALWAYS_ON_SWITCHES,
    ...(platform === 'win32' ? WINDOWS_SWITCHES : [])
  ].map((entry) => ({ ...entry }));
};

/**
 * @param {{ appendSwitch: (name: string, value?: string) => void }} commandLine
 * @param {ReadonlyArray<Switch>} switches
 * @returns {void}
 */
export const applySwitches = (commandLine, switches) => {
  for (const entry of switches) commandLine.appendSwitch(entry.name, entry.value);
};
