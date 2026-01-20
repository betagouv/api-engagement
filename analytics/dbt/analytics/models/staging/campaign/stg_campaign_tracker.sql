select
  id,
  campaign_id,
  key,
  value,
  created_at,
  updated_at
from {{ source('analytics_raw', 'campaign_tracker') }}
