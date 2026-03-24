{{ config(
  materialized = 'incremental',
  unique_key = 'id',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "mission_jobboard_mission_id_idx" on {{ this }} (mission_id)',
    'create index if not exists "mission_jobboard_mission_address_id_idx" on {{ this }} (mission_address_id)',
  ]
) }}

with source as (
  select *
  from {{ ref('stg_mission_jobboard') }}
  {% if is_incremental() %}
    where
      updated_at
      > (
        select coalesce(max(mjb.updated_at), '1900-01-01')
        from {{ this }} as mjb
      )
  {% endif %}
)

select
  id,
  jobboard_id,
  mission_id,
  mission_address_id,
  public_id,
  sync_status,
  created_at,
  updated_at
from source
