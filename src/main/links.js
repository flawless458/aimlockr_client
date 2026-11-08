export const KIRKA_URL = 'https://kirka.io';
export const KIRKA_HOSTNAME = 'kirka.io';

/** @typedef {'kirka' | 'external' | 'invalid'} UrlKind */

/**
 * @typedef {object} NewWindowDecision
 * @property {'allow' | 'deny'} action
 */

/**
 * @typedef {object} WebContentsLike
 * @property {(handler: (details: { url: string }) => NewWindowDecision) => void} setWindowOpenHandler
 * @property {(event: 'will-navigate', listener: (event: { preventDefault: () => void }, url: string) => void) => void} on
 */

/**
 * @param {unknown} hostname
 * @returns {boolean}
 */
export const isKirkaHostname = (hostname) => {
  const host = String(hostname).toLowerCase();
  return host === KIRKA_HOSTNAME || host.endsWith(`.${KIRKA_HOSTNAME}`);
};

/**
 * @param {unknown} raw
 * @returns {UrlKind}
 */
export const classifyUrl = (raw) => {
  try {
    const url = new URL(String(raw));
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'invalid';
    return isKirkaHostname(url.hostname) ? 'kirka' : 'external';
  } catch {
    return 'invalid';
  }
};

/**
 * @param {WebContentsLike} webContents
 * @param {(url: string) => void} openExternal
 * @returns {void}
 */
export const wireNavigation = (webContents, openExternal) => {
  webContents.setWindowOpenHandler(({ url }) => {
    const kind = classifyUrl(url);
    if (kind === 'kirka') return { action: 'allow' };
    if (kind === 'external') openExternal(url);
    return { action: 'deny' };
  });

  webContents.on('will-navigate', (event, url) => {
    const kind = classifyUrl(url);
    if (kind === 'kirka') return;
    event.preventDefault();
    if (kind === 'external') openExternal(url);
  });
};
