with events as (
  select
    e.*,
    nullif(e.mission_id, '') as mission_id_raw,
    nullif(e.mission_client_id, '') as mission_client_id_raw,
    nullif(e.to_publisher_id, '') as to_publisher_id_raw,
    nullif(e.from_publisher_id, '') as from_publisher_id_raw,
    nullif(e.source_id, '') as source_id_raw
  from {{ ref('stg_stat_event') }} as e
  where e.type = 'print'
),

publishers as (
  select
    id,
    publisher_id_raw
  from {{ ref('dim_publisher') }}
),

campaigns as (
  select
    id,
    campaign_id_raw
  from {{ ref('dim_campaign') }}
),

widgets as (
  select
    id,
    widget_id_raw
  from {{ ref('dim_widget') }}
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
  e.host,
  p_from.id as from_publisher_id,
  p_to.id as to_publisher_id,
  mm.mission_id,
  mm.resolved_mission_id_raw as mission_id_raw,
  case
    when
      coalesce(e.source, 'publisher') in ('publisher', 'api', 'jstag')
      then 'api'
    else e.source
  end as source,
  case
    when e.source = 'campaign' then c_source.id
    when e.source = 'widget' then w_source.id
    when e.source = 'publisher' then p_source.id
  end as source_id,
  case when e.source = 'campaign' then c_source.id end as campaign_id,
  case when e.source = 'widget' then w_source.id end as widget_id
from events as e
left join
  publishers as p_from
  on e.from_publisher_id_raw = p_from.publisher_id_raw
left join publishers as p_to on e.to_publisher_id_raw = p_to.publisher_id_raw
left join mission_map as mm on e.id = mm.stat_event_id
left join
  publishers as p_source
  on e.source = 'publisher' and e.source_id_raw = p_source.publisher_id_raw
left join
  campaigns as c_source
  on e.source = 'campaign' and e.source_id_raw = c_source.campaign_id_raw
left join
  widgets as w_source
  on e.source = 'widget' and e.source_id_raw = w_source.widget_id_raw
