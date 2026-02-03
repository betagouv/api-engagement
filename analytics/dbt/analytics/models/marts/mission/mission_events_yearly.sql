{{ config(
  materialized = 'incremental',
  unique_key = [
    'year',
    'is_all_department',
    'department',
    'mission_domain',
    'publisher_category'
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

departments as (
  select
    department_code,
    department_name
  from {{ ref('department_codes') }}
),

affected_years as (
  select distinct extract(year from s.year_start)::int as year
  from {{ ref('int_mission_active_range') }} as mar
  inner join lateral (
    select generate_series(
      date_trunc('year', mar.start_date),
      date_trunc('year', coalesce(mar.end_date, current_date)),
      interval '1 year'
    )::date as year_start
  ) as s on true
  where
    mar.start_date is not null
    and coalesce(mar.updated_at, mar.start_date::timestamp)
    >= (select lr.last_updated_at from last_run as lr)

  union

  select distinct extract(year from s.year_start)::int as year
  from {{ ref('int_mission_active_department_range') }} as mdr
  inner join lateral (
    select generate_series(
      date_trunc('year', mdr.start_date),
      date_trunc('year', coalesce(mdr.end_date, current_date)),
      interval '1 year'
    )::date as year_start
  ) as s on true
  where
    mdr.start_date is not null
    and coalesce(mdr.updated_at, mdr.start_date::timestamp)
    >= (select lr.last_updated_at from last_run as lr)

  union

  select distinct extract(year from ge.created_at)::int as year
  from {{ ref('int_stat_event_global') }} as ge
  where
    coalesce(ge.updated_at, ge.created_at)
    >= (select lr.last_updated_at from last_run as lr)
),

mission_range_dept as (
  select
    mdr.start_date,
    mdr.end_date,
    mdr.department,
    d.department_name,
    mdr.mission_id,
    im.organization_id,
    mdr.mission_domain,
    mdr.publisher_category,
    coalesce(mdr.updated_at, mdr.start_date)::timestamp as updated_at
  from {{ ref('int_mission_active_department_range') }} as mdr
  left join {{ ref('int_mission') }} as im
    on mdr.mission_id = im.id
  left join departments as d
    on mdr.department = d.department_code
  where
    mdr.start_date is not null
),

mission_range_all as (
  select
    mar.start_date,
    mar.end_date,
    mar.mission_id,
    im.organization_id,
    mar.mission_domain,
    mar.publisher_category,
    coalesce(mar.updated_at, mar.start_date)::timestamp as updated_at
  from {{ ref('int_mission_active_range') }} as mar
  left join {{ ref('int_mission') }} as im
    on mar.mission_id = im.id
  where
    mar.start_date is not null
),

mission_base as (
  select
    extract(year from s.year_start)::int as year,
    mrd.department,
    mrd.department_name,
    mrd.mission_id,
    mrd.organization_id,
    mrd.mission_domain,
    mrd.publisher_category,
    mrd.updated_at
  from mission_range_dept as mrd
  inner join lateral (
    select generate_series(
      date_trunc('year', mrd.start_date),
      date_trunc('year', coalesce(mrd.end_date, current_date)),
      interval '1 year'
    )::date as year_start
  ) as s on true
  {% if is_incremental() %}
    where extract(year from s.year_start)::int in (
      select ay.year from affected_years as ay
    )
  {% endif %}
),

-- Agrégat national sans le grain département pour éviter les doublons
mission_base_all as (
  select
    extract(year from s.year_start)::int as year,
    mra.mission_id,
    mra.organization_id,
    mra.mission_domain,
    mra.publisher_category,
    mra.updated_at
  from mission_range_all as mra
  inner join lateral (
    select generate_series(
      date_trunc('year', mra.start_date),
      date_trunc('year', coalesce(mra.end_date, current_date)),
      interval '1 year'
    )::date as year_start
  ) as s on true
  {% if is_incremental() %}
    where extract(year from s.year_start)::int in (
      select ay.year from affected_years as ay
    )
  {% endif %}
),

missions_dept as (
  select
    year,
    false as is_all_department,
    department,
    department_name,
    mission_domain,
    publisher_category,
    count(distinct mission_id) as mission_count,
    count(distinct organization_id) as organization_count,
    max(updated_at) as max_updated_at
  from mission_base
  where department is not null
  group by year, department, department_name, mission_domain, publisher_category
),

missions_dept_all_type as (
  select
    year,
    false as is_all_department,
    department,
    department_name,
    mission_domain,
    'all' as publisher_category,
    count(distinct mission_id) as mission_count,
    count(distinct organization_id) as organization_count,
    max(updated_at) as max_updated_at
  from mission_base
  where department is not null
  group by year, department, department_name, mission_domain
),

missions_all_dept as (
  select
    year,
    true as is_all_department,
    null as department,
    null as department_name,
    mission_domain,
    publisher_category,
    count(distinct mission_id) as mission_count,
    count(distinct organization_id) as organization_count,
    max(updated_at) as max_updated_at
  from mission_base_all
  group by year, mission_domain, publisher_category
),

missions_all_dept_all_type as (
  select
    year,
    true as is_all_department,
    null as department,
    null as department_name,
    mission_domain,
    'all' as publisher_category,
    count(distinct mission_id) as mission_count,
    count(distinct organization_id) as organization_count,
    max(updated_at) as max_updated_at
  from mission_base_all
  group by year, mission_domain
),

events_base as (
  select
    ge.mission_id,
    extract(year from ge.created_at)::int as year,
    ge.type,
    date(ge.created_at) as event_date,
    coalesce(ge.updated_at, ge.created_at) as updated_at
  from {{ ref('global_events') }} as ge
  where
    ge.mission_id is not null
    and ge.type in ('click', 'apply')
    {% if is_incremental() %}
      and extract(year from ge.created_at)::int in (
        select ay.year from affected_years as ay
      )
    {% endif %}
),

events_with_dims as (
  select
    eb.year,
    mrd.department,
    mrd.department_name,
    mrd.mission_domain,
    mrd.publisher_category,
    eb.type,
    greatest(eb.updated_at, mrd.updated_at) as updated_at
  from events_base as eb
  inner join mission_range_dept as mrd
    on
      eb.mission_id = mrd.mission_id
      and eb.event_date
      between mrd.start_date and coalesce(mrd.end_date, current_date)
),

-- Version sans département pour éviter la duplication des événements nationaux
events_with_dims_all as (
  select
    eb.year,
    mra.mission_domain,
    mra.publisher_category,
    eb.type,
    greatest(eb.updated_at, mra.updated_at) as updated_at
  from events_base as eb
  inner join mission_range_all as mra
    on
      eb.mission_id = mra.mission_id
      and eb.event_date
      between mra.start_date and coalesce(mra.end_date, current_date)
),

events_dept as (
  select
    year,
    false as is_all_department,
    department,
    department_name,
    mission_domain,
    publisher_category,
    sum(case when type = 'click' then 1 else 0 end) as redirection_count,
    sum(case when type = 'apply' then 1 else 0 end) as candidature_count,
    max(updated_at) as max_updated_at
  from events_with_dims
  where department is not null
  group by year, department, department_name, mission_domain, publisher_category
),

events_dept_all_type as (
  select
    year,
    false as is_all_department,
    department,
    department_name,
    mission_domain,
    'all' as publisher_category,
    sum(case when type = 'click' then 1 else 0 end) as redirection_count,
    sum(case when type = 'apply' then 1 else 0 end) as candidature_count,
    max(updated_at) as max_updated_at
  from events_with_dims
  where department is not null
  group by year, department, department_name, mission_domain
),

events_all_dept as (
  select
    year,
    true as is_all_department,
    null as department,
    null as department_name,
    mission_domain,
    publisher_category,
    sum(case when type = 'click' then 1 else 0 end) as redirection_count,
    sum(case when type = 'apply' then 1 else 0 end) as candidature_count,
    max(updated_at) as max_updated_at
  from events_with_dims_all
  group by year, mission_domain, publisher_category
),

events_all_dept_all_type as (
  select
    year,
    true as is_all_department,
    null as department,
    null as department_name,
    mission_domain,
    'all' as publisher_category,
    sum(case when type = 'click' then 1 else 0 end) as redirection_count,
    sum(case when type = 'apply' then 1 else 0 end) as candidature_count,
    max(updated_at) as max_updated_at
  from events_with_dims_all
  group by year, mission_domain
),

missions_union as (
  select * from missions_dept
  union all
  select * from missions_dept_all_type
  union all
  select * from missions_all_dept
  union all
  select * from missions_all_dept_all_type
),

events_union as (
  select
    year,
    is_all_department,
    department,
    department_name,
    mission_domain,
    publisher_category,
    null::int as organization_count,
    redirection_count,
    candidature_count,
    max_updated_at
  from events_dept
  union all
  select
    year,
    is_all_department,
    department,
    department_name,
    mission_domain,
    publisher_category,
    null::int as organization_count,
    redirection_count,
    candidature_count,
    max_updated_at
  from events_dept_all_type
  union all
  select
    year,
    is_all_department,
    department,
    department_name,
    mission_domain,
    publisher_category,
    null::int as organization_count,
    redirection_count,
    candidature_count,
    max_updated_at
  from events_all_dept
  union all
  select
    year,
    is_all_department,
    department,
    department_name,
    mission_domain,
    publisher_category,
    null::int as organization_count,
    redirection_count,
    candidature_count,
    max_updated_at
  from events_all_dept_all_type
),

final as (
  select
    coalesce(m.year, e.year) as year,
    coalesce(m.is_all_department, e.is_all_department) as is_all_department,
    coalesce(m.department, e.department) as department,
    coalesce(m.department_name, e.department_name) as department_name,
    coalesce(m.mission_domain, e.mission_domain) as mission_domain,
    coalesce(m.publisher_category, e.publisher_category) as publisher_category,
    coalesce(m.mission_count, 0) as mission_count,
    coalesce(m.organization_count, 0) as organization_count,
    coalesce(e.redirection_count, 0) as redirection_count,
    coalesce(e.candidature_count, 0) as candidature_count,
    greatest(
      coalesce(m.max_updated_at, '1900-01-01'::timestamp),
      coalesce(e.max_updated_at, '1900-01-01'::timestamp)
    ) as max_updated_at
  from missions_union as m
  full outer join events_union as e
    on
      m.year = e.year
      and m.is_all_department = e.is_all_department
      and coalesce(m.department, '') = coalesce(e.department, '')
      and m.mission_domain = e.mission_domain
      and m.publisher_category = e.publisher_category
)

select *
from final
