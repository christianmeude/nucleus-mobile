# Standardizing Smooth Interactions & Motion

## Context
The Auth screen has been fully redesigned to feature a premium dark glassmorphism aesthetic with butter-smooth Reanimated interactions, spring physics, and haptic feedback. While the high-contrast dark aesthetic works beautifully for Auth and the Dashboard Hero, the rest of the app will firmly remain in **Light Mode** to keep it clean, airy, and legible.

This plan details how we will extract the physics, motion, and interaction behaviors from the Auth screen and standardize them across the entire application, irrespective of the color theme.

## 1. Universal Motion Physics (`PressableScale`)
The bouncy, premium feel on the Auth buttons comes from Reanimated spring physics.
- **Action:** Audit the app and ensure every single interactive element (Cards on the dashboard, list items, all buttons) uses `src/components/ui/motion/PressableScale.tsx`. 
- **Action:** Hardwire `PressableScale` to use the `theme.motion.spring.press` physics profile, ensuring every tap everywhere feels identical and perfectly weighted.

## 2. The "Smooth Input" Primitive
The Auth inputs feel incredible because of the smooth 200ms crossfades on the border, background, and icon colors when focused.
- **Action:** Create a reusable `SmoothInput` component (or upgrade the existing `TextInput` wrapper) that uses `useAnimatedStyle` internally to handle focus transitions. 
- **Action:** Make it theme-aware so it fades to light mode colors on light backgrounds, and dark mode colors on dark backgrounds.

## 3. Standardized Haptics
- **Action:** Centralize haptic feedback into interaction primitives. Light impacts for button presses, notification errors for validation failures.

## 4. Seamless Transitions
- **Action:** Ensure screen transitions and modal presentations (like Bottom Sheets) use the same easing curves established for the Auth screen animations.

## Rollout Strategy
1. **Phase 1 (Primitives):** Build/upgrade `SmoothInput` and ensure `PressableScale` is perfectly tuned.
2. **Phase 2 (Dashboard):** Apply `PressableScale` to all cards and tiles on the `DashboardScreen` so scrolling and tapping feels premium.
3. **Phase 3 (Forms):** Replace standard inputs across the app with `SmoothInput`.
