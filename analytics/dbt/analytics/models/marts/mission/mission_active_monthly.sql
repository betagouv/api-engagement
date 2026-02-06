{{ config(
  materialized = 'incremental',
  unique_key = ['year', 'month', 'publisher_category', 'publisher_id'],
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
    publisher_id,
    publisher_category,
    start_date,
    coalesce(end_date, current_date) as end_date
  from {{ ref('int_mission_active_range') }}
  where start_date is not null
),

active_months as (
  select
    extract(year from s.month_start)::int as year,
    extract(month from s.month_start)::int as month,
    s.month_start,
    b.publisher_category,
    b.publisher_id,
    b.mission_id
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

by_publisher as (
  select
    year,
    month,
    month_start,
    publisher_category,
    publisher_id,
    count(distinct mission_id) as mission_count
  from active_months
  group by year, month, month_start, publisher_category, publisher_id
),

all_publishers as (
  select
    year,
    month,
    month_start,
    'all' as publisher_category,
    null as publisher_id,
    count(distinct mission_id) as mission_count
  from active_months
  group by year, month, month_start
)

select
  year,
  month,
  month_start,
  publisher_category,
  publisher_id,
  mission_count
from by_publisher
union all
select
  year,
  month,
  month_start,
  publisher_category,
  publisher_id,
  mission_count
from all_publishers
