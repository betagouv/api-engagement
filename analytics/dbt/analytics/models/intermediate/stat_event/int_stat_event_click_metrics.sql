{{ config(
  materialized = 'incremental',
  unique_key = ['mission_id', 'from_publisher_id', 'source', 'source_id'],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_stat_event_click_metrics_mission_id_idx" on {{ this }} (mission_id)',
    'create index if not exists "int_stat_event_click_metrics_from_publisher_id_idx" on {{ this }} (from_publisher_id)',
    'create index if not exists "int_stat_event_click_metrics_first_click_at_idx" on {{ this }} (first_click_at)'
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
  select distinct e.mission_id
  from {{ ref('int_stat_event_global') }} as e
  where
    e.mission_id is not null
    and e.type in ('click', 'apply')
    and coalesce(e.updated_at, e.created_at)
    >= (select lr.last_updated_at from last_run as lr)
),

clicks as (
  select
    e.stat_event_id,
    e.mission_id,
    e.from_publisher_id,
    e.source,
    e.source_id,
    e.created_at,
    e.updated_at
  from {{ ref('int_stat_event_global') }} as e
  where
    e.type = 'click'
    and e.mission_id is not null
    {% if is_incremental() %}
      and e.mission_id in (
        select am.mission_id from affected_missions as am
      )
    {% endif %}
),

applies as (
  select
    e.stat_event_id,
    e.mission_id,
    e.from_publisher_id,
    e.source,
    e.source_id,
    e.click_id,
    e.created_at,
    e.updated_at
  from {{ ref('int_stat_event_global') }} as e
  where
    e.type = 'apply'
    and e.mission_id is not null
    {% if is_incremental() %}
      and e.mission_id in (
        select am.mission_id from affected_missions as am
      )
    {% endif %}
),

apply_metrics as (
  select
    a.mission_id,
    a.from_publisher_id,
    a.source,
    a.source_id,
    min(a.created_at) as first_apply_at,
    count(*) as apply_count,
    max(coalesce(a.updated_at, a.created_at)) as apply_updated_at
  from applies as a
  group by 1, 2, 3, 4
),

apply_by_click as (
  select
    a.click_id as click_stat_event_id,
    count(*) as apply_linked_count,
    max(coalesce(a.updated_at, a.created_at)) as apply_linked_updated_at
  from applies as a
  where a.click_id <> ''
  group by 1
),

click_metrics as (
  select
    c.mission_id,
    c.from_publisher_id,
    c.source,
    c.source_id,
    min(c.created_at) as first_click_at,
    count(*) as click_count,
    count(*) filter (where coalesce(abc.apply_linked_count, 0) >= 1)
      as click_with_apply_count,
    count(*) filter (where coalesce(abc.apply_linked_count, 0) >= 2)
      as click_with_multi_apply_count,
    max(
      greatest(
        coalesce(c.updated_at, c.created_at),
        coalesce(abc.apply_linked_updated_at, '1900-01-01'::timestamp)
      )
    ) as click_updated_at
  from clicks as c
  left join apply_by_click as abc
    on c.stat_event_id = abc.click_stat_event_id
  group by 1, 2, 3, 4
)

select
  cm.mission_id,
  cm.from_publisher_id,
  cm.source,
  cm.source_id,
  cm.first_click_at,
  am.first_apply_at,
  cm.click_count,
  cm.click_with_apply_count,
  cm.click_with_multi_apply_count,
  coalesce(am.apply_count, 0) as apply_count,
  greatest(
    coalesce(cm.click_updated_at, '1900-01-01'::timestamp),
    coalesce(am.apply_updated_at, '1900-01-01'::timestamp)
  ) as updated_at
from click_metrics as cm
left join apply_metrics as am
  on
    cm.mission_id = am.mission_id
    and cm.from_publisher_id is not distinct from am.from_publisher_id
    and cm.source = am.source
    and cm.source_id is not distinct from am.source_id
