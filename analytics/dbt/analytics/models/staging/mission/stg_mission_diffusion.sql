select
  distribution_publisher_id,
  mission_id,
  created_at::timestamp as created_at
from {{ source('analytics_raw', 'mission_diffusion') }}
