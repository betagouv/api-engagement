with base as (
  select
    event_uuid,
    event_at,
    distinct_id,
    quiz_attempt_id,
    quiz_session_id,
    quiz_version,
    prompt_version,
    algo_version,
    device_type,
    utm_source,
    utm_campaign,
    utm_medium,
    is_internal_user,
    (properties ->> 'steps_completed_count')::int as steps_completed_count,
    (properties ->> 'has_localisation')::boolean as has_localisation,
    (properties ->> 'quiz_duration_ms')::int as quiz_duration_ms,
    properties ->> 'completion_type' as completion_type,
    properties ->> 'quiz_path' as quiz_path,
    properties ->> 'statut' as statut,
    properties ->> 'motivation' as motivation,
    properties ->> 'age_bracket' as age_bracket
  from {{ ref('stg_tracking__event') }}
  where event_name = 'quiz.completed'
)

select * from base
