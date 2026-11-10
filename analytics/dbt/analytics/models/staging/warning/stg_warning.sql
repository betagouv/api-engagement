select
  id,
  type,
  title,
  description,
  publisher_id,
  status,
  occurrences::int as occurrences,
  procedure_url,
  notified_at::timestamp as notified_at,
  fixed_at::timestamp as fixed_at,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'warning') }}
