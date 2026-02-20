select
  mission_id,
  activity_id,
  created_at::timestamp as created_at
from {{ source('analytics_raw', 'mission_activity') }}
