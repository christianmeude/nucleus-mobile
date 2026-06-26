---
undertaking: "Faculty Access"
phase: "11 (embedded PDF viewer — inline render BLOCKED)"
date: 2026-06-26
branch: feat/faculty-access
last_commit: "feat(faculty): add sign-out button on faculty dashboard"
status: blocked
---

# NUcleus Mobile — Session Handoff Context (Faculty Access, Phase 11)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`). **Work now happens in a git worktree:** the main folder
`capstone-nucleus-rn` stays on `dev`; this undertaking lives in the sibling worktree
**`capstone-nucleus-rn-faculty-access`** on branch `feat/faculty-access`. **Run Metro / tsc / git from the
worktree.** Each worktree needs its own `npm install` (already done here).

Faculty Access **v1 (read-only) and v2 (write actions: Approve / Request Revision / Reject) are complete and
runtime-verified.** Phase 11 added a cross-role **embedded PDF viewer** (#10) — and that is the **one open
blocker**: it does not render inline on device.

**Read first:** `docs/plans/FACULTY_ACCESS.md` (§7B Phase 11 + §8), `CLAUDE.md`. Stable invariants live in `CLAUDE.md`.

---

## Faculty Access status

- ✅ Phases 0–6 — read-only v1 (verified)
- ✅ Phases 7–10 — v2 write actions: RPCs, API, decision UI, polish/handoff (verified)
- 🔴 Phase 11 — embedded PDF viewer (#10): built, but **inline rendering fails on device** (see below)
- ✅ Faculty sign-out — added this session (verified working), outside the phased plan

---

## What changed since HANDOFF_FAC_PHASE-10

1. **Phase 11 — embedded PDF viewer (#10), cross-role.** New `src/components/PdfViewer.tsx` (inline native
   `<Pdf>` panel + fullscreen in-app modal + "open in browser" fallback). Wired into faculty
   `FacultyReviewDetailScreen` and **student** `ResearchDetailScreen` (consciously waiving the "don't touch
   student screens" rule — Christian-approved; §9 + §7B note). Student `trackView` now fires on the PDF's
   first load. Added `react-native-pdf` + `react-native-blob-util` + `@config-plugins/*`; plugins auto-added
   to `app.json`. Committed: `e174068` (deps), `cb64abf` (component + screens + plan). **An EAS Android dev
   build was cut and installed.**
2. **Faculty sign-out (this session, verified).** `FacultyDashboardScreen` header now has a `log-out-outline`
   `IconButton` → `useAuth().signOut`, mirroring the student `DashboardScreen` (faculty previously had NO way
   to log out). **Committed with this handoff.**
3. **Issue authority + worktree workflow** are now standing rules (see memory + `CONVENTIONS.md` §4).
   Issues #9–#12 track the deferred features.

---

## 🔴 THE BLOCKER — embedded PDF does not render inline

**Symptom (EAS dev build, Android):** opening a paper shows the PdfViewer panel, then it falls back to
"This PDF could not be displayed in the app." + "Open in browser". The in-app browser fallback works; the
inline `<Pdf>` never renders. Reproduced on the faculty review detail (and applies to student detail too).

**What's been tried:**
- v1 (committed `cb64abf`): `<Pdf source={{ uri: signedUrl, cache: true }} trustAllCerts={false} />` rendering
  the remote signed URL directly → fell back.
- v2 (**uncommitted**, current working tree in `PdfViewer.tsx`): download the signed URL to a local file via
  `react-native-blob-util` (`config({fileCache:true, appendExt:'pdf'}).fetch('GET', uri)`), then render the
  local `file://` path. Also **surfaces the real error text** in the fallback. **Still failing** — but the
  user had not yet pasted the on-screen error when the session closed.

**Environment that matters:** Expo SDK 56, **RN 0.85.3, New Architecture ENFORCED (no bridge fallback)**.
`react-native-pdf` v7.0.4 claims Fabric support (FabricExample on RN 0.81) but 0.85 is newer — a New-Arch
incompatibility in the native view is a live suspect.

### NEXT SESSION — do these in order
1. **Get the actual error first** (diagnosis before prescription). Reload the dev app from the worktree
   (`npx expo start --dev-client`) and read the error text the fallback now prints, and/or `adb logcat`.
   - If it's an **HTTP/TLS/download error** (e.g. `Download failed (HTTP 401/403)`, cert error) → the signed
     URL / blob-util request is the problem; fix the fetch (headers, redirects, `trustAllCerts`, URL).
   - If it's a **native render error / silent onError with the file present** → it's `react-native-pdf` under
     New Arch. **Pivot (the "radical" approach):**
2. **Radical pivot — drop `react-native-pdf`, render via WebView:**
   - `react-native-webview` (Expo-supported, far more battle-tested on new RN) hosting **pdf.js** — either
     bundle the pdf.js viewer as a local asset, or load the signed URL through a hosted viewer
     (Mozilla pdf.js `viewer.html?file=<urlencoded signed url>`, or Google gview
     `https://docs.google.com/gview?embedded=true&url=<urlencoded>`). Renders inline, fully in-app, no native
     Fabric dependency. **Adds `react-native-webview` (native) → needs a new EAS dev build.**
   - Keep the same `PdfViewer` public API (`uri`, `onFirstLoad`, fullscreen modal) so the two screens don't change.
3. Once it renders reliably (the user's bar: "99% of the time"), remove the temporary error-text surfacing,
   re-verify both roles on a dev build, then **close #10**.

---

## Uncommitted changes (intentional)

- `src/components/PdfViewer.tsx` — the **download-to-local + error-surfacing attempt** (still failing). Left
  uncommitted on purpose; the worktree persists. Either build on it or revert when pivoting to WebView.

---

## Open issues
#5, #6, #8 (pre-existing) + #9 (email/push), #10 (PDF viewer — **the blocker**), #11 (annotations),
#12 (faculty tabs). Cap #12. Claude is authorized to create/update issues (CONVENTIONS §4).

## Current git state
Worktree `capstone-nucleus-rn-faculty-access` on `feat/faculty-access`. After this handoff's commit, the only
uncommitted file is `src/components/PdfViewer.tsx` (WIP, above). All branches local — **pushes held by Christian.**
**Do NOT merge `feat/faculty-access`** until Christian instructs (and re-freeze `types.ts` + `AppNavigator.tsx`
in `.claude/settings.json` at that merge).

## Immediate next steps
1. Reload the dev app from the worktree and capture the PdfViewer fallback's error text → decide download-fix vs WebView pivot.
2. Most likely: implement the **WebView + pdf.js** renderer behind the existing `PdfViewer` API; new EAS dev build; verify both roles.
3. Close #10 when inline rendering is reliable; then the v2 + PDF work is done pending the Christian-gated merge.
