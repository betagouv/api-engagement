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

  union

  select distinct s.month_start
  from {{ ref('int_mission_active_department_range') }} as mdr
  inner join lateral (
    select generate_series(
      date_trunc('month', mdr.start_date),
      date_trunc('month', coalesce(mdr.end_date, current_date)),
      interval '1 month'
    )::date as month_start
  ) as s on true
  cross join last_run
  where
    mdr.start_date is not null
    {% if is_incremental() %}
      and coalesce(mdr.updated_at, mdr.start_date::timestamp)
      >= last_run.last_updated_at
    {% endif %}
),

events as (
  select
    ge.mission_id,
    ge.created_at,
    extract(year from ge.created_at)::int as year,
    extract(month from ge.created_at)::int as month,
    date_trunc('month', ge.created_at)::date as month_start,
    ge.type,
    coalesce(ge.updated_at, ge.created_at) as updated_at
  from {{ ref('global_events') }} as ge
  where
    1 = 1
    {% if is_incremental() %}
      and exists (
        select 1
        from affected_months as am
        where
          ge.created_at >= am.month_start
          and ge.created_at < am.month_start + interval '1 month'
      )
    {% endif %}
),

-- Les agrégats départementaux utilisent la relation au grain
-- mission-département. Le join est volontairement interne : les événements sans
-- département n'appartiennent à aucun agrégat départemental.
department_events as (
  select
    e.year,
    e.month,
    e.month_start,
    mad.department,
    e.type,
    coalesce(mad.mission_domain, 'unknown') as mission_domain,
    coalesce(mad.publisher_category, 'unknown') as mission_type,
    greatest(e.updated_at, coalesce(mad.updated_at, e.created_at)) as updated_at
  from events as e
  inner join {{ ref('int_mission_active_department_range') }} as mad
    on
      e.mission_id = mad.mission_id
      and date(e.created_at)
      between mad.start_date and coalesce(mad.end_date, current_date)
  where mad.department is not null
),

-- Les agrégats nationaux n'ont pas besoin des départements. La relation
-- int_mission_active_range étant unique par mission, elle évite le fan-out puis
-- la déduplication coûteuse au grain événement.
all_department_events as (
  select
    e.year,
    e.month,
    e.month_start,
    e.type,
    coalesce(mar.mission_domain, 'unknown') as mission_domain,
    coalesce(mar.publisher_category, 'unknown') as mission_type,
    greatest(e.updated_at, coalesce(mar.updated_at, e.created_at)) as updated_at
  from events as e
  left join {{ ref('int_mission_active_range') }} as mar
    on
      e.mission_id = mar.mission_id
      and date(e.created_at)
      between mar.start_date and coalesce(mar.end_date, current_date)
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
  from department_events
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
  from department_events
  group by year, month, month_start, department, mission_domain, type
),

all_dept as (
  select
    year,
    month,
    month_start,
    true as is_all_department,
    'all' as department,
    mission_domain,
    mission_type,
    type,
    count(*) as event_count,
    max(updated_at) as max_updated_at
  from all_department_events
  group by year, month, month_start, mission_domain, mission_type, type
),

all_dept_all_mission as (
  select
    year,
    month,
    month_start,
    true as is_all_department,
    'all' as department,
    mission_domain,
    'all' as mission_type,
    type,
    count(*) as event_count,
    max(updated_at) as max_updated_at
  from all_department_events
  group by year, month, month_start, mission_domain, type
)

select * from dept
union all
select * from dept_all_mission
union all
select * from all_dept
union all
select * from all_dept_all_mission
