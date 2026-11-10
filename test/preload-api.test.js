import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from '../src/shared/ipc.js';
import { createDesktopApi } from '../src/preload/api.js';
import { installDesktopApi, isMainFrame } from '../src/preload/index.js';

const createRenderer = () => {
  const calls = [];
  return {
    calls,
    invoke: (channel, payload) => {
      calls.push({ channel, payload });
      return Promise.resolve({ channel });
    }
  };
};

describe('createDesktopApi', () => {
  it('loads preferences', async () => {
    const renderer = createRenderer();
    const api = createDesktopApi(renderer);
    await expect(api.load()).resolves.toEqual({ channel: IPC_CHANNELS.load });
    expect(renderer.calls).toEqual([{ channel: IPC_CHANNELS.load, payload: undefined }]);
  });

  it('updates launch settings', async () => {
    const renderer = createRenderer();
    const api = createDesktopApi(renderer);
    await api.updateLaunch({ fullscreen: false });
    expect(renderer.calls[0]).toEqual({
      channel: IPC_CHANNELS.updateLaunch,
      payload: { fullscreen: false }
    });
  });

  it('updates menu settings', async () => {
    const renderer = createRenderer();
    const api = createDesktopApi(renderer);
    await api.updateMenu({ scale: 90 });
    expect(renderer.calls[0]).toEqual({
      channel: IPC_CHANNELS.updateMenu,
      payload: { scale: 90 }
    });
  });

  it('resets menu settings', async () => {
    const renderer = createRenderer();
    const api = createDesktopApi(renderer);
    await api.resetMenu();
    expect(renderer.calls[0].channel).toBe(IPC_CHANNELS.resetMenu);
  });

  it('relaunches and quits', async () => {
    const renderer = createRenderer();
    const api = createDesktopApi(renderer);
    await api.relaunch();
    await api.quit();
    expect(renderer.calls.map((call) => call.channel)).toEqual([IPC_CHANNELS.relaunch, IPC_CHANNELS.quit]);
  });

  it('opens external urls', async () => {
    const renderer = createRenderer();
    const api = createDesktopApi(renderer);
    await api.openExternal('https://kirka.io');
    expect(renderer.calls[0]).toEqual({
      channel: IPC_CHANNELS.openExternal,
      payload: 'https://kirka.io'
    });
  });
});

describe('installDesktopApi', () => {
  it('exposes the api once', () => {
    const exposed = [];
    const bridge = {
      exposeInMainWorld: (name, api) => {
        exposed.push({ name, api });
      }
    };
    const api = { load: () => Promise.resolve({}) };
    const globalObject = {};
    const originalExpose = bridge.exposeInMainWorld;
    bridge.exposeInMainWorld = (name, value) => {
      originalExpose(name, value);
      globalObject[name] = value;
    };
    expect(installDesktopApi(bridge, api, globalObject)).toBe(true);
    expect(installDesktopApi(bridge, api, globalObject)).toBe(false);
    expect(exposed).toHaveLength(1);
    expect(exposed[0].name).toBe('aimlockr');
    expect(exposed[0].api).toBe(api);
  });

  it('skips when a bridge already exists', () => {
    const exposed = [];
    const bridge = { exposeInMainWorld: (name, api) => exposed.push({ name, api }) };
    const existing = { load: () => Promise.resolve({}) };
    expect(installDesktopApi(bridge, {}, { aimlockr: existing })).toBe(false);
    expect(exposed).toEqual([]);
  });
});

describe('isMainFrame', () => {
  it('accepts the main frame', () => {
    expect(isMainFrame({ isMainFrame: true })).toBe(true);
    expect(isMainFrame({})).toBe(true);
  });

  it('rejects subframes', () => {
    expect(isMainFrame({ isMainFrame: false })).toBe(false);
  });
});
