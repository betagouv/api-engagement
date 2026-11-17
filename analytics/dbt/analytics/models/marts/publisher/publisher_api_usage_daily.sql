{{ config(materialized = 'view') }}

select
  id,
  date,
  publisher_id,
  method,
  route,
  request_count,
  success_count,
  publisher_error_count,
  api_error_count,
  synced_at
from {{ ref('int_publisher_api_usage_daily') }}
