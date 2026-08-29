-- ============================================================
-- RECORD: programs — anon + authenticated read (mobile parity)
-- Deployed for the mobile D&P read-side parity (program picker on
-- submit, program read on paper detail).
-- Mirrors the department lookup access (see anon_can_read_departments
-- in submit_research_rls_policies.sql): the programs lookup table must
-- be readable so the anonymous/authenticated mobile client can render
-- program options and resolve program names.
-- No writes are exposed; services (role service_role) bypass RLS.
-- This file is a snapshot of deployed policies, not a migration script.
-- ============================================================

-- Enable RLS if not already enabled (idempotent).
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Read policy for the mobile client (both pre-login anon and signed-in).
CREATE POLICY programs_read_mobile
ON public.programs
FOR SELECT
TO anon, authenticated
USING (true);