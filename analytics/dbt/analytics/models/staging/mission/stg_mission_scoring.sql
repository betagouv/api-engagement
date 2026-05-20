select
  id,
  mission_id,
  mission_enrichment_id,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'mission_scoring') }}
