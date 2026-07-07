with started as (
  select
    quiz_attempt_id,
    min(event_at) as started_at,
    max(entry_source) as entry_source,
    max(device_type) as device_type,
    max(utm_source) as utm_source,
    max(utm_campaign) as utm_campaign,
    max(utm_medium) as utm_medium,
    max(prompt_version) as prompt_version,
    max(algo_version) as algo_version,
    bool_or(is_internal_user) as is_internal_user
  from {{ ref('stg_tracking__quiz_started') }}
  where quiz_attempt_id is not null
  group by quiz_attempt_id
),

steps as (
  select
    quiz_attempt_id,
    count(*) as step_events_count,
    max(step_index) as last_step_index,
    max(total_visible_steps) as total_visible_steps,
    (array_agg(step_name order by step_index desc nulls last))[1]
      as last_step_name,
    bool_or(is_internal_user) as is_internal_user
  from {{ ref('stg_tracking__quiz_step_completed') }}
  where quiz_attempt_id is not null
  group by quiz_attempt_id
),

completed as (
  select
    quiz_attempt_id,
    max(quiz_session_id) as quiz_session_id,
    min(event_at) as completed_at,
    max(completion_type) as completion_type,
    max(quiz_path) as quiz_path,
    max(steps_completed_count) as steps_completed_count,
    bool_or(has_localisation) as has_localisation,
    max(statut) as statut,
    max(motivation) as motivation,
    max(age_bracket) as age_bracket,
    max(quiz_duration_ms) as quiz_duration_ms,
    bool_or(is_internal_user) as is_internal_user
  from {{ ref('stg_tracking__quiz_completed') }}
  where quiz_attempt_id is not null
  group by quiz_attempt_id
),

joined as (
  select
    c.quiz_session_id,
    s.started_at,
    s.started_at::date as session_date,
    s.entry_source,
    s.device_type,
    s.utm_source,
    s.utm_campaign,
    s.utm_medium,
    s.prompt_version,
    s.algo_version,
    c.completed_at,
    c.completion_type,
    st.last_step_name,
    st.last_step_index,
    st.total_visible_steps,
    c.quiz_path,
    c.quiz_duration_ms,
    c.statut,
    c.motivation,
    c.age_bracket,
    c.has_localisation,
    coalesce(s.quiz_attempt_id, st.quiz_attempt_id, c.quiz_attempt_id)
      as quiz_attempt_id,
    c.completed_at is not null as is_completed,
    coalesce(c.steps_completed_count, st.step_events_count)
      as steps_completed_count,
    coalesce(
      s.is_internal_user, st.is_internal_user, c.is_internal_user, false
    ) as is_internal_user
  from started as s
  full outer join steps as st on s.quiz_attempt_id = st.quiz_attempt_id
  full outer join completed as c
    on coalesce(s.quiz_attempt_id, st.quiz_attempt_id) = c.quiz_attempt_id
)

select *
from joined
where {{ exclude_internal_users() }}
