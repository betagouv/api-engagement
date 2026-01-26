{{ config(
  materialized = 'incremental',
  unique_key = ['year', 'month', 'is_all_department', 'department', 'publisher_category', 'publisher_id'],
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
    publisher_category,
    publisher_id,
    mission_id
  from {{ ref('int_mission_active_daily') }}
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
    publisher_category,
    publisher_id,
    count(distinct mission_id) as mission_count
  from base
  where department is not null
  group by
    year, month, month_start, department, publisher_category, publisher_id
),

dept_all_category as (
  select
    year,
    month,
    month_start,
    false as is_all_department,
    department,
    'all' as publisher_category,
    null as publisher_id,
    count(distinct mission_id) as mission_count
  from base
  where department is not null
  group by year, month, month_start, department
),

all_dept as (
  select
    year,
    month,
    month_start,
    true as is_all_department,
    null as department,
    publisher_category,
    publisher_id,
    count(distinct mission_id) as mission_count
  from base
  group by year, month, month_start, publisher_category, publisher_id
),

all_dept_all_category as (
  select
    year,
    month,
    month_start,
    true as is_all_department,
    null as department,
    'all' as publisher_category,
    null as publisher_id,
    count(distinct mission_id) as mission_count
  from base
  group by year, month, month_start
)

select * from dept
union all
select * from dept_all_category
union all
select * from all_dept
union all
select * from all_dept_all_category
