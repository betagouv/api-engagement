select
  id,
  enrichment_id,
  taxonomy_key,
  value_key,
  confidence::double precision as confidence,
  evidence,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'mission_enrichment_value') }}
