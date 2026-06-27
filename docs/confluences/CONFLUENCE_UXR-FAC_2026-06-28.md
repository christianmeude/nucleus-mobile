---
confluence: "UX Remodel × Faculty Access"
date: 2026-06-28
throwaway_branch: "integ/dev-build (deleted)"
tag: "confluence/uxr-fac-2026-06-28 -> 368b08b"
fused:
  - "feat/ux-remodel @ 68e7e19"
  - "feat/faculty-access @ c6fe121"
status: built, QA-passed, torn down
---

# Confluence — UX Remodel × Faculty Access (2026-06-28)

See [README.md](./README.md) for the workflow. This is the instance record.

## Why

UX Remodel's new student screens (Hybrid Browse + ResearchDetail) and Faculty Access's
in-app PDF viewer (`react-native-webview` + pdf.js) both needed on-device testing, and the
viewer is a **native** module — so a single combined dev-client was built to QA both the
student and faculty roles at once.

## Fused commits

- `feat/ux-remodel` @ `68e7e19` — Browse / ResearchDetail Hybrid (Phases 2–3)
- `feat/faculty-access` @ `c6fe121` — faculty review + embedded `PdfViewer` (v3)
- Branched from `dev` @ `5fd73df`.

## Dependency union (package.json)

- From ux: `@expo-google-fonts/ibm-plex-sans`, `@expo-google-fonts/source-serif-4`,
  `@gorhom/bottom-sheet`, `expo-haptics`, `react-native-reanimated` (lora / outfit removed).
- From faculty: `react-native-webview@13.16.1`, `react-native-pdf@^7.0.4`,
  `react-native-blob-util@^0.24.10`, `@config-plugins/react-native-pdf@^14.0.1`,
  `@config-plugins/react-native-blob-util@^14.0.1`.

## Conflict resolution

- `package.json` — unioned (above).
- `src/screens/main/ResearchDetailScreen.tsx` — kept ux's Hybrid title page; the
  student-side in-app viewer wiring is deferred to ux-remodel post-confluence.
- `package-lock.json` — regenerated via `npm install`.

## Build

- EAS profile `development` (dev-client, internal distribution), Android.
- Build: https://expo.dev/accounts/christianmeude/projects/nucleus-student-mobile/builds/3bd4a2aa-a2e8-41a1-bdfd-ba3c4813e8d9
- Confluence merge commit: `368b08b`, pinned by tag `confluence/uxr-fac-2026-06-28`.

## QA outcome

Installed the APK; both roles verified in one build — student (Hybrid Browse +
ResearchDetail) and faculty (review + in-app PDF viewer).

## Teardown / next

- `integ/dev-build` deleted; exact state pinned by the tag.
- **UX Remodel:** wiring "Read paper" → the in-app `PdfViewer` needs only
  `npm install react-native-webview@13.16.1` in the worktree — **no rebuild** (the native
  module is already baked into this dev-client). Then continue Phases 4–6.
- **Faculty Access:** continues on its own branch (annotations #11, tabs #12).
