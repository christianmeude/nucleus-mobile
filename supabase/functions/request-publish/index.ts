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

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'Missing authorization header' }, 401);
  }

  let paperId = '';
  let doi = '';
  try {
    const body = await req.json();
    paperId = body?.paperId;
    doi = body?.doi;
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  if (!paperId || !doi) {
    return json({ error: 'paperId and doi are required' }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Verify the user token — this gives us auth.users.id
  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Resolve auth.users.id → public.users.id.
  // research_papers.author_id references public.users.id (not auth.users.id),
  // so we need the profile row id, not the JWT sub.
  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('id')
    .eq('email', user.email!)
    .single();

  if (profileError || !profile) {
    return json({ error: 'User profile not found' }, 404);
  }

  const profileId = profile.id;

  // Ensure paper exists, is approved, and the caller is the author
  const { data: paper, error: fetchError } = await adminClient
    .from('research_papers')
    .select('id, status, author_id')
    .eq('id', paperId)
    .single();

  if (fetchError || !paper) {
    return json({ error: 'Paper not found' }, 404);
  }

  if (paper.author_id !== profileId) {
    return json({ error: 'Only the author can request publication' }, 403);
  }

  if (paper.status !== 'approved') {
    return json(
      { error: `Only approved papers can request formal publication (status: ${paper.status})` },
      400,
    );
  }

  // Update paper
  const nowIso = new Date().toISOString();
  const { error: updateError } = await adminClient
    .from('research_papers')
    .update({
      doi,
      publish_requested_at: nowIso,
      publish_requested_by: profileId,
      updated_at: nowIso,
    })
    .eq('id', paperId);

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  return json({ success: true });
});
