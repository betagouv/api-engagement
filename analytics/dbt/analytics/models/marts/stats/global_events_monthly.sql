{{ config(
  materialized = 'incremental',
  unique_key = [
    'year',
    'month',
    'is_all_department',
    'department',
    'mission_domain',
    'mission_type',
    'type'
  ],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns'
) }}

with last_run as (
  {% if is_incremental() %}
    select
      coalesce(max(max_updated_at), '1900-01-01'::timestamp)
        as last_updated_at
    from {{ this }}
  {% else %}
    select '1900-01-01'::timestamp as last_updated_at
  {% endif %}
),

affected_months as (
  select distinct date_trunc('month', ge.created_at)::date as month_start
  from {{ ref('global_events') }} as ge
  cross join last_run
  {% if is_incremental() %}
    where coalesce(ge.updated_at, ge.created_at) >= last_run.last_updated_at
  {% endif %}
),

base as (
  select
    extract(year from ge.created_at)::int as year,
    extract(month from ge.created_at)::int as month,
    date_trunc('month', ge.created_at)::date as month_start,
    mad.department,
    ge.type,
    mad.mission_domain,
    mad.publisher_category as mission_type,
    greatest(coalesce(ge.updated_at, ge.created_at), coalesce(mad.updated_at, ge.created_at)) as updated_at
  from {{ ref('global_events') }} as ge
  left join {{ ref('int_mission_active_department_daily') }} as mad
    on ge.mission_id = mad.mission_id
   and date(ge.created_at) = mad.active_date
  where
    1 = 1
    {% if is_incremental() %}
      and date_trunc('month', ge.created_at)::date in (
        select am.month_start
        from affected_months as am
      )
    {% endif %}
),

dept as (
  select
    year,
    month,
    month_start,
    false as is_all_department,
    department,
    mission_domain,
    mission_type,
    type,
    count(*) as event_count,
    max(updated_at) as max_updated_at
  from base
  where department is not null
  group by
    year, month, month_start, department, mission_domain, mission_type, type
),

dept_all_mission as (
  select
    year,
    month,
    month_start,
    false as is_all_department,
    department,
    mission_domain,
    'all' as mission_type,
    type,
    count(*) as event_count,
    max(updated_at) as max_updated_at
  from base
  where department is not null
  group by year, month, month_start, department, mission_domain, type
),

all_dept as (
  select
    year,
    month,
    month_start,
    true as is_all_department,
    null as department,
    mission_domain,
    mission_type,
    type,
    count(*) as event_count,
    max(updated_at) as max_updated_at
  from base
  group by year, month, month_start, mission_domain, mission_type, type
),

all_dept_all_mission as (
  select
    year,
    month,
    month_start,
    true as is_all_department,
    null as department,
    mission_domain,
    'all' as mission_type,
    type,
    count(*) as event_count,
    max(updated_at) as max_updated_at
  from base
  group by year, month, month_start, mission_domain, type
)

select * from dept
union all
select * from dept_all_mission
union all
select * from all_dept
union all
select * from all_dept_all_mission
