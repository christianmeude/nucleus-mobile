import { supabase } from '../lib/supabase';

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface CollectionPaper {
  id: string;
  collection_id: string;
  paper_id: string;
  added_at: string;
}

/**
 * Toggle whether a paper is in the caller's default "Saved" collection.
 * Returns true if the paper is now saved, false if it was removed.
 * Creates the "Saved" collection on first use.
 */
export async function togglePaperSaved(paperId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_paper_saved', {
    p_paper_id: paperId,
  });
  if (error) throw error;
  return data as boolean;
}

/**
 * Returns the paper IDs saved in the caller's default "Saved" collection.
 * Returns an empty array if the collection does not exist yet.
 */
export async function getSavedPaperIds(): Promise<string[]> {
  const { data: collections, error: colErr } = await supabase
    .from('collections')
    .select('id')
    .eq('is_default', true)
    .limit(1)
    .maybeSingle();

  if (colErr) throw colErr;
  if (!collections) return [];

  const { data: papers, error: paperErr } = await supabase
    .from('collection_papers')
    .select('paper_id')
    .eq('collection_id', collections.id);

  if (paperErr) throw paperErr;
  return (papers ?? []).map((row) => row.paper_id as string);
}

/**
 * Returns all collections belonging to the signed-in user,
 * ordered with the default "Saved" collection first.
 */
export async function getMyCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Collection[];
}
