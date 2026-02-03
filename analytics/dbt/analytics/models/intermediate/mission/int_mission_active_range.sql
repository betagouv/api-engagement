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
    m.publisher_id,
    m.updated_at,
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
  publisher_id,
  publisher_category,
  updated_at
from base
