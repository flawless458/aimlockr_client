import { describe, expect, it } from 'vitest';
import { RAW_INPUT_SCRIPT, enableRawInput } from '../src/main/raw-input.js';

const install = (window, canvas) =>
  new Function('window', 'HTMLCanvasElement', RAW_INPUT_SCRIPT)(window, canvas);

const createCanvasClass = (handler) => {
  const calls = [];
  class FakeCanvas {
    requestPointerLock(options) {
      calls.push(options);
      return handler(options, calls.length);
    }
  }
  return { FakeCanvas, calls };
};

describe('RAW_INPUT_SCRIPT', () => {
  it('forces unadjusted movement and keeps the other options', () => {
    const { FakeCanvas, calls } = createCanvasClass(() => Promise.resolve('ok'));
    install({}, FakeCanvas);
    new FakeCanvas().requestPointerLock({ unadjustedMovement: false, extra: true });
    expect(calls).toEqual([{ unadjustedMovement: true, extra: true }]);
  });

  it('falls back to the original options when raw input is rejected', async () => {
    const { FakeCanvas, calls } = createCanvasClass((options, call) =>
      call === 1 ? Promise.reject(new Error('unsupported')) : Promise.resolve('ok')
    );
    install({}, FakeCanvas);
    await expect(new FakeCanvas().requestPointerLock({ unadjustedMovement: false })).resolves.toBe('ok');
    expect(calls).toEqual([{ unadjustedMovement: true }, { unadjustedMovement: false }]);
  });

  it('returns non-promise results unchanged', () => {
    const { FakeCanvas } = createCanvasClass(() => undefined);
    install({}, FakeCanvas);
    expect(new FakeCanvas().requestPointerLock()).toBeUndefined();
  });

  it('patches only once', () => {
    const window = {};
    const { FakeCanvas, calls } = createCanvasClass(() => Promise.resolve('ok'));
    install(window, FakeCanvas);
    install(window, FakeCanvas);
    new FakeCanvas().requestPointerLock();
    expect(calls).toHaveLength(1);
  });
});

describe('enableRawInput', () => {
  it('executes the patch', async () => {
    const scripts = [];
    await enableRawInput({
      executeJavaScript: (code) => {
        scripts.push(code);
        return Promise.resolve();
      }
    });
    expect(scripts).toEqual([RAW_INPUT_SCRIPT]);
  });

  it('swallows execution errors', async () => {
    await expect(enableRawInput({ executeJavaScript: () => Promise.reject(new Error('no page')) })).resolves.toBeUndefined();
  });
});
