{{ config(materialized = 'view') }}

select
  id,
  mission_id,
  status,
  prompt_version,
  input_tokens,
  output_tokens,
  total_tokens,
  completed_at,
  created_at,
  updated_at
from {{ ref('stg_mission_enrichment') }}
