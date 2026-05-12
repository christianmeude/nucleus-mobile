# NUcleus Mobile — Session Handoff Context

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) migrated from Express backend to direct Supabase integration. Migration is complete and stable. UI overhaul has been completed through Phase 10 and merged to `dev`. A new follow-on effort is being planned, with priority likely shifting to **mobile submit functionality** before reading-experience polish.

**Canonical docs in the repo:**
- `docs/PROJECT_CONTEXT.md` — product identity, audience, navigation, domain types, principles
- `docs/PRODUCT_ROADMAP.md` — UX and design direction reference
- `docs/plans/SUPABASE_MIGRATION.md` — completed migration history, marked `[COMPLETED]`
- `docs/plans/UI_OVERHAUL.md` — now completed baseline for the 10-phase UI effort
- `docs/conventions/README.md` — process conventions index (issues, milestones, tags, commits, builder prompts)
- `docs/handoffs/HANDOFF_U-O_PHASE-9.md` — prior baseline before Phase 10 closure

**GitHub repo:** `christianmeude/capstone-nucleus-rn`

---

## Migration Status

✅ Complete and stable. All migration phases done, deferred migration issues resolved. See `docs/plans/SUPABASE_MIGRATION.md`.

---

## UI Overhaul Status

Branch execution path was:

```text
feat/ui-overhaul → dev
```

Current status:

- ✅ Phase 1 — Design system foundation
- ✅ Phase 2 — Component system
- ✅ Phase 3 — Dashboard overhaul
- ✅ Phase 4 — MyPapers overhaul
- ✅ Phase 5 — Browse overhaul
- ✅ Phase 6 — Notifications overhaul
- ✅ Phase 7 — Invitations overhaul
- ✅ Phase 8 — ResearchDetail overhaul
- ✅ Phase 9 — Polish and accessibility (including refinement pass)
- ✅ Phase 10 — Validation and merge

`docs/plans/UI_OVERHAUL.md` has been updated to `[COMPLETED]`.

---

## What Changed Since Phase 9 Handoff

### Phase 10 closure
- Phase 10 validation completed.
- Frozen-layer diff guard confirmed clean against `origin/dev` scope:
  - `src/api`
  - `src/context/AuthContext.tsx`
  - `src/lib/supabase.ts`
  - `src/auth`
  - `src/storage`
  - `src/types`
  - `src/navigation/types.ts`
- `npx tsc --noEmit` green.
- On-device smoke pass completed.

### Plan alignment correction
- `UI_OVERHAUL.md` Phase 10 item 7 wording was aligned with Issue #8 mitigation:
  - `ResearchDetail` now documents **Open PDF only** behavior (Download UI removed pending backend `allow_download`).

### Merge to dev
- `feat/ui-overhaul` merged into `dev` using the same local merge shape as prior supabase merge style.
- Merge message pattern intentionally kept uniform with historical repo practice.

### New process conventions added
A conventions system was introduced and committed:

- `docs/conventions/README.md`
- `docs/conventions/github-issues.md`
- `docs/conventions/github-milestones.md`
- `docs/conventions/commits.md`
- `docs/conventions/builder-prompts.md`
- `docs/conventions/git-tags.md`

And GitHub issue templates were added:

- `.github/ISSUE_TEMPLATE/bug.md`
- `.github/ISSUE_TEMPLATE/enhancement.md`
- `.github/ISSUE_TEMPLATE/config.yml`

Handoff docs were linked to conventions:
- `docs/handoffs/HANDOFF_TEMPLATE.md` now references `docs/conventions/README.md`
- `HANDOFF_U-O_PHASE-9.md` builder convention now points to issue/milestone convention docs

---

## Critical Architectural Context (still active)

### Email-based RLS identity resolution
All mobile RLS policies resolve ownership via email:
```sql
user_id = (SELECT id FROM public.users WHERE email = auth.email())
```

