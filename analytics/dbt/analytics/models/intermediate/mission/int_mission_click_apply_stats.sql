{{ config(
  materialized = 'incremental',
  unique_key = ['mission_id', 'from_publisher_id', 'source', 'source_id'],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns'
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
  select distinct a.mission_id
  from {{ ref('apply') }} as a
  where
    a.mission_id is not null
    and coalesce(a.updated_at, a.created_at)
    >= (select lr.last_updated_at from last_run as lr)
),

apply_events as (
  select
    a.stat_event_id,
    a.created_at,
    a.updated_at,
    a.mission_id,
    a.from_publisher_id,
    a.source,
    a.source_id,
    a.click_id
  from {{ ref('apply') }} as a
  inner join {{ ref('stg_stat_event') }} as se
    on a.stat_event_id = se.id
  where
    coalesce(se.is_bot, false) = false
    and a.mission_id is not null
    and a.click_id is not null
    {% if is_incremental() %}
      and a.mission_id in (select am.mission_id from affected_missions as am)
    {% endif %}
),

apply_per_click as (
  select
    mission_id,
    from_publisher_id,
    source,
    source_id,
    click_id,
    count(*) as apply_count,
    max(coalesce(updated_at, created_at)) as updated_at
  from apply_events
  group by mission_id, from_publisher_id, source, source_id, click_id
),

aggregated as (
  select
    mission_id,
    from_publisher_id,
    source,
    source_id,
    count(*) as click_with_apply_count,
    count(*) filter (where apply_count >= 2) as click_with_multi_apply_count,
    max(updated_at) as updated_at
  from apply_per_click
  group by mission_id, from_publisher_id, source, source_id
)

select
  mission_id,
  from_publisher_id,
  source,
  source_id,
  click_with_apply_count,
  click_with_multi_apply_count,
  updated_at
from aggregated
