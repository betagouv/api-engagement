{{ config(
    materialized = 'incremental',
    unique_key = 'stat_event_id',
    on_schema_change = 'sync_all_columns',
    post_hook = [
      'create unique index if not exists "global_events_stat_event_id_idx" on {{ this }} (stat_event_id)',
      'create index if not exists "global_events_created_at_idx" on {{ this }} (created_at)',
      'create index if not exists "global_events_type_idx" on {{ this }} (type)',
      'create index if not exists "global_events_source_idx" on {{ this }} (source)',
      'create index if not exists "global_events_from_publisher_idx" on {{ this }} (from_publisher_id)',
      'create index if not exists "global_events_to_publisher_idx" on {{ this }} (to_publisher_id)',
      'create index if not exists "global_events_mission_idx" on {{ this }} (mission_id)',
      'create index if not exists "global_events_to_publisher_created_at_idx" on {{ this }} (to_publisher_id, created_at)',
      'create index if not exists "global_events_from_publisher_created_at_idx" on {{ this }} (from_publisher_id, created_at)'
    ]
) }}

with base as (
  select
    e.stat_event_id,
    e.created_at,
    e.updated_at,
    e.type,
    e.source,
    e.source_id,
    e.from_publisher_id,
    e.to_publisher_id,
    e.mission_id,
    e.click_id
  from {{ ref('int_stat_event_global') }} as e
  {% if is_incremental() %}
    where
      e.updated_at
      > (
        select coalesce(max(ge.updated_at), '1900-01-01'::timestamp)
        from {{ this }} as ge
      )
  {% endif %}
),

with_names as (
  select
    b.stat_event_id,
    b.created_at,
    b.updated_at,
    b.type,
    b.source,
    b.source_id,
    b.from_publisher_id,
    b.to_publisher_id,
    b.mission_id,
    b.click_id
  from base as b
)

select *
from with_names
