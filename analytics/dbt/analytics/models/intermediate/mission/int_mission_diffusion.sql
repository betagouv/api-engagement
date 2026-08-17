{{ config(
  materialized = 'incremental',
  unique_key = 'id',
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_mission_diffusion_mission_id_idx" on {{ this }} (mission_id)',
    'create index if not exists "int_mission_diffusion_updated_at_idx" on {{ this }} (updated_at)',
  ]
) }}

with source as (
  select
    id,
    distribution_publisher_id,
    mission_id,
    created_at,
    updated_at,
    deleted_at
  from {{ ref('stg_mission_diffusion') }}
  {% if is_incremental() %}
    where
      updated_at
      >= (
        select coalesce(max(imd.updated_at), '1900-01-01')
        from {{ this }} as imd
      )
  {% endif %}
)

select
  id,
  distribution_publisher_id,
  mission_id,
  created_at,
  updated_at,
  deleted_at
from source
