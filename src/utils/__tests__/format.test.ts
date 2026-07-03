import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ResearchPaper } from '../../types/domain';
import {
  countCoAuthors,
  formatDate,
  formatRelativeTime,
  getPrimaryAuthorName,
  listCoAuthorNames,
  normalizeAuthorEntries,
  statusToLabel,
} from '../format';

// Fixtures only need the fields each helper reads; cast past the full row shape.
const paper = (partial: Partial<ResearchPaper>): ResearchPaper =>
  partial as unknown as ResearchPaper;

describe('statusToLabel', () => {
  it('maps a known status to its label', () => {
    expect(statusToLabel('published')).toBe('Published');
    expect(statusToLabel('revision_required')).toBe('Revision Required');
  });

  it('falls back to Pending when the status is missing', () => {
    expect(statusToLabel(undefined)).toBe('Pending');
  });

  it('humanizes an unknown status by replacing underscores', () => {
    expect(statusToLabel('some_new_state' as never)).toBe('some new state');
  });
});

describe('formatDate', () => {
  it('returns N/A for empty or unparseable input', () => {
    expect(formatDate(null)).toBe('N/A');
    expect(formatDate('not-a-date')).toBe('N/A');
  });

  it('formats a valid ISO date', () => {
    expect(formatDate('2026-01-15T12:00:00.000Z')).toMatch(/Jan/);
  });
});

describe('formatRelativeTime', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns "just now" for missing or sub-minute values', () => {
    expect(formatRelativeTime(null)).toBe('just now');
    expect(formatRelativeTime('2026-07-03T11:59:30.000Z')).toBe('just now');
  });

  it('reports minutes, hours, and days', () => {
    expect(formatRelativeTime('2026-07-03T11:45:00.000Z')).toBe('15m ago');
    expect(formatRelativeTime('2026-07-03T09:00:00.000Z')).toBe('3h ago');
    expect(formatRelativeTime('2026-07-01T12:00:00.000Z')).toBe('2d ago');
  });

  it('falls back to an absolute date beyond 30 days', () => {
    expect(formatRelativeTime('2026-05-15T12:00:00.000Z')).toMatch(/May/);
  });
});

describe('author helpers', () => {
  it('prefers paper.users.fullName for the primary author', () => {
    expect(getPrimaryAuthorName(paper({ users: { fullName: 'Ada Lovelace' } as never }))).toBe(
      'Ada Lovelace',
    );
  });

  it('falls back to the primary structured author', () => {
    expect(
      getPrimaryAuthorName(
        paper({
          structured_authors: [
            { is_primary: true, author_order: 1, author: { fullName: 'Grace Hopper' } as never },
          ],
        }),
      ),
    ).toBe('Grace Hopper');
  });

  it('returns "Unknown Author" when no author data exists', () => {
    expect(getPrimaryAuthorName(paper({}))).toBe('Unknown Author');
  });

  it('counts co-authors from structured entries', () => {
    const p = paper({
      structured_authors: [
        { is_primary: true, author_order: 1, author: { fullName: 'A' } as never },
        { is_primary: false, author_order: 2, author: { fullName: 'B' } as never },
        { is_primary: false, author_order: 3, author: { fullName: 'C' } as never },
      ],
    });
    expect(countCoAuthors(p)).toBe(2);
  });

  it('lists co-author names, or "None" when there are none', () => {
    expect(
      listCoAuthorNames(
        paper({
          structured_authors: [
            { is_primary: true, author_order: 1, author: { fullName: 'A' } as never },
          ],
        }),
      ),
    ).toBe('None');

    expect(
      listCoAuthorNames(
        paper({
          structured_authors: [
            { is_primary: true, author_order: 1, author: { fullName: 'A' } as never },
            { is_primary: false, author_order: 2, author: { fullName: 'B' } as never },
          ],
        }),
      ),
    ).toBe('B');
  });

  it('normalizes a bare paper.users into a single primary entry', () => {
    const entries = normalizeAuthorEntries(paper({ users: { fullName: 'Solo' } as never }));
    expect(entries).toHaveLength(1);
    expect(entries[0].is_primary).toBe(true);
  });
});
