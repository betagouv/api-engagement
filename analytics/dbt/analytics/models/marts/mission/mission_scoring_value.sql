{{ config(materialized = 'view') }}

select
  id,
  mission_scoring_id,
  mission_enrichment_value_id,
  taxonomy_key,
  value_key,
  score,
  created_at,
  updated_at
from {{ ref('stg_mission_scoring_value') }}
