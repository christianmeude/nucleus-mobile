import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function isEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'You must be signed in to update your recovery email.' }, 401);

  const sessionClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await sessionClient.auth.getUser(token);
  const accountEmail = authData.user?.email?.trim().toLowerCase();
  if (authError || !accountEmail) return json({ error: 'Your session has expired. Please sign in again.' }, 401);

  let recoveryEmail = '';
  try {
    const body = await req.json();
    recoveryEmail = (body?.recoveryEmail ?? '').toString().trim().toLowerCase();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  if (!isEmail(recoveryEmail)) return json({ error: 'Enter a valid personal email address.' }, 400);

  // ADR-0003: public.users ownership resolves through auth.email(), not auth.uid().
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: updatedUser, error: updateError } = await adminClient
    .from('users')
    .update({ recovery_email: recoveryEmail })
    .eq('email', accountEmail)
    .select('email')
    .maybeSingle();

  if (updateError) return json({ error: 'Unable to save your recovery email.' }, 500);
  if (!updatedUser) return json({ error: 'Your application profile could not be found.' }, 404);
  return json({ success: true });
});
