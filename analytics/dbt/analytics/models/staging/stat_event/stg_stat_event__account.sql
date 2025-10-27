with events as (
  select
    e.*,
    nullif(e.mission_id, '') as mission_id_clean,
    nullif(e.mission_client_id, '') as mission_client_id_clean,
    nullif(e.to_publisher_id, '') as to_partner_old_id,
    nullif(e.from_publisher_id, '') as from_partner_old_id,
    nullif(e.source_id, '') as source_id_clean,
    nullif(e.click_id, '') as click_old_id
  from {{ ref('stg_stat_event') }} as e
  where e.type = 'account'
),

partners as (
  select id, old_id from {{ ref('dim_partner') }}
),

campaigns as (
  select id, old_id from {{ ref('dim_campaign') }}
),

widgets as (
  select id, old_id from {{ ref('dim_widget') }}
),

clicks as (
  select id, old_id from {{ source('public', 'Click') }}
),

mission_map as (
  select
    event_id,
    mission_id,
    resolved_mission_old_id
  from {{ ref('stg_stat_event__mission_map') }}
)

select
  e.id as event_id,
  e.created_at,
  e.host,
  e.tag,
  p_from.id as from_partner_id,
  p_to.id as to_partner_id,
  mm.mission_id,
  clk.id as click_id,
  e.click_old_id as old_view_id,
  mm.resolved_mission_old_id as mission_old_id,
  case
    when coalesce(e.source, 'publisher') in ('publisher', 'api') then 'api'
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
inner join partners as p_from on e.from_partner_old_id = p_from.old_id
inner join partners as p_to on e.to_partner_old_id = p_to.old_id
left join mission_map as mm on e.id = mm.event_id
left join partners as p_source on e.source = 'publisher' and e.source_id_clean = p_source.old_id
left join campaigns as c_source on e.source = 'campaign' and e.source_id_clean = c_source.old_id
left join widgets as w_source on e.source = 'widget' and e.source_id_clean = w_source.old_id
left join clicks as clk on e.click_old_id = clk.old_id
