import { DEFAULT_SETTINGS, normalizeSettings, restartRequiredKeys } from '../shared/launch-settings.js';
import { DEFAULT_MENU_SETTINGS, normalizeMenuSettings } from '../shared/menu-settings.js';

/**
 * @param {Window} [windowObject]
 * @returns {import('../shared/api-contract.js').DesktopApi}
 */
export const createFallbackApi = (windowObject = globalThis.window) => {
  let snapshot = {
    launch: { ...DEFAULT_SETTINGS },
    appliedLaunch: { ...DEFAULT_SETTINGS },
    menu: { ...DEFAULT_MENU_SETTINGS },
    app: {
      name: 'aimlockr',
      version: 'dev',
      platform: 'unknown',
      electron: ''
    },
    restartRequired: []
  };

  const copy = () => ({
    ...snapshot,
    launch: { ...snapshot.launch },
    appliedLaunch: { ...snapshot.appliedLaunch },
    menu: { ...snapshot.menu },
    app: { ...snapshot.app },
    restartRequired: [...snapshot.restartRequired]
  });

  return {
    load: async () => copy(),

    updateLaunch: async (patch) => {
      const launch = normalizeSettings(patch, snapshot.launch);
      const appliedLaunch = {
        ...snapshot.appliedLaunch,
        fullscreen: launch.fullscreen
      };
      snapshot = {
        ...snapshot,
        launch,
        appliedLaunch,
        restartRequired: restartRequiredKeys(launch, appliedLaunch)
      };
      return copy();
    },

    updateMenu: async (patch) => {
      snapshot = { ...snapshot, menu: normalizeMenuSettings(patch, snapshot.menu) };
      return copy();
    },

    resetMenu: async () => {
      snapshot = { ...snapshot, menu: { ...DEFAULT_MENU_SETTINGS } };
      return copy();
    },

    relaunch: async () => false,
    quit: async () => false,

    openExternal: async (url) => {
      windowObject?.open?.(url, '_blank', 'noopener');
      return true;
    }
  };
};
