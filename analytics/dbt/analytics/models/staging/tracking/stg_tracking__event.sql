with base as (
  select
    uuid as event_uuid,
    event as event_name,
    timestamp::timestamp as event_at,
    ingested_at::timestamp as ingested_at,
    distinct_id,
    person_id,
    session_id as posthog_session_id,
    current_url,
    pathname,
    properties,
    (properties ->> '$screen_width')::int as screen_width,
    (properties ->> '$screen_height')::int as screen_height,
    properties ->> 'quiz_attempt_id' as quiz_attempt_id,
    properties ->> 'quiz_session_id' as quiz_session_id,
    properties ->> 'prompt_version' as prompt_version,
    properties ->> 'algo_version' as algo_version,
    properties ->> '$device_type' as device_type,
    properties ->> '$geoip_city_name' as geo_city,
    properties ->> '$geoip_subdivision_1_name' as geo_region,
    properties ->> '$geoip_country_code' as geo_country_code,
    properties ->> '$referrer' as referrer,
    properties ->> '$referring_domain' as referring_domain,
    properties ->> 'utm_source' as utm_source,
    properties ->> 'utm_campaign' as utm_campaign,
    properties ->> 'utm_medium' as utm_medium,
    properties ->> 'mtm_campaign' as mtm_campaign,
    coalesce((properties ->> 'internal_user')::boolean, false)
      as is_internal_user
  from {{ source('analytics_raw', 'tracking_event') }}
  where event not like '$%'
)

select * from base
