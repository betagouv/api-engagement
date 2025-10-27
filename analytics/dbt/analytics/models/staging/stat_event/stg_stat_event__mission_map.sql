{{ config(materialized='view') }}

with events as (
  select
    e.id as event_id,
    nullif(e.mission_id, '')        as mission_id_clean,
    e.mission_id                    as mission_id_raw,
    nullif(e.mission_client_id, '') as mission_client_id_clean,
    nullif(e.to_publisher_id, '')   as to_partner_old_id
  from {{ ref('stg_stat_event') }} as e
),

missions as (
  select
    id,
    old_id,
    client_id,
    partner_old_id
  from {{ ref('dim_mission') }}
),

mission_exact as (
  select
    e.event_id,
    m.id,
    m.old_id,
    0 as priority
  from events as e
  inner join missions as m
    on e.mission_id_clean = m.old_id
),

mission_client_partner as (
  select
    e.event_id,
    m.id,
    m.old_id,
    1 as priority
  from events as e
  inner join missions as m
    on e.mission_id_clean is null
   and e.mission_client_id_clean is not null
   and e.mission_client_id_clean = m.client_id
   and e.to_partner_old_id = m.partner_old_id
),

mission_lookup as (
  select
    e.event_id,
    m.id,
    m.old_id,
    2 as priority
  from events as e
  inner join missions as m
    on e.mission_id_clean is null
   and m.old_id is not null
   and m.old_id = nullif(e.mission_id_raw, '')
),

mission_match as (
  select
    event_id,
    id as mission_id,
    old_id as mission_old_id
  from (
    select
      event_id,
      id,
      old_id,
      row_number() over (
        partition by event_id
        order by priority, id
      ) as rn
    from (
      select * from mission_exact
      union all
      select * from mission_client_partner
      union all
      select * from mission_lookup
    ) as all_candidates
  ) as ranked
  where rn = 1
)

select
  e.event_id,
  e.mission_id_clean,
  mission_match.mission_id,
  mission_match.mission_old_id,
  coalesce(e.mission_id_clean, mission_match.mission_old_id) as resolved_mission_old_id
from events as e
left join mission_match on mission_match.event_id = e.event_id
