---
undertaking: "Submit Research"
phase: "complete"
date: 2026-06-15
branch: dev
last_commit: "Merge branch 'feat/submit-research' into dev"
status: complete
---

# NUcleus Mobile — Session Handoff Context (Submit Research Complete)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) is on a stable post-migration, post-UI-overhaul, post-submit-research baseline on branch `dev`. The Submit Research undertaking is fully delivered and merged. The next undertaking has not yet been decided.

**Canonical docs:**
- `docs/plans/SUBMIT_RESEARCH.md` — completed plan (all four phases marked done)
- `docs/sql/` — deployed SQL snapshots (all current)
- `docs/CONVENTIONS.md` — all process conventions

---

## Submit Research — Delivery Summary

All four phases complete and merged to `dev` from `feat/submit-research`.

| Phase | Outcome |
|---|---|
| 1 — Web parity mapping | Frozen contract v1 captured in `SUBMIT_RESEARCH_PARITY_MATRIX.md` |
| 2 — Submission flow | Full-parity submit form: file, title, abstract, keywords, category, faculty, department, co-authors, draft autosave, resubmit |
| 3 — Cross-system parity | Co-author invite/accept flow fixed end-to-end; author name resolution fixed; mobile↔web visibility confirmed |
| 4 — Validation | Frozen-layer clean, parity checklist passed, issue #7 closed, branch merged |

**SQL deployed (all snapshotted in `docs/sql/`):**
- `submission_drafts` — four author-scoped RLS policies
- `research_authors` — open SELECT; owner INSERT/UPDATE/DELETE; invitee INSERT (post-accept)
- `co_author_invitations` — email-resolved SELECT/UPDATE (invitee); INSERT (inviter, superseded by RPC)
- `public.users` — open SELECT for `authenticated` role (resolves cross-user author display)
- `system_policy_settings`, `research_categories`, `departments` — open anon SELECT
- RPCs: `get_faculty_members`, `search_students`, `create_co_author_invitations`

---

## Open Issues

- 🔴 #5 — `Browse: category filter shows unresolved UUIDs` — backend/data; no owner yet
- 🔴 #6 — `Browse: add toggleable list and tile view` — enhancement; no owner yet
- 🔴 #8 — `ResearchDetail: Download button always visible — no allow_download column` — UI mitigation in place; backend column pending

**Current cap: #8. Do not invent issue numbers beyond #8.**

---

## Known Non-Blocking Debt

- **`research_authors` invitee INSERT policy** — `cai.research_id = cai.research_id` self-join is fixed; separate minor policy scoping note exists but does not affect functionality
- **`submission_drafts` partial unique** — `onConflict: 'user_id,paper_id'` mismatches the partial unique when `paper_id IS NULL`; causes autosave warn; non-blocking
- **`get_research_paper_ids_for_invitee`** — debug RPC; unused; candidate for cleanup
- **Malfoy duplicate auth.users** — `c2e20fd8` (`malfoydevera@students.nu-dasma-edu.ph`); clean up via Supabase Auth admin panel

---

## Current RLS Policy State (Supabase)

See `docs/sql/` for all snapshots. Tables with active policies:

| Table | Policies |
|---|---|
| `public.users` | SELECT (self by email); SELECT (all for authenticated) |
| `research_papers` | See `docs/sql/submit_research_rls_policies.sql` |
| `research_authors` | SELECT (open anon); INSERT/UPDATE/DELETE (owner); INSERT (invitee post-accept) |
| `co_author_invitations` | SELECT/UPDATE (invitee, email-resolved); INSERT (inviter, email-resolved) |
| `submission_drafts` | SELECT/INSERT/UPDATE/DELETE (author-scoped, email-resolved) |
| `research_categories` | SELECT (open anon) |
| `departments` | SELECT (open anon) |
| `system_policy_settings` | SELECT (open anon) |

---

## Supabase RPCs

All SECURITY DEFINER, `SET search_path = public`, `GRANT EXECUTE TO anon, authenticated`.

| RPC | Purpose | Snapshot |
|---|---|---|
| `increment_view_count(row_id uuid)` | view count | migration snapshot |
| `increment_download_count(row_id uuid)` | download count | migration snapshot |
| `get_user_basic_info(user_id uuid)` | cross-user profile read | migration snapshot |
| `get_faculty_members(p_department text, p_department_id uuid)` | adviser picker | `submit_research_rpcs.sql` |
| `search_students(p_query text)` | co-author search | `submit_research_rpcs.sql` |
| `create_co_author_invitations(p_research_id uuid, p_invitee_ids uuid[])` | post-submit invitation + notification | `co_author_invitations_rpcs.sql` |

---

## Current Git State

Branch: `dev` — working tree clean after merge.

```
ffc83e6 (HEAD -> dev) Merge branch 'feat/submit-research' into dev
5d6845f Merge branch 'feat/ui-overhaul' into dev
```

`origin/dev` is behind local `dev` by the Submit Research merge. Push when ready.

---

## Immediate Next Steps

1. **Push `dev` to origin** — `git push origin dev`
2. **Decide the next undertaking** — candidates from open issues (#5, #6, #8) or new product work; update CLAUDE.md steps 3–4 to point to the new plan and handoff once chosen
3. **Update CLAUDE.md** — once next undertaking is defined, point the Session Opening Protocol to the new plan doc and handoff
