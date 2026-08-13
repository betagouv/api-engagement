select
  id,
  distribution_publisher_id,
  mission_id,
  is_deleted::boolean as is_deleted,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at,
  deleted_at::timestamp as deleted_at
from {{ source('analytics_raw', 'mission_diffusion') }}