### Auth architecture
- Mobile uses anon key + RLS
- Web backend uses service role key (bypasses RLS)
- Never use service role key on mobile
- `fetchAppUserProfile()` resolves by `auth.email()` against `public.users.email`

### users RLS recursion constraint
- `public.users` SELECT policy cannot reference itself — causes infinite recursion error `42P17`
- Cross-user profile reads go through `get_user_basic_info` SECURITY DEFINER RPC

### Android edge-to-edge note
- `app.json` keeps `android.edgeToEdgeEnabled: true`
- `ResearchDetail` top overlap fix remains custom header approach (`ResearchDetailHeader`) rather than navigator-wide top SafeArea wrapping.

---

## GitHub Issues Snapshot

**Closed:**
- ✅ #1
- ✅ #2
- ✅ #3
- ✅ #4

**Open:**
- 🔴 #5 — Browse category UUID mismatch / backend category resolution
- 🔴 #6 — Browse list/tile toggle enhancement
- 🔴 #7 — Unknown author for non-owners (RLS cross-user read issue)
- 🔴 #8 — `allow_download` missing in schema; mobile UI mitigation shipped

**Formatting standardization:**
- Conventions now live in `docs/conventions/github-issues.md`
- Canonical title format and body templates (bug/enhancement) are now documented for all future issue edits/creation.

---

## Supabase RPCs (current)

- `increment_view_count(row_id uuid)` — SECURITY DEFINER
- `increment_download_count(row_id uuid)` — SECURITY DEFINER
- `get_user_basic_info(user_id uuid)` — SECURITY DEFINER

---

## Current State of the Codebase

### UI overhaul outputs now considered stable baseline
- Phase 9 motion/accessibility stack (`theme.motion`, `useReduceMotion`, animated skeleton/list entrance, accessibility labels, dynamic type, contrast pass) remains intact.
- `ResearchDetail` remains in mitigated state for Issue #8:
  - no Download button in UI
  - Open PDF path preserved
  - `trackDownload` call-site removed from screen layer (facade retained for future backend-enabled reintegration).

### Conventions system is now first-class
- Process guidance centralized under `docs/conventions/`
- GitHub issue templates now available in `.github/ISSUE_TEMPLATE/`

---

## Commit / Workflow Conventions (active)

### Commits
Use:
```text
type(scope): short description

Phase N: Label

- Bullet one
- Bullet two

Refs #issue-number
```
Types: `feat`, `fix`, `docs`, `chore`, `refactor`.

### Builder prompts
Must follow `docs/conventions/builder-prompts.md` plus active plan constraints.

---

## Current Git State

Integration branch context:
```text
feat/ui-overhaul → dev → main
```

At time of this handoff:
- UI overhaul is merged into `dev`.
- Conventions + issue templates are committed on `dev`.
- Tagging decision is intentionally parked for now (see `docs/conventions/git-tags.md` for standard process).

---

## Next Steps (updated priority)

1. Confirm whether to merge `dev → main` immediately or after first follow-on feature delivery.
2. Start next implementation branch off `dev`.
3. **Priority decision:** due to defense timeline, likely sequence is:
   - `feat/submit-research` first (high-capability impact, demo value),
   - `feat/reading-experience` second (polish + viewer/watermark + mode split).
4. Create first-commit docs for the next effort:
   - plan doc under `docs/plans/`
   - kickoff handoff under `docs/handoffs/`
5. Apply issue/milestone formatting unification for open issues #5–#8 per `docs/conventions/github-issues.md`.

---

## Deferred / Parked Items

- Git tag creation (explicitly parked).
- Reading-experience kickoff (paused while next-priority decision finalizes).
- Backend-dependent issues #5, #7, #8 remain open.

---

## Branch Workflow (current and forward)

```text
feat/ui-overhaul → dev → main
feat/submit-research (planned) → dev → main
feat/reading-experience (planned) → dev → main
```

`main` release timing is now a strategy decision, not a technical blocker.