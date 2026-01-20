with source as (
  select
    id as stat_event_id,
    created_at::timestamp as created_at,
    updated_at::timestamp as updated_at,
    type,
    coalesce(nullif(source::text, ''), 'api') as raw_source,
    nullif(source_id, '') as source_id,
    nullif(from_publisher_id, '') as from_publisher_id,
    nullif(to_publisher_id, '') as to_publisher_id,
    nullif(mission_id, '') as mission_id,
    coalesce(click_id, '') as click_id
  from {{ ref('stg_stat_event') }}
  where is_bot is not true
)

select
  stat_event_id,
  created_at,
  updated_at,
  type,
  source_id,
  from_publisher_id,
  to_publisher_id,
  mission_id,
  click_id,
  case
    when raw_source in ('publisher', 'api', 'jstag') then 'api'
    else raw_source
  end as source
from source
