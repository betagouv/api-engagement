with base as (
  select
    event_uuid,
    event_name,
    event_at,
    distinct_id,
    quiz_attempt_id,
    quiz_session_id,
    quiz_version,
    device_type,
    utm_source,
    utm_campaign,
    utm_medium,
    is_internal_user,
    is_cookieless_mode,
    (properties ->> 'rank')::int as rank,
    properties ->> 'signup_source' as signup_source,
    properties ->> 'completion_type' as completion_type,
    properties ->> 'error_type' as error_type,
    properties ->> 'skip_method' as skip_method,
    properties ->> 'mission_id' as mission_id,
    properties ->> 'publisher_id' as publisher_id,
    properties ->> 'entry_source' as entry_source
  from {{ ref('stg_tracking__event') }}
  where event_name like 'email_capture.%'
)

select * from base
