{{ config(
  materialized = 'incremental',
  unique_key = ['mission_id', 'department'],
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

base as (
  select
    mdr.start_date,
    mdr.end_date,
    mdr.department,
    mdr.publisher_category,
    m.organization_id,
    mdr.mission_id,
    mdr.updated_at
  from {{ ref('int_mission_active_department_range') }} as mdr
  left join {{ ref('int_mission') }} as m
    on mdr.mission_id = m.id
  where
    m.organization_id is not null
    and mdr.start_date is not null
    {% if is_incremental() %}
      and mdr.updated_at >= (select lr.last_updated_at from last_run as lr)
    {% endif %}
)

select
  start_date,
  end_date,
  department,
  publisher_category,
  organization_id,
  mission_id,
  updated_at
from base
