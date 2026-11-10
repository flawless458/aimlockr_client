import { createEffect, Show } from 'solid-js';
import { Icon } from './Icon.jsx';

const COPY = {
  reset: {
    title: 'Reset interface?',
    body: 'Restores access, appearance, and audio defaults.',
    action: 'Reset'
  },
  quit: {
    title: 'Quit client?',
    body: 'Closes kirka.io and this client.',
    action: 'Quit'
  }
};

/**
 * @param {{ controller: import('../controller.js').MenuController }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const ConfirmDialog = (props) => {
  const state = () => props.controller.state;
  const copy = () => COPY[state().confirmation];
  let cancelButton;

  createEffect(() => {
    if (state().confirmation) cancelButton?.focus?.({ preventScroll: true });
  });

  return (
    <Show when={state().confirmation}>
      <div
        class="confirm-overlay"
        onClick={() => props.controller.setConfirmation(null)}
      >
        <div
          class="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-label={copy().title}
          onClick={(event) => event.stopPropagation()}
        >
          <span class="confirm-icon">
            <Icon name={state().confirmation === 'quit' ? 'power' : 'reset'} size={18} />
          </span>
          <span class="confirm-title">{copy().title}</span>
          <p class="confirm-copy">{copy().body}</p>
          <div class="confirm-actions">
            <button
              type="button"
              class="confirm-cancel"
              ref={(element) => { cancelButton = element; }}
              disabled={state().confirmationBusy}
              onClick={() => props.controller.setConfirmation(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              class="confirm-submit"
              classList={{ 'is-danger': state().confirmation === 'quit' }}
              disabled={state().confirmationBusy}
              onClick={() => void props.controller.confirmAction()}
            >
              {state().confirmationBusy ? 'Working…' : copy().action}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
