// embed-papers — backfill / refresh embeddings for hybrid search (maintenance only).
//
// SECURITY / WEB SAFETY:
//   * Server-side only (Edge). Uses the service-role key (auto-injected by Supabase)
//     ONLY to: READ public papers from research_papers (never writes it) and
//     READ/WRITE research_paper_embeddings (our table). No other table is touched,
//     so web data is never modified.
//   * Admin/maintenance only: the caller must present the service-role key as the
//     bearer token, so app users (anon/authenticated) cannot trigger it.
//   * The service-role key never leaves the Edge runtime and never reaches mobile.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC_STATUSES = ['approved', 'published'];

const session = new Supabase.ai.Session('gte-small');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  // Admin-only gate: bearer must equal the service-role key.
  if (req.headers.get('Authorization') !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Read the searchable text of public (approved/published) papers.
  const { data: papers, error: readErr } = await admin
    .from('research_papers')
    .select('id, title, abstract, keywords')
    .in('status', PUBLIC_STATUSES)
    .is('deleted_at', null);
  if (readErr) return json({ stage: 'read', error: readErr.message }, 500);

  let upserted = 0;
  let skipped = 0;
  for (const p of papers ?? []) {
    const keywords = Array.isArray(p.keywords) ? p.keywords.join(' ') : '';
    const text = [p.title, p.abstract, keywords].filter(Boolean).join('\n').trim();
    if (!text) {
      skipped++;
      continue;
    }

    const sourceHash = await sha256Hex(text);

    // Skip when the stored embedding is already current.
    const { data: existing } = await admin
      .from('research_paper_embeddings')
      .select('source_hash')
      .eq('paper_id', p.id)
      .maybeSingle();
    if (existing?.source_hash === sourceHash) {
      skipped++;
      continue;
    }

    // Process a max of 5 embeddings per request to avoid WORKER_RESOURCE_LIMIT
    if (upserted >= 5) {
      return json({ total: papers?.length ?? 0, upserted, skipped, message: 'Run again to process more' });
    }

    // Generate the 384-dim embedding (gte-small, no external key).
    const embedding = await session.run(text, { mean_pool: true, normalize: true });

    const { error: upErr } = await admin.from('research_paper_embeddings').upsert({
      paper_id: p.id,
      embedding: JSON.stringify(embedding),
      source_hash: sourceHash,
      updated_at: new Date().toISOString(),
    });
    if (upErr) return json({ stage: 'upsert', paper_id: p.id, error: upErr.message }, 500);
    upserted++;
  }

  // 2. Prune embeddings whose paper is no longer public (status changed / soft-deleted).
  const validIds = new Set((papers ?? []).map((p) => p.id));
  const { data: allEmb } = await admin.from('research_paper_embeddings').select('paper_id');
  const stale = (allEmb ?? []).map((r) => r.paper_id).filter((id) => !validIds.has(id));
  let pruned = 0;
  if (stale.length) {
    const { error: delErr } = await admin
      .from('research_paper_embeddings')
      .delete()
      .in('paper_id', stale);
    if (delErr) return json({ stage: 'prune', error: delErr.message }, 500);
    pruned = stale.length;
  }

  return json({ total: papers?.length ?? 0, upserted, skipped, pruned });
});
