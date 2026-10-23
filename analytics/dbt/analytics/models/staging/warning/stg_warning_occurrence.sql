select
  id,
  warning_id,
  source,
  title,
  description,
  created_at::timestamp as created_at
from {{ source('analytics_raw', 'warning_occurrence') }}
