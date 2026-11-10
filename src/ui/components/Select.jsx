import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { Icon } from './Icon.jsx';

/**
 * @param {{
 *   value: string,
 *   options: ReadonlyArray<{ value: string, label: string }>,
 *   label: string,
 *   icon?: string,
 *   placeholder?: string,
 *   disabled?: boolean,
 *   onChange: (value: string) => void
 * }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const Select = (props) => {
  const [open, setOpen] = createSignal(false);
  let trigger;
  let root;

  const selected = () => props.options.find((option) => option.value === props.value);
  const label = () => selected()?.label ?? props.placeholder ?? 'Select';

  const close = (focus = false) => {
    setOpen(false);
    if (focus) trigger?.focus();
  };

  const commit = (value) => {
    props.onChange(value);
    close(true);
  };

  createEffect(() => {
    if (!open()) return;
    const onPointerDown = (event) => {
      if (root && !root.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    });
  });

  return (
    <div class="select" ref={(element) => { root = element; }}>
      <button
        type="button"
        class="select-trigger"
        ref={(element) => { trigger = element; }}
        aria-haspopup="listbox"
        aria-expanded={open() ? 'true' : 'false'}
        aria-label={props.label}
        disabled={props.disabled}
        onClick={() => setOpen(!open())}
        on:keydown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Show when={props.icon}>
          <Icon name={props.icon} size={13} class="select-leading-icon" />
        </Show>
        <span class="select-value" classList={{ 'is-placeholder': !selected() }}>{label()}</span>
        <Icon name="chevron-down" size={13} class="select-chevron" />
      </button>
      <div class="select-menu" classList={{ 'is-open': open() }} role="listbox" aria-label={props.label}>
        <For each={props.options}>
          {(option) => (
            <button
              type="button"
              class="select-option"
              classList={{ 'is-selected': option.value === props.value }}
              role="option"
              aria-selected={option.value === props.value ? 'true' : 'false'}
              onClick={() => commit(option.value)}
            >
              <span>{option.label}</span>
              <Icon name="check" size={13} class="select-check" />
            </button>
          )}
        </For>
      </div>
    </div>
  );
};
