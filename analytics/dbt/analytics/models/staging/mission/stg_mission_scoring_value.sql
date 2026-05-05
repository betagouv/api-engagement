select
  id,
  mission_scoring_id,
  mission_enrichment_value_id,
  taxonomy_key,
  value_key,
  score::double precision as score,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'mission_scoring_value') }}
