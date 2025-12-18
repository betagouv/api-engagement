with events as (
  select
    e.*,
    nullif(e.mission_id, '') as mission_id_raw,
    nullif(e.mission_client_id, '') as mission_client_id_raw,
    nullif(e.to_publisher_id, '') as to_publisher_id_clean,
    nullif(e.from_publisher_id, '') as from_publisher_id_clean,
    nullif(e.source_id, '') as source_id_clean
  from {{ ref('stg_stat_event') }} as e
  where e.type = 'click'
),

mission_map as (
  select
    stat_event_id,
    mission_id,
    mission_id_raw,
    resolved_mission_id_raw
  from {{ ref('stg_stat_event__mission_map') }}
)

select
  e.id as stat_event_id,
  e.created_at,
  e.updated_at,
  e.tag,
  mm.mission_id,
  e.is_bot,
  e.is_human,
  e.referer as url_origin,
  e.click_id,
  mm.resolved_mission_id_raw as mission_id_raw,
  e.from_publisher_id_clean as from_publisher_id,
  e.to_publisher_id_clean as to_publisher_id,
  e.source_id_clean as source_id,
  coalesce(e.tags, array[]::text []) as tags,
  case
    when coalesce(e.source, 'publisher') in ('publisher', 'api') then 'api'
    else e.source
  end as source,
  case when e.source = 'campaign' then e.source_id_clean end as campaign_id,
  case when e.source = 'widget' then e.source_id_clean end as widget_id
from events as e
left join mission_map as mm on e.id = mm.stat_event_id
