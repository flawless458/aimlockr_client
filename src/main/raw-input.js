export const RAW_INPUT_SCRIPT = `(() => {
  if (window.__aimlockrRawInput) return;
  window.__aimlockrRawInput = true;
  const request = HTMLCanvasElement.prototype.requestPointerLock;
  HTMLCanvasElement.prototype.requestPointerLock = function (options) {
    const result = request.call(this, { ...options, unadjustedMovement: true });
    if (result && typeof result.catch === 'function') {
      return result.catch(() => request.call(this, options));
    }
    return result;
  };
})();`;

/**
 * @typedef {object} ScriptTarget
 * @property {(code: string) => Promise<unknown>} executeJavaScript
 */

/**
 * @param {ScriptTarget} webContents
 * @returns {Promise<void>}
 */
export const enableRawInput = (webContents) =>
  webContents.executeJavaScript(RAW_INPUT_SCRIPT).then(
    () => undefined,
    () => undefined
  );
