select
  id,
  campaign_id,
  key,
  value
from {{ ref('stg_campaign_tracker') }}
