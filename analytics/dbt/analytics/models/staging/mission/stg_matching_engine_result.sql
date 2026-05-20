select
  id,
  user_scoring_id,
  matching_engine_version,
  results,
  created_at::timestamp as created_at
from {{ source('analytics_raw', 'matching_engine_result') }}
