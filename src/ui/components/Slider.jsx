import { createEffect, createSignal } from 'solid-js';

/**
 * @param {{
 *   value: number,
 *   min: number,
 *   max: number,
 *   step?: number,
 *   suffix?: string,
 *   label: string,
 *   disabled?: boolean,
 *   onPreview?: (value: number) => void,
 *   onCommit: (value: number) => void
 * }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const Slider = (props) => {
  const [draft, setDraft] = createSignal(props.value);
  const [dragging, setDragging] = createSignal(false);
  const step = () => props.step ?? 1;
  const percent = () => ((draft() - props.min) / (props.max - props.min)) * 100;
  const display = () => `${Math.round(draft())}${props.suffix ?? ''}`;

  createEffect(() => {
    if (!dragging()) setDraft(props.value);
  });

  const update = (value) => {
    setDraft(value);
    props.onPreview?.(value);
  };

  return (
    <div class="slider" classList={{ 'is-disabled': props.disabled }} style={{ '--fill': `${percent()}%` }}>
      <input
        class="slider-input"
        type="range"
        min={props.min}
        max={props.max}
        step={step()}
        value={draft()}
        aria-label={props.label}
        aria-valuetext={display()}
        disabled={props.disabled}
        onPointerDown={() => setDragging(true)}
        onInput={(event) => update(Number(event.currentTarget.value))}
        onChange={(event) => {
          setDragging(false);
          const value = Number(event.currentTarget.value);
          setDraft(value);
          props.onCommit(value);
        }}
      />
      <span class="slider-value">{display()}</span>
    </div>
  );
};
