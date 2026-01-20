{{ config(materialized = 'view') }}

select
  id,
  name,
  color,
  style,
  type,
  location_lat,
  location_long,
  location_city,
  distance,
  url,
  jva_moderation,
  from_publisher_id,
  active,
  deleted_at,
  created_at,
  updated_at
from {{ source('analytics_raw', 'widget') }}
