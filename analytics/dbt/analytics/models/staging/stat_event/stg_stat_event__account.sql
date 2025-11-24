with events as (
  select
    e.*,
    nullif(e.mission_id, '') as mission_id_raw,
    nullif(e.mission_client_id, '') as mission_client_id_raw,
    nullif(e.to_publisher_id, '') as to_publisher_id_clean,
    nullif(e.from_publisher_id, '') as from_publisher_id_clean,
    nullif(e.source_id, '') as source_id_clean,
    nullif(e.click_id, '') as click_id_raw
  from {{ ref('stg_stat_event') }} as e
  where e.type = 'account'
),

publishers as (
  select
    id,
    name
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

clicks as (
  select id as stat_event_id
  from {{ ref('stg_stat_event') }}
  where type = 'click'
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
  e.tag,
  mm.mission_id,
  clk.stat_event_id as click_id,
  e.click_id_raw as view_id_raw,
  mm.resolved_mission_id_raw,
  coalesce(p_from.id, e.from_publisher_id_clean) as from_publisher_id,
  coalesce(p_to.id, e.to_publisher_id_clean) as to_publisher_id,
  case
    when coalesce(e.source, 'publisher') in ('publisher', 'api') then 'api'
    else e.source
  end as source,
  case
    when e.source = 'campaign' then c_source.id
    when e.source = 'widget' then w_source.id
    when e.source = 'publisher' then coalesce(p_source.id, e.source_id_clean)
  end as source_id,
  case when e.source = 'campaign' then c_source.id end as campaign_id,
  case when e.source = 'widget' then w_source.id end as widget_id
from events as e
left join
  publishers as p_from
  on e.from_publisher_id_clean = p_from.id
left join publishers as p_to on e.to_publisher_id_clean = p_to.id
left join mission_map as mm on e.id = mm.stat_event_id
left join
  publishers as p_source
  on e.source = 'publisher' and e.source_id_clean = p_source.id
left join
  campaigns as c_source
  on e.source = 'campaign' and e.source_id_clean = c_source.campaign_id_raw
left join
  widgets as w_source
  on e.source = 'widget' and e.source_id_clean = w_source.widget_id_raw
left join clicks as clk on e.click_id_raw = clk.stat_event_id
