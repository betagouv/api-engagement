-- Position moyenne quotidienne des missions recommandées cliquées, par
-- version du moteur. Les compteurs et la somme permettent de recalculer une
-- moyenne pondérée fiable sur une période quelconque dans Metabase.
with result_clicks as (
  select
    session_date as click_date,
    backend_rank as matching_engine_rank,
    matched_to_backend as matched_to_matching_engine,
    coalesce(matching_engine_version, 'unknown')
      as matching_engine_version
  from {{ ref('int_tracking_mission_click') }}
  where
    session_date is not null
    and entry_page = 'results'
    and section in ('pinned', 'other')
)

select
  click_date,
  matching_engine_version,
  count(*) as result_click_count,
  count(*) filter (where matched_to_matching_engine)
    as matched_result_click_count,
  sum(matching_engine_rank) filter (where matched_to_matching_engine)
    as clicked_matching_engine_rank_sum,
  avg(matching_engine_rank) filter (where matched_to_matching_engine)
    as avg_clicked_matching_engine_rank,
  count(*) filter (where matched_to_matching_engine)::numeric
  / nullif(count(*), 0) as all_clicks_matching_engine_match_rate
from result_clicks
group by click_date, matching_engine_version
