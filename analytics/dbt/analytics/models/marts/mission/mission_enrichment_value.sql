{{ config(materialized = 'view') }}

select
  id,
  enrichment_id,
  taxonomy_key,
  value_key,
  confidence,
  evidence,
  created_at,
  updated_at
from {{ ref('stg_mission_enrichment_value') }}
