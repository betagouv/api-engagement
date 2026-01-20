{{ config(
  materialized = 'incremental',
  unique_key = 'id',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_mission_moderation_status_mission_id_idx" on {{ this }} (mission_id)',
  ]
) }}

with source as (
  select
    id,
    mission_id,
    publisher_id,
    status as moderation_status,
    comment as moderation_comment,
    created_at,
    updated_at
  from {{ ref('stg_mission_moderation_status') }}
  {% if is_incremental() %}
    where
      updated_at
      > (
        select coalesce(max(imms.updated_at), '1900-01-01')
        from {{ this }} as imms
      )
  {% endif %}
)

select
  id,
  mission_id,
  publisher_id,
  moderation_status,
  moderation_comment,
  created_at,
  updated_at
from source
