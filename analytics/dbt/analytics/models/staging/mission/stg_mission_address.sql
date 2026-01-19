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
  location_lat::double precision as location_lat,
  location_lon::double precision as location_lon,
  geo_point::text as geo_point,
  geoloc_status,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'mission_address') }}
