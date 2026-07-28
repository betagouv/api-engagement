with results as (
  select
    quiz_session_id,
    quiz_attempt_id,
    distinct_id,
    min(event_at)::date as session_date,
    min(event_at) as viewed_at,
    bool_or(has_results) as has_results,
    max(pinned_count) as pinned_count,
    max(total_results_count) as total_results_count,
    max(avg_distance_km_top5) as avg_distance_km_top5
  from {{ ref('stg_tracking__results_viewed') }}
  where quiz_session_id is not null
  group by quiz_session_id, quiz_attempt_id, distinct_id
),

clicks as (
  select
    quiz_session_id,
    count(*) as click_count,
    bool_or(section = 'pinned') as has_click_pinned,
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
  r.pinned_count,
  r.total_results_count,
  r.avg_distance_km_top5,
  coalesce(cl.click_count, 0) as click_count,
  coalesce(cl.click_count, 0) > 0 as has_click_after_results,
  coalesce(cl.has_click_pinned, false) as has_click_pinned,
  coalesce(cl.has_click_results, false) as has_click_results,
  coalesce(cl.has_click_external, false) as has_click_external,
  coalesce(cl.click_count, 0) = 0 as is_zero_click
from results as r
left join clicks as cl on r.quiz_session_id = cl.quiz_session_id
where {{ exclude_internal_distinct_ids('r.distinct_id') }}
