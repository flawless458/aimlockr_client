/**
 * @param {{ checked: boolean, label: string, disabled?: boolean, onChange: (checked: boolean) => void }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const Toggle = (props) => (
  <button
    type="button"
    class="toggle"
    classList={{ 'is-on': props.checked, 'is-disabled': props.disabled }}
    role="switch"
    aria-checked={props.checked ? 'true' : 'false'}
    aria-label={props.label}
    disabled={props.disabled}
    onClick={() => props.onChange(!props.checked)}
  >
    <span class="toggle-thumb" />
  </button>
);
