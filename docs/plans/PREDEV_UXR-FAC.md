# NUcleus Mobile — Implementation Plan: Pre-Dev Integration (UXR × FAC)

> **STATUS: IN PROGRESS** — Branch `predev/uxr-fac`, cut from `dev`.
> Fuses **UX Remodel** (`feat/ux-remodel`) and **Faculty Access**
> (`feat/faculty-access`) into one uniform tree, reconciles them into a single
> visual + feature standard, then merges to `dev` and retires both feature
> branches. Workflow: [`docs/predev/README.md`](../predev/README.md).

**Canonical product context:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
**Process conventions:** [CONVENTIONS.md](../CONVENTIONS.md)
**Participant plans:** [UX_REMODEL.md](./UX_REMODEL.md) · [FACULTY_ACCESS.md](./FACULTY_ACCESS.md)

---

## 1. Goal

Produce a **UNIFORM PRODUCT**: the faculty side adopts UX Remodel's full layout
language (headerless tabs with in-body serif titles + safe-area insets, the
cool-slate / Source Serif 4 + IBM Plex Sans design system, the new card patterns,
gold-once-per-screen), and the student side gains faculty's in-app `PdfViewer`
("Read paper" wiring). All docs sync. The branch clears to `dev` only through the
full exit gate (§4). Both feature branches are retired at the final merge;
remaining faculty scope (#14 annotation write, #15 overlay verify) becomes a
fresh undertaking cut from the new `dev`.

## 2. Merge base (Phase 0)

- Base cut from `dev @ 24b733d` (carries the pre-dev workflow docs + registry).
- `feat/ux-remodel` merged first (`9471502`, conflict-free) — design source of truth.
- `feat/faculty-access` merge pending (Session B) — resolves the 6-file conflict
  surface: `.claude/settings.json`, `package.json`, `package-lock.json`,
  `AppNavigator.tsx`, `navigation/types.ts`, `ResearchDetailScreen.tsx`.
  Resolution policy per [`docs/predev/README.md`](../predev/README.md) §Procedure
  and the approved plan.

## 3. Phased plan

Each phase is one session turn (house Phase Protocol: investigate → report → wait
→ implement → tsc → update markers → stage → present → stop).

### Phase 0 — Base merges
⏳ **IN PROGRESS** — UX-R merged (`9471502`); FAC merge is Session B's first action.

### Phase 1 — Student "Read paper" → in-app PdfViewer
⏳ **NOT STARTED** — Port FAC's pattern into UX-R's rebuilt ResearchDetail: resolve
file on mount, inline `<PdfViewer>`, `trackView` on first render; drop the
`WebBrowser.openBrowserAsync` path. No rebuild (webview already baked in).

### Phase 2 — Dead-dependency cleanup
⏳ **NOT STARTED** — Remove `react-native-pdf`, `react-native-blob-util`, both
`@config-plugins/*` (package.json + app.json atomically) and legacy
`@expo-google-fonts/lora` / `outfit`. Decide `expo-web-browser` removal (now
import-free). Removal-only native delta → existing APK stays a valid superset.

### Phase 3 — Faculty shell + Dashboard re-skin
⏳ **NOT STARTED** — `FacultyTabs.tsx` → `headerShown: false` ×5; FacultyDashboard
gains in-body serif title + safe-area insets + UX card patterns + gold-once audit.

### Phase 4 — Faculty Review queue re-skin
⏳ **NOT STARTED**

### Phase 5 — FacultyReviewDetail re-skin
⏳ **NOT STARTED** — Largest screen (PdfViewer + annotations + decision panel);
adopt the student ResearchDetail header pattern.

### Phase 6 — FacultyRepository re-skin
⏳ **NOT STARTED** — Adopt `src/utils/category.ts` (§10 shared-utils) + tile/card patterns.

### Phase 7 — FacultyPaperDetail re-skin
⏳ **NOT STARTED** — Align with student ResearchDetail incl. the Phase-1 PDF pattern.

### Phase 8 — FacultyNotifications + FacultyProfile re-skin
⏳ **NOT STARTED** — Both small; NotificationCard already shared; Profile mirrors
UX-R's ProfileScreen. Closes the gold-once sweep.

### Phase 9 — Queued revisions pass
⏳ **NOT STARTED** — Christian's held UX-R revision list + faculty QA findings.
Split 9a/9b if long.

### Phase 10 — Docs sync + guardrail re-freeze
⏳ **NOT STARTED** — CLAUDE.md Key Files additions (PdfViewer, `src/api/faculty.ts`,
FacultyTabs); close #12; **re-freeze** nav + SubmitResearch via
`git checkout dev -- .claude/settings.json` + commit (git-level write, flagged;
must come after all nav-editing phases).

### Phase 11 — Exit QA + fresh EAS dev-client
⏳ **NOT STARTED** — Full both-role regression on the existing APK; tsc; then
`eas build -p android --profile development`; re-run both roles + both PDF flows
on the fresh client. Exit gate = §4.

### Phase 12 — Final merge + retirement
⏳ **NOT STARTED** — `predev/uxr-fac → dev` (two-undertaking merge body); tag +
delete both feature branches + worktrees; registry flips to `complete`; instance
record `docs/predev/PREDEV_UXR-FAC_<date>.md` on dev; hybrid-search syncs `dev`.

## 4. Exit gate ("clear for dev")

All queued revisions applied · full both-role QA on the **fresh** dev-client ·
`npx tsc --noEmit` green · docs synced (registry, statuses, handoffs, snapshots) ·
Christian's explicit go.

## 5. Constraints

- `npx tsc --noEmit` green at every phase exit.
- Palette discipline: navy + gold + slate; gold once per screen. Two typefaces
  only (Source Serif 4 + IBM Plex Sans).
- Session-critical core stays frozen (Auth/supabase/domain/auth/authStorage).
  Nav files + SubmitResearchScreen are unfrozen on this branch (inherited from
  the participant branches) until Phase 10 re-freezes them.
- No SQL changes expected (both branches' SQL already deployed; snapshots union
  cleanly).
- Commits staged specifically, presented for review; no Co-Authored-By trailer.
