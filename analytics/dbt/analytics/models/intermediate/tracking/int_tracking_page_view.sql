with page_views as (
  select
    event_uuid,
    event_at as viewed_at,
    event_at::date as session_date,
    distinct_id,
    page_name,
    pathname,
    device_type,
    referrer,
    referring_domain,
    utm_source,
    utm_campaign
  from {{ ref('stg_tracking__page_viewed') }}
)

select
  event_uuid,
  viewed_at,
  session_date,
  distinct_id,
  page_name,
  pathname,
  device_type,
  referrer,
  referring_domain,
  utm_source,
  utm_campaign
from page_views
where {{ exclude_internal_distinct_ids('distinct_id') }}
