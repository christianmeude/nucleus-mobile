import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let email = '';
  try {
    const body = await req.json();
    email = (body?.email ?? '').toString().trim();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  if (!email) {
    return json({ error: 'email is required' }, 400);
  }

  // Use service role key to query the users table securely
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Query public.users for the recovery_email
  const { data: userRecord, error: userError } = await adminClient
    .from('users')
    .select('recovery_email')
    .eq('email', email)
    .single();

  if (userError || !userRecord) {
    return json({ error: 'User not found or no recovery email configured.' }, 400);
  }

  const recoveryEmail = userRecord.recovery_email;
  if (!recoveryEmail) {
    return json({ error: 'No recovery email configured for this account.' }, 400);
  }

  // Call Supabase Auth to send the OTP to the recovery email
  const { error: resetError } = await adminClient.auth.resetPasswordForEmail(recoveryEmail);

  if (resetError) {
    return json({ error: resetError.message }, 400);
  }

  return json({ success: true, message: 'Verification code sent to your recovery email.' });
});
