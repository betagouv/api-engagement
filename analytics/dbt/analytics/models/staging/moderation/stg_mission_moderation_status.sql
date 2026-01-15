select
  id,
  mission_id,
  publisher_id,
  status::text as status,
  comment,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'mission_moderation_status') }}
