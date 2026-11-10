export const createFakeWindow = (calls) => {
  const listeners = new Map();
  const navigations = [];
  const openHandlers = [];
  const domReadyListeners = [];
  const scripts = [];
  const state = { loadedUrls: [], shown: 0, focused: 0, destroyed: false, fullscreenCalls: [] };

  const window = {
    get loadedUrls() { return state.loadedUrls; },
    get shown() { return state.shown; },
    get focused() { return state.focused; },
    get fullscreenCalls() { return state.fullscreenCalls; },
    get destroyed() { return state.destroyed; },
    set destroyed(value) { state.destroyed = value; },
    loadURL: (url) => {
      calls.push('loadURL');
      state.loadedUrls.push(url);
    },
    show: () => {
      calls.push('show');
      state.shown += 1;
    },
    focus: () => {
      calls.push('focus');
      state.focused += 1;
    },
    setFullScreen: (flag) => {
      calls.push('setFullScreen');
      state.fullscreenCalls.push(flag);
    },
    isDestroyed: () => state.destroyed,
    once: (event, listener) => {
      calls.push(`once:${event}`);
      listeners.set(event, listener);
    },
    emit: (event) => listeners.get(event)?.(),
    webContents: {
      setWindowOpenHandler: (handler) => openHandlers.push(handler),
      on: (event, listener) => {
        if (event === 'will-navigate') navigations.push(listener);
        if (event === 'dom-ready') domReadyListeners.push(listener);
      },
      executeJavaScript: (code) => {
        scripts.push(code);
        return Promise.resolve();
      },
      emitDomReady: () => {
        for (const listener of domReadyListeners) listener();
      },
      scripts,
      open: (url) => openHandlers.at(-1)({ url }),
      navigate: (url) => {
        let prevented = false;
        for (const listener of navigations) listener({ preventDefault: () => { prevented = true; } }, url);
        return prevented;
      }
    }
  };

  return window;
};

export const createFakeHost = ({ platform = 'win32', singleInstance = true, deferredReady = false, readyError } = {}) => {
  const calls = [];
  const switches = [];
  const windows = [];
  const opened = [];
  const appListeners = new Map();
  const readyResolvers = [];

  const host = {
    platform,
    commandLine: {
      appendSwitch: (name, value) => {
        calls.push(`switch:${name}`);
        switches.push({ name, value });
      }
    },
    whenReady: () => {
      calls.push('whenReady');
      if (readyError) return Promise.reject(readyError);
      return deferredReady ? new Promise((resolve) => readyResolvers.push(resolve)) : Promise.resolve();
    },
    requestSingleInstanceLock: () => {
      calls.push('lock');
      return singleInstance;
    },
    on: (event, listener) => {
      calls.push(`on:${event}`);
      appListeners.set(event, listener);
    },
    createWindow: (options) => {
      calls.push('createWindow');
      const window = createFakeWindow(calls);
      windows.push({ options, window });
      return window;
    },
    clearApplicationMenu: () => {
      calls.push('clearApplicationMenu');
    },
    openExternal: (url) => {
      opened.push(url);
      return Promise.resolve();
    },
    quit: () => {
      calls.push('quit');
    }
  };

  return {
    host,
    calls,
    switches,
    windows,
    opened,
    emit: (event) => appListeners.get(event)?.(),
    resolveReady: () => readyResolvers.splice(0).forEach((resolve) => resolve()),
    lastWindow: () => windows.at(-1)
  };
};
