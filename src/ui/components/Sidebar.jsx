import { For } from 'solid-js';
import { NAV_ITEMS } from '../sections.js';
import { AccountPopover } from './AccountPopover.jsx';
import { Icon } from './Icon.jsx';
import { LogoMark } from './LogoMark.jsx';

/**
 * @param {{ controller: import('../controller.js').MenuController }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const Sidebar = (props) => {
  const state = () => props.controller.state;
  return (
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"><LogoMark size={21} /></div>
        <div class="brand-copy">
          <span class="brand-name">aimlockr</span>
          <span class="brand-subtitle">kirka.io</span>
        </div>
      </div>

      <nav class="nav" aria-label="Menu sections">
        <For each={NAV_ITEMS}>
          {(item) => (
            <button
              type="button"
              class="nav-item"
              classList={{ 'is-active': state().tab === item.id && !state().query }}
              aria-current={state().tab === item.id && !state().query ? 'page' : undefined}
              onClick={() => props.controller.setTab(item.id)}
            >
              <span class="nav-icon"><Icon name={item.icon} size={16} /></span>
              <span>{item.label}</span>
            </button>
          )}
        </For>
      </nav>

      <div class="sidebar-footer">
        <AccountPopover controller={props.controller} />
      </div>
    </aside>
  );
};
