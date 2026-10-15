-- Scorings portés par `quiz.completed` (visiteurs avec cookies).
with completed_scorings as (
  select
    quiz_session_id,
    min(event_at)::date as session_date,
    max(distinct_id) as distinct_id
  from {{ ref('stg_tracking__quiz_completed') }}
  where quiz_session_id is not null
  group by quiz_session_id
),

-- Scorings rattachés aux tentatives par `int_tracking_quiz_session`, qui
-- reprend pour les visiteurs sans cookies l'id du premier `results.viewed`
-- (lu dans l'URL `/results/<id>`).
attempt_scorings as (
  select
    quiz_session_id,
    min(session_date) as session_date,
    max(distinct_id) as distinct_id
  from {{ ref('int_tracking_quiz_session') }}
  where quiz_session_id is not null
  group by quiz_session_id
),

sessions as (
  select
    coalesce(c.quiz_session_id, a.quiz_session_id) as quiz_session_id,
    coalesce(c.session_date, a.session_date) as session_date,
    coalesce(c.distinct_id, a.distinct_id) as distinct_id
  from completed_scorings as c
  full outer join attempt_scorings as a
    on c.quiz_session_id = a.quiz_session_id
),

latest_result as (
  select distinct on (user_scoring_id)
    user_scoring_id,
    matching_engine_version,
    results
  from {{ ref('stg_matching_engine_result') }}
  where results is not null
  order by user_scoring_id asc, created_at desc
),

backend_scoring as (
  select
    lr.user_scoring_id as quiz_session_id,
    avg(
      (
        select avg(jt.value::numeric)
        from jsonb_each_text(t.elem -> 'taxonomyScores') as jt
      )
    ) as score_top5,
    max(lr.matching_engine_version) as matching_engine_version
  from latest_result as lr
  cross join
    lateral jsonb_array_elements(lr.results)
    with ordinality as t (elem, ord)
  where t.ord <= 5
  group by lr.user_scoring_id
),

backend_conversion as (
  select
    quiz_session_id,
    backend_click_count,
    backend_clicked_mission_count,
    first_backend_click_at,
    apply_count,
    has_apply,
    first_apply_at
  from {{ ref('int_tracking_backend_conversion') }}
)

select
  s.quiz_session_id,
  s.distinct_id,
  s.session_date,
  bsc.matching_engine_version,
  bsc.score_top5,
  bc.backend_clicked_mission_count,
  bc.first_backend_click_at,
  bc.first_apply_at,
  coalesce(bc.backend_click_count, 0) as backend_click_count,
  coalesce(bc.backend_click_count, 0) > 0 as has_backend_click,
  coalesce(bc.has_apply, false) as has_apply,
  coalesce(bc.apply_count, 0) as apply_count
from sessions as s
left join backend_scoring as bsc on s.quiz_session_id = bsc.quiz_session_id
left join backend_conversion as bc on s.quiz_session_id = bc.quiz_session_id
where {{ exclude_internal_distinct_ids('s.distinct_id') }}
