{{ config(
  materialized = 'incremental',
  unique_key = ['mission_id', 'department'],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_mission_active_department_range_mission_id_idx" on {{ this }} (mission_id)',
    'create index if not exists "int_mission_active_department_range_department_idx" on {{ this }} (department)'
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

mission_departments as (
  select
    mission_id,
    department_code as department,
    updated_at
  from (
    select
      mission_id,
      department_code,
      updated_at,
      created_at,
      id,
      row_number() over (
        partition by mission_id, department_code
        order by updated_at desc nulls last, created_at desc nulls last, id asc
      ) as rn
    from {{ ref('int_mission_address') }}
    where
      department_code is not null
      and department_code <> ''
  ) as ranked
  where rn = 1
),

base as (
  select
    mar.mission_id,
    mar.start_date,
    mar.end_date,
    md.department,
    mar.publisher_id,
    mar.publisher_category,
    mar.mission_domain,
    greatest(
      mar.updated_at,
      coalesce(md.updated_at, '1900-01-01'::timestamp)
    ) as updated_at
  from {{ ref('int_mission_active_range') }} as mar
  left join mission_departments as md
    on mar.mission_id = md.mission_id
  {% if is_incremental() %}
    where greatest(
      mar.updated_at,
      coalesce(md.updated_at, '1900-01-01'::timestamp)
    ) >= (select lr.last_updated_at from last_run as lr)
  {% endif %}
)

select
  mission_id,
  start_date,
  end_date,
  department,
  publisher_id,
  publisher_category,
  mission_domain,
  updated_at
from base
