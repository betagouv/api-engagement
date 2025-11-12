{{ config(
    materialized = 'incremental',
    unique_key = 'id',
    on_schema_change = 'sync_all_columns',
    post_hook = [
      'create unique index if not exists "moderation_event_id_idx" on {{ this }} (id)',
      'create index if not exists "moderation_event_mission_id_idx" on {{ this }} (mission_id)',
      'create index if not exists "moderation_event_moderator_id_idx" on {{ this }} (moderator_id)',
      'create index if not exists "moderation_event_updated_at_idx" on {{ this }} (updated_at)'
    ]
) }}

with src as (
  select *
  from {{ ref('stg_moderation_event') }}
  {% if is_incremental() %}
    where
      updated_at
      > (
        select coalesce(max(me.updated_at), '1900-01-01') from {{ this }} as me
      )
  {% endif %}
)

select
  id,
  mission_id,
  moderator_id,
  user_name,
  initial_status,
  new_status,
  initial_comment,
  new_comment,
  initial_note,
  new_note,
  initial_title,
  new_title,
  initial_siren,
  new_siren,
  initial_rna,
  new_rna,
  created_at,
  updated_at
from src
