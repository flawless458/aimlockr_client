import { describe, expect, it } from 'vitest';
import { countMatches, filterSections, matchesQuery, normalizeQuery } from '../src/shared/search.js';

const sections = [
  {
    id: 'window',
    title: 'WINDOW',
    rows: [
      { id: 'fullscreen', label: 'Fullscreen', kind: 'toggle' },
      { id: 'gpu', label: 'Gpu Acceleration', kind: 'toggle' }
    ]
  },
  {
    id: 'input',
    title: 'INPUT',
    rows: [{ id: 'raw', label: 'Real Raw Input', kind: 'toggle' }]
  }
];

describe('normalizeQuery', () => {
  it('trims and lowercases', () => {
    expect(normalizeQuery('  Raw  ')).toBe('raw');
  });

  it('handles non-strings', () => {
    expect(normalizeQuery(null)).toBe('');
    expect(normalizeQuery(42)).toBe('');
  });
});

describe('matchesQuery', () => {
  it('matches case-insensitively', () => {
    expect(matchesQuery('Real Raw Input', 'raw')).toBe(true);
    expect(matchesQuery('Real Raw Input', 'RAW')).toBe(true);
  });

  it('matches everything with an empty query', () => {
    expect(matchesQuery('Anything', '')).toBe(true);
    expect(matchesQuery('Anything', '   ')).toBe(true);
  });

  it('rejects misses', () => {
    expect(matchesQuery('Fullscreen', 'input')).toBe(false);
  });
});

describe('filterSections', () => {
  it('returns all rows for an empty query', () => {
    const result = filterSections(sections, '');
    expect(result).toHaveLength(2);
    expect(result[0].rows).toHaveLength(2);
  });

  it('does not return the original row arrays', () => {
    const result = filterSections(sections, '');
    expect(result[0].rows).not.toBe(sections[0].rows);
    expect(result[0].rows).toEqual(sections[0].rows);
  });

  it('filters rows by label', () => {
    const result = filterSections(sections, 'gpu');
    expect(result).toHaveLength(1);
    expect(result[0].rows.map((row) => row.id)).toEqual(['gpu']);
  });

  it('matches section titles and keeps every row', () => {
    const result = filterSections(sections, 'input');
    expect(result).toHaveLength(1);
    expect(result[0].rows).toHaveLength(1);
  });

  it('drops sections without matches', () => {
    const result = filterSections(sections, 'nothing');
    expect(result).toEqual([]);
  });

  it('preserves extra section fields', () => {
    const result = filterSections(sections, 'fullscreen');
    expect(result[0].id).toBe('window');
  });

  it('does not mutate the input', () => {
    filterSections(sections, 'raw');
    expect(sections[0].rows).toHaveLength(2);
    expect(sections[1].rows).toHaveLength(1);
  });
});

describe('countMatches', () => {
  it('counts visible rows', () => {
    expect(countMatches(sections, '')).toBe(3);
    expect(countMatches(sections, 'raw')).toBe(1);
    expect(countMatches(sections, 'nothing')).toBe(0);
  });
});
