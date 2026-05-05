select
  id,
  mission_id,
  status,
  prompt_version,
  input_tokens::integer as input_tokens,
  output_tokens::integer as output_tokens,
  total_tokens::integer as total_tokens,
  completed_at::timestamp as completed_at,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'mission_enrichment') }}
