import { Category } from '../types/domain';

/** RFC 4122 UUID (v1–5). Guards raw category UUIDs from display (Issue #5). */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Build an id→name lookup from a categories list. */
export const buildCategoryNameById = (categories: Category[]): Map<string, string> =>
  new Map(categories.map((item) => [item.id, item.name]));

/**
 * Display-only category name, UUID-guarded (Issue #5).
 * Resolves an id to its name, passes through a plain (non-UUID) label,
 * and returns null when nothing resolves.
 */
export const resolveCategoryName = (
  value: string | null | undefined,
  categoryNameById: Map<string, string>,
): string | null => {
  if (!value) return null;
  if (categoryNameById.has(value)) {
    const name = categoryNameById.get(value);
    return name && name.trim() ? name : null;
  }
  return UUID_PATTERN.test(value) ? null : value;
};
