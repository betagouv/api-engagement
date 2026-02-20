{{ config(
  materialized = 'incremental',
  unique_key = ['mission_id', 'from_publisher_id', 'source', 'source_id'],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_mission_first_events_mission_id_idx" on {{ this }} (mission_id)',
    'create index if not exists "int_mission_first_events_from_publisher_id_idx" on {{ this }} (from_publisher_id)'
  ]
) }}

with last_run as (
  {% if is_incremental() %}
    select coalesce(max(updated_at), '1900-01-01'::timestamp) as last_updated_at
    from {{ this }}
  {% else %}
    select '1900-01-01'::timestamp as last_updated_at
  {% endif %}
),

affected_missions as (
  select distinct mar.mission_id
  from {{ ref('int_mission_active_range') }} as mar
  where
    mar.updated_at
    >= (select lr.last_updated_at from last_run as lr)

  union

  select distinct ge.mission_id
  from {{ ref('int_stat_event_global') }} as ge
  where
    ge.mission_id is not null
    and coalesce(ge.updated_at, ge.created_at)
    >= (select lr.last_updated_at from last_run as lr)
),

missions as (
  select
    mar.mission_id,
    mar.mission_domain,
    mar.updated_at as mission_updated_at,
    mar.created_at as mission_created_at,
    mar.tags as mission_tags,
    mar.audience as mission_audience,
    mar.activity as mission_activity,
    mar.description_length,
    mar.duration_days as mission_duration_days,
    mar.close_to_transport,
    mar.time_to_import_secs,
    mar.publisher_id,
    mar.publisher_category
  from {{ ref('int_mission_active_range') }} as mar
  {% if is_incremental() %}
    where mar.mission_id in (
      select am.mission_id from affected_missions as am
    )
  {% endif %}
),

events as (
  select
    mission_id,
    from_publisher_id,
    source,
    source_id,
    min(created_at) filter (where type = 'click') as first_click_at,
    min(created_at) filter (where type = 'apply') as first_apply_at,
    count(*) filter (where type = 'click') as click_count,
    count(*) filter (where type = 'apply') as apply_count,
    max(updated_at) as events_updated_at
  from {{ ref('int_stat_event_global') }}
  where
    mission_id is not null
    and type in ('click', 'apply')
    {% if is_incremental() %}
      and mission_id in (
        select am.mission_id from affected_missions as am
      )
    {% endif %}
  group by 1, 2, 3, 4
),

base as (
  select
    m.mission_id,
    m.publisher_id,
    m.publisher_category,
    m.mission_domain,
    m.description_length,
    m.close_to_transport,
    m.time_to_import_secs,
    m.mission_created_at,
    m.mission_activity,
    m.mission_audience,
    m.mission_tags,
    m.mission_duration_days,
    e.from_publisher_id,
    e.source,
    e.source_id,
    e.first_click_at,
    e.first_apply_at,
    e.click_count,
    e.apply_count,
    greatest(
      coalesce(m.mission_updated_at, '1900-01-01'::timestamp),
      coalesce(e.events_updated_at, '1900-01-01'::timestamp)
    ) as updated_at
  from missions as m
  inner join events as e
    on m.mission_id = e.mission_id
)

select
  mission_id,
  publisher_id,
  publisher_category,
  mission_domain,
  description_length,
  close_to_transport,
  time_to_import_secs,
  mission_created_at,
  mission_activity,
  mission_audience,
  mission_tags,
  mission_duration_days,
  from_publisher_id,
  source,
  source_id,
  first_click_at,
  first_apply_at,
  click_count,
  apply_count,
  updated_at,
  case
    when mission_created_at is null or first_click_at is null then null
    else greatest(
      extract(epoch from (first_click_at - mission_created_at))::bigint,
      0
    )
  end as time_to_click_secs,
  case
    when mission_created_at is null or first_apply_at is null then null
    else greatest(
      extract(epoch from (first_apply_at - mission_created_at))::bigint,
      0
    )
  end as time_to_apply_secs,
  case
    when click_count = 0 then null
    else apply_count::numeric / click_count
  end as conversion_rate
from base
