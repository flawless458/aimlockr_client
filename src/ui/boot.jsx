import { render } from 'solid-js/web';
import { App } from './App.jsx';
import { createMenuController } from './controller.js';
import { createFallbackApi } from './fallback-api.js';
import { playTick } from './sound.js';

const ROOT_ID = 'aimlockr-menu-root';
const STYLE_ID = 'aimlockr-menu-styles';
const KEYBIND_CAPTURE = '.keybind-trigger.is-listening';
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

/**
 * @param {Document} documentObject
 * @param {string} styles
 * @returns {void}
 */
export const installStyles = (documentObject, styles) => {
  if (!styles) return;
  const existing = documentObject.getElementById(STYLE_ID);
  if (existing) {
    existing.textContent = styles;
    return;
  }
  const element = documentObject.createElement('style');
  element.id = STYLE_ID;
  element.textContent = styles;
  documentObject.head.append(element);
};

/**
 * @param {EventTarget | null} target
 * @returns {boolean}
 */
const isEditable = (target) => {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(target.closest(EDITABLE_SELECTOR));
};

/**
 * @param {EventTarget | null} target
 * @returns {boolean}
 */
const isCapturingKeybind = (target) =>
  Boolean(target) && typeof target.closest === 'function' && Boolean(target.closest(KEYBIND_CAPTURE));

/**
 * @param {import('./controller.js').MenuController} controller
 * @param {HTMLElement} host
 * @param {Window} windowObject
 * @returns {() => void}
 */
export const attachShortcuts = (controller, host, windowObject) => {
  const state = controller.state;

  const isInsideHost = (target) =>
    typeof windowObject.Node !== 'undefined' && target instanceof windowObject.Node && host.contains(target);

  const openPopover = () =>
    Boolean(windowObject.document.querySelector('.select-menu.is-open, .color-popover.is-open, .account-popover'));

  const ignoresMenuKey = (event, target) => event.repeat || (isEditable(target) && isInsideHost(target));

  const onKeyDown = (event) => {
    const target = event.target;
    if (isCapturingKeybind(target)) return;
    if (event.code === 'Escape' && state.open && state.confirmation) {
      event.preventDefault();
      event.stopImmediatePropagation();
      controller.setConfirmation(null);
      return;
    }
    if (event.code === 'Escape' && state.open) {
      if (isEditable(target) || openPopover()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      controller.setOpen(false);
      return;
    }
    if (event.code === state.menu.keybind && !ignoresMenuKey(event, target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      controller.toggleOpen();
      return;
    }
    if (state.open && !isInsideHost(target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  const stopPropagation = (event) => event.stopPropagation();

  const onPointerUp = (event) => {
    if (!event.target || typeof event.target.closest !== 'function') return;
    if (!event.target.closest('button')) return;
    playTick(windowObject, controller.state.menu);
  };

  windowObject.addEventListener('keydown', onKeyDown, true);
  for (const type of ['keydown', 'keyup', 'keypress']) host.addEventListener(type, stopPropagation);
  host.addEventListener('pointerup', onPointerUp);

  return () => {
    windowObject.removeEventListener('keydown', onKeyDown, true);
    for (const type of ['keydown', 'keyup', 'keypress']) host.removeEventListener(type, stopPropagation);
    host.removeEventListener('pointerup', onPointerUp);
  };
};

/**
 * @param {{ styles?: string, windowObject?: Window, documentObject?: Document }} [options]
 * @returns {{ controller: import('./controller.js').MenuController, host: HTMLElement, dispose: () => void } | null}
 */
export const mountMenu = ({ styles = '', windowObject = window, documentObject = document } = {}) => {
  if (!documentObject.body) return null;
  if (windowObject.__aimlockrMenuMounted) return null;
  windowObject.__aimlockrMenuMounted = true;

  try {
    installStyles(documentObject, styles);
    const host = documentObject.createElement('div');
    host.id = ROOT_ID;
    documentObject.body.append(host);

    const api = windowObject.aimlockr ?? createFallbackApi(windowObject);
    const controller = createMenuController(api, {
      onOpenChange(open) {
        if (open) {
          documentObject.exitPointerLock?.();
          windowObject.requestAnimationFrame(() => {
            host.querySelector('[data-menu-shell]')?.focus?.({ preventScroll: true });
          });
          return;
        }
        const active = documentObject.activeElement;
        if (active && typeof active.blur === 'function') active.blur();
      }
    });

    const disposeRender = render(() => <App controller={controller} />, host);
    const disposeShortcuts = attachShortcuts(controller, host, windowObject);
    let disposed = false;
    void controller.start();

    return {
      controller,
      host,
      dispose() {
        if (disposed) return;
        disposed = true;
        disposeShortcuts();
        disposeRender();
        host.remove();
        windowObject.__aimlockrMenuMounted = false;
      }
    };
  } catch (error) {
    windowObject.__aimlockrMenuMounted = false;
    console.error(`[aimlockr] unable to mount the menu: ${String(error)}`);
    return null;
  }
};
