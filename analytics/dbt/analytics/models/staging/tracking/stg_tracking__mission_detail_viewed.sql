with base as (
  select
    event_uuid,
    event_at,
    distinct_id,
    quiz_attempt_id,
    quiz_session_id,
    device_type,
    utm_source,
    utm_campaign,
    utm_medium,
    mtm_campaign,
    is_internal_user,
    (properties ->> 'rank')::int as rank,
    properties ->> 'mission_id' as mission_id,
    properties ->> 'publisher_id' as publisher_id,
    properties ->> 'publisher_name' as publisher_name,
    properties ->> 'entry_source' as entry_source
  from {{ ref('stg_tracking__event') }}
  where event_name = 'mission_detail.viewed'
)

select * from base
