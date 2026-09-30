-- Vue « résultats + aval », une ligne par `quiz_session_id`. `results.viewed`
-- peut être émis plusieurs fois pour un même scoring : rechargement, ou
-- retour sur une ancienne page `/results/<id>` depuis une AUTRE tentative
-- (l'événement porte alors la tentative en cours). On garde la tentative et
-- le `distinct_id` de la PREMIÈRE vue, celle qui a produit le scoring. Un
-- re-scoring par les filtres émet un nouveau `quiz_session_id` (autre ligne).
-- Sections des résultats classés : `pinned` / `other` jusqu'à la refonte du
-- 17/09/2026, puis `list` (liste paginée) / `map` (carte). `rank` est le rang
-- absolu dans le scoring dans les deux cas.
with results as (
  select
    quiz_session_id,
    (array_agg(quiz_attempt_id order by event_at, event_uuid))[1]
      as quiz_attempt_id,
    (array_agg(distinct_id order by event_at, event_uuid))[1] as distinct_id,
    min(event_at)::date as session_date,
    min(event_at) as viewed_at,
    bool_or(has_results) as has_results,
    max(total_results_count) as total_results_count,
    max(page_size) as page_size,
    max(total_pages) as total_pages,
    max(avg_distance_km_top5) as avg_distance_km_top5
  from {{ ref('stg_tracking__results_viewed') }}
  where quiz_session_id is not null
  group by quiz_session_id
),

clicks as (
  select
    quiz_session_id,
    count(*) as click_count,
    bool_or(section in ('pinned', 'other', 'list', 'map') and rank <= 5)
      as has_click_top5,
    bool_or(section in ('pinned', 'other', 'list', 'map') and rank <= 10)
      as has_click_top10,
    bool_or(section in ('pinned', 'other', 'list', 'map') and rank > 10)
      as has_click_beyond_top10,
    max(page_number) as max_clicked_page_number,
    bool_or(entry_page = 'results') as has_click_results,
    bool_or(opens_external) as has_click_external
  from {{ ref('int_tracking_mission_click') }}
  where quiz_session_id is not null
  group by quiz_session_id
)

select
  r.quiz_session_id,
  r.quiz_attempt_id,
  r.distinct_id,
  r.viewed_at,
  r.session_date,
  r.has_results,
  r.total_results_count,
  r.page_size,
  r.total_pages,
  r.avg_distance_km_top5,
  cl.max_clicked_page_number,
  coalesce(cl.click_count, 0) as click_count,
  coalesce(cl.click_count, 0) > 0 as has_click_after_results,
  coalesce(cl.has_click_top5, false) as has_click_top5,
  coalesce(cl.has_click_top10, false) as has_click_top10,
  coalesce(cl.has_click_beyond_top10, false) as has_click_beyond_top10,
  coalesce(cl.has_click_results, false) as has_click_results,
  coalesce(cl.has_click_external, false) as has_click_external,
  coalesce(cl.click_count, 0) = 0 as is_zero_click
from results as r
left join clicks as cl on r.quiz_session_id = cl.quiz_session_id
where {{ exclude_internal_distinct_ids('r.distinct_id') }}
