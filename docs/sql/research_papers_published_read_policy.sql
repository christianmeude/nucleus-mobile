-- ============================================================
-- RECORD: research_papers — additive RLS read policy for 'published' papers
-- Introduced by the Hybrid Search undertaking (H-S), Phase 1 — 2026-06-25.
-- Adds authenticated read access to papers in 'published' status.
-- ADDITIVE: the web-owned policy "Combined research read access" (which exposes
-- 'approved' to role public, plus author / faculty / staff-admin / co-author
-- branches via the email-resolved id) is UNCHANGED.
-- Decision (Option B): authenticated-only, since the app is exclusive to
-- NU-Dasmariñas students/staff who all have accounts. NOTE 'approved' remains
-- anon-readable via the web policy; tightening that would mean editing the web's
-- policy and is out of scope for this undertaking.
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================

-- ----------------------------------------------------------------
-- Policy: "Public can read published papers" (SELECT, role authenticated)
-- ----------------------------------------------------------------
create policy "Public can read published papers"
  on public.research_papers
  for select
  to authenticated
  using (status::text = 'published');
