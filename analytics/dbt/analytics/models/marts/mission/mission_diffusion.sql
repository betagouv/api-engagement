{{ config(materialized = 'view') }}

select
  id,
  distribution_publisher_id,
  mission_id,
  is_deleted,
  created_at,
  updated_at,
  deleted_at
from {{ ref('int_mission_diffusion') }}
