-- TODO score_top5: figer le chemin JSON de matching_engine_result.results
-- (cles score / rank) pour calculer avg(score) sur le top 5.
-- TODO candidature: rattacher les apply backend a la session (cle a definir).
with sessions as (
  select
    quiz_session_id,
    min(event_at)::date as session_date,
    max(distinct_id) as distinct_id,
    bool_or(is_internal_user) as is_internal_user
  from {{ ref('stg_tracking__quiz_completed') }}
  where quiz_session_id is not null
  group by quiz_session_id
),

backend_scoring as (
  select
    user_scoring_id as quiz_session_id,
    null::numeric as score_top5,
    max(matching_engine_version) as matching_engine_version
  from {{ ref('matching_engine_result') }}
  group by user_scoring_id
)

select
  s.quiz_session_id,
  s.distinct_id,
  s.session_date,
  bsc.matching_engine_version,
  bsc.score_top5,
  null::boolean as has_apply,
  0::integer as apply_count,
  null::timestamp as first_apply_at
from sessions as s
left join backend_scoring as bsc on s.quiz_session_id = bsc.quiz_session_id
where {{ exclude_internal_users('s.is_internal_user') }}
