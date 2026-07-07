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
    referrer,
    referring_domain,
    is_internal_user,
    pathname,
    properties ->> 'page_name' as page_name
  from {{ ref('stg_tracking__event') }}
  where event_name = 'page.viewed'
)

select * from base
