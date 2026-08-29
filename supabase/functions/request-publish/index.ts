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

  // Verify the user token
  const { data: { user }, error: authError } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Ensure paper exists and is approved, and user is author
  const { data: paper, error: fetchError } = await adminClient
    .from('research_papers')
    .select('id, status, author_id')
    .eq('id', paperId)
    .single();

  if (fetchError || !paper) {
    return json({ error: 'Paper not found' }, 404);
  }

  if (paper.author_id !== user.id) {
    return json({ error: 'Only the author can request publication' }, 403);
  }

  if (paper.status !== 'approved') {
    return json({ error: `Only approved papers can request formal publication (status: ${paper.status})` }, 400);
  }

  // Update paper
  const nowIso = new Date().toISOString();
  const { error: updateError } = await adminClient
    .from('research_papers')
    .update({
      doi,
      publish_requested_at: nowIso,
      publish_requested_by: user.id,
      updated_at: nowIso,
    })
    .eq('id', paperId);

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  return json({ success: true });
});
