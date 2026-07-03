---
undertaking: "Faculty Access"
phase: "14 (annotation overlays + reviewer comments — complete)"
date: 2026-06-29
branch: feat/faculty-access
last_commit: "feat(faculty-access-v3): wire annotation overlays and reviewer comments panel"
status: in-progress
---

# NUcleus Mobile — Session Handoff Context (Faculty Access, Phase 14)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`). **Work happens in a git worktree:** the main folder
`capstone-nucleus-rn` stays on `dev`; this undertaking lives in the sibling worktree
**`capstone-nucleus-rn-faculty-access`** on branch `feat/faculty-access`. **Run Metro / tsc / git / eas from the
worktree.** Each worktree has its own `npm install` (done).

Faculty Access **v1 (read-only), v2 (write actions), embedded PDF viewer (Phase 11), and annotation
viewing (v3, Phases 12–14) are all complete.** No open blockers.

**Read first:** `docs/plans/FACULTY_ACCESS.md` (§7C Phases 12–14 done, §8 deferred scope), `CLAUDE.md`.
Stable invariants live in `CLAUDE.md`.

---

## Faculty Access status

- ✅ Phases 0–6 — read-only v1 (verified)
- ✅ Phases 7–10 — v2 write actions: Approve / Request Revision / Reject (verified)
- ✅ Phase 11 — embedded PDF viewer (#10, cross-role) — WebView + pdf.js (verified)
- ✅ Faculty sign-out — shipped (verified), outside the phased plan
- ✅ Phase 12 — annotation read path (data layer) — `getAnnotations()` + type parser
- ✅ Phase 13 — annotation overlay infrastructure in `PdfViewer` — `PdfAnnotationOverlay` interface, WebView-side `__buildOverlays` / `__showAnnotations` / `__hideAnnotations`, eye-icon toggle
- ✅ Phase 14 — wire-up + reviewer comments panel in `FacultyReviewDetailScreen`

---

## What changed since HANDOFF_FAC_PHASE-11.md

### Phase 12 — Annotation read path (commit `c6fe121`)
- Read-only Supabase MCP spike confirmed: faculty read `research_comments` directly under deployed
  RLS (all 33 live rows are `is_internal = false`; the privileged branch of the SELECT policy is dead
  due to the project-wide UUID mismatch, but non-internal rows are unconditionally readable).
  Drawing PNGs are in the public `research-papers` bucket — no signing needed.
- Added `FacultyAnnotation`, `FacultyAnnotationType`, `FacultyAnnotationRect`, `FacultyAnnotationPoint`
  types and `facultyApi.getAnnotations(paperId)` to `src/api/faculty.ts`. Parses the web's
  meta-in-text envelope (`[[meta]]{json}[[/meta]]\n<note>`); clamps %-coords; validates `drawImageUrl`.

### Phase 13 — PdfViewer overlay infrastructure (commit `c16dbe6`)
- Exported `PdfAnnotationOverlay` interface from `src/components/PdfViewer.tsx` (public prop type).
- HTML: pages now render inside `<div class="page-wrapper">` (position: relative). Three WebView-side
  functions: `__buildOverlays(jsonStr)` creates hidden overlay elements per annotation type;
  `__showAnnotations()` / `__hideAnnotations()` toggle visibility.
- `PdfSurface` gains `annotations?` + `showAnnotations?` props and a `webViewRef`. Two `useEffect`s:
  (1) loaded+annotations change → inject `__buildOverlays`; (2) loaded+showAnnotations change →
  inject show/hide.
- `PdfViewer` gains `annotations?` prop + internal `showAnnotations` state (default `false`).
  `hasPositionedAnnotations` drives an eye-icon toggle button grouped with the expand button in a
  `controls` row. Student `ResearchDetailScreen` unaffected — prop is optional and omitted.

### Phase 14 — FacultyReviewDetailScreen wire-up (commit `e043900`)
- Three new parallel `useEffect`s on mount: `getReviewDetail`, `getReviewFile`, `getAnnotations`.
- `overlays: PdfAnnotationOverlay[]` derived via `useMemo` (mapping `FacultyAnnotation` fields).
- `pagelessAnnotations` (pageNumber === null, parentId === null) and `getReplies(parentId)` memos
  for the list panel.
- `<PdfViewer uri={fileUri} annotations={overlays} />` — eye-icon toggle appears automatically when
  positioned annotations exist.
- New **Reviewer comments** section (between Review history and Your decision): skeleton while
  loading, `InlineNotice` on error, "No general reviewer comments." when empty, `Card` per root
  page-less annotation with hairline-separated reply threads nested inside.

### Issues opened this session
- **#14** — `faculty: annotation creation — write path for review comments` (🔴 Open)
- **#15** — `faculty: verify annotation overlays on papers returned from dean or program chair` (🔴 Open)
- **Current cap: #15.**

### CONVENTIONS.md updated
Issue table and cap updated on `dev` (project-wide canonical location).

---

## Critical Architectural Context (session-specific)

### Annotation visibility — why overlays may not appear in testing
Faculty is the first reviewer in the pipeline. Papers currently at `pending_faculty` have no prior
annotations because no upstream reviewer has touched them yet. The read path is correct and the RLS
supports it — overlays will populate as soon as a test paper has gone through at least one
dean/chair review cycle. See #15.

### Faculty annotation creation is new scope (not yet started)
The read path repurposes the existing `research_comments` data. The write path is a distinct
undertaking: INSERT RLS (or SECURITY DEFINER RPC), Supabase storage write grant for drawing PNGs,
and a non-trivial in-WebView annotation UI. Tracked as #14.

---

## Open Issues

| # | Title | Status |
|---|---|---|
| 15 | `faculty: verify annotation overlays on papers returned from dean or program chair` | 🔴 Open |
| 14 | `faculty: annotation creation — write path for review comments` | 🔴 Open |
| 13 | `research detail: related papers via semantic search` | 🔴 Open |
| 12 | `faculty: additional tabs (Notifications, Repository, Profile)` | 🔴 Open |
| 11 | `faculty review: annotation threads on papers` | 🔴 Open |
| 9 | `faculty review actions: email and push notifications not sent on mobile` | 🔴 Open |
| 8 | `ResearchDetail: Download button always visible — no allow_download column` | 🔴 Open |

**Current cap: #15.**

---

## Current RLS Policy State (Supabase)

No RLS changes this session (Phases 12–14 are all client-side). Faculty read/write paths unchanged
from HANDOFF_FAC_PHASE-10. `research_comments` SELECT grants all non-internal rows to authenticated
callers — no new policy needed for annotation reading.

## Supabase RPCs

No RPC changes this session. v2 faculty write RPCs unchanged (snapshot `docs/sql/faculty_access_rpcs.sql`).

---

## Current State of the Codebase

### Key files changed this undertaking (v3 scope)

| File | What changed |
|---|---|
| `src/api/faculty.ts` | Added `FacultyAnnotation` + related types + `facultyApi.getAnnotations()` + meta parser |
| `src/components/PdfViewer.tsx` | Exported `PdfAnnotationOverlay`; overlay infrastructure in HTML; `PdfSurface` webViewRef + inject effects; `PdfViewer` toggle UI |
| `src/screens/faculty/FacultyReviewDetailScreen.tsx` | Annotation state + effect; overlays useMemo; Reviewer comments section |

### Annotation data shape (non-obvious)
The web stores annotations as `[[meta]]{json}[[/meta]]\n<note>` in `research_comments.comment`.
The JSON carries `annotationType` (`comment` | `note` | `draw`), `pageNumber`, `highlightRects`
(%-based), `anchorPercent` ({x,y} %), `highlightColor`, and `drawImageUrl` (public PNG URL for draws).
`is_internal = false` for all current live rows. Threading via `parent_id`.

### Housekeeping still carried forward
- **Dead-dep cleanup:** `react-native-pdf` + `react-native-blob-util` and their two `app.json`
  config plugins are dead code (replaced by WebView+pdf.js). Remove them and fold into the next EAS build.
- **At eventual merge** (`feat/faculty-access → dev → main`, Christian-gated): re-freeze `types.ts` +
  `AppNavigator.tsx` in `.claude/settings.json`.

---

## Current Git State

Branch: `feat/faculty-access` in worktree `capstone-nucleus-rn-faculty-access`.

Working tree: **clean**.

All branches local — **pushes held by Christian.** **Do NOT merge `feat/faculty-access`** until
Christian instructs.

---

## Commit History (most recent first)

```
e043900 feat(faculty-access-v3): wire annotation overlays and reviewer comments panel
c16dbe6 feat(faculty-access-v3): add annotation overlay infrastructure to PdfViewer
023862a Merge branch 'dev' into feat/faculty-access (conventions sync)
c6fe121 feat(faculty-access-v3): add annotation read path for review detail
370e0d9 docs(faculty-access-v3): close Phase 11 (PDF viewer); refresh handoff
6c2ece9 fix(pdf-viewer): render inline PDF via WebView + pdf.js
```

---

## Immediate Next Steps

Recommended next work (pick one):

1. **Runtime verify annotation overlays (#15).** Cut a new EAS dev build, sign in as faculty, open a
   paper that has been returned from a dean or program chair with annotations. Confirm the eye-icon
   toggle appears, overlays render on the correct pages, and the Reviewer comments section shows
   page-less comments. If no such paper exists in the test data, the code path is correct — the
   overlays will simply not appear until upstream review activity creates annotations.

2. **Faculty annotation creation (#14).** New undertaking or a v4 phase: INSERT RLS policy on
   `research_comments`, SECURITY DEFINER write RPC (same pattern as the review-action RPCs), Supabase
   storage write grant for drawing PNGs, and in-WebView annotation UI (text selection for highlights,
   tap-to-pin for notes, freehand draw). Substantial scope — brief Christian before starting SQL work.

3. **Faculty additional tabs (#12).** Notifications tab is the safe next win (faculty likely already
   receive in-app notifications with nowhere to read them).

4. **Dead-dep cleanup.** Remove `react-native-pdf` + `react-native-blob-util` from `package.json`
   and their two `app.json` config plugins; fold the native drop into the next EAS build.
