with events as (
  select
    e.id,
    e.created_at,
    e.updated_at,
    e.host,
    e.tag,
    e.custom_attributes,
    e.source,
    nullif(e.mission_id, '') as mission_id,
    nullif(e.to_publisher_id, '') as to_publisher_id_clean,
    nullif(e.from_publisher_id, '') as from_publisher_id_clean,
    nullif(e.source_id, '') as source_id_clean,
    nullif(e.click_id, '') as click_id_raw,
    nullif(e.status, '') as status_raw
  from {{ ref('stg_stat_event') }} as e
  where e.type = 'apply'
),

clicks as (
  select id as stat_event_id
  from {{ ref('stg_stat_event') }}
  where type = 'click'
)

select
  e.id as stat_event_id,
  e.created_at,
  e.updated_at,
  e.host,
  e.tag,
  e.mission_id,
  clk.stat_event_id as click_id,
  e.click_id_raw as view_id_raw,
  e.status_raw as status,
  e.custom_attributes,
  e.from_publisher_id_clean as from_publisher_id,
  e.to_publisher_id_clean as to_publisher_id,
  e.source_id_clean as source_id,
  case
    when coalesce(e.source, 'publisher') in ('publisher', 'api') then 'api'
    else e.source
  end as source,
  case when e.source = 'campaign' then e.source_id_clean end as campaign_id,
  case when e.source = 'widget' then e.source_id_clean end as widget_id
from events as e
left join clicks as clk on e.click_id_raw = clk.stat_event_id
