# NUcleus Mobile — Session Handoff Context (Post-Phase 10)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) is fully migrated from Express to direct Supabase integration, and the 10-phase UI overhaul is complete and validated. Work has now shifted to a new undertaking: **mobile submit functionality** with strict parity to the web flow.

**Canonical docs in repo:**
- `docs/PROJECT_CONTEXT.md` — product/domain baseline
- `docs/PRODUCT_ROADMAP.md` — design/product direction
- `docs/plans/SUPABASE_MIGRATION.md` — completed backend migration baseline
- `docs/plans/UI_OVERHAUL.md` — completed 10-phase UI execution baseline
- `docs/conventions/README.md` — conventions index (issues, milestones, tags, commits, builder prompts)
- `docs/handoffs/HANDOFF_U-O_PHASE-9.md` — previous baseline before Phase 10 closure

**GitHub repo:** `christianmeude/capstone-nucleus-rn`

---

## Migration Status

✅ Complete and stable. All migration phases done.  
See `docs/plans/SUPABASE_MIGRATION.md`.

---

## UI Overhaul Status

✅ Complete through Phase 10.

- ✅ Phase 1 — Design system foundation
- ✅ Phase 2 — Component system
- ✅ Phase 3 — Dashboard overhaul
- ✅ Phase 4 — MyPapers overhaul
- ✅ Phase 5 — Browse overhaul
- ✅ Phase 6 — Notifications overhaul
- ✅ Phase 7 — Invitations overhaul
- ✅ Phase 8 — ResearchDetail overhaul
- ✅ Phase 9 — Polish + accessibility
- ✅ Phase 10 — Validation + merge readiness

`docs/plans/UI_OVERHAUL.md` is now marked `[COMPLETED]`.

---

## What Changed Since Phase 9 Handoff

### 1) Phase 10 closure
- Validation pass completed.
- Frozen-layer diff guard completed against `origin/dev` for:
  - `src/api`
  - `src/context/AuthContext.tsx`
  - `src/lib/supabase.ts`
  - `src/auth`
  - `src/storage`
  - `src/types`
  - `src/navigation/types.ts`
- `npx tsc --noEmit` green.
- On-device smoke checks confirmed working.

### 2) Plan wording correction
- `UI_OVERHAUL.md` Phase 10 item 7 updated to match shipped behavior:
  - `ResearchDetail` now documents Open PDF + view tracking (no Download flow in UI pending backend schema work for #8).

### 3) Merge progression
- `feat/ui-overhaul` merged into `dev` in the same local merge style used for supabase migration.
- Post-merge docs/conventions commit landed on `dev`:
  - `docs: add conventions index, GitHub issue templates, and handoff links`
  - includes `.github/ISSUE_TEMPLATE/*` and `docs/conventions/*`

### 4) Conventions system added
- `docs/conventions/README.md`
- `docs/conventions/github-issues.md`
- `docs/conventions/github-milestones.md`
- `docs/conventions/commits.md`
- `docs/conventions/builder-prompts.md`
- `docs/conventions/git-tags.md`

Plus GitHub templates:
- `.github/ISSUE_TEMPLATE/bug.md`
- `.github/ISSUE_TEMPLATE/enhancement.md`
- `.github/ISSUE_TEMPLATE/config.yml`

Handoff/template links updated:
- `docs/handoffs/HANDOFF_TEMPLATE.md` now includes `docs/conventions/README.md`
- `HANDOFF_U-O_PHASE-9.md` builder convention references issues/milestones conventions

---

## Critical Architectural Context (Still Active)

### Email-based RLS identity resolution
```sql
user_id = (SELECT id FROM public.users WHERE email = auth.email())
```

### Auth architecture
- Mobile uses anon key + RLS
- Web backend uses service role key
- Never use service role key on mobile
- Profile resolution by `auth.email()` against `public.users.email`

### users recursion constraint
- `public.users` SELECT policy cannot reference itself (`42P17`)
- Cross-user profile reads via `get_user_basic_info` SECURITY DEFINER RPC

### Android edge-to-edge note
- `app.json` has `android.edgeToEdgeEnabled: true`
- `ResearchDetail` top inset handled by custom stack header (`ResearchDetailHeader`) rather than global top SafeArea wrapper

---

## GitHub Issues Snapshot

**Closed:** #1, #2, #3, #4  
**Open:** #5, #6, #7, #8

Open issue intent:
- #5 backend category UUID mismatch
- #6 Browse list/tile enhancement
- #7 cross-user author-name RLS visibility
- #8 `allow_download` schema gap (UI mitigation already shipped: Download hidden)

Issue formatting is now standardized under `docs/conventions/github-issues.md`.

---

## Supabase RPCs (Current)

- `increment_view_count(row_id uuid)` — SECURITY DEFINER
- `increment_download_count(row_id uuid)` — SECURITY DEFINER
- `get_user_basic_info(user_id uuid)` — SECURITY DEFINER

---

## Current Codebase Baseline

### Stable from UI overhaul
- Design system and component stack fully migrated
- Motion/accessibility refinements shipped (`theme.motion`, `useReduceMotion`, list entrance, skeleton pulse, dynamic type cap, contrast pass)
- `ResearchDetail`:
  - compact metadata strip
  - no top overlap (custom header)
  - no Download button in UI pending #8 backend schema support

### Process baseline now centralized
- Conventions are first-class in `docs/conventions/*`
- GitHub issue templates now enforced through `.github/ISSUE_TEMPLATE/*`

---

## Current Priority Shift (Important)

### New undertaking order
1. **Submit research (mobile)** — now prioritized due to defense timeline
2. Reading experience — deferred until submit flow stabilizes

### Non-negotiable requirement for submit work
Use web implementation as source of truth for parity:

`C:\Users\Christian\Projects\capstone-nucleus\frontend\src\pages\student\SubmitResearch.jsx`

Parity means mobile must mirror web on:
- field schema
- validation rules
- payload shape
- storage path conventions
- initial status values
- post-submit behavior

No intentional feature downgrades for “bare minimum” are desired for this undertaking.

---

## Branch Workflow

Current known path:
```text
feat/ui-overhaul → dev
```

Planned next path:
```text
feat/submit-research → dev → main
```

Reading experience remains planned but not first.

---

## Next Steps

1. Finalize kickoff artifacts for submit work:
   - `docs/plans/SUBMIT_RESEARCH.md`
   - `docs/handoffs/HANDOFF_S-R_KICKOFF.md`
2. Branch: `feat/submit-research` off latest `dev` (already started per current direction).
3. Run parity discovery against web `SubmitResearch.jsx` before coding.
4. Implement submit flow with parity-first scope.
5. Validate cross-surface parity:
   - mobile-submitted papers appear correctly in web admin/faculty
   - web-submitted papers appear correctly in mobile student surfaces
6. Defer `feat/reading-experience` until submit path is stable.

---

## Notes

- Git tagging is documented but currently parked (`docs/conventions/git-tags.md`).
- Commit/message/prompt formatting conventions are now centralized and should be treated as canonical for future sessions.