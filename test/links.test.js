import { describe, expect, it } from 'vitest';
import { KIRKA_HOSTNAME, KIRKA_URL, classifyUrl, isKirkaHostname, wireNavigation } from '../src/main/links.js';

describe('KIRKA_URL', () => {
  it('points at kirka.io over https', () => {
    expect(KIRKA_URL).toBe('https://kirka.io');
  });
});

describe('isKirkaHostname', () => {
  it.each(['kirka.io', 'www.kirka.io', 'KIRKA.IO', 'game.kirka.io', 'a.b.kirka.io'])('accepts %s', (host) => {
    expect(isKirkaHostname(host)).toBe(true);
  });

  it.each(['notkirka.io', 'kirka.io.evil.com', 'evil.com', 'kirka.io.attacker', ''])('rejects %s', (host) => {
    expect(isKirkaHostname(host)).toBe(false);
  });

  it('exposes the canonical hostname', () => {
    expect(KIRKA_HOSTNAME).toBe('kirka.io');
  });
});

describe('classifyUrl', () => {
  it.each([
    'https://kirka.io',
    'https://kirka.io/game',
    'https://www.kirka.io/?ref=client',
    'http://kirka.io',
    'https://sub.kirka.io/path'
  ])('treats %s as kirka', (url) => {
    expect(classifyUrl(url)).toBe('kirka');
  });

  it.each([
    'https://google.com',
    'https://discord.gg/kirka',
    'http://example.org/',
    'https://kirka.io.evil.com',
    'https://notkirka.io'
  ])('treats %s as external', (url) => {
    expect(classifyUrl(url)).toBe('external');
  });

  it.each([
    'ftp://kirka.io',
    'javascript:alert(1)',
    'data:text/html,hi',
    'file:///etc/passwd',
    'about:blank',
    '',
    'not a url'
  ])('treats %s as invalid', (url) => {
    expect(classifyUrl(url)).toBe('invalid');
  });

  it('handles non-string input', () => {
    expect(classifyUrl(undefined)).toBe('invalid');
    expect(classifyUrl(null)).toBe('invalid');
    expect(classifyUrl(42)).toBe('invalid');
  });
});

describe('wireNavigation', () => {
  const setup = () => {
    const opened = [];
    let openHandler;
    const navigations = [];
    const webContents = {
      setWindowOpenHandler: (handler) => {
        openHandler = handler;
      },
      on: (event, listener) => {
        if (event === 'will-navigate') navigations.push(listener);
      }
    };
    wireNavigation(webContents, (url) => opened.push(url));
    return { opened, navigations, open: (url) => openHandler({ url }) };
  };

  it('allows kirka popups', () => {
    expect(setup().open('https://kirka.io/login')).toEqual({ action: 'allow' });
  });

  it('denies and forwards external popups', () => {
    const { open, opened } = setup();
    expect(open('https://discord.gg/kirka')).toEqual({ action: 'deny' });
    expect(opened).toEqual(['https://discord.gg/kirka']);
  });

  it('denies invalid popups without opening them', () => {
    const { open, opened } = setup();
    expect(open('javascript:alert(1)')).toEqual({ action: 'deny' });
    expect(opened).toEqual([]);
  });

  it('allows in-page kirka navigation', () => {
    const { navigations, opened } = setup();
    let prevented = false;
    for (const listener of navigations) listener({ preventDefault: () => { prevented = true; } }, 'https://kirka.io/game');
    expect(prevented).toBe(false);
    expect(opened).toEqual([]);
  });

  it('blocks external navigation and opens it in the browser', () => {
    const { navigations, opened } = setup();
    let prevented = false;
    for (const listener of navigations) listener({ preventDefault: () => { prevented = true; } }, 'https://example.org');
    expect(prevented).toBe(true);
    expect(opened).toEqual(['https://example.org']);
  });

  it('blocks invalid navigation without opening it', () => {
    const { navigations, opened } = setup();
    let prevented = false;
    for (const listener of navigations) listener({ preventDefault: () => { prevented = true; } }, 'file:///etc/passwd');
    expect(prevented).toBe(true);
    expect(opened).toEqual([]);
  });

  it('registers exactly one will-navigate listener', () => {
    expect(setup().navigations).toHaveLength(1);
  });
});
