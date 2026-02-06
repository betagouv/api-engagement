select
  id,
  mission_id,
  street,
  postal_code,
  department_name,
  city,
  region,
  country,
  geoloc_status,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at,
  location_lat::double precision as location_lat,
  location_lon::double precision as location_lon,
  geo_point::text as geo_point,
  case
    when department_code is null or trim(department_code) = '' then null
    when
      length(trim(department_code)) <= 2
      then lpad(trim(department_code), 2, '0')
    else trim(department_code)
  end as department_code
from {{ source('analytics_raw', 'mission_address') }}
