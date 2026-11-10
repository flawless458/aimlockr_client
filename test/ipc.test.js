import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '../src/shared/ipc.js';
import { registerIpc } from '../src/main/ipc.js';

const createHarness = (overrides = {}) => {
  const handlers = new Map();
  const removed = [];
  const relaunched = [];
  const quitCalls = [];
  const opened = [];
  const ipcMain = {
    handle: (channel, listener) => handlers.set(channel, listener),
    removeHandler: (channel) => {
      removed.push(channel);
      handlers.delete(channel);
    }
  };
  const preferences = {
    snapshot: () => ({ launch: { fullscreen: true }, menu: { scale: 100 }, restartRequired: [] }),
    updateLaunch: (patch) => Promise.resolve({ patch, launch: { fullscreen: true } }),
    updateMenu: (patch) => Promise.resolve({ patch, menu: { scale: 100 } }),
    resetMenu: () => Promise.resolve({ menu: { scale: 100 } })
  };
  const dispose = registerIpc({
    ipcMain,
    preferences,
    relaunch: () => relaunched.push(true),
    quit: () => quitCalls.push(true),
    openExternal: (url) => {
      opened.push(url);
      return Promise.resolve();
    },
    ...overrides
  });
  const invoke = (channel, payload) => {
    const handler = handlers.get(channel);
    if (!handler) throw new Error(`missing handler for ${channel}`);
    return handler({}, payload);
  };
  return { handlers, removed, relaunched, quitCalls, opened, dispose, invoke };
};

describe('registerIpc', () => {
  it('registers every channel', () => {
    const { handlers } = createHarness();
    expect([...handlers.keys()].sort()).toEqual(Object.values(IPC_CHANNELS).sort());
  });

  it('returns a disposer that removes every channel', () => {
    const { dispose, removed } = createHarness();
    dispose();
    expect(removed.sort()).toEqual(Object.values(IPC_CHANNELS).sort());
  });

  it('loads a snapshot', async () => {
    const { invoke } = createHarness();
    await expect(invoke(IPC_CHANNELS.load)).resolves.toEqual({
      launch: { fullscreen: true },
      menu: { scale: 100 },
      restartRequired: []
    });
  });

  it('forwards launch patches', async () => {
    const { invoke } = createHarness();
    await expect(invoke(IPC_CHANNELS.updateLaunch, { fullscreen: false })).resolves.toEqual({
      patch: { fullscreen: false },
      launch: { fullscreen: true }
    });
  });

  it('forwards menu patches', async () => {
    const { invoke } = createHarness();
    await expect(invoke(IPC_CHANNELS.updateMenu, { scale: 90 })).resolves.toEqual({
      patch: { scale: 90 },
      menu: { scale: 100 }
    });
  });

  it('resets menu settings', async () => {
    const { invoke } = createHarness();
    await expect(invoke(IPC_CHANNELS.resetMenu)).resolves.toEqual({ menu: { scale: 100 } });
  });

  it('relaunches once', async () => {
    const { invoke, relaunched } = createHarness();
    await expect(invoke(IPC_CHANNELS.relaunch)).resolves.toBe(true);
    expect(relaunched).toHaveLength(1);
  });

  it('quits once', async () => {
    const { invoke, quitCalls } = createHarness();
    await expect(invoke(IPC_CHANNELS.quit)).resolves.toBe(true);
    expect(quitCalls).toHaveLength(1);
  });

  it.each(['https://example.com', 'http://example.com/path?q=1'])('opens %s externally', async (url) => {
    const { invoke, opened } = createHarness();
    await expect(invoke(IPC_CHANNELS.openExternal, url)).resolves.toBe(true);
    expect(opened).toEqual([url]);
  });

  it.each(['file:///etc/passwd', 'javascript:alert(1)', 'not a url', '', 42, null])(
    'rejects %s',
    async (url) => {
      const { invoke, opened } = createHarness();
      await expect(invoke(IPC_CHANNELS.openExternal, url)).rejects.toThrow('unsupported external url');
      expect(opened).toEqual([]);
    }
  );

  it('awaits asynchronous openExternal calls', async () => {
    const openExternal = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 5)));
    const { invoke } = createHarness({ openExternal });
    await expect(invoke(IPC_CHANNELS.openExternal, 'https://example.com')).resolves.toBe(true);
    expect(openExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('propagates handler failures', async () => {
    const { invoke } = createHarness({
      preferences: {
        snapshot: () => ({}),
        updateLaunch: () => Promise.reject(new Error('save failed')),
        updateMenu: () => Promise.resolve({}),
        resetMenu: () => Promise.resolve({})
      }
    });
    await expect(invoke(IPC_CHANNELS.updateLaunch, {})).rejects.toThrow('save failed');
  });
});
