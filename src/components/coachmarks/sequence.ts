/**
 * First-run navigation coachmarks (#69, DESIGN.md First-run → Coachmarks).
 *
 * Pure, RN-free sequencing logic so it can be unit-tested and imported by the
 * tab bar (for the target-id mapping) without pulling in React Native. The
 * provider/overlay that render the bubbles live in `CoachmarkProvider.tsx`.
 */

/** The three one-time tooltips, in the exact order DESIGN.md defines them. */
export type CoachmarkId = 'bell' | 'submitFab' | 'browseTab';

/** Fixed sequence: notification bell → Submit FAB → Browse tab. */
export const COACHMARK_ORDER: readonly CoachmarkId[] = ['bell', 'submitFab', 'browseTab'];

/** Bubble copy per target, verbatim from the DESIGN.md First-run spec. */
export const COACHMARK_COPY: Record<CoachmarkId, string> = {
  bell: 'Your invites and updates show up here',
  submitFab: 'Tap to submit your research',
  browseTab: 'Discover papers by category or search',
};

/**
 * The next coachmark to show given the set already seen, or `null` when the
 * sequence is complete. Walks {@link COACHMARK_ORDER} and returns the first id
 * not yet seen, so a partially-completed run resumes where it left off rather
 * than restarting. Unknown/legacy ids in `seen` are simply ignored.
 */
export const nextCoachmark = (seen: readonly CoachmarkId[]): CoachmarkId | null => {
  for (const id of COACHMARK_ORDER) {
    if (!seen.includes(id)) return id;
  }
  return null;
};
