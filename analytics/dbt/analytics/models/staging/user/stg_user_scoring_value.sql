select
  id,
  user_scoring_id,
  taxonomy_key,
  value_key,
  score::double precision as score,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'user_scoring_value') }}
