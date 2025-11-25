select
  id,
  name,
  publisher_id,
  mission_count::int as mission_count,
  refused_count::int as refused_count,
  created_count::int as created_count,
  deleted_count::int as deleted_count,
  updated_count::int as updated_count,
  started_at::timestamp as started_at,
  finished_at::timestamp as finished_at,
  status
from {{ source('analytics_raw', 'import') }}
