{{ config(
  materialized = 'incremental',
  unique_key = 'id',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "mission_address_mission_id_idx" on {{ this }} (mission_id)',
    'create index if not exists "mission_address_department_code_idx" on {{ this }} (department_code)',
  ]
) }}

with source as (
  select *
  from {{ ref('stg_mission_address') }}
  {% if is_incremental() %}
    where
      updated_at
      > (
        select coalesce(max(ma.updated_at), '1900-01-01')
        from {{ this }} as ma
      )
  {% endif %}
)

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
from source
