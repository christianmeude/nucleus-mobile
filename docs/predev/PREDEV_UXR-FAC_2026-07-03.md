# Pre-Dev Integration — UX Remodel × Faculty Access (instance record)

**Date merged:** 2026-07-03
**Merge commit:** `250bec6` (`predev/uxr-fac → dev`, `--no-ff`)
**Plan:** [`docs/plans/PREDEV_UXR-FAC.md`](../plans/PREDEV_UXR-FAC.md)
**Workflow:** [`docs/predev/README.md`](./README.md) (retired for new work; this branch grandfathered)

The final record of the Pre-Dev Integration undertaking (`P-D`), which fused **UX
Remodel** and **Faculty Access** into one uniform product and landed it on `dev`.
This is the last `predev/*` integration — the workflow is retired in favour of
trunk-based development (CONVENTIONS §1 "Legacy").

## Outcome

One uniform product on `dev`: the faculty surface now wears the full UX-Remodel
design language (cool-slate/navy + gold, Source Serif 4 + IBM Plex Sans, headerless
tabs with serif in-body titles, shared card patterns, gold-once-per-screen), and the
student side gained the in-app `PdfViewer` ("Read paper" now renders inline instead
of handing off to an external browser). `npx tsc --noEmit` green throughout.

## Undertakings integrated (both retired)

| Undertaking | Short | Final tip | Retirement tag |
|---|---|---|---|
| UX Remodel | `UX-R` | `1714be8` | `retired/ux-remodel-2026-07-03` |
| Faculty Access | `FAC` | `096a4e3` | `retired/faculty-access-2026-07-03` |

Branches `feat/ux-remodel`, `feat/faculty-access`, and `predev/uxr-fac` — and their
worktrees — were deleted at retirement. Their history lives on in `dev` (via the
merge) and in the two `retired/*` tags above.

## Integration phases

- **Phase 0** — Base merges. UX-R merged first (design truth), then FAC (6 conflicts
  resolved: settings/ResearchDetail/lock `--ours`; package.json + nav unioned;
  lora/outfit dropped). Both roles boot in one build.
- **Phase 1** — Student `ResearchDetail` reads PDFs inline via the shared
  `<PdfViewer>`; `trackView` moved to the viewer's `onFirstLoad`; external-browser
  path removed.
- **Phase 2** — Dead-dependency cleanup: removed `react-native-pdf`,
  `react-native-blob-util`, both `@config-plugins/*` (package.json + app.json).
  `expo-web-browser` retained (PdfViewer error fallback).
- **Phases 3–8** — Faculty surface re-skinned to the design system: headerless shell +
  per-screen safe-area insets, serif in-body titles, shared `ResearchDetailHeader` on
  stack screens, `src/utils/category.ts` adoption (Issue-#5 UUID guard), Profile
  rebuilt on-brand. Faculty-wide gold-once sweep closed.
- **Phase 9** — Queued revisions. **Waived** (no documented inputs).
- **Phase 10** — Docs synced to the trunk-based workflow (dev `a7c2dc1` absorbed);
  CLAUDE.md Key Files additions; nav + `SubmitResearchScreen` guardrails re-frozen.
- **Phase 11** — Exit QA on a fresh EAS dev-client. **Waived** by Christian to finish
  the merge and retire the legacy workflow; regressions caught on `dev`, and the
  dead-dep removals materialize on the next dev-client build.
- **Phase 12** — Final merge + retirement (this record).

## Follow-ups (fresh undertakings off the new `dev`)

- **#14** faculty annotation write · **#15** annotation overlay verify — deferred faculty
  scope; become a fresh `feat/*` undertaking cut from `dev` (trunk-based).
- Optional Supabase data cleanup of the pre-existing test rows in the shared
  `research_papers` table (not an integration task).

## Post-merge

- **#12** (faculty additional tabs) closed — delivered by this merge.
- Sibling active branch `feat/hybrid-search` synced with `dev`.
