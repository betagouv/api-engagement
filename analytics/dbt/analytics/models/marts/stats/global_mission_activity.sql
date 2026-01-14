{{ config(
    materialized = 'incremental',
    unique_key = ['mission_id', 'type', 'from_publisher_id', 'to_publisher_id'],
    on_schema_change = 'sync_all_columns',
    post_hook = [
      'create unique index if not exists "global_mission_activity_unique_idx" on {{ this }} (mission_id, type, from_publisher_id, to_publisher_id)',
      'create index if not exists "global_mission_activity_first_created_idx" on {{ this }} (first_created_at)',
      'create index if not exists "global_mission_activity_last_created_idx" on {{ this }} (last_created_at)',
      'create index if not exists "global_mission_activity_from_publisher_idx" on {{ this }} (from_publisher_id)',
      'create index if not exists "global_mission_activity_to_publisher_idx" on {{ this }} (to_publisher_id)'
    ]
) }}

{% if not is_incremental() %}
with all_events as (
  select
    stat_event_id,
    created_at,
    type,
    from_publisher_id,
    to_publisher_id,
    mission_id
  from {{ ref('global_events') }}
  where mission_id is not null
),
aggregated as (
  select
    mission_id,
    type,
    from_publisher_id,
    to_publisher_id,
    min(created_at) as first_created_at,
    max(created_at) as last_created_at
  from all_events
  group by mission_id, type, from_publisher_id, to_publisher_id
)

select *
from aggregated

{% else %}
  with existing as (
    select *
    from {{ this }}
  ),

  max_last_created_at as (
    select
      coalesce(max(last_created_at), '1900-01-01'::timestamp)
        as max_last_created_at
    from existing
  ),

  new_events as (
    select
      stat_event_id,
      created_at,
      type,
      from_publisher_id,
      to_publisher_id,
      mission_id
    from {{ ref('global_events') }}
    where
      mission_id is not null
      and created_at > (
        select m.max_last_created_at
        from max_last_created_at as m
      )
  ),

  touched_keys as (
    select
      mission_id,
      type,
      from_publisher_id,
      to_publisher_id,
      min(created_at) as first_created_at,
      max(created_at) as last_created_at
    from new_events
    group by mission_id, type, from_publisher_id, to_publisher_id
  ),

  updated as (
    select
      coalesce(e.mission_id, t.mission_id) as mission_id,
      coalesce(e.type, t.type) as type,
      coalesce(e.from_publisher_id, t.from_publisher_id) as from_publisher_id,
      coalesce(e.to_publisher_id, t.to_publisher_id) as to_publisher_id,
      case
        when e.first_created_at is null then t.first_created_at
        when t.first_created_at is null then e.first_created_at
        else least(e.first_created_at, t.first_created_at)
      end as first_created_at,
      case
        when e.last_created_at is null then t.last_created_at
        when t.last_created_at is null then e.last_created_at
        else greatest(e.last_created_at, t.last_created_at)
      end as last_created_at
    from touched_keys as t
    left join existing as e
      on
        t.mission_id = e.mission_id
        and t.type = e.type
        and t.from_publisher_id = e.from_publisher_id
        and t.to_publisher_id = e.to_publisher_id
  )

  select *
  from updated

{% endif %}
