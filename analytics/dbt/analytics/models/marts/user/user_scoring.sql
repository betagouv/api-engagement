{{ config(materialized = 'view') }}

select
  id,
  distinct_id,
  mission_alert_enabled,
  created_at,
  expires_at,
  updated_at
from {{ ref('stg_user_scoring') }}
