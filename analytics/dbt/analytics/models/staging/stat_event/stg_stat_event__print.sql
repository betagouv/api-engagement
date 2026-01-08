with events as (
  select
    e.id,
    e.created_at,
    e.updated_at,
    e.host,
    e.source,
    nullif(e.mission_id, '') as mission_id,
    nullif(e.to_publisher_id, '') as to_publisher_id_clean,
    nullif(e.from_publisher_id, '') as from_publisher_id_clean,
    nullif(e.source_id, '') as source_id_clean
  from {{ ref('stg_stat_event') }} as e
  where e.type = 'print'
)

select
  e.id as stat_event_id,
  e.created_at,
  e.updated_at,
  e.host,
  e.mission_id,
  e.from_publisher_id_clean as from_publisher_id,
  e.to_publisher_id_clean as to_publisher_id,
  e.source_id_clean as source_id,
  case
    when
      coalesce(e.source, 'publisher') in ('publisher', 'api', 'jstag')
      then 'api'
    else e.source
  end as source,
  case when e.source = 'campaign' then e.source_id_clean end as campaign_id,
  case when e.source = 'widget' then e.source_id_clean end as widget_id
from events as e
