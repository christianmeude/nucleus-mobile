-- ============================================================
-- RECORD: Push Notifications Schema & Webhook Preparation
-- Adds push_tokens table, RPC, and notified_at column
-- ============================================================

-- 1. Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    expo_push_token text not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    unique(user_id, expo_push_token)
);

-- 2. Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own tokens (optional, mostly needed server-side)
CREATE POLICY "Users can view their own push tokens" ON public.push_tokens
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE email = auth.email())
    );

-- 3. RPC for clients to register their token securely
CREATE OR REPLACE FUNCTION public.register_push_token(token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Resolve user ID from auth.email() matching public.users pattern
    SELECT id INTO v_user_id FROM public.users WHERE email = auth.email();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Upsert the token
    INSERT INTO public.push_tokens (user_id, expo_push_token)
    VALUES (v_user_id, token)
    ON CONFLICT (user_id, expo_push_token) DO UPDATE 
    SET updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_push_token(text) TO authenticated;

-- 4. Add notified_at to notifications table for idempotency
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notified_at timestamptz;
