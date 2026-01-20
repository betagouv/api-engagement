select
  id,
  user_id,
  publisher_id,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'user_publisher') }}
