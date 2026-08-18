# Design Opportunities: NUcleus Mobile

Based on a deep dive into the `impeccable` skill's guidelines and the strict brand and functional constraints of the NUcleus mobile app (a React Native / Expo adaptive app using Supabase), here is a comprehensive list of actionable recommendations. 

The app's design system (`DESIGN.md`) demands a "Modern Clarity" aesthetic, utilizing a strict Navy/Gold palette, single-font typography (Roboto), and Material 3 / iOS platform norms.

## 1. Native Adaptation & Device Support
**Command:** `$impeccable adapt`
**Alignment:** The `impeccable adapt.native` guideline stresses that scaling up a phone UI to a tablet is a failure mode. Since faculty use NUcleus as a "command center" for reviewing papers, tablet usage must be deeply considered.
* **Faculty Tablet Layout:** Refactor the Faculty Dashboard to use a master-detail split view on iPads/Android tablets. The left pane should hold the "Review Queue" while the right pane shows paper details, reducing navigation fatigue.
* **Platform Idioms:** Ensure iOS builds use standard tab bars and edge-swipe back, while Android builds use bottom navigation and predictive back gestures. Translate idioms; never transplant them.
* **Insets & Keyboard Safe Areas:** Audit screen margins against notches, the Dynamic Island, and software keyboards, especially inside the paper submission flow.

## 2. Resilience, Errors & Edge Cases
**Command:** `$impeccable harden`
**Alignment:** The `impeccable harden` guideline warns that designs working only with perfect data aren't production-ready. Given NUcleus is used by students on potentially spotty campus networks, resilience is critical.
* **Network & Supabase Resilience:** Implement clear offline states and graceful error handling for Supabase queries. Students need to know with certainty if their paper submission succeeded or failed.
* **Text Overflow Handling:** Research paper titles and abstracts are notoriously long. Harden text containers with React Native's `numberOfLines` or proper wrapping logic so layouts do not break or clip awkwardly.
* **Form Validation Errors:** Provide clear, inline form validation for paper submissions before attempting a server request. Catch empty files or missing fields early.
* **Skeleton Loaders:** Replace blocking full-screen spinners with skeleton loaders for the research feed to improve perceived performance during initial fetches.

## 3. Empty States & First-Time Use
**Command:** `$impeccable onboard`
**Alignment:** The `impeccable onboard` reference states empty states are prime onboarding opportunities. A research repository app relies on submissions; a blank screen fails to guide the user.
* **Student Dashboard Empty State:** When a student hasn't submitted anything yet, do not show a blank list. Provide an illustration or icon utilizing the brand Gold, explain the value of submitting, and include a clear CTA ("Submit your first paper").
* **Faculty Queue Empty State:** When a faculty member's review queue is empty, show a celebratory state ("You're all caught up!") rather than an empty void.
* **Progressive Tooltips:** Use lightweight, dismissible tooltips the first time a student views the tracking timeline to explain the different review stages.

## 4. Typography & Readability
**Command:** `$impeccable typeset`
**Alignment:** The app involves "long reading sessions on a phone screen." Since the `DESIGN.md` dictates a Single Font Rule (Roboto), hierarchy relies entirely on strict scale, weight, and spacing.
* **Reading Measure & Leading:** Audit the abstract and paper reader views to ensure line height and measure are comfortable (45–75 characters per line). For tablet views, set a maximum width for body text to prevent unreadable, infinitely wide lines.
* **Contrast & Hierarchy:** Enforce the exact size and weight steps from the `DESIGN.md` (e.g., Titles at 20px/700, Body at 15px/400). Ensure metadata (dates, authors) visually recedes (using `text-muted`) so the titles stand out.
* **Dynamic Type Support:** Ensure all `Text` components respect system font scaling (Dynamic Type on iOS, sp scaling on Android) for accessibility, and verify that layouts don't collide at 200% scale.

## 5. Layout & Structural Hierarchy
**Command:** `$impeccable layout`
**Alignment:** The layout guideline dictates that structure must match the task. Dashboards must quickly separate immediate priorities from historical data.
* **The Squint Test:** Run the squint test on the Faculty Dashboard. The most pressing action (e.g., papers pending review) should be the undeniable focal point, separated from general stats.
* **Continuous Corners:** Ensure every card-shaped `<View>` uses `borderCurve: 'continuous'` for the native iOS squircle, as explicitly mandated in the `DESIGN.md` Do's and Don'ts.
* **Card Spacing Rhythm:** Standardize internal spacing in research cards. Apply tighter gaps between a paper's title and its authors (`sm`), and generous padding (`lg` 16px) around the card boundaries.

## 6. Performance & Smoothness
**Command:** `$impeccable optimize` & `$impeccable audit`
**Alignment:** The `audit.native` reference heavily penalizes unvirtualized lists and main-thread jank, which destroy the native feel of an app.
* **List Virtualization:** Convert all scrollable feeds of research papers to use `FlatList` or `FlashList` with properly configured `estimatedItemSize` to prevent memory leaks and dropped frames.
* **Render Cycle Optimization:** Audit the Student and Faculty dashboards for unnecessary re-renders, specifically around real-time Supabase subscriptions. Ensure components are properly memoized.
