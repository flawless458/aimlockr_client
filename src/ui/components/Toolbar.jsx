import { createEffect, Show } from 'solid-js';
import { Icon } from './Icon.jsx';

/**
 * @param {{ controller: import('../controller.js').MenuController }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const Toolbar = (props) => {
  const state = () => props.controller.state;
  let searchInput;

  createEffect(() => {
    if (state().searchOpen) searchInput?.focus();
  });

  return (
    <header class="toolbar">
      <div class="toolbar-right">
        <Show when={state().restartRequired.length > 0}>
          <button type="button" class="restart-chip" onClick={() => void props.controller.relaunch()}>
            <span class="status-dot" />
            Restart
          </button>
        </Show>
        <div class="search" classList={{ 'is-open': state().searchOpen }}>
          <Show
            when={state().searchOpen}
            fallback={
              <button
                type="button"
                class="search-trigger"
                aria-label="Search settings"
                onClick={() => props.controller.setSearchOpen(true)}
              >
                <Icon name="search" size={14} />
                <span>Search settings</span>
              </button>
            }
          >
            <Icon name="search" size={14} class="search-icon" />
            <input
              ref={(element) => { searchInput = element; }}
              class="search-input"
              type="text"
              spellcheck={false}
              placeholder="Search settings"
              aria-label="Search settings"
              value={state().query}
              onInput={(event) => props.controller.setQuery(event.currentTarget.value)}
              on:keydown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                if (state().query) props.controller.setQuery('');
                else props.controller.setSearchOpen(false);
              }}
            />
            <button
              type="button"
              class="search-clear"
              aria-label="Close search"
              onClick={() => props.controller.setSearchOpen(false)}
            >
              <Icon name="close" size={13} />
            </button>
          </Show>
        </div>
      </div>
    </header>
  );
};
