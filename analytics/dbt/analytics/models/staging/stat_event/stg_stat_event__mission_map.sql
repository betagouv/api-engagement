{{ config(materialized='view') }}

with events as (
  select
    e.id as stat_event_id,
    e.mission_id as mission_id_raw_source,
    nullif(e.mission_id, '') as mission_id_raw,
    nullif(e.mission_client_id, '') as mission_client_id_raw,
    nullif(e.to_publisher_id, '') as to_publisher_id
  from {{ ref('stg_stat_event') }} as e
),

missions as (
  select
    id,
    mission_id_raw,
    client_id,
    publisher_id
  from {{ ref('dim_mission') }}
),

mission_exact as (
  select
    e.stat_event_id,
    m.id,
    m.mission_id_raw,
    0 as priority
  from events as e
  inner join missions as m
    on e.mission_id_raw = m.mission_id_raw
),

mission_client_partner as (
  select
    e.stat_event_id,
    m.id,
    m.mission_id_raw,
    1 as priority
  from events as e
  inner join missions as m
    on
      e.mission_id_raw is null
      and e.mission_client_id_raw is not null
      and e.mission_client_id_raw = m.client_id
      and e.to_publisher_id = m.publisher_id
),

mission_lookup as (
  select
    e.stat_event_id,
    m.id,
    m.mission_id_raw,
    2 as priority
  from events as e
  inner join missions as m
    on
      e.mission_id_raw is null
      and m.mission_id_raw is not null
      and m.mission_id_raw = nullif(e.mission_id_raw_source, '')
),

mission_match as (
  select
    stat_event_id,
    id as mission_id,
    mission_id_raw
  from (
    select
      stat_event_id,
      id,
      mission_id_raw,
      row_number() over (
        partition by stat_event_id
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
  e.stat_event_id,
  e.mission_id_raw as mission_id_raw_input,
  mission_match.mission_id,
  mission_match.mission_id_raw,
  coalesce(e.mission_id_raw, mission_match.mission_id_raw)
    as resolved_mission_id_raw
from events as e
left join mission_match on e.stat_event_id = mission_match.stat_event_id
