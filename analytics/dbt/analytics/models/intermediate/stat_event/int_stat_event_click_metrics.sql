{{ config(
  materialized = 'incremental',
  unique_key = 'click_stat_event_id',
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_stat_event_click_metrics_mission_id_idx" on {{ this }} (mission_id)',
    'create index if not exists "int_stat_event_click_metrics_from_publisher_id_idx" on {{ this }} (from_publisher_id)',
    'create index if not exists "int_stat_event_click_metrics_click_created_at_idx" on {{ this }} (click_created_at)',
    'create index if not exists "int_stat_event_click_metrics_click_stat_event_id_idx" on {{ this }} (click_stat_event_id)'
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

affected_clicks as (
  select distinct e.stat_event_id as click_stat_event_id
  from {{ ref('int_stat_event_global') }} as e
  where
    e.type = 'click'
    and e.mission_id is not null
    and coalesce(e.updated_at, e.created_at)
    >= (select lr.last_updated_at from last_run as lr)

  union

  select distinct a.click_id as click_stat_event_id
  from {{ ref('int_stat_event_global') }} as a
  where
    a.type = 'apply'
    and a.click_id <> ''
    and coalesce(a.updated_at, a.created_at)
    >= (select lr.last_updated_at from last_run as lr)
),

clicks as (
  select
    e.stat_event_id as click_stat_event_id,
    e.mission_id,
    e.from_publisher_id,
    e.source,
    e.source_id,
    e.created_at as click_created_at,
    e.updated_at as click_updated_at
  from {{ ref('int_stat_event_global') }} as e
  where
    e.type = 'click'
    and e.mission_id is not null
    {% if is_incremental() %}
      and e.stat_event_id in (
        select ac.click_stat_event_id from affected_clicks as ac
      )
    {% endif %}
),

applies_by_click as (
  select
    a.click_id as click_stat_event_id,
    min(a.created_at) as first_apply_at,
    count(*) as apply_count,
    max(coalesce(a.updated_at, a.created_at)) as apply_updated_at
  from {{ ref('int_stat_event_global') }} as a
  where
    a.type = 'apply'
    and a.click_id <> ''
    {% if is_incremental() %}
      and a.click_id in (
        select ac.click_stat_event_id from affected_clicks as ac
      )
    {% endif %}
  group by 1
)

select
  c.click_stat_event_id,
  c.mission_id,
  c.from_publisher_id,
  c.source,
  c.source_id,
  c.click_created_at,
  abc.first_apply_at,
  coalesce(abc.apply_count, 0) as apply_count,
  (coalesce(abc.apply_count, 0) >= 1) as has_apply,
  (coalesce(abc.apply_count, 0) >= 2) as has_multi_apply,
  greatest(
    coalesce(c.click_updated_at, c.click_created_at),
    coalesce(abc.apply_updated_at, '1900-01-01'::timestamp)
  ) as updated_at
from clicks as c
left join applies_by_click as abc
  on c.click_stat_event_id = abc.click_stat_event_id
