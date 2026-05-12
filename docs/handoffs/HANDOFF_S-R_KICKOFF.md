# NUcleus Mobile — Session Handoff Context (Submit Research Kickoff)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) is on a stable baseline: Supabase migration is complete and UI overhaul Phases 1-10 are completed/validated. A new undertaking is now starting on branch `feat/submit-research`: **mobile Submit Research with strict web parity**.

**Canonical docs in the repo:**
- `docs/PROJECT_CONTEXT.md` — product identity, audience, navigation, domain types, principles
- `docs/PRODUCT_ROADMAP.md` — UX and design direction reference
- `docs/plans/SUPABASE_MIGRATION.md` — migration history and SQL/RLS policy reference
- `docs/plans/UI_OVERHAUL.md` — completed UI execution baseline
- `docs/plans/SUBMIT_RESEARCH.md` — active Submit Research implementation plan
- `docs/conventions/README.md` — process conventions (issues, milestones, tags, commits, builder prompts)

**GitHub repo:** `christianmeude/capstone-nucleus-rn`

---

## Supabase Migration Status

✅ Complete and stable. See `docs/plans/SUPABASE_MIGRATION.md`.

---

## UI Overhaul Status

✅ Complete through Phase 10 and validated. See `docs/plans/UI_OVERHAUL.md`.

---

## Submit Research Status (current undertaking)

⏳ Kickoff started on branch `feat/submit-research`.

- ⏳ Phase 1 — Web parity mapping + contract freeze
- ⏳ Phase 2 — Submission flow implementation
- ⏳ Phase 3 — Cross-system parity verification
- ⏳ Phase 4 — Validation and merge readiness

---

## Deferred undertaking

`feat/reading-experience` is intentionally parked while submit-research parity work is prioritized.

---

## Critical Architectural Context

### Email-based RLS identity resolution
All mobile RLS policies resolve ownership via email:
```sql
user_id = (
  SELECT id FROM public.users
  WHERE email = auth.email()
)
```

### Auth architecture
- Mobile uses anon key + RLS
- Web backend uses service role key (bypasses RLS)
- Never use service role key on mobile
- `fetchAppUserProfile()` resolves by `auth.email()` against `public.users.email`

### users RLS recursion constraint
- `public.users` SELECT policy cannot reference itself (`42P17`)
- Cross-user profile reads go through `get_user_basic_info` SECURITY DEFINER RPC

### Domain type notes
- `public.users` has no `auth_id` column; email is the identity bridge
- `User.fullName` is canonical for display name handling
- `PaperStatus` includes both `approved` and `published`

---

## Open Issues Snapshot

- 🔴 #5 — Browse category filter shows unresolved UUIDs — categories not loading
- 🔴 #6 — Browse add toggleable list/tile view
- 🔴 #7 — ResearchDetail/Browse author name shows "Unknown" for non-uploaders
- 🔴 #8 — ResearchDetail Download visibility vs missing `allow_download` column (UI mitigation shipped)

Issue formatting/discipline is governed by `docs/conventions/github-issues.md`.

---

## Current State of the Codebase

### Stable baseline
- Migration and UI overhaul are complete and validated.
- `ResearchDetail` uses custom safe-area-aware header under Android edge-to-edge.
- Phase 9 motion/accessibility refinements are already in place and should not be regressed.

### Conventions now centralized
- `docs/conventions/github-issues.md`
- `docs/conventions/github-milestones.md`
- `docs/conventions/commits.md`
- `docs/conventions/builder-prompts.md`

---

## Web-parity authority (non-negotiable)

Authoritative source for submit behavior:

`C:\Users\Christian\Projects\capstone-nucleus\frontend\src\pages\student\SubmitResearch.jsx`

Follow import chain and backend handlers for parity in:
- field schema
- validation rules
- payload transformation
- storage path conventions
- initial status behavior
- post-submit routing/side effects

No intentional mobile-specific downgrades for this undertaking.

---

## Next Steps

1. Execute Phase 1 parity mapping from web source and freeze mobile contract.
2. Implement submit flow in RN per frozen parity contract.
3. Verify cross-system parity:
   - mobile submit -> web review/admin visibility
   - web submit -> mobile student visibility
4. Complete Phase 4 validation checklist and prepare merge readiness.
5. Keep reading-experience deferred until submit-research reaches stable completion.

---

## Intended Branch Workflow

```text
feat/submit-research -> dev -> main
```

`main` is not touched until submit-research is complete and merged to `dev` with validation pass.
