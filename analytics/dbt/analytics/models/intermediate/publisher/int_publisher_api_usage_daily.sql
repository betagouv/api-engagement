{{ config(
  materialized = 'incremental',
  incremental_strategy = 'delete+insert',
  unique_key = 'id',
  on_schema_change = 'sync_all_columns'
) }}

with source as (
  select *
  from {{ ref('stg_http_requests_by_publisher_total') }}
),

{% if is_incremental() %}
  changed_days as (
    select distinct date
    from source
    where synced_at >= (
      select
        coalesce(max(previous.synced_at), '1900-01-01'::timestamptz)
        - interval '1 day'
      from {{ this }} as previous
    )
  ),
{% endif %}

daily_usage as (
  select
    date,
    publisher_id,
    method,
    route,
    sum(request_count)::bigint as request_count,
    coalesce(
      sum(request_count) filter (where status_code between 200 and 399), 0
    )::bigint as success_count,
    coalesce(
      sum(request_count) filter (where status_code between 400 and 499), 0
    )::bigint as publisher_error_count,
    coalesce(
      sum(request_count) filter (where status_code between 500 and 599), 0
    )::bigint as api_error_count,
    max(synced_at) as synced_at
  from source
  {% if is_incremental() %}
    -- Recalculer tous les statuts des journées modifiées.
    where date in (select changed_days.date from changed_days)
  {% endif %}
  group by date, publisher_id, method, route
)

select
  md5(jsonb_build_array(date, publisher_id, method, route)::text) as id,
  date,
  publisher_id,
  method,
  route,
  request_count,
  success_count,
  publisher_error_count,
  api_error_count,
  synced_at
from daily_usage
