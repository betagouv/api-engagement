{{ config(
  materialized = 'incremental',
  unique_key = [
    'month_start',
    'publisher_id',
    'from_publisher_id',
    'source',
    'source_id',
    'publisher_category',
    'mission_domain',
    'mission_activity',
    'mission_audience',
    'mission_tags',
    'close_to_transport',
    'description_length_bucket',
    'mission_duration_days'
  ],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns'
) }}

with last_run as (
  {% if is_incremental() %}
    select coalesce(max(updated_at), '1900-01-01'::timestamp) as last_updated_at
    from {{ this }}
  {% else %}
    select '1900-01-01'::timestamp as last_updated_at
  {% endif %}
),

affected_months as (
  select distinct date_trunc('month', mission_created_at)::date as month_start
  from {{ ref('int_mission_first_events') }}
  where
    coalesce(updated_at, mission_created_at)
    >= (select lr.last_updated_at from last_run as lr)

  union

  select distinct
    date_trunc('month', mfe.mission_created_at)::date as month_start
  from {{ ref('int_mission_first_events') }} as mfe
  inner join {{ ref('int_mission_click_apply_stats') }} as mca
    on
      mfe.mission_id = mca.mission_id
      and mfe.from_publisher_id is not distinct from mca.from_publisher_id
      and mfe.source is not distinct from mca.source
      and mfe.source_id is not distinct from mca.source_id
  where mca.updated_at >= (select lr.last_updated_at from last_run as lr)
),

multi_apply as (
  select
    mission_id,
    from_publisher_id,
    source,
    source_id,
    click_with_apply_count,
    click_with_multi_apply_count,
    updated_at
  from {{ ref('int_mission_click_apply_stats') }}
),

base as (
  select
    date_trunc('month', mfe.mission_created_at)::date as month_start,
    extract(year from date_trunc('month', mfe.mission_created_at))::int as year,
    extract(month from date_trunc('month', mfe.mission_created_at))::int
      as month,
    mfe.mission_id,
    mfe.publisher_id,
    mfe.from_publisher_id,
    mfe.source,
    mfe.source_id,
    mfe.publisher_category,
    mfe.mission_domain,
    mfe.mission_activity,
    mfe.mission_audience,
    mfe.mission_tags,
    mfe.close_to_transport,
    mfe.description_length,
    mfe.mission_duration_days,
    mfe.time_to_import_secs,
    mfe.time_to_click_secs,
    mfe.time_to_apply_secs,
    mfe.click_count,
    mfe.apply_count,
    mfe.first_click_at,
    mfe.first_apply_at,
    coalesce(mca.click_with_apply_count, 0) as click_with_apply_count,
    coalesce(mca.click_with_multi_apply_count, 0)
      as click_with_multi_apply_count,
    greatest(
      coalesce(mfe.updated_at, '1900-01-01'::timestamp),
      coalesce(mca.updated_at, '1900-01-01'::timestamp)
    ) as updated_at,
    case
      when mfe.description_length < 300 then '0-300'
      when mfe.description_length < 700 then '300-700'
      else '700+'
    end as description_length_bucket
  from {{ ref('int_mission_first_events') }} as mfe
  left join multi_apply as mca
    on
      mfe.mission_id = mca.mission_id
      and mfe.from_publisher_id is not distinct from mca.from_publisher_id
      and mfe.source is not distinct from mca.source
      and mfe.source_id is not distinct from mca.source_id
  {% if is_incremental() %}
    where date_trunc('month', mfe.mission_created_at)::date in (
      select am.month_start from affected_months as am
    )
  {% endif %}
),

aggregated as (
  select
    month_start,
    year,
    month,
    publisher_id,
    from_publisher_id,
    source,
    source_id,
    publisher_category,
    mission_domain,
    mission_activity,
    mission_audience,
    mission_tags,
    close_to_transport,
    description_length_bucket,
    round(avg(description_length))::int as avg_description_length,
    mission_duration_days,
    count(distinct mission_id) as mission_count,
    count(*) filter (where first_click_at is not null)
      as mission_with_click_count,
    count(*) filter (where first_apply_at is not null)
      as mission_with_apply_count,
    sum(click_count) as click_count,
    sum(apply_count) as apply_count,
    sum(click_with_apply_count) as click_with_apply_count,
    sum(click_with_multi_apply_count) as click_with_multi_apply_count,
    avg(time_to_click_secs) as avg_time_to_click_secs,
    avg(time_to_apply_secs) as avg_time_to_apply_secs,
    avg(time_to_import_secs) as avg_time_to_import_secs,
    max(updated_at) as updated_at
  from base
  group by
    month_start,
    year,
    month,
    publisher_id,
    from_publisher_id,
    source,
    source_id,
    publisher_category,
    mission_domain,
    mission_activity,
    mission_audience,
    mission_tags,
    close_to_transport,
    description_length_bucket,
    mission_duration_days
)

select
  a.*,
  case
    when a.click_count = 0 then null
    else a.apply_count::numeric / a.click_count
  end as conversion_rate,
  case
    when a.click_with_apply_count = 0 then null
    else a.click_with_multi_apply_count::numeric / a.click_with_apply_count
  end as multi_apply_click_ratio
from aggregated as a
