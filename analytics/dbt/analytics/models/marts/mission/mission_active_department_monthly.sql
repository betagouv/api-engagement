{{ config(
  materialized = 'incremental',
  unique_key = [
    'year',
    'month',
    'is_all_department',
    'department',
    'publisher_key',
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
    mission_id,
    department,
    publisher_id,
    publisher_category,
    mission_domain,
    start_date,
    updated_at,
    coalesce(end_date, current_date) as end_date
  from {{ ref('int_mission_active_department_range') }}
  where start_date is not null
),

active_months as (
  select
    extract(year from s.month_start)::int as year,
    extract(month from s.month_start)::int as month,
    s.month_start,
    b.department,
    b.publisher_id,
    b.publisher_category,
    b.mission_id,
    b.updated_at,
    coalesce(b.mission_domain, 'unknown') as mission_domain
  from base as b
  inner join lateral (
    select generate_series(
      date_trunc('month', b.start_date),
      date_trunc('month', b.end_date),
      interval '1 month'
    )::date as month_start
  ) as s on true
  {% if is_incremental() %}
    where s.month_start >= (select lr.last_month_start from last_run as lr)
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
    coalesce(publisher_id::text, 'unknown') as publisher_key,
    publisher_category,
    mission_domain,
    count(distinct mission_id) as mission_count,
    max(updated_at) as max_updated_at
  from active_months
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
    'all' as publisher_key,
    'all' as publisher_category,
    mission_domain,
    count(distinct mission_id) as mission_count,
    max(updated_at) as max_updated_at
  from active_months
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
    'all' as department,
    publisher_id,
    coalesce(publisher_id::text, 'unknown') as publisher_key,
    publisher_category,
    mission_domain,
    count(distinct mission_id) as mission_count,
    max(updated_at) as max_updated_at
  from active_months
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
    'all' as department,
    null as publisher_id,
    'all' as publisher_key,
    'all' as publisher_category,
    mission_domain,
    count(distinct mission_id) as mission_count,
    max(updated_at) as max_updated_at
  from active_months
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
