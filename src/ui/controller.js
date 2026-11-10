import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { DEFAULT_SETTINGS, normalizeSettings, restartRequiredKeys } from '../shared/launch-settings.js';
import {
  DEFAULT_MENU_SETTINGS,
  normalizeMenuSettings
} from '../shared/menu-settings.js';

/** @typedef {import('../shared/api-contract.js').DesktopApi} DesktopApi */
/** @typedef {import('../shared/api-contract.js').PreferencesSnapshot} PreferencesSnapshot */

const TABS = ['client', 'interface'];

/** @type {PreferencesSnapshot['app']} */
const DEFAULT_APP = {
  name: 'aimlockr',
  version: '0.0.0',
  platform: 'unknown',
  electron: ''
};

/**
 * @param {unknown} app
 * @returns {PreferencesSnapshot['app']}
 */
const normalizeApp = (app) => {
  const source = typeof app === 'object' && app !== null ? app : {};
  return {
    name: typeof source.name === 'string' ? source.name : DEFAULT_APP.name,
    version: typeof source.version === 'string' ? source.version : DEFAULT_APP.version,
    platform: typeof source.platform === 'string' ? source.platform : DEFAULT_APP.platform,
    electron: typeof source.electron === 'string' ? source.electron : DEFAULT_APP.electron
  };
};

/**
 * @param {unknown} snapshot
 * @returns {Pick<PreferencesSnapshot, 'launch' | 'appliedLaunch' | 'menu' | 'app' | 'restartRequired'>}
 */
export const normalizeSnapshot = (snapshot) => {
  const source = typeof snapshot === 'object' && snapshot !== null ? snapshot : {};
  const launch = normalizeSettings(source.launch);
  const appliedLaunch = normalizeSettings(source.appliedLaunch, launch);
  return {
    launch,
    appliedLaunch,
    menu: normalizeMenuSettings(source.menu),
    app: normalizeApp(source.app),
    restartRequired: restartRequiredKeys(launch, appliedLaunch)
  };
};

/**
 * @param {DesktopApi} api
 * @param {{ onOpenChange?: (open: boolean) => void }} [options]
 */
export const createMenuController = (api, { onOpenChange = () => undefined } = {}) => {
  const [state, setState] = createStore({
    status: 'loading',
    error: null,
    launch: { ...DEFAULT_SETTINGS },
    appliedLaunch: { ...DEFAULT_SETTINGS },
    menu: { ...DEFAULT_MENU_SETTINGS },
    app: { ...DEFAULT_APP },
    restartRequired: [],
    open: false,
    tab: 'client',
    searchOpen: false,
    query: '',
    accountOpen: false,
    confirmation: null,
    confirmationBusy: false
  });
  const [scalePreview, setScalePreview] = createSignal(null);
  let started = false;

  /** @param {unknown} snapshot */
  const applySnapshot = (snapshot) => {
    const next = normalizeSnapshot(snapshot);
    setState(next);
  };

  /** @param {unknown} error */
  const reportError = (error) => {
    const message = error instanceof Error ? error.message : String(error);
    setState('error', message);
  };

  return {
    state,
    scalePreview,
    setScalePreview,
    clearError: () => setState('error', null),

    async start() {
      if (started) return;
      started = true;
      try {
        const snapshot = await api.load();
        applySnapshot(snapshot);
        setState('status', 'ready');
        if (state.menu.openOnLaunch) this.setOpen(true);
      } catch (error) {
        setState('status', 'ready');
        reportError(error);
      }
    },

    /** @param {boolean} [open] */
    setOpen(open = !state.open) {
      if (open === state.open) return;
      setState('open', open);
      if (!open) setState('accountOpen', false);
      if (!open) setState('confirmation', null);
      onOpenChange(open);
    },

    toggleOpen() {
      this.setOpen(!state.open);
    },

    /** @param {string} tab */
    setTab(tab) {
      if (!TABS.includes(tab)) return;
      setState('tab', tab);
      setState('searchOpen', false);
      setState('query', '');
      setState('accountOpen', false);
      setState('confirmation', null);
    },

    /** @param {string} query */
    setQuery(query) {
      setState('query', query);
      setState('searchOpen', true);
    },

    /** @param {boolean} [open] */
    setSearchOpen(open = !state.searchOpen) {
      setState('searchOpen', open);
      if (!open) setState('query', '');
    },

    /** @param {boolean} [open] */
    setAccountOpen(open = !state.accountOpen) {
      setState('accountOpen', open);
    },

    /** @param {null | 'reset' | 'quit'} action */
    setConfirmation(action) {
      if (action !== null && action !== 'reset' && action !== 'quit') return;
      setState('confirmation', action);
      if (action) setState('accountOpen', false);
    },

    async confirmAction() {
      const action = state.confirmation;
      if (!action || state.confirmationBusy) return;
      setState('confirmationBusy', true);
      if (action === 'reset') await this.resetMenu();
      if (action === 'quit') await this.quit();
      setState('confirmationBusy', false);
      setState('confirmation', null);
    },

    /** @param {Partial<import('../shared/launch-settings.js').Settings>} patch */
    async updateLaunch(patch) {
      const previous = { ...state.launch };
      const next = normalizeSettings(patch, state.launch);
      setState('launch', next);
      setState('restartRequired', restartRequiredKeys(next, state.appliedLaunch));
      try {
        applySnapshot(await api.updateLaunch(patch));
      } catch (error) {
        setState('launch', previous);
        setState('restartRequired', restartRequiredKeys(previous, state.appliedLaunch));
        reportError(error);
      }
    },

    /** @param {Partial<import('../shared/menu-settings.js').MenuSettings>} patch */
    async updateMenu(patch) {
      const previous = { ...state.menu };
      const next = normalizeMenuSettings(patch, state.menu);
      setState('menu', next);
      if (patch && typeof patch === 'object' && 'scale' in patch) setScalePreview(null);
      try {
        applySnapshot(await api.updateMenu(patch));
      } catch (error) {
        setState('menu', previous);
        reportError(error);
      }
    },

    async resetMenu() {
      const previous = { ...state.menu };
      setState('menu', { ...DEFAULT_MENU_SETTINGS });
      try {
        applySnapshot(await api.resetMenu());
      } catch (error) {
        setState('menu', previous);
        reportError(error);
      }
    },

    async relaunch() {
      try {
        await api.relaunch();
      } catch (error) {
        reportError(error);
      }
    },

    async quit() {
      try {
        await api.quit();
      } catch (error) {
        reportError(error);
      }
    },

    /** @param {string} url */
    async openExternal(url) {
      try {
        await api.openExternal(url);
      } catch (error) {
        reportError(error);
      }
    }
  };
};

/** @typedef {ReturnType<typeof createMenuController>} MenuController */
