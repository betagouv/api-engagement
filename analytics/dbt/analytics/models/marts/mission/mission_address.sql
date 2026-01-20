{{ config(materialized = 'view') }}

select
  id,
  mission_id,
  street,
  postal_code,
  department_name,
  department_code,
  city,
  region,
  country,
  location_lat,
  location_lon,
  geo_point,
  geoloc_status,
  created_at,
  updated_at
from {{ ref('int_mission_address') }}
