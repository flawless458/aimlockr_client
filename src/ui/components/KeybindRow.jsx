import { createEffect, createSignal, onCleanup } from 'solid-js';
import { formatKeybind, readKeybind } from '../../shared/keybinds.js';
import { Icon } from './Icon.jsx';

/**
 * @param {{ value: string, label: string, disabled?: boolean, onChange: (keybind: string) => void }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const KeybindRow = (props) => {
  const [listening, setListening] = createSignal(false);
  const [message, setMessage] = createSignal('');

  const stop = () => {
    setListening(false);
    setMessage('');
  };

  createEffect(() => {
    if (!listening()) return;
    const onKeyDown = (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const reading = readKeybind(event);
      if (reading.canceled) {
        stop();
        return;
      }
      if (!reading.keybind) {
        setMessage('Unsupported key');
        return;
      }
      props.onChange(reading.keybind);
      stop();
    };
    const onPointerDown = (event) => {
      if (!event.target?.closest?.('.keybind-trigger')) stop();
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    onCleanup(() => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
    });
  });

  return (
    <div class="keybind">
      <button
        type="button"
        class="keybind-trigger"
        classList={{ 'is-listening': listening() }}
        aria-label={`${props.label}. ${listening() ? 'Press a key' : formatKeybind(props.value)}`}
        disabled={props.disabled}
        onClick={() => {
          setMessage('');
          setListening(!listening());
        }}
      >
        <Icon name="keyboard" size={13} />
        <span>{listening() ? 'Press a key' : formatKeybind(props.value)}</span>
      </button>
      <span class="keybind-message" classList={{ 'is-visible': message() !== '' }}>{message()}</span>
    </div>
  );
};
