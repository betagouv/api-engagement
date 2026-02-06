{{ config(
  materialized = 'incremental',
  unique_key = 'mission_id',
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_mission_active_range_mission_id_idx" on {{ this }} (mission_id)',
    'create index if not exists "int_mission_active_range_start_date_idx" on {{ this }} (start_date)'
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

base as (
  select
    m.id as mission_id,
    date_trunc('day', m.created_at)::date as start_date,
    m.domain as mission_domain,
    m.start_at,
    m.end_at,
    m.tags,
    m.audience,
    m.activity,
    m.close_to_transport,
    m.publisher_id,
    m.updated_at,
    m.created_at,
    length(m.description) as description_length,
    case
      when m.start_at is null or m.end_at is null then null
      else greatest((m.end_at::date - m.start_at::date), 0)
    end as duration_days,
    greatest(extract(epoch from (m.created_at - m.posted_at))::bigint, 0)
      as time_to_import_secs,
    case
      when m.deleted_at is not null
        then date_trunc('day', m.deleted_at)::date
    end as end_date,
    case
      when m.type = 'volontariat_service_civique' then 'volontariat'
      else m.type
    end as publisher_category
  from {{ ref('int_mission') }} as m
  where
    m.created_at is not null
    and (
      m.deleted_at is null
      or date_trunc('day', m.created_at)::date
      <= date_trunc('day', m.deleted_at)::date
    )
    {% if is_incremental() %}
      and coalesce(m.updated_at, m.created_at)
      >= (select lr.last_updated_at from last_run as lr)
    {% endif %}
)

select
  mission_id,
  start_date,
  end_date,
  mission_domain,
  description_length,
  close_to_transport,
  time_to_import_secs,
  duration_days,
  tags,
  audience,
  activity,
  publisher_id,
  publisher_category,
  updated_at,
  created_at
from base
