/**
 * @param {{ size?: number, class?: string }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const LogoMark = (props) => (
  <svg
    class={props.class}
    width={props.size ?? 20}
    height={props.size ?? 20}
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    stroke-width="2.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M7 24L16 6l9 18" />
    <path d="M11 19h10" />
    <circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none" />
  </svg>
);
