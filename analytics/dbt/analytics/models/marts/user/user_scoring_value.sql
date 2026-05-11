{{ config(materialized = 'view') }}

select
  id,
  user_scoring_id,
  taxonomy_key,
  value_key,
  score,
  created_at,
  updated_at
from {{ ref('stg_user_scoring_value') }}
