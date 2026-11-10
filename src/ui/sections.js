import { MOTION_SPEED_LABELS, MOTION_SPEEDS } from '../shared/motion.js';

export const NAV_ITEMS = [
  { id: 'client', label: 'Client', icon: 'monitor' },
  { id: 'interface', label: 'Interface', icon: 'sliders' }
];

const motionOptions = MOTION_SPEEDS.map((speed) => ({ value: speed, label: MOTION_SPEED_LABELS[speed] }));

export const CLIENT_SECTIONS = [
  {
    id: 'display',
    tab: 'client',
    title: 'DISPLAY',
    rows: [
      {
        id: 'fullscreen',
        label: 'Fullscreen',
        kind: 'launch-toggle',
        key: 'fullscreen',
        icon: 'maximize',
        note: 'Fullscreen applies immediately without restarting.'
      }
    ]
  },
  {
    id: 'performance',
    tab: 'client',
    title: 'PERFORMANCE',
    rows: [
      {
        id: 'uncap',
        label: 'Uncap FPS',
        kind: 'launch-toggle',
        key: 'uncapFps',
        icon: 'gauge',
        note: 'Changing this flag requires a client restart.'
      }
    ]
  },
  {
    id: 'graphics',
    tab: 'client',
    title: 'GRAPHICS',
    rows: [
      {
        id: 'gpu',
        label: 'GPU Acceleration',
        kind: 'launch-toggle',
        key: 'gpuAcceleration',
        icon: 'gpu',
        note: 'Changing this flag requires a client restart.'
      }
    ]
  },
  {
    id: 'input',
    tab: 'client',
    title: 'INPUT',
    rows: [
      {
        id: 'raw',
        label: 'Real Raw Input',
        kind: 'launch-toggle',
        key: 'rawInput',
        icon: 'mouse',
        note: 'Raw mouse input is available on Windows only.',
        platformOnly: 'win32'
      }
    ]
  }
];

export const INTERFACE_SECTIONS = [
  {
    id: 'access',
    tab: 'interface',
    title: 'ACCESS',
    rows: [
      {
        id: 'keybind',
        label: 'Menu Keybind',
        kind: 'menu-keybind',
        key: 'keybind',
        icon: 'keyboard',
        note: 'Click, then press the key you want to use.'
      },
      {
        id: 'outside-click',
        label: 'Close On Outside Click',
        kind: 'menu-toggle',
        key: 'closeOnOutsideClick',
        icon: 'mouse',
        note: 'Click anywhere outside the panel to close the menu.'
      },
      {
        id: 'open-on-launch',
        label: 'Open On Launch',
        kind: 'menu-toggle',
        key: 'openOnLaunch',
        icon: 'launch',
        note: 'Open the menu automatically when the client starts.'
      },
      {
        id: 'scale',
        label: 'Menu Scale',
        kind: 'menu-slider',
        key: 'scale',
        icon: 'scale',
        min: 85,
        max: 115,
        step: 1,
        suffix: '%',
        note: 'Scale the menu between 85% and 115%.'
      }
    ]
  },
  {
    id: 'appearance',
    tab: 'interface',
    title: 'APPEARANCE',
    rows: [
      {
        id: 'accent',
        label: 'Accent Color',
        kind: 'menu-color',
        key: 'accent',
        icon: 'palette',
        note: 'Accent used across toggles, sliders, and highlights.'
      },
      {
        id: 'blur',
        label: 'Backdrop Blur',
        kind: 'menu-toggle',
        key: 'blur',
        icon: 'image',
        note: 'Blur the game behind the menu.'
      },
      {
        id: 'animations',
        label: 'Animations',
        kind: 'menu-toggle',
        key: 'animations',
        icon: 'sparkles',
        note: 'Enable menu transitions and entrance motion.'
      },
      {
        id: 'motion',
        label: 'Motion Speed',
        kind: 'menu-select',
        key: 'motion',
        icon: 'gauge',
        options: motionOptions,
        note: 'How quickly menu transitions and animations play.'
      }
    ]
  },
  {
    id: 'audio',
    tab: 'interface',
    title: 'AUDIO',
    wide: true,
    rows: [
      {
        id: 'sounds',
        label: 'Interface Sounds',
        kind: 'menu-toggle',
        key: 'sounds',
        icon: 'volume',
        note: 'Play a short tick when you press a control.'
      },
      {
        id: 'volume',
        label: 'Sound Volume',
        kind: 'menu-slider',
        key: 'soundVolume',
        icon: 'volume',
        min: 0,
        max: 100,
        step: 5,
        suffix: '%',
        note: 'Volume of interface feedback ticks.'
      }
    ]
  }
];

export const SECTIONS_BY_TAB = {
  client: CLIENT_SECTIONS,
  interface: INTERFACE_SECTIONS
};
