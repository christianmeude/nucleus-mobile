import { describe, expect, it } from '@jest/globals';

import { Category } from '../../types/domain';
import { UUID_PATTERN, buildCategoryNameById, resolveCategoryName } from '../category';

const category = (partial: Partial<Category>): Category => partial as unknown as Category;

describe('UUID_PATTERN', () => {
  it('matches valid v1-v5 UUIDs', () => {
    expect(UUID_PATTERN.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(UUID_PATTERN.test('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('rejects non-UUID strings', () => {
    expect(UUID_PATTERN.test('Computer Science')).toBe(false);
    expect(UUID_PATTERN.test('not-a-uuid')).toBe(false);
    expect(UUID_PATTERN.test('')).toBe(false);
  });
});

describe('buildCategoryNameById', () => {
  it('maps category id to name', () => {
    const map = buildCategoryNameById([
      category({ id: '1', name: 'Computer Science' }),
      category({ id: '2', name: 'Biology' }),
    ]);
    expect(map.get('1')).toBe('Computer Science');
    expect(map.get('2')).toBe('Biology');
  });

  it('returns an empty map for an empty list', () => {
    expect(buildCategoryNameById([]).size).toBe(0);
  });
});

describe('resolveCategoryName', () => {
  const categoryNameById = buildCategoryNameById([
    category({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Computer Science' }),
    category({ id: 'blank-id', name: '   ' }),
  ]);

  it('returns null for null or undefined input', () => {
    expect(resolveCategoryName(null, categoryNameById)).toBeNull();
    expect(resolveCategoryName(undefined, categoryNameById)).toBeNull();
  });

  it('resolves a known id to its name', () => {
    expect(resolveCategoryName('550e8400-e29b-41d4-a716-446655440000', categoryNameById)).toBe(
      'Computer Science',
    );
  });

  it('returns null when the resolved name is blank', () => {
    expect(resolveCategoryName('blank-id', categoryNameById)).toBeNull();
  });

  it('passes through a plain non-UUID label unresolved', () => {
    expect(resolveCategoryName('Legacy Label', categoryNameById)).toBe('Legacy Label');
  });

  it('guards an unresolved UUID from display (Issue #5)', () => {
    expect(resolveCategoryName('123e4567-e89b-12d3-a456-426614174000', categoryNameById)).toBeNull();
  });
});
