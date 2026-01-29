{{ config(
  materialized = 'incremental',
  unique_key = [
    'year',
    'month',
    'is_all_department',
    'department',
    'publisher_id',
    'publisher_category',
    'mission_domain'
  ],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns'
) }}

with last_run as (
  {% if is_incremental() %}
    select coalesce(max(month_start), '1900-01-01'::date) as last_month_start
    from {{ this }}
  {% else %}
    select '1900-01-01'::date as last_month_start
  {% endif %}
),

base as (
  select
    extract(year from active_date)::int as year,
    extract(month from active_date)::int as month,
    date_trunc('month', active_date)::date as month_start,
    department,
    publisher_id,
    publisher_category,
    mission_domain,
    mission_id,
    updated_at
  from {{ ref('int_mission_active_department_daily') }}
  {% if is_incremental() %}
    where active_date >= (select lr.last_month_start from last_run as lr)
  {% endif %}
),

dept as (
  select
    year,
    month,
    month_start,
    false as is_all_department,
    department,
    publisher_id,
    publisher_category,
    mission_domain,
    count(distinct mission_id) as mission_count,
    max(updated_at) as max_updated_at
  from base
  group by
    year,
    month,
    month_start,
    department,
    publisher_id,
    publisher_category,
    mission_domain
),

dept_all_category as (
  select
    year,
    month,
    month_start,
    false as is_all_department,
    department,
    null as publisher_id,
    'all' as publisher_category,
    mission_domain,
    count(distinct mission_id) as mission_count,
    max(updated_at) as max_updated_at
  from base
  group by
    year,
    month,
    month_start,
    department,
    mission_domain
),

all_dept as (
  select
    year,
    month,
    month_start,
    true as is_all_department,
    null as department,
    publisher_id,
    publisher_category,
    mission_domain,
    count(distinct mission_id) as mission_count,
    max(updated_at) as max_updated_at
  from base
  group by
    year,
    month,
    month_start,
    publisher_id,
    publisher_category,
    mission_domain
),

all_dept_all_category as (
  select
    year,
    month,
    month_start,
    true as is_all_department,
    null as department,
    null as publisher_id,
    'all' as publisher_category,
    mission_domain,
    count(distinct mission_id) as mission_count,
    max(updated_at) as max_updated_at
  from base
  group by
    year,
    month,
    month_start,
    mission_domain
)

select * from dept
union all
select * from dept_all_category
union all
select * from all_dept
union all
select * from all_dept_all_category
