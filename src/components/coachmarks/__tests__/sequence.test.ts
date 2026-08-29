import { describe, expect, it } from '@jest/globals';
import { COACHMARK_COPY, COACHMARK_ORDER, type CoachmarkId, nextCoachmark } from '../sequence';

describe('coachmark sequence', () => {
  it('walks bell → submitFab → browseTab in order from nothing seen', () => {
    expect(nextCoachmark([])).toBe('bell');
    expect(nextCoachmark(['bell'])).toBe('submitFab');
    expect(nextCoachmark(['bell', 'submitFab'])).toBe('browseTab');
  });

  it('returns null once every coachmark has been seen', () => {
    expect(nextCoachmark(['bell', 'submitFab', 'browseTab'])).toBeNull();
  });

  it('resumes at the first unseen step regardless of seen-array order', () => {
    // App closed after dismissing FAB out of order — bell still owed first.
    expect(nextCoachmark(['submitFab'])).toBe('bell');
    expect(nextCoachmark(['browseTab', 'submitFab'])).toBe('bell');
    expect(nextCoachmark(['bell', 'browseTab'])).toBe('submitFab');
  });

  it('ignores unknown/legacy ids in the seen set', () => {
    expect(nextCoachmark(['legacy' as CoachmarkId])).toBe('bell');
    expect(nextCoachmark(['bell', 'legacy' as CoachmarkId])).toBe('submitFab');
  });

  it('has copy for every ordered id', () => {
    for (const id of COACHMARK_ORDER) {
      expect(COACHMARK_COPY[id]).toBeTruthy();
    }
  });
});
