select
  md5(
    jsonb_build_array(date, publisher_id, method, route, status_code)::text
  ) as id,
  date,
  publisher_id,
  method,
  route,
  status_code,
  request_count,
  synced_at
from {{ source('analytics_raw', 'http_requests_by_publisher_total') }}
