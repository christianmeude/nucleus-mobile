---
undertaking: "Faculty Access"
phase: "11 (embedded PDF viewer — RESOLVED) → next: annotations viewing (#11)"
date: 2026-06-27
branch: feat/faculty-access
last_commit: "fix(pdf-viewer): render inline PDF via WebView + pdf.js"
status: complete
---

# NUcleus Mobile — Session Handoff Context (Faculty Access, Phase 11 resolved)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`). **Work happens in a git worktree:** the main folder
`capstone-nucleus-rn` stays on `dev`; this undertaking lives in the sibling worktree
**`capstone-nucleus-rn-faculty-access`** on branch `feat/faculty-access`. **Run Metro / tsc / git / eas from the
worktree.** Each worktree has its own `npm install` (done).

Faculty Access **v1 (read-only), v2 (write actions: Approve / Request Revision / Reject), and the cross-role
embedded PDF viewer (Phase 11) are all complete and runtime-verified.** Phase 11's blocker from the previous
handoff is **resolved**. No open blockers.

**Read first:** `docs/plans/FACULTY_ACCESS.md` (§7B Phase 11 + §8), `CLAUDE.md`. Stable invariants live in `CLAUDE.md`.

---

## Faculty Access status

- ✅ Phases 0–6 — read-only v1 (verified)
- ✅ Phases 7–10 — v2 write actions: RPCs, API, decision UI, polish (verified)
- ✅ Phase 11 — embedded PDF viewer (#10), cross-role — **RESOLVED this session** (WebView + pdf.js, verified)
- ✅ Faculty sign-out — shipped (verified), outside the phased plan

---

## What changed since HANDOFF_FAC_PHASE-11 (blocked version)

### Embedded PDF viewer (#10) — ✅ RESOLVED

**Root cause (diagnosed this session):** the viewer wasn't failing at the *render* step — it was failing at the
*download*. On this app's RN 0.85.3 + New-Architecture-enforced build, **both native HTTP downloaders fail before
transferring a single byte**: `react-native-pdf`'s internal fetch (v1) and the `react-native-blob-util`
pre-download (v2) both threw `Download interrupted` at 0% on every attempt. Meanwhile `curl` and the system
in-app browser load the exact same signed URL fine — proving the server/URL/network are healthy and the broken
layer is the third-party native HTTP modules. `react-native-pdf`'s renderer was never even reached.

**Fix applied (committed `6c2ece9`):** rewrote `src/components/PdfViewer.tsx` to host **pdf.js inside a
`react-native-webview`**. pdf.js fetches the signed URL through the WebView's own (working) network stack —
CORS is `*` and Supabase sends `Accept-Ranges: bytes`, so it **range-streams** the file instead of pre-downloading
~9 MB. The pdf.js *library* loads from a pinned CDN (jsDelivr `pdfjs-dist@3.11.174`); the cross-origin worker is
run as a same-origin Blob URL. **PDF bytes never leave the device ↔ Supabase channel** (no Google/Mozilla viewer).
`PdfViewer`'s public API is unchanged (`uri` / `onFirstLoad` / `height`) so **neither consuming screen changed**.
Added `react-native-webview@13.16.1` (native → required a new EAS dev build).

**Status:** ✅ verified on an EAS Android dev build — a 65-page paper renders inline
(`[PdfViewer] rendered {pages: 65}`), fullscreen modal works, student `trackView` fires on first render. #10 closed.

---

## Critical Architectural Context (session-specific)

### Native HTTP modules are unreliable under this RN 0.85 + New-Arch build

`react-native-pdf` and `react-native-blob-util` both fail their own native downloads here (0 bytes,
`Download interrupted`). **Avoid third-party native HTTP/file modules for fetching Supabase content.** RN core
`fetch` and the system WebView's network stack both work. Prefer rendering/fetching remote assets through a
WebView (as the PDF viewer now does) rather than native downloaders.

---

## Resolved Issues

- ✅ #10 — in-app embedded PDF viewer (student + faculty) — delivered via WebView + pdf.js (commit `6c2ece9`)

## Open Issues

- 🔴 #5 — Browse category filter shows unresolved UUIDs (student-side)
- 🔴 #6 — Browse list/tile toggle (student-side enhancement)
- 🔴 #8 — ResearchDetail download button always visible / no `allow_download` (student-side)
- 🔴 #9 — email + push notifications on review actions (parity gap; needs backend/edge-function coordination)
- 🔴 #11 — faculty annotations (recommended next — see Immediate Next Steps)
- 🔴 #12 — additional faculty tabs (Notifications / Repository / Profile)

**Current cap: #12. Do not invent issue numbers beyond #12.**

---

## Current RLS Policy State (Supabase)

No RLS changes this session (the WebView fix is client-only). Faculty read/write paths unchanged from
HANDOFF_FAC_PHASE-10. **Not yet checked (next session):** `research_comments` SELECT for faculty — see next steps.

## Supabase RPCs

No RPC changes this session. v2 faculty write RPCs unchanged (snapshot `docs/sql/faculty_access_rpcs.sql`).

---

## Current State of the Codebase

### Field-level gotchas (non-obvious)

- **Annotations are encoded meta-in-text.** The web has no annotation geometry columns; `research_comments.comment`
  is `[[meta]]{json}[[/meta]]\n<note>`. The JSON holds `annotationType` (`comment` | `note` | `draw`),
  `pageNumber`, `highlightRects` (%-based left/top/width/height), `anchorPercent` (`{x,y}` %), `highlightColor`,
  and `drawImageUrl` (URL to a flattened page+ink PNG). `is_internal` rows are reviewer-only. Threading via `parent_id`.
  Reference: web `backend/src/controllers/annotation.controller.js`, `frontend/src/components/pdf/*`.

---

## Uncommitted Changes

- `M docs/plans/FACULTY_ACCESS.md` — Phase 11 marked complete + §8 deferred-scope refreshed (part of this close-out commit).

---

## Issues Opened / Closed Since HANDOFF_FAC_PHASE-11 (blocked)

- Closed: **#10** (PDF viewer — delivered).
- No new issues filed.
- **Current cap: #12. Do not invent issue numbers beyond #12.**

---

## Current Git State

Branch: `feat/faculty-access` in worktree `capstone-nucleus-rn-faculty-access`.

**Modified (uncommitted):**
- `M docs/plans/FACULTY_ACCESS.md` — this handoff's companion plan update.

(`PdfViewer.tsx` + `package.json` + `package-lock.json` already committed as `6c2ece9`.)

All branches local — **pushes held by Christian.** **Do NOT merge `feat/faculty-access`** until Christian
instructs (and at that merge: re-freeze `types.ts` + `AppNavigator.tsx` in `.claude/settings.json`).

**Intended branch workflow:**
```
feat/faculty-access → dev → main
```

---

## Commit History (most recent first)

```
6c2ece9 (HEAD -> feat/faculty-access) fix(pdf-viewer): render inline PDF via WebView + pdf.js
d8fdcfe feat(faculty): add sign-out button on faculty dashboard
cb64abf feat(pdf-viewer): add shared in-app embedded PDF viewer (student + faculty)
e174068 chore(deps): add react-native-pdf for in-app PDF rendering
878514f docs: authorize Claude issue creation; track v2 deferrals as #9-#12
```

---

## Immediate Next Steps

Recommended next undertaking work: **annotation viewing (#11)** — let faculty toggle on prior reviewers'
annotations over the PDF. View-only is feasible because the web's coords are percentage-based and drawings are
pre-rendered PNGs (no stroke/coordinate replication).

1. **Spike (read-only, do first).** Check whether `research_comments` is SELECT-able by an authenticated faculty
   user under RLS for their assigned papers, or whether it needs a SECURITY DEFINER RPC (established pattern).
   Confirm the `drawImageUrl` PNGs are readable (public bucket vs. needs signing). Brief Christian before any SQL.
2. **MVP build.** A "See annotations" toggle (default off) in the existing pdf.js WebView: overlay highlight rects
   (%-positioned), note pins (`anchorPercent`), and viewable drawing PNGs per page. Overlays live inside the
   WebView HTML (where the pages are); pass annotation data in via the page/injected JS. New `facultyApi` read method.
3. **Later iteration.** Reply threads (`parent_id`), tap-to-read note popovers.
4. **If the spike turns gnarly,** pivot that session to **#12 (faculty tabs — Notifications first;** faculty likely
   already receive notifications with nowhere to read them) as the safe win, and return to annotations afterward.

### Housekeeping carried forward
- **Dead-dep cleanup:** remove `react-native-pdf` + `react-native-blob-util` and their two `app.json` config
  plugins; fold the native drop into the next EAS dev build (whenever one is next cut).
- **At eventual merge** (`feat/faculty-access → dev → main`, Christian-gated): re-freeze `types.ts` +
  `AppNavigator.tsx` in `.claude/settings.json`.
