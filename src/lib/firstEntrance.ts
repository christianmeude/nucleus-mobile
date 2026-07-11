/**
 * One-shot "assemble" signal for the carousel → app hand-off (A4).
 *
 * Armed the moment a student finishes onboarding; read once by the home screen
 * chrome + the tab bar on their first mount so those elements play a single
 * staggered entrance (header drops in, cards rise, navbar slides up) instead of
 * hard-cutting into view. Module-level and non-persisted — it lives only for
 * that one transition and auto-disarms so later launches / remounts never
 * replay it. Faculty and returning students never arm it, so they see the app
 * statically as before.
 */
let armed = false;
let disarmTimer: ReturnType<typeof setTimeout> | null = null;

/** Arm the one-time entrance. Called from onboarding's finish handler. */
export const armFirstEntrance = () => {
  armed = true;
  if (disarmTimer) clearTimeout(disarmTimer);
  // Disarm after the transition window so a tab revisit / remount can't replay.
  disarmTimer = setTimeout(() => {
    armed = false;
    disarmTimer = null;
  }, 2500);
};

/** Whether the entrance should play — read once at a component's first mount. */
export const isFirstEntranceArmed = () => armed;
