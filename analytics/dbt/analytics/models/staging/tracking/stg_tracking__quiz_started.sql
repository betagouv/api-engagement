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
    referrer,
    referring_domain,
    is_internal_user,
    properties ->> 'entry_source' as entry_source
  from {{ ref('stg_tracking__event') }}
  where event_name = 'quiz.started'
)

select * from base
