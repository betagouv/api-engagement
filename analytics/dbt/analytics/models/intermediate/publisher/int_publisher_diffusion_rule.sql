{{ config(
    materialized = 'table'
) }}

select
  id,
  publisher_id,
  field,
  field_type,
  operator,
  value,
  combinator,
  position,
  combined_with_id,
  created_at,
  updated_at
from {{ ref('stg_publisher_diffusion_rule') }}
