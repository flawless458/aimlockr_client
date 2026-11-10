const ICON_PATHS = {
  monitor: ['M3 5h18v11H3z', 'M9 20h6', 'M12 16v4'],
  maximize: ['M8 3H3v5', 'M16 3h5v5', 'M8 21H3v-5', 'M16 21h5v-5'],
  scale: ['M4 10V4h6', 'M20 14v6h-6', 'M4 4l6 6', 'M20 20l-6-6'],
  launch: ['M7 17L17 7', 'M8 7h9v9'],
  gauge: ['M4 18a8 8 0 1 1 16 0', 'M12 18l4.2-5.6', 'M4 18h16'],
  mouse: ['M6 9a6 6 0 0 1 12 0v6a6 6 0 0 1-12 0z', 'M12 3v6'],
  gpu: ['M4 6h16v12H4z', 'M8 10h8v4H8z', 'M8 3v3', 'M16 3v3', 'M8 18v3', 'M16 18v3'],
  keyboard: ['M3 7h18v10H3z', 'M7 11h1', 'M11 11h1', 'M15 11h1', 'M7 14h10'],
  palette: ['M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a5 5 0 0 0 0-10z', 'M7.5 9h.01', 'M10 6.5h.01', 'M14 6.5h.01', 'M17 9h.01'],
  volume: ['M4 10v4h4l5 4V6l-5 4z', 'M16 9a4 4 0 0 1 0 6', 'M18.5 6.5a8 8 0 0 1 0 11'],
  sliders: ['M4 7h10', 'M18 7h2', 'M4 17h4', 'M12 17h8', 'M14 4v6', 'M8 14v6'],
  sparkles: ['M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z', 'M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z'],
  search: ['M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z', 'M15.5 15.5L21 21'],
  'chevron-down': ['M6 9l6 6 6-6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  'chevron-left': ['M15 6l-6 6 6 6'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  restart: ['M4 10a8 8 0 1 1 2.3 7.2', 'M4 4v6h6'],
  power: ['M12 3v9', 'M6.5 6.5a8 8 0 1 0 11 0'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  globe: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M3 12h18', 'M12 3c3 3.5 3 14 0 18', 'M12 3c-3 3.5-3 14 0 18'],
  info: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 11v6', 'M12 7.5h.01'],
  reset: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  key: ['M14 7a4 4 0 1 0-3.4 4.6L4 18.2V21h3v-2h2v-2h2l1.4-1.4A4 4 0 0 0 14 7z'],
  image: ['M3 5h18v14H3z', 'M3 15l5-5 4 4 3-3 6 6', 'M8 9h.01'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5H5V6h5'],
  dot: ['M12 12h.01']
};

/**
 * @param {{ name: keyof typeof ICON_PATHS | string, size?: number, strokeWidth?: number, class?: string }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const Icon = (props) => {
  const paths = () => ICON_PATHS[props.name] ?? ICON_PATHS.dot;
  return (
    <svg
      class={props.class}
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={props.strokeWidth ?? 1.7}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {paths().map((path) => <path d={path} />)}
    </svg>
  );
};
