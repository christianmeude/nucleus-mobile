// search-papers — hybrid search query endpoint.
//
// SECURITY: no elevated access. The query embedding is generated with gte-small
// server-side (no external key, no secret); the RPC is then called with the
// CALLER's forwarded JWT, so the authenticated-only grant and RLS apply. Returns
// only [{ paper_id, score }] — the mobile client re-fetches the actual rows under
// its own session, keeping RLS the single content gate.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const session = new Supabase.ai.Session('gte-small');

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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing authorization' }, 401);

  let q = '';
  let limit = 20;
  try {
    const body = await req.json();
    q = (body?.q ?? '').toString();
    if (typeof body?.limit === 'number') limit = body.limit;
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  if (!q.trim()) return json({ results: [] });

  // Generate the 384-dim query embedding (gte-small).
  const embedding = await session.run(q, { mean_pool: true, normalize: true });

  // Call the RPC AS THE CALLER (forward their JWT) so grants + RLS apply.
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await client.rpc('search_research_papers', {
    query_text: q,
    query_embedding: JSON.stringify(embedding),
    match_count: Math.min(Math.max(limit, 1), 50),
  });
  if (error) return json({ error: error.message }, 400);

  return json({ results: data ?? [] });
});
