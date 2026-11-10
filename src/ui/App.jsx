import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { mixHex, withAlpha } from '../shared/color.js';
import { menuMotionDuration } from '../shared/menu-settings.js';
import { effectiveMenuScale } from '../shared/scale.js';
import { filterSections } from '../shared/search.js';
import { SettingsPage } from './components/SettingsPage.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Toolbar } from './components/Toolbar.jsx';
import { ConfirmDialog } from './components/ConfirmDialog.jsx';
import { Icon } from './components/Icon.jsx';
import { CLIENT_SECTIONS, INTERFACE_SECTIONS, SECTIONS_BY_TAB } from './sections.js';

/**
 * @param {{ controller: import('./controller.js').MenuController }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const App = (props) => {
  const state = () => props.controller.state;
  const [viewport, setViewport] = createSignal({ width: window.innerWidth, height: window.innerHeight });

  onMount(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update);
    onCleanup(() => window.removeEventListener('resize', update));
  });
  const sections = () => {
    const source = state().query ? [...CLIENT_SECTIONS, ...INTERFACE_SECTIONS] : SECTIONS_BY_TAB[state().tab] ?? [];
    return filterSections(source, state().query);
  };

  const style = () => {
    const motion = menuMotionDuration(state().menu);
    return {
      '--accent': state().menu.accent,
      '--accent-bright': mixHex(state().menu.accent, '#ffffff', 0.3),
      '--accent-soft': withAlpha(state().menu.accent, 0.16),
      '--accent-glow': withAlpha(state().menu.accent, 0.4),
      '--accent-wash': withAlpha(state().menu.accent, 0.055),
      '--motion': `${motion}ms`,
      '--motion-fast': `${Math.round(motion * 0.6)}ms`,
      '--motion-slow': `${Math.round(motion * 1.35)}ms`,
      '--menu-scale': String(
        effectiveMenuScale(
          props.controller.scalePreview() ?? state().menu.scale,
          viewport().width,
          viewport().height
        )
      )
    };
  };

  const closeFromScrim = () => {
    if (state().menu.closeOnOutsideClick) props.controller.setOpen(false);
  };

  return (
    <div
      class="aimlockr-root"
      data-open={String(state().open)}
      data-tab={state().tab}
      data-searching={String(state().query.trim() !== '')}
      data-blur={String(state().menu.blur)}
      data-animations={String(state().menu.animations)}
      style={style()}
    >
      <div class="menu-scrim" onClick={closeFromScrim} />
      <section
        class="menu-shell"
        data-menu-shell
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="aimlockr settings"
      >
        <Sidebar controller={props.controller} />
        <div class="menu-main">
          <Toolbar controller={props.controller} />
          <main class="menu-content">
            <Show
              when={state().status !== 'loading'}
              fallback={
                <div class="loading-state">
                  <span class="spinner" />
                  <span>Loading preferences</span>
                </div>
              }
            >
              <Show when={state().tab} keyed>
                <div class="page" data-tab={state().tab}>
                  <SettingsPage
                    sections={sections()}
                    controller={props.controller}
                    query={state().query}
                    tab={state().tab}
                  />
                </div>
              </Show>
            </Show>
          </main>
        </div>
        <ConfirmDialog controller={props.controller} />
        <Show when={state().error}>
          <div class="toast" role="alert">
            <Icon name="info" size={15} />
            <span class="toast-message">{state().error}</span>
            <button
              type="button"
              class="toast-close"
              aria-label="Dismiss error"
              onClick={() => props.controller.clearError()}
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        </Show>
      </section>
    </div>
  );
};
