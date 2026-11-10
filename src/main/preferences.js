import { normalizeSettings, restartRequiredKeys } from '../shared/launch-settings.js';
import { DEFAULT_MENU_SETTINGS, normalizeMenuSettings } from '../shared/menu-settings.js';

/** @typedef {import('../shared/launch-settings.js').Settings} Settings */
/** @typedef {import('../shared/launch-settings.js').SettingKey} SettingKey */
/** @typedef {import('../shared/menu-settings.js').MenuSettings} MenuSettings */
/** @typedef {import('../shared/api-contract.js').AppInfo} AppInfo */
/** @typedef {import('../shared/api-contract.js').PreferencesSnapshot} PreferencesSnapshot */

/**
 * @typedef {object} PreferencesOptions
 * @property {Settings} launch
 * @property {MenuSettings} menu
 * @property {Settings} [appliedLaunch]
 * @property {(settings: Settings) => Promise<unknown>} [saveLaunch]
 * @property {(settings: MenuSettings) => Promise<unknown>} [saveMenu]
 * @property {(fullscreen: boolean) => void} [applyFullscreen]
 * @property {Partial<AppInfo>} [app]
 * @property {(error: unknown) => void} [onError]
 */

const noopSave = async () => undefined;
const noopFullscreen = () => undefined;
/**
 * @param {unknown} error
 * @returns {void}
 */
const logError = (error) => console.warn(`[aimlockr] ${String(error)}`);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @param {unknown} raw
 * @param {Settings} base
 * @returns {Settings}
 */
export const mergeLaunchSettings = (raw, base) => normalizeSettings(raw, base);

/**
 * @param {unknown} raw
 * @param {MenuSettings} base
 * @returns {MenuSettings}
 */
export const mergeMenuSettings = (raw, base) => normalizeMenuSettings(raw, base);

/**
 * @param {Partial<AppInfo>} [app]
 * @returns {AppInfo}
 */
const normalizeAppInfo = (app = {}) => ({
  name: typeof app.name === 'string' ? app.name : 'aimlockr',
  version: typeof app.version === 'string' ? app.version : '0.0.0',
  platform: typeof app.platform === 'string' ? app.platform : 'unknown',
  electron: typeof app.electron === 'string' ? app.electron : ''
});

/**
 * @param {PreferencesOptions} options
 */
export const createPreferences = ({
  launch,
  menu,
  appliedLaunch = launch,
  saveLaunch = noopSave,
  saveMenu = noopSave,
  applyFullscreen = noopFullscreen,
  app = {},
  onError = logError
}) => {
  let launchState = normalizeSettings(launch);
  let menuState = normalizeMenuSettings(menu);
  let appliedState = normalizeSettings(appliedLaunch, launchState);
  const appInfo = normalizeAppInfo(app);
  let saveQueue = Promise.resolve();

  /** @returns {PreferencesSnapshot} */
  const snapshot = () => ({
    launch: { ...launchState },
    appliedLaunch: { ...appliedState },
    menu: { ...menuState },
    app: { ...appInfo },
    restartRequired: restartRequiredKeys(launchState, appliedState)
  });

  /**
   * @template {Settings | MenuSettings} T
   * @param {(settings: T) => Promise<unknown>} save
   * @param {T} next
   * @returns {Promise<void>}
   */
  const persist = (save, next) => {
    saveQueue = saveQueue
      .then(() => save(next))
      .then(() => undefined)
      .catch((error) => {
        onError(error);
      });
    return saveQueue;
  };

  return {
    snapshot,

    /**
     * @param {unknown} patch
     * @returns {Promise<PreferencesSnapshot>}
     */
    async updateLaunch(patch) {
      const next = mergeLaunchSettings(patch, launchState);
      const fullscreenChanged = next.fullscreen !== appliedState.fullscreen;
      launchState = next;
      if (fullscreenChanged) {
        appliedState = { ...appliedState, fullscreen: next.fullscreen };
        try {
          applyFullscreen(next.fullscreen);
        } catch (error) {
          onError(error);
        }
      }
      await persist(saveLaunch, next);
      return snapshot();
    },

    /**
     * @param {unknown} patch
     * @returns {Promise<PreferencesSnapshot>}
     */
    async updateMenu(patch) {
      const next = mergeMenuSettings(isRecord(patch) ? patch : {}, menuState);
      menuState = next;
      await persist(saveMenu, next);
      return snapshot();
    },

    /** @returns {Promise<PreferencesSnapshot>} */
    async resetMenu() {
      menuState = { ...DEFAULT_MENU_SETTINGS };
      await persist(saveMenu, menuState);
      return snapshot();
    }
  };
};

/**
 * @typedef {object} PreferencesService
 * @property {() => PreferencesSnapshot} snapshot
 * @property {(patch: unknown) => Promise<PreferencesSnapshot>} updateLaunch
 * @property {(patch: unknown) => Promise<PreferencesSnapshot>} updateMenu
 * @property {() => Promise<PreferencesSnapshot>} resetMenu
 */
