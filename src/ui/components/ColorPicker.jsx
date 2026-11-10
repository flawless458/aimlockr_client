import { createEffect, createSignal, For, onCleanup } from 'solid-js';
import {
  clampNumber,
  hexToHsv,
  hsvToHex,
  isHexColor,
  normalizeHexColor,
  withAlpha
} from '../../shared/color.js';
import { Icon } from './Icon.jsx';

const SWATCHES = ['#4e83ff', '#4fd1e6', '#57d68d', '#f5c451', '#ff8a5b', '#ff5d8f', '#b07bff', '#e5e7eb'];

/**
 * @param {{ value: string, label: string, disabled?: boolean, onChange: (accent: string) => void }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const ColorPicker = (props) => {
  const [open, setOpen] = createSignal(false);
  const [hsv, setHsv] = createSignal(hexToHsv(props.value));
  const [hexText, setHexText] = createSignal(normalizeHexColor(props.value));
  const [dragging, setDragging] = createSignal(false);
  let root;
  let trigger;
  let panel;

  const currentHex = () => hsvToHex(hsv());

  createEffect(() => {
    const normalized = normalizeHexColor(props.value);
    if (dragging()) return;
    setHsv(hexToHsv(normalized));
    setHexText(normalized);
  });

  createEffect(() => {
    if (!open()) return;
    const onPointerDown = (event) => {
      if (root && !root.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        trigger?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    });
  });

  const commit = (value) => {
    const normalized = normalizeHexColor(value, props.value);
    setHsv(hexToHsv(normalized));
    setHexText(normalized);
    props.onChange(normalized);
  };

  const applyHex = () => {
    if (!isHexColor(hexText())) {
      setHexText(normalizeHexColor(props.value));
      return;
    }
    commit(hexText());
  };

  const updatePanel = (event) => {
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const s = clampNumber((event.clientX - rect.left) / rect.width, 0, 1);
    const v = 1 - clampNumber((event.clientY - rect.top) / rect.height, 0, 1);
    setHsv({ ...hsv(), s, v });
  };

  return (
    <div class="color-control" ref={(element) => { root = element; }}>
      <button
        type="button"
        class="color-trigger"
        ref={(element) => { trigger = element; }}
        aria-haspopup="dialog"
        aria-expanded={open() ? 'true' : 'false'}
        aria-label={props.label}
        disabled={props.disabled}
        onClick={() => setOpen(!open())}
      >
        <span class="color-swatch" style={{ background: props.value }} />
        <span class="color-trigger-value">{normalizeHexColor(props.value).toUpperCase()}</span>
        <Icon name="chevron-down" size={13} />
      </button>
      <div class="color-popover" classList={{ 'is-open': open() }} role="dialog" aria-label={`${props.label} picker`}>
        <div class="color-popover-header">
          <span class="color-title">
            <span class="color-swatch" style={{ background: currentHex() }} />
            Accent
          </span>
          <button type="button" class="popover-close" aria-label="Close color picker" onClick={() => setOpen(false)}>
            <Icon name="close" size={13} />
          </button>
        </div>
        <div
          class="color-field"
          ref={(element) => { panel = element; }}
          style={{ '--hue-color': `hsl(${hsv().h} 100% 50%)` }}
          onPointerDown={(event) => {
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            updatePanel(event);
          }}
          onPointerMove={(event) => {
            if (dragging()) updatePanel(event);
          }}
          onPointerUp={(event) => {
            if (!dragging()) return;
            setDragging(false);
            event.currentTarget.releasePointerCapture(event.pointerId);
            commit(currentHex());
          }}
          onPointerCancel={() => {
            setDragging(false);
            commit(currentHex());
          }}
        >
          <span
            class="color-thumb"
            style={{ left: `${hsv().s * 100}%`, top: `${(1 - hsv().v) * 100}%`, background: currentHex() }}
          />
        </div>
        <input
          class="color-hue"
          type="range"
          min="0"
          max="360"
          step="1"
          value={Math.round(hsv().h)}
          aria-label="Hue"
          onInput={(event) => setHsv({ ...hsv(), h: Number(event.currentTarget.value) })}
          onChange={(event) => commit(hsvToHex({ ...hsv(), h: Number(event.currentTarget.value) }))}
        />
        <div class="color-footer">
          <label class="color-hex-input">
            <span>HEX</span>
            <input
              type="text"
              spellcheck={false}
              value={hexText()}
              aria-label="Hex color"
              onInput={(event) => setHexText(event.currentTarget.value)}
              on:keydown={(event) => {
                if (event.key === 'Enter') applyHex();
              }}
              onBlur={applyHex}
            />
          </label>
          <div class="color-presets" role="group" aria-label="Accent presets">
            <For each={SWATCHES}>
              {(swatch) => (
                <button
                  type="button"
                  class="color-preset"
                  classList={{ 'is-selected': normalizeHexColor(swatch) === normalizeHexColor(props.value) }}
                  style={{ background: swatch, '--swatch-glow': withAlpha(swatch, 0.45) }}
                  aria-label={`Use ${swatch}`}
                  onClick={() => commit(swatch)}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
};
