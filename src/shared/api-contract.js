/** @typedef {import('./launch-settings.js').Settings} LaunchSettings */
/** @typedef {import('./launch-settings.js').SettingKey} LaunchSettingKey */
/** @typedef {import('./menu-settings.js').MenuSettings} MenuSettings */

/**
 * @typedef {object} AppInfo
 * @property {string} name
 * @property {string} version
 * @property {string} platform
 * @property {string} electron
 */

/**
 * @typedef {object} PreferencesSnapshot
 * @property {LaunchSettings} launch
 * @property {LaunchSettings} appliedLaunch
 * @property {MenuSettings} menu
 * @property {AppInfo} app
 * @property {LaunchSettingKey[]} restartRequired
 */

/**
 * @typedef {object} DesktopApi
 * @property {() => Promise<PreferencesSnapshot>} load
 * @property {(patch: Partial<LaunchSettings>) => Promise<PreferencesSnapshot>} updateLaunch
 * @property {(patch: Partial<MenuSettings>) => Promise<PreferencesSnapshot>} updateMenu
 * @property {() => Promise<PreferencesSnapshot>} resetMenu
 * @property {() => Promise<unknown>} relaunch
 * @property {() => Promise<unknown>} quit
 * @property {(url: string) => Promise<unknown>} openExternal
 */

export {};
