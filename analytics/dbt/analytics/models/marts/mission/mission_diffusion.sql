{{ config(materialized = 'view') }}

select
  distribution_publisher_id,
  mission_id,
  created_at
from {{ ref('stg_mission_diffusion') }}
