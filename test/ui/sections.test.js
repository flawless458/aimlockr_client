import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/shared/launch-settings.js';
import { DEFAULT_MENU_SETTINGS } from '../../src/shared/menu-settings.js';
import { filterSections } from '../../src/shared/search.js';
import {
  CLIENT_SECTIONS,
  INTERFACE_SECTIONS,
  NAV_ITEMS,
  SECTIONS_BY_TAB
} from '../../src/ui/sections.js';

const allSections = [...CLIENT_SECTIONS, ...INTERFACE_SECTIONS];
const allRows = allSections.flatMap((section) => section.rows.map((row) => ({ section, row })));
const launchKeys = new Set(Object.keys(DEFAULT_SETTINGS));
const menuKeys = new Set(Object.keys(DEFAULT_MENU_SETTINGS));
const kinds = new Set([
  'launch-toggle',
  'menu-toggle',
  'menu-select',
  'menu-slider',
  'menu-keybind',
  'menu-color'
]);

describe('navigation', () => {
  it('exposes exactly the two tabs', () => {
    expect(Object.keys(SECTIONS_BY_TAB)).toEqual(['client', 'interface']);
  });

  it('maps every nav item to a tab', () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(ids.sort()).toEqual(Object.keys(SECTIONS_BY_TAB).sort());
  });

  it('has unique nav item ids', () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives each nav item an icon and label without extra grouping chrome', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });
});

describe('sections', () => {
  it('has unique section ids', () => {
    const ids = allSections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique row ids', () => {
    const ids = allRows.map(({ row }) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every section a title, tab and rows', () => {
    for (const section of allSections) {
      expect(section.title).toBeTruthy();
      expect(['client', 'interface']).toContain(section.tab);
      expect(section.rows.length).toBeGreaterThan(0);
      for (const row of section.rows) expect(row.label).toBeTruthy();
    }
  });

  it('keeps the client tab focused on launch behavior', () => {
    expect(CLIENT_SECTIONS.map((section) => section.id)).toEqual(['display', 'performance', 'graphics', 'input']);
  });

  it('marks the audio card as full width', () => {
    const audio = INTERFACE_SECTIONS.find((section) => section.id === 'audio');
    expect(audio.wide).toBe(true);
    expect(INTERFACE_SECTIONS.filter((section) => section.wide)).toHaveLength(1);
  });

  it('uses known row kinds', () => {
    for (const { row } of allRows) expect(kinds).toContain(row.kind);
  });
});

describe('row wiring', () => {
  it('points launch toggles at launch settings', () => {
    const rows = allRows.filter(({ row }) => row.kind === 'launch-toggle');
    expect(rows.length).toBe(4);
    for (const { row } of rows) expect(launchKeys).toContain(row.key);
  });

  it('points menu rows at menu settings', () => {
    const rows = allRows.filter(({ row }) => row.kind.startsWith('menu-'));
    for (const { row } of rows) expect(menuKeys).toContain(row.key);
  });

  it('gives selects options with values and labels', () => {
    const rows = allRows.filter(({ row }) => row.kind === 'menu-select');
    for (const { row } of rows) {
      expect(row.options.length).toBeGreaterThan(0);
      for (const option of row.options) {
        expect(option.value).toBeTruthy();
        expect(option.label).toBeTruthy();
      }
    }
  });

  it('gives sliders numeric bounds', () => {
    const rows = allRows.filter(({ row }) => row.kind === 'menu-slider');
    for (const { row } of rows) {
      expect(typeof row.min).toBe('number');
      expect(typeof row.max).toBe('number');
      expect(row.max).toBeGreaterThan(row.min);
      expect(row.step).toBeGreaterThan(0);
    }
  });

  it('only marks supported platforms', () => {
    const rows = allRows.filter(({ row }) => row.platformOnly);
    for (const { row } of rows) expect(row.platformOnly).toBe('win32');
  });
});

describe('search integration', () => {
  it('finds the raw input row', () => {
    const result = filterSections(CLIENT_SECTIONS, 'raw');
    expect(result).toHaveLength(1);
    expect(result[0].rows.map((row) => row.id)).toEqual(['raw']);
  });

  it('finds menu scale', () => {
    const result = filterSections(INTERFACE_SECTIONS, 'scale');
    expect(result.flatMap((section) => section.rows.map((row) => row.id))).toContain('scale');
  });

  it('finds section titles', () => {
    const result = filterSections(INTERFACE_SECTIONS, 'appearance');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('appearance');
  });

  it('returns nothing for unknown queries', () => {
    expect(filterSections(CLIENT_SECTIONS, 'zzz')).toEqual([]);
  });
});
