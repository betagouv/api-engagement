{{ config(
  materialized = 'incremental',
  unique_key = ['mean_date', 'from_publisher_id', 'source', 'source_id'],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns'
) }}

with last_run as (
  {% if is_incremental() %}
    select
      coalesce(max(ms.max_updated_at), '1900-01-01'::timestamp)
        as last_updated_at
    from {{ this }} as ms
  {% else %}
    select '1900-01-01'::timestamp as last_updated_at
  {% endif %}
),

affected_dates as (
  select distinct ged.event_date as mean_date
  from {{ ref('global_events_daily') }} as ged
  cross join last_run
  {% if is_incremental() %}
    where ged.max_updated_at >= last_run.last_updated_at
  {% endif %}
),

base as (
  select
    ged.event_date as mean_date,
    ged.from_publisher_id,
    ged.source,
    ged.type,
    ged.event_count,
    ged.max_updated_at,
    coalesce(ged.source_id, '') as source_id
  from {{ ref('global_events_daily') }} as ged
  {% if is_incremental() %}
    where ged.event_date in (
      select ad.mean_date
      from affected_dates as ad
    )
  {% endif %}
),

aggregated as (
  select
    mean_date,
    from_publisher_id,
    source,
    source_id,
    sum(event_count) filter (where type = 'print') as print_count,
    sum(event_count) filter (where type = 'click') as click_count,
    sum(event_count) filter (where type = 'account') as account_count,
    sum(event_count) filter (where type = 'apply') as apply_count,
    sum(event_count) as total_count,
    max(max_updated_at) as max_updated_at
  from base
  group by mean_date, from_publisher_id, source, source_id
)

select
  mean_date,
  from_publisher_id,
  source,
  source_id,
  print_count,
  click_count,
  account_count,
  apply_count,
  total_count,
  max_updated_at,
  case
    when click_count = 0 then 0
    else apply_count::double precision / click_count
  end as conversion_rate
from aggregated
