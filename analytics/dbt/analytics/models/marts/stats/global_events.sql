{{ config(
    materialized = 'incremental',
    unique_key = 'stat_event_id',
    incremental_strategy = 'delete+insert',
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

with last_run as (
  {% if is_incremental() %}
    select coalesce(max(ge.updated_at), '1900-01-01'::timestamp) as last_updated_at
    from {{ this }} as ge
  {% else %}
    select '1900-01-01'::timestamp as last_updated_at
  {% endif %}
),

affected_mission_ids as (
  {% if is_incremental() %}
    select distinct m.id as mission_id
    from {{ ref('mission') }} as m
    cross join last_run
    where coalesce(m.updated_at, m.created_at) >= last_run.last_updated_at

    union

    select distinct ma.mission_id
    from {{ ref('mission_address') }} as ma
    cross join last_run
    where coalesce(ma.updated_at, ma.created_at) >= last_run.last_updated_at
  {% else %}
    select null::text as mission_id
    where false
  {% endif %}
),

affected_event_ids as (
  {% if is_incremental() %}
    select e.stat_event_id
    from {{ ref('int_stat_event_global') }} as e
    cross join last_run
    where coalesce(e.updated_at, e.created_at) >= last_run.last_updated_at

    union

    select e.stat_event_id
    from {{ ref('int_stat_event_global') }} as e
    inner join affected_mission_ids as am
      on e.mission_id = am.mission_id
  {% else %}
    select null::text as stat_event_id
    where false
  {% endif %}
),

mission_primary_address as (
  select
    mission_id,
    postal_code,
    department_name,
    updated_at
  from (
    select
      ma.mission_id,
      ma.postal_code,
      ma.department_name,
      ma.updated_at,
      row_number() over (
        partition by ma.mission_id
        order by ma.created_at asc nulls last, ma.updated_at desc nulls last, ma.id asc
      ) as rn
    from {{ ref('mission_address') }} as ma
  ) as ranked
  where rn = 1
),

base_events as (
  select
    e.stat_event_id,
    e.created_at,
    coalesce(e.updated_at, e.created_at) as event_updated_at,
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
      e.stat_event_id in (
        select aei.stat_event_id
        from affected_event_ids as aei
      )
  {% endif %}
),

enriched as (
  select
    e.stat_event_id,
    e.created_at,
    greatest(
      e.event_updated_at,
      coalesce(m.updated_at, e.event_updated_at),
      coalesce(mpa.updated_at, e.event_updated_at)
    ) as updated_at,
    e.type,
    e.source,
    e.source_id,
    e.from_publisher_id,
    e.to_publisher_id,
    e.mission_id,
    m.client_id as mission_client_id,
    m.title as mission_title,
    m.domain as mission_domain,
    m.organization_client_id as mission_organization_client_id,
    m.organization_id as mission_organization_id,
    m.organization_name as mission_organization_name,
    mpa.postal_code as mission_postal_code,
    mpa.department_name as mission_department_name,
    e.click_id
  from base_events as e
  left join {{ ref('mission') }} as m
    on e.mission_id = m.id
  left join mission_primary_address as mpa
    on e.mission_id = mpa.mission_id
)

select *
from enriched
