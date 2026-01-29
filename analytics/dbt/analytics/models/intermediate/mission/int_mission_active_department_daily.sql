{{ config(
  materialized = 'incremental',
  unique_key = ['active_date', 'mission_id', 'department'],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_mission_active_department_daily_active_date_idx" on {{ this }} (active_date)',
    'create index if not exists "int_mission_active_department_daily_mission_id_dix" on {{ this }} (mission_id)',
  ]
) }}

with last_run as (
  {% if is_incremental() %}
    select coalesce(max(active_date), '1900-01-01'::date) as last_active_date
    from {{ this }}
  {% else %}
    select '1900-01-01'::date as last_active_date
  {% endif %}
),

mission_departments as (
  select
    mission_id,
    department_code as department
  from (
    select
      mission_id,
      department_code,
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
    mad.active_date,
    mad.year,
    mad.month,
    mad.iso_year,
    mad.iso_week,
    md.department,
    mad.publisher_id,
    mad.publisher_category,
    mad.mission_domain,
    mad.mission_id,
    mad.updated_at
  from {{ ref('int_mission_active_daily') }} as mad
  left join mission_departments as md
    on mad.mission_id = md.mission_id
  {% if is_incremental() %}
    where mad.active_date >= (select lr.last_active_date from last_run as lr)
  {% endif %}
)

select
  active_date,
  year,
  month,
  iso_year,
  iso_week,
  department,
  publisher_id,
  publisher_category,
  mission_domain,
  mission_id,
  updated_at
from base
