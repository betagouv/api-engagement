{{ config(materialized = 'view') }}

select
  id,
  mission_id,
  publisher_id,
  moderation_status,
  moderation_comment,
  created_at,
  updated_at
from {{ ref('int_mission_moderation_status') }}
