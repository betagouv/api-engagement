select
  id,
  publisher_id,
  field,
  field_type,
  operator,
  value,
  combinator,
  position::integer as position,
  combined_with_id,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'publisher_diffusion_rule') }}
