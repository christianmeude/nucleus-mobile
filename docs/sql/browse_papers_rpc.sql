-- ============================================================
-- RECORD: browse_papers RPC — server-side Browse filtering + paging
-- Introduced by the list-load performance plan, Phase 5 — 2026-10-21.
--
-- Browse previously fetched every approved/published paper and filtered
-- client-side. This function moves the facets and the page window into
-- Postgres, returning one page plus the total match count in a single
-- round trip.
--
-- Security: SECURITY INVOKER, so the existing research_papers policies keep
-- gating rows exactly as a direct select would ('approved' public,
-- 'published' authenticated). No definer bypass.
--
-- Filter inputs are arrays because the Browse filter sheet is multi-select.
-- Departments are matched by name (lowercased, trimmed) because that is what
-- the sheet stores; categories are the category id stored as text in
-- research_papers.category; programs are program ids.
--
-- Sorting mirrors src/utils/format.ts paperDate():
--   coalesce(published_date, submission_date, created_at) desc
-- with id as the stable tie-break so LIMIT/OFFSET pages never overlap.
-- This file is a snapshot of the deployed definition, not a migration script.
-- ============================================================

create or replace function public.browse_papers(
  p_categories  text[]  default null,
  p_departments text[]  default null,
  p_programs    uuid[]  default null,
  p_year_from   integer default null,
  p_year_to     integer default null,
  p_limit       integer default 20,
  p_offset      integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select
      rp.id,
      rp.title,
      rp.status,
      rp.category,
      rp.keywords,
      rp.created_at,
      rp.updated_at,
      rp.submission_date,
      rp.published_date,
      rp.file_url,
      rp.view_count,
      rp.doi,
      rp.publish_requested_at,
      rp.author_id,
      rp.department,
      rp.department_id,
      rp.program_id,
      coalesce(rp.published_date, rp.submission_date, rp.created_at) as sort_date
    from public.research_papers rp
    where rp.deleted_at is null
      and rp.status in ('approved', 'published')
      and (
        p_categories is null
        or cardinality(p_categories) = 0
        or rp.category = any (p_categories)
      )
      and (
        p_departments is null
        or cardinality(p_departments) = 0
        or lower(btrim(rp.department)) = any (
          select lower(btrim(d)) from unnest(p_departments) as d
        )
      )
      and (
        p_programs is null
        or cardinality(p_programs) = 0
        or rp.program_id = any (p_programs)
      )
      and (
        p_year_from is null
        or extract(year from coalesce(rp.published_date, rp.submission_date, rp.created_at)) >= p_year_from
      )
      and (
        p_year_to is null
        or extract(year from coalesce(rp.published_date, rp.submission_date, rp.created_at)) <= p_year_to
      )
  ),
  page as (
    select *
    from filtered
    order by sort_date desc nulls last, id asc
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  ),
  total as (
    select count(*)::integer as n from filtered
  )
  select jsonb_build_object(
    'items', coalesce(
      (
        select jsonb_agg(
          to_jsonb(item) - 'sort_date'
          order by item.sort_date desc nulls last, item.id asc
        )
        from (
          select
            p.id,
            p.title,
            p.status,
            p.category,
            p.keywords,
            p.created_at,
            p.updated_at,
            p.submission_date,
            p.published_date,
            p.file_url,
            p.view_count,
            p.doi,
            p.publish_requested_at,
            p.author_id,
            p.department,
            p.department_id,
            p.program_id,
            case
              when pr.id is null then null
              else jsonb_build_object('id', pr.id, 'name', pr.name, 'code', pr.code)
            end as program,
            case
              when u.id is null then null
              else jsonb_build_object(
                'first_name', u.first_name,
                'middle_name', u.middle_name,
                'last_name', u.last_name
              )
            end as author,
            p.sort_date
          from page p
          left join public.programs pr on pr.id = p.program_id
          left join public.users u on u.id = p.author_id
        ) item
      ),
      '[]'::jsonb
    ),
    'total', (select n from total)
  );
$$;

revoke all on function public.browse_papers(text[], text[], uuid[], integer, integer, integer, integer) from public, anon;
grant execute on function public.browse_papers(text[], text[], uuid[], integer, integer, integer, integer) to authenticated;

-- Matches the RPC's ORDER BY so the page window stays index-ordered as the
-- repository grows past a few hundred rows.
create index if not exists idx_research_papers_browse_sort
  on public.research_papers ((coalesce(published_date, submission_date, created_at)) desc nulls last)
  where deleted_at is null and status in ('approved', 'published');
