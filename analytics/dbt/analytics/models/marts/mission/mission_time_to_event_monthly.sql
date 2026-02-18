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
),

base as (
  select
    date_trunc('month', mission_created_at)::date as month_start,
    extract(year from date_trunc('month', mission_created_at))::int as year,
    extract(month from date_trunc('month', mission_created_at))::int as month,
    mission_id,
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
    description_length,
    mission_duration_days,
    time_to_import_secs,
    time_to_click_secs,
    time_to_apply_secs,
    first_click_at,
    first_apply_at,
    updated_at,
    case
      when description_length < 300 then '0-300'
      when description_length < 700 then '300-700'
      else '700+'
    end as description_length_bucket
  from {{ ref('int_mission_first_events') }}
  {% if is_incremental() %}
    where date_trunc('month', mission_created_at)::date in (
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

select * from aggregated
