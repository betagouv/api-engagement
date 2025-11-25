select
  id,
  first_name,
  last_name,
  email,
  role,
  deleted_at::timestamp as deleted_at,
  last_activity_at::timestamp as last_activity_at,
  login_at::timestamp [] as login_at,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'user') }}
