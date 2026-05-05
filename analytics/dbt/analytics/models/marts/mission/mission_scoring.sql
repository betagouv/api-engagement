{{ config(materialized = 'view') }}

select
  id,
  mission_id,
  mission_enrichment_id,
  created_at,
  updated_at
from {{ ref('stg_mission_scoring') }}
