select
  id,
  distinct_id,
  mission_alert_enabled::boolean as mission_alert_enabled,
  created_at::timestamp as created_at,
  expires_at::timestamp as expires_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'user_scoring') }}
