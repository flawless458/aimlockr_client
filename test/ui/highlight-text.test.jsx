// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@solidjs/testing-library';
import { HighlightText } from '../../src/ui/components/HighlightText.jsx';

afterEach(() => cleanup());

describe('HighlightText', () => {
  it('returns plain text for an empty query', () => {
    const { container } = render(() => <HighlightText text="Menu Scale" query="" />);
    expect(container.textContent).toBe('Menu Scale');
    expect(container.querySelector('mark')).toBeNull();
  });

  it('highlights one match case-insensitively', () => {
    const { container } = render(() => <HighlightText text="Menu Scale" query="scale" />);
    expect(container.querySelector('mark').textContent).toBe('Scale');
    expect(container.textContent).toBe('Menu Scale');
  });

  it('highlights multiple matches', () => {
    const { container } = render(() => <HighlightText text="Scale and scale" query="SCALE" />);
    expect(container.querySelectorAll('mark')).toHaveLength(2);
    expect(container.textContent).toBe('Scale and scale');
  });

  it('keeps unmatched text', () => {
    const { container } = render(() => <HighlightText text="Fullscreen" query="gpu" />);
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toBe('Fullscreen');
  });

  it('does not treat the query as a regular expression', () => {
    const { container } = render(() => <HighlightText text="a+b" query="+" />);
    expect(container.querySelector('mark').textContent).toBe('+');
  });
});
