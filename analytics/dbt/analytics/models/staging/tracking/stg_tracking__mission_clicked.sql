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
    is_internal_user,
    (properties ->> 'rank')::int as rank,
    (properties ->> 'opens_external')::boolean as opens_external,
    (properties ->> 'distance_km')::numeric as distance_km,
    properties ->> 'mission_id' as mission_id,
    properties ->> 'publisher_id' as publisher_id,
    properties ->> 'publisher_name' as publisher_name,
    properties ->> 'section' as section,
    properties ->> 'mission_domain' as mission_domain,
    properties ->> 'mission_type' as mission_type,
    properties ->> 'entry_page' as entry_page
  from {{ ref('stg_tracking__event') }}
  where event_name = 'mission.clicked'
)

select * from base
