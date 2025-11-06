select
  id,
  old_id as campaign_id_raw
from {{ source('public', 'Campaign') }}
