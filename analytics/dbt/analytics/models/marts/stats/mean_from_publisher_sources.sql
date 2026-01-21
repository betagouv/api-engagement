{{ config(
  materialized = 'incremental',
  unique_key = ['mean_date', 'from_publisher_id', 'source', 'source_id'],
  on_schema_change = 'sync_all_columns'
) }}

with base as (
  select
    event_date as mean_date,
    from_publisher_id,
    source,
    type,
    event_count,
    coalesce(source_id, '') as source_id
  from {{ ref('global_events_daily') }}
  {% if is_incremental() %}
    where event_date >= (
      select coalesce(max(ms.mean_date), '1900-01-01'::date)
      from {{ this }} as ms
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
    sum(event_count) as total_count
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
  case
    when click_count = 0 then 0
    else apply_count::double precision / click_count
  end as conversion_rate
from aggregated
