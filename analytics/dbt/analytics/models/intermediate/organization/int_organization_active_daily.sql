{{ config(
  materialized = 'incremental',
  unique_key = ['active_date', 'organization_id'],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns'
) }}

with last_run as (
  {% if is_incremental() %}
    select coalesce(max(active_date), '1900-01-01'::date) as last_active_date
    from {{ this }}
  {% else %}
    select '1900-01-01'::date as last_active_date
  {% endif %}
),

base as (
  select
    mad.active_date,
    mad.department,
    mad.publisher_category,
    m.organization_id,
    mad.updated_at
  from {{ ref('int_mission_active_daily') }} as mad
  left join {{ ref('int_mission') }} as m
    on mad.mission_id = m.id
  where
    m.organization_id is not null
    {% if is_incremental() %}
      and mad.active_date >= (select lr.last_active_date from last_run as lr)
    {% endif %}
)

select
  active_date,
  extract(year from active_date)::int as year,
  extract(month from active_date)::int as month,
  extract(isoyear from active_date)::int as iso_year,
  extract(week from active_date)::int as iso_week,
  department,
  publisher_category,
  organization_id,
  updated_at
from base
