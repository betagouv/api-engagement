select
  id,
  user_id,
  login_at::timestamp as login_at,
  created_at::timestamp as created_at
from {{ source('analytics_raw', 'login_history') }}
