import { describe, it, expect } from '@jest/globals';
import {
  parseAnnotationMeta,
  normalizeAnnotationType,
  sanitizeHighlightRects,
  sanitizeAnchorPercent,
} from '../annotation';

describe('annotation util', () => {
  it('parses valid meta envelope', () => {
    const input = '[[meta]]{"annotationType":"note","pageNumber":2}[[/meta]]\nhello world';
    const result = parseAnnotationMeta(input);
    expect(result.meta).toEqual({ annotationType: 'note', pageNumber: 2 });
    expect(result.note).toBe('hello world');
  });

  it('handles missing meta gracefully', () => {
    const input = 'hello world';
    const result = parseAnnotationMeta(input);
    expect(result.meta).toEqual({});
    expect(result.note).toBe('hello world');
  });

  it('handles broken JSON gracefully', () => {
    const input = '[[meta]]{broken JSON[[/meta]]\nhello world';
    const result = parseAnnotationMeta(input);
    expect(result.meta).toEqual({});
    expect(result.note).toBe('hello world');
  });

  it('normalizes annotation type', () => {
    expect(normalizeAnnotationType('note')).toBe('note');
    expect(normalizeAnnotationType('draw')).toBe('draw');
    expect(normalizeAnnotationType('comment')).toBe('comment');
    expect(normalizeAnnotationType('random')).toBe('comment');
    expect(normalizeAnnotationType(undefined)).toBe('comment');
  });

  it('sanitizes highlight rects', () => {
    const input = [
      { x: 10, y: 20, w: 100, h: 50 },
      { x: 'bad', y: 20 },
    ];
    const result = sanitizeHighlightRects(input);
    expect(result).toEqual([{ x: 10, y: 20, w: 100, h: 50 }]);
  });

  it('sanitizes anchor percent', () => {
    expect(sanitizeAnchorPercent({ x: 50, y: 50 })).toEqual({ x: 50, y: 50 });
    expect(sanitizeAnchorPercent({ x: 'bad' })).toBeNull();
    expect(sanitizeAnchorPercent(null)).toBeNull();
  });
});
