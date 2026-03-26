select
  id,
  jobboard_id::text as jobboard_id,
  mission_id,
  mission_address_id,
  public_id,
  sync_status::text as sync_status,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'mission_jobboard') }}
