select
  id,
  url,
  name,
  from_publisher_id as diffuseur_id,
  to_publisher_id as annonceur_id,
  active,
  deleted_at::timestamp as deleted_at,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at,
  reassigned_at::timestamp as reassigned_at,
  reassigned_by_user_id,
  type
from {{ source('analytics_raw', 'campaign') }}
