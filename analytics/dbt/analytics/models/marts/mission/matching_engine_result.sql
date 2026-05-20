{{ config(materialized = 'view') }}

select
  id,
  user_scoring_id,
  matching_engine_version,
  results,
  created_at
from {{ ref('stg_matching_engine_result') }}
