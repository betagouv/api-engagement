with sessions as (
  select * from {{ ref('int_tracking_quiz_session') }}
),

results as (
  select
    quiz_session_id,
    has_results,
    pinned_count,
    total_results_count,
    avg_distance_km_top5,
    click_count,
    has_click_after_results,
    has_click_results,
    has_click_pinned,
    has_click_external,
    is_zero_click
  from {{ ref('int_tracking_results_session') }}
),

backend as (
  select
    quiz_session_id,
    score_top5,
    has_apply,
    apply_count
  from {{ ref('int_tracking_quiz_backend') }}
)

select
  s.quiz_attempt_id,
  s.quiz_session_id,
  s.started_at,
  s.session_date,
  s.entry_source,
  s.device_type,
  s.utm_source,
  s.utm_campaign,
  s.utm_medium,
  s.prompt_version,
  s.algo_version,
  s.is_completed,
  s.completed_at,
  s.completion_type,
  s.steps_completed_count,
  s.last_step_name,
  s.last_step_index,
  s.total_visible_steps,
  s.quiz_path,
  s.quiz_duration_ms,
  s.statut,
  s.motivation,
  s.age_bracket,
  s.has_localisation,
  r.has_results,
  r.total_results_count,
  r.pinned_count,
  r.avg_distance_km_top5,
  b.score_top5,
  b.has_apply,
  coalesce(r.click_count, 0) as click_count,
  coalesce(r.has_click_after_results, false) as has_click_after_results,
  coalesce(r.has_click_results, false) as has_click_results,
  coalesce(r.has_click_pinned, false) as has_click_pinned,
  coalesce(r.has_click_external, false) as has_click_external,
  coalesce(r.is_zero_click, false) as is_zero_click,
  coalesce(b.apply_count, 0) as apply_count
from sessions as s
left join results as r on s.quiz_session_id = r.quiz_session_id
left join backend as b on s.quiz_session_id = b.quiz_session_id
order by s.started_at desc
