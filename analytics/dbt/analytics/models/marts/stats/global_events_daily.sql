{{ config(
  materialized = 'incremental',
  unique_key = 'event_date',
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

affected_dates as (
  select distinct date(ge.created_at) as event_date
  from {{ ref('global_events') }} as ge
  cross join last_run
  {% if is_incremental() %}
    where coalesce(ge.updated_at, ge.created_at) >= last_run.last_updated_at
  {% endif %}
),

base as (
  select
    type,
    source,
    source_id,
    from_publisher_id,
    to_publisher_id,
    date(created_at) as event_date,
    coalesce(updated_at, created_at) as updated_at
  from {{ ref('global_events') }}
  {% if is_incremental() %}
    where date(created_at) in (
      select ad.event_date
      from affected_dates as ad
    )
  {% endif %}
),

aggregated as (
  select
    event_date,
    type,
    source,
    source_id,
    from_publisher_id,
    to_publisher_id,
    count(*) as event_count,
    max(updated_at) as max_updated_at
  from base
  group by
    event_date, type, source, source_id, from_publisher_id, to_publisher_id
)

select *
from aggregated
