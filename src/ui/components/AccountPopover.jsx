import { createEffect, onCleanup, Show } from 'solid-js';
import { Icon } from './Icon.jsx';

/**
 * @param {{ controller: import('../controller.js').MenuController }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const AccountPopover = (props) => {
  const state = () => props.controller.state;
  let root;

  const close = () => props.controller.setAccountOpen(false);

  createEffect(() => {
    if (!state().accountOpen) return;
    const onPointerDown = (event) => {
      if (root && !root.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    onCleanup(() => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    });
  });

  return (
    <div class="account-dock" ref={(element) => { root = element; }}>
      <Show when={state().accountOpen}>
        <div class="account-popover" role="dialog" aria-label="Profile and quick settings">
          <div class="account-header">
            <div class="avatar avatar-large"><Icon name="user" size={19} /></div>
            <div class="account-identity">
              <span class="account-name">Player</span>
              <span class="account-meta">Local profile</span>
            </div>
          </div>
          <div class="account-divider" />
          <button type="button" class="account-row" onClick={() => {
            close();
            props.controller.setTab('interface');
          }}>
            <Icon name="sliders" size={14} />
            <span class="account-row-label">Interface settings</span>
            <Icon name="chevron-right" size={13} />
          </button>
          <button type="button" class="account-row" onClick={() => props.controller.setConfirmation('reset')}>
            <Icon name="reset" size={14} />
            <span class="account-row-label">Reset interface</span>
          </button>
          <button type="button" class="account-row" onClick={() => void props.controller.relaunch().then(close)}>
            <Icon name="restart" size={14} />
            <span class="account-row-label">Restart client</span>
          </button>
          <button type="button" class="account-row is-danger" onClick={() => props.controller.setConfirmation('quit')}>
            <Icon name="power" size={14} />
            <span class="account-row-label">Quit client</span>
          </button>
          <div class="account-footer">v{state().app.version} · {state().app.platform}</div>
        </div>
      </Show>
      <button
        type="button"
        class="account-button"
        aria-expanded={state().accountOpen ? 'true' : 'false'}
        aria-label="Open profile and quick settings"
        onClick={() => props.controller.setAccountOpen(!state().accountOpen)}
      >
        <div class="avatar"><Icon name="user" size={15} /></div>
        <div class="account-button-copy">
          <span class="account-name">Player</span>
          <span class="account-meta">kirka.io</span>
        </div>
        <Icon name="chevron-right" size={14} class="account-chevron" />
      </button>
    </div>
  );
};
